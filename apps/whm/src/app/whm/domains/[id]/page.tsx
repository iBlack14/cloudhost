"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";
const getWhmToken = () => typeof window !== "undefined" ? window.sessionStorage.getItem("whm-access-token") : null;
const whmHeaders = () => {
  const t = getWhmToken();
  return t ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
};

type RecordType = "A" | "AAAA" | "CNAME" | "MX" | "TXT" | "SRV" | "NS";

interface DnsRecord {
  id: string;
  name: string;
  type: RecordType;
  content: string;
  priority: number | null;
  ttl: number;
}

export default function DnsZoneEditor({ params }: { params: { id: string } }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  
  const [newRec, setNewRec] = useState<{ name: string; type: RecordType; content: string; priority: string }>({
    name: "", type: "A", content: "", priority: ""
  });

  const { data, isLoading } = useQuery({
    queryKey: ["whm_dns_zone", params.id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/whm/domains/${params.id}/dns`, { headers: whmHeaders() });
      if (!res.ok) throw new Error("Error fetching zone");
      const json = await res.json();
      return json.data;
    }
  });

  const addMutation = useMutation({
    mutationFn: async (payload: object) => {
      const res = await fetch(`${API_BASE}/whm/dns/zones/${data.zone.id}/records`, {
        method: "POST",
        headers: whmHeaders(),
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Add failed");
      return res.json();
    },
    onSuccess: () => {
      setNewRec({ name: "", type: "A", content: "", priority: "" });
      queryClient.invalidateQueries({ queryKey: ["whm_dns_zone", params.id] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (recordId: string) => {
      const res = await fetch(`${API_BASE}/whm/dns/records/${recordId}`, {
         method: "DELETE",
         headers: whmHeaders()
      });
      if (!res.ok) throw new Error("Delete failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whm_dns_zone", params.id] });
    }
  });

  if (isLoading) return <div className="text-white">Cargando Zona DNS...</div>;
  if (!data) return <div className="text-red-500">No se encontró la zona DNS.</div>;

  const { domain, zone, records } = data;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <button onClick={() => router.back()} className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest hover:text-white flex items-center gap-1">
         <span className="material-symbols-outlined text-sm">arrow_back</span> Regresar
      </button>

      <header className="space-y-4">
        <h1 className="text-5xl font-headline font-black text-white tracking-tighter uppercase italic flex items-center gap-4">
          {domain.domain_name} <span className="text-primary text-xl">ZONE</span>
        </h1>
        <div className="flex gap-4">
           <span className="px-3 py-1 bg-white/5 border border-white/10 rounded font-mono text-xs text-zinc-400">
             User: <strong className="text-white">{domain.owner_name}</strong>
           </span>
           <span className="px-3 py-1 bg-white/5 border border-white/10 rounded font-mono text-xs text-zinc-400">
             NS: <strong className="text-white">{zone.soa_mname}</strong>
           </span>
        </div>
      </header>

      {/* Add Record Form */}
      <div className="glass-card p-6 rounded-2xl bg-zinc-900 border border-primary/20">
         <h3 className="text-primary font-black uppercase text-xl italic tracking-tighter mb-4">Add Record</h3>
         <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[150px]">
               <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest block mb-1">Name</label>
               <input type="text" placeholder="@ or www" value={newRec.name} onChange={e => setNewRec({...newRec, name: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-white font-mono text-sm focus:border-primary outline-none focus:bg-primary/5" />
            </div>
            <div className="w-24">
               <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest block mb-1">Type</label>
               <select value={newRec.type} onChange={e => setNewRec({...newRec, type: e.target.value as RecordType})} className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-white font-mono text-sm focus:border-primary outline-none appearance-none">
                  <option value="A">A</option>
                  <option value="AAAA">AAAA</option>
                  <option value="CNAME">CNAME</option>
                  <option value="MX">MX</option>
                  <option value="TXT">TXT</option>
                  <option value="SRV">SRV</option>
               </select>
            </div>
            <div className="flex-1 min-w-[200px]">
               <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest block mb-1">Record Content</label>
               <input type="text" placeholder="1.2.3.4 or target.domain.com" value={newRec.content} onChange={e => setNewRec({...newRec, content: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-white font-mono text-sm focus:border-primary outline-none focus:bg-primary/5" />
            </div>
            {newRec.type === "MX" && (
              <div className="w-24">
                 <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest block mb-1">Priority</label>
                 <input type="number" placeholder="10" value={newRec.priority} onChange={e => setNewRec({...newRec, priority: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-white font-mono text-sm focus:border-primary outline-none" />
              </div>
            )}
            <button 
              disabled={addMutation.isPending || !newRec.name || !newRec.content}
              onClick={() => {
                addMutation.mutate({
                   name: newRec.name, type: newRec.type, content: newRec.content, priority: newRec.priority ? parseInt(newRec.priority) : undefined
                });
              }}
              className="px-6 py-2 bg-primary text-black font-black uppercase tracking-widest text-[10px] rounded hover:bg-white transition-colors disabled:opacity-50 h-[38px]"
            >
              Add Record
            </button>
         </div>
      </div>

      {/* Record List */}
      <div className="glass-card rounded-2xl overflow-hidden">
         <table className="w-full text-left">
            <thead>
               <tr className="bg-black/30 text-[10px] uppercase tracking-widest text-zinc-500 font-black">
                  <th className="p-4">Name</th>
                  <th className="p-4 w-20 text-center">Type</th>
                  <th className="p-4">Content</th>
                  <th className="p-4 w-24">TTL</th>
                  <th className="p-4 w-16 text-right">Delete</th>
               </tr>
            </thead>
            <tbody>
               {records.map((r: DnsRecord) => (
                  <tr key={r.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                     <td className="p-4 text-white font-bold">{r.name}</td>
                     <td className="p-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${r.type === 'A' || r.type === 'AAAA' ? 'bg-blue-500/20 text-blue-400' : r.type === 'CNAME' ? 'bg-purple-500/20 text-purple-400' : r.type === 'MX' ? 'bg-amber-500/20 text-amber-400' : r.type === 'TXT' ? 'bg-green-500/20 text-green-400' : 'bg-zinc-500/20 text-zinc-400'}`}>
                          {r.type}
                        </span>
                     </td>
                     <td className="p-4 text-zinc-300 font-mono text-sm">
                        {r.type === 'MX' ? `[${r.priority}] ` : ''}{r.content}
                     </td>
                     <td className="p-4 text-zinc-500 font-mono text-xs">{r.ttl}</td>
                     <td className="p-4 text-right">
                        <button 
                           onClick={() => { if(confirm("Delete record?")) deleteMutation.mutate(r.id) }}
                           className="text-zinc-600 hover:text-red-500 transition-colors"
                        >
                           <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                     </td>
                  </tr>
               ))}
               {records.length === 0 && (
                  <tr>
                     <td colSpan={5} className="p-10 text-center text-zinc-500">No records found.</td>
                  </tr>
               )}
            </tbody>
         </table>
      </div>
    </div>
  );
}
