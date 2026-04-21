import { randomUUID } from "node:crypto";

import type {
  MailAccountSummary,
  MailFolder,
  MailFolderSummary,
  MailIdentity,
  MailMessageDetail,
  MailMessageSummary,
  MailSsoLink
} from "@odisea/types";

import { env } from "../config/env.js";
import { db } from "../config/db.js";
import { hashPassword, verifyPassword } from "../utils/hash-password.js";
import {
  signMailSessionToken,
  signMailSsoToken,
  type MailSessionTokenPayload,
  type MailSsoTokenPayload
} from "../utils/jwt.js";

interface MailAccountRow {
  id: string;
  user_id: string;
  domain_id: string | null;
  address: string;
  username: string;
  password_hash: string;
  quota_mb: number | null;
  used_mb: number;
  status: MailAccountSummary["status"];
  alternate_email: string;
  created_at: string;
  updated_at: string;
}

interface MailMessageRow {
  id: string;
  mailbox_id: string;
  folder: MailFolder;
  from_name: string;
  from_address: string;
  to_addresses: string[];
  subject: string;
  preview: string;
  body: string;
  is_read: boolean;
  is_starred: boolean;
  sent_at: string;
}

const ensureMailSchema = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS mail_accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      domain_id UUID REFERENCES domains(id) ON DELETE SET NULL,
      address TEXT NOT NULL UNIQUE,
      username TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      quota_mb INTEGER,
      used_mb INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      alternate_email TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE mail_accounts ADD COLUMN IF NOT EXISTS quota_mb INTEGER;
    ALTER TABLE mail_accounts ADD COLUMN IF NOT EXISTS used_mb INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE mail_accounts ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
    ALTER TABLE mail_accounts ADD COLUMN IF NOT EXISTS alternate_email TEXT NOT NULL DEFAULT '';
    ALTER TABLE mail_accounts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

    CREATE TABLE IF NOT EXISTS mail_sso_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      mailbox_id UUID NOT NULL REFERENCES mail_accounts(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_jti UUID NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      consumed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS mail_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      mailbox_id UUID NOT NULL REFERENCES mail_accounts(id) ON DELETE CASCADE,
      folder TEXT NOT NULL DEFAULT 'INBOX',
      from_name TEXT NOT NULL DEFAULT '',
      from_address TEXT NOT NULL,
      to_addresses JSONB NOT NULL DEFAULT '[]'::jsonb,
      subject TEXT NOT NULL DEFAULT '',
      preview TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL DEFAULT '',
      is_read BOOLEAN NOT NULL DEFAULT false,
      is_starred BOOLEAN NOT NULL DEFAULT false,
      sent_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
};

const normalizeAddress = (value: string): string => value.trim().toLowerCase();

const createPreview = (body: string): string => body.replace(/\s+/g, " ").trim().slice(0, 140);

const estimateMessageSizeMb = (subject: string, body: string): number => {
  const bytes = Buffer.byteLength(`${subject}\n${body}`, "utf8");
  return Number((bytes / (1024 * 1024)).toFixed(4));
};

const formatRelative = (value: string): string => {
  const timestamp = new Date(value).getTime();
  const diffMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} min`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} h`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} d`;
};

const mapAccount = (row: MailAccountRow): MailAccountSummary => ({
  id: row.id,
  address: row.address,
  username: row.username,
  domain: row.address.split("@")[1] ?? "",
  status: row.status,
  usedMb: row.used_mb,
  allocatedMb: row.quota_mb,
  devicesConnected: 0,
  lastSync: "just now",
  alternateEmail: row.alternate_email
});

const mapMessageSummary = (row: MailMessageRow): MailMessageSummary => ({
  id: row.id,
  folder: row.folder,
  from: row.from_name || row.from_address,
  fromAddress: row.from_address,
  subject: row.subject,
  preview: row.preview,
  receivedAt: formatRelative(row.sent_at),
  read: row.is_read,
  starred: row.is_starred,
  to: row.to_addresses
});

const mapMessageDetail = (row: MailMessageRow): MailMessageDetail => ({
  ...mapMessageSummary(row),
  body: row.body
});

const getPublicMailBaseUrl = (domain: string): string => {
  // If we are testing on a VPS with an IP address, we should use the configured WEBMAIL_URL
  const isIP = /^(?:http|https):\/\/\d+\.\d+\.\d+\.\d+/.test(env.WEBMAIL_URL);

  if (env.NODE_ENV !== "production" || isIP || !domain.includes(".")) {
    return env.WEBMAIL_URL;
  }

  // In production with a real domain, we assume the webmail is at https://domain/mail
  return `https://${domain}/mail`;
};

