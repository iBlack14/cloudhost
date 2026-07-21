"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getOdinAccessToken } from "../../../lib/api";
import { runtimeAppsPollInterval } from "../../../lib/hooks/use-runtime-poll-interval";

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
  return `${proto}//api.${parts.length >= 2 ? parts.slice(-2).join(".") : host}/api/v1`;
})();

const authHeaders = (): Record<string, string> => {
  const t = getOdinAccessToken();
  return t ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
};

const NODE_VERSIONS = [
  {
    version: "22", label: "22.x", tag: "Current",
    tagColor: "bg-violet-100 text-violet-700", border: "border-violet-200", glow: "shadow-violet-100",
    desc: "Últimas APIs, mejor rendimiento V8", icon: "rocket_launch",
  },
  {
    version: "20", label: "20.x", tag: "LTS Recomendado",
    tagColor: "bg-emerald-100 text-emerald-700", border: "border-emerald-200", glow: "shadow-emerald-100",
    desc: "Estable hasta abril 2026, ideal producción", icon: "verified",
  },
  {
    version: "18", label: "18.x", tag: "LTS Mantenimiento",
    tagColor: "bg-amber-100 text-amber-700", border: "border-amber-200", glow: "shadow-amber-100",
    desc: "Soporte activo hasta abril 2025", icon: "shield",
  },
];

type SourceMode = "manual" | "github";
type AppPanel = "none" | "logs" | "env" | "scripts";

interface EnvVar { key: string; value: string; }

const EMPTY_APP = {
  name: "",
  version: "20",
  path: "",
  script: "index.js",
  domain: "",
  port: "3000",
  linkedDomain: "",
  githubRepo: "",
  githubBranch: "main",
  installCmd: "npm install",
  buildCmd: "",
  startCmd: "npm start",
};

const GitHubIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={`fill-current ${className}`} xmlns="http://www.w3.org/2000/svg">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

