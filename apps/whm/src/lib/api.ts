const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

export interface Plan {
  id: string;
  name: string;
  disk_quota_mb: number;
  bandwidth_mb: number;
}

export interface WhmAccount {
  account_id: string;
  user_id: string;
  username: string;
  email: string;
  domain: string;
  plan_name: string | null;
  status: "active" | "suspended" | "terminated";
  disk_used_mb: number;
  created_at: string;
}

export interface WhmImpersonation {
  accountId: string;
  impersonateToken: string;
  odinPanelUrl: string;
}

const parsePayload = async <T>(response: Response): Promise<T> => {
  const payload = await response.json();

  if (!response.ok || !payload.success) {
    throw new Error(payload?.error?.message ?? "Error en la petición");
  }

  return payload.data as T;
};

export const fetchPlans = async (): Promise<Plan[]> => {
  const response = await fetch(`${API_BASE}/whm/plans`, { cache: "no-store" });
  return parsePayload<Plan[]>(response);
};

export const fetchAccounts = async (): Promise<WhmAccount[]> => {
  const response = await fetch(`${API_BASE}/whm/accounts`, { cache: "no-store" });
  return parsePayload<WhmAccount[]>(response);
};

export const createAccount = async (input: unknown): Promise<{ userId: string; accountId: string }> => {
  const response = await fetch(`${API_BASE}/whm/accounts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });

  return parsePayload<{ userId: string; accountId: string }>(response);
};

export const suspendAccount = async (accountId: string): Promise<void> => {
  const response = await fetch(`${API_BASE}/whm/accounts/${accountId}/suspend`, { method: "POST" });
  await parsePayload(response);
};

export const resumeAccount = async (accountId: string): Promise<void> => {
  const response = await fetch(`${API_BASE}/whm/accounts/${accountId}/resume`, { method: "POST" });
  await parsePayload(response);
};

export const impersonateAccount = async (accountId: string): Promise<WhmImpersonation> => {
  const response = await fetch(`${API_BASE}/whm/accounts/${accountId}/impersonate`, { method: "POST" });
  return parsePayload<WhmImpersonation>(response);
};
