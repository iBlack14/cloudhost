"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { 
  useWhmAccounts, 
  useSuspendWhmAccount, 
  useResumeWhmAccount, 
  useImpersonateWhmAccount,
  useDeleteWhmAccount,
  useSyncWhmDiskUsage,
  useResetWhmAccountPassword,
  useWhmPlans,
  useChangeWhmAccountPlan
} from "../../../lib/hooks/use-whm-accounts";

export default function WhmAccountsPage() {
  const [search, setSearch] = useState("");
  const { data: accounts = [], isLoading, isError } = useWhmAccounts();
  const { data: plans = [] } = useWhmPlans();
  const suspendMutation = useSuspendWhmAccount();
  const resumeMutation = useResumeWhmAccount();
  const impersonateMutation = useImpersonateWhmAccount();
  const deleteMutation = useDeleteWhmAccount();
  const syncDiskMutation = useSyncWhmDiskUsage();
  const resetPassMutation = useResetWhmAccountPassword();
  const changePlanMutation = useChangeWhmAccountPlan();

  const [resetModal, setResetModal] = useState<{ isOpen: boolean; accountId: string; username: string; newPass?: string }>({
    isOpen: false,
    accountId: "",
    username: ""
  });

  const [planModal, setPlanModal] = useState<{ isOpen: boolean; accountId: string; username: string; currentPlan: string }>({
    isOpen: false,
    accountId: "",
    username: "",
    currentPlan: ""
  });

  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedDurationMonths, setSelectedDurationMonths] = useState<number | undefined>(undefined);

  const onDelete = async (accountId: string, username: string) => {
    if (confirm(`¿Estás seguro de que deseas ELIMINAR permanentemente la cuenta "${username}"? Esta acción no se puede deshacer.`)) {
      try {
        await deleteMutation.mutateAsync(accountId);
        toast.success(`Cuenta "${username}" eliminada permanentemente`);
      } catch (error) {
        console.error(error);
        toast.error("Fallo al eliminar: " + (error instanceof Error ? error.message : "Error Interno"));
      }
    }
  };

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
      toast.error("Error al iniciar la suplantación");
    }
  };

  const handleResetPassword = async () => {
    try {
      const result = await resetPassMutation.mutateAsync({ accountId: resetModal.accountId });
      setResetModal(prev => ({ ...prev, newPass: result.password }));
    } catch (error) {
      toast.error("Error al restablecer la contraseña");
    }
  };

  const handleChangePlan = async () => {
    if (!selectedPlanId) return;
    try {
      await changePlanMutation.mutateAsync({ 
        accountId: planModal.accountId, 
        planId: selectedPlanId,
        durationMonths: selectedDurationMonths
      });
      setPlanModal({ ...planModal, isOpen: false });
      setSelectedPlanId("");
      setSelectedDurationMonths(undefined);
      toast.success("Plan actualizado correctamente");
    } catch (error) {
      toast.error("Error al cambiar el plan");
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 max-w-7xl mx-auto">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 border-b border-slate-200 pb-8">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 mb-1">
             <span className="px-2 py-0.5 bg-[#00A3FF]/10 text-[#00A3FF] text-[9px] font-bold uppercase rounded border border-[#00A3FF]/20 tracking-widest">Infraestructura de Red</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">
            Administración de <span className="text-[#00A3FF]">Cuentas</span>
          </h1>
          <p className="text-slate-500 text-[11px] font-bold tracking-widest uppercase mt-2">
            Nodos en Clúster: {accounts.length} | Estado: Operativo
          </p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => syncDiskMutation.mutate()}
            disabled={syncDiskMutation.isPending}
            className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-[11px] tracking-widest uppercase hover:bg-slate-50 transition-all flex items-center gap-2 disabled:opacity-50 shadow-sm"
          >
            <span className={`material-symbols-outlined text-[18px] ${syncDiskMutation.isPending ? 'animate-spin' : ''}`}>sync</span>
            {syncDiskMutation.isPending ? 'Sincronizando...' : 'Sinc. Disco'}
          </button>
          <Link href="/whm/accounts/create">
            <button className="bg-[#00A3FF] px-6 py-3 rounded-xl text-white font-bold text-[11px] tracking-widest uppercase shadow-lg shadow-[#00A3FF]/20 hover:bg-[#008EE0] active:scale-95 transition-all">
              + Nuevo Nodo
            </button>
          </Link>
        </div>
      </header>

      <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 flex items-center gap-4 bg-slate-50/50">
          <span className="material-symbols-outlined text-[#00A3FF] text-[22px]">search</span>
          <input 
            type="text" 
            placeholder="Filtrar instancias por usuario, dominio o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-slate-900 w-full font-sans placeholder:text-slate-400 text-sm font-medium"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-slate-100 bg-slate-50/30">
                <th className="px-8 py-5">Instancia / Usuario</th>
                <th className="px-8 py-5">Dominio Raíz</th>
                <th className="px-8 py-5">Paquete / Cuota</th>
                <th className="px-8 py-5">Uso de Disco</th>
                <th className="px-8 py-5">Estado</th>
                <th className="px-8 py-5 text-right">Operaciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                 <tr>
                   <td colSpan={6} className="p-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                         <div className="w-8 h-8 border-[3px] border-[#00A3FF]/20 border-t-[#00A3FF] rounded-full animate-spin"></div>
                         <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Sincronizando Nodos...</span>
                      </div>
                   </td>
                 </tr>
              ) : isError ? (
                   <tr>
                      <td colSpan={6} className="p-20 text-center text-red-600 font-bold uppercase text-[11px] tracking-widest">
                         Error Crítico: No se pudo conectar con el clúster API.
                      </td>
                   </tr>
              ) : filteredAccounts.length === 0 ? (
                   <tr>
                     <td colSpan={6} className="p-20 text-center text-slate-500 font-medium italic text-sm">
                       No se encontraron unidades de infraestructura coincidentes.
                     </td>
                   </tr>
              ) : filteredAccounts.map((account) => (
                <tr key={account.account_id} className="hover:bg-slate-50/80 transition-all group duration-300">
                  <td className="px-8 py-5">
                    <div className="font-bold text-slate-900 tracking-tight group-hover:text-[#00A3FF] transition-colors text-[15px]">{account.username}</div>
                    <div className="text-[11px] text-slate-500 font-medium mt-0.5">{account.email}</div>
                  </td>
                  <td className="px-8 py-5">
                     <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-600 text-xs font-medium">{account.domain}</span>
                     </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="text-xs font-bold text-slate-700 uppercase tracking-tight">{account.plan_name || "Ilimitado"}</div>
                        <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                          {account.disk_quota_mb ? `${account.disk_quota_mb} MB` : "∞ MB"}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tight">
                          {account.plan_expires_at 
                            ? `Expira: ${new Date(account.plan_expires_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}` 
                            : "Expira: Nunca"}
                        </div>
                      </div>
                      <button 
                        onClick={() => setPlanModal({ isOpen: true, accountId: account.account_id, username: account.username, currentPlan: account.plan_name || "Ilimitado" })}
                        className="p-1.5 rounded-lg bg-slate-50 border border-slate-100 text-slate-400 hover:text-[#00A3FF] hover:border-[#00A3FF]/20 transition-all"
                        title="Cambiar Plan"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit_note</span>
                      </button>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col gap-2 min-w-[140px]">
                      <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                        <span>{account.disk_used_mb} MB</span>
                        {account.disk_quota_mb && (
                          <span className={account.disk_used_mb / account.disk_quota_mb > 0.8 ? 'text-red-500' : 'text-[#00A3FF]'}>
                            {Math.round((account.disk_used_mb / account.disk_quota_mb) * 100)}%
                          </span>
                        )}
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                        <div 
                          className={`h-full transition-all duration-1000 ${account.disk_quota_mb && account.disk_used_mb / account.disk_quota_mb > 0.8 ? 'bg-red-500' : 'bg-[#00A3FF]'}`} 
                          style={{ width: `${account.disk_quota_mb ? Math.min(100, (account.disk_used_mb / account.disk_quota_mb) * 100) : 0}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest border transition-all ${
                      account.status === 'active' 
                        ? 'border-[#00A3FF]/20 text-[#00A3FF] bg-[#00A3FF]/5' 
                        : 'border-red-200 text-red-600 bg-red-50'
                    }`}>
                      {account.status === 'active' ? 'ACTIVO' : 'SUSPENDIDO'}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-3 transition-all">
                       <button 
                          onClick={() => onImpersonate(account.account_id)}
                          className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 text-[#00A3FF] hover:bg-[#00A3FF] hover:text-white transition-all flex items-center justify-center shadow-sm"
                          title="Acceder como Usuario"
                        >
                         <span className="material-symbols-outlined text-[20px]">login</span>
                       </button>
                       <button 
                          onClick={() => setResetModal({ isOpen: true, accountId: account.account_id, username: account.username })}
                          className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 text-amber-500 hover:bg-amber-500 hover:text-white transition-all flex items-center justify-center shadow-sm"
                          title="Restablecer Contraseña"
                        >
                         <span className="material-symbols-outlined text-[20px]">lock_reset</span>
                       </button>
                       {account.status === 'active' ? (
                          <button 
                            onClick={() => suspendMutation.mutate(account.account_id)}
                            className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shadow-sm"
                            title="Suspender"
                          >
                            <span className="material-symbols-outlined text-[20px]">block</span>
                          </button>
                       ) : (
                          <button 
                            onClick={() => resumeMutation.mutate(account.account_id)}
                            className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center shadow-sm"
                            title="Activar"
                          >
                            <span className="material-symbols-outlined text-[20px]">play_arrow</span>
                          </button>
                       )}
                        <button 
                          onClick={() => onDelete(account.account_id, account.username)}
                          className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 hover:bg-red-600 hover:text-white transition-all flex items-center justify-center shadow-sm"
                          title="Eliminar"
                        >
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
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
           <div className="bg-white border border-slate-200 rounded-[2rem] p-10 max-w-md w-full relative z-10 shadow-2xl animate-in zoom-in-95 duration-300">
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic mb-4">
                 Restablecer <span className="text-amber-500">Acceso</span>
              </h2>
              <p className="text-slate-500 text-[13px] font-medium mb-8">
                 ¿Deseas generar una nueva contraseña para la instancia <strong>{resetModal.username}</strong>? Se enviará una notificación al correo del administrador.
              </p>

              {resetModal.newPass ? (
                <div className="space-y-6">
                   <div className="p-6 bg-amber-50 border border-amber-100 rounded-2xl">
                      <div className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2">Nueva Contraseña Generada</div>
                      <div className="text-xl font-mono font-bold text-slate-900 break-all select-all">{resetModal.newPass}</div>
                   </div>
                   <button 
                     onClick={() => setResetModal({ ...resetModal, isOpen: false, newPass: undefined })}
                     className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold uppercase text-[11px] tracking-widest"
                   >
                     Entendido
                   </button>
                </div>
              ) : (
                <div className="flex gap-4">
                   <button 
                     onClick={() => setResetModal({ ...resetModal, isOpen: false })}
                     className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-xl font-bold uppercase text-[11px] tracking-widest hover:bg-slate-100 transition-all"
                   >
                     Cancelar
                   </button>
                   <button 
                     onClick={handleResetPassword}
                     disabled={resetPassMutation.isPending}
                     className="flex-1 py-4 bg-amber-500 text-white rounded-xl font-bold uppercase text-[11px] tracking-widest shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-all active:scale-95 disabled:opacity-50"
                   >
                     {resetPassMutation.isPending ? "Generando..." : "Confirmar"}
                   </button>
                </div>
              )}
           </div>
        </div>
      )}

      {/* Change Plan Modal */}
      {planModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
           <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setPlanModal({ ...planModal, isOpen: false })}></div>
           <div className="bg-white border border-slate-200 rounded-[2rem] p-10 max-w-md w-full relative z-10 shadow-2xl animate-in zoom-in-95 duration-300">
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic mb-4">
                 Cambiar <span className="text-[#00A3FF]">Plan</span>
              </h2>
              <p className="text-slate-500 text-[13px] font-medium mb-8">
                 Selecciona un nuevo paquete para la cuenta <strong>{planModal.username}</strong>. El cambio de cuota será instantáneo.
              </p>

              <div className="space-y-6">
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Paquetes Disponibles</label>
                    <select 
                      value={selectedPlanId}
                      onChange={(e) => setSelectedPlanId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-[#00A3FF]/20 transition-all outline-none"
                    >
                       <option value="">Selecciona un plan...</option>
                       {plans.map((plan) => (
                         <option key={plan.id} value={plan.id}>
                           {plan.name} ({plan.disk_quota_mb ? `${plan.disk_quota_mb} MB` : '∞'})
                         </option>
                       ))}
                    </select>
                 </div>

                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Periodo de Suscripción</label>
                    <select 
                      value={selectedDurationMonths ?? ""}
                      onChange={(e) => setSelectedDurationMonths(e.target.value === "" ? undefined : parseInt(e.target.value, 10))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-[#00A3FF]/20 transition-all outline-none"
                    >
                       <option value="">Mantener actual / Sin cambiar</option>
                       <option value="-1">Sin Expiración / Ilimitado</option>
                       <option value="1">1 Mes</option>
                       <option value="3">3 Meses</option>
                       <option value="6">6 Meses</option>
                       <option value="12">1 Año</option>
                       <option value="24">2 Años</option>
                    </select>
                 </div>

                 <div className="flex gap-4">
                    <button 
                      onClick={() => setPlanModal({ ...planModal, isOpen: false })}
                      className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-xl font-bold uppercase text-[11px] tracking-widest hover:bg-slate-100 transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={handleChangePlan}
                      disabled={!selectedPlanId || changePlanMutation.isPending}
                      className="flex-1 py-4 bg-[#00A3FF] text-white rounded-xl font-bold uppercase text-[11px] tracking-widest shadow-lg shadow-[#00A3FF]/20 hover:bg-[#008EE0] transition-all active:scale-95 disabled:opacity-50"
                    >
                      {changePlanMutation.isPending ? "Actualizando..." : "Actualizar"}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
