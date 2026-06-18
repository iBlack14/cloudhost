import type { Request, Response } from "express";
import * as serverService from "../../services/whm/server.service.js";
import { z } from "zod";
import os from "node:os";
import { execSync } from "node:child_process";
import { getSysStats } from "../../services/sys-stats.service.js";

const toPercent = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
};

export const getServerStatsHandler = async (_req: Request, res: Response): Promise<Response> => {
  try {
    const stats = await getSysStats();
    
    // CPU usage calculation using loadAvg
    const cores = stats.cpuCores;
    const loadAvgs = stats.loadAvgs;
    const loadAverage1m = loadAvgs[0];
    const cpuPercent = toPercent((loadAverage1m / cores) * 100);

    return res.status(200).json({
      success: true,
      data: {
        cpu: cpuPercent,
        ram: stats.ramPercent,
        ramDetails: { total: stats.ramTotal, free: stats.ramFree },
        disk: stats.diskPercent,
        loadAvgs,
        uptime: stats.uptimeSeconds,
        system: {
          os: `${os.type()} ${os.release()}`,
          platform: os.platform(),
          cpuModel: os.cpus()[0]?.model || "Generic Processor",
          totalRamGB: Math.round(stats.ramTotal / (1024 * 1024 * 1024)),
          cores: cores
        }
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: "Error al obtener stats" } });
  }
};

export const getProcessesHandler = async (_req: Request, res: Response): Promise<Response> => {
  try {
    const processes = await serverService.getProcesses();
    return res.status(200).json({ success: true, data: processes });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: "Error obteniendo procesos" } });
  }
};

export const killProcessHandler = async (req: Request, res: Response): Promise<Response> => {
  try {
    await serverService.killProcess(req.params.pid as string);
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: "Error matando el proceso" } });
  }
};

export const getServicesHandler = async (_req: Request, res: Response): Promise<Response> => {
  try {
    const services = await serverService.getServicesStatus();
    return res.status(200).json({ success: true, data: services });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: "Error obteniendo servicios" } });
  }
};

export const manageServiceHandler = async (req: Request, res: Response): Promise<Response> => {
  const schema = z.object({
    name: z.string(),
    action: z.enum(["start", "stop", "restart", "reload"])
  });

  const parsed = schema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(422).json({ success: false, error: { message: "Invalid parameters" } });
  }

  try {
    await serverService.manageService(parsed.data.name, parsed.data.action);
    return res.status(200).json({ success: true, data: { message: `Servicio en estado: ${parsed.data.action}` } });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: "Error administrando servicio" } });
  }
};

export const getLogsHandler = async (req: Request, res: Response): Promise<Response> => {
  try {
    const logs = await serverService.tailLog(req.params.type as string);
    return res.status(200).json({ success: true, data: logs });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: "Error al leer los logs" } });
  }
};

/** Returns real server software/network config info */
export const getServerConfigHandler = async (_req: Request, res: Response): Promise<Response> => {
  try {
    const getCmd = (cmd: string, fallback: string): string => {
      try { return execSync(cmd, { timeout: 3000 }).toString().trim() || fallback; }
      catch { return fallback; }
    };

    // Network: get primary IP (non-loopback)
    const nets = os.networkInterfaces();
    let primaryIp = "N/D";
    for (const iface of Object.values(nets)) {
      for (const net of (iface ?? [])) {
        if (!net.internal && net.family === "IPv4") {
          primaryIp = net.address;
          break;
        }
      }
      if (primaryIp !== "N/D") break;
    }

    const nginxVer  = getCmd("nginx -v 2>&1 | awk '{print $3}'" , "nginx (no instalado)");
    const nodeVer   = getCmd("node --version", `Node.js ${process.version}`);
    const phpGlobal = getCmd("php --version | head -n1 | awk '{print $1, $2}'", "PHP (no instalado)");
    const firewallStatus = getCmd("ufw status | head -n1", "inactive").toLowerCase();
    const sshPort   = process.env.SSH_PORT || getCmd("grep -oP '(?<=Port )\\d+' /etc/ssh/sshd_config | head -n1", "22");
    const ns1       = process.env.NAMESERVER_1 || getCmd("hostname -f", os.hostname());

    return res.status(200).json({
      success: true,
      data: {
        network: {
          primaryIp,
          nameserver: ns1,
          sshPort,
          firewallActive: firewallStatus.includes("active"),
        },
        software: {
          os: `${os.type()} ${os.release()}`,
          platform: os.platform(),
          nginx: nginxVer,
          nodejs: nodeVer,
          phpGlobal,
        },
        hardware: {
          cpuModel: os.cpus()[0]?.model || "Generic",
          cpuCores: os.cpus().length,
          totalRamGB: Math.round(os.totalmem() / (1024 ** 3)),
        }
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: "Error al leer configuración" } });
  }
};

/** Schedules a system reboot in 5 seconds (gives the HTTP response time to reach the client) */
export const rebootServerHandler = async (_req: Request, res: Response): Promise<Response> => {
  try {
    // Only allow on Linux; guard against accidental calls in dev
    if (os.platform() !== "linux") {
      return res.status(400).json({ success: false, error: { message: "Reinicio solo disponible en servidores Linux" } });
    }
    // Fire-and-forget: schedule reboot after 5s
    setTimeout(() => {
      try { execSync("shutdown -r +1 'Reinicio solicitado desde WHM'", { timeout: 5000 }); }
      catch { /* non-fatal */ }
    }, 2000);
    return res.status(200).json({ success: true, data: { message: "Servidor programado para reiniciar en 1 minuto." } });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: "Error al reiniciar el servidor" } });
  }
};
