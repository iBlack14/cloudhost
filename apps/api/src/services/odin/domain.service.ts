import { db } from "../../config/db.js";

export const ensureDomainsTable = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS domains (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        domain_name TEXT NOT NULL UNIQUE,
        status TEXT DEFAULT 'active',
        dns_provider TEXT DEFAULT 'nexhost_managed',
        nameservers JSONB,
        ssl_enabled BOOLEAN DEFAULT false,
        expiry_date TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
};

export const listUserDomains = async (userId: string) => {
  await ensureDomainsTable();
  const result = await db.query(
    "SELECT d.*, u.username as owner_name FROM domains d INNER JOIN users u ON u.id = d.user_id WHERE d.user_id = $1 ORDER BY d.domain_name ASC",
    [userId]
  );
  return result.rows;
};

export const listAllDomains = async () => {
  await ensureDomainsTable();
  const result = await db.query(
    "SELECT d.*, u.username as owner_name FROM domains d INNER JOIN users u ON u.id = d.user_id ORDER BY d.created_at DESC"
  );
  return result.rows;
};

export const addDomain = async (userId: string, domainName: string) => {
  await ensureDomainsTable();
  const result = await db.query(
    "INSERT INTO domains (user_id, domain_name) VALUES ($1, $2) RETURNING *",
    [userId, domainName]
  );
  return result.rows[0];
};

export const deleteDomain = async (userId: string, domainId: string) => {
  await ensureDomainsTable();
  await db.query(
    "DELETE FROM domains WHERE id = $1 AND user_id = $2",
    [domainId, userId]
  );
};
