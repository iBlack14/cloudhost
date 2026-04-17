import { 
  whmCreateAccountSchema, 
  type WhmCreateAccountInput, 
  type Plan, 
  type WhmAccountRow as WhmAccount, 
  type WhmImpersonationResult as WhmImpersonation 
} from "@odisea/types";

export { 
  whmCreateAccountSchema, 
  type WhmCreateAccountInput, 
  type Plan, 
  WhmAccount, 
  WhmImpersonation 
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";
const WHM_ACCESS_TOKEN_KEY = "whm-access-token";

interface AuthLoginResponse {
  token: string;
  role: "admin" | "reseller" | "user";
  redirectTo: string;
}

const getWhmAccessToken = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.sessionStorage.getItem(WHM_ACCESS_TOKEN_KEY);
};

const withWhmAuth = (headers: Record<string, string> = {}): Record<string, string> => {
  const token = getWhmAccessToken();

  return token
    ? {
        ...headers,
        Authorization: `Bearer ${token}`
      }
    : headers;
};

const clearWhmAccessToken = (): void => {
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(WHM_ACCESS_TOKEN_KEY);
  }
};

const parsePayload = async <T>(response: Response): Promise<T> => {
  const payload = await response.json();

  if (!response.ok || !payload.success) {
    if ((response.status === 401 || response.status === 403) && typeof window !== "undefined") {
      clearWhmAccessToken();
      if (!window.location.pathname.startsWith("/auth/login")) {
        window.location.href = "/auth/login";
      }
    }

    throw new Error(payload?.error?.message ?? "Error en la petición");
  }

  return payload.data as T;
};

export const hasWhmSession = (): boolean => {
  return Boolean(getWhmAccessToken());
};

export const logoutWhmSession = (): void => {
  clearWhmAccessToken();
};

export const loginWhm = async (username: string, password: string): Promise<AuthLoginResponse> => {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  const data = await parsePayload<AuthLoginResponse>(response);

  if (data.role !== "admin" && data.role !== "reseller") {
    throw new Error("No tienes permisos para acceder a WHM");
  }

  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(WHM_ACCESS_TOKEN_KEY, data.token);
  }

  return data;
};

export const fetchPlans = async (): Promise<Plan[]> => {
  const response = await fetch(`${API_BASE}/whm/plans`, {
    cache: "no-store",
    headers: withWhmAuth()
  });
  return parsePayload<Plan[]>(response);
};

export interface DashboardStats {
  server: {
    cpu: number;
    ram: number;
    disk: number;
    loadAverage1m?: number;
    cores?: number;
    uptimeSeconds?: number;
  };
  accounts: { active: number; suspended: number; terminated: number };
}

export const fetchDashboard = async (): Promise<DashboardStats> => {
  const response = await fetch(`${API_BASE}/whm/dashboard`, {
    cache: "no-store",
    headers: withWhmAuth()
  });
  return parsePayload<DashboardStats>(response);
};

export const fetchAccounts = async (): Promise<WhmAccount[]> => {
  const response = await fetch(`${API_BASE}/whm/accounts`, {
    cache: "no-store",
    headers: withWhmAuth()
  });
  return parsePayload<WhmAccount[]>(response);
};

export const createAccount = async (input: WhmCreateAccountInput): Promise<{ userId: string; accountId: string }> => {
  const response = await fetch(`${API_BASE}/whm/accounts`, {
    method: "POST",
    headers: withWhmAuth({ "Content-Type": "application/json" }),
    body: JSON.stringify(input)
  });

  return parsePayload<{ userId: string; accountId: string }>(response);
};

export const suspendAccount = async (accountId: string): Promise<void> => {
  const response = await fetch(`${API_BASE}/whm/accounts/${accountId}/suspend`, {
    method: "POST",
    headers: withWhmAuth()
  });
  await parsePayload(response);
};

export const resumeAccount = async (accountId: string): Promise<void> => {
  const response = await fetch(`${API_BASE}/whm/accounts/${accountId}/resume`, {
    method: "POST",
    headers: withWhmAuth()
  });
  await parsePayload(response);
};

export const impersonateAccount = async (accountId: string): Promise<WhmImpersonation> => {
  const response = await fetch(`${API_BASE}/whm/accounts/${accountId}/impersonate`, {
    method: "POST",
    headers: withWhmAuth()
  });
  return parsePayload<WhmImpersonation>(response);
};

export const fetchWhmDomains = async (): Promise<any[]> => {
  const response = await fetch(`${API_BASE}/whm/domains`, {
    cache: "no-store",
    headers: withWhmAuth()
  });
  return parsePayload<any[]>(response);
};

export const fetchDnsZone = async (domainId: string): Promise<any> => {
  const response = await fetch(`${API_BASE}/whm/domains/${domainId}/dns`, {
    cache: "no-store",
    headers: withWhmAuth()
  });
  return parsePayload<any>(response);
};

export const addDnsRecord = async (zoneId: string, input: any): Promise<any> => {
  const response = await fetch(`${API_BASE}/whm/dns/zones/${zoneId}/records`, {
    method: "POST",
    headers: withWhmAuth({ "Content-Type": "application/json" }),
    body: JSON.stringify(input)
  });
  return parsePayload<any>(response);
};

export const deleteDnsRecord = async (recordId: string): Promise<void> => {
  const response = await fetch(`${API_BASE}/whm/dns/records/${recordId}`, {
    method: "DELETE",
    headers: withWhmAuth()
  });
  await parsePayload(response);
};
