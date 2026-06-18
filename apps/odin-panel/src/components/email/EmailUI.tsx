"use client";

import React from "react";
import Link from "next/link";

import type { EmailAccountFilter, EmailAccountStatus } from "../../lib/email";

const statusMeta: Record<
  EmailAccountStatus,
  { label: string; className: string; dot: string }
> = {
  active: {
    label: "No restringido",
    className: "border-emerald-200 bg-emerald-50 text-emerald-600",
    dot: "bg-emerald-500"
  },
  restricted: {
    label: "Restringido",
    className: "border-amber-200 bg-amber-50 text-amber-600",
    dot: "bg-amber-500"
  },
  system: {
    label: "Cuenta de sistema",
    className: "border-slate-200 bg-slate-50 text-slate-600",
    dot: "bg-slate-500"
  },
  "quota-exceeded": {
    label: "Cuota Excedida",
    className: "border-red-200 bg-red-50 text-red-600",
    dot: "bg-red-500"
  }
};

export function EmailBreadcrumbs({
  items
}: {
  items: { label: string; href?: string }[];
}) {
  return (
    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
      {items.map((item, index) => (
        <React.Fragment key={`${item.label}-${index}`}>
          {index > 0 ? <span className="text-slate-200">/</span> : null}
          {item.href ? (
            <Link href={item.href} className="hover:text-[#00A3FF] transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-slate-900">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export function EmailPageIntro({
  title,
  description,
  helper
}: {
  title: string;
  description: string;
  helper?: React.ReactNode;
}) {
  return (
    <header className="space-y-4">
      <div className="space-y-2">
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter">
          {title}
        </h1>
        <p className="max-w-4xl text-sm text-slate-500 leading-relaxed font-medium">{description}</p>
      </div>
      {helper ? <div className="text-xs text-slate-400 font-medium italic">{helper}</div> : null}
    </header>
  );
}

export function EmailToolbar({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  total
}: {
  search: string;
  onSearchChange: (value: string) => void;
  filter: EmailAccountFilter;
  onFilterChange: (value: EmailAccountFilter) => void;
  total: number;
}) {
  const filters: { value: EmailAccountFilter; label: string }[] = [
    { value: "all", label: "Todo" },
    { value: "restricted", label: "Restringido" },
    { value: "system", label: "Cuentas Sistema" },
    { value: "quota-exceeded", label: "Exceso Cuota" }
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-[2rem] p-8 space-y-6 shadow-sm">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 text-[22px]">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar por cuenta, usuario o dominio..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-14 pr-6 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-300 focus:border-[#00A3FF] focus:bg-white shadow-inner"
          />
        </div>
        <div className="rounded-2xl bg-slate-50 border border-slate-100 px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">
          {total} cuentas encontradas
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="mr-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          Filtrar por Estado:
        </span>
        {filters.map((item) => {
          const active = item.value === filter;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => onFilterChange(item.value)}
              className={`rounded-xl border px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                active
                  ? "border-[#00A3FF] bg-[#00A3FF] text-white shadow-lg shadow-[#00A3FF]/20"
                  : "border-slate-100 bg-slate-50 text-slate-400 hover:border-[#00A3FF]/30 hover:text-[#00A3FF]"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function EmailStatusBadge({ status }: { status: EmailAccountStatus }) {
  const meta = statusMeta[status];
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[9px] font-black uppercase tracking-widest ${meta.className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

export function StorageMeter({
  usedMb,
  allocatedMb
}: {
  usedMb: number;
  allocatedMb: number | null;
}) {
  const ratio = allocatedMb ? Math.min(100, (usedMb / allocatedMb) * 100) : 0;
  const color =
    allocatedMb === null
      ? "#00A3FF"
      : ratio >= 90
        ? "#EF4444"
        : ratio >= 70
          ? "#F59E0B"
          : "#10B981";

  return (
    <div className="space-y-2 min-w-[200px]">
      <div className="flex justify-between items-center text-[11px] font-bold">
        <div className="text-slate-900">
          {Number(usedMb).toFixed(0)}MB / {allocatedMb === null ? "∞" : `${allocatedMb}MB`}
        </div>
        {allocatedMb !== null ? (
          <div className="text-slate-400">{Number(ratio).toFixed(1)}%</div>
        ) : null}
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 shadow-inner">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${allocatedMb === null ? 15 : ratio}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export function EmailActionButton({
  icon,
  label,
  onClick
}: {
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500 transition-all hover:border-[#00A3FF]/30 hover:bg-[#00A3FF]/5 hover:text-[#00A3FF] shadow-sm active:scale-95"
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
      {label}
    </button>
  );
}

export function EmailActionLink({
  icon,
  label,
  href
}: {
  icon: string;
  label: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-xl bg-[#00A3FF]/10 border border-[#00A3FF]/20 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#00A3FF] transition-all hover:bg-[#00A3FF] hover:text-white shadow-sm active:scale-95"
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
      {label}
    </Link>
  );
}

export function EmailActionInternalLink({
  icon,
  label,
  href
}: {
  icon: string;
  label: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500 transition-all hover:border-[#00A3FF]/30 hover:bg-[#00A3FF]/5 hover:text-[#00A3FF] shadow-sm active:scale-95"
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
      {label}
    </Link>
  );
}

export function EmailField({
  label,
  hint,
  children
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2.5">
      <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-2">
        {label}
      </label>
      {children}
      {hint ? <div className="text-[11px] text-slate-400 font-medium italic mt-1 ml-2">{hint}</div> : null}
    </div>
  );
}
