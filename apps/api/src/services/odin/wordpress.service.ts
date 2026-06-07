import { db } from "../../config/db.js";
import { env } from "../../config/env.js";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import { probeDomainRuntime } from "./runtime-probe.service.js";
import { encryptSecret } from "../../utils/secret.js";

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
  // Optional overrides from the frontend wizard
  dbName?: string;
  dbUser?: string;
  tablePrefix?: string;
}

const sanitize = (str: string) => str.replace(/[^a-z0-9]/gi, "_").toLowerCase();

let _wpTableReady = false;
export const ensureWordPressTable = async () => {
  if (_wpTableReady) return;
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
    ALTER TABLE wordpress_sites ADD COLUMN IF NOT EXISTS db_password_ciphertext TEXT;
  `);
  _wpTableReady = true;
};

const createMysqlResources = async (dbName: string, dbUser: string, dbPassword: string) => {
  const sql = [
    `CREATE DATABASE IF NOT EXISTS ${dbName};`,
    `CREATE USER IF NOT EXISTS '${dbUser}'@'%' IDENTIFIED BY '${dbPassword}';`,
    `ALTER USER '${dbUser}'@'%' IDENTIFIED BY '${dbPassword}';`,
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
  const suffix = Date.now().toString().slice(-4);
  const tablePrefix = (input.tablePrefix && input.tablePrefix.trim()) ? input.tablePrefix.trim() : "wp_";
  const dbPassword = randomBytes(16).toString("hex");

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    // Get the user's username for the linux OS path AND DB prefix (cPanel convention)
    const userResult = await client.query("SELECT username FROM users WHERE id = $1", [userId]);
    if (userResult.rowCount === 0) throw new Error("Usuario no encontrado");
    const osUsername = sanitize(userResult.rows[0].username);

    // cPanel convention: username_suffix  (e.g. blxkstudio_a3f2)
    // Use frontend-provided values if available, otherwise auto-generate
    const dbName = input.dbName ?? `${osUsername}_${suffix}`;
    const dbUser = input.dbUser ?? `${osUsername}_${suffix}`;

    const created = await client.query(
      `INSERT INTO wordpress_sites (
        user_id, account_id, site_title, domain, install_path,
        wp_version, php_version, db_name, db_user, db_password_ciphertext, admin_user, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'provisioning')
      RETURNING id`,
      [
        userId,
        input.accountId ?? null,
        siteTitle,
        normalizedDomain,
        directory ? `${normalizedDomain}/${directory}` : normalizedDomain, // placeholder — updated below
        input.wpVersion ?? "6.4.3",
        "8.3",
        dbName,
        dbUser,
        encryptSecret(dbPassword),
        adminUser
      ]
    );
    const siteId = created.rows[0].id as string;

    // ── Resolve the primary domain of this account ───────────────────────────
    // The primary domain is stored as `domain` in the accounts (WHM) table.
    // If the user picks an addon domain, we install into ~/domain.com/
    // If the user picks the primary domain, we install into ~/public_html/
    const accountResult = await client.query(
      "SELECT domain FROM accounts WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1",
      [userId]
    );
    const primaryDomain = accountResult.rows[0]?.domain as string | undefined;
    const isPrimaryDomain = primaryDomain && normalizedDomain === primaryDomain.trim().toLowerCase();

    // Base path inside home:
    //   primary domain → public_html/[optional subdirectory]
    //   addon domain   → dominio.com/[optional subdirectory]
    const homeBase   = isPrimaryDomain ? "public_html" : normalizedDomain;
    const siteDir    = directory ? `/${directory}` : "";
    const targetPath = `/home/${osUsername}/${homeBase}${siteDir}`;
    const siteUrl    = `${input.protocol ?? "http://"}${normalizedDomain}${siteDir}`;

    // Update install_path in the DB now that we have the resolved path
    await client.query(
      "UPDATE wordpress_sites SET install_path = $1 WHERE id = $2",
      [targetPath, siteId]
    );

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
      await execAsync(`rm -f ${targetPath}/wp-config.php`); // Delete if exists
      await execAsync(`wp core config --path=${targetPath} --dbname=${dbName} --dbuser=${dbUser} --dbpass=${dbPassword} --dbhost=127.0.0.1:${env.MYSQL_HOST_PORT} --dbprefix=${tablePrefix} --allow-root`);

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
php_admin_value[upload_max_filesize] = 100M
php_admin_value[post_max_size] = 100M
php_admin_value[memory_limit] = 256M
php_admin_value[max_execution_time] = 300
php_admin_value[max_input_time] = 300
      `.trim();
      await fs.writeFile(`/etc/php/${phpVer}/fpm/pool.d/${osUsername}.conf`, fpmConfig, "utf8");
      await execAsync(`systemctl reload php${phpVer}-fpm`);


      // 6. Configure Nginx and SSL
      console.log(`[odin:wordpress] Configuring Nginx/SSL for ${normalizedDomain}...`);
      
      const nginxConfig = `
server {
    listen 80;
    server_name ${normalizedDomain} www.${normalizedDomain};
    root ${targetPath};
    index index.php index.html index.htm;
    client_max_body_size 100M;
    
    access_log /home/${osUsername}/logs/access.log;
    error_log /home/${osUsername}/logs/error.log;

    location / {
        try_files $uri $uri/ /index.php?$args;
    }

    location = /mail {
        return 301 /mail/;
    }

    location /mail/ {
        proxy_pass http://127.0.0.1:${env.WEBMAIL_INTERNAL_PORT}/mail/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
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
        [JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), siteId]
      );
      throw error;
    }

    await client.query(
      `UPDATE wordpress_sites
       SET admin_url = $1,
           status = 'pending_verification'
       WHERE id = $2`,
      [`https://${normalizedDomain}/wp-admin`, siteId]
    );

    await client.query(
      `INSERT INTO activity_logs (user_id, action, resource, details)
       VALUES ($1, 'install_wordpress', 'wordpress_site', $2::jsonb)`,
      [
        userId,
        JSON.stringify({ siteId, domain: normalizedDomain, dbName, osUsername, installPath: targetPath })
      ]
    );

    await client.query("COMMIT");

    return {
      success: true,
      data: {
        id: siteId,
        domain: normalizedDomain,
        dbName,
        osUsername,
        installPath: targetPath,
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
  const result = await db.query(
    `SELECT id, user_id, account_id, site_title, domain, install_path,
            wp_version, php_version, db_name, db_user, admin_user,
            auto_updates, status, admin_url, runtime, created_at, updated_at
     FROM wordpress_sites WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );

  // Return stale-but-fast data immediately using the cached `runtime` JSONB.
  // Probe enrichment runs async in the background so it doesn't block the response.
  // Next list request will get the freshly probed data.
  setImmediate(() => {
    result.rows.forEach(site => enrichWpSite(site).catch(() => {}));
  });

  return result.rows;
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

// ---------------------------------------------------------------------------
// WordPress Versions — fetched live from WordPress.org API, cached 1h
// ---------------------------------------------------------------------------
let _wpVersionsCache: { versions: WpVersionInfo[]; fetchedAt: number } | null = null;
const WP_VERSIONS_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export interface WpVersionInfo {
  version: string;
  label: string;
  isCurrent: boolean;     // true = latest stable
  isLegacy?: boolean;     // true = older releases
  releaseDate?: string;
}

export const fetchWpVersions = async (): Promise<WpVersionInfo[]> => {
  const now = Date.now();
  if (_wpVersionsCache && now - _wpVersionsCache.fetchedAt < WP_VERSIONS_CACHE_TTL_MS) {
    return _wpVersionsCache.versions;
  }

  try {
    const res = await fetch("https://api.wordpress.org/core/version-check/1.7/", {
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as { offers: Array<{ version: string; response: string; release_date?: string }> };

    const seen = new Set<string>();
    const versions: WpVersionInfo[] = [];

    for (const offer of data.offers ?? []) {
      if (!offer.version || seen.has(offer.version)) continue;
      seen.add(offer.version);
      const isCurrent = offer.response === "upgrade" || versions.length === 0;
      versions.push({
        version: offer.version,
        label: `WP ${offer.version}${isCurrent && versions.length === 0 ? " ✔ Stable" : ""}`,
        isCurrent: versions.length === 0, // first entry = latest
        isLegacy: versions.length > 3,
        releaseDate: offer.release_date
      });
    }

    _wpVersionsCache = { versions, fetchedAt: now };
    return versions;
  } catch (err) {
    console.error("[odin:wordpress:versions:error]", err);
    // Fallback minimal list
    return [
      { version: "latest", label: "WP Latest ✔ Stable", isCurrent: true },
      { version: "6.8",    label: "WP 6.8", isCurrent: false },
      { version: "6.7",    label: "WP 6.7", isCurrent: false },
      { version: "6.4.3",  label: "WP 6.4.3", isCurrent: false, isLegacy: true }
    ];
  }
};

// ---------------------------------------------------------------------------
// Update WordPress — backup first, then wp core update, then record new version
// ---------------------------------------------------------------------------
export const updateWordPress = async (siteId: string, userId: string): Promise<{ success: boolean; newVersion: string; backupPath: string }> => {
  const siteRes = await db.query(
    `SELECT ws.*, u.username FROM wordpress_sites ws
     INNER JOIN users u ON u.id = ws.user_id
     WHERE ws.id = $1 AND ws.user_id = $2`,
    [siteId, userId]
  );
  if (!siteRes.rowCount || siteRes.rowCount === 0) throw new Error("Sitio no encontrado");
  const site = siteRes.rows[0];
  const targetPath = site.install_path;
  const osUsername = sanitize(site.username);

  // 1. Create timestamped backup of the WP directory
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = `/home/${osUsername}/backups/wp`;
  const backupFile = `${backupDir}/${site.domain}_pre-update_${ts}.tar.gz`;

  await execAsync(`mkdir -p ${backupDir}`);
  await execAsync(`tar -czf ${backupFile} -C ${targetPath} . 2>/dev/null || true`);
  console.log(`[odin:wordpress:update] Backup creado: ${backupFile}`);

  // 2. Run wp core update
  await execAsync(`wp core update --path=${targetPath} --allow-root`);
  console.log(`[odin:wordpress:update] Core actualizado para ${site.domain}`);

  // 3. Get new version
  const { stdout } = await execAsync(`wp core version --path=${targetPath} --allow-root`);
  const newVersion = stdout.trim();

  // 4. Update DB record
  await db.query(
    `UPDATE wordpress_sites SET wp_version = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
    [newVersion, siteId]
  );

  return { success: true, newVersion, backupPath: backupFile };
};
