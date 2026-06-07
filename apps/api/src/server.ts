import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { startSmtpReceiver } from "./services/mail-receiver.service.js";
import { runStartupInit } from "./services/startup.service.js";
import { getSysStats } from "./services/sys-stats.service.js";

const app = createApp();

app.listen(env.PORT, async () => {
  console.log(`[odisea-api] listening on :${env.PORT}`);

  // Initialize schema + indexes before serving traffic
  await runStartupInit();

  // Pre-warm system stats cache so first dashboard request is instant
  getSysStats().catch(() => {});

  try {
    startSmtpReceiver();
  } catch (error) {
    console.error("[odisea-api] Failed to start SMTP receiver:", error);
  }
});
