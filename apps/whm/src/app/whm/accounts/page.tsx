"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { 
  useWhmAccounts, 
  useSuspendWhmAccount, 
  useResumeWhmAccount, 
  useImpersonateWhmAccount,
  useDeleteWhmAccount
} from "../../../lib/hooks/use-whm-accounts";

export default function WhmAccountsPage() {
  const [search, setSearch] = useState("");
  const { data: accounts = [], isLoading, isError } = useWhmAccounts();
  const suspendMutation = useSuspendWhmAccount();
  const resumeMutation = useResumeWhmAccount();
  const impersonateMutation = useImpersonateWhmAccount();
  const deleteMutation = useDeleteWhmAccount();

  const onDelete = async (accountId: string, username: string) => {
    if (confirm(`Are you sure you want to permanently DELETE the account "${username}"? This action cannot be undone.`)) {
      try {
        await deleteMutation.mutateAsync(accountId);
      } catch (error) {
        console.error(error);
        alert("Deletion failed: " + (error instanceof Error ? error.message : "Internal Error"));
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
      alert("Error initiating impersonation");
    }
  };

  return (
    <div className="space-y-10 max-w-7xl mx-auto">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 border-b border-white/5 pb-8">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 mb-1">
             <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[8px] font-black uppercase rounded border border-primary/20 tracking-tighter">Network Infrastructure</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic font-headline">
            Account <span className="text-primary not-italic">Management</span>
          </h1>
          <p className="text-zinc-500 text-[10px] font-mono tracking-widest uppercase opacity-60">
            Cluster Nodes: {accounts.length} | Status: Nominal
          </p>
        </div>
        <Link href="/whm/accounts/create">
          <button className="kinetic-gradient px-6 py-2.5 rounded-xl text-white font-black text-[10px] tracking-widest uppercase shadow-lg shadow-primary/20 hover:translate-y-[-1px] transition-all">
            + Provision Node
          </button>
        </Link>
      </header>

      <div className="bg-[#0A1221]/40 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-white/5 flex items-center gap-4 bg-white/[0.01]">
          <span className="material-symbols-outlined text-primary text-[20px]">search</span>
          <input 
            type="text" 
            placeholder="Filter instances by user, domain or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-white w-full font-sans placeholder:text-zinc-700 text-sm tracking-tight"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 border-b border-white/5 bg-white/[0.01]">
                <th className="px-8 py-4">Instance / Admin</th>
                <th className="px-8 py-4">Root Domain</th>
                <th className="px-8 py-4">Status</th>
                <th className="px-8 py-4 text-right">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                 <tr>
                   <td colSpan={4} className="p-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                         <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                         <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Syncing Nodes...</span>
                      </div>
                   </td>
                 </tr>
              ) : isError ? (
                  <tr>
                     <td colSpan={4} className="p-20 text-center text-red-500/60 font-black uppercase text-[10px] tracking-widest">
                        Critical Error: Failed to reach API cluster.
                     </td>
                  </tr>
              ) : filteredAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-20 text-center text-zinc-700 italic text-sm">
                      No matching infrastructure units found.
                    </td>
                  </tr>
              ) : filteredAccounts.map((account) => (
                <tr key={account.account_id} className="hover:bg-primary/[0.02] transition-all group duration-300">
                  <td className="px-8 py-5">
                    <div className="font-bold text-white tracking-tight group-hover:text-primary transition-colors text-sm">{account.username}</div>
                    <div className="text-[10px] text-zinc-600 font-mono mt-0.5">{account.email}</div>
                  </td>
                  <td className="px-8 py-5">
                     <div className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-zinc-800"></div>
                        <span className="font-mono text-zinc-500 text-xs tracking-tight">{account.domain}</span>
                     </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all ${
                      account.status === 'active' 
                        ? 'border-primary/20 text-primary bg-primary/5' 
                        : 'border-red-500/20 text-red-400 bg-red-400/5'
                    }`}>
                      {account.status}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                       <button 
                          onClick={() => onImpersonate(account.account_id)}
                          className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/5 text-primary hover:bg-primary hover:text-black transition-all flex items-center justify-center"
                          title="Delegate Login"
                        >
                         <span className="material-symbols-outlined text-[16px]">login</span>
                       </button>
                       {account.status === 'active' ? (
                          <button 
                            onClick={() => suspendMutation.mutate(account.account_id)}
                            className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/5 text-red-500 hover:bg-red-500 hover:text-black transition-all flex items-center justify-center"
                            title="Suspend"
                          >
                            <span className="material-symbols-outlined text-[16px]">block</span>
                          </button>
                       ) : (
                          <button 
                            onClick={() => resumeMutation.mutate(account.account_id)}
                            className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/5 text-emerald-400 hover:bg-emerald-400 hover:text-black transition-all flex items-center justify-center"
                            title="Restore"
                          >
                            <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                          </button>
                       )}
                        <button 
                          onClick={() => onDelete(account.account_id, account.username)}
                          className="w-8 h-8 rounded-lg bg-white/[0.03] border border-red-500/10 text-zinc-600 hover:bg-red-500/20 hover:text-red-500 transition-all flex items-center justify-center"
                          title="Delete"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                     </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
