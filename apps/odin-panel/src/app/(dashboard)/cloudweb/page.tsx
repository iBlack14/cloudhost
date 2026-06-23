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

type BuildType = "nixpacks" | "dockerfile" | "railpack" | "heroku buildpacks" | "paketo buildpacks" | "static";
type EnvMode = "keyvalue" | "bulk";

interface EnvVar { key: string; value: string; }

const BUILD_TYPES: { type: BuildType; label: string; desc: string; isNew?: boolean }[] = [
  { type: "nixpacks", label: "Nixpacks", desc: "Compilación inteligente recomendada sin configuración", isNew: false },
  { type: "dockerfile", label: "Dockerfile", desc: "Usa las instrucciones personalizadas de tu propio Dockerfile", isNew: false },
  { type: "railpack", label: "Railpack", desc: "El constructor superveloz nativo de Railway", isNew: true },
  { type: "heroku buildpacks", label: "Heroku Buildpacks", desc: "Soporte clásico multi-lenguaje de Heroku", isNew: false },
  { type: "paketo buildpacks", label: "Paketo Buildpacks", desc: "Cloud Native Buildpacks oficiales para producción", isNew: false },
  { type: "static", label: "Static", desc: "Servido de forma directa y optimizada por Nginx (sin Docker)", isNew: false },
];

const EMPTY_APP = {
  name: "",
  githubRepo: "",
  githubBranch: "main",
  domain: "",
  port: "3000",
  buildType: "nixpacks" as BuildType,
  linkedDomain: "",
};

const GitHubIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={`fill-current ${className}`} xmlns="http://www.w3.org/2000/svg">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

