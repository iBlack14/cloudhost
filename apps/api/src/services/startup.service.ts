/**
 * Startup initialization — runs once when the server boots.
 * All DDL (CREATE TABLE IF NOT EXISTS) and index creation happens here,
 * so individual request handlers don't pay the cost of DDL round-trips.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { db } from "../config/db.js";
import { ensureWordPressTable } from "./odin/wordpress.service.js";
import { ensureDomainsTable } from "./odin/domain.service.js";
import { ensureNodejsTables } from "./odin/nodejs.service.js";
import { ensurePythonTables } from "./odin/python.service.js";
import { ensureMailSchema } from "./mail.service.js";
import { ensureDockerAppsTable } from "./odin/cloudweb.service.js";

const ensureUserDatabasesTable = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS user_databases (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      db_name VARCHAR(128) NOT NULL,
      db_user VARCHAR(128) NOT NULL,
      db_password_hash VARCHAR(255) NOT NULL,
      db_password_ciphertext TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    ALTER TABLE user_databases
      ADD COLUMN IF NOT EXISTS db_password_ciphertext TEXT;
  `);
};

const ensureServerSettings = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS server_settings (
      key VARCHAR(128) PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
};

const ensurePerformanceIndexes = async () => {
  // Idempotent — IF NOT EXISTS means safe to run on every startup.
  // Using regular CREATE INDEX (not CONCURRENTLY) since this runs at startup
  // before the server accepts traffic.
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_wordpress_sites_user_id  ON wordpress_sites(user_id);
    CREATE INDEX IF NOT EXISTS idx_wordpress_sites_domain   ON wordpress_sites(domain);
    CREATE INDEX IF NOT EXISTS idx_domains_user_id          ON domains(user_id);
    CREATE INDEX IF NOT EXISTS idx_nodejs_apps_user_id      ON nodejs_apps(user_id);
    CREATE INDEX IF NOT EXISTS idx_python_apps_user_id      ON python_apps(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_databases_user_id   ON user_databases(user_id);
    CREATE INDEX IF NOT EXISTS idx_hosting_accounts_user_id ON hosting_accounts(user_id);
  `).catch(() => {
    // Non-fatal — index creation may fail if table doesn't exist yet on first run.
    // Tables are created above so retry order handles this.
  });
};

export const runStartupInit = async (): Promise<void> => {
  const start = Date.now();
  console.log("[startup] Initializing database schema...");

  try {
    // Run DDL in dependency order (tables first, then indexes)
    await Promise.all([
      ensureWordPressTable(),
      ensureDomainsTable(),
      ensureNodejsTables(),
      ensurePythonTables(),
      ensureUserDatabasesTable(),
      ensureServerSettings(),
      ensureMailSchema(),
      ensureDockerAppsTable(),
    ]);

    // Add plan_expires_at column dynamically if it doesn't exist
    await db.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMP WITH TIME ZONE;
    `);

    // Indexes after tables exist
    await ensurePerformanceIndexes();

    console.log(`[startup] Schema ready in ${Date.now() - start}ms`);
  } catch (err) {
    console.error("[startup] Schema init failed (non-fatal):", err);
    // Don't crash the server — some tables may already exist
  }

  // Reset update status if it was completed (success/failed), since the server has rebooted
  try {
    const statusFile = path.resolve(process.cwd(), "../../update-status.json");
    const content = await fs.readFile(statusFile, "utf-8");
    const processStatus = JSON.parse(content);
    if (processStatus && (processStatus.status === "success" || processStatus.status === "failed")) {
      await fs.unlink(statusFile).catch(() => {});
      console.log("[startup] Reset update-status.json file after successful/failed update restart.");
    }
  } catch {
    // Ignore if file doesn't exist or is invalid
  }
};
