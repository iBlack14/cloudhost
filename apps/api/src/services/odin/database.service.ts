import { db } from "../../config/db.js";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { env } from "../../config/env.js";
import { decryptSecret, encryptSecret } from "../../utils/secret.js";

const execFileAsync = promisify(execFile);

export interface RemoteDatabaseHost {
  id: string;
  name: string;
  host: string;
  enabled: boolean;
  createdAt: string;
}

const ensureRemoteHostsTable = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS remote_database_hosts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(120) NOT NULL DEFAULT '',
      host VARCHAR(43) NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE (user_id, host)
    )
  `);
};

const parseIpv4 = (value: string): number[] | null => {
  const parts = value.split(".");
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) return null;
  const octets = parts.map(Number);
  return octets.every((part) => part >= 0 && part <= 255) ? octets : null;
};

export const normalizeRemoteHost = (rawHost: string): string => {
  const value = rawHost.trim();
  const [ip, prefixRaw, ...extra] = value.split("/");
  const octets = parseIpv4(ip ?? "");
  if (!octets || extra.length > 0) throw new Error("Ingresa una dirección IPv4 o un rango CIDR válido");
  if (prefixRaw === undefined) return octets.join(".");

  if (!/^\d{1,2}$/.test(prefixRaw)) throw new Error("El prefijo CIDR debe estar entre 0 y 32");
  const prefix = Number(prefixRaw);
  if (prefix < 0 || prefix > 32) throw new Error("El prefijo CIDR debe estar entre 0 y 32");

  const ipNumber = octets.reduce((result, octet) => ((result << 8) | octet) >>> 0, 0);
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const network = (ipNumber & mask) >>> 0;
  const normalizedIp = [24, 16, 8, 0].map((shift) => (network >>> shift) & 255).join(".");
  return `${normalizedIp}/${prefix}`;
};

const toMysqlHost = (host: string): string => {
  if (!host.includes("/")) return host;
  const [network, prefixRaw] = host.split("/");
  const prefix = Number(prefixRaw);
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const netmask = [24, 16, 8, 0].map((shift) => (mask >>> shift) & 255).join(".");
  return `${network}/${netmask}`;
};

const quoteMysqlString = (value: string): string => `'${value.replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
const quoteMysqlIdentifier = (value: string): string => `\`${value.replace(/`/g, "``")}\``;
const internalMysqlHosts = ["localhost", "127.0.0.1", "172.%", "10.%", "192.168.%"];

const localGrantStatements = (dbName: string, dbUser: string, dbPassword: string): string[] =>
  internalMysqlHosts.flatMap((host) => {
    const user = quoteMysqlString(dbUser);
    const mysqlHost = quoteMysqlString(host);
    const password = quoteMysqlString(dbPassword);
    return [
      `CREATE USER IF NOT EXISTS ${user}@${mysqlHost} IDENTIFIED BY ${password}`,
      `ALTER USER ${user}@${mysqlHost} IDENTIFIED BY ${password}`,
      `GRANT ALL PRIVILEGES ON ${quoteMysqlIdentifier(dbName)}.* TO ${user}@${mysqlHost}`
    ];
  });

const runMysql = async (sql: string): Promise<void> => {
  await execFileAsync("docker", [
    "exec", "-i", env.MYSQL_CONTAINER_NAME,
    "mysql", "-uroot", `-p${env.MYSQL_ROOT_PASSWORD}`, "-e", sql
  ]);
};

export const provisionRemoteHostsForDatabase = async (
  userId: string,
  dbName: string,
  dbUser: string,
  dbPassword: string
): Promise<void> => {
  await ensureRemoteHostsTable();
  const result = await db.query(
    "SELECT host FROM remote_database_hosts WHERE user_id = $1 AND enabled = TRUE",
    [userId]
  );
  if (!result.rowCount) return;

  const statements = result.rows.flatMap(({ host }: { host: string }) => {
    const mysqlHost = quoteMysqlString(toMysqlHost(host));
    const user = quoteMysqlString(dbUser);
    const password = quoteMysqlString(dbPassword);
    return [
      `CREATE USER IF NOT EXISTS ${user}@${mysqlHost} IDENTIFIED BY ${password}`,
      `ALTER USER ${user}@${mysqlHost} IDENTIFIED BY ${password}`,
      `GRANT ALL PRIVILEGES ON ${quoteMysqlIdentifier(dbName)}.* TO ${user}@${mysqlHost}`
    ];
  });
  await runMysql(`${statements.join("; ")}; FLUSH PRIVILEGES;`);
};

const getUserDatabaseCredentials = async (userId: string) => {
  const result = await db.query(
    `SELECT db_name, db_user, db_password_ciphertext FROM user_databases WHERE user_id = $1
     UNION ALL
     SELECT db_name, db_user, db_password_ciphertext FROM wordpress_sites WHERE user_id = $1`,
    [userId]
  );
  return result.rows as Array<{ db_name: string; db_user: string; db_password_ciphertext: string | null }>;
};

