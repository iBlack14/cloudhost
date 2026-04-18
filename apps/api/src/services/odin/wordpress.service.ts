import { db } from "../../config/db.js";
import { env } from "../../config/env.js";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import { probeDomainRuntime } from "./runtime-probe.service.js";

const execAsync = promisify(exec);

export type PhpVersion = "8.1" | "8.2" | "8.3" | "8.4" | "8.5";

export interface InstallWpInput {
  userId: string;
  accountId?: string;
  domain: string;
  directory?: string;
  siteTitle: string;
  siteDescription?: string;
  adminUser: string;
  adminPass: string;
  adminEmail: string;
  wpVersion?: string;
  phpVersion?: PhpVersion;
  protocol?: string;
}

const sanitize = (str: string) => str.replace(/[^a-z0-9]/gi, "_").toLowerCase();

const ensureWordPressTable = async () => {
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
      status TEXT DEFAULT 'provisioning',
      admin_url TEXT,
      runtime JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE wordpress_sites ADD COLUMN IF NOT EXISTS admin_url TEXT;
    ALTER TABLE wordpress_sites ADD COLUMN IF NOT EXISTS runtime JSONB;
    ALTER TABLE wordpress_sites ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'provisioning';
    ALTER TABLE wordpress_sites ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
  `);
};

const createMysqlResources = async (dbName: string, dbUser: string, dbPassword: string) => {
  const sql = [
    `CREATE DATABASE IF NOT EXISTS ${dbName};`,
    `CREATE USER IF NOT EXISTS '${dbUser}'@'%' IDENTIFIED BY '${dbPassword}';`,
    `GRANT ALL PRIVILEGES ON ${dbName}.* TO '${dbUser}'@'%';`,
    "FLUSH PRIVILEGES;"
  ].join(" ");

  const cmd = `docker exec -i ${env.MYSQL_CONTAINER_NAME} mysql -uroot -p${env.MYSQL_ROOT_PASSWORD} -e "${sql}"`;
  await execAsync(cmd);
};

const probeWpLogin = async (url: string, timeoutMs = 6000): Promise<{ ok: boolean; status?: number; isWordPress?: boolean }> => {
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs)
    });
    const text = await response.text();
    const isWordPress =
      text.toLowerCase().includes("wp-login.php") ||
      text.toLowerCase().includes("wordpress") ||
      text.toLowerCase().includes("name=\"log\"");
    return { ok: response.status < 500, status: response.status, isWordPress };
  } catch {
    return { ok: false };
  }
};

const enrichWpSite = async <
  T extends { id: string; domain: string; admin_url?: string | null }
>(
  site: T
) => {
  const domainProbe = await probeDomainRuntime(site.domain);
  const httpsProbe = await probeWpLogin(`https://${site.domain}/wp-login.php`);
  const httpProbe = await probeWpLogin(`http://${site.domain}/wp-login.php`);

  const reachable = httpsProbe.ok || httpProbe.ok;
  const endpoint = httpsProbe.ok
    ? `https://${site.domain}`
    : httpProbe.ok
      ? `http://${site.domain}`
      : null;

  const runtimeStatus = reachable
    ? "active"
    : domainProbe.dns.resolves
      ? "offline"
      : "pending_verification";

  const runtime = {
    reachable,
    endpoint,
    checks: {
      https: httpsProbe,
      http: httpProbe
    },
    domain: domainProbe
  };

  const adminUrl = endpoint ? `${endpoint}/wp-admin` : site.admin_url ?? `https://${site.domain}/wp-admin`;

  await db.query(
    `UPDATE wordpress_sites
     SET status = $1,
         admin_url = $2,
         runtime = $3::jsonb,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $4`,
    [runtimeStatus, adminUrl, JSON.stringify(runtime), site.id]
  );

  return {
    ...site,
    status: runtimeStatus,
    admin_url: adminUrl,
    runtime
  };
};

