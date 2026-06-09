"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";

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

const getWhmToken = () =>
  typeof window !== "undefined" ? window.sessionStorage.getItem("whm-access-token") : null;

const whmHeaders = (): Record<string, string> => {
  const t = getWhmToken();
  return t ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
};

interface GitInfo {
  updateAvailable: boolean;
  currentCommit?: string;
  latestCommit?: string;
  branch?: string;
  error?: string;
}

interface ProcessStatus {
  status: "running" | "success" | "failed" | null;
  step: "git_pull" | "dependencies" | "build_types" | "build_apps" | "completed" | "error" | null;
  error: string | null;
  updatedAt?: string;
}

interface UpdateStatusResponse {
  git: GitInfo;
  process: ProcessStatus | null;
}

export function UpdateWidget() {
  const [isPolling, setIsPolling] = useState(false);
  const [successReloadTimer, setSuccessReloadTimer] = useState<number | null>(null);

  // 1. Fetch update status
  const { data, refetch, isLoading } = useQuery<UpdateStatusResponse>({
    queryKey: ["whm_update_status"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/whm/update/status`, { headers: whmHeaders() });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error?.message ?? "Error fetching update status");
      return payload.data;
    },
    refetchInterval: isPolling ? 2000 : 30000, // Poll every 2s during update, otherwise 30s
  });

  const git = data?.git;
  const processStatus = data?.process;

  // Monitor the process state to turn on/off polling
  useEffect(() => {
    if (processStatus?.status === "running") {
      setIsPolling(true);
    } else {
      setIsPolling(false);
    }

    // If update completed successfully, trigger a countdown to page refresh
    if (processStatus?.status === "success" && !successReloadTimer) {
      let count = 8;
      setSuccessReloadTimer(count);
      const interval = setInterval(() => {
        count -= 1;
        setSuccessReloadTimer(count);
        if (count <= 0) {
          clearInterval(interval);
          window.location.reload();
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [processStatus?.status]);

  // 2. Mutation to run update
  const runUpdateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/whm/update/run`, {
        method: "POST",
        headers: whmHeaders(),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error?.message ?? "Failed to trigger update");
      return payload.data;
    },
    onSuccess: () => {
      setIsPolling(true);
      refetch();
    },
  });

  if (isLoading && !data) {
    return (
      <div className="bg-white border border-slate-200 rounded-[2rem] p-8 animate-pulse flex items-center justify-between shadow-sm">
        <div className="space-y-2">
          <div className="h-4 w-48 bg-slate-100 rounded"></div>
          <div className="h-3 w-32 bg-slate-50 rounded"></div>
        </div>
        <div className="h-10 w-28 bg-slate-100 rounded-xl"></div>
      </div>
    );
  }

  const isUpdating = processStatus?.status === "running";
  const hasUpdate = git?.updateAvailable;

  // Render nothing if there is no update, no current background process, and no active installation
  if (!hasUpdate && !isUpdating && !processStatus?.status) {
    return null;
  }

  const getStepLabel = (step: string | null) => {
    switch (step) {
      case "git_pull":
        return "Descargando cambios del repositorio (Git Pull)...";
      case "dependencies":
        return "Instalando dependencias (pnpm install)...";
      case "build_types":
        return "Compilando tipos compartidos del proyecto...";
      case "build_apps":
        return "Recompilando frontend Next.js y backend API...";
      case "completed":
        return "Compilación completada. Reiniciando servicios...";
      default:
        return "Actualizando sistema...";
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-[2rem] p-8 relative overflow-hidden shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${
            isUpdating 
              ? "bg-amber-50 border-amber-200 text-amber-500 animate-spin-slow" 
              : processStatus?.status === "failed"
              ? "bg-red-50 border-red-200 text-red-500"
              : "bg-[#00A3FF]/5 border-[#00A3FF]/10 text-[#00A3FF]"
          }`}>
            <span className="material-symbols-outlined text-[24px]">
              {isUpdating 
                ? "sync" 
                : processStatus?.status === "failed" 
                ? "error" 
                : "system_update_alt"}
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-black text-slate-900 uppercase text-sm tracking-tight">
                {isUpdating 
                  ? "Actualización en Curso" 
                  : processStatus?.status === "failed"
                  ? "Actualización Fallida"
                  : "Nueva Actualización Disponible"}
              </h3>
              {!isUpdating && processStatus?.status !== "failed" && (
                <span className="w-2 h-2 rounded-full bg-[#00A3FF] animate-ping"></span>
              )}
            </div>
            
            {isUpdating ? (
              <p className="text-slate-500 text-xs font-medium">
                {getStepLabel(processStatus.step)}
              </p>
            ) : processStatus?.status === "failed" ? (
              <p className="text-red-500 text-xs font-semibold">
                Error: {processStatus.error}
              </p>
            ) : (
              <p className="text-slate-500 text-xs font-medium">
                Rama: <span className="font-mono bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 text-slate-700 font-bold">{git?.branch}</span> · 
                Commit: <span className="font-mono text-[#00A3FF] font-bold">{git?.currentCommit}</span> → <span className="font-mono text-emerald-500 font-bold">{git?.latestCommit}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isUpdating ? (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200/50 px-5 py-3 rounded-2xl">
              <div className="w-4 h-4 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                Compilando...
              </span>
            </div>
          ) : successReloadTimer !== null ? (
            <div className="bg-emerald-50 border border-emerald-200 px-5 py-3 rounded-2xl text-center">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
                ¡Éxito! Recargando en {successReloadTimer}s...
              </span>
            </div>
          ) : (
            <div className="flex gap-3">
              {processStatus?.status === "failed" && (
                <button
                  onClick={() => refetch()}
                  className="px-5 py-3 bg-white text-slate-700 rounded-xl font-bold text-xs tracking-wider uppercase border border-slate-200 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                >
                  Reintentar Check
                </button>
              )}
              <button
                onClick={() => {
                  if (confirm("¿Seguro que deseas descargar los cambios y actualizar el panel? Se recompilarán todos los módulos y se reiniciará el servidor temporalmente.")) {
                    runUpdateMutation.mutate();
                  }
                }}
                disabled={runUpdateMutation.isPending}
                className="px-8 py-3 bg-[#00A3FF] text-white rounded-xl font-bold text-xs tracking-wider uppercase hover:bg-[#008EE0] transition-all shadow-lg shadow-[#00A3FF]/20 active:scale-95 disabled:opacity-40"
              >
                {runUpdateMutation.isPending ? "Iniciando..." : "Actualizar Panel"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar logic for smooth premium user experience */}
      {isUpdating && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-50 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-[#00A3FF] to-amber-400 transition-all duration-1000 animate-pulse"
            style={{ 
              width: 
                processStatus.step === "git_pull" ? "20%" :
                processStatus.step === "dependencies" ? "40%" :
                processStatus.step === "build_types" ? "60%" :
                processStatus.step === "build_apps" ? "85%" : "95%"
            }}
          />
        </div>
      )}
      
      {/* Background decoration */}
      <div className={`absolute -right-8 -bottom-8 w-24 h-24 blur-[40px] rounded-full transition-all duration-1000 ${
        isUpdating ? "bg-amber-400/10" : "bg-[#00A3FF]/5"
      }`}></div>
    </div>
  );
}
