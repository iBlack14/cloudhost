import { exec } from "node:child_process";
import { promisify } from "node:util";
import { env } from "../../config/env.js";
import { db } from "../../config/db.js";

const execAsync = promisify(exec);

const buildCommand = (query: string) => 
  `docker exec -i odisea-mysql mysql -uroot -p"${env.MYSQL_ROOT_PASSWORD}" -e "${query}"`;

export interface AdminDatabaseRow {
  db_name: string;
  db_user: string;
  type: "wordpress" | "custom";
  owner_username: string;
  size_mb?: number;
}

export const listAllDatabases = async (): Promise<AdminDatabaseRow[]> => {
  // Query from postgreSQL internal registry
  const wpQuery = await db.query(`
    SELECT w.db_name, w.db_user, 'wordpress' as type, u.username as owner_username 
    FROM wordpress_sites w JOIN users u ON u.id = w.user_id
  `);
  
  const customQuery = await db.query(`
    SELECT c.db_name, c.db_user, 'custom' as type, u.username as owner_username 
    FROM user_databases c JOIN users u ON u.id = c.user_id
  `);

  const allDbs = [...wpQuery.rows, ...customQuery.rows] as AdminDatabaseRow[];

  // Ask MySQL for sizes
  try {
    const sizeQuery = `
      SELECT table_schema AS 'db',
             ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'size_mb'
      FROM information_schema.tables
      GROUP BY table_schema;
    `;
    const { stdout } = await execAsync(buildCommand(sizeQuery));
    const lines = stdout.trim().split("\n").slice(1);
    
    const sizeMap: Record<string, number> = {};
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2) {
        sizeMap[parts[0]] = parseFloat(parts[1]);
      }
    }

    return allDbs.map((db) => ({
      ...db,
      size_mb: sizeMap[db.db_name] ?? 0
    }));
  } catch {
    return allDbs;
  }
};

export const repairDatabase = async (dbName: string): Promise<void> => {
  // Finds all tables and repairs them
  const findQuery = `SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema='${dbName}';`;
  const { stdout } = await execAsync(buildCommand(findQuery));
  const tables = stdout.trim().split("\n").slice(1);

  if (tables.length === 0) return;

  const repairSql = tables.map(t => `REPAIR TABLE \\\`${dbName}\\\`.\\\`${t.trim()}\\\`;`).join(" ");
  await execAsync(buildCommand(repairSql));
};

export const optimizeDatabase = async (dbName: string): Promise<void> => {
  const findQuery = `SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema='${dbName}';`;
  const { stdout } = await execAsync(buildCommand(findQuery));
  const tables = stdout.trim().split("\n").slice(1);

  if (tables.length === 0) return;

  const optimizeSql = tables.map(t => `OPTIMIZE TABLE \\\`${dbName}\\\`.\\\`${t.trim()}\\\`;`).join(" ");
  await execAsync(buildCommand(optimizeSql));
};

export const generateSsoUrl = async (dbName: string): Promise<string> => {
  // phpMyAdmin is running at env.PHPMYADMIN_URL
  // In a real environment, you might issue a temporary token. For now we just return the URL of phpmyadmin.
  return `${env.API_URL?.replace("api/v1", "pma") || "http://localhost:8080"}/index.php?db=${dbName}`;
};

export const resetDbUserPassword = async (dbUser: string, newPass: string): Promise<void> => {
  await execAsync(buildCommand(`ALTER USER '${dbUser}'@'%' IDENTIFIED BY '${newPass}';`));
  await execAsync(buildCommand(`FLUSH PRIVILEGES;`));
};