export const installWordPress = async (input: InstallWpInput) => {
  const { userId, domain, directory, siteTitle, adminUser } = input;
  await ensureWordPressTable();

  const normalizedDomain = domain.trim().toLowerCase();
  const dbName = `wp_${sanitize(normalizedDomain)}_${Date.now().toString().slice(-4)}`;
  const dbUser = `u_${sanitize(adminUser).slice(0, 24)}`;
  const dbPassword = randomBytes(16).toString("hex");

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    // Get the user's username for the linux OS path
    const userResult = await client.query("SELECT username FROM users WHERE id = $1", [userId]);
    if (userResult.rowCount === 0) throw new Error("Usuario no encontrado");
    const osUsername = sanitize(userResult.rows[0].username);

    const created = await client.query(
      `INSERT INTO wordpress_sites (
        user_id, account_id, site_title, domain, install_path,
        wp_version, php_version, db_name, db_user, admin_user, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'provisioning')
      RETURNING id`,
      [
        userId,
        input.accountId ?? null,
        siteTitle,
        normalizedDomain,
        directory ? `${normalizedDomain}/${directory}` : normalizedDomain,
        input.wpVersion ?? "6.4.3",
        "8.3",
        dbName,
        dbUser,
        adminUser
      ]
    );

    const wpId = created.rows[0].id as string;
    const siteDir = directory ? `/${directory}` : "";
    const siteUrl = `${input.protocol ?? "http://"}${normalizedDomain}${siteDir}`;
    const targetPath = `/home/${osUsername}/public_html${siteDir}`;

    try {
      // 1. Ensure Linux User
      try {
        await execAsync(`id -u ${osUsername}`);
      } catch {
        await execAsync(`useradd -m -s /bin/bash ${osUsername}`);
      }

      // 2. Setup Directory Structure
      await fs.mkdir(`/home/${osUsername}/etc`, { recursive: true });
      await fs.mkdir(`/home/${osUsername}/logs`, { recursive: true });
      await fs.mkdir(`/home/${osUsername}/lscache`, { recursive: true });
      await fs.mkdir(`/home/${osUsername}/mail`, { recursive: true });
      await fs.mkdir(`/home/${osUsername}/public_ftp`, { recursive: true });
      await fs.mkdir(`/home/${osUsername}/ssl`, { recursive: true });
      await fs.mkdir(`/home/${osUsername}/tmp`, { recursive: true });
      await fs.mkdir(targetPath, { recursive: true });

      // Link www to public_html
      await execAsync(`ln -sf /home/${osUsername}/public_html /home/${osUsername}/www`);
      
      // Ownership
      await execAsync(`chown -R ${osUsername}:${osUsername} /home/${osUsername}`);
      await execAsync(`chmod 755 /home/${osUsername}`);

      // 3. MySQL Database
      await createMysqlResources(dbName, dbUser, dbPassword);
      
      // Wait a moment for DB availability
      await new Promise(r => setTimeout(r, 2000));

      // 4. Download and Install WordPress using native WP-CLI
      console.log(`[odin:wordpress] Downloading WordPress for ${normalizedDomain}...`);
      await execAsync(`wp core download --path=${targetPath} --allow-root --force`);

      console.log(`[odin:wordpress] Configuring wp-config.php for ${normalizedDomain}...`);
      await execAsync(`wp core config --path=${targetPath} --dbname=${dbName} --dbuser=${dbUser} --dbpass=${dbPassword} --dbhost=127.0.0.1:${env.MYSQL_HOST_PORT} --allow-root --force`);

      console.log(`[odin:wordpress] Installing WordPress core for ${normalizedDomain}...`);
      await execAsync(`wp core install --path=${targetPath} --url='${siteUrl}' --title='${siteTitle}' --admin_user='${adminUser}' --admin_password='${input.adminPass}' --admin_email='${input.adminEmail}' --skip-email --allow-root`);

      if (input.siteDescription) {
        await execAsync(`wp option update blogdescription '${input.siteDescription}' --path=${targetPath} --allow-root`).catch(() => {});
      }

      // Fix ownership after WP-CLI creates files as root
      await execAsync(`chown -R ${osUsername}:www-data ${targetPath}`);
      await execAsync(`find ${targetPath} -type d -exec chmod 755 {} \\;`);
      await execAsync(`find ${targetPath} -type f -exec chmod 644 {} \\;`);

      // 5. Configure PHP-FPM Pool
      const phpVer: string = input.phpVersion ?? "8.4"; // Multi-PHP: use selected version
      console.log(`[odin:wordpress] Configuring PHP-FPM ${phpVer} for ${osUsername}...`);
      const fpmConfig = `
[${osUsername}]
user = ${osUsername}
group = www-data
listen = /run/php/php${phpVer}-fpm-${osUsername}.sock
listen.owner = www-data
listen.group = www-data
pm = dynamic
pm.max_children = 10
pm.start_servers = 2
pm.min_spare_servers = 1
pm.max_spare_servers = 3
php_admin_value[error_log] = /home/${osUsername}/logs/error.log
php_admin_flag[log_errors] = on
      `.trim();
      await fs.writeFile(`/etc/php/${phpVer}/fpm/pool.d/${osUsername}.conf`, fpmConfig, "utf8");
      await execAsync(`systemctl reload php${phpVer}-fpm`);


      // 6. Configure Nginx and SSL
      console.log(`[odin:wordpress] Configuring Nginx/SSL for ${normalizedDomain}...`);
      
      const nginxConfig = `
server {
    listen 80;
    server_name ${normalizedDomain} www.${normalizedDomain};
    root /home/${osUsername}/public_html${siteDir};
    index index.php index.html index.htm;
    
    access_log /home/${osUsername}/logs/access.log;
    error_log /home/${osUsername}/logs/error.log;

    location / {
        try_files $uri $uri/ /index.php?$args;
    }

    location ~ \\.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php${phpVer}-fpm-${osUsername}.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\\.ht {
        deny all;
    }
}
      `.trim();
      
      await fs.writeFile(`/etc/nginx/sites-available/${normalizedDomain}`, nginxConfig, "utf8");
      await execAsync(`ln -sf /etc/nginx/sites-available/${normalizedDomain} /etc/nginx/sites-enabled/`);
      await execAsync(`systemctl reload nginx`);

      // Attempt SSL via Certbot
      try {
        await execAsync(`certbot --nginx -d ${normalizedDomain} --non-interactive --agree-tos -m ${input.adminEmail} --redirect`);
        console.log(`[odin:wordpress] SSL successfully issued for ${normalizedDomain}`);
      } catch (sslErr) {
        console.warn(`[odin:wordpress:ssl] SSL failed (DNS might not resolve yet). Fallback to HTTP for ${normalizedDomain}`);
      }

    } catch (error) {
      await client.query(
        "UPDATE wordpress_sites SET status = 'provisioning_failed', runtime = $1::jsonb WHERE id = $2",
        [JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), wpId]
      );
      throw error;
    }

    await client.query(
      `UPDATE wordpress_sites
       SET admin_url = $1,
           status = 'pending_verification'
       WHERE id = $2`,
      [`https://${normalizedDomain}/wp-admin`, wpId]
    );

    await client.query(
      `INSERT INTO activity_logs (user_id, action, resource, details)
       VALUES ($1, 'install_wordpress', 'wordpress_site', $2::jsonb)`,
      [
        userId,
        JSON.stringify({ wpId, domain: normalizedDomain, dbName, osUsername })
      ]
    );

    await client.query("COMMIT");

    return {
      success: true,
      data: {
        id: wpId,
        domain: normalizedDomain,
        dbName,
        osUsername,
        adminUrl: `https://${normalizedDomain}/wp-admin`,
        status: "pending_verification"
      }
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const listUserWpSites = async (userId: string) => {
  await ensureWordPressTable();
  const result = await db.query("SELECT * FROM wordpress_sites WHERE user_id = $1 ORDER BY created_at DESC", [userId]);
  return Promise.all(result.rows.map((site) => enrichWpSite(site)));
};

export const getWpSiteById = async (id: string, userId: string) => {
  await ensureWordPressTable();
  const result = await db.query("SELECT * FROM wordpress_sites WHERE id = $1 AND user_id = $2", [id, userId]);
  const site = result.rows[0] ?? null;
  if (!site) return null;
  return enrichWpSite(site);
};

export const deleteWordPress = async (id: string, userId: string) => {
  const site = await getWpSiteById(id, userId);
  if (!site) throw new Error("Sitio no encontrado");

  const domain = site.domain;
  const userResult = await db.query("SELECT username FROM users WHERE id = $1", [userId]);
  const osUsername = sanitize(userResult.rows[0]?.username ?? "");

  // 1. Remove Nginx Proxy & Certbot
  try {
    await execAsync(`certbot delete --cert-name ${domain} --non-interactive`).catch(() => {});
    await fs.unlink(`/etc/nginx/sites-available/${domain}`).catch(() => {});
    await fs.unlink(`/etc/nginx/sites-enabled/${domain}`).catch(() => {});
    await execAsync(`systemctl reload nginx`).catch(() => {});
  } catch (e) {
    console.warn(`[odin:wordpress:delete] Could not remove Nginx config config for ${domain}`);
  }

  // 2. Drop MySQL Database and User
  try {
    const dropSql = `DROP DATABASE IF EXISTS ${site.db_name}; DROP USER IF EXISTS '${site.db_user}'@'%'; FLUSH PRIVILEGES;`;
    await execAsync(`docker exec -i ${env.MYSQL_CONTAINER_NAME} mysql -uroot -p${env.MYSQL_ROOT_PASSWORD} -e "${dropSql}"`);
  } catch (e) {
    console.warn(`[odin:wordpress:delete] Could not drop MySQL resources for ${site.db_name}`);
  }

  // 3. Remove files from disk (optional but recommended)
  if (osUsername && site.install_path) {
    try {
      const targetPath = `/home/${osUsername}/public_html/${site.install_path.split("/").slice(1).join("/")}`;
      if (targetPath !== `/home/${osUsername}/public_html/`) {
         await execAsync(`rm -rf ${targetPath}`);
      }
    } catch (e) {
       console.warn("[odin:wordpress:delete] Could not clean up files from disk", e);
    }
  }

  // 4. Remove from Database
  await db.query("DELETE FROM wordpress_sites WHERE id = $1", [id]);
  
  return { success: true };
};

export const generateSsoUrl = async (id: string, userId: string): Promise<string> => {
  const site = await getWpSiteById(id, userId);
  if (!site) throw new Error("Sitio no encontrado");

  const userResult = await db.query("SELECT username FROM users WHERE id = $1", [userId]);
  const osUsername = sanitize(userResult.rows[0]?.username ?? "");
  const targetPath = `/home/${osUsername}/public_html/${site.install_path.split("/").slice(1).join("/")}`;

  // 1. Ensure mu-plugins directory exists
  const muPluginsDir = `${targetPath}/wp-content/mu-plugins`;
  await execAsync(`mkdir -p ${muPluginsDir} && chown ${osUsername}:www-data ${muPluginsDir} && chmod 755 ${muPluginsDir}`);

  // 2. Ensure the SSO handler plugin exists
  const ssoPluginPath = `${muPluginsDir}/odin-sso.php`;
  // IMPORTANT: Must use 'init' hook so WordPress auth functions are loaded
  const ssoPluginContent = `<?php
/*
Plugin Name: Odin SSO
Description: Secure auto-login for Odisea Cloud
*/
add_action('init', function () {
    if (!isset($_GET['odin_sso'])) return;
    $token = sanitize_text_field($_GET['odin_sso']);
    $stored = get_transient('odin_sso_' . $token);
    if (!$stored) return;
    delete_transient('odin_sso_' . $token);
    $user = get_user_by('login', $stored);
    if (!$user) return;
    wp_set_current_user($user->ID);
    wp_set_auth_cookie($user->ID, true);
    wp_safe_redirect(admin_url());
    exit;
});
`;
  await fs.writeFile(ssoPluginPath, ssoPluginContent, "utf8");
  await execAsync(`chown ${osUsername}:www-data ${ssoPluginPath} && chmod 644 ${ssoPluginPath}`);

  // 3. Generate token and save as transient
  const token = randomBytes(32).toString("hex");
  // We use wp-cli to set the transient. We store the username to login as.
  await execAsync(`wp transient set odin_sso_${token} ${site.admin_user} 300 --path=${targetPath} --allow-root`);

  const protocol = site.runtime?.endpoint?.startsWith("https") ? "https" : "http";
  return `${protocol}://${site.domain}/?odin_sso=${token}`;
};
