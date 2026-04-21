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

  const description =
    "Gestiona buzones, restricciones y cuotas desde una vista compacta inspirada en cPanel. Esta fase usa datos mock para dejar el flujo listo para backend real.";

  return (
    <div className="space-y-8">
      <EmailBreadcrumbs
        items={[
          { label: "Dashboard", href: "/" },
          { label: "Email", href: "/email/accounts" },
          { label: "Accounts" }
        ]}
      />

      <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <EmailPageIntro
          title="Cuentas de Correo Electrónico"
          description={description}
          helper={
            <>
              Esta feature te permite crear y gestionar email accounts.{" "}
              <span className="text-primary">Documentation</span> quedará conectada después.
            </>
          }
        />

        <Link href="/email/accounts/create">
          <button className="kinetic-gradient rounded-2xl px-6 py-3 text-sm font-black uppercase tracking-[0.16em] text-white shadow-lg shadow-primary/25 transition-transform active:scale-95">
            + Crear cuenta
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

      {feedback ? (
        <div className="rounded-2xl border border-primary/20 bg-primary/10 px-5 py-4 text-sm text-primary">
          {feedback}
        </div>
      ) : null}

      <div className="glass-card overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-white/5 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500">
            <span>Cuenta @ dominio</span>
            <span className="hidden md:inline text-zinc-700">|</span>
            <span>Restrictions</span>
            <span className="hidden md:inline text-zinc-700">|</span>
            <span>Storage</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 disabled:opacity-40"
              disabled={safePage === 1}
            >
              {"<"}
            </button>
            <div>
              Página {safePage} de {pageCount}
            </div>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 disabled:opacity-40"
              disabled={safePage === pageCount}
            >
              {">"}
            </button>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
              {filtered.length === 0 ? "0" : `${start + 1}-${Math.min(start + PAGE_SIZE, filtered.length)}`} de {filtered.length}
            </div>
          </div>
        </div>

        <div className="hidden xl:block overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left">
            <thead>
              <tr className="border-b border-white/5 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
                <th className="px-6 py-4">Cuenta</th>
                <th className="px-6 py-4">Restrictions</th>
                <th className="px-6 py-4">Storage: usado / allocated / %</th>
                <th className="px-6 py-4">Sync</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {renderRows({
                isLoading,
                accounts: paginated,
                onAction: runAction
              })}
            </tbody>
          </table>
        </div>

        <div className="space-y-4 p-4 xl:hidden">
          {isLoading ? (
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-8 text-center text-zinc-500 animate-pulse">
              Sincronizando buzones mock...
            </div>
          ) : paginated.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-8 text-center text-zinc-500">
              No hay cuentas que coincidan con tu búsqueda.
            </div>
          ) : (
            paginated.map((account) => (
              <div key={account.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-headline text-xl font-black tracking-tight text-white">
                      {account.address}
                    </div>
                    <div className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                      {account.devicesConnected} devices connected
                    </div>
                  </div>
                  <EmailStatusBadge status={account.status} />
                </div>
                <StorageMeter usedMb={account.usedMb} allocatedMb={account.allocatedMb} />
                <div className="text-xs text-zinc-500">Último sync: {account.lastSync}</div>
                <div className="flex flex-wrap gap-2">
                  <EmailActionButton icon="open_in_new" label="Check Email" onClick={() => runAction(account.id, "check-email")} />
                  <EmailActionButton icon="tune" label="Administrar" onClick={() => runAction(account.id, "manage")} />
                  <EmailActionButton icon="devices" label="Connect Devices" onClick={() => runAction(account.id, "connect-devices")} />
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
        <td colSpan={5} className="px-6 py-20 text-center text-zinc-500 animate-pulse">
          Sincronizando buzones mock...
        </td>
      </tr>
    );
  }

  if (accounts.length === 0) {
    return (
      <tr>
        <td colSpan={5} className="px-6 py-20 text-center text-zinc-500">
          No hay cuentas que coincidan con tu búsqueda.
        </td>
      </tr>
    );
  }

  return accounts.map((account) => (
    <tr key={account.id} className="hover:bg-white/[0.025] transition-colors">
      <td className="px-6 py-5">
        <div className="font-headline text-lg font-black tracking-tight text-white">
          {account.address}
        </div>
        <div className="mt-1 text-[11px] font-mono uppercase tracking-[0.14em] text-zinc-500">
          {account.username} • {account.devicesConnected} devices
        </div>
      </td>
      <td className="px-6 py-5">
        <EmailStatusBadge status={account.status} />
      </td>
      <td className="px-6 py-5">
        <StorageMeter usedMb={account.usedMb} allocatedMb={account.allocatedMb} />
      </td>
      <td className="px-6 py-5 text-sm text-zinc-400">{account.lastSync}</td>
      <td className="px-6 py-5">
        <div className="flex flex-wrap justify-end gap-2">
          <EmailActionButton icon="open_in_new" label="Check Email" onClick={() => onAction(account.id, "check-email")} />
          <EmailActionButton icon="tune" label="Administrar" onClick={() => onAction(account.id, "manage")} />
          <EmailActionButton icon="devices" label="Connect Devices" onClick={() => onAction(account.id, "connect-devices")} />
        </div>
      </td>
    </tr>
  ));
}
