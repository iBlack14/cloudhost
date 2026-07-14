import { 
  type Plan, 
  type WhmAccountRow as WhmAccount, 
  type WhmImpersonationResult as WhmImpersonation,
  type MailAccountSummary,
  type MailSsoLink,
  type DatabaseSsoLink,
  type DomainRecord,
  type WordPressSite
} from "@odisea/types";

export { 
  type Plan, 
  WhmAccount, 
  WhmImpersonation,
  type MailAccountSummary,
  type MailSsoLink,
  type DatabaseSsoLink,
  type DomainRecord,
  type WordPressSite
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
  const port = window.location.port;
  if (port && port !== "80" && port !== "443") {
    // If accessing via domain with custom port (e.g. 3003), route to API port 3001 on the same base domain
    const cleanHost = host.replace(/^(whm|panel|api)\./, "");
    return `${proto}//${cleanHost}:3001/api/v1`;
  }
  return `${proto}//api.${parts.length >= 2 ? parts.slice(-2).join(".") : host}/api/v1`;
})();
const ODIN_ACCESS_TOKEN_KEY = "odin-access-token";

const getBrowserStorage = (): Storage | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return window.sessionStorage;
  }
};

export const getOdinAccessToken = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }

  return getBrowserStorage()?.getItem(ODIN_ACCESS_TOKEN_KEY) ?? window.sessionStorage.getItem(ODIN_ACCESS_TOKEN_KEY);
};

export const clearOdinSession = (): void => {
  if (typeof window !== "undefined") {
    getBrowserStorage()?.removeItem(ODIN_ACCESS_TOKEN_KEY);
    window.sessionStorage.removeItem(ODIN_ACCESS_TOKEN_KEY);
  }
};

export const setOdinSession = (token: string): void => {
  if (typeof window !== "undefined") {
    getBrowserStorage()?.setItem(ODIN_ACCESS_TOKEN_KEY, token);
    window.sessionStorage.setItem(ODIN_ACCESS_TOKEN_KEY, token);
  }
};

export const hasOdinSession = (): boolean => {
  if (typeof window === "undefined") return false;
  return Boolean(getOdinAccessToken());
};

export const loginOdin = async (username: string, password: string): Promise<void> => {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const payload = await res.json();
  if (!res.ok || !payload.success) {
    throw new Error(payload?.error?.message ?? "Credenciales incorrectas");
  }
  setOdinSession(payload.data.token);
};

const parsePayload = async <T>(
  response: Response,
  options: { redirectOnAuthFailure?: boolean } = {}
): Promise<T> => {
  const { redirectOnAuthFailure = true } = options;
  const payload = await response.json();

  if (!response.ok || !payload.success) {
    // Redirect to login on auth failures
    if (redirectOnAuthFailure && (response.status === 401 || response.status === 403) && typeof window !== "undefined") {
      clearOdinSession();
      if (!window.location.pathname.startsWith("/auth/")) {
        window.location.href = "/auth/login";
      }
    }
    throw new Error(payload?.error?.message ?? "Error en la petición");
  }

  return payload.data as T;
};

const withOdinAuth = (headers: Record<string, string> = {}): Record<string, string> => {
  const token = getOdinAccessToken();

  return token
    ? {
        ...headers,
        Authorization: `Bearer ${token}`
      }
    : headers;
};

export const fetchPlans = async (): Promise<Plan[]> => {
  const response = await fetch(`${API_BASE}/whm/plans`, { cache: "no-store" });
  return parsePayload<Plan[]>(response, { redirectOnAuthFailure: false });
};

export const fetchAccounts = async (): Promise<WhmAccount[]> => {
  const response = await fetch(`${API_BASE}/whm/accounts`, { cache: "no-store" });
  return parsePayload<WhmAccount[]>(response, { redirectOnAuthFailure: false });
};

export const createAccount = async (input: unknown): Promise<{ userId: string; accountId: string }> => {
  const response = await fetch(`${API_BASE}/whm/accounts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });

  return parsePayload<{ userId: string; accountId: string }>(response, { redirectOnAuthFailure: false });
};

export const suspendAccount = async (accountId: string): Promise<void> => {
  const response = await fetch(`${API_BASE}/whm/accounts/${accountId}/suspend`, { method: "POST" });
  await parsePayload(response, { redirectOnAuthFailure: false });
};

export const resumeAccount = async (accountId: string): Promise<void> => {
  const response = await fetch(`${API_BASE}/whm/accounts/${accountId}/resume`, { method: "POST" });
  await parsePayload(response, { redirectOnAuthFailure: false });
};

export const impersonateAccount = async (accountId: string): Promise<WhmImpersonation> => {
  const response = await fetch(`${API_BASE}/whm/accounts/${accountId}/impersonate`, { method: "POST" });
  return parsePayload<WhmImpersonation>(response, { redirectOnAuthFailure: false });
};

export const resetAccountPassword = async (accountId: string, password?: string): Promise<{ message: string; password?: string }> => {
  const response = await fetch(`${API_BASE}/whm/accounts/${accountId}/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password })
  });
  return parsePayload<{ message: string; password?: string }>(response, { redirectOnAuthFailure: false });
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
  adminEmail?: string;
  wpVersion?: string;
  phpVersion?: string;
  dbName?: string;
  dbUser?: string;
  tablePrefix?: string;
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