const applyRemoteHost = async (userId: string, host: string, enabled: boolean): Promise<void> => {
  const credentials = await getUserDatabaseCredentials(userId);
  if (credentials.length === 0) return;
  const mysqlHost = toMysqlHost(host);
  const statements: string[] = [];

  for (const credential of credentials) {
    const user = quoteMysqlString(credential.db_user);
    const grantHost = quoteMysqlString(mysqlHost);
    if (!credential.db_password_ciphertext) {
      throw new Error(`No se puede administrar acceso remoto para la credencial antigua ${credential.db_user}`);
    }
    const decryptedPassword = decryptSecret(credential.db_password_ciphertext);
    statements.push(...localGrantStatements(credential.db_name, credential.db_user, decryptedPassword));
    if (enabled) {
      const password = quoteMysqlString(decryptedPassword);
      statements.push(
        `CREATE USER IF NOT EXISTS ${user}@${grantHost} IDENTIFIED BY ${password}`,
        `ALTER USER ${user}@${grantHost} IDENTIFIED BY ${password}`,
        `GRANT ALL PRIVILEGES ON ${quoteMysqlIdentifier(credential.db_name)}.* TO ${user}@${grantHost}`
      );
    } else {
      statements.push(`DROP USER IF EXISTS ${user}@${grantHost}`);
    }
    statements.push(`DROP USER IF EXISTS ${user}@'%'`);
  }
  statements.push("FLUSH PRIVILEGES");
  await runMysql(`${statements.join("; ")};`);
};

export const listRemoteHosts = async (userId: string): Promise<RemoteDatabaseHost[]> => {
  await ensureRemoteHostsTable();
  const result = await db.query(
    `SELECT id, name, host, enabled, created_at AS "createdAt"
     FROM remote_database_hosts WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
};

export const createRemoteHost = async (userId: string, name: string, rawHost: string): Promise<RemoteDatabaseHost> => {
  await ensureRemoteHostsTable();
  const host = normalizeRemoteHost(rawHost);
  const cleanName = name.trim().slice(0, 120);
  await applyRemoteHost(userId, host, true);
  try {
    const result = await db.query(
      `INSERT INTO remote_database_hosts (user_id, name, host)
       VALUES ($1, $2, $3)
       RETURNING id, name, host, enabled, created_at AS "createdAt"`,
      [userId, cleanName, host]
    );
    return result.rows[0];
  } catch (error: any) {
    await applyRemoteHost(userId, host, false).catch(() => undefined);
    if (error?.code === "23505") throw new Error("Esta IP o rango ya está autorizado");
    throw error;
  }
};

export const setRemoteHostEnabled = async (userId: string, id: string, enabled: boolean): Promise<RemoteDatabaseHost> => {
  await ensureRemoteHostsTable();
  const current = await db.query("SELECT host FROM remote_database_hosts WHERE id = $1 AND user_id = $2", [id, userId]);
  if (!current.rowCount) throw new Error("Host remoto no encontrado");
  await applyRemoteHost(userId, current.rows[0].host, enabled);
  const result = await db.query(
    `UPDATE remote_database_hosts SET enabled = $1 WHERE id = $2 AND user_id = $3
     RETURNING id, name, host, enabled, created_at AS "createdAt"`,
    [enabled, id, userId]
  );
  return result.rows[0];
};

export const deleteRemoteHost = async (userId: string, id: string): Promise<void> => {
  await ensureRemoteHostsTable();
  const current = await db.query("SELECT host FROM remote_database_hosts WHERE id = $1 AND user_id = $2", [id, userId]);
  if (!current.rowCount) throw new Error("Host remoto no encontrado");
  await applyRemoteHost(userId, current.rows[0].host, false);
  await db.query("DELETE FROM remote_database_hosts WHERE id = $1 AND user_id = $2", [id, userId]);
};

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

export const createMysqlDatabase = async (dbName: string, dbUser: string, dbPassword: string) => {
  const statements = [
    `CREATE DATABASE IF NOT EXISTS ${quoteMysqlIdentifier(dbName)}`,
    ...localGrantStatements(dbName, dbUser, dbPassword),
    `DROP USER IF EXISTS ${quoteMysqlString(dbUser)}@'%'`,
    "FLUSH PRIVILEGES"
  ];
  await runMysql(`${statements.join("; ")};`);
};

export const listUserDatabases = async (userId: string) => {
  await ensureUserDatabasesTable();

  // Query custom user databases
  const userResult = await db.query("SELECT db_name as name, db_user as user, 'custom' as type FROM user_databases WHERE user_id = $1", [userId]);
  
  // Query WP databases
  const wpResult = await db.query("SELECT db_name as name, db_user as user, 'wordpress' as type FROM wordpress_sites WHERE user_id = $1", [userId]);
  
  return [...userResult.rows, ...wpResult.rows];
};

export const createCustomDatabase = async (userId: string, dbNameRaw: string, dbPassword: string) => {
  await ensureUserDatabasesTable();

  const userQuery = await db.query("SELECT username FROM users WHERE id = $1", [userId]);
  if (userQuery.rowCount === 0) throw new Error("User not found");
  
  const username = userQuery.rows[0].username.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  
  // Prefix db to ensure uniqueness
  const safeDbName = dbNameRaw.replace(/[^a-z0-9_]/gi, "").substring(0, 15);
  const dbName = `${username}_${safeDbName}`;
  const dbUser = `${username}_usr${Math.floor(Math.random() * 100)}`;
  
  await createMysqlDatabase(dbName, dbUser, dbPassword);
  
  await db.query(
    `
      INSERT INTO user_databases (user_id, db_name, db_user, db_password_hash, db_password_ciphertext)
      VALUES ($1, $2, $3, $4, $5)
    `,
    [userId, dbName, dbUser, "managed", encryptSecret(dbPassword)]
  );
  await provisionRemoteHostsForDatabase(userId, dbName, dbUser, dbPassword);
  
  return { dbName, dbUser };
};

export const getRemoteDatabaseConnectionInfo = (requestHost: string) => ({
  host: env.MYSQL_PUBLIC_HOST || requestHost,
  port: env.MYSQL_HOST_PORT
});
