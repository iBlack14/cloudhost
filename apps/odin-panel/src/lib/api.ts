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
  
  const textBody = await response.text();
  try {
    const data = JSON.parse(textBody);
    if (!response.ok) throw new Error(data.error?.message || "Falló la eliminación");
    return data;
  } catch (err: any) {
    if (err.name === "SyntaxError") {
      throw new Error(`Servidor devolvió HTML/Texto inesperado (HTTP ${response.status}): ${textBody.substring(0, 100)}...`);
    }
    throw err;
  }
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

export const fetchWpSsoUrl = async (id: string): Promise<string> => {
  const response = await fetch(`${API_BASE}/odin-panel/wordpress/${id}/sso`, {
    method: "POST",
    headers: withOdinAuth()
  });
  const data = await parsePayload<{ url: string }>(response);
  return data.url;
};

// --- DATABASE API ---

export interface UserDatabase {
  name: string;
  user: string;
  type: "wordpress" | "custom";
}

export interface OdinDashboardStats {
  account: {
    plan: string;
    diskUsed: number;
    diskLimit: number;
    diskPercent: number;
  };
  services: {
    domains: number;
    emails: number;
    databases: number;
    apps: number;
  };
  server: {
    cpu: number;
    ram: number;
    disk: number;
    loadAverage1m: number;
    loadAvgs: number[];
    cores: number;
    uptimeSeconds: number;
    ramDetails: {
      total: number;
      free: number;
    };
  };
}

export const fetchOdinDashboard = async (): Promise<OdinDashboardStats> => {
  const response = await fetch(`${API_BASE}/odin-panel/dashboard`, {
    cache: "no-store",
    headers: withOdinAuth()
  });
  return parsePayload<OdinDashboardStats>(response);
};

export const fetchDatabases = async (): Promise<UserDatabase[]> => {
  const response = await fetch(`${API_BASE}/odin-panel/databases`, {
    headers: withOdinAuth(),
    cache: "no-store"
  });
  return parsePayload<UserDatabase[]>(response);
};

export const createDatabase = async (name: string, password: string): Promise<void> => {
  const response = await fetch(`${API_BASE}/odin-panel/databases`, {
    method: "POST",
    headers: withOdinAuth({ "Content-Type": "application/json" }),
    body: JSON.stringify({ name, password })
  });
  await parsePayload(response);
};

// --- FILE MANAGER API ---

export interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  lastModified: string;
  mimeType?: string;
  permissions: string;
}

export const fetchFiles = async (path: string = "/"): Promise<FileItem[]> => {
  const response = await fetch(`${API_BASE}/odin-panel/files?path=${encodeURIComponent(path)}`, {
    headers: withOdinAuth(),
    cache: "no-store"
  });
  return parsePayload<FileItem[]>(response);
};

export const createFolder = async (path: string): Promise<void> => {
  const response = await fetch(`${API_BASE}/odin-panel/files/folder`, {
    method: "POST",
    headers: withOdinAuth({ "Content-Type": "application/json" }),
    body: JSON.stringify({ path })
  });
  await parsePayload(response);
};

export const deleteFile = async (path: string): Promise<void> => {
  const response = await fetch(`${API_BASE}/odin-panel/files?path=${encodeURIComponent(path)}`, {
    method: "DELETE",
    headers: withOdinAuth()
  });
  await parsePayload(response);
};

export const uploadFiles = async (path: string, files: FileList): Promise<void> => {
  const formData = new FormData();
  formData.append("path", path);
  for (let i = 0; i < files.length; i++) {
    formData.append("files", files[i]);
  }

  const response = await fetch(`${API_BASE}/odin-panel/files/upload`, {
    method: "POST",
    headers: withOdinAuth(), // Do not set Content-Type, browser will set it with boundary
    body: formData
  });
  
  await parsePayload(response);
};

export const readFileContent = async (filePath: string): Promise<string> => {
  const response = await fetch(`${API_BASE}/odin-panel/files/content?path=${encodeURIComponent(filePath)}`, {
    headers: withOdinAuth(),
    cache: "no-store"
  });
  return parsePayload<string>(response);
};

export const writeFileContent = async (filePath: string, content: string): Promise<void> => {
  const response = await fetch(`${API_BASE}/odin-panel/files/content`, {
    method: "PUT",
    headers: withOdinAuth({ "Content-Type": "application/json" }),
    body: JSON.stringify({ path: filePath, content })
  });
  await parsePayload(response);
};

export const renameFile = async (oldPath: string, newPath: string): Promise<void> => {
  const response = await fetch(`${API_BASE}/odin-panel/files/rename`, {
    method: "PUT",
    headers: withOdinAuth({ "Content-Type": "application/json" }),
    body: JSON.stringify({ oldPath, newPath })
  });
  await parsePayload(response);
};

export const extractArchive = async (zipPath: string, destPath: string): Promise<void> => {
  const response = await fetch(`${API_BASE}/odin-panel/files/extract`, {
    method: "POST",
    headers: withOdinAuth({ "Content-Type": "application/json" }),
    body: JSON.stringify({ zipPath, destPath })
  });
  await parsePayload(response);
};
