"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { 
  useWhmAccounts, 
  useSuspendWhmAccount, 
  useResumeWhmAccount, 
  useImpersonateWhmAccount,
  useResetWhmAccountPassword
} from "../../../lib/hooks/use-whm-accounts";

export default function AccountsPage() {
  const [search, setSearch] = useState("");
  const { data: accounts = [], isLoading, isError } = useWhmAccounts();
  const suspendMutation = useSuspendWhmAccount();
  const resumeMutation = useResumeWhmAccount();
  const impersonateMutation = useImpersonateWhmAccount();
  const resetPassMutation = useResetWhmAccountPassword();

  const [resetModal, setResetModal] = useState<{ isOpen: boolean; accountId: string; username: string; newPass?: string }>({
    isOpen: false,
    accountId: "",
    username: ""
  });

  const filteredAccounts = useMemo(() => {
    const term = search.toLowerCase();
    return accounts.filter(acc => 
      acc.username.toLowerCase().includes(term) || 
      acc.domain.toLowerCase().includes(term) ||
      acc.email.toLowerCase().includes(term)
    );
  }, [accounts, search]);

  const onImpersonate = async (accountId: string) => {
    try {
      const data = await impersonateMutation.mutateAsync(accountId);
      window.open(data.odinPanelUrl, "_blank");
    } catch (error) {
      console.error(error);
      alert("Error al iniciar la suplantación de identidad");
    }
  };

  const handleResetPassword = async () => {
    try {
      const result = await resetPassMutation.mutateAsync({ accountId: resetModal.accountId });
      setResetModal(prev => ({ ...prev, newPass: result.password }));
    } catch (error) {
      alert("Error al restablecer la contraseña");
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-200 pb-10">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3 mb-1">
             <span className="px-2.5 py-1 bg-[#00A3FF]/10 text-[#00A3FF] text-[10px] font-bold uppercase rounded-full tracking-wider">
                Infraestructura Multicloud
             </span>
          </div>
          <h1 className="text-5xl font-black text-slate-900 uppercase">
            Gestión de <span className="text-[#00A3FF]">Cuentas</span>
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-2">
            Administra tus instancias activas y despliega nuevos entornos instantáneamente.
          </p>
        </div>
        <Link href="/accounts/create">
          <button className="bg-[#00A3FF] px-10 py-5 rounded-2xl text-white font-black uppercase text-[11px] tracking-widest shadow-xl shadow-[#00A3FF]/20 hover:bg-[#008EE0] active:scale-[0.98] transition-all flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">add</span>
            Nueva Instancia
          </button>
        </Link>
      </header>

      <div className="bg-white border border-slate-200 rounded-[3rem] shadow-sm overflow-hidden flex flex-col">
        <div className="px-10 py-6 border-b border-slate-100 flex items-center gap-6 bg-slate-50/50">
          <span className="material-symbols-outlined text-slate-300">search</span>
          <input 
            type="text" 
            placeholder="Buscar por usuario, dominio o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-slate-900 w-full font-bold text-sm placeholder:text-slate-300 placeholder:font-medium"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50/30 border-b border-slate-100">
                <th className="px-10 py-5">Identidad / Email</th>
                <th className="px-10 py-5">Dominio Principal</th>
                <th className="px-10 py-5">Estado</th>
                <th className="px-10 py-5 text-right">Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 bg-white">
              {isLoading ? (
                 <tr>
                   <td colSpan={4} className="p-24 text-center">
                     <div className="flex flex-col items-center gap-4">
                        <div className="w-10 h-10 border-4 border-slate-100 border-t-[#00A3FF] rounded-full animate-spin"></div>
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Escaneando infraestructura...</p>
                     </div>
                   </td>
                 </tr>
              ) : filteredAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-24 text-center">
                      <div className="flex flex-col items-center opacity-30">
                        <span className="material-symbols-outlined text-6xl text-slate-400">group_off</span>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-4">Sin resultados</p>
                      </div>
                    </td>
                  </tr>
              ) : filteredAccounts.map((account) => (
                <tr key={account.account_id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-10 py-6">
                    <div className="font-black text-slate-900 tracking-tight text-base group-hover:text-[#00A3FF] transition-colors">{account.username}</div>
                    <div className="text-[11px] text-slate-400 font-bold mt-0.5">{account.email}</div>
                  </td>
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-2">
                       <span className="material-symbols-outlined text-slate-200 text-[18px]">language</span>
                       <span className="font-bold text-slate-600 text-sm">{account.domain}</span>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                      account.status === 'active' 
                      ? 'border-[#00A3FF]/20 text-[#00A3FF] bg-[#00A3FF]/5 shadow-sm shadow-[#00A3FF]/5' 
                      : 'border-red-200 text-red-500 bg-red-50'
                    }`}>
                      {account.status === 'active' ? '● Activo' : '○ Suspendido'}
                    </span>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button 
                          onClick={() => onImpersonate(account.account_id)}
                          className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-[#00A3FF] hover:bg-[#00A3FF] hover:text-white hover:border-[#00A3FF] transition-all shadow-sm flex items-center justify-center"
                          title="Acceder como Usuario"
                        >
                         <span className="material-symbols-outlined text-[18px]">login</span>
                       </button>
                       <button 
                          onClick={() => setResetModal({ isOpen: true, accountId: account.account_id, username: account.username })}
                          className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-amber-500 hover:bg-amber-500 hover:text-white hover:border-amber-500 transition-all shadow-sm flex items-center justify-center"
                          title="Restablecer Contraseña"
                        >
                         <span className="material-symbols-outlined text-[18px]">lock_reset</span>
                       </button>
                       {account.status === 'active' ? (
                          <button 
                            onClick={() => suspendMutation.mutate(account.account_id)}
                            className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all shadow-sm flex items-center justify-center"
                            title="Suspender"
                          >
                            <span className="material-symbols-outlined text-[18px]">block</span>
                          </button>
                       ) : (
                          <button 
                            onClick={() => resumeMutation.mutate(account.account_id)}
                            className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-emerald-500 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all shadow-sm flex items-center justify-center"
                            title="Reactivar"
                          >
                            <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                          </button>
                       )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reset Password Modal */}
      {resetModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
           <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setResetModal({ ...resetModal, isOpen: false })}></div>
           <div className="bg-white border border-slate-200 rounded-[3rem] p-12 max-w-md w-full relative z-10 shadow-2xl animate-in zoom-in-95 duration-300">
              <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic mb-4">
                 Restablecer <span className="text-amber-500">Acceso</span>
              </h2>
              <p className="text-slate-500 text-sm font-medium mb-8">
                 ¿Deseas generar una nueva contraseña para <strong>{resetModal.username}</strong>? Se enviará una notificación al correo de contacto.
              </p>

              {resetModal.newPass ? (
                <div className="space-y-6">
                   <div className="p-6 bg-amber-50 border border-amber-100 rounded-2xl">
                      <div className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2">Nueva Contraseña Generada</div>
                      <div className="text-2xl font-mono font-bold text-slate-900 break-all select-all">{resetModal.newPass}</div>
                   </div>
                   <button 
                     onClick={() => setResetModal({ ...resetModal, isOpen: false, newPass: undefined })}
                     className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest"
                   >
                     Entendido
                   </button>
                </div>
              ) : (
                <div className="flex gap-4">
                   <button 
                     onClick={() => setResetModal({ ...resetModal, isOpen: false })}
                     className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-2xl font-black uppercase text-[11px] tracking-widest hover:bg-slate-100 transition-all"
                   >
                     Cancelar
                   </button>
                   <button 
                     onClick={handleResetPassword}
                     disabled={resetPassMutation.isPending}
                     className="flex-1 py-4 bg-amber-500 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-all active:scale-95 disabled:opacity-50"
                   >
                     {resetPassMutation.isPending ? "Generando..." : "Confirmar"}
                   </button>
                </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
}
