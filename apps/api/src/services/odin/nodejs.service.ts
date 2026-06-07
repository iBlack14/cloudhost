import { exec } from "node:child_process";
import { promisify } from "node:util";
import { db } from "../../config/db.js";
import path from "node:path";
import fs from "node:fs/promises";

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

const validateAppFilesystem = async (app: { path: string; script: string }) => {
   const appRoot = path.resolve(app.path);
   const entryFile = path.resolve(appRoot, app.script);

   const appRootStat = await fs.stat(appRoot).catch(() => null);
   if (!appRootStat?.isDirectory()) {
      throw new Error(`Application root no existe: ${appRoot}`);
   }

   const entryStat = await fs.stat(entryFile).catch(() => null);
   if (!entryStat?.isFile()) {
      throw new Error(`Startup file no existe: ${entryFile}`);
   }

   return { appRoot, entryFile };
};

export const ensureNodejsTables = async () => {
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
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Idempotent migrations for existing tables
      ALTER TABLE nodejs_apps ADD COLUMN IF NOT EXISTS github_repo TEXT;
      ALTER TABLE nodejs_apps ADD COLUMN IF NOT EXISTS github_branch TEXT DEFAULT 'main';
   `);
};

export const getAppsQuery = async (userId: string) => {
   await ensureNodejsTables();
   const result = await db.query("SELECT * FROM nodejs_apps WHERE user_id = $1 ORDER BY created_at DESC", [userId]);
   
   const apps = result.rows;

   // Mix with PM2 status
   try {
     const { stdout } = await execAsync("pm2 jlist");
     const pm2List = JSON.parse(stdout);
     
     return apps.map(app => {
        const pm2proc = pm2List.find((p: any) => p.name === `odin_app_${app.id}`);
        return {
           ...app,
           status: pm2proc ? pm2proc.pm2_env.status : "offline",
           memory: pm2proc ? pm2proc.monit.memory : 0,
           cpu: pm2proc ? pm2proc.monit.cpu : 0,
           uptime: pm2proc ? pm2proc.pm2_env.pm_uptime : null
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
   // GitHub source (optional)
   githubRepo?: string;
   githubBranch?: string;
   installCmd?: string;
   buildCmd?: string;
   startCmd?: string;
   // Domain-linked path: if set, resolve appRoot from user home + domainName
   linkedDomain?: string;
   // Env vars at creation time
   envVars?: Record<string, string>;
}

/** Resolve the user's home directory from their userId (same logic as file.controller) */
const getUserHomePath = async (userId: string): Promise<string> => {
   const result = await db.query("SELECT username FROM users WHERE id = $1", [userId]);
   if (result.rowCount === 0) throw new Error("Usuario no encontrado");
   const username = (result.rows[0].username as string).replace(/[^a-z0-9]/gi, "_").toLowerCase();
   if (process.platform === "win32") {
      return path.join(process.cwd(), ".odin-home", username);
   }
   return path.join("/home", username);
};

export const createAppQuery = async (userId: string, data: CreateAppData) => {
   await ensureNodejsTables();

   // ── Resolve the installation path ──────────────────────────────────────────
   // If the user picked a domain from their list, resolve path from user home.
   // Otherwise fall back to the explicit path field.
   let appRoot: string;
   if (data.linkedDomain) {
      const userHome = await getUserHomePath(userId);
      appRoot = path.join(userHome, data.linkedDomain);
   } else {
      appRoot = path.resolve(data.path);
   }

   const envVarsJson = data.envVars && Object.keys(data.envVars).length > 0
      ? data.envVars
      : {};

   // ── GitHub source: clone the repository ────────────────────────────────────
   if (data.githubRepo) {
      const repoUrl = `https://github.com/${data.githubRepo}.git`;
      const branch  = data.githubBranch || "main";

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
      await execAsync(installCmd, { cwd: appRoot, timeout: 180_000 });

      if (data.buildCmd) {
         await execAsync(data.buildCmd, { cwd: appRoot, timeout: 180_000 });
      }

      const resolvedScript = data.startCmd ? data.startCmd.split(" ")[0] : data.script || "index.js";

      const res = await db.query(
         `INSERT INTO nodejs_apps (user_id, name, version, path, script, domain, port, env_vars, github_repo, github_branch)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10) RETURNING *`,
         [userId, data.name, data.version || DEFAULT_NODE_VERSION, appRoot, resolvedScript,
          data.domain, data.port, JSON.stringify(envVarsJson), data.githubRepo, branch]
      );
      return res.rows[0];
   }

   // ── Manual source: directory must already exist ─────────────────────────────
   const appRootStat = await fs.stat(appRoot).catch(() => null);
   if (!appRootStat?.isDirectory()) {
      throw new Error(`Application root no existe: ${appRoot}`);
   }

   const entryFile = path.resolve(appRoot, data.script);
   const entryStat = await fs.stat(entryFile).catch(() => null);
   if (!entryStat?.isFile()) {
      throw new Error(`Startup file no existe: ${entryFile}`);
   }

   const res = await db.query(
      `INSERT INTO nodejs_apps (user_id, name, version, path, script, domain, port, env_vars)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb) RETURNING *`,
      [userId, data.name, data.version || DEFAULT_NODE_VERSION, appRoot, data.script, data.domain, data.port, JSON.stringify(envVarsJson)]
   );
   return res.rows[0];
};

