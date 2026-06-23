import { Router } from "express";
import os from "node:os";
import { 
  installWpHandler, 
  listWpSitesHandler, 
  getWpSiteByIdHandler, 
  deleteWpSiteHandler,
  generateSsoUrlHandler,
  wpVersionsHandler,
  updateWpHandler
} from "../../controllers/odin/wordpress.controller.js";
import { 
  listDomainsHandler, 
  addDomainHandler, 
  deleteDomainHandler, 
  verifyDomainHandler 
} from "../../controllers/odin/domain.controller.js";
import { listDatabasesHandler, createDatabaseHandler, issueDatabaseSsoHandler } from "../../controllers/odin/database.controller.js";
import { requireAuth } from "../../middleware/auth.js";
import { db } from "../../config/db.js";
import multer from "multer";
import { 
  listFilesHandler, 
  createFolderHandler, 
  deletePathHandler, 
  renamePathHandler, 
  readFileHandler, 
  writeFileHandler, 
  compressHandler, 
  extractHandler, 
  chmodHandler,
  downloadFileHandler, 
  uploadFileHandler,
  diskUsageHandler 
} from "../../controllers/odin/file.controller.js";
import {
  listBackupsHandler,
  createBackupHandler,
  downloadBackupHandler,
  deleteBackupHandler,
} from "../../controllers/odin/backup.controller.js";
import {
  getVersionsHandler,
  getCurrentPhpHandler,
  changeVersionHandler,
  getPhpIniHandler,
  updatePhpIniHandler,
  getExtensionsHandler,
} from "../../controllers/odin/php.controller.js";
import { getDomainSslStatusHandler, issueSslHandler } from "../../controllers/odin/ssl.controller.js";
import { getDnsZoneHandler, addDnsRecordHandler, deleteDnsRecordHandler } from "../../controllers/odin/dns.controller.js";
import {
  listAppsHandler,
  createAppHandler,
  deleteAppHandler,
  manageAppHandler,
  getAppLogsHandler,
  updateAppEnvHandler,
  runNpmInstallHandler
} from "../../controllers/odin/nodejs.controller.js";
import { ensureNodejsTables } from "../../services/odin/nodejs.service.js";
import {
  listPythonAppsHandler,
  createPythonAppHandler,
  managePythonAppHandler,
  deletePythonAppHandler,
  getPythonAppLogsHandler,
  updatePythonAppEnvHandler
} from "../../controllers/odin/python.controller.js";
import { ensurePythonTables } from "../../services/odin/python.service.js";
import {
  listAppsHandler as listCloudWebAppsHandler,
  deployAppHandler as deployCloudWebAppHandler,
  deleteAppHandler as deleteCloudWebAppHandler,
  manageAppHandler as manageCloudWebAppHandler,
  getAppLogsHandler as getCloudWebAppLogsHandler,
  updateAppEnvHandler as updateCloudWebAppEnvHandler
} from "../../controllers/odin/cloudweb.controller.js";
import {
  createMailAccountHandler,
  getMailAccountHandler,
  issueMailSsoHandler,
  listMailAccountsHandler,
  changeMailPasswordHandler
} from "../../controllers/odin/mail.controller.js";
import rateLimit from "express-rate-limit";
import { getSysStats } from "../../services/sys-stats.service.js";


// Rate limiter for heavy CPU/disk/network operations (5 req per user per minute)
const heavyOpLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  keyGenerator: (req) => (req as any).auth?.userId ?? req.ip ?? "anon",
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  message: { success: false, error: { code: "RATE_LIMIT", message: "Demasiadas solicitudes. Espera un momento." } }
});

export const odinRouter = Router();

odinRouter.use(requireAuth({ roles: ["user"] }));

const toPercent = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
};


