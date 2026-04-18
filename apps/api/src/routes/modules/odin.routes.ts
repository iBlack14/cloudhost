import { Router } from "express";
import path from "node:path";
import os from "node:os";
import { 
  installWpHandler, 
  listWpSitesHandler, 
  getWpSiteByIdHandler, 
  deleteWpSiteHandler,
  generateSsoUrlHandler 
} from "../../controllers/odin/wordpress.controller.js";
import { 
  listDomainsHandler, 
  addDomainHandler, 
  deleteDomainHandler, 
  verifyDomainHandler 
} from "../../controllers/odin/domain.controller.js";
import { listDatabasesHandler, createDatabaseHandler } from "../../controllers/odin/database.controller.js";
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
  uploadFileHandler 
} from "../../controllers/odin/file.controller.js";
import {
  getVersionsHandler,
  getCurrentPhpHandler,
  changeVersionHandler,
  getPhpIniHandler,
  updatePhpIniHandler,
  getExtensionsHandler,
} from "../../controllers/odin/php.controller.js";
import { getDomainSslStatusHandler, issueSslHandler } from "../../controllers/odin/ssl.controller.js";
import {
  listAppsHandler,
  createAppHandler,
  deleteAppHandler,
  manageAppHandler,
  getAppLogsHandler,
  updateAppEnvHandler,
  runNpmInstallHandler
} from "../../controllers/odin/nodejs.controller.js";

export const odinRouter = Router();

odinRouter.use(requireAuth({ roles: ["user"] }));

odinRouter.get("/dashboard", async (req, res) => {
  try {
    const userId = req.auth?.userId;
    
    const [accountRes, servicesRes] = await Promise.all([
      db.query(`
        SELECT ha.disk_used_mb, p.name as plan_name, p.disk_quota_mb
        FROM hosting_accounts ha
        INNER JOIN users u ON u.id = ha.user_id
        LEFT JOIN plans p ON p.id = u.plan_id
        WHERE u.id = $1 LIMIT 1
      `, [userId]),
      db.query(`
        SELECT 
          (SELECT COUNT(*) FROM domains WHERE user_id = $1) as domains,
          (SELECT COUNT(*) FROM wordpress_sites WHERE user_id = $1) as apps
      `, [userId])
    ]);

    const account = accountRes.rows[0];
    const services = servicesRes.rows[0];

    res.status(200).json({
      success: true,
      data: {
        account: { 
          plan: account?.plan_name || "Free", 
          diskUsed: account?.disk_used_mb || 0, 
          diskLimit: account?.disk_quota_mb || 1024 
        },
        services: { 
          domains: parseInt(services?.domains || "0"), 
          emails: 0, 
          databases: 1, 
          apps: parseInt(services?.apps || "0") 
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: "Error al cargar dashboard" } });
  }
});

odinRouter.get("/wordpress", listWpSitesHandler);
odinRouter.get("/wordpress/:id", getWpSiteByIdHandler);
odinRouter.post("/wordpress/:id/sso", generateSsoUrlHandler);
odinRouter.delete("/wordpress/:id", deleteWpSiteHandler);
odinRouter.post("/wordpress/install", installWpHandler);

odinRouter.get("/domains", listDomainsHandler);
odinRouter.post("/domains", addDomainHandler);
odinRouter.post("/domains/:id/verify", verifyDomainHandler);
odinRouter.delete("/domains/:id", deleteDomainHandler);

odinRouter.get("/databases", listDatabasesHandler);
odinRouter.post("/databases", createDatabaseHandler);

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

// ── Node.js / PM2 Integrations ──────────────────────────────────────────────
odinRouter.get("/nodejs", listAppsHandler);
odinRouter.post("/nodejs", createAppHandler);
odinRouter.delete("/nodejs/:id", deleteAppHandler);
odinRouter.post("/nodejs/:id/:action(start|stop|restart)", manageAppHandler);
odinRouter.get("/nodejs/:id/logs", getAppLogsHandler);
odinRouter.put("/nodejs/:id/env", updateAppEnvHandler);
odinRouter.post("/nodejs/:id/npm-install", runNpmInstallHandler);