function AppDetailPanel({
  app,
  panel,
  onClose,
}: {
  app: any;
  panel: AppPanel;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [envRows, setEnvRows] = useState<EnvVar[]>(() =>
    Object.entries(app.env_vars || {}).map(([key, value]) => ({ key, value: String(value) }))
  );
  const [bulkInput, setBulkInput] = useState("");
  const [showBulk, setShowBulk] = useState(false);
  const [scriptOutput, setScriptOutput] = useState("");
  const [runningScript, setRunningScript] = useState<string | null>(null);

  const { data: logs = [], isFetching: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ["odin_nodejs_logs", app.id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/odin-panel/nodejs/${app.id}/logs`, { headers: authHeaders() });
      if (!res.ok) throw new Error("No se pudieron cargar los logs");
      return (await res.json()).data as string[];
    },
    enabled: panel === "logs",
    refetchInterval: panel === "logs" ? 8000 : false,
  });

  const { data: pkgInfo, isLoading: scriptsLoading } = useQuery({
    queryKey: ["odin_nodejs_scripts", app.id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/odin-panel/nodejs/${app.id}/scripts`, { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "No se pudieron leer scripts");
      return data.data as {
        scripts: Record<string, string>;
        installCmd?: string;
        buildCmd?: string;
        startCmd?: string;
        main?: string;
      };
    },
    enabled: panel === "scripts",
  });

  const saveEnvMutation = useMutation({
    mutationFn: async () => {
      const envs = Object.fromEntries(envRows.filter((v) => v.key.trim()).map((v) => [v.key.trim(), v.value]));
      const res = await fetch(`${API_BASE}/odin-panel/nodejs/${app.id}/env`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ envs, restart: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "Error al guardar env");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["odin_nodejs_apps"] });
      alert("Variables guardadas y app reiniciada");
    },
    onError: (e: Error) => alert(e.message),
  });

  const runScriptMutation = useMutation({
    mutationFn: async (script: string) => {
      setRunningScript(script);
      setScriptOutput("");
      const res = await fetch(`${API_BASE}/odin-panel/nodejs/${app.id}/run-script`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ script }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "Error al ejecutar script");
      return data;
    },
    onSuccess: (data) => {
      setScriptOutput(data?.data?.output ?? data?.message ?? "OK");
      setRunningScript(null);
    },
    onError: (e: Error) => {
      setScriptOutput(`❌ ${e.message}`);
      setRunningScript(null);
    },
  });

  const handleBulkImport = () => {
    const parsed: EnvVar[] = [];
    for (let line of bulkInput.split("\n")) {
      line = line.trim();
      if (!line || line.startsWith("#")) continue;
      const index = line.indexOf("=");
      if (index === -1) continue;
      let key = line.substring(0, index).trim();
      let val = line.substring(index + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (key) parsed.push({ key, value: val });
    }
    if (!parsed.length) {
      alert("No se encontraron variables LLAVE=VALOR");
      return;
    }
    setEnvRows((prev) => {
      const keys = new Set(prev.map((x) => x.key));
      return [...prev, ...parsed.filter((x) => !keys.has(x.key))];
    });
    setBulkInput("");
    setShowBulk(false);
  };

  if (panel === "none") return null;

  return (
    <div className="mt-6 w-full border-t border-slate-100 pt-6 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-black uppercase tracking-widest text-slate-700">
          {panel === "logs" && "Logs en vivo"}
          {panel === "env" && "Variables de entorno"}
          {panel === "scripts" && "Scripts de package.json"}
        </h4>
        <button
          onClick={onClose}
          className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-700"
        >
          Cerrar
        </button>
      </div>

      {panel === "logs" && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => refetchLogs()}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest"
            >
              {logsLoading ? "Actualizando..." : "Refrescar"}
            </button>
          </div>
          <pre className="bg-slate-950 text-emerald-400 text-[11px] font-mono p-5 rounded-2xl max-h-72 overflow-auto whitespace-pre-wrap leading-relaxed">
            {logs.length ? logs.join("\n") : "Sin logs todavía."}
          </pre>
        </div>
      )}

      {panel === "env" && (
        <div className="space-y-4">
          {showBulk ? (
            <div className="space-y-3">
              <textarea
                rows={6}
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                placeholder={"NODE_ENV=production\nDATABASE_URL=...\nJWT_SECRET=..."}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-mono outline-none focus:border-[#00A3FF]"
              />
              <div className="flex gap-2">
                <button onClick={handleBulkImport} className="px-5 py-2.5 rounded-xl bg-[#00A3FF] text-white text-[11px] font-black uppercase">
                  Importar
                </button>
                <button onClick={() => setShowBulk(false)} className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-[11px] font-black uppercase">
                  Volver
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {envRows.map((row, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <input
                      value={row.key}
                      onChange={(e) => setEnvRows((prev) => prev.map((v, idx) => (idx === i ? { ...v, key: e.target.value } : v)))}
                      placeholder="KEY"
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono outline-none focus:border-[#00A3FF]"
                    />
                    <span className="text-slate-300 font-black">=</span>
                    <input
                      value={row.value}
                      onChange={(e) => setEnvRows((prev) => prev.map((v, idx) => (idx === i ? { ...v, value: e.target.value } : v)))}
                      placeholder="value"
                      className="flex-[2] bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono outline-none focus:border-[#00A3FF]"
                    />
                    <button
                      onClick={() => setEnvRows((prev) => prev.filter((_, idx) => idx !== i))}
                      className="w-9 h-9 rounded-xl bg-red-50 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setEnvRows((prev) => [...prev, { key: "", value: "" }])}
                  className="px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-[11px] font-black uppercase text-slate-500"
                >
                  + Variable
                </button>
                <button
                  onClick={() => setShowBulk(true)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-[11px] font-black uppercase text-slate-600"
                >
                  Pegar .env
                </button>
                <button
                  disabled={saveEnvMutation.isPending}
                  onClick={() => saveEnvMutation.mutate()}
                  className="ml-auto px-6 py-2.5 rounded-xl bg-[#00A3FF] text-white text-[11px] font-black uppercase disabled:opacity-40"
                >
                  {saveEnvMutation.isPending ? "Guardando..." : "Guardar y reiniciar"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {panel === "scripts" && (
        <div className="space-y-4">
          {scriptsLoading ? (
            <p className="text-sm text-slate-400">Leyendo package.json...</p>
          ) : !pkgInfo?.scripts || !Object.keys(pkgInfo.scripts).length ? (
            <p className="text-sm text-slate-400">No hay scripts en package.json</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(pkgInfo.scripts).map(([name, cmd]) => (
                <div key={name} className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-slate-800 font-mono">npm run {name}</p>
                    <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5">{String(cmd)}</p>
                  </div>
                  <button
                    disabled={runningScript === name}
                    onClick={() => runScriptMutation.mutate(name)}
                    className="shrink-0 px-4 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-40"
                  >
                    {runningScript === name ? "..." : "Run"}
                  </button>
                </div>
              ))}
            </div>
          )}
          {(pkgInfo?.installCmd || pkgInfo?.buildCmd || pkgInfo?.startCmd) && (
            <div className="flex flex-wrap gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
              {pkgInfo.installCmd && <span>Install: <strong className="text-slate-700 normal-case font-mono">{pkgInfo.installCmd}</strong></span>}
              {pkgInfo.buildCmd && <span>Build: <strong className="text-slate-700 normal-case font-mono">{pkgInfo.buildCmd}</strong></span>}
              {pkgInfo.startCmd && <span>Start: <strong className="text-slate-700 normal-case font-mono">{pkgInfo.startCmd}</strong></span>}
            </div>
          )}
          {scriptOutput && (
            <pre className="bg-slate-950 text-emerald-400 text-[11px] font-mono p-5 rounded-2xl max-h-56 overflow-auto whitespace-pre-wrap">
              {scriptOutput}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export default function NodejsAppsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [sourceMode, setSourceMode] = useState<SourceMode>("github");
  const [newApp, setNewApp] = useState(EMPTY_APP);
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [showEnvEditor, setShowEnvEditor] = useState(false);
  const [bulkInput, setBulkInput] = useState("");
  const [showBulk, setShowBulk] = useState(false);
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [redeployingId, setRedeployingId] = useState<string | null>(null);
  const [actionLog, setActionLog] = useState<Record<string, string>>({});
  const [openPanel, setOpenPanel] = useState<Record<string, AppPanel>>({});

  const { data: userDomains = [] } = useQuery({
    queryKey: ["odin_domains_for_nodejs"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/odin-panel/domains`, { headers: authHeaders() });
      if (!res.ok) return [];
      return (await res.json()).data ?? [];
    },
    enabled: showCreate,
  });

  const handleDomainSelect = (domainName: string) => {
    setNewApp((prev) => ({
      ...prev,
      linkedDomain: domainName,
      domain: domainName,
      name: prev.name || domainName.split(".")[0],
    }));
  };

  const parseGitUrl = (raw: string): { repoPath: string; host: string } => {
    const trimmed = raw.trim().replace(/\.git$/, "");
    try {
      const url = new URL(trimmed);
      const parts = url.pathname.replace(/^\//, "").split("/");
      return { repoPath: parts.slice(0, 2).join("/"), host: url.hostname };
    } catch {
      const sshMatch = trimmed.match(/git@([^:]+):(.+)/);
      if (sshMatch) return { repoPath: sshMatch[2], host: sshMatch[1] };
      return { repoPath: trimmed, host: "github.com" };
    }
  };

  const handleRepoChange = (value: string) => {
    const { repoPath } = parseGitUrl(value);
    const repoName = repoPath.split("/")[1] ?? "";
    setNewApp((prev) => ({
      ...prev,
      githubRepo: value,
      name: prev.name || repoName,
    }));
  };

  const resolvedRepo = parseGitUrl(newApp.githubRepo);

  const addEnvVar = () => setEnvVars((prev) => [...prev, { key: "", value: "" }]);
  const removeEnvVar = (i: number) => setEnvVars((prev) => prev.filter((_, idx) => idx !== i));
  const updateEnvVar = (i: number, field: "key" | "value", val: string) =>
    setEnvVars((prev) => prev.map((v, idx) => (idx === i ? { ...v, [field]: val } : v)));

  const buildEnvVarsRecord = (): Record<string, string> =>
    Object.fromEntries(envVars.filter((v) => v.key.trim()).map((v) => [v.key.trim(), v.value]));

  const handleBulkImport = () => {
    const parsed: EnvVar[] = [];
    for (let line of bulkInput.split("\n")) {
      line = line.trim();
      if (!line || line.startsWith("#") || line.startsWith("//")) continue;
      const index = line.indexOf("=");
      if (index === -1) continue;
      const key = line.substring(0, index).trim();
      let val = line.substring(index + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (key) parsed.push({ key, value: val });
    }
    if (parsed.length > 0) {
      setEnvVars((prev) => {
        const existingKeys = new Set(prev.map((x) => x.key));
        return [...prev, ...parsed.filter((x) => !existingKeys.has(x.key))];
      });
      setBulkInput("");
      setShowBulk(false);
    } else {
      alert("No se encontraron variables válidas en formato LLAVE=VALOR.");
    }
  };

  const buildPayload = () => {
    const base = {
      name: newApp.name,
      version: newApp.version,
      path: newApp.linkedDomain ? newApp.linkedDomain : (newApp.path || "/home/apps/mi-app"),
      script: newApp.script || "index.js",
      domain: newApp.domain,
      port: parseInt(newApp.port, 10),
      linkedDomain: newApp.linkedDomain || undefined,
      envVars: buildEnvVarsRecord(),
      autoStart: true,
      installCmd: newApp.installCmd || "npm install",
      buildCmd: newApp.buildCmd || undefined,
      startCmd: newApp.startCmd || undefined,
    };
    if (sourceMode === "github") {
      return {
        ...base,
        githubRepo: resolvedRepo.repoPath,
        githubBranch: newApp.githubBranch || "main",
      };
    }
    return base;
  };

  const { data: apps, isLoading } = useQuery({
    queryKey: ["odin_nodejs_apps"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/odin-panel/nodejs`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Load failed");
      return (await res.json()).data;
    },
    refetchInterval: runtimeAppsPollInterval,
    staleTime: 10_000,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/odin-panel/nodejs`, {
        method: "POST", headers: authHeaders(), body: JSON.stringify(buildPayload()),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "Error creating app");
      return data;
    },
    onSuccess: (data) => {
      setShowCreate(false);
      setNewApp(EMPTY_APP);
      setSourceMode("github");
      setEnvVars([]);
      setShowEnvEditor(false);
      queryClient.invalidateQueries({ queryKey: ["odin_nodejs_apps"] });
      if (data?.data?._startError) {
        alert(`App creada, pero el arranque falló:\n${data.data._startError}\nRevisa Logs y Scripts.`);
      }
    },
    onError: (e: any) => alert(e.message),
  });

  const manageMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: string }) => {
      const res = await fetch(`${API_BASE}/odin-panel/nodejs/${id}/${action}`, { method: "POST", headers: authHeaders() });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error?.message ?? "Action failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["odin_nodejs_apps"] }),
    onError: (e: Error) => alert(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/odin-panel/nodejs/${id}`, { method: "DELETE", headers: authHeaders() });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error?.message ?? "Delete failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["odin_nodejs_apps"] }),
    onError: (e: Error) => alert(e.message),
  });

  const npmInstallMutation = useMutation({
    mutationFn: async (id: string) => {
      setInstallingId(id);
      const res = await fetch(`${API_BASE}/odin-panel/nodejs/${id}/npm-install`, { method: "POST", headers: authHeaders() });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error?.message ?? "npm install failed");
      return data;
    },
    onSuccess: (data, id) => {
      setActionLog((prev) => ({ ...prev, [id]: data?.data?.output ?? data?.message ?? "✅ npm install completado" }));
      setInstallingId(null);
      queryClient.invalidateQueries({ queryKey: ["odin_nodejs_apps"] });
    },
    onError: (e: Error, id) => {
      setActionLog((prev) => ({ ...prev, [id]: `❌ Error: ${e.message}` }));
      setInstallingId(null);
    },
  });

  const redeployMutation = useMutation({
    mutationFn: async (id: string) => {
      setRedeployingId(id);
      const res = await fetch(`${API_BASE}/odin-panel/nodejs/${id}/redeploy`, { method: "POST", headers: authHeaders() });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error?.message ?? "Redeploy failed");
      return data;
    },
    onSuccess: (data, id) => {
      const logs = (data?.data?.logs as string[] | undefined)?.join("\n");
      setActionLog((prev) => ({ ...prev, [id]: logs || data?.message || "✅ Redeploy completado" }));
      setRedeployingId(null);
      queryClient.invalidateQueries({ queryKey: ["odin_nodejs_apps"] });
    },
    onError: (e: Error, id) => {
      setActionLog((prev) => ({ ...prev, [id]: `❌ Redeploy: ${e.message}` }));
      setRedeployingId(null);
    },
  });

  const togglePanel = (appId: string, panel: AppPanel) => {
    setOpenPanel((prev) => ({
      ...prev,
      [appId]: prev[appId] === panel ? "none" : panel,
    }));
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-24 bg-white border border-slate-200 rounded-[3rem] animate-pulse">
        <div className="w-12 h-12 border-4 border-slate-100 border-t-[#00A3FF] rounded-full animate-spin mb-4" />
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Sincronizando Cluster PM2...</p>
      </div>
    );
  }

  const isFormValid =
    newApp.name.trim() &&
    newApp.domain.trim() &&
    (sourceMode === "github" ? newApp.githubRepo.includes("/") : true);

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-200 pb-10">
        <div className="space-y-1.5">
          <span className="px-2.5 py-1 bg-[#00A3FF]/10 text-[#00A3FF] text-[10px] font-bold uppercase rounded-full tracking-wider">
            Motor JavaScript
          </span>
          <h1 className="text-5xl font-black text-slate-900 uppercase mt-2">
            Node.js <span className="text-[#00A3FF]">App Engine</span>
          </h1>
          <p className="text-slate-500 text-sm font-medium">
            Clone → install → build → start → proxy SSL. Despliegue completo con PM2.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className={`px-10 py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest transition-all shadow-xl flex items-center gap-2 active:scale-95 ${showCreate ? "bg-slate-900 text-white" : "bg-[#00A3FF] text-white shadow-[#00A3FF]/20"}`}
        >
          <span className="material-symbols-outlined">{showCreate ? "close" : "add"}</span>
          {showCreate ? "Cancelar Despliegue" : "Configurar Nueva App"}
        </button>
      </header>

      {showCreate && (
        <div className="bg-white border border-slate-200 p-12 rounded-[3rem] shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden">
          <div className="absolute top-[-10%] right-[-5%] w-64 h-64 bg-[#00A3FF]/5 rounded-full blur-[80px] pointer-events-none" />
          <div className="relative z-10 space-y-10">
            <div>
              <h3 className="text-2xl font-black text-slate-900 uppercase">Topología de Aplicación</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                Instalación + build + start + nginx proxy automático
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Origen del Código</label>
              <div className="flex gap-3">
                {(["github", "manual"] as SourceMode[]).map((mode) => (
                  <button key={mode} onClick={() => setSourceMode(mode)}
                    className={`flex-1 flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left ${sourceMode === mode ? "border-[#00A3FF] bg-[#00A3FF]/5" : "border-slate-200 bg-slate-50 hover:border-slate-300"}`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${sourceMode === mode ? "bg-[#00A3FF] text-white" : "bg-white text-slate-400 border border-slate-200"}`}>
                      {mode === "manual"
                        ? <span className="material-symbols-outlined text-[20px]">folder_open</span>
                        : <GitHubIcon />}
                    </div>
                    <div>
                      <p className={`text-xs font-black uppercase tracking-wide ${sourceMode === mode ? "text-[#00A3FF]" : "text-slate-600"}`}>
                        {mode === "manual" ? "Directorio Manual" : "Repositorio GitHub"}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {mode === "manual" ? "Ruta existente en el servidor" : "Clone, install, build y start automático"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Runtime Node.js</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {NODE_VERSIONS.map((nv) => (
                  <button key={nv.version} type="button" onClick={() => setNewApp({ ...newApp, version: nv.version })}
                    className={`flex flex-col gap-3 p-5 rounded-2xl border-2 text-left transition-all duration-200 ${newApp.version === nv.version ? `${nv.border} bg-white shadow-lg ${nv.glow}` : "border-slate-200 bg-slate-50 hover:bg-white"}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${newApp.version === nv.version ? "bg-[#00A3FF] text-white" : "bg-slate-200 text-slate-500"}`}>
                        <span className="material-symbols-outlined text-[20px]">{nv.icon}</span>
                      </div>
                      {newApp.version === nv.version && <span className="material-symbols-outlined text-[#00A3FF] text-[20px]">check_circle</span>}
                    </div>
                    <div>
                      <p className={`text-base font-black ${newApp.version === nv.version ? "text-slate-900" : "text-slate-600"}`}>
                        Node.js {nv.label}
                      </p>
                      <span className={`inline-block text-[10px] font-black px-2 py-0.5 rounded-full mt-1 ${nv.tagColor}`}>{nv.tag}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{nv.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Dominio <span className="text-red-400">*</span>
                <span className="ml-2 text-slate-300 normal-case font-semibold">— proxy nginx + SSL automático</span>
              </label>

              {userDomains.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                  {userDomains.map((d: any) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => handleDomainSelect(d.domain_name)}
                      className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                        newApp.linkedDomain === d.domain_name
                          ? "border-[#00A3FF] bg-[#00A3FF]/5"
                          : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-[16px] ${
                        newApp.linkedDomain === d.domain_name ? "bg-[#00A3FF] text-white" : "bg-white text-slate-400 border border-slate-200"
                      }`}>
                        <span className="material-symbols-outlined text-[16px]">language</span>
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-black truncate ${newApp.linkedDomain === d.domain_name ? "text-[#00A3FF]" : "text-slate-700"}`}>
                          {d.domain_name}
                        </p>
                        {newApp.linkedDomain === d.domain_name && (
                          <p className="text-[10px] text-slate-400 mt-0.5 font-mono truncate">~/{d.domain_name}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3">
                  <span className="material-symbols-outlined text-amber-500">warning</span>
                  <p className="text-xs text-amber-700 font-semibold">
                    No tienes dominios registrados. Agrega uno en <strong>Dominios</strong> primero.
                  </p>
                </div>
              )}

              {newApp.linkedDomain && (
                <div className="flex items-center gap-3 mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="material-symbols-outlined text-slate-400 text-[18px]">folder</span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Ruta: <strong className="text-slate-800">~/{newApp.linkedDomain}/</strong>
                  </span>
                  <button
                    onClick={() => setNewApp((p) => ({ ...p, linkedDomain: "", domain: "" }))}
                    className="ml-auto text-[10px] text-red-400 hover:text-red-600 font-black uppercase tracking-wide"
                  >
                    Quitar
                  </button>
                </div>
              )}
            </div>

            {sourceMode === "github" && (
              <div className="space-y-5 p-6 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-800 rounded-xl flex items-center justify-center text-white">
                    <GitHubIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-700 uppercase tracking-wide">Fuente GitHub</p>
                    <p className="text-[11px] text-slate-400">git clone → install → build → PM2 start → nginx</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      URL del Repositorio <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">
                        <GitHubIcon className="w-4 h-4" />
                      </span>
                      <input
                        type="url"
                        value={newApp.githubRepo}
                        onChange={(e) => handleRepoChange(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-6 py-4 text-slate-900 font-mono font-bold text-sm outline-none focus:border-[#00A3FF] transition-all placeholder:font-sans placeholder:font-normal"
                        placeholder="https://github.com/usuario/repositorio"
                        spellCheck={false}
                        autoComplete="off"
                      />
                    </div>
                    {newApp.githubRepo && (
                      <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-100 rounded-xl">
                        <GitHubIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-[11px] font-mono font-bold text-slate-600 truncate">{resolvedRepo.repoPath}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Rama</label>
                    <input type="text" value={newApp.githubBranch} onChange={(e) => setNewApp({ ...newApp, githubBranch: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 font-bold text-sm outline-none focus:border-[#00A3FF]" placeholder="main"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Install</label>
                    <input type="text" value={newApp.installCmd} onChange={(e) => setNewApp({ ...newApp, installCmd: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 font-bold text-sm font-mono outline-none focus:border-[#00A3FF]" placeholder="npm install"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Build <span className="text-slate-300">(opcional)</span></label>
                    <input type="text" value={newApp.buildCmd} onChange={(e) => setNewApp({ ...newApp, buildCmd: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 font-bold text-sm font-mono outline-none focus:border-[#00A3FF]" placeholder="npm run build"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Start command</label>
                    <input type="text" value={newApp.startCmd} onChange={(e) => setNewApp({ ...newApp, startCmd: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 font-bold text-sm font-mono outline-none focus:border-[#00A3FF]" placeholder="npm start"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre del Proyecto <span className="text-red-400">*</span></label>
                <input type="text" value={newApp.name} onChange={(e) => setNewApp({ ...newApp, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-bold text-sm outline-none focus:border-[#00A3FF] focus:bg-white"
                  placeholder="ej: mi-api-rest"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Fichero de inicio <span className="text-slate-300">(si no usas start cmd)</span>
                </label>
                <input type="text" value={newApp.script} onChange={(e) => setNewApp({ ...newApp, script: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-bold text-sm font-mono outline-none focus:border-[#00A3FF] focus:bg-white"
                  placeholder="index.js"
                />
              </div>
              {sourceMode === "manual" && (
                <>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Install cmd</label>
                    <input type="text" value={newApp.installCmd} onChange={(e) => setNewApp({ ...newApp, installCmd: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-bold text-sm font-mono outline-none focus:border-[#00A3FF]"
                      placeholder="npm install"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Start cmd</label>
                    <input type="text" value={newApp.startCmd} onChange={(e) => setNewApp({ ...newApp, startCmd: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-bold text-sm font-mono outline-none focus:border-[#00A3FF]"
                      placeholder="npm start"
                    />
                  </div>
                </>
              )}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Puerto Interno</label>
                <input type="number" value={newApp.port} onChange={(e) => setNewApp({ ...newApp, port: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-bold text-sm font-mono outline-none focus:border-[#00A3FF] focus:bg-white"
                />
              </div>
            </div>

            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setShowEnvEditor(!showEnvEditor)}
                className="flex items-center gap-3 w-full p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl transition-all group"
              >
                <div className="w-8 h-8 bg-white border border-slate-200 rounded-xl flex items-center justify-center group-hover:bg-[#00A3FF] group-hover:text-white group-hover:border-[#00A3FF] transition-all">
                  <span className="material-symbols-outlined text-[18px]">{showEnvEditor ? "keyboard_arrow_up" : "tune"}</span>
                </div>
                <div className="text-left flex-1">
                  <p className="text-xs font-black text-slate-700 uppercase tracking-wide">Variables de Entorno</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {envVars.length > 0 ? `${envVars.length} configurada(s)` : "Opcional — NODE_ENV, DATABASE_URL..."}
                  </p>
                </div>
              </button>

              {showEnvEditor && (
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                  {showBulk ? (
                    <div className="space-y-3">
                      <textarea
                        rows={6}
                        value={bulkInput}
                        onChange={(e) => setBulkInput(e.target.value)}
                        placeholder={"PORT=3000\nDATABASE_URL=...\nJWT_SECRET=..."}
                        className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-mono outline-none focus:border-[#00A3FF]"
                      />
                      <div className="flex gap-2">
                        <button type="button" onClick={handleBulkImport} className="bg-[#00A3FF] text-white px-5 py-2.5 rounded-xl text-[11px] uppercase font-black">Importar</button>
                        <button type="button" onClick={() => { setShowBulk(false); setBulkInput(""); }} className="bg-white border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl text-[11px] uppercase font-black">Volver</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {envVars.map((v, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <input type="text" value={v.key} onChange={(e) => updateEnvVar(i, "key", e.target.value)} placeholder="KEY" className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono outline-none focus:border-[#00A3FF]" />
                          <span className="text-slate-300 font-black">=</span>
                          <input type="text" value={v.value} onChange={(e) => updateEnvVar(i, "value", e.target.value)} placeholder="value" className="flex-[2] bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono outline-none focus:border-[#00A3FF]" />
                          <button type="button" onClick={() => removeEnvVar(i)} className="w-9 h-9 rounded-xl bg-red-50 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center">
                            <span className="material-symbols-outlined text-[16px]">close</span>
                          </button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <button type="button" onClick={addEnvVar} className="flex items-center gap-2 px-5 py-3 bg-white border-2 border-dashed border-slate-200 rounded-xl text-slate-400 font-black text-[11px] uppercase">+ Variable</button>
                        <button type="button" onClick={() => setShowBulk(true)} className="flex items-center gap-2 px-5 py-3 bg-slate-100 rounded-xl text-slate-600 font-black text-[11px] uppercase">Pegar .env</button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 pt-2">
              <button
                disabled={createMutation.isPending || !isFormValid}
                onClick={() => createMutation.mutate()}
                className="bg-[#00A3FF] px-12 py-5 rounded-2xl text-white font-black uppercase text-[11px] tracking-widest shadow-xl shadow-[#00A3FF]/20 hover:bg-[#008EE0] active:scale-[0.98] transition-all disabled:opacity-40 flex items-center gap-2"
              >
                {createMutation.isPending ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Desplegando (clone → install → start)...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
                    Desplegar App Completa
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {apps?.length === 0 && !showCreate ? (
        <div
          className="group p-16 bg-white border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#00A3FF]/40 hover:bg-[#00A3FF]/[0.02] transition-all duration-300"
          onClick={() => setShowCreate(true)}
        >
          <div className="w-16 h-16 bg-slate-50 group-hover:bg-[#00A3FF]/10 border border-slate-100 group-hover:border-[#00A3FF]/20 rounded-2xl flex items-center justify-center text-slate-300 group-hover:text-[#00A3FF] mb-5 transition-all duration-300">
            <span className="material-symbols-outlined text-4xl">javascript</span>
          </div>
          <h4 className="text-base font-black text-slate-700 uppercase tracking-wide">Sin aplicaciones activas</h4>
          <p className="text-sm text-slate-400 mt-1.5">Haz clic para desplegar tu primera app desde GitHub.</p>
          <span className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-[#00A3FF] text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-[#00A3FF]/20">
            <span className="material-symbols-outlined text-[14px]">add</span>
            Configurar nueva app
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {apps?.map((app: any) => {
            const panel = openPanel[app.id] || "none";
            const isOnline = app.status === "online";
            const isStopped = app.status === "stopped";
            const statusColor = isOnline
              ? "bg-emerald-500 shadow-[0_0_10px_#10b981]"
              : isStopped
              ? "bg-amber-400"
              : "bg-red-500";
            const statusLabel = isOnline ? "Online" : isStopped ? "Detenida" : "Error";
            const statusBadge = isOnline
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : isStopped
              ? "bg-amber-50 text-amber-700 border-amber-200"
              : "bg-red-50 text-red-700 border-red-200";

            return (
              <div
                key={app.id}
                className="bg-white border border-slate-200 rounded-3xl shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-300 overflow-hidden"
              >
                {/* Card top bar — colored accent */}
                <div className={`h-1 w-full ${isOnline ? "bg-gradient-to-r from-emerald-400 to-[#00A3FF]" : isStopped ? "bg-amber-400" : "bg-red-400"}`} />

                <div className="p-6 flex flex-col xl:flex-row gap-6">
                  {/* ── Left: identity ─────────────────────────────────────── */}
                  <div className="flex gap-4 items-start xl:w-72 shrink-0">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all ${isOnline ? "bg-[#00A3FF] text-white shadow-lg shadow-[#00A3FF]/20" : "bg-slate-100 text-slate-400"}`}>
                      <span className="material-symbols-outlined text-2xl">javascript</span>
                    </div>
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-black text-slate-900 leading-tight">{app.name}</h3>
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wide ${statusBadge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusColor}`} />
                          {statusLabel}
                        </span>
                      </div>
                      <a
                        href={`https://${app.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[11px] text-[#00A3FF] font-semibold hover:underline truncate"
                      >
                        <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                        {app.domain}
                      </a>
                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded-lg text-[10px] font-black text-slate-500 font-mono">
                          :{app.port}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded-lg text-[10px] font-black text-slate-500">
                          Node v{app.version}
                        </span>
                        {app.github_repo && (
                          <a
                            href={`https://github.com/${app.github_repo}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-800 rounded-lg text-[10px] font-black text-white hover:bg-slate-700 transition-colors"
                          >
                            <GitHubIcon className="w-2.5 h-2.5" />
                            {app.github_repo.split("/")[1] ?? app.github_repo}
                          </a>
                        )}
                      </div>
                      {(app.start_cmd || app.script) && (
                        <p className="text-[10px] font-mono text-slate-400 truncate">
                          ▶ {app.start_cmd || app.script}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* ── Center: metrics + actions ───────────────────────────── */}
                  <div className="flex flex-col sm:flex-row gap-4 flex-1 min-w-0">
                    {/* Metrics */}
                    <div className="flex sm:flex-col gap-3 sm:gap-2 justify-center sm:justify-start shrink-0">
                      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl">
                        <span className="material-symbols-outlined text-[14px] text-slate-400">memory</span>
                        <div>
                          <p className="text-[9px] uppercase tracking-widest text-slate-400 font-black leading-none">CPU</p>
                          <p className="text-sm font-black text-slate-800 font-mono leading-tight">{app.cpu ?? 0}<span className="text-[10px] text-slate-400">%</span></p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl">
                        <span className="material-symbols-outlined text-[14px] text-slate-400">developer_board</span>
                        <div>
                          <p className="text-[9px] uppercase tracking-widest text-slate-400 font-black leading-none">RAM</p>
                          <p className="text-sm font-black text-slate-800 font-mono leading-tight">{Math.round((app.memory ?? 0) / 1024 / 1024)}<span className="text-[10px] text-slate-400">MB</span></p>
                        </div>
                      </div>
                    </div>

                    {/* Action groups */}
                    <div className="flex flex-col gap-2 flex-1 min-w-0">
                      {/* Lifecycle controls */}
                      <div className="flex items-center gap-1 p-1 bg-slate-50 border border-slate-100 rounded-2xl w-fit">
                        <button
                          onClick={() => manageMutation.mutate({ id: app.id, action: "start" })}
                          className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-slate-500 hover:text-emerald-600 hover:bg-white rounded-xl transition-all"
                          title="Iniciar"
                        >
                          <span className="material-symbols-outlined text-[14px]">play_arrow</span>
                          Iniciar
                        </button>
                        <div className="w-px h-5 bg-slate-200" />
                        <button
                          onClick={() => manageMutation.mutate({ id: app.id, action: "restart" })}
                          className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-slate-500 hover:text-amber-600 hover:bg-white rounded-xl transition-all"
                          title="Reiniciar"
                        >
                          <span className="material-symbols-outlined text-[14px]">refresh</span>
                          Reiniciar
                        </button>
                        <div className="w-px h-5 bg-slate-200" />
                        <button
                          onClick={() => manageMutation.mutate({ id: app.id, action: "stop" })}
                          className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                          title="Parar"
                        >
                          <span className="material-symbols-outlined text-[14px]">stop</span>
                          Parar
                        </button>
                      </div>

                      {/* Tools */}
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() => npmInstallMutation.mutate(app.id)}
                          disabled={installingId === app.id}
                          className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase tracking-wide bg-violet-50 text-violet-600 hover:bg-violet-100 border border-violet-100 rounded-xl transition-all disabled:opacity-50"
                        >
                          {installingId === app.id
                            ? <span className="w-3 h-3 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
                            : <span className="material-symbols-outlined text-[14px]">package_2</span>}
                          Install
                        </button>
                        <button
                          onClick={() => redeployMutation.mutate(app.id)}
                          disabled={redeployingId === app.id}
                          className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase tracking-wide bg-sky-50 text-[#00A3FF] hover:bg-sky-100 border border-sky-100 rounded-xl transition-all disabled:opacity-50"
                        >
                          {redeployingId === app.id
                            ? <span className="w-3 h-3 border-2 border-sky-300 border-t-[#00A3FF] rounded-full animate-spin" />
                            : <span className="material-symbols-outlined text-[14px]">cloud_sync</span>}
                          Redeploy
                        </button>
                        <button
                          onClick={() => togglePanel(app.id, "logs")}
                          className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase tracking-wide rounded-xl border transition-all ${panel === "logs" ? "bg-slate-900 text-white border-slate-900" : "bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100"}`}
                        >
                          <span className="material-symbols-outlined text-[14px]">terminal</span>
                          Logs
                        </button>
                        <button
                          onClick={() => togglePanel(app.id, "env")}
                          className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase tracking-wide rounded-xl border transition-all ${panel === "env" ? "bg-slate-900 text-white border-slate-900" : "bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100"}`}
                        >
                          <span className="material-symbols-outlined text-[14px]">tune</span>
                          Env
                        </button>
                        <button
                          onClick={() => togglePanel(app.id, "scripts")}
                          className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase tracking-wide rounded-xl border transition-all ${panel === "scripts" ? "bg-slate-900 text-white border-slate-900" : "bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100"}`}
                        >
                          <span className="material-symbols-outlined text-[14px]">code</span>
                          Scripts
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ── Right: delete ───────────────────────────────────────── */}
                  <div className="flex xl:flex-col items-start justify-end xl:justify-start shrink-0">
                    <button
                      onClick={() => { if (confirm("¿Eliminar aplicación permanentemente?")) deleteMutation.mutate(app.id); }}
                      className="w-10 h-10 rounded-2xl bg-slate-50 text-slate-300 hover:bg-red-50 hover:text-red-400 border border-slate-100 hover:border-red-100 transition-all flex items-center justify-center"
                      title="Eliminar app"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>

                {actionLog[app.id] && (
                  <div className="mx-6 mb-6">
                    <pre className="w-full p-4 bg-slate-950 rounded-2xl text-[10px] font-mono text-emerald-400 whitespace-pre-wrap max-h-40 overflow-y-auto">
                      {actionLog[app.id]}
                    </pre>
                  </div>
                )}

                {panel !== "none" && (
                  <div className="mx-6 mb-6">
                    <AppDetailPanel
                      app={app}
                      panel={panel}
                      onClose={() => setOpenPanel((prev) => ({ ...prev, [app.id]: "none" }))}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
