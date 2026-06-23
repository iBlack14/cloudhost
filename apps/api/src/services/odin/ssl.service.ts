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

export const getSslStatus = async (domain: string): Promise<SslStatus> => {
  try {
    const certPath = `/etc/letsencrypt/live/${domain}/cert.pem`;
    // We check if file exists
    await fs.access(certPath);

    // Read the cert's expiry using openssl
    const { stdout } = await execAsync(`openssl x509 -enddate -noout -in ${certPath}`);
    const dateMatch = stdout.match(/notAfter=([\s\S]+)/);
    
    // Read the issuer
    const { stdout: issuerOut } = await execAsync(`openssl x509 -issuer -noout -in ${certPath}`);
    const issuerMatch = issuerOut.match(/O\s*=\s*([^,]+)/);
    
    return {
      domain,
      hasSsl: true,
      expiryDate: dateMatch ? dateMatch[1].trim() : "Unknown",
      issuer: issuerMatch ? issuerMatch[1].trim() : "Let's Encrypt",
    };
  } catch {
    return { domain, hasSsl: false };
  }
};

/**
 * Issues a Let's Encrypt SSL via Certbot.
 * We assume Nginx is installed and configured per domain.
 */
export const issueAutoSsl = async (domain: string, email: string): Promise<void> => {
  try {
    // Certbot --nginx automatically configures the nginx config file
    const cmd = `certbot --nginx -d ${domain} -d www.${domain} --non-interactive --agree-tos -m ${email} --redirect`;
    await execAsync(cmd);
    
    // Explicitly reload Nginx to guarantee activation
    await execAsync("systemctl reload nginx").catch(() => {});
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Desconocido";
    throw new Error(`Fallo certbot para ${domain}. Revisa que los registros DNS (A/CNAME) apunten aquí. Error: ${msg}`);
  }
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

