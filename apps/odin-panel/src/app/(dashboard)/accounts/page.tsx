"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { 
  useWhmAccounts, 
  useSuspendWhmAccount, 
  useResumeWhmAccount, 
  useImpersonateWhmAccount 
} from "../../../lib/hooks/use-whm-accounts";

export default function AccountsPage() {
  const [search, setSearch] = useState("");
  const { data: accounts = [], isLoading, isError } = useWhmAccounts();
  const suspendMutation = useSuspendWhmAccount();
  const resumeMutation = useResumeWhmAccount();
  const impersonateMutation = useImpersonateWhmAccount();

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
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-headline font-black text-white tracking-tighter uppercase italic">
            Account Management
          </h1>
          <p className="text-zinc-500 text-sm font-mono tracking-widest mt-1">
            Total Active Instances: {accounts.length}
          </p>
        </div>
        <Link href="/accounts/create">
          <button className="kinetic-gradient px-6 py-3 rounded-xl text-white font-black font-headline tracking-tight active:scale-95 transition-all shadow-lg shadow-primary/30 uppercase text-sm">
            + New Account
          </button>
        </Link>
      </header>

      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center gap-4">
          <span className="material-symbols-outlined text-primary">search</span>
          <input 
            type="text" 
            placeholder="Search by user, domain or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-white w-full font-body placeholder:text-zinc-600"
          />
        </div>

        <table className="w-full text-left italic-header">
          <thead>
            <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 border-b border-white/5">
              <th className="px-8 py-4">User / Email</th>
              <th className="px-8 py-4">Domain</th>
              <th className="px-8 py-4">Status</th>
              <th className="px-8 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading ? (
               <tr>
                 <td colSpan={4} className="p-20 text-center text-zinc-500 animate-pulse">
                   Mapping neural infrastructure...
                 </td>
               </tr>
            ) : filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-20 text-center text-zinc-500">
                    No matching accounts found.
                  </td>
                </tr>
            ) : filteredAccounts.map((account) => (
              <tr key={account.account_id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="px-8 py-6">
                  <div className="font-headline font-bold text-white tracking-tight">{account.username}</div>
                  <div className="text-[11px] text-zinc-500 font-mono">{account.email}</div>
                </td>
                <td className="px-8 py-6 font-mono text-zinc-400 text-sm">
                  {account.domain}
                </td>
                <td className="px-8 py-6">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                    account.status === 'active' ? 'border-primary/40 text-primary bg-primary/5' : 'border-red-500/40 text-red-400 bg-red-400/5'
                  }`}>
                    {account.status}
                  </span>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button 
                        onClick={() => onImpersonate(account.account_id)}
                        className="p-2 rounded-lg bg-white/5 text-primary hover:bg-primary hover:text-black transition-all"
                        title="Login as User"
                      >
                       <span className="material-symbols-outlined text-sm">login</span>
                     </button>
                     {account.status === 'active' ? (
                        <button 
                          onClick={() => suspendMutation.mutate(account.account_id)}
                          className="p-2 rounded-lg bg-white/5 text-red-400 hover:bg-red-400 hover:text-black transition-all"
                          title="Suspend"
                        >
                          <span className="material-symbols-outlined text-sm">block</span>
                        </button>
                     ) : (
                        <button 
                          onClick={() => resumeMutation.mutate(account.account_id)}
                          className="p-2 rounded-lg bg-white/5 text-emerald-400 hover:bg-emerald-400 hover:text-black transition-all"
                          title="Resume"
                        >
                          <span className="material-symbols-outlined text-sm">play_arrow</span>
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
  );
}
