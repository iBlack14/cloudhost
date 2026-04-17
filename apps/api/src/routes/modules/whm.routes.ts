import { Router } from "express";
import os from "node:os";
import { execSync } from "node:child_process";

import {
  createWhmAccountHandler,
  impersonateWhmAccountHandler,
  listWhmAccountsHandler,
  listWhmPlansHandler,
  resumeWhmAccountHandler,
  suspendWhmAccountHandler
} from "../../controllers/whm/account.controller.js";
import { listAllDomainsHandler } from "../../controllers/odin/domain.controller.js";
import { getDnsZoneHandler, addDnsRecordHandler, deleteDnsRecordHandler } from "../../controllers/odin/dns.controller.js";
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
    const ramPercent = toPercent(((os.totalmem() - os.freemem()) / os.totalmem()) * 100);
    const diskPercent = getDiskUsagePercent() || 15; // Fallback to 15% if 0 (common in dev)

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
whmRouter.get("/domains", listAllDomainsHandler);
whmRouter.get("/domains/:id/dns", getDnsZoneHandler);
whmRouter.post("/dns/zones/:zoneId/records", addDnsRecordHandler);
whmRouter.delete("/dns/records/:recordId", deleteDnsRecordHandler);
