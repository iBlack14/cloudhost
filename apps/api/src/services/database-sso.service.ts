import { randomUUID } from "node:crypto";

import { env } from "../config/env.js";
import { db } from "../config/db.js";
import { decryptSecret } from "../utils/secret.js";
import { signDatabaseSsoToken, verifyAuthToken } from "../utils/jwt.js";

type DatabaseOwnerType = "custom" | "wordpress";

interface DatabaseIdentity {
  dbName: string;
  dbUser: string;
  ownerType: DatabaseOwnerType;
  ownerUserId: string;
  passwordCiphertext: string | null;
}

interface DatabaseSsoContext {
  dbName: string;
  dbUser: string;
  password: string;
}

const ensureDatabaseSsoSchema = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS database_sso_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      token_jti TEXT NOT NULL UNIQUE,
      db_name TEXT NOT NULL,
      db_user TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_database_sso_tokens_expires_at
      ON database_sso_tokens(expires_at);

    ALTER TABLE user_databases
      ADD COLUMN IF NOT EXISTS db_password_ciphertext TEXT;

    ALTER TABLE wordpress_sites
      ADD COLUMN IF NOT EXISTS db_password_ciphertext TEXT;
  `);
};

const getDatabaseIdentity = async (dbName: string, userId?: string): Promise<DatabaseIdentity | null> => {
  const values = userId ? [dbName, userId, dbName, userId] : [dbName, dbName];
  const whereCustom = userId ? "WHERE db_name = $1 AND user_id = $2" : "WHERE db_name = $1";
  const whereWordPress = userId ? "WHERE db_name = $3 AND user_id = $4" : "WHERE db_name = $2";

  const result = await db.query<DatabaseIdentity>(
    `
      SELECT
        db_name AS "dbName",
        db_user AS "dbUser",
        'custom'::text AS "ownerType",
        user_id AS "ownerUserId",
        db_password_ciphertext AS "passwordCiphertext"
      FROM user_databases
      ${whereCustom}

      UNION ALL

      SELECT
        db_name AS "dbName",
        db_user AS "dbUser",
        'wordpress'::text AS "ownerType",
        user_id AS "ownerUserId",
        db_password_ciphertext AS "passwordCiphertext"
      FROM wordpress_sites
      ${whereWordPress}

      LIMIT 1
    `,
    values
  );

  return result.rows[0] ?? null;
};

export const issueDatabaseSsoLink = async (input: {
  dbName: string;
  publicBaseUrl: string;
  userId?: string;
}): Promise<{ url: string; dbName: string }> => {
  await ensureDatabaseSsoSchema();

  const record = await getDatabaseIdentity(input.dbName, input.userId);
  if (!record) {
    throw new Error("Base de datos no encontrada");
  }

  if (!record.passwordCiphertext) {
    throw new Error("Esta base de datos todavia no tiene acceso directo por token. Recreala o actualiza su secreto primero.");
  }

  const jti = randomUUID();
  const token = signDatabaseSsoToken({
    userId: record.ownerUserId,
    dbName: record.dbName,
    dbUser: record.dbUser,
    ownerUserId: record.ownerUserId,
    jti,
    tokenType: "database_sso"
  });

  await db.query(
    `
      INSERT INTO database_sso_tokens (token_jti, db_name, db_user, expires_at)
      VALUES ($1, $2, $3, NOW() + ($4)::interval)
    `,
    [jti, record.dbName, record.dbUser, env.DATABASE_SSO_EXPIRES_IN]
  );

  return {
    dbName: record.dbName,
    url: `${input.publicBaseUrl.replace(/\/$/, "")}/database-auth/sso?token=${encodeURIComponent(token)}`
  };
};

export const consumeDatabaseSsoToken = async (token: string): Promise<DatabaseSsoContext> => {
  await ensureDatabaseSsoSchema();

  const payload = verifyAuthToken(token);
  if (payload.tokenType !== "database_sso") {
    throw new Error("Tipo de token invalido");
  }

  const tokenResult = await db.query<{
    token_jti: string;
    used_at: string | null;
    expires_at: string;
    db_name: string;
  }>(
    `
      SELECT token_jti, used_at, expires_at, db_name
      FROM database_sso_tokens
      WHERE token_jti = $1
      LIMIT 1
    `,
    [payload.jti]
  );

  const tokenRow = tokenResult.rows[0];
  if (!tokenRow) {
    throw new Error("Token SSO no registrado");
  }

  if (tokenRow.used_at) {
    throw new Error("Token SSO ya fue utilizado");
  }

  if (new Date(tokenRow.expires_at).getTime() <= Date.now()) {
    throw new Error("Token SSO expirado");
  }

  const record = await getDatabaseIdentity(payload.dbName, payload.ownerUserId);
  if (!record || !record.passwordCiphertext) {
    throw new Error("No se encontro un secreto activo para esta base de datos");
  }

  await db.query(
    `
      UPDATE database_sso_tokens
      SET used_at = NOW()
      WHERE token_jti = $1 AND used_at IS NULL
    `,
    [payload.jti]
  );

  return {
    dbName: record.dbName,
    dbUser: record.dbUser,
    password: decryptSecret(record.passwordCiphertext)
  };
};
