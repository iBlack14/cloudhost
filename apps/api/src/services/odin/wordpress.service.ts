import { db } from "../../config/db.js";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

const execAsync = promisify(exec);

export interface InstallWpInput {
  userId: string;
  accountId?: string;
  domain: string;
  directory?: string;
  siteTitle: string;
  adminUser: string;
  adminPass: string;
}

export const installWordPress = async (input: InstallWpInput) => {
  const { userId, domain, directory, siteTitle, adminUser } = input;
  
  // 1. Generate unique database details
  const sanitize = (str: string) => str.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const dbName = `wp_${sanitize(domain)}_${Date.now().toString().slice(-4)}`;
  const dbUser = `u_${sanitize(adminUser)}`;
  const dbPassword = randomBytes(16).toString("hex");
  
  console.log(`[wp:install] Starting installation for ${domain} (${dbName})`);

  // 2. Simulate/Run DB Creation (In a real environment, we'd talk to the DB server)
  // For demo/dev purposes, we'll record it in our main Postgres DB
  const client = await db.connect();
  
  try {
    // AUTO-CREATE TABLE IF MISSING (Dev Mode Fix)
    await client.query(`
      CREATE TABLE IF NOT EXISTS wordpress_sites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        account_id UUID,
        site_title TEXT NOT NULL,
        domain TEXT NOT NULL,
        install_path TEXT NOT NULL,
        wp_version TEXT NOT NULL,
        php_version TEXT NOT NULL,
        db_name TEXT NOT NULL,
        db_user TEXT NOT NULL,
        admin_user TEXT NOT NULL,
        auto_updates BOOLEAN DEFAULT true,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query("BEGIN");

    // Insert into our tracking table
    const result = await client.query(
      `INSERT INTO wordpress_sites (
        user_id, account_id, site_title, domain, install_path, 
        wp_version, php_version, db_name, db_user, admin_user
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id`,
      [
        userId,
        input.accountId || null,
        siteTitle,
        domain,
        directory ? `${domain}/${directory}` : domain,
        "6.4.3",
        "8.3",
        dbName,
        dbUser,
        adminUser
      ]
    );

    const wpId = result.rows[0].id;

    // 3. Physical Installation & DB Creation
    // In a real environment, we'd use the root password from docker-compose
    try {
      console.log(`[wp:install] Creating MySQL database: ${dbName}`);
      await execAsync(`docker exec odisea-mysql mysql -uroot -proot -e "CREATE DATABASE IF NOT EXISTS ${dbName};"`);
    } catch (dbErr) {
      console.warn("[wp:install:db_warn] Could not create DB via docker exec, skipping physical DB creation for now.", dbErr);
    }
    
    const installRoot = path.join(process.cwd(), "../../infra/wp_installs", sanitize(domain));
    await fs.mkdir(installRoot, { recursive: true });
    
    await fs.writeFile(
      path.join(installRoot, "wp-config.php"),
      `<?php
/** WordPress Config Mock for ${siteTitle} **/
define('DB_NAME', '${dbName}');
define('DB_USER', '${dbUser}');
define('DB_PASSWORD', '${dbPassword}');
define('DB_HOST', 'localhost');
?>`
    );

    await client.query(
      `INSERT INTO activity_logs (user_id, action, resource, details)
       VALUES ($1, 'install_wordpress', 'wordpress_site', $2::jsonb)`,
      [userId, JSON.stringify({ wpId, domain, dbName })]
    );

    await client.query("COMMIT");
    
    return {
      success: true,
      data: {
        id: wpId,
        domain,
        dbName,
        adminUrl: `http://${domain}/wp-admin`
      }
    };
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[wp:install:error]", error);
    throw error;
  } finally {
    client.release();
  }
};

export const listUserWpSites = async (userId: string) => {
  // AUTO-CREATE TABLE IF MISSING (Dev Mode Fix)
  await db.query(`
    CREATE TABLE IF NOT EXISTS wordpress_sites (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      account_id UUID,
      site_title TEXT NOT NULL,
      domain TEXT NOT NULL,
      install_path TEXT NOT NULL,
      wp_version TEXT NOT NULL,
      php_version TEXT NOT NULL,
      db_name TEXT NOT NULL,
      db_user TEXT NOT NULL,
      admin_user TEXT NOT NULL,
      auto_updates BOOLEAN DEFAULT true,
      status TEXT DEFAULT 'active',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const result = await db.query(
    "SELECT * FROM wordpress_sites WHERE user_id = $1 ORDER BY created_at DESC",
    [userId]
  );
  return result.rows;
};

export const getWpSiteById = async (id: string, userId: string) => {
  const result = await db.query(
    "SELECT * FROM wordpress_sites WHERE id = $1 AND user_id = $2",
    [id, userId]
  );
  return result.rows[0] || null;
};
