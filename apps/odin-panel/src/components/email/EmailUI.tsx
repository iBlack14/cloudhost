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
    className: "border-primary/25 bg-primary/10 text-primary",
    dot: "bg-primary"
  },
  restricted: {
    label: "Restricted",
    className: "border-amber-400/25 bg-amber-400/10 text-amber-300",
    dot: "bg-amber-300"
  },
  system: {
    label: "Cuenta de sistema",
    className: "border-sky-300/25 bg-sky-300/10 text-sky-200",
    dot: "bg-sky-200"
  },
  "quota-exceeded": {
    label: "Exceeded Storage",
    className: "border-rose-400/25 bg-rose-400/10 text-rose-300",
    dot: "bg-rose-300"
  }
};

export function EmailBreadcrumbs({
  items
}: {
  items: { label: string; href?: string }[];
}) {
  return (
    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
      {items.map((item, index) => (
        <React.Fragment key={`${item.label}-${index}`}>
          {index > 0 ? <span className="text-zinc-700">/</span> : null}
          {item.href ? (
            <Link href={item.href} className="hover:text-primary transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-zinc-300">{item.label}</span>
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
        <h1 className="text-4xl md:text-5xl font-headline font-black text-white tracking-tighter uppercase italic">
          {title}
        </h1>
        <p className="max-w-4xl text-sm text-zinc-400 leading-6">{description}</p>
      </div>
      {helper ? <div className="text-xs text-zinc-500">{helper}</div> : null}
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
    { value: "restricted", label: "Restricted" },
    { value: "system", label: "Cuenta del sistema" },
    { value: "quota-exceeded", label: "Exceeded Storage" }
  ];

  return (
    <div className="glass-card p-5 md:p-6 space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-[20px]">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar por cuenta, usuario o dominio..."
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] py-3 pl-12 pr-4 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-primary/40"
          />
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500">
          {total} cuentas visibles
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-2 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500">
          Filter:
        </span>
        {filters.map((item) => {
          const active = item.value === filter;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => onFilterChange(item.value)}
              className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] transition-all ${
                active
                  ? "border-primary/30 bg-primary/15 text-primary shadow-[0_0_24px_rgba(0,163,255,0.12)]"
                  : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-white"
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
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] ${meta.className}`}
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
  const tone =
    allocatedMb === null
      ? "from-sky-400 to-cyan-300"
      : ratio >= 95
        ? "from-rose-400 to-amber-300"
        : ratio >= 70
          ? "from-amber-300 to-primary"
          : "from-primary to-secondary";

  return (
    <div className="space-y-2 min-w-[190px]">
      <div className="text-sm font-medium text-zinc-200">
        {usedMb.toFixed(2)} MB / {allocatedMb === null ? "∞" : `${allocatedMb} MB`}
        {allocatedMb !== null ? (
          <span className="ml-2 text-zinc-500">{ratio.toFixed(2)}%</span>
        ) : null}
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${tone}`}
          style={{ width: `${allocatedMb === null ? 28 : ratio}%` }}
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
      className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-primary transition-all hover:border-primary/35 hover:bg-primary/15 hover:text-white"
    >
      <span className="material-symbols-outlined text-[16px]">{icon}</span>
      {label}
    </button>
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
    <div className="space-y-2">
      <label className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </label>
      {children}
      {hint ? <div className="text-xs text-zinc-500">{hint}</div> : null}
    </div>
  );
}
