import { Router } from "express";
import os from "node:os";
import multer from "multer";

import {
  createWhmAccountHandler,
  impersonateWhmAccountHandler,
  listWhmAccountsHandler,
  listWhmPlansHandler,
  resumeWhmAccountHandler,
  suspendWhmAccountHandler,
  deleteWhmAccountHandler,
  syncWhmAccountsDiskUsageHandler,
  resetWhmAccountPasswordHandler,
  changeWhmAccountPlanHandler,
  createWhmPlanHandler,
  updateWhmPlanHandler,
  deleteWhmPlanHandler
} from "../../controllers/whm/account.controller.js";
import { listAllDomainsHandler } from "../../controllers/odin/domain.controller.js";
import { getDnsZoneHandler, addDnsRecordHandler, deleteDnsRecordHandler } from "../../controllers/odin/dns.controller.js";
import {
  getServerStatsHandler,
  getProcessesHandler,
  killProcessHandler,
  getServicesHandler,
  manageServiceHandler,
  getLogsHandler,
  getServerConfigHandler,
  rebootServerHandler,
} from "../../controllers/whm/server.controller.js";
import {
  listAllDatabasesHandler,
  repairDatabaseHandler,
  optimizeDatabaseHandler,
  generateDbSsoHandler,
  resetPasswordHandler
} from "../../controllers/whm/database.controller.js";
import {
  exportAccountHandler,
  downloadMigrationHandler,
  importAccountHandler,
  sshMigrateHandler
} from "../../controllers/whm/migration.controller.js";
import {
  whmPhpStatusHandler,
  whmPhpAccountsHandler,
  whmChangeAccountPhpHandler,
  whmReloadFpmHandler,
} from "../../controllers/odin/php.controller.js";
import { getUpdateStatusHandler, runUpdateHandler } from "../../controllers/whm/update.controller.js";
import { requireAuth } from "../../middleware/auth.js";
import { db } from "../../config/db.js";
import { getSysStats } from "../../services/sys-stats.service.js";

export const whmRouter = Router();
whmRouter.use(requireAuth({ roles: ["admin", "reseller"] }));

const toPercent = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
};


