"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { AppShell, UIButton, UINotice, UIStatusBadge, UITable } from "@odisea/ui";

import {
  useImpersonateWhmAccount,
  useResumeWhmAccount,
  useSuspendWhmAccount,
  useWhmAccounts
} from "../../../lib/hooks/use-whm-accounts";

export default function WhmAccountsPage() {
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState("");

  const accountsQuery = useWhmAccounts();
  const suspendMutation = useSuspendWhmAccount();
  const resumeMutation = useResumeWhmAccount();
  const impersonateMutation = useImpersonateWhmAccount();

  const rows = useMemo(() => {
    const list = accountsQuery.data ?? [];
    const term = search.trim().toLowerCase();

    if (!term) return list;

    return list.filter((item) => {
      return (
        item.username.toLowerCase().includes(term) ||
        item.domain.toLowerCase().includes(term) ||
        item.email.toLowerCase().includes(term)
      );
    });
  }, [accountsQuery.data, search]);

  const onImpersonate = async (accountId: string) => {
    setFeedback("");

    try {
      const data = await impersonateMutation.mutateAsync(accountId);
      window.open(data.odinPanelUrl, "_blank", "noopener,noreferrer");
      setFeedback("Impersonación iniciada en una nueva pestaña.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo iniciar impersonación");
    }
  };

  return (
    <AppShell title="ODISEA CLOUD · WHM · Cuentas" accent="violet" subtitle="Gestiona ciclo de vida de cuentas y acceso por impersonación.">
      <section className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por usuario, dominio o email"
            className="w-full max-w-md rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-zinc-100 outline-none ring-violet-400/50 transition focus:ring-2"
          />
          <Link href="/whm/accounts/create">
            <UIButton variant="primary">Nueva cuenta</UIButton>
          </Link>
        </div>

        <UITable
          header={
            <tr>
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Dominio</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Disco</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          }
        >
          {rows.map((item) => (
            <tr key={item.account_id} className="border-t border-white/10 hover:bg-white/[0.02]">
              <td className="px-4 py-3">
                <p className="font-medium text-white">{item.username}</p>
                <p className="text-xs text-zinc-400">{item.email}</p>
              </td>
              <td className="px-4 py-3 text-zinc-200">{item.domain}</td>
              <td className="px-4 py-3 text-zinc-200">{item.plan_name ?? "Sin plan"}</td>
              <td className="px-4 py-3">
                <UIStatusBadge status={item.status} />
              </td>
              <td className="px-4 py-3 text-zinc-200">{item.disk_used_mb} MB</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <UIButton
                    variant="ghost"
                    className="border-cyan-400/40 text-cyan-200 hover:bg-cyan-400/10"
                    onClick={() => onImpersonate(item.account_id)}
                  >
                    Login as User
                  </UIButton>

                  {item.status === "active" ? (
                    <UIButton
                      variant="ghost"
                      className="border-amber-400/40 text-amber-200 hover:bg-amber-400/10"
                      onClick={() => suspendMutation.mutate(item.account_id)}
                    >
                      Suspender
                    </UIButton>
                  ) : (
                    <UIButton
                      variant="ghost"
                      className="border-emerald-400/40 text-emerald-200 hover:bg-emerald-400/10"
                      onClick={() => resumeMutation.mutate(item.account_id)}
                    >
                      Reactivar
                    </UIButton>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </UITable>

        {accountsQuery.isLoading && <p className="mt-3 text-sm text-zinc-400">Cargando cuentas...</p>}
        {accountsQuery.isError && <UINotice tone="error">No se pudieron cargar las cuentas.</UINotice>}
        {feedback && <UINotice tone="info">{feedback}</UINotice>}
      </section>
    </AppShell>
  );
}
