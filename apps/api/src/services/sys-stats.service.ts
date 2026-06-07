/**
 * Shared system stats cache — used by both odin and WHM dashboards.
 * Runs df/meminfo async with a 30-second TTL to avoid blocking the event loop.
 */
import os from "node:os";
import { exec } from "node:child_process";
import { promisify } from "node:util";
const execAsync = promisify(exec);

export interface SysStats {
  diskPercent: number;
  ramPercent: number;
  ramTotal: number;
  ramFree: number;
  cpuCores: number;
  loadAvgs: [number, number, number];
  uptimeSeconds: number;
  ts: number;
}

const CACHE_TTL_MS = 30_000;
let _cache: SysStats | null = null;

const toPercent = (v: number): number =>
  Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : 0;

export const getSysStats = async (): Promise<SysStats> => {
  const now = Date.now();
  if (_cache && now - _cache.ts < CACHE_TTL_MS) return _cache;

  let diskPercent = 0;
  let ramTotal = os.totalmem();
  let ramFree  = os.freemem();
  let ramPercent = toPercent(((ramTotal - ramFree) / ramTotal) * 100);

  if (os.platform() !== "win32") {
    try {
      const [dfOut, memOut] = await Promise.all([
        execAsync("df -P /").then(r => r.stdout).catch(() => ""),
        execAsync("cat /proc/meminfo").then(r => r.stdout).catch(() => "")
      ]);

      // Parse df output
      const dfLines = dfOut.trim().split("\n");
      if (dfLines.length >= 2) {
        const cols = dfLines[1].trim().split(/\s+/);
        diskPercent = toPercent(Number((cols[4] ?? "0%").replace("%", "")));
      }

      // Parse /proc/meminfo — more accurate than os.freemem()
      const totalMatch = memOut.match(/MemTotal:\s+(\d+)/);
      const availMatch  = memOut.match(/MemAvailable:\s+(\d+)/);
      if (totalMatch && availMatch) {
        ramTotal   = parseInt(totalMatch[1], 10) * 1024;
        ramFree    = parseInt(availMatch[1],  10) * 1024;
        ramPercent = toPercent(((ramTotal - ramFree) / ramTotal) * 100);
      }
    } catch {
      // keep os.* defaults
    }
  }

  const loadRaw = os.loadavg();
  _cache = {
    diskPercent,
    ramPercent,
    ramTotal,
    ramFree,
    cpuCores: os.cpus().length || 1,
    loadAvgs: [
      Number((loadRaw[0] ?? 0).toFixed(2)),
      Number((loadRaw[1] ?? 0).toFixed(2)),
      Number((loadRaw[2] ?? 0).toFixed(2))
    ],
    uptimeSeconds: Math.floor(os.uptime()),
    ts: now
  };

  return _cache;
};

// Warm up at module load — first dashboard request is instant
getSysStats().catch(() => {});
