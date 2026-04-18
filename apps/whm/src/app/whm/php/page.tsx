"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

const getWhmToken = () =>
  typeof window !== "undefined" ? window.sessionStorage.getItem("whm-access-token") : null;

const whmHeaders = () => {
  const t = getWhmToken();
  return t ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
};

interface PhpStatus {
  version: string;
  status: "active" | "inactive" | "not_installed";
  installed: boolean;
  extensions: string[];
}

interface PhpAccount {
  account_id: string;
  username: string;
  domain: string;
  php_version: string;
}

export default function WhmPhpManager() {
  const queryClient = useQueryClient();
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<string>("8.2");

  const { data: statuses, isLoading: loadStatus } = useQuery<PhpStatus[]>({
    queryKey: ["whm_php_status"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/whm/php/status`, { headers: whmHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "Error fetching status");
      return data.data;
    },
  });

  const { data: accounts, isLoading: loadAccounts } = useQuery<PhpAccount[]>({
    queryKey: ["whm_php_accounts"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/whm/php/accounts`, { headers: whmHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "Error fetching accounts");
      return data.data;
    },
  });

  const changeAccountPhp = useMutation({
    mutationFn: async ({ accountId, version }: { accountId: string; version: string }) => {
      const res = await fetch(`${API_BASE}/whm/php/accounts/${accountId}`, {
        method: "PATCH",
        headers: whmHeaders(),
        body: JSON.stringify({ version }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "Error update");
      return data;
    },
    onSuccess: () => {
      setEditingAccountId(null);
      queryClient.invalidateQueries({ queryKey: ["whm_php_accounts"] });
    },
  });

  const reloadFpm = useMutation({
    mutationFn: async (version: string) => {
      const res = await fetch(`${API_BASE}/whm/php/reload/${version}`, {
        method: "POST",
        headers: whmHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "Error reload");
      return data;
    },
    onSuccess: () => {
      alert("Servicio PHP-FPM recargado correctamente.");
      queryClient.invalidateQueries({ queryKey: ["whm_php_status"] });
    },
  });

  if (loadStatus || loadAccounts) {
    return <div className="text-white">Cargando Multi-PHP Manager...</div>;
  }

  return (
    <div className="space-y-8 animate-fade-in relative z-10 w-full max-w-7xl mx-auto">
      <header className="flex justify-between items-end">
        <div className="space-y-1 glass-card p-6 rounded-2xl border-l-4 border-l-primary inline-block">
          <h1 className="text-4xl font-headline font-black text-white tracking-tighter uppercase italic">
            Multi-PHP <span className="text-primary">Manager</span>
          </h1>
          <p className="text-zinc-500 font-mono tracking-widest text-[10px] uppercase">
            Control de demonios FPM y versiones por cuenta cliente
          </p>
        </div>
      </header>

      {/* Pools Status */}
      <section className="glass-card p-6 rounded-2xl">
        <h2 className="text-xl font-headline font-black text-white uppercase italic mb-6">Estado de Servicios FPM</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {statuses?.map((s) => (
            <div key={s.version} className="bg-black/30 p-4 rounded-xl border border-white/5 flex flex-col gap-2 relative overflow-hidden group">
              <div className="flex justify-between items-center">
                <span className="text-primary font-black italic text-2xl">v{s.version}</span>
                <span className={`w-3 h-3 rounded-full shadow-lg ${s.status === 'active' ? 'bg-green-500 shadow-green-500/50' : s.installed ? 'bg-yellow-500 shadow-yellow-500/50' : 'bg-red-500 shadow-red-500/50'}`}></span>
              </div>
              <span className="text-xs text-zinc-400 font-mono">
                {s.status === 'active' ? 'Running' : s.installed ? 'Inactive' : 'Not Installed'}
              </span>
              
              {s.installed && (
                <button 
                  onClick={() => { if(confirm(`Reload PHP ${s.version} FPM?`)) reloadFpm.mutate(s.version) }}
                  disabled={reloadFpm.isPending}
                  className="mt-2 w-full py-1.5 text-[10px] font-black uppercase tracking-widest bg-white/5 hover:bg-primary/20 text-white rounded transition-colors"
                >
                  Reload Service
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Account Version Assignment */}
      <section className="glass-card p-6 rounded-2xl">
        <h2 className="text-xl font-headline font-black text-white uppercase italic mb-6">Asignación por Cuentas</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 uppercase text-[10px] tracking-widest text-zinc-500 font-black">
                <th className="p-3">Username</th>
                <th className="p-3">Domain</th>
                <th className="p-3">PHP Version</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts?.map((acc) => (
                <tr key={acc.account_id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="p-3 text-white font-bold">{acc.username}</td>
                  <td className="p-3 text-zinc-400 text-sm font-mono">{acc.domain}</td>
                  <td className="p-3">
                    {editingAccountId === acc.account_id ? (
                      <select 
                        value={selectedVersion}
                        onChange={(e) => setSelectedVersion(e.target.value)}
                        className="bg-black text-primary font-bold px-2 py-1 rounded border border-primary/30 outline-none"
                      >
                        {statuses?.filter(s => s.installed).map(s => (
                          <option key={s.version} value={s.version}>{s.version}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="px-2 py-1 bg-white/5 border border-white/10 rounded font-mono text-xs text-zinc-300">
                        {acc.php_version}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    {editingAccountId === acc.account_id ? (
                      <div className="flex gap-2 justify-end">
                        <button 
                          onClick={() => setEditingAccountId(null)}
                          className="text-xs uppercase font-bold text-zinc-500 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => changeAccountPhp.mutate({ accountId: acc.account_id, version: selectedVersion })}
                          disabled={changeAccountPhp.isPending}
                          className="text-xs uppercase font-bold text-secondary hover:text-white bg-secondary/10 px-3 py-1 rounded"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => {
                           setEditingAccountId(acc.account_id);
                           setSelectedVersion(acc.php_version);
                        }}
                        className="text-xs uppercase tracking-widest font-black text-primary hover:text-white"
                      >
                        Manage
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {accounts?.length === 0 && (
            <div className="py-10 text-center text-zinc-500 text-sm">No accounts found.</div>
          )}
        </div>
      </section>
    </div>
  );
}