export interface WpVersionInfo {
  version: string;
  label: string;
  isCurrent: boolean;
  isLegacy?: boolean;
  releaseDate?: string;
}

export const fetchWpVersions = async (): Promise<WpVersionInfo[]> => {
  const response = await fetch(`${API_BASE}/odin-panel/wordpress/versions`, {
    headers: withOdinAuth()
  });
  return parsePayload<WpVersionInfo[]>(response);
};

export const updateWpSite = async (id: string): Promise<{ newVersion: string; backupPath: string }> => {
  const response = await fetch(`${API_BASE}/odin-panel/wordpress/${id}/update`, {
    method: "POST",
    headers: withOdinAuth()
  });
  return parsePayload<{ newVersion: string; backupPath: string }>(response);
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
    username: string;
    expiresAt?: string | null;
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

export const fetchMailAccounts = async (): Promise<MailAccountSummary[]> => {
  const response = await fetch(`${API_BASE}/odin-panel/mail/accounts`, {
    cache: "no-store",
    headers: withOdinAuth()
  });
  return parsePayload<MailAccountSummary[]>(response);
};

export const fetchMailAccountById = async (accountId: string): Promise<MailAccountSummary> => {
  const response = await fetch(`${API_BASE}/odin-panel/mail/accounts/${accountId}`, {
    cache: "no-store",
    headers: withOdinAuth()
  });
  return parsePayload<MailAccountSummary>(response);
};

export const createMailAccount = async (input: {
  domain: string;
  username: string;
  password: string;
  quotaMb: number | null;
  sendLoginLink: boolean;
  alternateEmail: string;
  stayOnPage: boolean;
}): Promise<{
  created: MailAccountSummary;
  result: { success: boolean; message: string };
}> => {
  const response = await fetch(`${API_BASE}/odin-panel/mail/accounts`, {
    method: "POST",
    headers: withOdinAuth({ "Content-Type": "application/json" }),
    body: JSON.stringify(input)
  });
  return parsePayload(response);
};

export const issueMailSsoLink = async (accountId: string): Promise<MailSsoLink> => {
  const response = await fetch(`${API_BASE}/odin-panel/mail/accounts/${accountId}/sso`, {
    method: "POST",
    headers: withOdinAuth()
  });
  return parsePayload<MailSsoLink>(response);
};

export const updateMailAccountPassword = async (accountId: string, password: string): Promise<void> => {
  const response = await fetch(`${API_BASE}/odin-panel/mail/accounts/${accountId}/password`, {
    method: "PATCH",
    headers: withOdinAuth({ "Content-Type": "application/json" }),
    body: JSON.stringify({ password })
  });
  await parsePayload(response);
};

// Mail session token key (set by the webmail SSO flow)
const MAIL_SESSION_TOKEN_KEY = "mail-session-token";

export const getMailSessionToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(MAIL_SESSION_TOKEN_KEY);
};

export const setMailSessionToken = (token: string): void => {
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(MAIL_SESSION_TOKEN_KEY, token);
  }
};

const withMailAuth = (headers: Record<string, string> = {}): Record<string, string> => {
  const token = getMailSessionToken();
  return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
};

export interface MailFolder {
  folder: string;
  label: string;
  count: number;
}

export interface MailMessage {
  id: string;
  folder: string;
  from: string;
  fromAddress: string;
  subject: string;
  preview: string;
  receivedAt: string;
  read: boolean;
  starred: boolean;
  to: string[];
  body?: string;
}

export const fetchMailFolders = async (): Promise<MailFolder[]> => {
  const response = await fetch(`${API_BASE}/mail/folders`, {
    cache: "no-store",
    headers: withMailAuth()
  });
  return parsePayload<MailFolder[]>(response, { redirectOnAuthFailure: false });
};

export const fetchMailMessages = async (folder = "INBOX"): Promise<MailMessage[]> => {
  const response = await fetch(`${API_BASE}/mail/messages?folder=${encodeURIComponent(folder)}`, {
    cache: "no-store",
    headers: withMailAuth()
  });
  return parsePayload<MailMessage[]>(response, { redirectOnAuthFailure: false });
};

