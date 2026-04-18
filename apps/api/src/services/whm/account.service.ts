import { env } from "../../config/env.js";
import { db } from "../../config/db.js";
import {
  type WhmCreateAccountInput,
  type CreateWhmAccountResult,
  type WhmImpersonationResult,
  type Plan as WhmPlan,
  type WhmAccountRow
} from "../../../packages/types/src/index.js";
import { hashPassword } from "../../utils/hash-password.js";
import { signImpersonationToken } from "../../utils/jwt.js";

export const createWhmAccount = async (
  input: WhmCreateAccountInput
): Promise<CreateWhmAccountResult> => {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    if (input.planId) {
      const planResult = await client.query("SELECT id FROM plans WHERE id = $1", [input.planId]);
      if (planResult.rowCount === 0) {
        throw new Error("PLAN_NOT_FOUND");
      }
    }

    const userInsert = await client.query<{ id: string }>(
      `INSERT INTO users (username, email, password_hash, role, status, plan_id)
       VALUES ($1, $2, $3, 'user', 'active', $4)
       RETURNING id`,
      [input.username, input.email, hashPassword(input.password), input.planId ?? null]
    );

    const userId = userInsert.rows[0].id;

    // Register primary domain as a Domain Asset automatically
    await client.query(
      `INSERT INTO domains (user_id, domain_name, status, dns_provider)
       VALUES ($1, $2, 'active', 'odisea_managed')
       ON CONFLICT (domain_name) DO NOTHING`,
      [userId, input.domain.toLowerCase().trim()]
    );

    const accountInsert = await client.query<{ id: string }>(
      `INSERT INTO hosting_accounts (
        user_id, domain, document_root, php_version, shell_access, nodejs_enabled, docker_enabled
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id`,
      [
        userId,
        input.domain,
        `/home/${input.username}/public_html`,
        input.settings.phpVersion,
        input.settings.shellAccess,
        input.settings.nodejsEnabled,
        input.settings.dockerEnabled
      ]
    );

    const accountId = accountInsert.rows[0].id;

    await client.query(
      `INSERT INTO account_nameservers (account_id, inherit_root, ns1, ns2, ns3, ns4)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        accountId,
        input.nameservers.inheritRoot,
        input.nameservers.ns1 ?? null,
        input.nameservers.ns2 ?? null,
        input.nameservers.ns3 ?? null,
        input.nameservers.ns4 ?? null
      ]
    );

    await client.query(
      `INSERT INTO activity_logs (user_id, action, resource, details)
       VALUES ($1, 'create_account', 'hosting_account', $2::jsonb)`,
      [userId, JSON.stringify({ domain: input.domain, createdBy: "whm" })]
    );

    await client.query("COMMIT");

    return { userId, accountId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const listWhmPlans = async (): Promise<WhmPlan[]> => {
  const result = await db.query<WhmPlan>(
    "SELECT id, name, disk_quota_mb, bandwidth_mb FROM plans ORDER BY created_at DESC"
  );
  return result.rows;
};

export const listWhmAccounts = async (): Promise<WhmAccountRow[]> => {
  const result = await db.query<WhmAccountRow>(
    `SELECT
      ha.id AS account_id,
      u.id AS user_id,
      u.username,
      u.email,
      ha.domain,
      p.name AS plan_name,
      u.status,
      ha.disk_used_mb,
      ha.created_at::text
    FROM hosting_accounts ha
    INNER JOIN users u ON u.id = ha.user_id
    LEFT JOIN plans p ON p.id = u.plan_id
    ORDER BY ha.created_at DESC`
  );

  return result.rows;
};

const updateAccountStatus = async (
  accountId: string,
  status: "suspended" | "active",
  action: "suspend_account" | "resume_account"
): Promise<void> => {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const accountResult = await client.query<{ user_id: string; domain: string }>(
      "SELECT user_id, domain FROM hosting_accounts WHERE id = $1",
      [accountId]
    );

    if (accountResult.rowCount === 0) {
      throw new Error("ACCOUNT_NOT_FOUND");
    }

    const { user_id: userId, domain } = accountResult.rows[0];

    await client.query("UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2", [status, userId]);

    await client.query(
      `INSERT INTO activity_logs (user_id, action, resource, details)
       VALUES ($1, $2, 'hosting_account', $3::jsonb)`,
      [userId, action, JSON.stringify({ accountId, domain, status })]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const suspendWhmAccount = async (accountId: string): Promise<void> => {
  await updateAccountStatus(accountId, "suspended", "suspend_account");
};

export const resumeWhmAccount = async (accountId: string): Promise<void> => {
  await updateAccountStatus(accountId, "active", "resume_account");
};

export const impersonateWhmAccount = async (
  accountId: string,
  impersonatedBy = "whm-admin"
): Promise<WhmImpersonationResult> => {
  const accountResult = await db.query<{
    account_id: string;
    user_id: string;
    username: string;
    role: "user";
  }>(
    `SELECT ha.id AS account_id, u.id AS user_id, u.username, u.role
     FROM hosting_accounts ha
     INNER JOIN users u ON u.id = ha.user_id
     WHERE ha.id = $1 AND u.role = 'user'`,
    [accountId]
  );

  if (accountResult.rowCount === 0) {
    throw new Error("ACCOUNT_NOT_FOUND");
  }

  const row = accountResult.rows[0];

  const impersonateToken = signImpersonationToken({
    userId: row.user_id,
    username: row.username,
    role: "user",
    accountId: row.account_id,
    impersonatedBy,
    tokenType: "impersonation"
  });

  const odinPanelUrl = `${env.ODIN_PANEL_URL}/auth/impersonate#token=${encodeURIComponent(impersonateToken)}`;

  await db.query(
    `INSERT INTO activity_logs (user_id, action, resource, details)
     VALUES ($1, 'impersonate_account', 'hosting_account', $2::jsonb)`,
    [row.user_id, JSON.stringify({ accountId: row.account_id, impersonatedBy })]
  );

  return {
    accountId: row.account_id,
    impersonateToken,
    odinPanelUrl
  };
};
