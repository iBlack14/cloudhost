import { exec } from "node:child_process";
import { promisify } from "node:util";
import { db } from "../../config/db.js";
import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import { cachedShell } from "../../utils/shell-cache.js";

const execAsync = promisify(exec);
const DEFAULT_NODE_VERSION = "20";

const quoteShellArg = (value: string): string => `'${value.replace(/'/g, `'\\''`)}'`;

const commandExists = async (command: string): Promise<boolean> => {
   try {
      await execAsync(`command -v ${command}`);
      return true;
   } catch {
      return false;
   }
};

const findNodeInterpreter = async (version: string): Promise<string> => {
   const normalizedVersion = version.trim() || DEFAULT_NODE_VERSION;
   const major = normalizedVersion.split(".")[0] || DEFAULT_NODE_VERSION;
   const candidates = [
      `/root/.nvm/versions/node/v${normalizedVersion}/bin/node`,
      `/root/.nvm/versions/node/v${major}/bin/node`,
      `$HOME/.nvm/versions/node/v${normalizedVersion}/bin/node`,
      `$HOME/.nvm/versions/node/v${major}/bin/node`,
      `/usr/local/bin/node`,
      `/usr/bin/node`
   ];

   for (const candidate of candidates) {
      try {
         const expanded = candidate.startsWith("$HOME/")
           ? path.join(process.env.HOME ?? "", candidate.replace("$HOME/", ""))
           : candidate;
         await fs.access(expanded);
         return expanded;
      } catch {
         // Try next candidate
      }
   }

   if (await commandExists("node")) {
      return "node";
   }

   throw new Error(`Node.js runtime v${normalizedVersion} no disponible en el servidor`);
};

const loadAppOrThrow = async (userId: string, appId: string) => {
   const result = await db.query("SELECT * FROM nodejs_apps WHERE id = $1 AND user_id = $2", [appId, userId]);
   if (result.rowCount === 0) throw new Error("Not found");
   return result.rows[0];
};

/** Detect if start_cmd is a shell/npm command vs a relative JS entry file */
const isShellStartCommand = (cmd: string | null | undefined): boolean => {
   if (!cmd || !cmd.trim()) return false;
   const first = cmd.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
   return ["npm", "npx", "pnpm", "yarn", "node", "bun", "tsx", "ts-node"].includes(first)
      || cmd.includes(" ");
};

const resolveStartMode = (app: { script?: string; start_cmd?: string | null }) => {
   const startCmd = (app.start_cmd || "").trim();
   if (startCmd && isShellStartCommand(startCmd)) {
      return { mode: "shell" as const, command: startCmd };
   }
   if (startCmd && !isShellStartCommand(startCmd)) {
      return { mode: "file" as const, entry: startCmd };
   }
   return { mode: "file" as const, entry: app.script || "index.js" };
};

const validateAppFilesystem = async (app: { path: string; script: string; start_cmd?: string | null }) => {
   const appRoot = path.resolve(app.path);
   const appRootStat = await fs.stat(appRoot).catch(() => null);
   if (!appRootStat?.isDirectory()) {
      throw new Error(`Application root no existe: ${appRoot}`);
   }

   const start = resolveStartMode(app);
   if (start.mode === "shell") {
      return { appRoot, entryFile: null as string | null, start };
   }

   const entryFile = path.resolve(appRoot, start.entry);
   const entryStat = await fs.stat(entryFile).catch(() => null);
   if (!entryStat?.isFile()) {
      throw new Error(`Startup file no existe: ${entryFile}`);
   }

   return { appRoot, entryFile, start };
};

const buildPm2Env = (app: { port: number; env_vars?: Record<string, string> | null }) => ({
   ...(app.env_vars ?? {}),
   // Panel port always wins over .env / env_vars duplicates
   PORT: String(app.port),
   HOST: String((app.env_vars as Record<string, string> | undefined)?.HOST || "0.0.0.0"),
   NODE_ENV: String((app.env_vars as Record<string, string> | undefined)?.NODE_ENV || "production"),
});

/** Sync panel env vars into app .env so dotenv-based apps pick them up */
const syncAppEnvFile = async (appRoot: string, env: Record<string, string>) => {
   const envPath = path.join(appRoot, ".env");
   let existing = "";
   try {
      existing = await fs.readFile(envPath, "utf8");
   } catch {
      // no .env yet
   }

   const lines = existing.split("\n");
   const keysToSet = new Set(Object.keys(env));
   const kept = lines.filter((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return true;
      const eq = trimmed.indexOf("=");
      if (eq === -1) return true;
      const key = trimmed.slice(0, eq).trim();
      return !keysToSet.has(key);
   });

   const newBlock = Object.entries(env)
      .map(([k, v]) => `${k}=${v.includes(" ") || v.includes("#") ? `"${v.replace(/"/g, '\\"')}"` : v}`)
      .join("\n");

   const content = [...kept.filter((l, i, arr) => !(i === arr.length - 1 && l === "")), "", "# --- Odisea Panel (auto-sync) ---", newBlock, ""].join("\n");
   await fs.writeFile(envPath, content, "utf8");
};

const writePm2Ecosystem = async (
   appRoot: string,
   pm2Name: string,
   start: ReturnType<typeof resolveStartMode>,
   env: Record<string, string>,
   interpreter?: string
) => {
   const ecosystemPath = path.join(appRoot, ".odin-ecosystem.config.cjs");
   const startScriptPath = path.join(appRoot, ".odin-start.sh");

   // Shell wrapper: most reliable way to pass env to npm/node child processes
   // NOTE: no set -e here — npm/node print to stderr normally and set -e would
   // kill the wrapper on any non-zero intermediate command (like export with
   // special chars), causing PM2 to mark the process as errored silently.
   const exportLines = Object.entries(env)
      .map(([k, v]) => `export ${k}=${quoteShellArg(v)}`)
      .join("\n");

   const runCmd = start.mode === "shell"
      ? start.command
      : `${quoteShellArg(interpreter || "node")} ${quoteShellArg(start.entry!)}`;
   const nodeBin = interpreter ? path.dirname(interpreter) : "";
   const pathPrefix = nodeBin ? `export PATH=${quoteShellArg(nodeBin + ":" + (process.env.PATH || "/usr/local/bin:/usr/bin:/bin"))}\n` : "";

   const shellScript = `#!/bin/bash
