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
  const capacityStatus = percent >= 90
    ? { label: "Capacidad crítica", detail: "Libera espacio o amplía tu plan", color: "text-red-600", bg: "bg-red-50 border-red-200", dot: "bg-red-500" }
    : percent >= 70
      ? { label: "Capacidad moderada", detail: "Conviene revisar archivos grandes", color: "text-amber-600", bg: "bg-amber-50 border-amber-200", dot: "bg-amber-500" }
      : { label: "Capacidad saludable", detail: "Tu almacenamiento opera con normalidad", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", dot: "bg-emerald-500" };
  const largestFolder = data?.breakdown?.reduce((largest, item) => item.mb > largest.mb ? item : largest, data.breakdown[0]) ?? null;

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
          <section className="relative overflow-hidden bg-gradient-to-br from-white via-white to-sky-50/70 border border-slate-200 rounded-[2rem] shadow-sm">
            <div className="absolute -right-24 -top-24 w-72 h-72 rounded-full bg-sky-100/50 blur-3xl pointer-events-none" />
            <div className="relative grid lg:grid-cols-[1fr_280px]">
              <div className="p-7 md:p-9 lg:border-r border-slate-200/70">
                <div className="flex flex-wrap items-center gap-3 mb-8">
                  <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${capacityStatus.bg} ${capacityStatus.color}`}>
                    <span className={`w-2 h-2 rounded-full ${capacityStatus.dot}`} />
                    {capacityStatus.label}
                  </span>
                  <span className="text-xs text-slate-400">{capacityStatus.detail}</span>
                </div>

                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Almacenamiento utilizado</p>
                <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
                  <span className="text-5xl md:text-6xl font-black text-slate-900 tracking-[-0.06em]">{fmt(data.totalMb)}</span>
                  <span className="pb-1.5 text-sm font-bold text-slate-400">
                    de {data.diskLimit >= 999000 ? "capacidad ilimitada" : fmt(data.diskLimit)}
                  </span>
                </div>

                <div className="mt-8">
                  <div className="h-4 p-1 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.max(Math.min(percent, 100), percent > 0 ? 1 : 0)}%`, backgroundColor: barColor }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-[10px] font-bold text-slate-400">
                    <span>{percent}% utilizado</span>
                    <span>{data.diskLimit >= 999000 ? "Sin límite establecido" : `${fmt(Math.max(data.diskLimit - data.totalMb, 0))} disponibles`}</span>
                  </div>
                </div>

                <div className="mt-7 inline-flex max-w-full items-center gap-2.5 px-3.5 py-2 bg-white/80 rounded-xl border border-slate-200 shadow-sm">
                  <span className="material-symbols-outlined text-[17px] text-[#00A3FF]">folder_open</span>
                  <span className="truncate text-[10px] font-mono font-bold text-slate-500">{data.basePath}</span>
                </div>
              </div>

              <div className="relative p-7 md:p-9 flex flex-col items-center justify-center bg-white/45">
                <div className="relative">
                  <div
                    className="w-40 h-40 rounded-full flex items-center justify-center shadow-xl shadow-slate-200/60"
                    style={{ background: `conic-gradient(${barColor} ${percent}%, #eaf0f6 0%)` }}
                  >
                    <div className="w-[118px] h-[118px] bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
                      <span className="text-3xl font-black tracking-tight" style={{ color: barColor }}>{percent}%</span>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ocupado</span>
                    </div>
                  </div>
                  <span className={`absolute right-1 top-2 w-4 h-4 rounded-full border-4 border-white ${capacityStatus.dot}`} />
                </div>
                <p className="mt-5 text-xs font-black text-slate-700 uppercase tracking-widest">Estado de capacidad</p>
                <p className="mt-1 text-[10px] text-slate-400 text-center">Cuota actual de almacenamiento</p>
              </div>
            </div>
          </section>

          {/* Stats row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { label: "Almacenamiento usado", value: fmt(data.totalMb), detail: `${percent}% de la cuota`, icon: "hard_drive", color: "#00A3FF" },
              { label: "Espacio disponible", value: data.diskLimit >= 999000 ? "Ilimitado" : fmt(Math.max(data.diskLimit - data.totalMb, 0)), detail: "Capacidad restante", icon: "inventory_2", color: "#10B981" },
              { label: "Carpeta principal", value: largestFolder?.name || "—", detail: largestFolder ? fmtBytes(largestFolder.bytes) : "Sin información", icon: "folder_special", color: "#8B5CF6" },
              { label: "Directorios analizados", value: String(data.breakdown.length), detail: "Dentro del home", icon: "account_tree", color: "#F59E0B" },
            ].map((s, i) => (
              <div key={i} className="relative overflow-hidden bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all">
                <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: s.color }} />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{s.label}</span>
                    <p className="mt-2 text-xl font-black text-slate-900 truncate" title={s.value}>{s.value}</p>
                    <p className="mt-1 text-[10px] font-medium text-slate-400">{s.detail}</p>
                  </div>
                  <span className="material-symbols-outlined text-[25px] shrink-0" style={{ color: s.color }}>{s.icon}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Breakdown table */}
          <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-6 py-5 bg-slate-50/80 border-b border-slate-200">
              <span className="material-symbols-outlined text-[22px] text-[#00A3FF]">analytics</span>
              <div>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Distribución por directorio</h2>
                <p className="text-[10px] text-slate-400 mt-0.5">Ordenado por consumo de almacenamiento</p>
              </div>
              <span className="sm:ml-auto px-3 py-1 rounded-full bg-white border border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-500">
                {data.breakdown.length} directorios
              </span>
            </div>
            {data.breakdown.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
                <span className="material-symbols-outlined text-3xl">folder_open</span>
                <p className="text-xs font-bold">Directorio home vacío</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {[...data.breakdown].sort((a, b) => b.bytes - a.bytes).map((item, i) => {
                  const pct = data.totalMb > 0 ? (item.mb / data.totalMb) * 100 : 0;
                  const color = FOLDER_COLORS[item.name] ?? "#6B7280";
                  const icon = FOLDER_ICONS[item.name] ?? "folder";
                  return (
                    <div key={i} className="px-5 sm:px-6 py-4 hover:bg-sky-50/40 transition-colors">
                      <div className="flex items-center gap-4">
                        <span className="w-6 text-center text-[10px] font-black text-slate-300">#{i + 1}</span>
                        <span
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border"
                          style={{ backgroundColor: `${color}10`, borderColor: `${color}25` }}
                        >
                          <span className="material-symbols-outlined text-[19px]" style={{ color }}>{icon}</span>
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-mono font-bold text-slate-700 truncate">{item.name}</span>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-[10px] font-black text-slate-500">{pct.toFixed(1)}%</span>
                              <span className="text-xs font-bold text-slate-800 w-20 text-right">{fmtBytes(item.bytes)}</span>
                            </div>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
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
