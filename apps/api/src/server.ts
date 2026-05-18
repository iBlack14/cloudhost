import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { startSmtpReceiver } from "./services/mail-receiver.service.js";

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`[odisea-api] listening on :${env.PORT}`);
  
  try {
    startSmtpReceiver();
  } catch (error) {
    console.error("[odisea-api] Failed to start SMTP receiver:", error);
  }
});