cd ${quoteShellArg(appRoot)}
${pathPrefix}${exportLines}
exec ${runCmd}
`;
   await fs.writeFile(startScriptPath, shellScript, { mode: 0o755 });

   const appEntry = {
      name: pm2Name,
      cwd: appRoot,
      script: startScriptPath,
      interpreter: "/bin/bash",
      env,
   };

   const content = `module.exports = { apps: [${JSON.stringify(appEntry, null, 2)}] };\n`;
   await fs.writeFile(ecosystemPath, content, "utf8");
   return ecosystemPath;
};

const isPortListening = async (port: number): Promise<boolean> => {
   if (os.platform() === "win32") return true;

   // Try HTTP probe first (most reliable)
   try {
      const { stdout } = await execAsync(
         `curl -s -o /dev/null -w '%{http_code}' --connect-timeout 2 http://127.0.0.1:${port}/ 2>/dev/null || echo "fail"`
      );
      const code = stdout.trim();
      // Accept any real HTTP response code (1xx–5xx) — even 502/404 means the port is open
      if (/^[1-5]\d{2}$/.test(code)) return true;
   } catch {}

   // Fallback: socket/port check (IPv4 + IPv6)
   try {
      const { stdout } = await execAsync(
         `ss -tlnH 2>/dev/null | awk '{print $4}' | grep -E ':${port}$' || netstat -tln 2>/dev/null | grep -E ':${port}[[:space:]]'`
      );
      return stdout.trim().length > 0;
   } catch {
      return false;
   }
};

const waitForPort = async (port: number, maxWaitMs = 25_000): Promise<boolean> => {
   const interval = 2000;
   const attempts = Math.ceil(maxWaitMs / interval);
   for (let i = 0; i < attempts; i++) {
      if (await isPortListening(port)) return true;
      await new Promise((r) => setTimeout(r, interval));
   }
   return false;
};

