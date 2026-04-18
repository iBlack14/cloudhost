import { exec } from "node:child_process";
import { promisify } from "node:util";
import { db } from "../../config/db.js";
import fs from "node:fs/promises";
import path from "node:path";

const execAsync = promisify(exec);

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
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
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

export const createAppQuery = async (userId: string, data: { name: string, version: string, path: string, script: string, domain: string, port: number }) => {
   await ensureNodejsTables();
   const res = await db.query(
      `INSERT INTO nodejs_apps (user_id, name, version, path, script, domain, port) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [userId, data.name, data.version, data.path, data.script, data.domain, data.port]
   );
   return res.rows[0];
};

export const deleteAppQuery = async (userId: string, appId: string) => {
   // Stop and delete from PM2 first
   await manageAppQuery(userId, appId, "delete");
   await db.query("DELETE FROM nodejs_apps WHERE id = $1 AND user_id = $2", [appId, userId]);
};

export const manageAppQuery = async (userId: string, appId: string, action: "start" | "stop" | "restart" | "delete") => {
   const res = await db.query("SELECT * FROM nodejs_apps WHERE id = $1 AND user_id = $2", [appId, userId]);
   if (res.rowCount === 0) throw new Error("Not found");
   const app = res.rows[0];
   const pm2Name = `odin_app_${app.id}`;

   try {
     if (action === "start") {
        // NVM or literal node paths can be complex, simulate running via generic node/pm2
        // Pass environment variables to PM2 run
        const envStr = Object.entries(app.env_vars).map(([k,v]) => `${k}='${v}'`).join(" ");
        await execAsync(`PORT=${app.port} ${envStr} pm2 start ${app.path}/${app.script} --name ${pm2Name}`);
        await execAsync(`pm2 save`);
     } else {
        await execAsync(`pm2 ${action} ${pm2Name}`);
        if(action === "delete") await execAsync(`pm2 save`);
     }
   } catch (e) {
      if (action !== "delete") throw e; // Safe fail if it didn't exist in pm2
   }
};

export const getAppLogs = async (userId: string, appId: string) => {
   const res = await db.query("SELECT * FROM nodejs_apps WHERE id = $1 AND user_id = $2", [appId, userId]);
   if (res.rowCount === 0) throw new Error("Not found");
   const pm2Name = `odin_app_${appId}`;

   try {
     // Retrieve last 150 lines from PM2 internal command
     const { stdout } = await execAsync(`pm2 logs ${pm2Name} --lines 150 --nostream --raw`);
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
   const res = await db.query("SELECT path FROM nodejs_apps WHERE id = $1 AND user_id = $2", [appId, userId]);
   if (res.rowCount === 0) throw new Error("Not found");
   // Simulated install
   return "npm install successfully executed. (Mocked response in container)";
};
