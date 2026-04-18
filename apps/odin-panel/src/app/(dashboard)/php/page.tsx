"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";
const getToken = () => (typeof window !== "undefined" ? window.sessionStorage.getItem("odin-access-token") : null);

const authHeaders = (): Record<string, string> => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

interface PhpConfig {
  currentVersion: string;
  domain: string;
  availableVersions: string[];
  activeExtensions: string[];
  phpIni: Record<string, string>;
}

export default function PhpManagerPage() {
  const queryClient = useQueryClient();
  const [iniEditor, setIniEditor] = useState<Record<string, string>>({});
  const [isEditingIni, setIsEditingIni] = useState(false);

  // 1. Obtener la config actual PHP
  const { data: config, isLoading, error } = useQuery<PhpConfig>({
    queryKey: ["phpConfig"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/odin-panel/php/current`, { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data?.error?.message ?? "Error fetching PHP");
      return data.data;
    },
  });

  // 2. Muta la version de PHP
  const changeVersionMutation = useMutation({
    mutationFn: async (version: string) => {
      const res = await fetch(`${API_BASE}/odin-panel/php/version`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ version }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data?.error?.message ?? "Error al cambiar versión");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phpConfig"] });
    },
  });

  // 3. Muta php.ini
  const updateIniMutation = useMutation({
    mutationFn: async (iniData: Record<string, string>) => {
      const res = await fetch(`${API_BASE}/odin-panel/php/ini`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(iniData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data?.error?.message ?? "Error al actualizar ini");
      return data;
    },
    onSuccess: () => {
      setIsEditingIni(false);
      queryClient.invalidateQueries({ queryKey: ["phpConfig"] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-zinc-500">
        <span className="material-symbols-outlined max-w animate-spin text-4xl mb-4">refresh</span>
        <p className="font-mono text-sm">Cargando configuración PHP...</p>
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="p-10 border border-red-500/20 bg-red-500/5 rounded-2xl">
        <h2 className="text-red-400 font-bold">Error</h2>
        <p className="text-red-400/80 mt-2">{(error as Error)?.message || "No se pudo cargar la info de PHP."}</p>
      </div>
    );
  }

  const handleStartEditing = () => {
    setIniEditor({
      memory_limit: config.phpIni.memory_limit ?? "256M",
      upload_max_filesize: config.phpIni.upload_max_filesize ?? "100M",
      post_max_size: config.phpIni.post_max_size ?? "100M",
      max_execution_time: config.phpIni.max_execution_time ?? "60",
      "date.timezone": config.phpIni["date.timezone"] ?? "UTC",
    });
    setIsEditingIni(true);
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <header className="space-y-1">
        <h1 className="text-4xl font-headline font-black text-white tracking-tighter uppercase italic">
          Multi<span className="text-primary">PHP</span> Manager
        </h1>
        <p className="text-zinc-500 text-xs font-mono tracking-widest">
          Gestiona la versión de PHP y directivas de configuración para tu dominio.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Selector de versiones */}
        <div className="glass-card rounded-2xl overflow-hidden border border-white/5 bg-zinc-900 flex flex-col">
          <div className="border-b border-white/5 bg-white/[0.02] px-6 py-4">
            <h2 className="font-black text-white uppercase tracking-wider text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">developer_board</span>
              Versión Activa
            </h2>
          </div>
          <div className="p-6 space-y-6 flex-1">
            <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between">
              <div>
                <p className="text-xs font-mono text-zinc-500 mb-1">Dominio</p>
                <p className="text-white font-bold">{config.domain}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-mono text-zinc-500 mb-1">Versión actual</p>
                <p className="text-primary font-black uppercase text-2xl tracking-tighter italic">
                  PHP {config.currentVersion}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-mono text-zinc-400 uppercase tracking-widest">
                Cambiar versión
              </label>
              <div className="grid grid-cols-2 gap-3">
                {config.availableVersions.map((v) => {
                  const isActive = v === config.currentVersion;
                  return (
                    <button
                      key={v}
                      disabled={isActive || changeVersionMutation.isPending}
                      onClick={() => {
                        if (confirm(`¿Cambiar a PHP ${v}? Tus sitios podrían experimentar un micro-corte.`)) {
                          changeVersionMutation.mutate(v);
                        }
                      }}
                      className={`relative overflow-hidden p-4 rounded-xl border flex flex-col items-start gap-1 transition-all ${
                        isActive
                          ? "border-primary/40 bg-primary/10 cursor-default"
                          : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                      }`}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className={`font-black text-lg italic ${isActive ? "text-primary" : "text-white"}`}>
                          {v}
                        </span>
                        {isActive && <span className="material-symbols-outlined text-primary text-sm">check_circle</span>}
                      </div>
                      <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-500">
                        {v === "8.1" ? "Legacy LTS" : v === "8.2" ? "Stable" : "Nuevo"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            
            {changeVersionMutation.error && (
              <p className="text-red-400 text-xs mt-4">{(changeVersionMutation.error as Error).message}</p>
            )}
          </div>
        </div>

        {/* php.ini Editor */}
        <div className="glass-card rounded-2xl overflow-hidden border border-white/5 bg-zinc-900 flex flex-col">
          <div className="border-b border-white/5 bg-white/[0.02] px-6 py-4 flex items-center justify-between">
            <h2 className="font-black text-white uppercase tracking-wider text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[18px]">settings</span>
              Configuración php.ini
            </h2>
            {!isEditingIni && (
              <button
                onClick={handleStartEditing}
                className="text-xs font-black uppercase text-secondary hover:text-white transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">edit</span>
                Editar
              </button>
            )}
          </div>

          <div className="p-6">
            {!isEditingIni ? (
              <div className="space-y-4">
                {Object.entries({
                  memory_limit: config.phpIni.memory_limit ?? "256M",
                  upload_max_filesize: config.phpIni.upload_max_filesize ?? "100M",
                  post_max_size: config.phpIni.post_max_size ?? "100M",
                  max_execution_time: config.phpIni.max_execution_time ?? "60",
                  "date.timezone": config.phpIni["date.timezone"] ?? "UTC",
                }).map(([key, val]) => (
                  <div key={key} className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="text-zinc-400 font-mono text-xs">{key}</span>
                    <span className="text-white font-bold text-sm tracking-wide">{String(val)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {Object.keys(iniEditor).map((key) => (
                  <div key={key} className="flex justify-between items-center bg-black/40 rounded-lg p-2 border border-white/10">
                    <label className="text-zinc-400 font-mono text-xs w-1/2 ml-2">{key}</label>
                    <input
                      type="text"
                      value={iniEditor[key]}
                      onChange={(e) => setIniEditor({ ...iniEditor, [key]: e.target.value })}
                      className="bg-transparent text-white font-bold text-sm text-right focus:outline-none focus:text-primary w-1/2 pr-2"
                    />
                  </div>
                ))}
                
                {updateIniMutation.error && (
                  <p className="text-red-400 text-xs">{(updateIniMutation.error as Error).message}</p>
                )}

                <div className="flex gap-2 pt-4 justify-end">
                  <button
                    onClick={() => setIsEditingIni(false)}
                    className="px-4 py-2 rounded-xl border border-white/10 text-xs font-bold text-zinc-400 hover:text-white uppercase"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => updateIniMutation.mutate(iniEditor)}
                    disabled={updateIniMutation.isPending}
                    className="px-4 py-2 rounded-xl bg-secondary text-black text-xs font-black uppercase hover:bg-white disabled:opacity-50 flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    {updateIniMutation.isPending ? "Guardando..." : "Guardar FPM"}
                  </button>
                </div>
              </div>
            )}
            
            <div className="mt-8 pt-6 border-t border-white/5">
              <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-4">Extensiones activas ({config.activeExtensions.length})</h3>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                {config.activeExtensions.map(ext => (
                  <span key={ext} className="px-2 py-1 bg-white/5 border border-white/10 text-zinc-300 text-[10px] rounded break-all font-mono">
                    {ext}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
