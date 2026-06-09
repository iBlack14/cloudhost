import type { Request, Response } from "express";
import * as serverService from "../../services/whm/server.service.js";
import { z } from "zod";
import os from "node:os";
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
