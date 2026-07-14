import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { startSmtpReceiver } from "./services/mail-receiver.service.js";
import { runStartupInit } from "./services/startup.service.js";
import { getSysStats } from "./services/sys-stats.service.js";
import { syncAllWhmAccountsDiskUsage } from "./services/whm/account.service.js";

const app = createApp();

app.listen(env.PORT, async () => {
  console.log(`[odisea-api] listening on :${env.PORT}`);

  // Initialize schema + indexes before serving traffic
  await runStartupInit();

  // Pre-warm system stats cache so first dashboard request is instant
  getSysStats().catch(() => {});

  // Run initial disk usage synchronization 10 seconds after server boot
  setTimeout(() => {
    console.log("[startup] Running background WHM disk usage synchronization...");
    syncAllWhmAccountsDiskUsage().catch(err => {
      console.error("[startup] Failed background WHM disk usage sync:", err);
    });
  }, 10_000);

  // Periodically run disk usage synchronization every 10 minutes
  const TEN_MINUTES_MS = 10 * 60 * 1000;
  setInterval(() => {
    console.log("[cron] Running background WHM disk usage synchronization...");
    syncAllWhmAccountsDiskUsage().catch(err => {
      console.error("[cron] Failed background WHM disk usage sync:", err);
    });
  }, TEN_MINUTES_MS);

  try {
    startSmtpReceiver();
  } catch (error) {
    console.error("[odisea-api] Failed to start SMTP receiver:", error);
  }
  
  try {
    const { startFtpServer } = await import("./services/ftp-server.service.js");
    startFtpServer();
  } catch (error) {
    console.error("[odisea-api] Failed to start FTP server:", error);
  }
});
