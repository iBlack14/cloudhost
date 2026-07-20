"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getOdinAccessToken } from "../../../lib/api";

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

// ─── Node.js version catalog ──────────────────────────────────────────────────
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

interface EnvVar { key: string; value: string; }

const EMPTY_APP = {
  name: "",
  version: "20",
  path: "",
  script: "index.js",
  domain: "",
  port: "3000",
  linkedDomain: "",      // domain_name chosen from user's domain list
  githubRepo: "",
  githubBranch: "main",
  installCmd: "npm install",
  buildCmd: "",
  startCmd: "",
};

const GitHubIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={`fill-current ${className}`} xmlns="http://www.w3.org/2000/svg">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

export default function NodejsAppsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [sourceMode, setSourceMode] = useState<SourceMode>("manual");
  const [newApp, setNewApp] = useState(EMPTY_APP);
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [showEnvEditor, setShowEnvEditor] = useState(false);
  const [bulkInput, setBulkInput] = useState("");
  const [showBulk, setShowBulk] = useState(false);
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [installLog, setInstallLog] = useState<Record<string, string>>({});

  // ── Fetch user domains ──────────────────────────────────────────────────────
  const { data: userDomains = [] } = useQuery({
    queryKey: ["odin_domains_for_nodejs"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/odin-panel/domains`, { headers: authHeaders() });
      if (!res.ok) return [];
      return (await res.json()).data ?? [];
    },
    enabled: showCreate,
  });

  // ── Domain selection: auto-fill domain + resolve path server-side ───────────
  const handleDomainSelect = (domainName: string) => {
    setNewApp((prev) => ({
      ...prev,
      linkedDomain: domainName,
      domain: domainName,           // also set reverse proxy domain
      name: prev.name || domainName.split(".")[0],
    }));
  };

  // ── GitHub/Git repo URL parser ───────────────────────────────────────────────
  const parseGitUrl = (raw: string): { repoPath: string; host: string } => {
    const trimmed = raw.trim().replace(/\.git$/, "");
    // Full HTTPS URL: https://github.com/user/repo
    try {
      const url = new URL(trimmed);
      const parts = url.pathname.replace(/^\//, "").split("/");
      return { repoPath: parts.slice(0, 2).join("/"), host: url.hostname };
    } catch {
      // SSH: git@github.com:user/repo
      const sshMatch = trimmed.match(/git@([^:]+):(.+)/);
      if (sshMatch) return { repoPath: sshMatch[2], host: sshMatch[1] };
      // Plain user/repo
      return { repoPath: trimmed, host: "github.com" };
    }
  };

  const handleRepoChange = (value: string) => {
    const { repoPath } = parseGitUrl(value);
    const repoName = repoPath.split("/")[1] ?? "";
    setNewApp((prev) => ({
      ...prev,
      githubRepo: value,          // store raw URL as typed
      name: prev.name || repoName,
    }));
  };

  // Resolved repo path sent to backend
  const resolvedRepo = parseGitUrl(newApp.githubRepo);

  // ── Env vars helpers ────────────────────────────────────────────────────────
  const addEnvVar = () => setEnvVars((prev) => [...prev, { key: "", value: "" }]);
  const removeEnvVar = (i: number) => setEnvVars((prev) => prev.filter((_, idx) => idx !== i));
  const updateEnvVar = (i: number, field: "key" | "value", val: string) =>
    setEnvVars((prev) => prev.map((v, idx) => (idx === i ? { ...v, [field]: val } : v)));

  const buildEnvVarsRecord = (): Record<string, string> =>
    Object.fromEntries(envVars.filter((v) => v.key.trim()).map((v) => [v.key.trim(), v.value]));

  const handleBulkImport = () => {
    const lines = bulkInput.split("\n");
    const parsed: EnvVar[] = [];
    for (let line of lines) {
      line = line.trim();
      if (!line || line.startsWith("#") || line.startsWith("//")) continue;
      const index = line.indexOf("=");
      if (index !== -1) {
        const key = line.substring(0, index).trim();
        let val = line.substring(index + 1).trim();
        // Remove surrounding single or double quotes if present
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.substring(1, val.length - 1);
        }
        if (key) {
          parsed.push({ key, value: val });
        }
      }
    }
    if (parsed.length > 0) {
      setEnvVars((prev) => {
        // Prevent key duplicates
        const existingKeys = new Set(prev.map(x => x.key));
        const filteredParsed = parsed.filter(x => !existingKeys.has(x.key));
        return [...prev, ...filteredParsed];
      });
      setBulkInput("");
      setShowBulk(false);
    } else {
      alert("No se encontraron variables válidas en formato LLAVE=VALOR.");
    }
  };

  // ── Build payload ───────────────────────────────────────────────────────────
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
    };
    if (sourceMode === "github") {
      return {
        ...base,
        githubRepo: resolvedRepo.repoPath,  // always send user/repo
        githubBranch: newApp.githubBranch || "main",
        installCmd: newApp.installCmd || "npm install",
        buildCmd: newApp.buildCmd || undefined,
        startCmd: newApp.startCmd || undefined,
      };
    }
    return base;
  };

  // ── Queries & mutations ─────────────────────────────────────────────────────
  const { data: apps, isLoading } = useQuery({
    queryKey: ["odin_nodejs_apps"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/odin-panel/nodejs`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Load failed");
      return (await res.json()).data;
    },
    refetchInterval: 5000,
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
    onSuccess: () => {
      setShowCreate(false);
      setNewApp(EMPTY_APP);
      setSourceMode("manual");
      setEnvVars([]);
      setShowEnvEditor(false);
      queryClient.invalidateQueries({ queryKey: ["odin_nodejs_apps"] });
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
      setInstallLog((prev) => ({ ...prev, [id]: data?.data?.output ?? "✅ npm install completado" }));
      setInstallingId(null);
      queryClient.invalidateQueries({ queryKey: ["odin_nodejs_apps"] });
    },
    onError: (e: Error, id) => {
      setInstallLog((prev) => ({ ...prev, [id]: `❌ Error: ${e.message}` }));
      setInstallingId(null);
    },
  });

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

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-12 animate-in fade-in duration-700">

      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-200 pb-10">
        <div className="space-y-1.5">
          <span className="px-2.5 py-1 bg-[#00A3FF]/10 text-[#00A3FF] text-[10px] font-bold uppercase rounded-full tracking-wider">
            Motor JavaScript
          </span>
          <h1 className="text-5xl font-black text-slate-900 uppercase mt-2">
            Node.js <span className="text-[#00A3FF]">App Engine</span>
          </h1>
          <p className="text-slate-500 text-sm font-medium">
            Despliega PM2 Wrappers, APIs REST o frameworks SSR de forma instantánea.
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

      {/* ── Create Panel ── */}
      {showCreate && (
        <div className="bg-white border border-slate-200 p-12 rounded-[3rem] shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden">
          <div className="absolute top-[-10%] right-[-5%] w-64 h-64 bg-[#00A3FF]/5 rounded-full blur-[80px] pointer-events-none" />
          <div className="relative z-10 space-y-10">

            <div>
              <h3 className="text-2xl font-black text-slate-900 uppercase">Topología de Aplicación</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Configurar entorno de ejecución aislado</p>
            </div>

            {/* ── Source Mode Toggle ── */}
            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Origen del Código</label>
              <div className="flex gap-3">
                {(["manual", "github"] as SourceMode[]).map((mode) => (
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
                        {mode === "manual" ? "Ruta existente en el servidor" : "Clone y despliega automáticamente"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Node.js Version Cards ── */}
            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Runtime Node.js (NVM)</label>
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

            {/* ── Domain Selector ── */}
            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Dominio <span className="text-red-400">*</span>
                <span className="ml-2 text-slate-300 normal-case font-semibold">— define la ruta de instalación automáticamente</span>
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
                          <p className="text-[10px] text-slate-400 mt-0.5 font-mono truncate">
                            ~/{ d.domain_name }
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3">
                  <span className="material-symbols-outlined text-amber-500">warning</span>
                  <p className="text-xs text-amber-700 font-semibold">
                    No tienes dominios registrados. Agrega uno en la sección <strong>Dominios</strong> primero.
                  </p>
                </div>
              )}

              {/* Manual domain override */}
              {newApp.linkedDomain && (
                <div className="flex items-center gap-3 mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="material-symbols-outlined text-slate-400 text-[18px]">folder</span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Ruta: <strong className="text-slate-800">~/{ newApp.linkedDomain }/</strong>
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

            {/* ── GitHub Fields ── */}
            {sourceMode === "github" && (
              <div className="space-y-5 p-6 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-800 rounded-xl flex items-center justify-center text-white">
                    <GitHubIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-700 uppercase tracking-wide">Fuente GitHub</p>
                    <p className="text-[11px] text-slate-400">Se ejecutará git clone al crear la app</p>
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
                    {/* Live preview of resolved repo */}
                    {newApp.githubRepo && (
                      <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl">
                        <GitHubIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-[11px] font-mono font-bold text-slate-600 truncate">
                          {resolvedRepo.host !== "github.com" && (
                            <span className="text-slate-400">{resolvedRepo.host}/</span>
                          )}
                          {resolvedRepo.repoPath}
                        </span>
                        <a
                          href={newApp.githubRepo.startsWith("http") ? newApp.githubRepo : `https://${resolvedRepo.host}/${resolvedRepo.repoPath}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-auto text-[9px] font-black text-[#00A3FF] hover:underline flex items-center gap-1 shrink-0"
                        >
                          <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                          Abrir
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Rama (Branch)</label>
                    <input type="text" value={newApp.githubBranch} onChange={(e) => setNewApp({ ...newApp, githubBranch: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 font-bold text-sm outline-none focus:border-[#00A3FF] transition-all" placeholder="main"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Comando Instalación</label>
                    <input type="text" value={newApp.installCmd} onChange={(e) => setNewApp({ ...newApp, installCmd: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 font-bold text-sm font-mono outline-none focus:border-[#00A3FF] transition-all" placeholder="npm install"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Build <span className="text-slate-300">(opcional)</span></label>
                    <input type="text" value={newApp.buildCmd} onChange={(e) => setNewApp({ ...newApp, buildCmd: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 font-bold text-sm font-mono outline-none focus:border-[#00A3FF] transition-all" placeholder="npm run build"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Start cmd <span className="text-slate-300">(vacío = usa fichero inicio)</span></label>
                    <input type="text" value={newApp.startCmd} onChange={(e) => setNewApp({ ...newApp, startCmd: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 font-bold text-sm font-mono outline-none focus:border-[#00A3FF] transition-all" placeholder="node dist/index.js"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── Core fields ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre del Proyecto <span className="text-red-400">*</span></label>
                <input type="text" value={newApp.name} onChange={(e) => setNewApp({ ...newApp, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-bold text-sm outline-none focus:border-[#00A3FF] focus:bg-white transition-all shadow-inner"
                  placeholder="ej: mi-api-rest"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Fichero de Inicio</label>
                <input type="text" value={newApp.script} onChange={(e) => setNewApp({ ...newApp, script: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-bold text-sm font-mono outline-none focus:border-[#00A3FF] focus:bg-white transition-all shadow-inner"
                  placeholder="index.js"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Puerto Interno</label>
                <input type="number" value={newApp.port} onChange={(e) => setNewApp({ ...newApp, port: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-bold text-sm font-mono outline-none focus:border-[#00A3FF] focus:bg-white transition-all shadow-inner"
                />
              </div>
            </div>

            {/* ── Environment Variables Editor ── */}
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setShowEnvEditor(!showEnvEditor)}
                className="flex items-center gap-3 w-full p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl transition-all group"
              >
                <div className="w-8 h-8 bg-white border border-slate-200 rounded-xl flex items-center justify-center group-hover:bg-[#00A3FF] group-hover:text-white group-hover:border-[#00A3FF] transition-all">
                  <span className="material-symbols-outlined text-[18px]">
                    {showEnvEditor ? "keyboard_arrow_up" : "tune"}
                  </span>
                </div>
                <div className="text-left flex-1">
                  <p className="text-xs font-black text-slate-700 uppercase tracking-wide">Variables de Entorno</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {envVars.length > 0 ? `${envVars.length} variable${envVars.length !== 1 ? "s" : ""} configurada${envVars.length !== 1 ? "s" : ""}` : "Opcional — NODE_ENV, DATABASE_URL, API_KEY..."}
                  </p>
                </div>
                <span className="material-symbols-outlined text-slate-300 text-[20px]">
                  {showEnvEditor ? "expand_less" : "expand_more"}
                </span>
              </button>

              {showEnvEditor && (
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 animate-in slide-in-from-top-2 duration-200">
                  {showBulk ? (
                    <div className="space-y-3">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block ml-1">
                        Pega tu archivo .env (LLAVE=VALOR por línea)
                      </label>
                      <textarea
                        rows={6}
                        value={bulkInput}
                        onChange={(e) => setBulkInput(e.target.value)}
                        placeholder="PORT=3000&#10;DATABASE_URL=mysql://user:pass@host/db&#10;JWT_SECRET=super_secret_key"
                        className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-slate-900 font-bold text-sm font-mono outline-none focus:border-[#00A3FF] transition-all resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleBulkImport}
                          className="bg-[#00A3FF] text-white px-5 py-2.5 rounded-xl text-[11px] uppercase tracking-widest font-black transition-all hover:bg-blue-600 active:scale-95"
                        >
                          Importar Variables
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowBulk(false); setBulkInput(""); }}
                          className="bg-white border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl text-[11px] uppercase tracking-widest font-black transition-all hover:bg-slate-100"
                        >
                          Volver
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {envVars.length === 0 ? (
                        <p className="text-center text-sm text-slate-400 py-4">
                          Sin variables. Haz clic en <strong>+ Agregar Variable</strong> o <strong>Pegar en masa</strong>.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {envVars.map((v, i) => (
                            <div key={i} className="flex items-center gap-3">
                              <input
                                type="text"
                                value={v.key}
                                onChange={(e) => updateEnvVar(i, "key", e.target.value)}
                                placeholder="VARIABLE_NOMBRE"
                                className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold text-sm font-mono outline-none focus:border-[#00A3FF] transition-all"
                              />
                              <span className="text-slate-300 font-black text-lg select-none">=</span>
                              <input
                                type="text"
                                value={v.value}
                                onChange={(e) => updateEnvVar(i, "value", e.target.value)}
                                placeholder="valor"
                                className="flex-[2] bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold text-sm font-mono outline-none focus:border-[#00A3FF] transition-all"
                              />
                              <button
                                type="button"
                                onClick={() => removeEnvVar(i)}
                                className="w-9 h-9 rounded-xl bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shrink-0"
                              >
                                <span className="material-symbols-outlined text-[16px]">close</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={addEnvVar}
                          className="flex items-center gap-2 px-5 py-3 bg-white border-2 border-dashed border-slate-200 hover:border-[#00A3FF] hover:text-[#00A3FF] rounded-xl text-slate-400 font-black text-[11px] uppercase tracking-wide transition-all"
                        >
                          <span className="material-symbols-outlined text-[16px]">add</span>
                          Agregar Variable
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowBulk(true)}
                          className="flex items-center gap-2 px-5 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 font-black text-[11px] uppercase tracking-wide transition-all"
                        >
                          <span className="material-symbols-outlined text-[16px]">content_paste</span>
                          Pegar en masa (.env)
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>


            {/* ── Submit ── */}
            <div className="flex items-center gap-4 pt-2">
              <button
                disabled={createMutation.isPending || !isFormValid}
                onClick={() => createMutation.mutate()}
                className="bg-[#00A3FF] px-12 py-5 rounded-2xl text-white font-black uppercase text-[11px] tracking-widest shadow-xl shadow-[#00A3FF]/20 hover:bg-[#008EE0] active:scale-[0.98] transition-all disabled:opacity-40 flex items-center gap-2"
              >
                {createMutation.isPending ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {sourceMode === "github" ? "Clonando y Desplegando..." : "Provisionando..."}
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">
                      {sourceMode === "github" ? "deployed_code" : "rocket_launch"}
                    </span>
                    {sourceMode === "github" ? "Clonar y Desplegar" : "Provisionar Entorno Node"}
                  </>
                )}
              </button>

              {sourceMode === "github" && newApp.githubRepo && (
                <a
                  href={newApp.githubRepo.startsWith("http") ? newApp.githubRepo : `https://github.com/${resolvedRepo.repoPath}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <GitHubIcon className="w-3.5 h-3.5" />
                  Ver Repositorio
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── App Cards ── */}
      {apps?.length === 0 && !showCreate ? (
        <div className="p-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#00A3FF]/20 transition-all"
          onClick={() => setShowCreate(true)}
        >
          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-slate-200 mb-6 shadow-sm">
            <span className="material-symbols-outlined text-5xl">javascript</span>
          </div>
          <h4 className="text-lg font-black text-slate-900 uppercase">Sin Aplicaciones Activas</h4>
          <p className="text-sm text-slate-500 mt-2 font-medium">Comienza a desplegar servidores de alto rendimiento usando PM2 Native.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          {apps?.map((app: any) => (
            <div key={app.id} className="bg-white border border-slate-200 p-8 rounded-[2.5rem] flex flex-col xl:flex-row justify-between items-center gap-10 group hover:border-[#00A3FF]/30 transition-all duration-500 shadow-sm">
              <div className="flex gap-6 items-center w-full xl:w-1/3">
                <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-[#00A3FF] group-hover:text-white transition-all shadow-sm shrink-0">
                  <span className="material-symbols-outlined text-3xl">javascript</span>
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-slate-900 group-hover:text-[#00A3FF] transition-colors flex items-center gap-3">
                    {app.name}
                    <span className={`w-2.5 h-2.5 rounded-full ${app.status === "online" ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" : app.status === "stopped" ? "bg-amber-500" : "bg-red-500"}`} />
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Puerto: <strong className="text-[#00A3FF]">{app.port}</strong></span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Node: <strong className="text-[#00A3FF]">v{app.version}</strong></span>
                    <span className="text-[10px] font-black text-[#00A3FF] tracking-widest">https://{app.domain}</span>
                    {app.github_repo && (
                      <a href={`https://github.com/${app.github_repo}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px] font-black text-slate-500 hover:text-slate-800 transition-colors"
                      >
                        <GitHubIcon className="w-3 h-3" /> {app.github_repo}
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-center flex-1 w-full xl:w-auto border-y xl:border-y-0 xl:border-x border-slate-100 py-6 xl:py-0 px-8">
                <div className="grid grid-cols-2 gap-8 flex-1">
                  <div className="text-center md:text-left">
                    <span className="block text-[10px] uppercase tracking-widest text-slate-300 font-black mb-2">Carga CPU</span>
                    <span className="text-sm font-black text-slate-700 font-mono bg-slate-50 px-3 py-1 rounded-lg">{app.cpu ?? 0}%</span>
                  </div>
                  <div className="text-center md:text-left">
                    <span className="block text-[10px] uppercase tracking-widest text-slate-300 font-black mb-2">Memoria RAM</span>
                    <span className="text-sm font-black text-slate-700 font-mono bg-slate-50 px-3 py-1 rounded-lg">{Math.round((app.memory ?? 0) / 1024 / 1024)}MB</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100 shadow-inner">
                  <button onClick={() => manageMutation.mutate({ id: app.id, action: "start" })}
                    className="px-4 py-2 text-[10px] uppercase font-black tracking-widest text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all">Iniciar</button>
                  <button onClick={() => manageMutation.mutate({ id: app.id, action: "restart" })}
                    className="px-4 py-2 text-[10px] uppercase font-black tracking-widest text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-xl transition-all">Reiniciar</button>
                  <button onClick={() => manageMutation.mutate({ id: app.id, action: "stop" })}
                    className="px-4 py-2 text-[10px] uppercase font-black tracking-widest text-red-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">Parar</button>
                  <button
                    onClick={() => npmInstallMutation.mutate(app.id)}
                    disabled={installingId === app.id}
                    className="px-4 py-2 text-[10px] uppercase font-black tracking-widest text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {installingId === app.id ? (
                      <><span className="w-3 h-3 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />Instalando...</>
                    ) : (
                      <><span className="material-symbols-outlined text-[14px]">package_2</span>npm install</>
                    )}
                  </button>
                </div>
                {installLog[app.id] && (
                  <div className="mt-2 w-full p-3 bg-slate-900 rounded-xl text-[10px] font-mono text-emerald-400 whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {installLog[app.id]}
                  </div>
                )}
              </div>

              <button onClick={() => { if (confirm("¿Eliminar aplicación permanentemente?")) deleteMutation.mutate(app.id); }}
                className="w-12 h-12 rounded-2xl bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shadow-sm"
              >
                <span className="material-symbols-outlined text-[20px]">delete</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