const buildNginxConfig = (
   targetDomain: string,
   port: number,
   hasSslCert: boolean,
   hasSslParams: boolean,
   hasDhParams: boolean
) => {
   const proxyBlock = `
    location / {
        proxy_pass http://127.0.0.1:${port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }`.trim();

   if (hasSslCert) {
      return `
server {
    listen 80;
    server_name ${targetDomain} www.${targetDomain};
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name ${targetDomain} www.${targetDomain};
    client_max_body_size 50m;

    ssl_certificate /etc/letsencrypt/live/${targetDomain}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${targetDomain}/privkey.pem;
    ${hasSslParams ? `include /etc/letsencrypt/options-ssl-nginx.conf;` : ""}
    ${hasDhParams ? `ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;` : ""}

    ${proxyBlock}
}
      `.trim();
   }

   return `
server {
    listen 80;
    server_name ${targetDomain} www.${targetDomain};
    client_max_body_size 50m;

    ${proxyBlock}
}
   `.trim();
};

/** Configure nginx reverse proxy → PM2 app port (+ optional SSL) */
const configureNginxProxy = async (userId: string, domain: string, port: number) => {
   if (!domain || os.platform() === "win32") return;

   const targetDomain = domain.trim().toLowerCase();
   let hasSslCert = false;
   let hasSslParams = false;
   let hasDhParams = false;

   try {
      await fs.access(`/etc/letsencrypt/live/${targetDomain}/fullchain.pem`);
      hasSslCert = true;
   } catch {}
   try {
      await fs.access(`/etc/letsencrypt/options-ssl-nginx.conf`);
      hasSslParams = true;
   } catch {}
   try {
      await fs.access(`/etc/letsencrypt/ssl-dhparams.pem`);
      hasDhParams = true;
   } catch {}

   // Step 1: HTTP config so certbot can authenticate if needed
   if (!hasSslCert) {
      const httpConfig = buildNginxConfig(targetDomain, port, false, false, false);
      await fs.mkdir("/etc/nginx/sites-available", { recursive: true }).catch(() => {});
      await fs.mkdir("/etc/nginx/sites-enabled", { recursive: true }).catch(() => {});
      await fs.writeFile(`/etc/nginx/sites-available/${targetDomain}`, httpConfig, "utf8");
      await execAsync(`ln -sf /etc/nginx/sites-available/${targetDomain} /etc/nginx/sites-enabled/`);
      await execAsync("nginx -t").catch(() => {});
      await execAsync("systemctl reload nginx").catch(() => {});

      let userEmail = "soporte@odiseacloud.com";
      try {
         const userRes = await db.query("SELECT email FROM users WHERE id = $1", [userId]);
         if (userRes.rows.length > 0 && userRes.rows[0].email) {
            userEmail = userRes.rows[0].email;
         }
      } catch {}

      const safeDomain = targetDomain.replace(/[^a-z0-9.-]/gi, "");
      const safeEmail = userEmail.replace(/[^a-zA-Z0-9@._+-]/g, "");
      try {
         // certonly = obtain cert only — does NOT rewrite nginx (avoids breaking proxy_pass)
         await execAsync(
            `certbot certonly --nginx -d ${safeDomain} -d www.${safeDomain} --cert-name ${safeDomain} --non-interactive --agree-tos -m ${safeEmail}`,
            { timeout: 120_000 }
         );
         hasSslCert = true;
      } catch {
         try {
            await execAsync(
               `certbot certonly --nginx -d ${safeDomain} --cert-name ${safeDomain} --non-interactive --agree-tos -m ${safeEmail}`,
               { timeout: 120_000 }
            );
            hasSslCert = true;
         } catch {
            // HTTP-only is fine
         }
      }

      if (hasSslCert) {
         try { await fs.access(`/etc/letsencrypt/options-ssl-nginx.conf`); hasSslParams = true; } catch {}
         try { await fs.access(`/etc/letsencrypt/ssl-dhparams.pem`); hasDhParams = true; } catch {}
      }
   }

   // Step 2: ALWAYS write our canonical proxy config last (fixes certbot --nginx overwrites)
   const finalConfig = buildNginxConfig(targetDomain, port, hasSslCert, hasSslParams, hasDhParams);
   await fs.mkdir("/etc/nginx/sites-available", { recursive: true }).catch(() => {});
   await fs.mkdir("/etc/nginx/sites-enabled", { recursive: true }).catch(() => {});
   await fs.writeFile(`/etc/nginx/sites-available/${targetDomain}`, finalConfig, "utf8");
   await execAsync(`ln -sf /etc/nginx/sites-available/${targetDomain} /etc/nginx/sites-enabled/`);
   await execAsync("nginx -t").catch(() => {});
   await execAsync("systemctl reload nginx").catch(() => {});
};

