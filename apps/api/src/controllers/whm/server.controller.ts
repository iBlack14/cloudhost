import type { Request, Response } from "express";
import * as serverService from "../../services/whm/server.service.js";
import { z } from "zod";
import os from "node:os";
import { execSync } from "node:child_process";

const toPercent = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
};

export const getServerStatsHandler = async (_req: Request, res: Response): Promise<Response> => {
  try {
    const cores = os.cpus().length || 1;
    const loadAvgs = os.loadavg();
    const loadAverage1m = loadAvgs && loadAvgs.length > 0 ? loadAvgs[0] : 0;
    const cpuPercent = toPercent((loadAverage1m / cores) * 100);

    let ramTotal = os.totalmem();
    let ramFree = os.freemem();
    let ramPercent = toPercent(((ramTotal - ramFree) / ramTotal) * 100);

    // Try accurate linux meminfo
    try {
      if (os.platform() === "linux") {
        const memInfo = execSync("cat /proc/meminfo", { encoding: "utf-8" });
        const totalMatch = memInfo.match(/MemTotal:\s+(\d+)/);
        const availableMatch = memInfo.match(/MemAvailable:\s+(\d+)/);
        if (totalMatch && availableMatch) {
          const total = parseInt(totalMatch[1], 10) * 1024; // KB to Bytes
          const available = parseInt(availableMatch[1], 10) * 1024;
          ramPercent = toPercent(((total - available) / total) * 100);
          ramTotal = total;
          ramFree = available;
        }
      }
    } catch { /* inline fallback */ }

    // Disk
    let diskPercent = 15;
    try {
      const output = execSync("df -P /", { encoding: "utf-8" });
      const lines = output.trim().split("\n");
      if (lines.length >= 2) {
        const columns = lines[1].trim().split(/\s+/);
        diskPercent = toPercent(Number((columns[4] ?? "0%").replace("%", "")));
      }
    } catch { /* fallback to 15 */ }

    return res.status(200).json({
      success: true,
      data: {
        cpu: cpuPercent,
        ram: ramPercent,
        ramDetails: { total: ramTotal, free: ramFree },
        disk: diskPercent,
        loadAvgs,
        uptime: os.uptime()
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
    await serverService.killProcess(req.params.pid);
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
    const logs = await serverService.tailLog(req.params.type);
    return res.status(200).json({ success: true, data: logs });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: "Error al leer los logs" } });
  }
};