const seedMailboxMessages = (mailbox: MailAccountRow) => {
  const domain = mailbox.address.split("@")[1] ?? "";
  const toAddresses = JSON.stringify([mailbox.address]);

  return [
    {
      folder: "INBOX" as MailFolder,
      from_name: "Odisea Cloud",
      from_address: `onboarding@${domain}`,
      subject: `Bienvenido a ${mailbox.address}`,
      body: [
        `Hola ${mailbox.username},`,
        "",
        "Tu nuevo workspace de correo ya está listo.",
        "",
        "Accesos incluidos en esta primera entrega:",
        "- Login normal con tu correo y contraseña",
        "- SSO desde el panel ODIN",
        "- Bandeja de entrada, lectura y envío",
        "",
        "Este buzón ya vive en el backend del producto y queda preparado para la futura integración con infraestructura SMTP/IMAP."
      ].join("\n"),
      to_addresses: toAddresses
    },
    {
      folder: "INBOX" as MailFolder,
      from_name: "Security Monitor",
      from_address: `security@${domain}`,
      subject: "Configura recuperación y revisa tus accesos",
      body: [
        "Recomendaciones iniciales:",
        "",
        "- Verifica tu correo alterno de recuperación",
        "- Usa una contraseña fuerte para el buzón",
        "- Revisa sesiones activas si compartes dispositivos"
      ].join("\n"),
      to_addresses: toAddresses
    }
  ];
};

const appendMessageToMailbox = async ({
  mailboxId,
  folder,
  fromName,
  fromAddress,
  to,
  subject,
  body,
  isRead = false
}: {
  mailboxId: string;
  folder: MailFolder;
  fromName: string;
  fromAddress: string;
  to: string[];
  subject: string;
  body: string;
  isRead?: boolean;
}) => {
  const preview = createPreview(body);
  const usedIncrement = estimateMessageSizeMb(subject, body);

  await db.query(
    `INSERT INTO mail_messages (
      mailbox_id, folder, from_name, from_address, to_addresses, subject, preview, body, is_read
    ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9)`,
    [mailboxId, folder, fromName, fromAddress, JSON.stringify(to), subject, preview, body, isRead]
  );

  await db.query(
    `UPDATE mail_accounts
     SET used_mb = used_mb + $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [mailboxId, usedIncrement]
  );
};

export const listMailAccountsForUser = async (userId: string): Promise<MailAccountSummary[]> => {
  await ensureMailSchema();

  const result = await db.query<MailAccountRow>(
    `SELECT *
     FROM mail_accounts
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );

  return result.rows.map(mapAccount);
};

export const getMailAccountForUser = async (userId: string, accountId: string): Promise<MailAccountSummary | null> => {
  await ensureMailSchema();

  const result = await db.query<MailAccountRow>(
    `SELECT *
     FROM mail_accounts
     WHERE user_id = $1 AND id = $2
     LIMIT 1`,
    [userId, accountId]
  );

  return result.rowCount ? mapAccount(result.rows[0]) : null;
};

