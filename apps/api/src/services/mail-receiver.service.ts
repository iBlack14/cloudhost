import { SMTPServer, type SMTPServerAddress, type SMTPServerSession } from "smtp-server";
import { simpleParser, type ParsedMail } from "mailparser";
import type { Readable } from "node:stream";
import { db } from "../config/db.js";
import { env } from "../config/env.js";
import { appendMessageToMailbox } from "./mail.service.js";

let server: SMTPServer | null = null;

export const startSmtpReceiver = (): void => {
  if (!env.SMTP_RECEIVER_ENABLED) {
    console.log("[SMTP_RECEIVER] Incoming mail receiver is disabled by configuration.");
    return;
  }

  server = new SMTPServer({
    authOptional: true, // Incoming mail servers do not require authentication from external senders
    disabledCommands: ["AUTH"], // Do not advertise AUTH command for public mail reception
    
    // Validate recipients
    onRcptTo(
      address: SMTPServerAddress,
      session: SMTPServerSession,
      callback: (err?: Error | null) => void
    ) {
      const recipient = address.address.toLowerCase().trim();
      db.query("SELECT id FROM mail_accounts WHERE address = $1 LIMIT 1", [recipient])
        .then((res) => {
          if (res.rowCount === 0) {
            // Reject the recipient with a 550 error
            const err = new Error("User unknown");
            (err as any).responseCode = 550;
            return callback(err);
          }
          callback();
        })
        .catch((err: any) => {
          console.error("[SMTP_RECEIVER] Error checking recipient existence:", err);
          callback(new Error("Internal server error"));
        });
    },

    // Receive and parse mail stream
    onData(
      stream: Readable,
      session: SMTPServerSession,
      callback: (err?: Error | null) => void
    ) {
      simpleParser(stream)
        .then(async (parsed: ParsedMail) => {
          const toAddresses = Array.isArray(parsed.to)
            ? parsed.to.map((addr: any) => addr.value[0]?.address ?? "")
            : [parsed.to?.value[0]?.address ?? ""];

          const fromAddress = parsed.from?.value[0]?.address ?? "unknown@unknown.com";
          const fromName = parsed.from?.value[0]?.name ?? "";
          const subject = parsed.subject ?? "(No Subject)";
          
          // Get the body content (plain text preferred, fallback to HTML)
          const body = parsed.text || parsed.html || "";

          // Distribute to all local mailboxes matched
          for (const to of toAddresses) {
            if (!to) continue;
            const normalizedTo = to.trim().toLowerCase();

            const mailboxRes = await db.query<{ id: string }>(
              "SELECT id FROM mail_accounts WHERE address = $1 LIMIT 1",
              [normalizedTo]
            );

            if (mailboxRes.rowCount && mailboxRes.rowCount > 0) {
              const mailboxId = mailboxRes.rows[0].id;
              await appendMessageToMailbox({
                mailboxId,
                folder: "INBOX",
                fromName,
                fromAddress,
                to: toAddresses,
                subject,
                body
              });
              console.log(`[SMTP_RECEIVER] Successfully delivered message from ${fromAddress} to ${normalizedTo}`);
            }
          }
          callback();
        })
        .catch((err: any) => {
          console.error("[SMTP_RECEIVER] Error parsing or saving incoming email:", err);
          callback(new Error("Error processing incoming message"));
        });
    }
  });

  server.on("error", (err: Error) => {
    console.error("[SMTP_RECEIVER] SMTP Server error:", err);
  });

  server.listen(env.SMTP_RECEIVER_PORT, env.SMTP_RECEIVER_HOST, () => {
    console.log(
      `[SMTP_RECEIVER] Incoming SMTP server listening on ${env.SMTP_RECEIVER_HOST}:${env.SMTP_RECEIVER_PORT}`
    );
  });
};

export const stopSmtpReceiver = (): Promise<void> => {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        console.log("[SMTP_RECEIVER] SMTP Server stopped.");
        resolve();
      });
    } else {
      resolve();
    }
  });
};
