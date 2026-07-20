import type { Request, Response } from "express";
import { getUserId } from "../../utils/get-user-id.js";
import { db } from "../../config/db.js";
import * as sslService from "../../services/odin/ssl.service.js";
import { resyncProxyForDomain } from "../../services/odin/nodejs.service.js";
import { z } from "zod";
const getDomainInfo = async (domainId: string, userId: string) => {
  const result = await db.query(
    "SELECT d.*, u.email FROM domains d INNER JOIN users u ON u.id = d.user_id WHERE d.id = $1 AND d.user_id = $2",
    [domainId, userId]
  );
  if (result.rowCount === 0) throw new Error("DOMAIN_NOT_FOUND");
  return result.rows[0] as { id: string; domain_name: string; email: string; ssl_enabled: boolean };
};

export const getDomainSslStatusHandler = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = await getUserId(req);
    const domain = await getDomainInfo(req.params.domainId as string, userId);

    const status = await sslService.getSslStatus(domain.domain_name);
    return res.status(200).json({ success: true, data: { ...status, dbSslEnabled: domain.ssl_enabled } });
  } catch (error) {
    if (error instanceof Error && error.message === "DOMAIN_NOT_FOUND") {
      return res.status(404).json({ success: false, error: { message: "Dominio no encontrado" }});
    }
    return res.status(500).json({ success: false, error: { message: "Error al obtener SSL" }});
  }
};

export const issueSslHandler = async (req: Request, res: Response): Promise<Response> => {
  const schema = z.object({ renew: z.boolean().optional() });
  const parsed = schema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(422).json({ success: false, error: parsed.error.flatten() });
  }

  try {
    const userId = await getUserId(req);
    const domain = await getDomainInfo(req.params.domainId as string, userId);
    const currentStatus = await sslService.getSslStatus(domain.domain_name);
    const shouldRenew = parsed.data.renew ?? currentStatus.hasSsl;

    if (shouldRenew) {
      await sslService.renewAutoSsl(domain.domain_name);
    } else {
      await sslService.issueAutoSsl(domain.domain_name, domain.email);
    }

    await db.query("UPDATE domains SET ssl_enabled = true WHERE id = $1", [domain.id]);

    // If this domain has a Node.js app, re-apply proxy config (certbot may have broken it)
    await resyncProxyForDomain(userId, domain.domain_name).catch(() => {});

    const status = await sslService.getSslStatus(domain.domain_name);    return res.status(200).json({
      success: true,
      data: status,
      message: shouldRenew
        ? `SSL de ${domain.domain_name} regenerado correctamente`
        : `SSL de ${domain.domain_name} instalado correctamente`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { message: error instanceof Error ? error.message : "Error instalando SSL" }
    });
  }
};
