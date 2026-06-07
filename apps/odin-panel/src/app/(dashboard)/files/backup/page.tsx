"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getOdinAccessToken } from "../../../../lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";
const authHeaders = (): Record<string, string> => {
  const t = getOdinAccessToken();
  return t ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
};

interface BackupItem {
  name: string;
  scope: string;
  size: number;
  sizeLabel: string;
  createdAt: string;
}

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString("es-MX", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const scopeLabel = (scope: string) =>
  scope === "completo" ? "Backup Completo" : scope.replace(/_/g, ".");

const scopeIcon = (scope: string) =>
  scope === "completo" ? "folder_zip" : "language";

const scopeColor = (scope: string) =>
  scope === "completo"
    ? "bg-[#00A3FF]/10 text-[#00A3FF] border-[#00A3FF]/20"
    : "bg-violet-50 text-violet-600 border-violet-200";

export default function BackupPage() {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [selectedScope, setSelectedScope] = useState<"full" | string>("full");
  const [deletingName, setDeletingName] = useState<string | null>(null);
  const [downloadingName, setDownloadingName] = useState<string | null>(null);

  // ── Fetch user domains for per-domain selector ──────────────────────────────
  const { data: domains = [] } = useQuery({
    queryKey: ["odin_domains_backup"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/odin-panel/domains`, { headers: authHeaders() });
      if (!res.ok) return [];
      return (await res.json()).data ?? [];
    },
  });

  // ── Fetch backup list ───────────────────────────────────────────────────────
  const { data: backups = [], isLoading } = useQuery<BackupItem[]>({
    queryKey: ["odin_backups"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/odin-panel/backups`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Error al cargar backups");
      return (await res.json()).data ?? [];
    },
    refetchInterval: 10_000,
  });

  // ── Create backup ───────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async () => {
      const scope = selectedScope === "full" ? "full" : selectedScope;
      const res = await fetch(`${API_BASE}/odin-panel/backups`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ scope }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "Error al crear backup");
      return data;
    },
    onSuccess: () => {
      setCreating(false);
      queryClient.invalidateQueries({ queryKey: ["odin_backups"] });
    },
    onError: (e: any) => alert(e.message),
  });

  // ── Delete backup ───────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(`${API_BASE}/odin-panel/backups?name=${encodeURIComponent(name)}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "Error al eliminar");
    },
    onSuccess: () => {
      setDeletingName(null);
      queryClient.invalidateQueries({ queryKey: ["odin_backups"] });
    },
    onError: (e: any) => { setDeletingName(null); alert(e.message); },
  });

  // ── Download backup ─────────────────────────────────────────────────────────
  const handleDownload = async (name: string) => {
    setDownloadingName(name);
    try {
      const t = getOdinAccessToken();
      const res = await fetch(
        `${API_BASE}/odin-panel/backups/download?name=${encodeURIComponent(name)}`,
        { headers: t ? { Authorization: `Bearer ${t}` } : {} }
      );
      if (!res.ok) throw new Error("Error al descargar");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setDownloadingName(null);
    }
  };

  const totalSize = backups.reduce((acc, b) => acc + b.size, 0);
  const formatTotalSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700">

      {/* ── Header ── */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-200 pb-10">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3 mb-1">
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase rounded-full tracking-wider border border-emerald-200">
              Gestión de Datos
            </span>
          </div>
          <h1 className="text-5xl font-black text-slate-900 uppercase">
            Centro de <span className="text-[#00A3FF]">Backups</span>
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-2">
            Crea, descarga y gestiona copias de seguridad completas o por dominio.
          </p>
        </div>

        <button
          onClick={() => setCreating(!creating)}
          className={`px-10 py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest transition-all shadow-xl flex items-center gap-2 active:scale-95 ${
            creating ? "bg-slate-900 text-white" : "bg-[#00A3FF] text-white shadow-[#00A3FF]/20 hover:bg-[#008EE0]"
          }`}
        >
          <span className="material-symbols-outlined">{creating ? "close" : "add_circle"}</span>
          {creating ? "Cancelar" : "Nuevo Backup"}
        </button>
      </header>

      {/* ── Stats Bar ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        {[
          { label: "Backups Guardados", value: backups.length, icon: "folder_zip", color: "text-[#00A3FF]", bg: "bg-[#00A3FF]/10" },
          { label: "Espacio Utilizado", value: formatTotalSize(totalSize), icon: "storage", color: "text-violet-600", bg: "bg-violet-50" },
          { label: "Último Backup", value: backups[0] ? formatDate(backups[0].createdAt) : "—", icon: "schedule", color: "text-emerald-600", bg: "bg-emerald-50" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-slate-200 rounded-3xl p-6 flex items-center gap-5 shadow-sm">
            <div className={`w-12 h-12 ${stat.bg} rounded-2xl flex items-center justify-center shrink-0`}>
              <span className={`material-symbols-outlined ${stat.color} text-2xl`}>{stat.icon}</span>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-xl font-black text-slate-900 mt-0.5">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Create Backup Panel ── */}
      {creating && (
        <div className="bg-white border border-slate-200 p-10 rounded-[3rem] shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden">
          <div className="absolute top-[-10%] right-[-5%] w-72 h-72 bg-[#00A3FF]/5 rounded-full blur-[80px] pointer-events-none" />
          <div className="relative z-10 space-y-8">

            <div>
              <h3 className="text-2xl font-black text-slate-900 uppercase">Configurar Backup</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Selecciona el alcance de la copia de seguridad</p>
            </div>

            {/* Scope Selector */}
            <div className="space-y-4">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Alcance del Backup</label>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

                {/* Full backup card */}
                <button
                  type="button"
                  onClick={() => setSelectedScope("full")}
                  className={`flex flex-col gap-4 p-6 rounded-2xl border-2 text-left transition-all duration-200 ${
                    selectedScope === "full"
                      ? "border-[#00A3FF] bg-[#00A3FF]/5 shadow-lg shadow-blue-100"
                      : "border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                      selectedScope === "full" ? "bg-[#00A3FF] text-white" : "bg-white text-slate-400 border border-slate-200"
                    }`}>
                      <span className="material-symbols-outlined text-2xl">folder_zip</span>
                    </div>
                    {selectedScope === "full" && (
                      <span className="material-symbols-outlined text-[#00A3FF] text-2xl">check_circle</span>
                    )}
                  </div>
                  <div>
                    <p className={`text-base font-black ${selectedScope === "full" ? "text-slate-900" : "text-slate-600"}`}>
                      Backup Completo
                    </p>
                    <span className="inline-block text-[10px] font-black px-2 py-0.5 rounded-full mt-1 bg-[#00A3FF]/10 text-[#00A3FF]">
                      Todo el espacio
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Incluye todos los dominios, archivos, configuraciones y logs del usuario.
                  </p>
                </button>

                {/* Per-domain cards */}
                {domains.map((d: any) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSelectedScope(d.domain_name)}
                    className={`flex flex-col gap-4 p-6 rounded-2xl border-2 text-left transition-all duration-200 ${
                      selectedScope === d.domain_name
                        ? "border-violet-400 bg-violet-50/60 shadow-lg shadow-violet-100"
                        : "border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                        selectedScope === d.domain_name ? "bg-violet-500 text-white" : "bg-white text-slate-400 border border-slate-200"
                      }`}>
                        <span className="material-symbols-outlined text-2xl">language</span>
                      </div>
                      {selectedScope === d.domain_name && (
                        <span className="material-symbols-outlined text-violet-500 text-2xl">check_circle</span>
                      )}
                    </div>
                    <div>
                      <p className={`text-base font-black truncate ${selectedScope === d.domain_name ? "text-slate-900" : "text-slate-600"}`}>
                        {d.domain_name}
                      </p>
                      <span className="inline-block text-[10px] font-black px-2 py-0.5 rounded-full mt-1 bg-violet-100 text-violet-600">
                        Solo este dominio
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Copia solo los archivos del directorio <span className="font-mono">~/{d.domain_name}/</span>
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Selected scope summary */}
            <div className="flex items-center gap-4 p-5 bg-slate-50 border border-slate-200 rounded-2xl">
              <span className="material-symbols-outlined text-slate-400">info</span>
              <div>
                <p className="text-xs font-black text-slate-700">
                  Se creará: <span className="text-[#00A3FF]">backup_{selectedScope === "full" ? "completo" : selectedScope.replace(/\./g, "_")}_[timestamp].tar.gz</span>
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  El archivo se guardará en <span className="font-mono">~/.backups/</span> y podrás descargarlo desde esta página.
                </p>
              </div>
            </div>

            {/* Action button */}
            <button
              disabled={createMutation.isPending}
              onClick={() => createMutation.mutate()}
              className="bg-[#00A3FF] px-14 py-5 rounded-2xl text-white font-black uppercase text-[11px] tracking-widest shadow-xl shadow-[#00A3FF]/20 hover:bg-[#008EE0] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-3"
            >
              {createMutation.isPending ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generando Backup...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">cloud_done</span>
                  Generar Backup Ahora
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Backup List ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">
            Historial de Backups ({backups.length})
          </h2>
          {backups.length > 0 && (
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ["odin_backups"] })}
              className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#00A3FF] transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">refresh</span>
              Actualizar
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-16 bg-white border border-slate-200 rounded-[2.5rem] animate-pulse">
            <div className="w-10 h-10 border-4 border-slate-100 border-t-[#00A3FF] rounded-full animate-spin" />
          </div>
        ) : backups.length === 0 ? (
          <div className="p-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-slate-200 mb-6 shadow-sm">
              <span className="material-symbols-outlined text-5xl">folder_zip</span>
            </div>
            <h4 className="text-lg font-black text-slate-900 uppercase">Sin Backups</h4>
            <p className="text-sm text-slate-500 mt-2 font-medium max-w-xs">
              Aún no tienes copias de seguridad. Crea tu primer backup con el botón de arriba.
            </p>
            <button
              onClick={() => setCreating(true)}
              className="mt-6 px-8 py-3.5 bg-[#00A3FF] text-white rounded-2xl font-black uppercase text-[11px] tracking-widest hover:bg-[#008EE0] transition-all shadow-lg shadow-[#00A3FF]/20"
            >
              Crear Primer Backup
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {backups.map((backup) => (
              <div
                key={backup.name}
                className="bg-white border border-slate-200 p-6 rounded-[2rem] flex flex-col md:flex-row items-start md:items-center gap-6 group hover:border-[#00A3FF]/30 transition-all duration-300 shadow-sm"
              >
                {/* Icon + Info */}
                <div className="flex items-center gap-5 flex-1 min-w-0">
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 group-hover:bg-[#00A3FF] group-hover:text-white transition-all">
                    <span className="material-symbols-outlined text-2xl text-slate-400 group-hover:text-white">
                      {scopeIcon(backup.scope)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <p className="text-base font-black text-slate-900 group-hover:text-[#00A3FF] transition-colors truncate">
                        {backup.name}
                      </p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black border ${scopeColor(backup.scope)}`}>
                        {scopeLabel(backup.scope)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                        {formatDate(backup.createdAt)}
                      </span>
                      <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                        <span className="material-symbols-outlined text-[14px]">storage</span>
                        {backup.sizeLabel}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 shrink-0">
                  {/* Download */}
                  <button
                    disabled={downloadingName === backup.name}
                    onClick={() => handleDownload(backup.name)}
                    className="flex items-center gap-2 px-5 py-3 bg-[#00A3FF] text-white rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-[#008EE0] active:scale-95 transition-all disabled:opacity-50 shadow-md shadow-[#00A3FF]/20"
                  >
                    {downloadingName === backup.name ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Descargando...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[18px]">download</span>
                        Descargar
                      </>
                    )}
                  </button>

                  {/* Delete confirm */}
                  {deletingName === backup.name ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-red-500 uppercase">¿Eliminar?</span>
                      <button
                        onClick={() => deleteMutation.mutate(backup.name)}
                        disabled={deleteMutation.isPending}
                        className="px-3 py-2 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase hover:bg-red-600 transition-all"
                      >
                        Sí
                      </button>
                      <button
                        onClick={() => setDeletingName(null)}
                        className="px-3 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase hover:bg-slate-200 transition-all"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeletingName(backup.name)}
                      className="w-11 h-11 rounded-xl bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