odinRouter.get("/dashboard", async (req, res) => {
  try {
    const userId = req.auth?.userId;

    // ensureNodejsTables / ensurePythonTables removed from hot path.
    // Tables are initialized at server startup — see server.ts.

    const [accountRes, servicesRes, databasesRes, userRes, emailsRes, sys] = await Promise.all([
      db.query(`
        SELECT ha.disk_used_mb, p.name as plan_name, p.disk_quota_mb, u.plan_expires_at
        FROM hosting_accounts ha
        INNER JOIN users u ON u.id = ha.user_id
        LEFT JOIN plans p ON p.id = u.plan_id
        WHERE u.id = $1 LIMIT 1
      `, [userId]),
      db.query(`
        SELECT
          (SELECT COUNT(*) FROM domains WHERE user_id = $1) as domains,
          (
            (SELECT COUNT(*) FROM wordpress_sites WHERE user_id = $1) +
            (SELECT COUNT(*) FROM nodejs_apps WHERE user_id = $1) +
            (SELECT COUNT(*) FROM python_apps WHERE user_id = $1)
          ) as apps
      `, [userId]),
      db.query(
        `SELECT (
           (SELECT COUNT(*) FROM user_databases WHERE user_id = $1) +
           (SELECT COUNT(*) FROM wordpress_sites WHERE user_id = $1)
         )::text AS databases`,
        [userId]
      ),
      db.query(`SELECT username FROM users WHERE id = $1 LIMIT 1`, [userId]),
      // Count real mail accounts (table may not exist on first boot, so guard with COALESCE)
      db.query(
        `SELECT COALESCE(
           (SELECT COUNT(*)::int FROM mail_accounts WHERE user_id = $1),
           0
         ) AS emails`,
        [userId]
      ).catch(() => ({ rows: [{ emails: 0 }] })),  // graceful fallback if table missing
      getSysStats()  // cached, non-blocking
    ]);

    const account = accountRes.rows[0];
    const services = servicesRes.rows[0];
    const databaseSummary = databasesRes.rows[0];
    const osUsername: string = (userRes.rows[0]?.username ?? "").replace(/[^a-z0-9]/gi, "_").toLowerCase();

    const diskUsed    = Number(account?.disk_used_mb || 0);
    const diskLimit   = Number(account?.disk_quota_mb || 1024);
    const diskPercent = diskLimit > 0 ? toPercent((diskUsed / diskLimit) * 100) : 0;

    const cpuPercent = toPercent((sys.loadAvgs[0] / sys.cpuCores) * 100);

    res.status(200).json({
      success: true,
      data: {
        account: {
          plan: account?.plan_name || "Free",
          diskUsed,
          diskLimit,
          diskPercent,
          username: osUsername,
          expiresAt: account?.plan_expires_at || null
        },
        services: {
          domains:   parseInt(services?.domains   || "0"),
          emails:    Number(emailsRes.rows[0]?.emails ?? 0),
          databases: parseInt(databaseSummary?.databases || "0"),
          apps:      parseInt(services?.apps || "0")
        },
        server: {
          cpu:          cpuPercent,
          ram:          sys.ramPercent,
          disk:         sys.diskPercent,
          loadAverage1m: sys.loadAvgs[0],
          loadAvgs:     sys.loadAvgs,
          cores:        sys.cpuCores,
          uptimeSeconds: sys.uptimeSeconds,
          ramDetails:   { total: sys.ramTotal, free: sys.ramFree }
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: "Error al cargar dashboard" } });
  }
});

odinRouter.get("/wordpress", listWpSitesHandler);
odinRouter.get("/wordpress/versions", wpVersionsHandler);    // must be before /:id
odinRouter.get("/wordpress/:id", getWpSiteByIdHandler);
odinRouter.post("/wordpress/:id/sso", generateSsoUrlHandler);
odinRouter.post("/wordpress/:id/update", heavyOpLimiter, updateWpHandler);
odinRouter.delete("/wordpress/:id", deleteWpSiteHandler);
odinRouter.post("/wordpress/install", heavyOpLimiter, installWpHandler);

odinRouter.get("/domains", listDomainsHandler);
odinRouter.post("/domains", addDomainHandler);
odinRouter.post("/domains/:id/verify", verifyDomainHandler);
odinRouter.delete("/domains/:id", deleteDomainHandler);

odinRouter.get("/mail/accounts", listMailAccountsHandler);
odinRouter.post("/mail/accounts", createMailAccountHandler);
odinRouter.get("/mail/accounts/:accountId", getMailAccountHandler);
odinRouter.post("/mail/accounts/:accountId/sso", issueMailSsoHandler);
odinRouter.patch("/mail/accounts/:accountId/password", changeMailPasswordHandler);

odinRouter.get("/databases", listDatabasesHandler);
odinRouter.post("/databases", createDatabaseHandler);
odinRouter.post("/databases/:dbName/sso", issueDatabaseSsoHandler);

// ── File upload: disk storage with 500 MB limit ────────────────────────────
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, os.tmpdir()),
    filename: (_req, file, cb) =>
      cb(null, `${Date.now()}-${file.originalname.replace(/[^\w.\-]/g, "_")}`),
  }),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB per file
});

