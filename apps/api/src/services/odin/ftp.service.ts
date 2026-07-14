import { db } from "../../config/db.js";
import { encryptSecret } from "../../utils/secret.js";

const ensureFtpAccountsTable = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS ftp_accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      username VARCHAR(128) NOT NULL,
      password_ciphertext TEXT NOT NULL,
      path TEXT NOT NULL DEFAULT '/',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(user_id, username)
    );
  `);
};

export const listFtpAccounts = async (userId: string) => {
  await ensureFtpAccountsTable();
  const result = await db.query(
    "SELECT id, username, path, created_at FROM ftp_accounts WHERE user_id = $1 ORDER BY created_at DESC",
    [userId]
  );
  return result.rows;
};

export const createFtpAccount = async (userId: string, username: string, passwordRaw: string, path: string) => {
  await ensureFtpAccountsTable();

  // Enforce the prefix based on system user username
  const userQuery = await db.query("SELECT username FROM users WHERE id = $1", [userId]);
  if (userQuery.rowCount === 0) throw new Error("User not found");
  
  const sysUser = userQuery.rows[0].username.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  
  // Format username: sysUser_username if they didn't include it
  const cleanUsername = username.replace(/[^a-z0-9_]/gi, "").substring(0, 20);
  const finalUsername = cleanUsername.startsWith(`${sysUser}_`) ? cleanUsername : `${sysUser}_${cleanUsername}`;

  const ciphertext = encryptSecret(passwordRaw);

  const result = await db.query(
    `INSERT INTO ftp_accounts (user_id, username, password_ciphertext, path)
     VALUES ($1, $2, $3, $4)
     RETURNING id, username, path, created_at`,
    [userId, finalUsername, ciphertext, path]
  );

  return result.rows[0];
};

export const deleteFtpAccount = async (userId: string, id: string) => {
  await ensureFtpAccountsTable();
  const result = await db.query(
    "DELETE FROM ftp_accounts WHERE id = $1 AND user_id = $2 RETURNING id",
    [id, userId]
  );
  if (result.rowCount === 0) throw new Error("FTP account not found or access denied");
};

export const updateFtpPassword = async (userId: string, id: string, newPasswordRaw: string) => {
  await ensureFtpAccountsTable();
  const ciphertext = encryptSecret(newPasswordRaw);
  const result = await db.query(
    "UPDATE ftp_accounts SET password_ciphertext = $1 WHERE id = $2 AND user_id = $3 RETURNING id",
    [ciphertext, id, userId]
  );
  if (result.rowCount === 0) throw new Error("FTP account not found or access denied");
};
