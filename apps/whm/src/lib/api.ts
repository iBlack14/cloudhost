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

const API_BASE = (() => {
  if (typeof window === "undefined") {
    const envUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";
    return envUrl.startsWith("//") ? "http:" + envUrl : envUrl;
  }
  const host = window.location.hostname;
  const proto = window.location.protocol;
  if (host === "localhost") return "http://localhost:3001/api/v1";
  if (host.match(/^\d+\.\d+\.\d+\.\d+$/)) {
    let port = "3001";
    try {
      const u = process.env.NEXT_PUBLIC_API_URL ? new URL(process.env.NEXT_PUBLIC_API_URL) : null;
      if (u && u.port) port = u.port;
    } catch {}
    return `${proto}//${host}:${port}/api/v1`;
  }
  const parts = host.split(".");
  return `${proto}//api.${parts.length >= 2 ? parts.slice(-2).join(".") : host}/api/v1`;
})();
const WHM_ACCESS_TOKEN_KEY = "whm-access-token";
const WHM_ROLE_KEY = "whm-role";

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

export const getWhmRole = (): "admin" | "reseller" | "user" | null => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.sessionStorage.getItem(WHM_ROLE_KEY) as any;
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
    window.sessionStorage.removeItem(WHM_ROLE_KEY);
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
    window.sessionStorage.setItem(WHM_ROLE_KEY, data.role);
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

export const createPlan = async (input: Partial<Plan>): Promise<Plan> => {
  const response = await fetch(`${API_BASE}/whm/plans`, {
    method: "POST",
    headers: withWhmAuth({ "Content-Type": "application/json" }),
    body: JSON.stringify(input)
  });
  return parsePayload<Plan>(response);
};

export const updatePlan = async (id: string, input: Partial<Plan>): Promise<Plan> => {
  const response = await fetch(`${API_BASE}/whm/plans/${id}`, {
    method: "PATCH",
    headers: withWhmAuth({ "Content-Type": "application/json" }),
    body: JSON.stringify(input)
  });
  return parsePayload<Plan>(response);
};

export const deletePlan = async (id: string): Promise<void> => {
  const response = await fetch(`${API_BASE}/whm/plans/${id}`, {
    method: "DELETE",
    headers: withWhmAuth()
  });
  await parsePayload(response);
};

export interface DashboardStats {
  server: {
    cpu: number;
    ram: number;
    disk: number;
    loadAverage1m?: number;
    loadAvgs?: number[];
    cores?: number;
    uptimeSeconds?: number;
    system?: {
      os: string;
      platform: string;
      cpuModel: string;
      totalRamGB: number;
      cores: number;
    };
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

export const resetAccountPassword = async (accountId: string, password?: string): Promise<{ message: string; password?: string }> => {
  const response = await fetch(`${API_BASE}/whm/accounts/${accountId}/reset-password`, {
    method: "POST",
    headers: withWhmAuth({ "Content-Type": "application/json" }),
    body: JSON.stringify({ password })
  });
  return parsePayload<{ message: string; password?: string }>(response);
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
export const deleteAccount = async (accountId: string): Promise<void> => {
  const response = await fetch(`${API_BASE}/whm/accounts/${accountId}`, {
    method: "DELETE",
    headers: withWhmAuth()
  });
  await parsePayload(response);
};

export const syncDiskUsage = async (): Promise<void> => {
  const response = await fetch(`${API_BASE}/whm/accounts/sync-disk`, {
    method: "POST",
    headers: withWhmAuth()
  });
  await parsePayload(response);
};

export const changeAccountPlan = async (accountId: string, planId: string, durationMonths?: number): Promise<void> => {
  const response = await fetch(`${API_BASE}/whm/accounts/${accountId}/plan`, {
    method: "PATCH",
    headers: withWhmAuth({ "Content-Type": "application/json" }),
    body: JSON.stringify({ planId, durationMonths })
  });
  await parsePayload(response);
};

export const fetchSettings = async (): Promise<Record<string, string>> => {
  const response = await fetch(`${API_BASE}/whm/settings`, {
    cache: "no-store",
    headers: withWhmAuth()
  });
  return parsePayload<Record<string, string>>(response);
};

export const saveSettings = async (settings: Record<string, string>): Promise<void> => {
  const response = await fetch(`${API_BASE}/whm/settings`, {
    method: "POST",
    headers: withWhmAuth({ "Content-Type": "application/json" }),
    body: JSON.stringify(settings)
  });
  await parsePayload(response);
};