/** Re-apply nginx proxy for a Node.js app bound to this domain (after SSL changes) */
export const resyncProxyForDomain = async (userId: string, domainName: string): Promise<boolean> => {
   await ensureNodejsTables();
   const result = await db.query(
      "SELECT port FROM nodejs_apps WHERE user_id = $1 AND LOWER(domain) = LOWER($2) LIMIT 1",
      [userId, domainName]
   );
   if (result.rowCount === 0) return false;
   await configureNginxProxy(userId, domainName, result.rows[0].port as number);
   return true;
};

/**
 * Lightweight nginx refresh: rewrites the proxy config for an already-registered
 * domain without triggering certbot again. Used when restarting/starting a PM2
 * process so we never accidentally re-run SSL provisioning mid-restart.
 */
const refreshNginxProxy = async (domain: string, port: number) => {
   if (!domain || os.platform() === "win32") return;

   const targetDomain = domain.trim().toLowerCase();

   let hasSslCert = false;
   let hasSslParams = false;
   let hasDhParams = false;
   try { await fs.access(`/etc/letsencrypt/live/${targetDomain}/fullchain.pem`); hasSslCert = true; } catch {}
   try { await fs.access(`/etc/letsencrypt/options-ssl-nginx.conf`); hasSslParams = true; } catch {}
   try { await fs.access(`/etc/letsencrypt/ssl-dhparams.pem`); hasDhParams = true; } catch {}

   const finalConfig = buildNginxConfig(targetDomain, port, hasSslCert, hasSslParams, hasDhParams);
   await fs.mkdir("/etc/nginx/sites-available", { recursive: true }).catch(() => {});
   await fs.mkdir("/etc/nginx/sites-enabled", { recursive: true }).catch(() => {});
   await fs.writeFile(`/etc/nginx/sites-available/${targetDomain}`, finalConfig, "utf8");
   await execAsync(`ln -sf /etc/nginx/sites-available/${targetDomain} /etc/nginx/sites-enabled/`).catch(() => {});
   const testResult = await execAsync("nginx -t 2>&1").catch((e) => ({ stdout: "", stderr: e.message }));
   // Only reload if config test passes
   if (!String((testResult as any).stderr || (testResult as any).stdout).includes("failed")) {
      await execAsync("systemctl reload nginx").catch(() => {});
   }
};

const removeNginxProxy = async (domain: string | null | undefined) => {
   if (!domain || os.platform() === "win32") return;
   const targetDomain = domain.trim().toLowerCase();
   await fs.unlink(`/etc/nginx/sites-available/${targetDomain}`).catch(() => {});
   await fs.unlink(`/etc/nginx/sites-enabled/${targetDomain}`).catch(() => {});
   await execAsync("systemctl reload nginx").catch(() => {});
};

const readPackageJson = async (appRoot: string): Promise<Record<string, any> | null> => {
   try {
      const raw = await fs.readFile(path.join(appRoot, "package.json"), "utf8");
      return JSON.parse(raw);
   } catch {
      return null;
   }
};

/**
 * Detects if a JS entry file only exports the app (Passenger-style) without
 * calling app.listen(). If so, creates a .odin-server.js wrapper that does the
 * listen so PM2 can serve it on the configured port.
 * Returns the file to actually run (either the original or the wrapper).
 */
