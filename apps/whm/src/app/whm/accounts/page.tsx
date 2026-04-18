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
    <div className="space-y-8 max-w-7xl mx-auto">
      <header className="flex justify-between items-end">
        <div className="space-y-1">
          <div className="flex items-center gap-3 mb-1">
             <span className="px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-black uppercase rounded border border-primary/20 tracking-widest">
                Network Infrastructure
             </span>
          </div>
          <h1 className="text-5xl font-headline font-black text-white tracking-tighter uppercase italic">
            Account Management
          </h1>
          <p className="text-zinc-500 text-sm font-mono tracking-widest mt-1">
            Cluster Nodes: {accounts.length} | Operational Status: Nominal
          </p>
        </div>
        <Link href="/whm/accounts/create">
          <button className="kinetic-gradient px-8 py-4 rounded-2xl text-white font-black font-headline tracking-widest active:scale-95 transition-all shadow-xl shadow-primary/40 uppercase text-xs">
            + Provision Node
          </button>
        </Link>
      </header>

      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center gap-4 bg-white/[0.01]">
          <span className="material-symbols-outlined text-primary">search</span>
          <input 
            type="text" 
            placeholder="Filter instances by user, domain or administrative email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-white w-full font-body placeholder:text-zinc-600 text-sm tracking-tight"
          />
        </div>

        <table className="w-full text-left italic-header">
          <thead>
            <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 border-b border-white/5">
              <th className="px-8 py-5">Instance / Admin</th>
              <th className="px-8 py-5">Root Domain</th>
              <th className="px-8 py-5">Status</th>
              <th className="px-8 py-5 text-right">Operations</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading ? (
               <tr>
                 <td colSpan={4} className="p-24 text-center">
                    <div className="flex flex-col items-center gap-4">
                       <span className="material-symbols-outlined text-4xl text-primary animate-spin">cyclone</span>
                       <span className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500 animate-pulse">Syncing Neural Nodes...</span>
                    </div>
                 </td>
               </tr>
            ) : isError ? (
                <tr>
                   <td colSpan={4} className="p-24 text-center text-red-400 font-black uppercase text-xs tracking-widest">
                      CRITICAL ERROR: Failed to reach core API clusters.
                   </td>
                </tr>
            ) : filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-24 text-center text-zinc-500 italic font-medium">
                    No matching infrastructure units found in the current sector.
                  </td>
                </tr>
            ) : filteredAccounts.map((account) => (
              <tr key={account.account_id} className="hover:bg-white/[0.03] transition-all group duration-300">
                <td className="px-8 py-6">
                  <div className="font-headline font-bold text-white tracking-tight group-hover:text-primary transition-colors">{account.username}</div>
                  <div className="text-[11px] text-zinc-500 font-mono mt-0.5">{account.email}</div>
                </td>
                <td className="px-8 py-6">
                   <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-700"></span>
                      <span className="font-mono text-zinc-400 text-sm tracking-tight">{account.domain}</span>
                   </div>
                </td>
                <td className="px-8 py-6">
                  <span className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${
                    account.status === 'active' 
                      ? 'border-primary/40 text-primary bg-primary/5 shadow-[0_0_15px_rgba(0,163,255,0.1)]' 
                      : 'border-red-500/40 text-red-400 bg-red-400/5'
                  }`}>
                    {account.status}
                  </span>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                     <button 
                        onClick={() => onImpersonate(account.account_id)}
                        className="p-3 rounded-xl bg-white/5 text-primary hover:bg-primary hover:text-black transition-all shadow-lg"
                        title="Delegate Login (Impersonate)"
                      >
                       <span className="material-symbols-outlined text-sm">login</span>
                     </button>
                     {account.status === 'active' ? (
                        <button 
                          onClick={() => suspendMutation.mutate(account.account_id)}
                          className="p-3 rounded-xl bg-white/5 text-red-500 hover:bg-red-500 hover:text-black transition-all shadow-lg"
                          title="Suspend Service"
                        >
                          <span className="material-symbols-outlined text-sm">block</span>
                        </button>
                     ) : (
                        <button 
                          onClick={() => resumeMutation.mutate(account.account_id)}
                          className="p-3 rounded-xl bg-white/5 text-emerald-400 hover:bg-emerald-400 hover:text-black transition-all shadow-lg"
                          title="Restore Service"
                        >
                          <span className="material-symbols-outlined text-sm">play_arrow</span>
                        </button>
                     )}
                      
                      <button 
                        onClick={() => onDelete(account.account_id, account.username)}
                        className="p-3 rounded-xl bg-white/5 text-red-600 hover:bg-black hover:text-red-500 transition-all shadow-lg border border-red-500/10"
                        title="Delete Account Permanently"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
