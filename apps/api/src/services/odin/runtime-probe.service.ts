import { resolve4, resolveCname } from "node:dns/promises";
import tls from "node:tls";

export interface DomainRuntimeProbe {
  status: "active" | "pending_verification" | "offline";
  sslEnabled: boolean;
  publicUrl: string | null;
  dns: {
    resolves: boolean;
    aRecords: string[];
    cnameRecords: string[];
    checkedAt: string;
    error?: string;
  };
  endpoint: {
    https: { ok: boolean; status?: number };
    http: { ok: boolean; status?: number };
  };
  ssl: {
    available: boolean;
    trusted: boolean;
    selfSigned: boolean;
    subject?: string;
    issuer?: string;
    validFrom?: string;
    validTo?: string;
    error?: string;
  };
}

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

const probeUrl = async (url: string, timeoutMs = 5000): Promise<{ ok: boolean; status?: number }> => {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs)
    });
    return { ok: response.status < 500, status: response.status };
  } catch {
    return { ok: false };
  }
};

const probeTlsCertificate = async (
  host: string,
  timeoutMs = 5000
): Promise<DomainRuntimeProbe["ssl"]> =>
  new Promise((resolve) => {
    const socket = tls.connect(
      {
        host,
        port: 443,
        servername: host,
        rejectUnauthorized: false,
        timeout: timeoutMs
      },
      () => {
        try {
          const cert = socket.getPeerCertificate();
          const subjectCnRaw = cert?.subject?.CN as string | string[] | undefined;
          const issuerCnRaw = cert?.issuer?.CN as string | string[] | undefined;
          const subjectCn = Array.isArray(subjectCnRaw) ? subjectCnRaw.join(", ") : subjectCnRaw;
          const issuerCn = Array.isArray(issuerCnRaw) ? issuerCnRaw.join(", ") : issuerCnRaw;
          const authError = socket.authorizationError;
          resolve({
            available: Boolean(subjectCn || issuerCn),
            trusted: socket.authorized,
            selfSigned: Boolean(subjectCn && issuerCn && subjectCn === issuerCn),
            subject: subjectCn,
            issuer: issuerCn,
            validFrom: cert?.valid_from,
            validTo: cert?.valid_to,
            error: socket.authorized ? undefined : authError ? String(authError) : undefined
          });
        } catch (error) {
          resolve({
            available: false,
            trusted: false,
            selfSigned: false,
            error: toErrorMessage(error)
          });
        } finally {
          socket.end();
        }
      }
    );

    socket.on("error", (error) => {
      resolve({
        available: false,
        trusted: false,
        selfSigned: false,
        error: toErrorMessage(error)
      });
    });

    socket.on("timeout", () => {
      socket.destroy();
      resolve({
        available: false,
        trusted: false,
        selfSigned: false,
        error: "TLS timeout"
      });
    });
  });

export const probeDomainRuntime = async (domainName: string): Promise<DomainRuntimeProbe> => {
  const checkedAt = new Date().toISOString();
  let aRecords: string[] = [];
  let cnameRecords: string[] = [];
  let dnsError: string | undefined;

  try {
    aRecords = await resolve4(domainName);
  } catch (error) {
    dnsError = toErrorMessage(error);
  }

  try {
    cnameRecords = await resolveCname(domainName);
  } catch {
    // Optional; many domains do not use CNAME at root.
  }

  const https = await probeUrl(`https://${domainName}`);
  const http = await probeUrl(`http://${domainName}`);
  const ssl = await probeTlsCertificate(domainName);

  const resolves = aRecords.length > 0 || cnameRecords.length > 0;
  const hasWebResponse = https.ok || http.ok;
  const status: DomainRuntimeProbe["status"] = resolves ? (hasWebResponse ? "active" : "offline") : "pending_verification";

  return {
    status,
    sslEnabled: ssl.available && !ssl.selfSigned && https.ok,
    publicUrl: https.ok ? `https://${domainName}` : http.ok ? `http://${domainName}` : null,
    dns: {
      resolves,
      aRecords,
      cnameRecords,
      checkedAt,
      error: dnsError
    },
    endpoint: { https, http },
    ssl
  };
};
