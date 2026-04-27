import { Router } from "express";
import os from "node:os";
import { execSync } from "node:child_process";

import {
  createWhmAccountHandler,
  impersonateWhmAccountHandler,
  listWhmAccountsHandler,
  listWhmPlansHandler,
  resumeWhmAccountHandler,
  suspendWhmAccountHandler,
  deleteWhmAccountHandler,
  syncWhmAccountsDiskUsageHandler
} from "../../controllers/whm/account.controller.js";
import { listAllDomainsHandler } from "../../controllers/odin/domain.controller.js";
import { getDnsZoneHandler, addDnsRecordHandler, deleteDnsRecordHandler } from "../../controllers/odin/dns.controller.js";
import {
  getServerStatsHandler,
  getProcessesHandler,
  killProcessHandler,
  getServicesHandler,
  manageServiceHandler,
  getLogsHandler
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
import { requireAuth } from "../../middleware/auth.js";
import { db } from "../../config/db.js";

export const whmRouter = Router();
whmRouter.use(requireAuth({ roles: ["admin", "reseller"] }));

const toPercent = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
};

const getDiskUsagePercent = (): number => {
  try {
    const output = execSync("df -P /", { encoding: "utf-8" });
    const lines = output.trim().split("\n");
    if (lines.length < 2) return 0;
    const columns = lines[1].trim().split(/\s+/);
    const usePercent = columns[4] ?? "0%";
    return toPercent(Number(usePercent.replace("%", "")));
  } catch {
    return 0;
  }
};

whmRouter.get("/dashboard", async (_req, res) => {
  try {
    const [countResult, uptimeSeconds] = await Promise.all([
      db.query<{ active: string; suspended: string; terminated: string }>(
        `
          SELECT
            COUNT(*) FILTER (WHERE status = 'active')::text AS active,
            COUNT(*) FILTER (WHERE status = 'suspended')::text AS suspended,
            COUNT(*) FILTER (WHERE status = 'terminated')::text AS terminated
          FROM users
          WHERE role IN ('admin', 'reseller', 'user')
        `
      ),
      Promise.resolve(Math.floor(os.uptime()))
    ]);

    const cores = os.cpus().length || 1;
    const loadAvgs = os.loadavg();
    const loadAverage1m = loadAvgs && loadAvgs.length > 0 ? loadAvgs[0] : 0;
    
    // Fallback logic for systems without loadavg (like Windows sometimes returns [0,0,0])
    const cpuPercent = toPercent((loadAverage1m / cores) * 100);

    let ramPercent = 0;
    try {
        if (os.platform() === "linux") {
            const memInfo = execSync("cat /proc/meminfo", { encoding: "utf-8" });
            const totalMatch = memInfo.match(/MemTotal:\s+(\d+)/);
            const availableMatch = memInfo.match(/MemAvailable:\s+(\d+)/);
            if (totalMatch && availableMatch) {
                const total = parseInt(totalMatch[1], 10);
                const available = parseInt(availableMatch[1], 10);
                ramPercent = toPercent(((total - available) / total) * 100);
            }
        }
    } catch {
        // Fallback to basic node:os
    }

    if (!ramPercent) {
        ramPercent = toPercent(((os.totalmem() - os.freemem()) / os.totalmem()) * 100);
    }

    const diskPercent = getDiskUsagePercent() || 15; // Fallback to 15% if 0 (common in dev/Windows)

    const row = countResult.rows[0] ?? { active: "0", suspended: "0", terminated: "0" };

    res.status(200).json({
      success: true,
      data: {
        server: {
          cpu: cpuPercent,
          ram: ramPercent,
          disk: diskPercent,
          loadAverage1m: Number(loadAverage1m.toFixed(2)),
          cores,
          uptimeSeconds
        },
        accounts: {
          active: Number(row.active ?? "0"),
          suspended: Number(row.suspended ?? "0"),
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

whmRouter.get("/plans", listWhmPlansHandler);
whmRouter.get("/accounts", listWhmAccountsHandler);
whmRouter.post("/accounts", createWhmAccountHandler);
whmRouter.post("/accounts/:accountId/suspend", suspendWhmAccountHandler);
whmRouter.post("/accounts/:accountId/resume", resumeWhmAccountHandler);
whmRouter.post("/accounts/:accountId/impersonate", impersonateWhmAccountHandler);
whmRouter.delete("/accounts/:accountId", deleteWhmAccountHandler);
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
import multer from "multer";

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

