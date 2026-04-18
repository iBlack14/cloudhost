import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export interface ProcessInfo {
  pid: string;
  user: string;
  cpu: string;
  mem: string;
  command: string;
}

export const getProcesses = async (): Promise<ProcessInfo[]> => {
  try {
    // We use a custom format for ps so it's easier to parse
    // pid, user, pcpu, pmem, args
    const { stdout } = await execAsync("ps -eo pid,user,pcpu,pmem,args --sort=-pcpu | head -n 100");
    const lines = stdout.trim().split("\n").slice(1); // skip header
    return lines.map((line) => {
      const parts = line.trim().split(/\s+/);
      const pid = parts[0];
      const user = parts[1];
      const cpu = parts[2];
      const mem = parts[3];
      const command = parts.slice(4).join(" ").substring(0, 50); // limit command length
      return { pid, user, cpu, mem, command };
    });
  } catch (err) {
    return [];
  }
};

export const killProcess = async (pid: string): Promise<void> => {
  if (!/^\d+$/.test(pid)) throw new Error("Invalid PID");
  await execAsync(`kill -9 ${pid}`);
};

export interface ServiceStatus {
  name: string;
  status: "active" | "inactive" | "failed" | "not-found";
}

const TRACKED_SERVICES = [
  "nginx",
  "mysql",
  "postgresql",
  "php8.1-fpm",
  "php8.2-fpm",
  "php8.3-fpm",
  "php8.4-fpm",
  "php8.5-fpm",
];

export const getServicesStatus = async (): Promise<ServiceStatus[]> => {
  const statuses: ServiceStatus[] = [];
  for (const name of TRACKED_SERVICES) {
    try {
      const { stdout } = await execAsync(`systemctl is-active ${name}`);
      statuses.push({ name, status: stdout.trim() === "active" ? "active" : "inactive" });
    } catch {
      statuses.push({ name, status: "not-found" });
    }
  }
  return statuses;
};

export const manageService = async (
  name: string,
  action: "start" | "stop" | "restart" | "reload"
): Promise<void> => {
  if (!TRACKED_SERVICES.includes(name)) throw new Error("Invalid service");
  await execAsync(`systemctl ${action} ${name}`);
};

export const tailLog = async (type: string): Promise<string[]> => {
  let logPath = "";
  if (type === "nginx-access") logPath = "/var/log/nginx/access.log";
  else if (type === "nginx-error") logPath = "/var/log/nginx/error.log";
  else if (type === "syslog") logPath = "/var/log/syslog";
  else throw new Error("Invalid log type");

  try {
    const { stdout } = await execAsync(`tail -n 100 ${logPath}`);
    return stdout.trim().split("\n");
  } catch (err) {
    return ["Log file not available."];
  }
};
