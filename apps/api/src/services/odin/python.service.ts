import { exec } from "node:child_process";
import { promisify } from "node:util";
import { db } from "../../config/db.js";

const execAsync = promisify(exec);

export interface PythonAppInput {
  name: string;
  version: string;
  path: string;
  entrypoint: string;
  domain: string;
  port: number;
}

export const ensurePythonTables = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS python_apps (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      name TEXT NOT NULL,
      version TEXT DEFAULT '3.11',
      path TEXT NOT NULL,
      entrypoint TEXT DEFAULT 'app.py',
      domain TEXT,
      port INTEGER NOT NULL,
      env_vars JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
};

export const getAppsQuery = async (userId: string) => {
  await ensurePythonTables();
  const result = await db.query("SELECT * FROM python_apps WHERE user_id = $1 ORDER BY created_at DESC", [userId]);
  const apps = result.rows;

  try {
    const { stdout } = await execAsync("pm2 jlist");
    const pm2List = JSON.parse(stdout);

    return apps.map((app) => {
      const pm2proc = pm2List.find((proc: any) => proc.name === `odin_python_${app.id}`);

      return {
        ...app,
        status: pm2proc ? pm2proc.pm2_env.status : "offline",
        memory: pm2proc ? pm2proc.monit.memory : 0,
        cpu: pm2proc ? pm2proc.monit.cpu : 0,
        uptime: pm2proc ? pm2proc.pm2_env.pm_uptime : null
      };
    });
  } catch {
    return apps.map((app) => ({ ...app, status: "offline", memory: 0, cpu: 0 }));
  }
};

export const createAppQuery = async (userId: string, data: PythonAppInput) => {
  await ensurePythonTables();
  const result = await db.query(
    `INSERT INTO python_apps (user_id, name, version, path, entrypoint, domain, port)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [userId, data.name, data.version, data.path, data.entrypoint, data.domain, data.port]
  );

  return result.rows[0];
};

export const deleteAppQuery = async (userId: string, appId: string) => {
  await manageAppQuery(userId, appId, "delete");
  await db.query("DELETE FROM python_apps WHERE id = $1 AND user_id = $2", [appId, userId]);
};

export const manageAppQuery = async (userId: string, appId: string, action: "start" | "stop" | "restart" | "delete") => {
  const result = await db.query("SELECT * FROM python_apps WHERE id = $1 AND user_id = $2", [appId, userId]);
  if (result.rowCount === 0) throw new Error("Not found");

  const app = result.rows[0];
  const pm2Name = `odin_python_${app.id}`;

  try {
    if (action === "start") {
      const envStr = Object.entries(app.env_vars ?? {})
        .map(([key, value]) => `${key}='${value}'`)
        .join(" ");

      await execAsync(
        `PORT=${app.port} PYTHONUNBUFFERED=1 ${envStr} pm2 start ${app.path}/${app.entrypoint} --name ${pm2Name} --interpreter python${app.version}`
      );
      await execAsync("pm2 save");
      return;
    }

    await execAsync(`pm2 ${action} ${pm2Name}`);
    if (action === "delete") {
      await execAsync("pm2 save");
    }
  } catch (error) {
    if (action !== "delete") {
      throw error;
    }
  }
};

export const updateAppEnv = async (userId: string, appId: string, envVars: Record<string, string>) => {
  const result = await db.query(
    "UPDATE python_apps SET env_vars = $1 WHERE id = $2 AND user_id = $3 RETURNING *",
    [envVars, appId, userId]
  );

  if (result.rowCount === 0) throw new Error("Not found");
  return result.rows[0];
};

export const getAppLogs = async (userId: string, appId: string) => {
  const result = await db.query("SELECT id FROM python_apps WHERE id = $1 AND user_id = $2", [appId, userId]);
  if (result.rowCount === 0) throw new Error("Not found");

  try {
    const { stdout } = await execAsync(`pm2 logs odin_python_${appId} --lines 150 --nostream --raw`);
    return stdout.trim().split("\n");
  } catch {
    return ["Logs no disponibles o aplicación fuera de línea."];
  }
};

