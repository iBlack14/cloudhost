ALTER TABLE IF EXISTS user_databases
  ADD COLUMN IF NOT EXISTS db_password_ciphertext TEXT;

ALTER TABLE IF EXISTS wordpress_sites
  ADD COLUMN IF NOT EXISTS db_password_ciphertext TEXT;

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