export const fetchMailMessageDetail = async (messageId: string): Promise<MailMessage> => {
  const response = await fetch(`${API_BASE}/mail/messages/${messageId}`, {
    cache: "no-store",
    headers: withMailAuth()
  });
  return parsePayload<MailMessage>(response, { redirectOnAuthFailure: false });
};

export const markMailRead = async (messageId: string, read: boolean): Promise<void> => {
  const response = await fetch(`${API_BASE}/mail/messages/${messageId}/read`, {
    method: "POST",
    headers: withMailAuth({ "Content-Type": "application/json" }),
    body: JSON.stringify({ read })
  });
  await parsePayload(response, { redirectOnAuthFailure: false });
};

export const markMailStarred = async (messageId: string, starred: boolean): Promise<void> => {
  const response = await fetch(`${API_BASE}/mail/messages/${messageId}/star`, {
    method: "POST",
    headers: withMailAuth({ "Content-Type": "application/json" }),
    body: JSON.stringify({ starred })
  });
  await parsePayload(response, { redirectOnAuthFailure: false });
};

export const sendMail = async (input: { to: string[]; subject: string; body: string }): Promise<void> => {
  const response = await fetch(`${API_BASE}/mail/messages/send`, {
    method: "POST",
    headers: withMailAuth({ "Content-Type": "application/json" }),
    body: JSON.stringify(input)
  });
  await parsePayload(response, { redirectOnAuthFailure: false });
};

export const exchangeMailSso = async (token: string): Promise<{ token: string; me: any }> => {
  const response = await fetch(`${API_BASE}/mail/auth/sso/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token })
  });
  return parsePayload<{ token: string; me: any }>(response, { redirectOnAuthFailure: false });
};


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

export const issueDatabaseSsoLink = async (dbName: string): Promise<DatabaseSsoLink> => {
  const response = await fetch(`${API_BASE}/odin-panel/databases/${encodeURIComponent(dbName)}/sso`, {
    method: "POST",
    headers: withOdinAuth()
  });
  return parsePayload<DatabaseSsoLink>(response);
};

// --- FILE MANAGER API ---

export interface DiskUsageData {
  totalBytes: number;
  totalMb: number;
  diskLimit: number;
  diskPercent: number;
  basePath: string;
  breakdown: { name: string; bytes: number; mb: number }[];
}

export const fetchDiskUsage = async (): Promise<DiskUsageData> => {
  const response = await fetch(`${API_BASE}/odin-panel/files/usage`, {
    headers: withOdinAuth(),
    cache: "no-store"
  });
  return parsePayload<DiskUsageData>(response);
};

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

export const uploadFiles = (path: string, files: FileList, onProgress?: (percentCompleted: number) => void): Promise<void> => {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("path", path);
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/odin-panel/files/upload`);
    
    const headers = withOdinAuth();
    for (const key in headers) {
      if (Object.prototype.hasOwnProperty.call(headers, key)) {
        xhr.setRequestHeader(key, headers[key]);
      }
    }
    
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percentCompleted = Math.round((event.loaded * 100) / event.total);
        onProgress(percentCompleted);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
           const payload = JSON.parse(xhr.responseText);
           if (!payload.success) reject(new Error(payload?.error?.message ?? "Error al subir archivos"));
           else resolve();
        } catch(e) { resolve(); }
      } else {
         reject(new Error("Fallo en la subida"));
      }
    };
    
    xhr.onerror = () => reject(new Error("Error de red durante la subida"));
    xhr.send(formData);
  });
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

// --- FTP API ---

export interface FtpAccount {
  id: string;
  username: string;
  path: string;
  created_at: string;
}

export const fetchFtpAccounts = async (): Promise<FtpAccount[]> => {
  const response = await fetch(`${API_BASE}/odin-panel/ftp`, {
    cache: "no-store",
    headers: withOdinAuth()
  });
  return parsePayload<FtpAccount[]>(response);
};

export const createFtpAccount = async (input: { username: string; password: string; path: string }): Promise<FtpAccount> => {
  const response = await fetch(`${API_BASE}/odin-panel/ftp`, {
    method: "POST",
    headers: withOdinAuth({ "Content-Type": "application/json" }),
    body: JSON.stringify(input)
  });
  return parsePayload<FtpAccount>(response);
};

export const deleteFtpAccount = async (id: string): Promise<void> => {
  const response = await fetch(`${API_BASE}/odin-panel/ftp/${id}`, {
    method: "DELETE",
    headers: withOdinAuth()
  });
  await parsePayload(response);
};

export const updateFtpPassword = async (id: string, password: string): Promise<void> => {
  const response = await fetch(`${API_BASE}/odin-panel/ftp/${id}/password`, {
    method: "PUT",
    headers: withOdinAuth({ "Content-Type": "application/json" }),
    body: JSON.stringify({ password })
  });
  await parsePayload(response);
};
