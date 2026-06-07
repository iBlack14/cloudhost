"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchDiskUsage } from "../../../../lib/api";
import Link from "next/link";

function fmt(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.round(mb * 1024)} KB`;
}

function fmtBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

const FOLDER_COLORS: Record<string, string> = {
  public_html: "#00A3FF",
  mail:        "#8B5CF6",
  logs:        "#F59E0B",
  tmp:         "#6B7280",
  backups:     "#10B981",
  "backups/wp":"#10B981",
};

const FOLDER_ICONS: Record<string, string> = {
  public_html: "public",
  mail:        "mail",
  logs:        "description",
  tmp:         "delete_sweep",
  backups:     "backup",
};

export default function DiskUsagePage() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["odin", "files", "usage"],
    queryFn: fetchDiskUsage,
    staleTime: 1000 * 60, // 1 min cache
    refetchOnWindowFocus: false,
  });

  const percent = data?.diskPercent ?? 0;
  const barColor = percent >= 90 ? "#EF4444" : percent >= 70 ? "#F59E0B" : "#00A3FF";

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200 pb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <Link href="/files" className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 hover:text-[#00A3FF] transition-colors uppercase tracking-wider">
              <span className="material-symbols-outlined text-[14px]">folder</span>
              Gestión de Archivos
            </Link>
            <span className="text-slate-200">/</span>
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">Uso de Disco</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 uppercase">
            Uso de <span className="text-[#00A3FF]">Disco</span>
          </h1>
          <p className="text-slate-400 text-xs font-medium">
            Análisis en tiempo real del espacio utilizado en tu directorio home
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-700 transition-all disabled:opacity-40 active:scale-[0.98]"
        >
          <span className={`material-symbols-outlined text-[16px] ${isFetching ? "animate-spin" : ""}`}>refresh</span>
          {isFetching ? "Calculando..." : "Recalcular"}
        </button>
      </header>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-10 h-10 border-4 border-slate-100 border-t-[#00A3FF] rounded-full animate-spin" />
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Calculando uso de disco...</p>
          <p className="text-[10px] text-slate-300 font-medium">Esto puede tardar unos segundos</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 flex items-center gap-4">
          <span className="material-symbols-outlined text-red-400 text-3xl">error</span>
          <div>
            <p className="text-sm font-black text-red-700">Error al calcular el uso de disco</p>
            <p className="text-xs text-red-500 mt-0.5">{(error as any).message}</p>
          </div>
        </div>
      ) : data ? (
        <>
          {/* Main usage card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center gap-6 mb-8">
              <div className="flex-1">
                <div className="flex items-baseline gap-3 mb-1">
                  <span className="text-5xl font-black text-slate-900 tracking-tight">{fmt(data.totalMb)}</span>
                  <span className="text-base font-bold text-slate-400">
                    de {data.diskLimit >= 999000 ? "Ilimitado" : fmt(data.diskLimit)}
                  </span>
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Espacio utilizado</p>
              </div>
              {/* Donut-style percent */}
              <div className="flex flex-col items-center">
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center text-xl font-black"
                  style={{
                    background: `conic-gradient(${barColor} ${percent}%, #f1f5f9 0%)`,
                  }}
                >
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                    <span className="text-sm font-black" style={{ color: barColor }}>{percent}%</span>
                  </div>
                </div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2">Ocupado</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest">
                <span>Usado</span>
                <span>Disponible: {data.diskLimit >= 999000 ? "Ilimitado" : fmt(data.diskLimit - data.totalMb)}</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(percent, 100)}%`, backgroundColor: barColor }}
                />
              </div>
            </div>

            {/* Path */}
            <div className="mt-5 flex items-center gap-2 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="material-symbols-outlined text-[14px] text-slate-400">folder_open</span>
              <span className="text-[10px] font-mono font-bold text-slate-500">{data.basePath}</span>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Archivos", value: fmt(data.totalMb), icon: "storage", color: "#00A3FF" },
              { label: "% Ocupado", value: `${percent}%`, icon: "pie_chart", color: percent >= 90 ? "#EF4444" : percent >= 70 ? "#F59E0B" : "#10B981" },
              { label: "Cuota", value: data.diskLimit >= 999000 ? "Ilimitada" : fmt(data.diskLimit), icon: "database", color: "#8B5CF6" },
              { label: "Carpetas", value: String(data.breakdown.length), icon: "folder", color: "#F59E0B" },
            ].map((s, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-[18px]" style={{ color: s.color }}>{s.icon}</span>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{s.label}</span>
                </div>
                <p className="text-xl font-black text-slate-900">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Breakdown table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="flex items-center gap-3 px-6 py-4 bg-slate-50 border-b border-slate-200">
              <span className="material-symbols-outlined text-[18px] text-slate-400">bar_chart</span>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Desglose por Carpeta</h2>
            </div>
            {data.breakdown.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
                <span className="material-symbols-outlined text-3xl">folder_open</span>
                <p className="text-xs font-bold">Directorio home vacío</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {data.breakdown.map((item, i) => {
                  const pct = data.totalMb > 0 ? (item.mb / data.totalMb) * 100 : 0;
                  const color = FOLDER_COLORS[item.name] ?? "#6B7280";
                  const icon = FOLDER_ICONS[item.name] ?? "folder";
                  return (
                    <div key={i} className="px-6 py-4 hover:bg-slate-50/70 transition-colors">
                      <div className="flex items-center gap-4">
                        <span
                          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${color}18` }}
                        >
                          <span className="material-symbols-outlined text-[16px]" style={{ color }}>{icon}</span>
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-mono font-bold text-slate-700 truncate">{item.name}</span>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-[10px] font-black text-slate-500">{pct.toFixed(1)}%</span>
                              <span className="text-xs font-bold text-slate-800 w-20 text-right">{fmtBytes(item.bytes)}</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Note */}
          <p className="text-[10px] text-slate-400 text-center font-medium">
            El uso de disco se actualiza automáticamente en el dashboard al recalcular · Calculado con <code className="font-mono">du -sb</code>
          </p>
        </>
      ) : null}
    </div>
  );
}