// ── File Manager routes ──────────────────────────────────────────────────────
odinRouter.get("/files/usage", heavyOpLimiter, diskUsageHandler); // must be before /files
odinRouter.get("/files", listFilesHandler);
odinRouter.post("/files/folder", createFolderHandler);
odinRouter.delete("/files", deletePathHandler);
odinRouter.put("/files/rename", renamePathHandler);
odinRouter.get("/files/content", readFileHandler);
odinRouter.put("/files/content", writeFileHandler);
odinRouter.post("/files/compress", compressHandler);
odinRouter.post("/files/extract", extractHandler);            // ZIP + TAR
odinRouter.patch("/files/chmod", chmodHandler);               // chmod
odinRouter.get("/files/download", downloadFileHandler);
odinRouter.post("/files/upload", upload.array("files"), uploadFileHandler);

// ── Backup routes ──────────────────────────────────────────────────
odinRouter.get   ("/backups",         listBackupsHandler);
odinRouter.post  ("/backups",         heavyOpLimiter, createBackupHandler); // tar is heavy
odinRouter.get   ("/backups/download", downloadBackupHandler);
odinRouter.delete("/backups",          deleteBackupHandler);

// ── Multi-PHP routes ─────────────────────────────────────────────────────────
odinRouter.get("/php/versions",   getVersionsHandler);         // Versiones en el servidor
odinRouter.get("/php/current",    getCurrentPhpHandler);       // Config actual del usuario
odinRouter.patch("/php/version",  changeVersionHandler);       // Cambiar versión
odinRouter.get("/php/ini",        getPhpIniHandler);           // Leer php.ini
odinRouter.patch("/php/ini",      updatePhpIniHandler);        // Actualizar php.ini
odinRouter.get("/php/extensions", getExtensionsHandler);       // Extensiones disponibles

// ── Auto SSL ─────────────────────────────────────────────────────────────────
odinRouter.get("/domains/:domainId/ssl", getDomainSslStatusHandler);
odinRouter.post("/domains/:domainId/ssl/issue", issueSslHandler);

// ── DNS / Zone Editor ────────────────────────────────────────────────────────
odinRouter.get("/domains/:id/dns", getDnsZoneHandler);
odinRouter.post("/dns/zones/:zoneId/records", addDnsRecordHandler);
odinRouter.delete("/dns/records/:recordId", deleteDnsRecordHandler);

// ── Node.js / PM2 Integrations ──────────────────────────────────────────────
odinRouter.get("/nodejs", listAppsHandler);
odinRouter.post("/nodejs", createAppHandler);
odinRouter.delete("/nodejs/:id", deleteAppHandler);
odinRouter.post("/nodejs/:id/:action(start|stop|restart)", manageAppHandler);
odinRouter.get("/nodejs/:id/logs", getAppLogsHandler);
odinRouter.put("/nodejs/:id/env", updateAppEnvHandler);
odinRouter.post("/nodejs/:id/npm-install", runNpmInstallHandler);

// ── Python Runtime Integrations ─────────────────────────────────────────────
odinRouter.get("/python", listPythonAppsHandler);
odinRouter.post("/python", createPythonAppHandler);
odinRouter.delete("/python/:id", deletePythonAppHandler);
odinRouter.post("/python/:id/:action(start|stop|restart)", managePythonAppHandler);
odinRouter.get("/python/:id/logs", getPythonAppLogsHandler);
odinRouter.put("/python/:id/env", updatePythonAppEnvHandler);

// ── Cloud Web / Nixpacks + Docker Integrations ──────────────────────────────
odinRouter.get("/cloud-web", listCloudWebAppsHandler);
odinRouter.post("/cloud-web/deploy", heavyOpLimiter, deployCloudWebAppHandler);
odinRouter.delete("/cloud-web/:id", deleteCloudWebAppHandler);
odinRouter.post("/cloud-web/:id/:action(start|stop|restart)", manageCloudWebAppHandler);
odinRouter.get("/cloud-web/:id/logs", getCloudWebAppLogsHandler);
odinRouter.put("/cloud-web/:id/env", updateCloudWebAppEnvHandler);