const ensureListenWrapper = async (appRoot: string, entryFile: string, port: number): Promise<string> => {
   try {
      const src = await fs.readFile(entryFile, "utf8");
      const hasListen = /\.listen\s*\(/.test(src);
      if (hasListen) return entryFile; // already calls listen, use as-is
   } catch {
      return entryFile;
   }

   // Entry file only exports the app — create a minimal wrapper
   const wrapperPath = path.join(appRoot, ".odin-server.js");
   const relEntry = "./" + path.relative(appRoot, entryFile).replace(/\\/g, "/");
   const wrapper = `// Auto-generated by Odisea Panel — do not edit
const app = require(${JSON.stringify(relEntry)});
const PORT = process.env.PORT || ${port};
const HOST = process.env.HOST || '0.0.0.0';
const server = app.listen(PORT, HOST, () => {
  console.log('[odisea] Server listening on ' + HOST + ':' + PORT);
});
server.on('error', (err) => {
  console.error('[odisea] Listen error:', err.message);
  process.exit(1);
});
`;
   await fs.writeFile(wrapperPath, wrapper, "utf8");
   return wrapperPath;
};

let _nodejsTablesReady = false;
export const ensureNodejsTables = async () => {
   if (_nodejsTablesReady) return;
   await db.query(`
      CREATE TABLE IF NOT EXISTS nodejs_apps (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          name TEXT NOT NULL,
          version TEXT DEFAULT '20',
          path TEXT NOT NULL,
          script TEXT DEFAULT 'index.js',
          domain TEXT,
          port INTEGER NOT NULL,
          env_vars JSONB DEFAULT '{}'::jsonb,
          github_repo TEXT,
          github_branch TEXT DEFAULT 'main',
          install_cmd TEXT DEFAULT 'npm install',
          build_cmd TEXT,
          start_cmd TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE nodejs_apps ADD COLUMN IF NOT EXISTS github_repo TEXT;
      ALTER TABLE nodejs_apps ADD COLUMN IF NOT EXISTS github_branch TEXT DEFAULT 'main';
      ALTER TABLE nodejs_apps ADD COLUMN IF NOT EXISTS install_cmd TEXT DEFAULT 'npm install';
      ALTER TABLE nodejs_apps ADD COLUMN IF NOT EXISTS build_cmd TEXT;
      ALTER TABLE nodejs_apps ADD COLUMN IF NOT EXISTS start_cmd TEXT;
   `);
   _nodejsTablesReady = true;
};

export const getAppsQuery = async (userId: string) => {
   await ensureNodejsTables();
   const result = await db.query("SELECT * FROM nodejs_apps WHERE user_id = $1 ORDER BY created_at DESC", [userId]);

   const apps = result.rows;

   try {
     const pm2List = await cachedShell("pm2:jlist", 3000, async () => {
        const { stdout } = await execAsync("pm2 jlist");
        return JSON.parse(stdout) as Array<Record<string, unknown>>;
     });

     return apps.map(app => {
        const pm2proc = pm2List.find((p: any) => p.name === `odin_app_${app.id}`);
        return {
           ...app,
           status: pm2proc ? (pm2proc as any).pm2_env.status : "offline",
           memory: pm2proc ? (pm2proc as any).monit.memory : 0,
           cpu: pm2proc ? (pm2proc as any).monit.cpu : 0,
           uptime: pm2proc ? (pm2proc as any).pm2_env.pm_uptime : null
        };
     });
   } catch {
     return apps.map(app => ({...app, status: "offline", memory: 0, cpu: 0}));
   }
};

interface CreateAppData {
   name: string;
   version: string;
   path: string;
   script: string;
   domain: string;
   port: number;
   githubRepo?: string;
   githubBranch?: string;
   installCmd?: string;
   buildCmd?: string;
   startCmd?: string;
   linkedDomain?: string;
   envVars?: Record<string, string>;
   autoStart?: boolean;
}

const getUserHomePath = async (userId: string): Promise<string> => {
   const result = await db.query("SELECT username FROM users WHERE id = $1", [userId]);
   if (result.rowCount === 0) throw new Error("Usuario no encontrado");
   const username = (result.rows[0].username as string).replace(/[^a-z0-9]/gi, "_").toLowerCase();
   if (process.platform === "win32") {
      return path.join(process.cwd(), ".odin-home", username);
   }
   return path.join("/home", username);
};

const insertApp = async (
   userId: string,
   data: CreateAppData,
   appRoot: string,
   extras: { githubRepo?: string | null; githubBranch?: string | null } = {}
) => {
   const envVarsJson = data.envVars && Object.keys(data.envVars).length > 0 ? data.envVars : {};
   const script = data.script || "index.js";
   const startCmd = data.startCmd?.trim() || null;
   const installCmd = data.installCmd?.trim() || "npm install";
   const buildCmd = data.buildCmd?.trim() || null;

   const res = await db.query(
      `INSERT INTO nodejs_apps
         (user_id, name, version, path, script, domain, port, env_vars, github_repo, github_branch, install_cmd, build_cmd, start_cmd)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12,$13) RETURNING *`,
      [
         userId,
         data.name,
         data.version || DEFAULT_NODE_VERSION,
         appRoot,
         script,
         data.domain,
         data.port,
         JSON.stringify(envVarsJson),
         extras.githubRepo ?? null,
         extras.githubBranch ?? null,
         installCmd,
         buildCmd,
         startCmd
      ]
   );
   return res.rows[0];
};

export const createAppQuery = async (userId: string, data: CreateAppData) => {
   await ensureNodejsTables();

   let appRoot: string;
   if (data.linkedDomain) {
      const userHome = await getUserHomePath(userId);
      appRoot = path.join(userHome, data.linkedDomain);
   } else {
      appRoot = path.resolve(data.path);
   }

   let appRow: any;

   if (data.githubRepo) {
      const repoUrl = `https://github.com/${data.githubRepo}.git`;
      const branch = data.githubBranch || "main";

      await fs.mkdir(path.dirname(appRoot), { recursive: true });

      const existing = await fs.stat(appRoot).catch(() => null);
      if (existing) {
         await fs.rm(appRoot, { recursive: true, force: true });
      }

      await execAsync(
         `git clone --depth=1 --branch ${quoteShellArg(branch)} ${quoteShellArg(repoUrl)} ${quoteShellArg(appRoot)}`,
         { timeout: 120_000 }
      );

      const installCmd = data.installCmd || "npm install";
      const { stdout: installOut, stderr: installErr } = await execAsync(installCmd, {
         cwd: appRoot,
         timeout: 300_000,
         maxBuffer: 10 * 1024 * 1024
      });

      if (data.buildCmd) {
         await execAsync(data.buildCmd, {
            cwd: appRoot,
            timeout: 300_000,
            maxBuffer: 10 * 1024 * 1024
         });
      }

      // Auto-detect entry from package.json if script still default
      const pkg = await readPackageJson(appRoot);
      if ((!data.script || data.script === "index.js") && !data.startCmd && pkg) {
         if (pkg.scripts?.start) {
            data.startCmd = "npm start";
         } else if (typeof pkg.main === "string") {
            data.script = pkg.main;
         }
      }

      appRow = await insertApp(userId, data, appRoot, {
         githubRepo: data.githubRepo,
         githubBranch: branch
      });

      // Attach install output for debugging (not persisted)
      appRow._installOutput = [installOut, installErr].filter(Boolean).join("\n").slice(0, 4000);
   } else {
      const appRootStat = await fs.stat(appRoot).catch(() => null);
      if (!appRootStat?.isDirectory()) {
         throw new Error(`Application root no existe: ${appRoot}`);
      }

      // If using shell startCmd, skip file validation; otherwise require entry file
      if (!data.startCmd || !isShellStartCommand(data.startCmd)) {
         const entryFile = path.resolve(appRoot, data.script || "index.js");
         const entryStat = await fs.stat(entryFile).catch(() => null);
         if (!entryStat?.isFile()) {
            // Try package.json start as fallback
            const pkg = await readPackageJson(appRoot);
            if (pkg?.scripts?.start) {
               data.startCmd = data.startCmd || "npm start";
            } else {
               throw new Error(`Startup file no existe: ${entryFile}`);
            }
         }
      }

      appRow = await insertApp(userId, data, appRoot);
   }

   // Auto-start FIRST so the process is running before nginx is pointed at the port
   if (data.autoStart !== false) {
      try {
         await manageAppQuery(userId, appRow.id, "start");
         appRow.status = "online";
      } catch (startErr: any) {
         appRow.status = "offline";
         appRow._startError = startErr?.message || String(startErr);
      }
   }

   // Configure nginx AFTER PM2 is up so there's no window where nginx proxies to a dead port
   if (data.domain) {
      await configureNginxProxy(userId, data.domain, data.port);
   }

   return appRow;
};

export const deleteAppQuery = async (userId: string, appId: string) => {
   const app = await loadAppOrThrow(userId, appId);
   await manageAppQuery(userId, appId, "delete");
   await removeNginxProxy(app.domain);
   await db.query("DELETE FROM nodejs_apps WHERE id = $1 AND user_id = $2", [appId, userId]);
};

const startPm2Process = async (app: any, userId: string): Promise<{ portWarning?: string }> => {
   const pm2Name = `odin_app_${app.id}`;
   await execAsync(`pm2 delete ${quoteShellArg(pm2Name)}`).catch(() => {});

   const { appRoot, entryFile, start } = await validateAppFilesystem(app);
   const interpreter = await findNodeInterpreter(app.version);
   const env = buildPm2Env(app);

   // Write .env so dotenv-based apps get panel vars
   await syncAppEnvFile(appRoot, env);

   // If the entry file only exports the app (Passenger-style, no app.listen),
   // create a .odin-server.js wrapper that does the listen for PM2.
   let resolvedStart = start;
   if (start.mode === "file" && entryFile) {
      const actualEntry = await ensureListenWrapper(appRoot, entryFile, app.port);
      if (actualEntry !== entryFile) {
         resolvedStart = { mode: "file" as const, entry: actualEntry };
      }
   }

   const ecosystemPath = await writePm2Ecosystem(appRoot, pm2Name, resolvedStart, env, interpreter);
   await execAsync(`pm2 start ${quoteShellArg(ecosystemPath)} --update-env`);
   await execAsync("pm2 save");

   // Re-sync nginx proxy to ensure the port is always correct.
   if (app.domain) {
      await refreshNginxProxy(app.domain, app.port);
   }

   // Wait up to 30s — apps with DB/SMTP init need time
   const listening = await waitForPort(app.port, 30_000);
   if (!listening) {
      return {
         portWarning:
            `Advertencia: no se detectó actividad en el puerto ${app.port} tras 30s. ` +
            `El proceso PM2 está corriendo — revisa Logs. ` +
            `Si tu app usa otro puerto, actualízalo en Env y reinicia.`,
      };
   }
   return {};
};

export const manageAppQuery = async (
   userId: string,
   appId: string,
   action: "start" | "stop" | "restart" | "delete"
): Promise<{ portWarning?: string }> => {
   const app = await loadAppOrThrow(userId, appId);
   const pm2Name = `odin_app_${app.id}`;

   try {
     if (action === "start" || action === "restart") {
        return await startPm2Process(app, userId);
     } else {
        await execAsync(`pm2 ${action} ${quoteShellArg(pm2Name)}`);
        if (action === "delete") await execAsync("pm2 save");
     }
   } catch (e) {
      if (action !== "delete") throw e;
   }
   return {};
};

export const getAppLogs = async (userId: string, appId: string) => {
   await loadAppOrThrow(userId, appId);
   const pm2Name = `odin_app_${appId}`;

   try {
     const { stdout } = await execAsync(`pm2 logs ${quoteShellArg(pm2Name)} --lines 200 --nostream --raw`);
     return stdout.trim().split("\n");
   } catch {
     return ["Logs no disponibles o aplicación fuera de línea."];
   }
};

export const updateAppEnv = async (userId: string, appId: string, envVars: Record<string, string>, restart = false) => {
   const res = await db.query(
      "UPDATE nodejs_apps SET env_vars = $1::jsonb, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *",
      [JSON.stringify(envVars), appId, userId]
   );
   if (res.rowCount === 0) throw new Error("Not found");

   if (restart) {
      try {
         await manageAppQuery(userId, appId, "restart");
      } catch {
         // Env saved even if restart fails (app may be offline)
      }
   }

   return res.rows[0];
};

export const runNpmInstall = async (userId: string, appId: string) => {
   const app = await loadAppOrThrow(userId, appId);
   const appRoot = path.resolve(app.path);
   const packageJsonPath = path.join(appRoot, "package.json");

   const packageJsonStat = await fs.stat(packageJsonPath).catch(() => null);
   if (!packageJsonStat?.isFile()) {
      throw new Error(`No se encontró package.json en ${appRoot}`);
   }

   const customCmd = (app.install_cmd || "").trim();
   let installCommand = customCmd || null;

   if (!installCommand) {
      installCommand = await commandExists("pnpm")
         ? "pnpm install --prod=false"
         : await commandExists("npm")
           ? "npm install"
           : null;
   }

   if (!installCommand) {
      throw new Error("No se encontró pnpm ni npm en el servidor");
   }

   const { stdout, stderr } = await execAsync(installCommand, {
      cwd: appRoot,
      timeout: 300_000,
      maxBuffer: 10 * 1024 * 1024
   });

   const output = [stdout, stderr].filter(Boolean).join("\n").trim();
   return {
      message: `${installCommand} ejecutado correctamente en ${appRoot}`,
      output: output.slice(0, 8000) || `${installCommand} OK`
   };
};

export const getPackageScripts = async (userId: string, appId: string) => {
   const app = await loadAppOrThrow(userId, appId);
   const pkg = await readPackageJson(path.resolve(app.path));
   if (!pkg) throw new Error("No se encontró package.json");

   return {
      name: pkg.name ?? app.name,
      version: pkg.version ?? null,
      main: pkg.main ?? null,
      scripts: pkg.scripts ?? {},
      installCmd: app.install_cmd ?? "npm install",
      buildCmd: app.build_cmd ?? null,
      startCmd: app.start_cmd ?? null,
      script: app.script
   };
};

export const runPackageScript = async (userId: string, appId: string, scriptName: string) => {
   const app = await loadAppOrThrow(userId, appId);
   const appRoot = path.resolve(app.path);
   const pkg = await readPackageJson(appRoot);
   if (!pkg?.scripts?.[scriptName]) {
      throw new Error(`Script "${scriptName}" no existe en package.json`);
   }

   const runner = await commandExists("pnpm")
      ? `pnpm run ${scriptName}`
      : await commandExists("npm")
        ? `npm run ${scriptName}`
        : null;

   if (!runner) throw new Error("No se encontró npm/pnpm");

   const { stdout, stderr } = await execAsync(runner, {
      cwd: appRoot,
      timeout: 300_000,
      maxBuffer: 10 * 1024 * 1024,
      env: {
         ...process.env,
         PORT: String(app.port),
         ...(app.env_vars || {})
      }
   });

   const output = [stdout, stderr].filter(Boolean).join("\n").trim();
   return {
      message: `Script "${scriptName}" ejecutado`,
      output: output.slice(0, 8000) || "Sin salida"
   };
};

export const redeployApp = async (userId: string, appId: string) => {
   const app = await loadAppOrThrow(userId, appId);
   const appRoot = path.resolve(app.path);
   const logs: string[] = [];

   const push = (msg: string) => logs.push(`[${new Date().toISOString()}] ${msg}`);

   if (app.github_repo) {
      const branch = app.github_branch || "main";
      push(`git fetch / pull (${app.github_repo}@${branch})...`);
      const safeBranch = String(branch).replace(/[^a-zA-Z0-9._\/-]/g, "");
      try {
         await execAsync(`git fetch --depth=1 origin ${quoteShellArg(safeBranch)}`, {
            cwd: appRoot,
            timeout: 120_000
         });
         await execAsync(`git reset --hard ${quoteShellArg(`origin/${safeBranch}`)}`, {
            cwd: appRoot,
            timeout: 60_000
         });
         push("Código actualizado desde GitHub.");
      } catch (e: any) {
         push(`Pull falló (${e.message}). Re-clonando...`);
         const tmp = `${appRoot}.__redeploy_tmp`;
         await fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
         await execAsync(
            `git clone --depth=1 --branch ${quoteShellArg(safeBranch)} ${quoteShellArg(`https://github.com/${app.github_repo}.git`)} ${quoteShellArg(tmp)}`,
            { timeout: 120_000 }
         );
         await fs.rm(appRoot, { recursive: true, force: true });
         await fs.rename(tmp, appRoot);
         push("Repositorio re-clonado.");
      }
   } else {
      push("Sin repositorio GitHub — solo reinstall + restart.");
   }

   const installCmd = app.install_cmd || "npm install";
   push(`Instalando: ${installCmd}`);
   const { stdout: iOut, stderr: iErr } = await execAsync(installCmd, {
      cwd: appRoot,
      timeout: 300_000,
      maxBuffer: 10 * 1024 * 1024
   });
   if (iOut) push(iOut.slice(0, 2000));
   if (iErr) push(iErr.slice(0, 1000));

   if (app.build_cmd) {
      push(`Build: ${app.build_cmd}`);
      const { stdout: bOut, stderr: bErr } = await execAsync(app.build_cmd, {
         cwd: appRoot,
         timeout: 300_000,
         maxBuffer: 10 * 1024 * 1024
      });
      if (bOut) push(bOut.slice(0, 2000));
      if (bErr) push(bErr.slice(0, 1000));
   }

   push("Reiniciando proceso PM2...");
   const restartResult = await manageAppQuery(userId, appId, "restart");
   if (restartResult.portWarning) {
      push(`⚠️ ${restartResult.portWarning}`);
   }
   push("Redeploy completado.");

   return { message: "Redeploy OK", logs, portWarning: restartResult.portWarning };
};
