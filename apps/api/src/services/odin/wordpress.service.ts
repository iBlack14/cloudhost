import { db } from "../../config/db.js";
import { env } from "../../config/env.js";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { randomBytes } from "node:crypto";
import net from "node:net";
import fs from "node:fs/promises";
import { probeDomainRuntime } from "./runtime-probe.service.js";

const execAsync = promisify(exec);

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
      container_name TEXT,
      service_port INTEGER,
      admin_url TEXT,
      runtime JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE wordpress_sites ADD COLUMN IF NOT EXISTS container_name TEXT;
    ALTER TABLE wordpress_sites ADD COLUMN IF NOT EXISTS service_port INTEGER;
    ALTER TABLE wordpress_sites ADD COLUMN IF NOT EXISTS admin_url TEXT;
    ALTER TABLE wordpress_sites ADD COLUMN IF NOT EXISTS runtime JSONB;
    ALTER TABLE wordpress_sites ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'provisioning';
    ALTER TABLE wordpress_sites ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
  `);
};

const pickFreePort = async (): Promise<number> =>
  new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("No se pudo obtener puerto libre")));
        return;
      }
      const { port } = address;
      server.close(() => resolve(port));
    });
  });

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

const runWordPressContainer = async (opts: {
  containerName: string;
  servicePort: number;
  dbName: string;
  dbUser: string;
  dbPassword: string;
}) => {
  const cmd = [
    "docker run -d",
    `--name ${opts.containerName}`,
    "--restart unless-stopped",
    "--add-host=host.docker.internal:host-gateway",
    `-p ${opts.servicePort}:80`,
    `-e WORDPRESS_DB_HOST=host.docker.internal:${env.MYSQL_HOST_PORT}`,
    `-e WORDPRESS_DB_NAME=${opts.dbName}`,
    `-e WORDPRESS_DB_USER=${opts.dbUser}`,
    `-e WORDPRESS_DB_PASSWORD=${opts.dbPassword}`,
    "wordpress:latest"
  ].join(" ");

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
  T extends { id: string; domain: string; service_port?: number | null; container_name?: string | null; admin_url?: string | null }
>(
  site: T
) => {
  const domainProbe = await probeDomainRuntime(site.domain);
  const httpsProbe = await probeWpLogin(`https://${site.domain}/wp-login.php`);
  const httpProbe = await probeWpLogin(`http://${site.domain}/wp-login.php`);
  const localProbe =
    site.service_port != null ? await probeWpLogin(`http://127.0.0.1:${site.service_port}/wp-login.php`) : { ok: false as const };

  const reachable = httpsProbe.ok || httpProbe.ok || localProbe.ok;
  const endpoint = httpsProbe.ok
    ? `https://${site.domain}`
    : httpProbe.ok
      ? `http://${site.domain}`
      : localProbe.ok && site.service_port != null
        ? `http://127.0.0.1:${site.service_port}`
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
      http: httpProbe,
      local: localProbe
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
    const containerName = `wp_${sanitize(normalizedDomain)}_${wpId.slice(0, 8)}`;
    const servicePort = await pickFreePort();

    try {
      await createMysqlResources(dbName, dbUser, dbPassword);
      await runWordPressContainer({ containerName, servicePort, dbName, dbUser, dbPassword });
      
      // NEW: Automated WP-CLI installation using wp-cli Docker image
      const siteUrl = `${input.protocol ?? "http://"}${normalizedDomain}${directory ? `/${directory}` : ""}`;
      
      // Delay to let the container start and DB connect
      await new Promise(r => setTimeout(r, 8000));
      
      try {
        // Use the official wp-cli docker image to run the installer
        const wpInstallCmd = [
          "docker run --rm",
          "--add-host=host.docker.internal:host-gateway",
          `--volumes-from ${containerName}`,
          "--user www-data",
          "wordpress:cli",
          `wp core install`,
          `--path=/var/www/html`,
          `--url='${siteUrl}'`,
          `--title='${siteTitle}'`,
          `--admin_user='${adminUser}'`,
          `--admin_password='${input.adminPass}'`,
          `--admin_email='${input.adminEmail}'`,
          `--skip-email`
        ].join(" ");

        await execAsync(wpInstallCmd);
        console.log(`[odin:wordpress] WP-CLI install completed for ${normalizedDomain}`);

        if (input.siteDescription) {
          const wpDescCmd = [
            "docker run --rm",
            "--add-host=host.docker.internal:host-gateway",
            `--volumes-from ${containerName}`,
            "--user www-data",
            "wordpress:cli",
            `wp option update blogdescription '${input.siteDescription}'`,
            "--path=/var/www/html"
          ].join(" ");
          await execAsync(wpDescCmd).catch(() => {});
        }
      } catch (wpError) {
        console.warn("[odin:wordpress:service] WP-CLI auto-install failed, user will need to complete setup via wp-admin/install.php:", wpError);
      }

      
      // NEW: Automated SSL / Nginx Proxy setup
      try {
        console.log(`[odin:wordpress] Configuring Nginx/SSL for ${normalizedDomain} -> 127.0.0.1:${servicePort}`);
        // We defer to the dedicated bash script that handles Nginx proxy creation AND Certbot SSL setup
        const scriptPath = process.env.NODE_ENV === "production" 
          ? "/root/odisea/infra/scripts/provision-ssl.sh" 
          : "bash ../../infra/scripts/provision-ssl.sh";
        
        await execAsync(`bash ${scriptPath} ${normalizedDomain} ${servicePort}`).catch(err => {
          console.warn("[odin:wordpress:ssl] Certbot SSL warning (DNS might not point here yet). Falling back to HTTP proxy...", err);
          // Fallback if certbot fails: Manual HTTP proxy
          const nginxConfig = `server { listen 80; server_name ${normalizedDomain}; location / { proxy_pass http://127.0.0.1:${servicePort}; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; } }`;
          return fs.writeFile(`/etc/nginx/sites-available/${normalizedDomain}`, nginxConfig, 'utf8')
            .then(() => execAsync(`ln -sf /etc/nginx/sites-available/${normalizedDomain} /etc/nginx/sites-enabled/`))
            .then(() => execAsync(`systemctl reload nginx`));
        });
        
        console.log(`[odin:wordpress] Reverse proxy online for ${normalizedDomain}`);
      } catch (nginxError) {
        console.error("[odin:wordpress:service] Failed to configure Nginx proxy:", nginxError);
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
       SET container_name = $1,
           service_port = $2,
           admin_url = $3,
           status = 'pending_verification'
       WHERE id = $4`,
      [containerName, servicePort, `https://${normalizedDomain}/wp-admin`, wpId]
    );

    await client.query(
      `INSERT INTO activity_logs (user_id, action, resource, details)
       VALUES ($1, 'install_wordpress', 'wordpress_site', $2::jsonb)`,
      [
        userId,
        JSON.stringify({ wpId, domain: normalizedDomain, dbName, containerName, servicePort })
      ]
    );

    await client.query("COMMIT");

    return {
      success: true,
      data: {
        id: wpId,
        domain: normalizedDomain,
        dbName,
        containerName,
        servicePort,
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

  // 1. Remove Docker Container
  if (site.container_name) {
    try {
      await execAsync(`docker rm -f ${site.container_name}`);
    } catch (e) {
      console.warn(`[odin:wordpress:delete] Could not remove container ${site.container_name}`);
    }
  }

  // 2. Remove Nginx Proxy
  try {
    const domain = site.domain;
    await fs.unlink(`/etc/nginx/sites-available/${domain}`).catch(() => {});
    await fs.unlink(`/etc/nginx/sites-enabled/${domain}`).catch(() => {});
    await execAsync(`systemctl reload nginx`).catch(() => {});
  } catch (e) {
    console.warn(`[odin:wordpress:delete] Could not remove Nginx config config for ${site.domain}`);
  }

  // 3. Drop MySQL Database and User
  try {
    const dropSql = `DROP DATABASE IF EXISTS ${site.db_name}; DROP USER IF EXISTS '${site.db_user}'@'%'; FLUSH PRIVILEGES;`;
    await execAsync(`docker exec -i ${env.MYSQL_CONTAINER_NAME} mysql -uroot -p${env.MYSQL_ROOT_PASSWORD} -e "${dropSql}"`);
  } catch (e) {
    console.warn(`[odin:wordpress:delete] Could not drop MySQL resources for ${site.db_name}`);
  }

  // 4. Remove from Database
  await db.query("DELETE FROM wordpress_sites WHERE id = $1", [id]);
  
  return { success: true };
};
