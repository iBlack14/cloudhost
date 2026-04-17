import { 
  type Plan, 
  type WhmAccountRow as WhmAccount, 
  type WhmImpersonationResult as WhmImpersonation,
  type DomainRecord,
  type WordPressSite
} from "@odisea/types";

export { 
  type Plan, 
  WhmAccount, 
  WhmImpersonation,
  type DomainRecord,
  type WordPressSite
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";
const ODIN_ACCESS_TOKEN_KEY = "odin-access-token";

const parsePayload = async <T>(response: Response): Promise<T> => {
  const payload = await response.json();

  if (!response.ok || !payload.success) {
    throw new Error(payload?.error?.message ?? "Error en la petición");
  }

  return payload.data as T;
};

const getAccessToken = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.sessionStorage.getItem(ODIN_ACCESS_TOKEN_KEY);
};

const withOdinAuth = (headers: Record<string, string> = {}): Record<string, string> => {
  const token = getAccessToken();

  return token
    ? {
        ...headers,
        Authorization: `Bearer ${token}`
      }
    : headers;
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

export const fetchWpSites = async (): Promise<WordPressSite[]> => {
  const response = await fetch(`${API_BASE}/odin-panel/wordpress`, {
    cache: "no-store",
    headers: withOdinAuth()
  });
  return parsePayload<WordPressSite[]>(response);
};

export const fetchWpSiteById = async (id: string): Promise<WordPressSite> => {
  const response = await fetch(`${API_BASE}/odin-panel/wordpress/${id}`, {
    cache: "no-store",
    headers: withOdinAuth()
  });
  return parsePayload<WordPressSite>(response);
};

export const deleteWordPress = async (id: string): Promise<{ success: boolean; message?: string }> => {
  const response = await fetch(`${API_BASE}/odin-panel/wordpress/${id}`, {
    method: "DELETE",
    headers: withOdinAuth()
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "Falló la eliminación");
  return data;
};

export const installWordPress = async (input: {
  domain: string;
  directory?: string;
  siteTitle: string;
  adminUser: string;
  adminPass: string;
}): Promise<{
  id: string;
  domain: string;
  status: string;
  adminUrl: string;
}> => {
  const response = await fetch(`${API_BASE}/odin-panel/wordpress/install`, {
    method: "POST",
    headers: withOdinAuth({ "Content-Type": "application/json" }),
    body: JSON.stringify(input)
  });
  return parsePayload(response);
};

export const fetchDomains = async (): Promise<DomainRecord[]> => {
  const response = await fetch(`${API_BASE}/odin-panel/domains`, {
    cache: "no-store",
    headers: withOdinAuth()
  });
  return parsePayload<DomainRecord[]>(response);
};

export const addDomain = async (domainName: string): Promise<DomainRecord> => {
  const response = await fetch(`${API_BASE}/odin-panel/domains`, {
    method: "POST",
    headers: withOdinAuth({ "Content-Type": "application/json" }),
    body: JSON.stringify({ domainName })
  });
  return parsePayload<DomainRecord>(response);
};

export const verifyDomain = async (id: string): Promise<DomainRecord> => {
  const response = await fetch(`${API_BASE}/odin-panel/domains/${id}/verify`, {
    method: "POST",
    headers: withOdinAuth()
  });
  return parsePayload<DomainRecord>(response);
};

export const deleteDomain = async (id: string): Promise<void> => {
  const response = await fetch(`${API_BASE}/odin-panel/domains/${id}`, {
    method: "DELETE",
    headers: withOdinAuth()
  });
  await parsePayload(response);
};

export const exchangeImpersonationToken = async (token: string): Promise<{ token: string; role: string }> => {
  const response = await fetch(`${API_BASE}/auth/impersonate/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token })
  });

  return parsePayload<{ token: string; role: string }>(response);
};
