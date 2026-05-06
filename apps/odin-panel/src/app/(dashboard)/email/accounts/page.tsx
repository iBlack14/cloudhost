"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";

import type { EmailAccount, EmailAccountFilter } from "../../../../lib/email";
import {
  useEmailAccounts,
  useEmailAccountAction
} from "../../../../lib/hooks/use-email-accounts";
import {
  EmailActionButton,
  EmailActionLink,
  EmailBreadcrumbs,
  EmailPageIntro,
  EmailStatusBadge,
  EmailToolbar,
  StorageMeter
} from "../../../../components/email/EmailUI";

const PAGE_SIZE = 8;

export default function EmailAccountsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<EmailAccountFilter>("all");
  const [page, setPage] = useState(1);
  const [feedback, setFeedback] = useState<string | null>(null);
  const { data: accounts = [], isLoading } = useEmailAccounts();
  const actionMutation = useEmailAccountAction();

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return accounts.filter((account) => {
      const matchesFilter = filter === "all" ? true : account.status === filter;
      const matchesSearch =
        term.length === 0
          ? true
          : account.address.toLowerCase().includes(term) ||
            account.username.toLowerCase().includes(term) ||
            account.domain.toLowerCase().includes(term);
      return matchesFilter && matchesSearch;
    });
  }, [accounts, filter, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * PAGE_SIZE;
  const paginated = filtered.slice(start, start + PAGE_SIZE);

  React.useEffect(() => {
    setPage(1);
  }, [search, filter]);

  const runAction = async (
    accountId: string,
    action: "check-email" | "manage" | "connect-devices"
  ) => {
    try {
      const result = await actionMutation.mutateAsync({ accountId, action });
      setFeedback(result.message);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo completar la acción.");
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between border-b border-slate-200 pb-10">
        <div className="space-y-4">
          <EmailBreadcrumbs
            items={[
              { label: "Dashboard", href: "/" },
              { label: "Correo", href: "/email/accounts" },
              { label: "Cuentas" }
            ]}
          />
          <EmailPageIntro
            title="Cuentas de Correo"
            description="Gestiona tus buzones corporativos, cuotas de almacenamiento y acceso seguro por Webmail."
          />
        </div>

        <Link href="/email/accounts/create">
          <button className="bg-[#00A3FF] rounded-2xl px-10 py-5 text-[11px] font-black uppercase tracking-widest text-white shadow-xl shadow-[#00A3FF]/25 hover:bg-[#008EE0] transition-all active:scale-95 flex items-center gap-2">
            <span className="material-symbols-outlined">add</span>
            Crear Nueva Cuenta
          </button>
        </Link>
      </div>

      <EmailToolbar
        search={search}
        onSearchChange={setSearch}
        filter={filter}
        onFilterChange={setFilter}
        total={filtered.length}
      />

      {feedback && (
        <div className="rounded-[2rem] border border-[#00A3FF]/20 bg-[#00A3FF]/5 px-8 py-5 text-sm text-[#00A3FF] font-bold flex items-center gap-3">
          <span className="material-symbols-outlined">info</span>
          {feedback}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-8 py-6 bg-slate-50/50 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <span>Identificador de Cuenta</span>
            <span className="text-slate-200">|</span>
            <span>Seguridad</span>
            <span className="text-slate-200">|</span>
            <span>Uso de Cuota</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 transition-all"
              disabled={safePage === 1}
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <div className="uppercase tracking-widest text-[10px] font-black">
              {safePage} / {pageCount}
            </div>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
              className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 transition-all"
              disabled={safePage === pageCount}
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest">
              {filtered.length === 0 ? "0" : `${start + 1}-${Math.min(start + PAGE_SIZE, filtered.length)}`} de {filtered.length}
            </div>
          </div>
        </div>

        <div className="hidden xl:block overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50/30">
                <th className="px-8 py-5">Dirección de Correo</th>
                <th className="px-8 py-5">Estado / Restricciones</th>
                <th className="px-8 py-5">Uso de Almacenamiento</th>
                <th className="px-8 py-5">Última Actividad</th>
                <th className="px-8 py-5 text-right">Acciones de Cuenta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {renderRows({
                isLoading,
                accounts: paginated,
                onAction: runAction
              })}
            </tbody>
          </table>
        </div>

        <div className="space-y-6 p-8 xl:hidden">
          {isLoading ? (
            <div className="p-20 text-center flex flex-col items-center gap-4">
               <div className="w-10 h-10 border-4 border-slate-100 border-t-[#00A3FF] rounded-full animate-spin"></div>
               <span className="text-[11px] font-black text-slate-400 uppercase">Sincronizando buzones...</span>
            </div>
          ) : paginated.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-bold">No hay cuentas que coincidan.</div>
          ) : (
            paginated.map((account) => (
              <div key={account.id} className="rounded-3xl border border-slate-100 bg-slate-50/50 p-6 space-y-6 group hover:border-[#00A3FF]/20 transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xl font-black tracking-tighter text-slate-900 group-hover:text-[#00A3FF] transition-colors">
                      {account.address}
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {account.devicesConnected} Dispositivos Conectados
                    </div>
                  </div>
                  <EmailStatusBadge status={account.status} />
                </div>
                <StorageMeter usedMb={account.usedMb} allocatedMb={account.allocatedMb} />
                <div className="flex flex-wrap gap-2">
                  <EmailActionLink icon="open_in_new" label="Webmail" href={`/email/accounts/${account.id}/webmail`} />
                  <EmailActionButton icon="tune" label="Gestionar" onClick={() => runAction(account.id, "manage")} />
                  <EmailActionButton icon="devices" label="Dispositivos" onClick={() => runAction(account.id, "connect-devices")} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function renderRows({
  isLoading,
  accounts,
  onAction
}: {
  isLoading: boolean;
  accounts: EmailAccount[];
  onAction: (accountId: string, action: "check-email" | "manage" | "connect-devices") => void;
}) {
  if (isLoading) {
    return (
      <tr>
        <td colSpan={5} className="px-8 py-24 text-center">
           <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-4 border-slate-100 border-t-[#00A3FF] rounded-full animate-spin"></div>
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Consultando Servidor de Correo...</span>
           </div>
        </td>
      </tr>
    );
  }

  if (accounts.length === 0) {
    return (
      <tr>
        <td colSpan={5} className="px-8 py-20 text-center">
           <div className="flex flex-col items-center gap-3 opacity-30">
              <span className="material-symbols-outlined text-5xl">mail_off</span>
              <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Sin resultados encontrados</span>
           </div>
        </td>
      </tr>
    );
  }

  return accounts.map((account) => (
    <tr key={account.id} className="hover:bg-slate-50/80 transition-colors group">
      <td className="px-8 py-6">
        <div className="text-lg font-black tracking-tight text-slate-900 group-hover:text-[#00A3FF] transition-colors">
          {account.address}
        </div>
        <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
          {account.username} <span className="text-slate-200">•</span> {account.devicesConnected} disp.
        </div>
      </td>
      <td className="px-8 py-6">
        <EmailStatusBadge status={account.status} />
      </td>
      <td className="px-8 py-6">
        <StorageMeter usedMb={account.usedMb} allocatedMb={account.allocatedMb} />
      </td>
      <td className="px-8 py-6">
         <div className="text-xs font-bold text-slate-500">{account.lastSync}</div>
         <div className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">Sincronizado vía IMAP</div>
      </td>
      <td className="px-8 py-6">
        <div className="flex flex-wrap justify-end gap-2">
          <EmailActionLink icon="open_in_new" label="Webmail" href={`/email/accounts/${account.id}/webmail`} />
          <EmailActionButton icon="tune" label="Gestionar" onClick={() => onAction(account.id, "manage")} />
          <EmailActionButton icon="devices" label="Dispositivos" onClick={() => onAction(account.id, "connect-devices")} />
        </div>
      </td>
    </tr>
  ));
}
