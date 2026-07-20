import { exec } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";

const execAsync = promisify(exec);

export interface SslStatus {
  domain: string;
  hasSsl: boolean;
  issuer?: string;
  expiryDate?: string;
}

const sanitizeDomain = (domain: string): string =>
  domain.trim().toLowerCase().replace(/[^a-z0-9.-]/g, "");

const sanitizeEmail = (email: string): string =>
  email.trim().replace(/[^a-zA-Z0-9@._+-]/g, "");

export const getSslStatus = async (domain: string): Promise<SslStatus> => {
  const safeDomain = sanitizeDomain(domain);
  try {
    const certPath = `/etc/letsencrypt/live/${safeDomain}/cert.pem`;
    await fs.access(certPath);

    const { stdout } = await execAsync(`openssl x509 -enddate -noout -in ${certPath}`);
    const dateMatch = stdout.match(/notAfter=([\s\S]+)/);

    const { stdout: issuerOut } = await execAsync(`openssl x509 -issuer -noout -in ${certPath}`);
    const issuerMatch = issuerOut.match(/O\s*=\s*([^,]+)/);

    return {
      domain: safeDomain,
      hasSsl: true,
      expiryDate: dateMatch ? dateMatch[1].trim() : "Unknown",
      issuer: issuerMatch ? issuerMatch[1].trim() : "Let's Encrypt",
    };
  } catch {
    return { domain: safeDomain, hasSsl: false };
  }
};

/**
 * Issues a new Let's Encrypt certificate for a single domain only.
 */
export const issueAutoSsl = async (domain: string, email: string): Promise<void> => {
  const safeDomain = sanitizeDomain(domain);
  const safeEmail = sanitizeEmail(email);

  try {
    const cmd = `certbot --nginx -d ${safeDomain} -d www.${safeDomain} --cert-name ${safeDomain} --non-interactive --agree-tos -m ${safeEmail} --redirect`;
    await execAsync(cmd, { timeout: 120_000 });
  } catch (error: unknown) {
    console.warn(`[ssl] Certbot failed with www subdomain for ${safeDomain}. Retrying for root domain only...`);
    try {
      const fallbackCmd = `certbot --nginx -d ${safeDomain} --cert-name ${safeDomain} --non-interactive --agree-tos -m ${safeEmail} --redirect`;
      await execAsync(fallbackCmd, { timeout: 120_000 });
    } catch (fallbackErr: unknown) {
      const msg = fallbackErr instanceof Error ? fallbackErr.message : "Desconocido";
      throw new Error(`Fallo certbot para ${safeDomain}. Revisa que los registros DNS (A/CNAME) apunten aquí. Error: ${msg}`);
    }
  }

  await execAsync("systemctl reload nginx").catch(() => {});
};

/**
 * Renews only the certificate for the given domain — does not touch other domains.
 */
export const renewAutoSsl = async (domain: string): Promise<void> => {
  const safeDomain = sanitizeDomain(domain);
  const certPath = `/etc/letsencrypt/live/${safeDomain}/cert.pem`;

  try {
    await fs.access(certPath);
  } catch {
    throw new Error(`No existe certificado SSL para ${safeDomain}. Usa emitir primero.`);
  }

  try {
    // Scoped renewal: only this cert lineage is renewed
    await execAsync(
      `certbot renew --cert-name ${safeDomain} --force-renewal --non-interactive`,
      { timeout: 120_000 }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Desconocido";
    throw new Error(`Fallo al renovar SSL de ${safeDomain}: ${msg}`);
  }

  await execAsync("systemctl reload nginx").catch(() => {});
};

/**
 * Revokes and deletes a given domain cert
 */
export const revokeSsl = async (domain: string): Promise<void> => {
  try {
    const certPath = `/etc/letsencrypt/live/${domain}/cert.pem`;
    await fs.access(certPath);

    // Revoke
    await execAsync(`certbot revoke --cert-path ${certPath} --non-interactive`);
    
    // Certbot delete
    await execAsync(`certbot delete --cert-name ${domain} --non-interactive`);
    
  } catch {
    // Ignore if not present
  }
};

/**
 * Issues Let's Encrypt SSL certificates for the system control panels (panel, api, whm, mail).
 */
export const issueSystemSsl = async (baseDomain: string, email: string): Promise<void> => {
  if (process.platform === "win32") {
    throw new Error("La emisión de SSL no está soportada en Windows.");
  }

  const subdomains = [
    `panel.${baseDomain}`,
    `api.${baseDomain}`,
    `whm.${baseDomain}`,
    `mail.${baseDomain}`
  ];

  try {
    // Intentar emitir certificado para todos los subdominios a la vez
    const domainsStr = subdomains.map(d => `-d ${d}`).join(" ");
    const cmd = `certbot --nginx ${domainsStr} --non-interactive --agree-tos -m ${email} --redirect`;
    await execAsync(cmd);
    await execAsync("systemctl reload nginx").catch(() => {});
  } catch (error: any) {
    // Si falla combinando todos, intentamos uno por uno para que al menos el panel y la api funcionen si alguno falla
    console.warn(`[ssl] Certbot failed to issue multi-domain certificate: ${error.message}. Retrying individually...`);
    let errors: string[] = [];
    for (const sub of subdomains) {
      try {
        const cmd = `certbot --nginx -d ${sub} --non-interactive --agree-tos -m ${email} --redirect`;
        await execAsync(cmd);
      } catch (subErr: any) {
        errors.push(`${sub}: ${subErr.message}`);
      }
    }
    await execAsync("systemctl reload nginx").catch(() => {});
    if (errors.length === subdomains.length) {
      throw new Error(`Fallo al emitir todos los certificados del sistema: ${errors.join(", ")}`);
    }
  }
};