whmRouter.get("/dashboard", async (_req, res) => {
  try {
    const [countResult, sys] = await Promise.all([
      db.query<{ active: string; suspended: string; terminated: string }>(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'active')::text AS active,
           COUNT(*) FILTER (WHERE status = 'suspended')::text AS suspended,
           COUNT(*) FILTER (WHERE status = 'terminated')::text AS terminated
         FROM users
         WHERE role IN ('admin', 'reseller', 'user')`
      ),
      getSysStats()  // cached 30s — no execSync blocking
    ]);

    const loadAverage1m = sys.loadAvgs[0] ?? 0;
    const cpuPercent = toPercent((loadAverage1m / sys.cpuCores) * 100);
    const row = countResult.rows[0] ?? { active: "0", suspended: "0", terminated: "0" };

    res.status(200).json({
      success: true,
      data: {
        server: {
          cpu:          cpuPercent,
          ram:          sys.ramPercent,
          disk:         sys.diskPercent || 15, // fallback 15% in dev
          loadAverage1m: Number(loadAverage1m.toFixed(2)),
          cores:        sys.cpuCores,
          uptimeSeconds: sys.uptimeSeconds
        },
        accounts: {
          active:     Number(row.active     ?? "0"),
          suspended:  Number(row.suspended  ?? "0"),
          terminated: Number(row.terminated ?? "0")
        }
      }
    });
  } catch (error) {
    console.error("[whm:dashboard:error]", error);
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "No se pudo cargar el dashboard" }
    });
  }
});

whmRouter.get("/settings", async (_req, res) => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS server_settings (
          key VARCHAR(128) PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    const result = await db.query("SELECT key, value FROM server_settings");
    const settings: Record<string, string> = {};
    for (const row of result.rows) {
      settings[row.key] = row.value;
    }
    return res.status(200).json({ success: true, data: settings });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: "Error al obtener configuraciones" } });
  }
});

whmRouter.post("/settings", async (req, res) => {
  const settings = req.body;
  if (typeof settings !== "object" || settings === null) {
    return res.status(400).json({ success: false, error: { message: "Formato inválido" } });
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    for (const [key, value] of Object.entries(settings)) {
      await client.query(
        `INSERT INTO server_settings (key, value, updated_at) 
         VALUES ($1, $2, CURRENT_TIMESTAMP) 
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP`,
        [key, String(value)]
      );
    }
    await client.query("COMMIT");
    return res.status(200).json({ success: true, message: "Configuración guardada exitosamente" });
  } catch (error) {
    await client.query("ROLLBACK");
    return res.status(500).json({ success: false, error: { message: "Error al guardar configuraciones" } });
  } finally {
    client.release();
  }
});

whmRouter.get("/plans", listWhmPlansHandler);
whmRouter.post("/plans", createWhmPlanHandler);
whmRouter.patch("/plans/:planId", updateWhmPlanHandler);
whmRouter.delete("/plans/:planId", deleteWhmPlanHandler);
whmRouter.get("/accounts", listWhmAccountsHandler);
whmRouter.post("/accounts", createWhmAccountHandler);
whmRouter.post("/accounts/:accountId/suspend", suspendWhmAccountHandler);
whmRouter.post("/accounts/:accountId/resume", resumeWhmAccountHandler);
whmRouter.post("/accounts/:accountId/impersonate", impersonateWhmAccountHandler);
whmRouter.delete("/accounts/:accountId", deleteWhmAccountHandler);
whmRouter.post("/accounts/:accountId/reset-password", resetWhmAccountPasswordHandler);
whmRouter.patch("/accounts/:accountId/plan", changeWhmAccountPlanHandler);
whmRouter.post("/accounts/sync-disk", syncWhmAccountsDiskUsageHandler);

whmRouter.get("/domains", listAllDomainsHandler);
whmRouter.get("/domains/:id/dns", getDnsZoneHandler);
whmRouter.post("/dns/zones/:zoneId/records", addDnsRecordHandler);
whmRouter.delete("/dns/records/:recordId", deleteDnsRecordHandler);

// ── Multi-PHP WHM routes ───────────────────────────────────────────────────────
whmRouter.get("/php/status", whmPhpStatusHandler);                           // FPM pools status
whmRouter.get("/php/accounts", whmPhpAccountsHandler);                       // PHP version per account
whmRouter.patch("/php/accounts/:accountId", whmChangeAccountPhpHandler);     // Change any account PHP
whmRouter.post("/php/reload/:version", whmReloadFpmHandler);                 // Reload specific FPM pool

// ── Server Live Monitor ────────────────────────────────────────────────────────
whmRouter.get("/server/stats", getServerStatsHandler);
whmRouter.get("/server/config", getServerConfigHandler);     // Software/network info
whmRouter.post("/server/reboot", rebootServerHandler);       // Schedule reboot
whmRouter.get("/server/processes", getProcessesHandler);
whmRouter.delete("/server/processes/:pid", killProcessHandler);
whmRouter.get("/server/services", getServicesHandler);
whmRouter.post("/server/services/:name/:action", manageServiceHandler);
whmRouter.get("/server/logs/:type", getLogsHandler);

// ── Database Admin Routes ──────────────────────────────────────────────────────
whmRouter.get("/databases", listAllDatabasesHandler);
whmRouter.post("/databases/:dbName/repair", repairDatabaseHandler);
whmRouter.post("/databases/:dbName/optimize", optimizeDatabaseHandler);
whmRouter.get("/databases/:dbName/sso", generateDbSsoHandler);
whmRouter.post("/databases/:dbUser/password", resetPasswordHandler);

// ── Migration & Backups Routes ─────────────────────────────────────────────────
const whmUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, os.tmpdir()),
    filename: (_req, file, cb) => cb(null, `whm_import_${Date.now()}.tar.gz`),
  }),
  limits: { fileSize: 5000 * 1024 * 1024 }, // 5GB max for migrations
});

whmRouter.post("/migrations/export/:username", exportAccountHandler);
whmRouter.get("/migrations/download", downloadMigrationHandler);
whmRouter.post("/migrations/import", whmUpload.single("backup"), importAccountHandler);
whmRouter.post("/migrations/ssh", sshMigrateHandler);

// ── Self Update Routes ──────────────────────────────────────────────────────────
whmRouter.get("/update/status", getUpdateStatusHandler);
whmRouter.post("/update/run", runUpdateHandler);
