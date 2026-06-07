import { db } from "../../config/db.js";
import { probeDomainRuntime } from "./runtime-probe.service.js";
import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import { INDEX_TEMPLATE, ERROR_404_TEMPLATE, ERROR_500_TEMPLATE, ERROR_503_TEMPLATE } from "../../utils/html-templates.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const normalizeDomain = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "");

/**
 * Resolve the filesystem home directory for a given user.
 * On Linux/Mac this is /home/<username>, on Windows (dev) it uses .odin-home/<username>.
 */
const getUserHomePath = async (userId: string): Promise<string> => {
  const result = await db.query("SELECT username FROM users WHERE id = $1", [userId]);
  if (result.rowCount === 0) throw new Error("Usuario no encontrado");
  const username = (result.rows[0].username as string)
    .replace(/[^a-z0-9]/gi, "_")
    .toLowerCase();

  if (process.platform === "win32") {
    return path.join(process.cwd(), ".odin-home", username);
  }
  return path.join("/home", username);
};

/**
 * Create the domain web-root directory directly under the user's home.
 *
 * Structure:
 *   ~/dominio.com/          ← esta carpeta ES el document root del dominio
 *   ├── index.html          ← placeholder de marca (solo si no existe)
 *   ├── 404.html
 *   ├── 500.html
 *   └── 503.html
 *
 * No se crea subcarpeta public_html — el panel gestiona múltiples dominios
 * y cada carpeta de dominio sirve directamente como raíz web.
 */
const provisionDomainDir = async (userHomePath: string, domainName: string): Promise<void> => {
  try {
    // The domain folder itself is the web root — no public_html subfolder
    const domainRoot = path.join(userHomePath, domainName);
    const indexPath  = path.join(domainRoot, "index.html");

    // Create the domain directory (idempotent)
    await fs.mkdir(domainRoot, { recursive: true });

    // Only seed placeholder pages if index.html does not yet exist
    // (avoids overwriting an active WordPress / custom site)
    const alreadyExists = await fs.stat(indexPath).then(() => true).catch(() => false);
    if (!alreadyExists) {
      await fs.writeFile(indexPath,                            INDEX_TEMPLATE,     "utf8");
      await fs.writeFile(path.join(domainRoot, "404.html"),   ERROR_404_TEMPLATE, "utf8");
      await fs.writeFile(path.join(domainRoot, "500.html"),   ERROR_500_TEMPLATE, "utf8");
      await fs.writeFile(path.join(domainRoot, "503.html"),   ERROR_503_TEMPLATE, "utf8");
    }

    console.log(`[domain] Provisioned directory: ${domainRoot}`);
  } catch (err) {
    // Non-fatal — log the error but don't block the DB record from being saved
    console.error(`[domain] Failed to provision directory for ${domainName}:`, err);
  }
};

/**
 * Remove the domain directory tree from the user's home.
 * This is intentionally non-fatal; if the folder doesn't exist we skip silently.
 */
const removeDomainDir = async (userHomePath: string, domainName: string): Promise<void> => {
  try {
    const domainRoot = path.join(userHomePath, domainName);
    await fs.rm(domainRoot, { recursive: true, force: true });
    console.log(`[domain] Removed directory: ${domainRoot}`);
  } catch (err) {
    console.error(`[domain] Failed to remove directory for ${domainName}:`, err);
  }
};

// ─── DB enrichment ────────────────────────────────────────────────────────────

const enrichDomain = async <T extends { id: string; domain_name: string }>(domain: T) => {
  const runtime = await probeDomainRuntime(domain.domain_name);

  await db.query(
    `UPDATE domains
     SET status = $1,
         ssl_enabled = $2,
         verification = $3::jsonb,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $4`,
    [runtime.status, runtime.sslEnabled, JSON.stringify(runtime), domain.id]
  );

  return {
    ...domain,
    status: runtime.status,
    ssl_enabled: runtime.sslEnabled,
    verification: runtime
  };
};