export const createMailAccountForUser = async (
  userId: string,
  input: {
    domain: string;
    username: string;
    password: string;
    quotaMb: number | null;
    alternateEmail: string;
  }
): Promise<MailAccountSummary> => {
  await ensureMailSchema();

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const normalizedDomain = input.domain.trim().toLowerCase();
    const normalizedUsername = input.username.trim().toLowerCase();
    const address = `${normalizedUsername}@${normalizedDomain}`;

    const domainResult = await client.query<{ id: string }>(
      `SELECT id
       FROM domains
       WHERE user_id = $1 AND domain_name = $2
       LIMIT 1`,
      [userId, normalizedDomain]
    );

    if (domainResult.rowCount === 0) {
      throw new Error("DOMAIN_NOT_FOUND");
    }

    const accountInsert = await client.query<MailAccountRow>(
      `INSERT INTO mail_accounts (
        user_id, domain_id, address, username, password_hash, quota_mb, alternate_email
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        userId,
        domainResult.rows[0].id,
        address,
        normalizedUsername,
        hashPassword(input.password),
        input.quotaMb,
        input.alternateEmail
      ]
    );

    const created = accountInsert.rows[0];
    for (const message of seedMailboxMessages(created)) {
      const preview = createPreview(message.body);
      const usedIncrement = estimateMessageSizeMb(message.subject, message.body);

      await client.query(
        `INSERT INTO mail_messages (
          mailbox_id, folder, from_name, from_address, to_addresses, subject, preview, body
        ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)`,
        [
          created.id,
          message.folder,
          message.from_name,
          message.from_address,
          message.to_addresses,
          message.subject,
          preview,
          message.body
        ]
      );

      await client.query(
        `UPDATE mail_accounts
         SET used_mb = used_mb + $2
         WHERE id = $1`,
        [created.id, usedIncrement]
      );
    }

    await client.query(
      `INSERT INTO activity_logs (user_id, action, resource, details)
       VALUES ($1, 'create_mail_account', 'mail_account', $2::jsonb)`,
      [userId, JSON.stringify({ mailboxId: created.id, address })]
    );

    await client.query("COMMIT");

    const refreshed = await db.query<MailAccountRow>(
      `SELECT *
       FROM mail_accounts
       WHERE id = $1
       LIMIT 1`,
      [created.id]
    );

    return mapAccount(refreshed.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const issueMailSsoLinkForUser = async (userId: string, mailboxId: string): Promise<MailSsoLink> => {
  await ensureMailSchema();

  const accountResult = await db.query<MailAccountRow>(
    `SELECT *
     FROM mail_accounts
     WHERE user_id = $1 AND id = $2
     LIMIT 1`,
    [userId, mailboxId]
  );

  if (accountResult.rowCount === 0) {
    throw new Error("MAILBOX_NOT_FOUND");
  }

  const account = accountResult.rows[0];
  const domain = account.address.split("@")[1] ?? "";
  const jti = randomUUID();

  const tokenPayload: MailSsoTokenPayload = {
    userId,
    mailboxId: account.id,
    address: account.address,
    domain,
    jti,
    tokenType: "mail_sso"
  };

  const token = signMailSsoToken(tokenPayload);

  await db.query(
    `INSERT INTO mail_sso_tokens (mailbox_id, user_id, token_jti, expires_at)
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP + INTERVAL '60 seconds')`,
    [account.id, userId, jti]
  );

  return {
    mailboxId: account.id,
    url: `${getPublicMailBaseUrl(domain)}/auth/sso?token=${encodeURIComponent(token)}`
  };
};

export const loginMailAccount = async (
  address: string,
  password: string
): Promise<{ token: string; me: MailIdentity }> => {
  await ensureMailSchema();

  const normalizedAddress = normalizeAddress(address);
  const result = await db.query<MailAccountRow>(
    `SELECT *
     FROM mail_accounts
     WHERE address = $1
     LIMIT 1`,
    [normalizedAddress]
  );

  if (result.rowCount === 0) {
    throw new Error("MAIL_AUTH_FAILED");
  }

  const account = result.rows[0];

  if (!verifyPassword(password, account.password_hash)) {
    throw new Error("MAIL_AUTH_FAILED");
  }

  const domain = normalizedAddress.split("@")[1] ?? "";
  const sessionToken = signMailSessionToken({
    userId: account.user_id,
    mailboxId: account.id,
    address: account.address,
    domain,
    tokenType: "mail_session"
  });

  return {
    token: sessionToken,
    me: {
      mailboxId: account.id,
      address: account.address,
      username: account.username,
      domain
    }
  };
};

export const exchangeMailSsoToken = async (
  payload: MailSsoTokenPayload
): Promise<{ token: string; me: MailIdentity }> => {
  await ensureMailSchema();

  const tokenResult = await db.query<{
    mailbox_id: string;
    user_id: string;
    expires_at: string;
    consumed_at: string | null;
  }>(
    `SELECT mailbox_id, user_id, expires_at::text, consumed_at::text
     FROM mail_sso_tokens
     WHERE token_jti = $1
     LIMIT 1`,
    [payload.jti]
  );

  if (tokenResult.rowCount === 0) {
    throw new Error("MAIL_SSO_INVALID");
  }

  const row = tokenResult.rows[0];
  const expired = new Date(row.expires_at).getTime() < Date.now();

  if (row.consumed_at || expired || row.mailbox_id !== payload.mailboxId || row.user_id !== payload.userId) {
    throw new Error("MAIL_SSO_INVALID");
  }

  await db.query(
    `UPDATE mail_sso_tokens
     SET consumed_at = CURRENT_TIMESTAMP
     WHERE token_jti = $1`,
    [payload.jti]
  );

  const accountResult = await db.query<MailAccountRow>(
    `SELECT *
     FROM mail_accounts
     WHERE id = $1
     LIMIT 1`,
    [payload.mailboxId]
  );

  if (accountResult.rowCount === 0) {
    throw new Error("MAILBOX_NOT_FOUND");
  }

  const account = accountResult.rows[0];
  const token = signMailSessionToken({
    userId: account.user_id,
    mailboxId: account.id,
    address: account.address,
    domain: payload.domain,
    tokenType: "mail_session"
  });

  return {
    token,
    me: {
      mailboxId: account.id,
      address: account.address,
      username: account.username,
      domain: payload.domain
    }
  };
};

export const getMailIdentity = async (session: MailSessionTokenPayload): Promise<MailIdentity> => {
  await ensureMailSchema();

  const result = await db.query<MailAccountRow>(
    `SELECT *
     FROM mail_accounts
     WHERE id = $1 AND user_id = $2
     LIMIT 1`,
    [session.mailboxId, session.userId]
  );

  if (result.rowCount === 0) {
    throw new Error("MAILBOX_NOT_FOUND");
  }

  const account = result.rows[0];

  return {
    mailboxId: account.id,
    address: account.address,
    username: account.username,
    domain: account.address.split("@")[1] ?? ""
  };
};

export const listMailFolders = async (session: MailSessionTokenPayload): Promise<MailFolderSummary[]> => {
  await ensureMailSchema();

  const result = await db.query<{ folder: string; count: string }>(
    `SELECT folder, COUNT(*)::text AS count
     FROM mail_messages
     WHERE mailbox_id = $1
     GROUP BY folder`,
    [session.mailboxId]
  );

  const counts = new Map(result.rows.map((row) => [row.folder, Number(row.count)]));

  return [
    { folder: "INBOX", label: "Inbox", count: counts.get("INBOX") ?? 0 },
    { folder: "SENT", label: "Sent", count: counts.get("SENT") ?? 0 },
    { folder: "TRASH", label: "Trash", count: counts.get("TRASH") ?? 0 },
    {
      folder: "STARRED",
      label: "Starred",
      count: await db
        .query<{ count: string }>(
          `SELECT COUNT(*)::text AS count
           FROM mail_messages
           WHERE mailbox_id = $1 AND is_starred = true`,
          [session.mailboxId]
        )
        .then((starred) => Number(starred.rows[0]?.count ?? "0"))
    }
  ];
};

export const listMailMessages = async (
  session: MailSessionTokenPayload,
  folder: MailFolder = "INBOX"
): Promise<MailMessageSummary[]> => {
  await ensureMailSchema();

  const result =
    folder === "STARRED"
      ? await db.query<MailMessageRow>(
          `SELECT id, mailbox_id, folder, from_name, from_address, to_addresses, subject, preview, body,
                  is_read, is_starred, sent_at::text
           FROM mail_messages
           WHERE mailbox_id = $1 AND is_starred = true
           ORDER BY sent_at DESC`,
          [session.mailboxId]
        )
      : await db.query<MailMessageRow>(
          `SELECT id, mailbox_id, folder, from_name, from_address, to_addresses, subject, preview, body,
                  is_read, is_starred, sent_at::text
           FROM mail_messages
           WHERE mailbox_id = $1 AND folder = $2
           ORDER BY sent_at DESC`,
          [session.mailboxId, folder]
        );

  return result.rows.map(mapMessageSummary);
};

export const getMailMessage = async (
  session: MailSessionTokenPayload,
  messageId: string
): Promise<MailMessageDetail> => {
  await ensureMailSchema();

  const result = await db.query<MailMessageRow>(
    `SELECT id, mailbox_id, folder, from_name, from_address, to_addresses, subject, preview, body,
            is_read, is_starred, sent_at::text
     FROM mail_messages
     WHERE mailbox_id = $1 AND id = $2
     LIMIT 1`,
    [session.mailboxId, messageId]
  );

  if (result.rowCount === 0) {
    throw new Error("MAIL_MESSAGE_NOT_FOUND");
  }

  return mapMessageDetail(result.rows[0]);
};

export const updateMailMessageRead = async (
  session: MailSessionTokenPayload,
  messageId: string,
  read: boolean
): Promise<void> => {
  await ensureMailSchema();

  await db.query(
    `UPDATE mail_messages
     SET is_read = $3
     WHERE mailbox_id = $1 AND id = $2`,
    [session.mailboxId, messageId, read]
  );
};

export const updateMailMessageStar = async (
  session: MailSessionTokenPayload,
  messageId: string,
  starred: boolean
): Promise<void> => {
  await ensureMailSchema();

  await db.query(
    `UPDATE mail_messages
     SET is_starred = $3
     WHERE mailbox_id = $1 AND id = $2`,
    [session.mailboxId, messageId, starred]
  );
};

export const moveMailMessage = async (
  session: MailSessionTokenPayload,
  messageId: string,
  folder: Exclude<MailFolder, "STARRED">
): Promise<void> => {
  await ensureMailSchema();

  await db.query(
    `UPDATE mail_messages
     SET folder = $3
     WHERE mailbox_id = $1 AND id = $2`,
    [session.mailboxId, messageId, folder]
  );
};

export const sendMailMessage = async (
  session: MailSessionTokenPayload,
  input: {
    to: string[];
    subject: string;
    body: string;
  }
): Promise<void> => {
  await ensureMailSchema();

  const me = await getMailIdentity(session);

  await appendMessageToMailbox({
    mailboxId: session.mailboxId,
    folder: "SENT",
    fromName: me.username,
    fromAddress: me.address,
    to: input.to,
    subject: input.subject,
    body: input.body,
    isRead: true
  });

  const localRecipients = await db.query<MailAccountRow>(
    `SELECT *
     FROM mail_accounts
     WHERE address = ANY($1::text[])`,
    [input.to.map(normalizeAddress)]
  );

  for (const recipient of localRecipients.rows) {
    await appendMessageToMailbox({
      mailboxId: recipient.id,
      folder: "INBOX",
      fromName: me.username,
      fromAddress: me.address,
      to: [recipient.address],
      subject: input.subject,
      body: input.body
    });
  }
};