export const deleteAppQuery = async (userId: string, appId: string) => {
   // Stop and delete from PM2 first
   await manageAppQuery(userId, appId, "delete");
   await db.query("DELETE FROM nodejs_apps WHERE id = $1 AND user_id = $2", [appId, userId]);
};

export const manageAppQuery = async (userId: string, appId: string, action: "start" | "stop" | "restart" | "delete") => {
   const app = await loadAppOrThrow(userId, appId);
   const pm2Name = `odin_app_${app.id}`;

   try {
     if (action === "start") {
        const { appRoot, entryFile } = await validateAppFilesystem(app);
        const interpreter = await findNodeInterpreter(app.version);
        const envStr = Object.entries(app.env_vars ?? {})
          .map(([key, value]) => `${key}=${quoteShellArg(String(value))}`)
          .join(" ");
        const prefix = [`PORT=${app.port}`, envStr].filter(Boolean).join(" ");
        const command = [
          prefix,
          "pm2 start",
          quoteShellArg(entryFile),
          "--name",
          quoteShellArg(pm2Name),
          "--cwd",
          quoteShellArg(appRoot),
          "--interpreter",
          quoteShellArg(interpreter),
          "--update-env"
        ].filter(Boolean).join(" ");

        await execAsync(command);
        await execAsync("pm2 save");
     } else {
        await execAsync(`pm2 ${action} ${quoteShellArg(pm2Name)}`);
        if(action === "delete") await execAsync("pm2 save");
     }
   } catch (e) {
      if (action !== "delete") throw e; // Safe fail if it didn't exist in pm2
   }
};

export const getAppLogs = async (userId: string, appId: string) => {
   await loadAppOrThrow(userId, appId);
   const pm2Name = `odin_app_${appId}`;

   try {
     // Retrieve last 150 lines from PM2 internal command
     const { stdout } = await execAsync(`pm2 logs ${quoteShellArg(pm2Name)} --lines 150 --nostream --raw`);
     return stdout.trim().split("\n");
   } catch {
     return ["Logs no disponibles o aplicación fuera de línea."];
   }
};

export const updateAppEnv = async (userId: string, appId: string, envVars: any) => {
   const res = await db.query("UPDATE nodejs_apps SET env_vars = $1 WHERE id = $2 AND user_id = $3 RETURNING *", [envVars, appId, userId]);
   if (res.rowCount === 0) throw new Error("Not found");
   // After updating env, we might want to automatically restart if active, let's keep it manual
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

   const installCommand = await commandExists("pnpm")
      ? "pnpm install --prod=false"
      : await commandExists("npm")
        ? "npm install"
        : null;

   if (!installCommand) {
      throw new Error("No se encontró pnpm ni npm en el servidor");
   }

   await execAsync(installCommand, { cwd: appRoot });
   return `${installCommand} ejecutado correctamente en ${appRoot}`;
};