export default function CloudWebPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newApp, setNewApp] = useState(EMPTY_APP);
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [bulkEnvText, setBulkEnvText] = useState("");
  const [envMode, setEnvMode] = useState<EnvMode>("keyvalue");
  const [showEnvEditor, setShowEnvEditor] = useState(false);

  // Modales
  const [diskQuotaAlert, setDiskQuotaAlert] = useState(false);
  const [viewingLogsAppId, setViewingLogsAppId] = useState<string | null>(null);
  const [editingEnvApp, setEditingEnvApp] = useState<any | null>(null);
  const [editEnvVars, setEditEnvVars] = useState<EnvVar[]>([]);
  const [editBulkEnvText, setEditBulkEnvText] = useState("");
  const [editEnvMode, setEditEnvMode] = useState<EnvMode>("keyvalue");
  const [showBuildTypeDropdown, setShowBuildTypeDropdown] = useState(false);

  // IA Asistente y Logs Parsing
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);
  const [issuingSslAppId, setIssuingSslAppId] = useState<string | null>(null);
  const [logsTab, setLogsTab] = useState<"live" | "history">("live");
  const [viewingDeploymentId, setViewingDeploymentId] = useState<string | null>(null);



  const parseLogLine = (log: string) => {
    const match = log.match(/^\[(info|success|debug|error)\]\s*(.*)$/);
    if (match) {
      return {
        type: match[1] as "info" | "success" | "debug" | "error",
        message: match[2],
      };
    }
    const lower = log.toLowerCase();
    let type: "info" | "success" | "debug" | "error" = "info";
    if (lower.includes("error:") || lower.includes("failed") || lower.includes("failed:")) {
      type = "error";
    } else if (lower.includes("success") || lower.includes("successfully")) {
      type = "success";
    } else if (lower.includes("debug") || lower.includes("dangling") || lower.startsWith("#")) {
      type = "debug";
    }
    return { type, message: log };
  };

  const handleExplainLogs = () => {
    if (appLogs.length === 0) {
      setAiExplanation("No hay logs disponibles para analizar.");
      return;
    }

    setIsExplaining(true);
    setTimeout(() => {
      let hasError = false;
      let errorLines: string[] = [];
      let currentStep = "Proceso General";

      for (const line of appLogs) {
        if (line.includes("[error]") || line.toLowerCase().includes("failed") || line.toLowerCase().includes("error:")) {
          hasError = true;
          errorLines.push(line);
        }
        if (line.includes("Initializing deployment")) currentStep = "Inicialización";
        else if (line.includes("Cloning branch")) currentStep = "Clonado del Repositorio Git";
        else if (line.includes("Compiling application") || line.includes("nixpacks build")) currentStep = "Compilación con Nixpacks";
        else if (line.includes("npm install") || line.includes("installing")) currentStep = "Instalación de Dependencias";
        else if (line.includes("Starting Docker container")) currentStep = "Levantamiento del Contenedor";
        else if (line.includes("Nginx configuration applied")) currentStep = "Configuración del Proxy Inverso";
        else if (line.includes("Deployment complete!")) currentStep = "Despliegue Exitoso";
      }

      const activeApp = apps?.find((a: any) => a.id === viewingLogsAppId);
      const appName = activeApp?.name || "la aplicación";
      const isStillBuilding = activeApp?.status === "building";

      let explanation = "";

      if (hasError) {
        explanation = `### 🔍 Diagnóstico de IA: Fallo en el Despliegue\n\n` +
          `Hemos detectado un error durante la fase de **${currentStep}** en **${appName}**.\n\n` +
          `**Detalles del error detectado:**\n` +
          `\`\`\`text\n${errorLines.slice(-3).join("\n")}\n\`\`\`\n\n` +
          `**Causas comunes y soluciones propuestas:**\n` +
          `1. **Error en build/compilación**: Si el error ocurrió en \`npm run build\`, asegúrate de que tu proyecto compila correctamente de manera local y que todas las dependencias (\`devDependencies\` y \`dependencies\`) estén bien declaradas en tu \`package.json\`.\n` +
          `2. **Puerto incorrecto**: Asegúrate de que el puerto del contenedor configurado coincide con el que escucha tu servidor web (por ejemplo, Next.js usa 3000, Vite 5173, Express 3000, etc.).\n` +
          `3. **Límite de recursos o espacio**: Verifica si el disco del VPS o la cuota asignada a tu plan no se ha agotado.`;
      } else if (isStillBuilding) {
        explanation = `### ⚙️ Diagnóstico de IA: Compilación en Progreso\n\n` +
          `La aplicación **${appName}** se está compilando activamente usando **Nixpacks**.\n\n` +
          `* **Fase Actual:** \`${currentStep}\`\n` +
          `* **Estado:** Todo parece ir bien. Nixpacks está analizando tu código fuente de manera inteligente para descargar el runtime adecuado (Node.js, Python, etc.) y compilar las dependencias sin requerir un Dockerfile manual.\n\n` +
          `*Consejo: El primer despliegue puede tardar un poco más debido a la descarga inicial del entorno. Los siguientes despliegues usarán la caché y serán mucho más rápidos.*`;
      } else {
        explanation = `### 🚀 Diagnóstico de IA: Despliegue Exitoso\n\n` +
          `¡La aplicación **${appName}** se ha desplegado correctamente y está en línea!\n\n` +
          `* **Fase Final:** \`Contenedor Iniciado e Habilitado en Nginx\`\n` +
          `* **Uptime:** El contenedor Docker está activo.\n` +
          `* **Detalle del Endpoint:** Las peticiones al dominio de producción son redirigidas a través del proxy inverso Nginx hacia el contenedor Docker de forma transparente.\n\n` +
          `**Recomendación:** Si la página devuelve un error 502 o no carga, revisa que el servidor web interno de tu aplicación esté escuchando en la dirección \`0.0.0.0\` (y no solo en \`localhost\` / \`127.0.0.1\`) en el puerto configurado.`;
      }

      setAiExplanation(explanation);
      setIsExplaining(false);
    }, 600);
  };

  // ── Fetch user domains ──────────────────────────────────────────────────────
  const { data: userDomains = [] } = useQuery({
    queryKey: ["odin_domains_for_cloudweb"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/odin-panel/domains`, { headers: authHeaders() });
      if (!res.ok) return [];
      return (await res.json()).data ?? [];
    },
    enabled: showCreate,
  });

  // ── Fetch logs for dynamic logs viewing modal ──────────────────────────────
  const { data: appLogs = [] } = useQuery({
    queryKey: ["odin_cloudweb_logs", viewingLogsAppId],
    queryFn: async () => {
      if (!viewingLogsAppId) return [];
      const res = await fetch(`${API_BASE}/odin-panel/cloud-web/${viewingLogsAppId}/logs`, { headers: authHeaders() });
      if (!res.ok) return ["No se pudieron cargar los logs de ejecución."];
      return (await res.json()).data ?? [];
    },
    enabled: !!viewingLogsAppId,
    refetchInterval: 3000,
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

  // ── Env vars helpers ────────────────────────────────────────────────────────
  const addEnvVar = () => setEnvVars((prev) => [...prev, { key: "", value: "" }]);
  const removeEnvVar = (i: number) => setEnvVars((prev) => prev.filter((_, idx) => idx !== i));
  const updateEnvVar = (i: number, field: "key" | "value", val: string) =>
    setEnvVars((prev) => prev.map((v, idx) => (idx === i ? { ...v, [field]: val } : v)));

  // Parser para pegar en Bulk (.env)
  const parseBulkEnv = (text: string): Record<string, string> => {
    const lines = text.split("\n");
    const record: Record<string, string> = {};
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index === -1) continue;
      const key = trimmed.slice(0, index).trim();
      const val = trimmed.slice(index + 1).replace(/^['"]|['"]$/g, "").trim();
      if (key) record[key] = val;
    }
    return record;
  };

  const buildEnvVarsRecord = (): Record<string, string> => {
    if (envMode === "bulk") {
      return parseBulkEnv(bulkEnvText);
    }
    return Object.fromEntries(envVars.filter((v) => v.key.trim()).map((v) => [v.key.trim(), v.value]));
  };

  const buildPayload = () => {
    return {
      name: newApp.name,
      githubRepo: resolvedRepo.repoPath,
      githubBranch: newApp.githubBranch || "main",
      domain: newApp.domain,
      port: parseInt(newApp.port, 10),
      buildType: newApp.buildType,
      envVars: buildEnvVarsRecord(),
    };
  };

  // ── Queries & mutations ─────────────────────────────────────────────────────
  const { data: apps, isLoading } = useQuery({
    queryKey: ["odin_cloudweb_apps"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/odin-panel/cloud-web`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Load failed");
      return (await res.json()).data;
    },
    refetchInterval: 5000,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/odin-panel/cloud-web/deploy`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json();
      if (!res.ok) {
        throw { message: data?.error?.message ?? "Error creating app", code: data?.error?.code };
      }
      return data;
    },
    onSuccess: (data: any) => {
      setShowCreate(false);
      setNewApp(EMPTY_APP);
      setEnvVars([]);
      setBulkEnvText("");
      setEnvMode("keyvalue");
      setShowEnvEditor(false);
      queryClient.invalidateQueries({ queryKey: ["odin_cloudweb_apps"] });
      
      // Auto-open logs for the newly deployed app
      if (data?.data?.id) {
        setViewingLogsAppId(data.data.id);
      }
    },
    onError: (e: any) => {
      if (e.code === "DISK_LIMIT_EXCEEDED" || e.message?.toLowerCase().includes("espacio") || e.message?.toLowerCase().includes("disk")) {
        setDiskQuotaAlert(true);
      } else {
        alert(e.message ?? "Ocurrió un error inesperado al compilar.");
      }
    },
  });

  const manageMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: string }) => {
      const res = await fetch(`${API_BASE}/odin-panel/cloud-web/${id}/${action}`, { method: "POST", headers: authHeaders() });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error?.message ?? "Action failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["odin_cloudweb_apps"] }),
    onError: (e: Error) => alert(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/odin-panel/cloud-web/${id}`, { method: "DELETE", headers: authHeaders() });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error?.message ?? "Delete failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["odin_cloudweb_apps"] }),
    onError: (e: Error) => alert(e.message),
  });

  const updateEnvMutation = useMutation({
    mutationFn: async ({ id, envs }: { id: string; envs: Record<string, string> }) => {
      const res = await fetch(`${API_BASE}/odin-panel/cloud-web/${id}/env`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ envs }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error?.message ?? "Error al actualizar las variables");
      return data;
    },
    onSuccess: () => {
      setEditingEnvApp(null);
      queryClient.invalidateQueries({ queryKey: ["odin_cloudweb_apps"] });
    },
    onError: (e: Error) => alert(e.message),
  });

  const handleOpenEnvModal = (app: any) => {
    setEditingEnvApp(app);
    const vars = Object.entries(app.env_vars || {}).map(([key, value]) => ({ key, value: String(value) }));
    setEditEnvVars(vars);
    const bulk = Object.entries(app.env_vars || {})
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");
    setEditBulkEnvText(bulk);
    setEditEnvMode("keyvalue");
  };

  const handleSaveEnv = () => {
    if (!editingEnvApp) return;
    let envs: Record<string, string> = {};
    if (editEnvMode === "bulk") {
      envs = parseBulkEnv(editBulkEnvText);
    } else {
      envs = Object.fromEntries(editEnvVars.filter((v) => v.key.trim()).map((v) => [v.key.trim(), v.value]));
    }
    updateEnvMutation.mutate({ id: editingEnvApp.id, envs });
  };

  const handleIssueSsl = async (appId: string) => {
    setIssuingSslAppId(appId);
    try {
      const res = await fetch(`${API_BASE}/odin-panel/cloud-web/${appId}/ssl`, {
        method: "POST",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message ?? "Error al activar SSL");
      }
      alert(data?.message ?? "SSL activado correctamente.");
      queryClient.invalidateQueries({ queryKey: ["odin_cloudweb_apps"] });
    } catch (err: any) {
      alert(err.message || "Error al solicitar el certificado SSL. Asegúrate de que tu dominio apunta al servidor.");
    } finally {
      setIssuingSslAppId(null);
    }
  };

  const redeployMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/odin-panel/cloud-web/${id}/deploy`, {
        method: "POST",
        headers: authHeaders(),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error?.message ?? "Error al desplegar cambios.");
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["odin_cloudweb_apps"] });
      if (data?.data?.app_id) {
        setViewingLogsAppId(data.data.app_id);
        setLogsTab("live");
      }
    },
    onError: (e: Error) => alert(e.message),
  });

  const { data: appDeployments = [], refetch: refetchDeployments } = useQuery({
    queryKey: ["odin_cloudweb_deployments", viewingLogsAppId],
    queryFn: async () => {
      if (!viewingLogsAppId) return [];
      const res = await fetch(`${API_BASE}/odin-panel/cloud-web/${viewingLogsAppId}/deployments`, { headers: authHeaders() });
      if (!res.ok) return [];
      return (await res.json()).data ?? [];
    },
    enabled: !!viewingLogsAppId,
    refetchInterval: (query) => {
      const hasBuilding = query.state.data?.some((d: any) => d.status === "building");
      return hasBuilding ? 3000 : false;
    }
  });

  const { data: deploymentLogs = [] } = useQuery({
    queryKey: ["odin_cloudweb_deployment_logs", viewingDeploymentId],
    queryFn: async () => {
      if (!viewingDeploymentId) return [];
      const res = await fetch(`${API_BASE}/odin-panel/cloud-web/deployments/${viewingDeploymentId}/logs`, { headers: authHeaders() });
      if (!res.ok) return ["No se pudieron cargar los logs de esta compilación."];
      return (await res.json()).data ?? [];
    },
    enabled: !!viewingDeploymentId,
    refetchInterval: () => {
      const currentDeploy = appDeployments.find((d: any) => d.id === viewingDeploymentId);
      return currentDeploy?.status === "building" ? 3000 : false;
    }
  });



  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-24 bg-white border border-slate-200 rounded-[3rem] animate-pulse">
        <div className="w-12 h-12 border-4 border-slate-100 border-t-[#00A3FF] rounded-full animate-spin mb-4" />
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Estableciendo conexión con Docker daemon...</p>
      </div>
    );
  }

  const isFormValid =
    newApp.name.trim() &&
    newApp.domain.trim() &&
    newApp.githubRepo.includes("/") &&
    (newApp.buildType !== "static" ? newApp.port.trim() : true);

  return (
    <div className="space-y-12 animate-in fade-in duration-700 relative">
      
      {/* ⚠️ MODAL ALERTA DE ESPACIO DE DISCO */}
      {diskQuotaAlert && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-[2.5rem] max-w-md w-full p-8 text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 mx-auto shadow-inner">
              <span className="material-symbols-outlined text-4xl">warning</span>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-950 uppercase tracking-tight">Requieres más espacio</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Has alcanzado el límite de almacenamiento de tu plan. Para aumentar tu capacidad o liberar espacio, comunícate con el equipo de soporte técnico.
              </p>
            </div>
            <div className="flex flex-col gap-2.5 pt-2">
              <a
                href="https://odiseacloud.com/soporte"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 rounded-xl bg-[#00A3FF] text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[#00A3FF]/15 hover:bg-[#008EE0] transition-all"
              >
                Comunicarse con Soporte
              </a>
              <button
                onClick={() => setDiskQuotaAlert(false)}
                className="w-full py-3.5 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-800 hover:bg-slate-50 text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Cerrar Ventana
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visor de logs Docker y Despliegues */}
      {viewingLogsAppId && (() => {
        const activeApp = apps?.find((a: any) => a.id === viewingLogsAppId);
        const isBuilding = activeApp?.status === "building";
        const currentLogs = viewingDeploymentId ? deploymentLogs : appLogs;

        return (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
            <div className="bg-[#050B14] border border-[#00A3FF]/20 rounded-[2.5rem] max-w-4xl w-full h-[550px] flex flex-col p-8 shadow-2xl animate-in zoom-in-95 duration-200">
              
              <div className="flex items-center justify-between border-b border-[#00A3FF]/25 pb-4 mb-4 shrink-0">
                <div className="flex items-center gap-6">
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    {viewingDeploymentId 
                      ? "Logs de Compilación" 
                      : logsTab === "live" 
                        ? (isBuilding ? "Deployment Logs" : "Docker Container Logs") 
                        : "Historial de Despliegues"}
                  </h3>
                  {!viewingDeploymentId && (
                    <div className="flex gap-1.5 p-1 bg-[#111B2F] border border-[#00A3FF]/15 rounded-xl">
                      <button
                        onClick={() => setLogsTab("live")}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${logsTab === "live" ? "bg-[#00A3FF] text-white" : "text-slate-400 hover:text-white"}`}
                      >
                        Logs en Vivo
                      </button>
                      <button
                        onClick={() => {
                          setLogsTab("history");
                          refetchDeployments();
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${logsTab === "history" ? "bg-[#00A3FF] text-white" : "text-slate-400 hover:text-white"}`}
                      >
                        Historial
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {viewingDeploymentId && (
                    <button 
                      onClick={() => setViewingDeploymentId(null)}
                      className="px-4 py-2 bg-[#111B2F] border border-[#00A3FF]/20 text-[#00A3FF] rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#00A3FF]/10 flex items-center gap-1.5 transition-all"
                    >
                      <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                      Volver
                    </button>
                  )}
                  {logsTab === "live" && currentLogs.length > 0 && (
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(currentLogs.join("\n"));
                        alert("¡Logs copiados al portapapeles!");
                      }}
                      title="Copiar Logs"
                      className="w-8 h-8 rounded-lg bg-[#111B2F] hover:bg-[#00A3FF]/15 text-[#00A3FF] hover:text-[#00E5FF] flex items-center justify-center transition-colors active:scale-95 border border-[#00A3FF]/20"
                    >
                      <span className="material-symbols-outlined text-[16px]">content_copy</span>
                    </button>
                  )}
                  <button onClick={() => { setViewingLogsAppId(null); setViewingDeploymentId(null); }} className="w-8 h-8 rounded-full hover:bg-red-500/10 text-slate-400 hover:text-red-400 flex items-center justify-center transition-all border border-[#00A3FF]/15 hover:border-red-500/20">
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>
              </div>

              {/* Contenido Dinámico de la Pestaña */}
              {logsTab === "live" || viewingDeploymentId ? (
                <div className="flex-1 overflow-y-auto bg-[#0A1221] border border-[#00A3FF]/15 rounded-2xl py-3 px-0 font-mono text-[11px] text-slate-300 leading-relaxed logs-terminal flex flex-col">
                  <style>{`
                    .logs-terminal::-webkit-scrollbar {
                      width: 6px;
                      height: 6px;
                    }
                    .logs-terminal::-webkit-scrollbar-track {
                      background: #0A1221;
                    }
                    .logs-terminal::-webkit-scrollbar-thumb {
                      background: rgba(0, 163, 255, 0.2);
                      border-radius: 9999px;
                    }
                    .logs-terminal::-webkit-scrollbar-thumb:hover {
                      background: rgba(0, 163, 255, 0.4);
                    }
                  `}</style>
                  {currentLogs.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-slate-500 text-[10px] font-bold uppercase tracking-widest py-10">
                      Cargando líneas de log...
                    </div>
                  ) : (
                    currentLogs.map((log: string, idx: number) => {
                      const { type, message } = parseLogLine(log);
                      let borderLeftColor = "transparent";
                      let badgeClass = "text-slate-400 bg-slate-800 border border-slate-700/50";
                      
                      if (type === "info") {
                        borderLeftColor = "#00A3FF";
                        badgeClass = "text-[#00A3FF] bg-[#00A3FF]/10 border border-[#00A3FF]/20";
                      } else if (type === "success") {
                        borderLeftColor = "#00E5FF";
                        badgeClass = "text-[#00E5FF] bg-[#00E5FF]/10 border border-[#00E5FF]/20";
                      } else if (type === "debug") {
                        borderLeftColor = "#1e293b";
                        badgeClass = "text-slate-400 bg-[#111B2F]/40 border border-slate-700/30";
                      } else if (type === "error") {
                        borderLeftColor = "#ef4444";
                        badgeClass = "text-red-400 bg-red-500/10 border border-red-500/20";
                      }

                      return (
                        <div 
                          key={idx} 
                          className="flex items-stretch hover:bg-[#111B2F]/40 transition-colors border-l-4 py-0.5 pl-4 pr-3" 
                          style={{ borderLeftColor }}
                        >
                          <div className="flex items-center shrink-0 w-20 select-none">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest text-center w-16 block ${badgeClass}`}>
                              {type}
                            </span>
                          </div>
                          <div className="flex-1 font-mono text-[11px] text-slate-300 whitespace-pre-wrap select-text leading-relaxed pl-3">
                            {message}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-4 pr-2 logs-terminal">
                  <style>{`
                    .logs-terminal::-webkit-scrollbar {
                      width: 6px;
                      height: 6px;
                    }
                    .logs-terminal::-webkit-scrollbar-track {
                      background: #050B14;
                    }
                    .logs-terminal::-webkit-scrollbar-thumb {
                      background: rgba(0, 163, 255, 0.2);
                      border-radius: 9999px;
                    }
                  `}</style>
                  {appDeployments.length === 0 ? (
                    <div className="text-center py-16 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Sin registros de compilación.
                    </div>
                  ) : (
                    appDeployments.map((d: any, idx: number) => {
                      const isDeployBuilding = d.status === "building";
                      const isDeploySuccess = d.status === "success";
                      const isDeployError = d.status === "error";

                      const statusColors = isDeployBuilding
                        ? "bg-[#00A3FF] animate-pulse shadow-[0_0_8px_#00a3ff]"
                        : isDeploySuccess
                          ? "bg-emerald-500 shadow-[0_0_8px_#10b981]"
                          : isDeployError
                            ? "bg-red-500"
                            : "bg-slate-400";

                      const relativeTime = (() => {
                        const diffMs = Date.now() - new Date(d.created_at).getTime();
                        const diffMins = Math.floor(diffMs / 60000);
                        const diffHours = Math.floor(diffMins / 60);
                        const diffDays = Math.floor(diffHours / 24);

                        if (diffMins < 1) return "hace unos segundos";
                        if (diffMins < 60) return `hace ${diffMins}m`;
                        if (diffHours < 24) return `hace ${diffHours}h`;
                        return `hace ${diffDays}d`;
                      })();

                      const durationStr = d.duration_seconds
                        ? `${Math.floor(d.duration_seconds / 60)}m ${d.duration_seconds % 60}s`
                        : "";

                      return (
                        <div key={d.id} className="bg-[#111B2F] border border-[#00A3FF]/10 hover:border-[#00A3FF]/25 p-5 rounded-2xl flex justify-between items-center gap-4 transition-all">
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${statusColors}`} />
                              <h4 className="text-[10px] font-black text-white uppercase tracking-wider">
                                {idx + 1}. {d.status === "building" ? "Compilando" : d.status === "success" ? "Completado" : d.status === "error" ? "Error" : "Cancelado"}
                              </h4>
                              <span className="text-[#00A3FF]/20 text-[10px] font-bold">•</span>
                              <span className="text-slate-400 text-[10px] font-bold">{relativeTime}</span>
                              {durationStr && (
                                <>
                                  <span className="text-[#00A3FF]/20 text-[10px] font-bold">•</span>
                                  <span className="text-[#00E5FF] text-[10px] font-mono font-black uppercase tracking-wider flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[12px]">schedule</span>
                                    {durationStr}
                                  </span>
                                </>
                              )}
                            </div>
                            <p className="text-slate-300 text-[11px] font-medium leading-relaxed truncate select-text">
                              {d.commit_message || "Manual deployment"}
                            </p>
                            {d.commit_hash && d.commit_hash !== "unknown" && (
                              <p className="text-[9px] text-slate-500 font-mono tracking-wider uppercase select-text">
                                Commit: <span className="text-[#00A3FF] font-black">{d.commit_hash}</span>
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => setViewingDeploymentId(d.id)}
                            className="bg-[#00A3FF]/15 hover:bg-[#00A3FF] text-[#00A3FF] hover:text-white px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shrink-0 active:scale-95"
                          >
                            Ver Logs
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

            </div>
          </div>
        );
      })()}

      {/* Modal Editar Variables de Entorno */}

      {editingEnvApp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-[2.5rem] max-w-2xl w-full max-h-[90vh] flex flex-col p-8 shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#00A3FF]/10 text-[#00A3FF] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">tune</span>
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Variables de Entorno</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                    Modificar configuraciones de {editingEnvApp.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingEnvApp(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar">
              {/* Selector de modo Clave-Valor o Bulk */}
              <div className="flex gap-2 p-1 bg-slate-100 rounded-xl max-w-xs">
                <button
                  type="button"
                  onClick={() => {
                    const parsed = parseBulkEnv(editBulkEnvText);
                    const vars = Object.entries(parsed).map(([key, value]) => ({ key, value }));
                    setEditEnvVars(vars);
                    setEditEnvMode("keyvalue");
                  }}
                  className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${editEnvMode === "keyvalue" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
                >
                  Clave-Valor
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const bulk = editEnvVars
                      .filter((v) => v.key.trim())
                      .map((v) => `${v.key.trim()}=${v.value}`)
                      .join("\n");
                    setEditBulkEnvText(bulk);
                    setEditEnvMode("bulk");
                  }}
                  className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${editEnvMode === "bulk" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
                >
                  Pegar .env (Masivo)
                </button>
              </div>

              {editEnvMode === "keyvalue" ? (
                <div className="space-y-4">
                  {editEnvVars.length === 0 ? (
                    <p className="text-center text-[11px] font-bold text-slate-400 py-6">Ninguna variable añadida.</p>
                  ) : (
                    <div className="space-y-3">
                      {editEnvVars.map((v, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <input
                            type="text"
                            value={v.key}
                            onChange={(e) => {
                              const updated = [...editEnvVars];
                              updated[i].key = e.target.value;
                              setEditEnvVars(updated);
                            }}
                            placeholder="NOMBRE_VARIABLE"
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold text-sm font-mono outline-none focus:border-[#00A3FF] focus:bg-white transition-all"
                          />
                          <span className="text-slate-300 font-black text-lg select-none">=</span>
                          <input
                            type="text"
                            value={v.value}
                            onChange={(e) => {
                              const updated = [...editEnvVars];
                              updated[i].value = e.target.value;
                              setEditEnvVars(updated);
                            }}
                            placeholder="valor"
                            className="flex-[2] bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold text-sm font-mono outline-none focus:border-[#00A3FF] focus:bg-white transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setEditEnvVars(editEnvVars.filter((_, idx) => idx !== i));
                            }}
                            className="w-9 h-9 rounded-xl bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shrink-0"
                          >
                            <span className="material-symbols-outlined text-[16px]">close</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setEditEnvVars([...editEnvVars, { key: "", value: "" }])}
                    className="flex items-center gap-2 px-5 py-3 bg-white border-2 border-dashed border-slate-200 hover:border-[#00A3FF] hover:text-[#00A3FF] rounded-xl text-slate-400 font-black text-[11px] uppercase tracking-wide transition-all"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Agregar Variable
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Pega tus variables aquí (ej. PORT=3000)
                  </label>
                  <textarea
                    value={editBulkEnvText}
                    onChange={(e) => setEditBulkEnvText(e.target.value)}
                    placeholder={`PORT=3000\nDATABASE_URL=postgres://...\nNEXT_PUBLIC_API_URL=https://...`}
                    className="w-full h-64 bg-slate-50 border border-slate-200 rounded-2xl p-5 text-slate-900 font-mono font-bold text-xs outline-none focus:border-[#00A3FF] focus:bg-white transition-all custom-scrollbar"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setEditingEnvApp(null)}
                className="px-6 py-4 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-800 hover:bg-slate-50 text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={updateEnvMutation.isPending}
                onClick={handleSaveEnv}
                className="bg-[#00A3FF] px-8 py-4 rounded-xl text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-[#00A3FF]/15 hover:bg-[#008EE0] active:scale-[0.98] transition-all disabled:opacity-40 flex items-center gap-2"
              >
                {updateEnvMutation.isPending ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Guardando y Reiniciando...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    Guardar Variables
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-200 pb-10">
        <div className="space-y-1.5">
          <span className="px-2.5 py-1 bg-[#00A3FF]/10 text-[#00A3FF] text-[10px] font-bold uppercase rounded-full tracking-wider">
            Docker & Nixpacks PaaS
          </span>
          <h1 className="text-5xl font-black text-slate-900 uppercase mt-2">
            Cloud <span className="text-[#00A3FF]">Web</span>
          </h1>
          <p className="text-slate-500 text-sm font-medium">
            Despliega repositorios de GitHub con Nixpacks, Dockerfiles o exportación estática de manera automática.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className={`px-10 py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest transition-all shadow-xl flex items-center gap-2 active:scale-95 ${showCreate ? "bg-slate-900 text-white" : "bg-[#00A3FF] text-white shadow-[#00A3FF]/20"}`}
        >
          <span className="material-symbols-outlined">{showCreate ? "close" : "add"}</span>
          {showCreate ? "Cancelar Despliegue" : "Crear Aplicación"}
        </button>
      </header>

      {/* Formulario de Despliegue */}
      {showCreate && (
        <div className="bg-white border border-slate-200 p-12 rounded-[3rem] shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden">
          <div className="absolute top-[-10%] right-[-5%] w-64 h-64 bg-[#00A3FF]/5 rounded-full blur-[80px] pointer-events-none" />
          <div className="relative z-10 space-y-10">

            <div>
              <h3 className="text-2xl font-black text-slate-900 uppercase">Configuración de Despliegue</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Nixpacks analiza e instala dependencias por ti</p>
            </div>

            {/* Repositorio de GitHub */}
            <div className="space-y-5 p-6 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-800 rounded-xl flex items-center justify-center text-white">
                  <GitHubIcon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-700 uppercase tracking-wide">Fuente GitHub</p>
                  <p className="text-[11px] text-slate-400">Introduce la URL pública para clonar y compilar</p>
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
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl">
                      <GitHubIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-[11px] font-mono font-bold text-slate-600 truncate">
                        {resolvedRepo.repoPath}
                      </span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Rama (Branch)</label>
                  <input type="text" value={newApp.githubBranch} onChange={(e) => setNewApp({ ...newApp, githubBranch: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 font-bold text-sm outline-none focus:border-[#00A3FF] transition-all" placeholder="main"
                  />
                </div>
              </div>
            </div>

            {/* Build Type Dropdown */}
            <div className="space-y-2 relative">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Compilación (Build Type)</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowBuildTypeDropdown(!showBuildTypeDropdown)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 flex items-center justify-between hover:bg-white focus:border-[#00A3FF] transition-all text-left shadow-inner group"
                >
                  <div>
                    <span className="text-sm font-black text-slate-900 flex items-center gap-2">
                      {BUILD_TYPES.find(b => b.type === newApp.buildType)?.label}
                      {BUILD_TYPES.find(b => b.type === newApp.buildType)?.isNew && (
                        <span className="px-1.5 py-0.5 bg-indigo-500 text-white text-[8px] font-bold rounded-md uppercase tracking-wider">New</span>
                      )}
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5 font-medium leading-relaxed">
                      {BUILD_TYPES.find(b => b.type === newApp.buildType)?.desc}
                    </p>
                  </div>
                  <span className={`material-symbols-outlined text-slate-400 transition-transform duration-200 ${showBuildTypeDropdown ? "rotate-180" : ""}`}>
                    expand_more
                  </span>
                </button>

                {showBuildTypeDropdown && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowBuildTypeDropdown(false)}
                    />
                    <div className="absolute top-[105%] left-0 w-full bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2 space-y-1 animate-in slide-in-from-top-2 duration-150 max-h-80 overflow-y-auto custom-scrollbar">
                      {BUILD_TYPES.map((bt) => (
                        <button
                          key={bt.type}
                          type="button"
                          onClick={() => {
                            setNewApp({ ...newApp, buildType: bt.type });
                            setShowBuildTypeDropdown(false);
                          }}
                          className={`w-full flex items-start gap-4 p-4 rounded-xl text-left transition-all ${newApp.buildType === bt.type ? "bg-[#00A3FF]/5 text-[#00A3FF]" : "hover:bg-slate-50 text-slate-700"}`}
                        >
                          <div className="flex items-center justify-center shrink-0 pt-0.5">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${newApp.buildType === bt.type ? "border-[#00A3FF]" : "border-slate-300"}`}>
                              {newApp.buildType === bt.type && (
                                <div className="w-2 h-2 rounded-full bg-[#00A3FF]" />
                              )}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-black flex items-center gap-2">
                              {bt.label}
                              {bt.isNew && (
                                <span className="px-1.5 py-0.5 bg-indigo-500 text-white text-[8px] font-bold rounded-md uppercase tracking-wider">New</span>
                              )}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{bt.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Domain Selector */}
            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Dominio de Producción <span className="text-red-400">*</span>
              </label>

              {userDomains.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                  {userDomains.map((d: any) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => handleDomainSelect(d.domain_name)}
                      className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                        newApp.linkedDomain === d.domain_name ? "border-[#00A3FF] bg-[#00A3FF]/5" : "border-slate-200 bg-slate-50 hover:border-slate-300"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[16px] shrink-0 ${newApp.linkedDomain === d.domain_name ? "bg-[#00A3FF] text-white" : "bg-white text-slate-400 border border-slate-200"}`}>
                        <span className="material-symbols-outlined text-[16px]">language</span>
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-black truncate ${newApp.linkedDomain === d.domain_name ? "text-[#00A3FF]" : "text-slate-700"}`}>
                          {d.domain_name}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-amber-600 font-semibold p-4 bg-amber-50 rounded-xl">Registra un dominio antes en la barra lateral.</p>
              )}
            </div>

            {/* Campos Principales */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre de la App <span className="text-red-400">*</span></label>
                <input type="text" value={newApp.name} onChange={(e) => setNewApp({ ...newApp, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-bold text-sm outline-none focus:border-[#00A3FF] focus:bg-white transition-all shadow-inner"
                  placeholder="mi-web-app"
                />
              </div>
              {newApp.buildType !== "static" && (
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Puerto Interno del Contenedor</label>
                  <input type="number" value={newApp.port} onChange={(e) => setNewApp({ ...newApp, port: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-bold text-sm font-mono outline-none focus:border-[#00A3FF] focus:bg-white transition-all shadow-inner"
                    placeholder="3000"
                  />
                </div>
              )}
            </div>

            {/* Variable de Entornos */}
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setShowEnvEditor(!showEnvEditor)}
                className="flex items-center gap-3 w-full p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl transition-all group"
              >
                <div className="w-8 h-8 bg-white border border-slate-200 rounded-xl flex items-center justify-center group-hover:bg-[#00A3FF] group-hover:text-white transition-all">
                  <span className="material-symbols-outlined text-[18px]">
                    {showEnvEditor ? "keyboard_arrow_up" : "tune"}
                  </span>
                </div>
                <div className="text-left flex-1">
                  <p className="text-xs font-black text-slate-700 uppercase tracking-wide">Variables de Entorno</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Configura claves, secretos y URLs de base de datos</p>
                </div>
                <span className="material-symbols-outlined text-slate-300 text-[20px]">
                  {showEnvEditor ? "expand_less" : "expand_more"}
                </span>
              </button>

              {showEnvEditor && (
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-6 animate-in slide-in-from-top-2 duration-200">
                  {/* Selector de modo Clave-Valor o Bulk */}
                  <div className="flex gap-2 p-1 bg-slate-100 rounded-xl max-w-xs">
                    <button
                      type="button"
                      onClick={() => {
                        const parsed = parseBulkEnv(bulkEnvText);
                        const vars = Object.entries(parsed).map(([key, value]) => ({ key, value }));
                        setEnvVars(vars);
                        setEnvMode("keyvalue");
                      }}
                      className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${envMode === "keyvalue" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
                    >
                      Clave-Valor
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const bulk = envVars
                          .filter((v) => v.key.trim())
                          .map((v) => `${v.key.trim()}=${v.value}`)
                          .join("\n");
                        setBulkEnvText(bulk);
                        setEnvMode("bulk");
                      }}
                      className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${envMode === "bulk" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
                    >
                      Pegar .env (Masivo)
                    </button>
                  </div>

                  {envMode === "keyvalue" ? (
                    <div className="space-y-4">
                      {envVars.length === 0 ? (
                        <p className="text-center text-[11px] font-bold text-slate-400 py-2">Ninguna variable añadida.</p>
                      ) : (
                        <div className="space-y-3">
                          {envVars.map((v, i) => (
                            <div key={i} className="flex items-center gap-3">
                              <input
                                type="text"
                                value={v.key}
                                onChange={(e) => updateEnvVar(i, "key", e.target.value)}
                                placeholder="NOMBRE_VARIABLE"
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
                      <button
                        type="button"
                        onClick={addEnvVar}
                        className="flex items-center gap-2 px-5 py-3 bg-white border-2 border-dashed border-slate-200 hover:border-[#00A3FF] hover:text-[#00A3FF] rounded-xl text-slate-400 font-black text-[11px] uppercase tracking-wide transition-all"
                      >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                        Agregar Variable
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pega tus variables aquí (ej. PORT=3000)</label>
                      <textarea
                        value={bulkEnvText}
                        onChange={(e) => setBulkEnvText(e.target.value)}
                        placeholder={`PORT=3000\nDATABASE_URL=postgres://...\nNEXT_PUBLIC_API_URL=https://...`}
                        className="w-full h-40 bg-white border border-slate-200 rounded-2xl p-5 text-slate-900 font-mono font-bold text-xs outline-none focus:border-[#00A3FF] transition-all custom-scrollbar"
                      />
                    </div>
                  )}

                  <div className="flex justify-end pt-4 border-t border-slate-200/50">
                    <button
                      type="button"
                      onClick={() => {
                        const record = buildEnvVarsRecord();
                        setShowEnvEditor(false);
                      }}
                      className="flex items-center gap-2 px-6 py-3 bg-[#00A3FF] hover:bg-[#008EE0] text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[16px]">save</span>
                      Guardar Variables
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Botón enviar */}
            <div className="flex pt-2">
              <button
                disabled={createMutation.isPending || !isFormValid}
                onClick={() => createMutation.mutate()}
                className="bg-[#00A3FF] px-12 py-5 rounded-2xl text-white font-black uppercase text-[11px] tracking-widest shadow-xl shadow-[#00A3FF]/20 hover:bg-[#008EE0] active:scale-[0.98] transition-all disabled:opacity-40 flex items-center gap-2"
              >
                {createMutation.isPending ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Analizando y Compilando...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
                    Desplegar en Odin PaaS
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Aplicaciones */}
      {apps?.length === 0 && !showCreate ? (
        <div className="p-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#00A3FF]/20 transition-all"
          onClick={() => setShowCreate(true)}
        >
          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-slate-200 mb-6 shadow-sm">
            <span className="material-symbols-outlined text-5xl">cloud_sync</span>
          </div>
          <h4 className="text-lg font-black text-slate-900 uppercase">Sin Despliegues Activos</h4>
          <p className="text-sm text-slate-500 mt-2 font-medium">Sube código de GitHub y compílalo usando Nixpacks en segundos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          {apps?.map((app: any) => {
            const isAppBuilding = app.status === "building";
            
            // Compiler tag colors
            const compilerColors = (() => {
              switch (app.build_type) {
                case "static": return "bg-emerald-50 text-emerald-600 border-emerald-100";
                case "dockerfile": return "bg-slate-50 text-slate-600 border-slate-200";
                default: return "bg-indigo-50 text-indigo-600 border-indigo-100";
              }
            })();

            return (
              <div key={app.id} className="bg-white border border-slate-200 hover:border-[#00A3FF]/40 p-8 rounded-[2.5rem] flex flex-col xl:flex-row justify-between items-center gap-10 group transition-all duration-500 shadow-sm hover:shadow-xl hover:shadow-[#00A3FF]/5 active:scale-[0.99]">
                <div className="flex gap-6 items-center w-full xl:w-5/12">
                  <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-[#00A3FF] group-hover:text-white transition-all shadow-sm shrink-0">
                    <span className="material-symbols-outlined text-3xl">cloud</span>
                  </div>
                  <div className="space-y-2 min-w-0 flex-1">
                    <h3 className="text-2xl font-black text-slate-900 group-hover:text-[#00A3FF] transition-colors flex items-center gap-3 truncate">
                      {app.name}
                      {app.build_type !== "static" && (
                        <span 
                          className={`w-2.5 h-2.5 rounded-full ${
                            isAppBuilding 
                              ? "bg-[#00A3FF] animate-pulse shadow-[0_0_8px_#00a3ff]" 
                              : app.status === "online" 
                                ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" 
                                : "bg-red-500"
                          }`} 
                        />
                      )}
                      {isAppBuilding && (
                        <span className="px-2 py-0.5 bg-[#00A3FF]/10 border border-[#00A3FF]/20 text-[#00A3FF] text-[8px] font-black uppercase rounded-md tracking-wider animate-pulse flex items-center gap-1">
                          <span className="w-1.5 h-1.5 border border-t-transparent border-[#00A3FF] rounded-full animate-spin" />
                          Compilando...
                        </span>
                      )}
                    </h3>
                    <div className="flex flex-wrap gap-2.5">
                      {app.build_type !== "static" && (
                        <span className="inline-flex items-center px-2.5 py-1 bg-sky-50 border border-sky-100 text-sky-600 text-[10px] font-bold rounded-xl tracking-wider uppercase select-none">
                          Puerto: <strong className="text-[#00A3FF] ml-1 font-black">{app.host_port || "Asignando..."}</strong>
                        </span>
                      )}
                      <span className={`inline-flex items-center px-2.5 py-1 border text-[10px] font-black rounded-xl tracking-wider uppercase select-none ${compilerColors}`}>
                        {app.build_type}
                      </span>
                      <a 
                        href={app.ssl_enabled ? `https://${app.domain}` : `http://${app.domain}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#00A3FF]/5 hover:bg-[#00A3FF]/10 border border-[#00A3FF]/10 hover:border-[#00A3FF]/30 text-[#00A3FF] text-[10px] font-black rounded-xl tracking-wider transition-all select-all lowercase"
                      >
                        <span className="material-symbols-outlined text-[11px] shrink-0">open_in_new</span>
                        {app.domain}
                      </a>
                      {app.ssl_enabled ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-100 text-emerald-600 text-[10px] font-bold rounded-xl tracking-wider uppercase select-none">
                          <span className="material-symbols-outlined text-[11px] shrink-0 text-emerald-500">lock</span>
                          SSL Activo
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 border border-amber-100 text-amber-600 text-[10px] font-bold rounded-xl tracking-wider uppercase select-none">
                            <span className="material-symbols-outlined text-[11px] shrink-0 text-amber-500">lock_open</span>
                            Sin SSL
                          </span>
                          <button
                            onClick={() => handleIssueSsl(app.id)}
                            disabled={issuingSslAppId === app.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#00A3FF]/10 hover:bg-[#00A3FF] text-[#00A3FF] hover:text-white border border-[#00A3FF]/20 text-[9px] font-black rounded-xl tracking-wider uppercase transition-all disabled:opacity-40"
                          >
                            {issuingSslAppId === app.id ? (
                              <>
                                <span className="w-2.5 h-2.5 border border-t-transparent border-[#00A3FF] rounded-full animate-spin shrink-0 mr-1" />
                                Activando...
                              </>
                            ) : (
                              <>
                                <span className="material-symbols-outlined text-[10px] mr-1">security</span>
                                Activar SSL
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {app.github_repo && (
                        <a href={`https://github.com/${app.github_repo}`} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-350 text-slate-500 hover:text-slate-800 text-[10px] font-black rounded-xl transition-all"
                        >
                          <GitHubIcon className="w-3 h-3 text-slate-400 shrink-0" /> 
                          {app.github_repo.split("/")[1] || app.github_repo} ({app.github_branch})
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center flex-1 w-full xl:w-auto border-y xl:border-y-0 xl:border-x border-slate-100 py-6 xl:py-0 px-8 justify-end">
                  {app.build_type !== "static" ? (
                    <div className="flex gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100 shadow-inner">
                      <button 
                        onClick={() => manageMutation.mutate({ id: app.id, action: "start" })}
                        disabled={isAppBuilding || manageMutation.isPending}
                        className="px-4 py-2 text-[10px] uppercase font-black tracking-widest text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Iniciar
                      </button>
                      <button 
                        onClick={() => manageMutation.mutate({ id: app.id, action: "restart" })}
                        disabled={isAppBuilding || manageMutation.isPending}
                        className="px-4 py-2 text-[10px] uppercase font-black tracking-widest text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Reiniciar
                      </button>
                      <button 
                        onClick={() => manageMutation.mutate({ id: app.id, action: "stop" })}
                        disabled={isAppBuilding || manageMutation.isPending}
                        className="px-4 py-2 text-[10px] uppercase font-black tracking-widest text-red-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Parar
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] font-black text-emerald-500 uppercase bg-emerald-50 px-4 py-2 rounded-xl">Servido Estático Nginx</span>
                  )}

                  {app.build_type !== "static" && (
                    <>
                      <button
                        onClick={() => redeployMutation.mutate(app.id)}
                        disabled={isAppBuilding || redeployMutation.isPending}
                        className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-100 hover:bg-[#00A3FF] hover:text-white transition-all text-slate-500 text-[10px] font-black uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Desplegar últimos cambios"
                      >
                        {redeployMutation.isPending && redeployMutation.variables === app.id ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
                            Subiendo...
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-[16px]">publish</span>
                            Desplegar
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleOpenEnvModal(app)}
                        disabled={isAppBuilding}
                        className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-100 hover:bg-[#00A3FF] hover:text-white transition-all text-slate-500 text-[10px] font-black uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <span className="material-symbols-outlined text-[16px]">tune</span>
                        Variables
                      </button>
                      <button
                        onClick={() => { setViewingLogsAppId(app.id); setLogsTab("live"); }}
                        className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-100 hover:bg-[#00A3FF] hover:text-white transition-all text-slate-500 text-[10px] font-black uppercase tracking-widest"
                      >
                        <span className="material-symbols-outlined text-[16px]">terminal</span>
                        Logs
                      </button>
                    </>
                  )}

                </div>

                <button 
                  onClick={() => { if (confirm("¿Eliminar aplicación del PaaS permanentemente?")) deleteMutation.mutate(app.id); }}
                  disabled={isAppBuilding || deleteMutation.isPending}
                  className="w-12 h-12 rounded-2xl bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[20px]">delete</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