// ─── Table Bootstrap ──────────────────────────────────────────────────────────

let _domainsTableReady = false;
export const ensureDomainsTable = async () => {
  if (_domainsTableReady) return;
  await db.query(`
    CREATE TABLE IF NOT EXISTS domains (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        domain_name TEXT NOT NULL UNIQUE,
        status TEXT DEFAULT 'active',
        dns_provider TEXT DEFAULT 'odisea_managed',
        nameservers JSONB,
        ssl_enabled BOOLEAN DEFAULT false,
        verification JSONB,
        expiry_date TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE domains ADD COLUMN IF NOT EXISTS verification JSONB;
    ALTER TABLE domains ADD COLUMN IF NOT EXISTS ssl_enabled BOOLEAN DEFAULT false;
    ALTER TABLE domains ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending_verification';
    ALTER TABLE domains ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
  `);
  _domainsTableReady = true;
};

// ─── Public API ───────────────────────────────────────────────────────────────

export const listUserDomains = async (userId: string) => {
  await ensureDomainsTable();
  const result = await db.query(
    "SELECT d.*, u.username as username FROM domains d INNER JOIN users u ON u.id = d.user_id WHERE d.user_id = $1 ORDER BY d.domain_name ASC",
    [userId]
  );

  return result.rows;
};

export const listAllDomains = async () => {
  await ensureDomainsTable();
  const result = await db.query(
    "SELECT d.*, u.username as username FROM domains d INNER JOIN users u ON u.id = d.user_id ORDER BY d.created_at DESC"
  );

  return result.rows;
};

/**
 * Register a new domain in the database AND provision its file system directory.
 *
 * Flow:
 *  1. Normalize & validate the domain name.
 *  2. INSERT the record in PostgreSQL.
 *  3. Asynchronously create ~/dominio.com/{public_html,logs,tmp} with brand pages.
 *  4. Enrich the record with a live DNS/SSL probe.
 */
export const addDomain = async (userId: string, domainName: string) => {
  await ensureDomainsTable();
  const normalized = normalizeDomain(domainName);

  // 1. Save to database first (source of truth)
  const result = await db.query(
    "INSERT INTO domains (user_id, domain_name, status) VALUES ($1, $2, 'pending_verification') RETURNING *",
    [userId, normalized]
  );

  const domain = result.rows[0];

  // 2. Provision the domain directory on disk (non-blocking on error)
  try {
    const userHomePath = await getUserHomePath(userId);
    await provisionDomainDir(userHomePath, normalized);
  } catch (err) {
    console.error("[domain] Directory provisioning skipped:", err);
  }

  // 3. Probe DNS/SSL and update the record
  return enrichDomain(domain);
};

export const verifyUserDomain = async (userId: string, domainId: string) => {
  await ensureDomainsTable();
  const result = await db.query("SELECT * FROM domains WHERE id = $1 AND user_id = $2", [domainId, userId]);
  const domain = result.rows[0];

  if (!domain) {
    return null;
  }

  return enrichDomain(domain);
};

/**
 * Remove a domain from the database AND delete its directory from disk.
 *
 * The filesystem removal is best-effort — if it fails the DB record is
 * already gone and an admin can clean the orphan folder manually.
 */
export const deleteDomain = async (userId: string, domainId: string) => {
  await ensureDomainsTable();

  // Fetch domain info before deleting so we can remove the directory
  const domainResult = await db.query(
    "SELECT domain_name FROM domains WHERE id = $1 AND user_id = $2",
    [domainId, userId]
  );

  const domainRow = domainResult.rows[0];

  // Remove from database
  await db.query(
    "DELETE FROM domains WHERE id = $1 AND user_id = $2",
    [domainId, userId]
  );

  // Remove directory from disk (non-fatal)
  if (domainRow) {
    try {
      const userHomePath = await getUserHomePath(userId);
      await removeDomainDir(userHomePath, domainRow.domain_name as string);
    } catch (err) {
      console.error("[domain] Directory removal skipped:", err);
    }
  }
};
