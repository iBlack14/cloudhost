import { db } from "../../config/db.js";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { env } from "../../config/env.js";
import { encryptSecret } from "../../utils/secret.js";

const execAsync = promisify(exec);

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
  const rootPass = env.MYSQL_ROOT_PASSWORD;
  const buildCommand = (query: string) => `docker exec -i odisea-mysql mysql -uroot -p${rootPass} -e "${query}"`;

  await execAsync(buildCommand(`CREATE DATABASE IF NOT EXISTS \\\`${dbName}\\\`;`));
  
  // Create user if not exists using CREATE USER ... IF NOT EXISTS (MySQL 5.7+)
  await execAsync(buildCommand(`CREATE USER IF NOT EXISTS '${dbUser}'@'%' IDENTIFIED BY '${dbPassword}';`));
  
  // If user already existed, change password to enforce what we want
  await execAsync(buildCommand(`ALTER USER '${dbUser}'@'%' IDENTIFIED BY '${dbPassword}';`));
  
  await execAsync(buildCommand(`GRANT ALL PRIVILEGES ON \\\`${dbName}\\\`.* TO '${dbUser}'@'%';`));
  await execAsync(buildCommand(`FLUSH PRIVILEGES;`));
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
  
  return { dbName, dbUser };
};
