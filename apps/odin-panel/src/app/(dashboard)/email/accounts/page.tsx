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
  EmailActionInternalLink,
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
  
  // Modal states
  const [selectedAccount, setSelectedAccount] = useState<EmailAccount | null>(null);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showDevicesModal, setShowDevicesModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleManagePassword = async () => {
    if (!selectedAccount || !newPassword) return;
    setIsSubmitting(true);
    try {
      const result = await actionMutation.mutateAsync({ 
        accountId: selectedAccount.id, 
        action: "manage",
        payload: { password: newPassword }
      });
      setFeedback(result.message);
      setShowManageModal(false);
      setNewPassword("");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Error al cambiar contraseña.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const runAction = async (
    accountId: string,
    action: "check-email" | "manage" | "connect-devices"
  ) => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return;

    if (action === "manage") {
      setSelectedAccount(account);
      setShowManageModal(true);
      return;
    }

    if (action === "connect-devices") {
      setSelectedAccount(account);
      setShowDevicesModal(true);
      return;
    }

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
          <button onClick={() => setFeedback(null)} className="ml-auto opacity-50 hover:opacity-100 transition-opacity">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
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

      {/* Modal de Gestión de Contraseña */}
      {showManageModal && selectedAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl space-y-8 animate-in zoom-in duration-300">
            <div className="space-y-2">
              <h3 className="text-2xl font-black tracking-tight text-slate-900">Seguridad de Cuenta</h3>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{selectedAccount.address}</p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Nueva Contraseña</label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#00A3FF] transition-colors">lock</span>
                  <input 
                    type="password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 10 caracteres"
                    className="w-full h-16 pl-14 pr-6 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-[#00A3FF] focus:ring-4 focus:ring-[#00A3FF]/5 transition-all outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button 
                onClick={() => setShowManageModal(false)}
                className="flex-1 h-16 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all active:scale-95"
              >
                Cancelar
              </button>
              <button 
                onClick={handleManagePassword}
                disabled={isSubmitting || newPassword.length < 10}
                className="flex-[2] h-16 bg-[#00A3FF] rounded-2xl text-[11px] font-black uppercase tracking-widest text-white shadow-lg shadow-[#00A3FF]/20 hover:bg-[#008EE0] transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
              >
                {isSubmitting ? "Actualizando..." : "Guardar Cambios"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Guía Gmail / Dispositivos */}
      {showDevicesModal && selectedAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 max-h-[90vh] flex flex-col">
            <div className="bg-slate-50/50 p-10 border-b border-slate-100 flex items-center justify-between">
              <div className="space-y-2">
                <h3 className="text-2xl font-black tracking-tight text-slate-900">Conectar Dispositivos</h3>
                <p className="text-xs font-bold text-[#00A3FF] uppercase tracking-widest">Guía de integración para Gmail y clientes externos</p>
              </div>
              <button onClick={() => setShowDevicesModal(false)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-slate-900 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-10 overflow-y-auto space-y-10">
              {/* Bloque: Parámetros Técnicos */}
              <div className="grid md:grid-cols-2 gap-8">
                <div className="p-8 rounded-3xl border border-slate-100 bg-slate-50/30 space-y-4">
                  <div className="flex items-center gap-3 text-[#00A3FF]">
                    <span className="material-symbols-outlined">download</span>
                    <span className="text-[10px] font-black uppercase tracking-widest">Correo Entrante (POP3/IMAP)</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-end border-b border-slate-100 pb-2">
                      <span className="text-[10px] font-black uppercase text-slate-400">Servidor</span>
                      <span className="text-sm font-bold text-slate-900">mail.{selectedAccount.domain}</span>
                    </div>
                    <div className="flex justify-between items-end border-b border-slate-100 pb-2">
                      <span className="text-[10px] font-black uppercase text-slate-400">Puerto IMAP</span>
                      <span className="text-sm font-bold text-slate-900">993 (SSL)</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-black uppercase text-slate-400">Puerto POP3</span>
                      <span className="text-sm font-bold text-slate-900">995 (SSL)</span>
                    </div>
                  </div>
                </div>

                <div className="p-8 rounded-3xl border border-slate-100 bg-slate-50/30 space-y-4">
                  <div className="flex items-center gap-3 text-[#00A3FF]">
                    <span className="material-symbols-outlined">upload</span>
                    <span className="text-[10px] font-black uppercase tracking-widest">Correo Saliente (SMTP)</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-end border-b border-slate-100 pb-2">
                      <span className="text-[10px] font-black uppercase text-slate-400">Servidor</span>
                      <span className="text-sm font-bold text-slate-900">mail.{selectedAccount.domain}</span>
                    </div>
                    <div className="flex justify-between items-end border-b border-slate-100 pb-2">
                      <span className="text-[10px] font-black uppercase text-slate-400">Puerto</span>
                      <span className="text-sm font-bold text-slate-900">465 (SSL)</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-black uppercase text-slate-400">Autenticación</span>
                      <span className="text-sm font-bold text-slate-900">Requerida</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bloque: Guía Gmail */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg" className="w-6 h-6" alt="Gmail" />
                  <span className="text-sm font-black uppercase tracking-widest text-slate-900">Instrucciones para Gmail</span>
                </div>
                
                <div className="space-y-4">
                  <div className="flex gap-4 p-5 rounded-2xl bg-slate-50/50 border border-slate-100">
                    <div className="w-8 h-8 rounded-full bg-[#00A3FF] text-white flex items-center justify-center font-black text-xs shrink-0">1</div>
                    <p className="text-xs font-bold leading-relaxed text-slate-600">
                      Ve a <span className="text-slate-900">Configuración &gt; Cuentas e importación</span> y busca la sección "Consultar el correo de otras cuentas".
                    </p>
                  </div>
                  <div className="flex gap-4 p-5 rounded-2xl bg-slate-50/50 border border-slate-100">
                    <div className="w-8 h-8 rounded-full bg-[#00A3FF] text-white flex items-center justify-center font-black text-xs shrink-0">2</div>
                    <p className="text-xs font-bold leading-relaxed text-slate-600">
                      Usa tu correo completo <span className="text-[#00A3FF]">{selectedAccount.address}</span> como nombre de usuario y la contraseña que definiste.
                    </p>
                  </div>
                  <div className="flex gap-4 p-5 rounded-2xl bg-slate-50/50 border border-slate-100">
                    <div className="w-8 h-8 rounded-full bg-[#00A3FF] text-white flex items-center justify-center font-black text-xs shrink-0">3</div>
                    <p className="text-xs font-bold leading-relaxed text-slate-600">
                      Para enviar, agrega la cuenta en "Enviar como". Selecciona servidor <span className="text-slate-900">mail.{selectedAccount.domain}</span> en el puerto <span className="text-slate-900">465</span> con conexión SSL.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-10 bg-slate-50/50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setShowDevicesModal(false)}
                className="px-10 h-16 bg-slate-900 rounded-2xl text-[11px] font-black uppercase tracking-widest text-white hover:bg-slate-800 transition-all active:scale-95"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
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
