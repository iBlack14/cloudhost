import { db } from "../../config/db.js";
import { probeDomainRuntime } from "./runtime-probe.service.js";

const normalizeDomain = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "");

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

export const ensureDomainsTable = async () => {
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
};

export const listUserDomains = async (userId: string) => {
  await ensureDomainsTable();
  const result = await db.query(
    "SELECT d.*, u.username as owner_name FROM domains d INNER JOIN users u ON u.id = d.user_id WHERE d.user_id = $1 ORDER BY d.domain_name ASC",
    [userId]
  );

  return Promise.all(result.rows.map((domain) => enrichDomain(domain)));
};

export const listAllDomains = async () => {
  await ensureDomainsTable();
  const result = await db.query(
    "SELECT d.*, u.username as owner_name FROM domains d INNER JOIN users u ON u.id = d.user_id ORDER BY d.created_at DESC"
  );

  return Promise.all(result.rows.map((domain) => enrichDomain(domain)));
};

export const addDomain = async (userId: string, domainName: string) => {
  await ensureDomainsTable();
  const normalized = normalizeDomain(domainName);

  const result = await db.query(
    "INSERT INTO domains (user_id, domain_name, status) VALUES ($1, $2, 'pending_verification') RETURNING *",
    [userId, normalized]
  );

  return enrichDomain(result.rows[0]);
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

export const deleteDomain = async (userId: string, domainId: string) => {
  await ensureDomainsTable();
  await db.query(
    "DELETE FROM domains WHERE id = $1 AND user_id = $2",
    [domainId, userId]
  );
};
