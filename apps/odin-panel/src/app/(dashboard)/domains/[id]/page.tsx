"use client";

import { useState, use } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";
const getToken = () => typeof window !== "undefined" ? window.sessionStorage.getItem("odin-access-token") : null;
const authHeaders = (): Record<string, string> => {
  const t = getToken();
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

export default function OdinDnsZoneEditor({ params }: { params: Promise<{ id: string }> }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const unwrappedParams = use(params);
  
  const [newRec, setNewRec] = useState<{ name: string; type: RecordType; content: string; priority: string }>({
    name: "", type: "A", content: "", priority: ""
  });

  const { data, isLoading } = useQuery({
    queryKey: ["odin_dns_zone", unwrappedParams.id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/odin-panel/domains/${unwrappedParams.id}/dns`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Error fetching zone");
      const json = await res.json();
      return json.data;
    }
  });

  const addMutation = useMutation({
    mutationFn: async (payload: object) => {
      const res = await fetch(`${API_BASE}/odin-panel/dns/zones/${data.zone.id}/records`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Add failed");
      return res.json();
    },
    onSuccess: () => {
      setNewRec({ name: "", type: "A", content: "", priority: "" });
      queryClient.invalidateQueries({ queryKey: ["odin_dns_zone", unwrappedParams.id] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (recordId: string) => {
      const res = await fetch(`${API_BASE}/odin-panel/dns/records/${recordId}`, {
         method: "DELETE",
         headers: authHeaders()
      });
      if (!res.ok) throw new Error("Delete failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["odin_dns_zone", unwrappedParams.id] });
    }
  });

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center p-20 text-zinc-500">
       <span className="material-symbols-outlined text-4xl mb-4 animate-pulse">public</span>
       <p className="font-mono text-sm tracking-widest uppercase">Fetching NameServers...</p>
    </div>
  );
  if (!data) return <div className="text-red-500">No se encontró la zona DNS.</div>;

  const { domain, zone, records } = data;

  return (
    <div className="space-y-8 max-w-6xl">
      <button onClick={() => router.back()} className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest hover:text-white flex items-center gap-1 group">
         <span className="material-symbols-outlined text-sm group-hover:-translate-x-1 transition-transform">arrow_back</span> Return to Domains
      </button>

      <header className="space-y-4">
        <h1 className="text-5xl font-headline font-black text-white tracking-tighter uppercase italic flex items-center gap-4">
          DNS <span className="text-primary text-5xl">Zone Master</span>
        </h1>
        <div className="flex gap-4">
           <span className="px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-md font-mono text-xs text-primary font-bold">
             {domain.domain_name}
           </span>
           <span className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-md font-mono text-xs text-zinc-400">
             NameServers: <strong className="text-white ml-2">{zone.soa_mname} & {zone.soa_rname?.replace("admin.", "ns2.")}</strong>
           </span>
        </div>
      </header>

      {/* Add Record Form */}
      <div className="glass-card p-6 rounded-2xl bg-zinc-900 border border-white/5">
         <h3 className="text-white font-black uppercase text-sm tracking-widest mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px]">add_circle</span> Add Record
         </h3>
         <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="w-full md:w-32">
               <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest block mb-1">Type</label>
               <select value={newRec.type} onChange={e => setNewRec({...newRec, type: e.target.value as RecordType})} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-3 text-white font-mono text-sm focus:border-primary outline-none appearance-none">
                  <option value="A">A</option>
                  <option value="AAAA">AAAA</option>
                  <option value="CNAME">CNAME</option>
                  <option value="MX">MX</option>
                  <option value="TXT">TXT</option>
                  <option value="SRV">SRV</option>
               </select>
            </div>
            <div className="flex-1 w-full">
               <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest block mb-1">Name (Host)</label>
               <input type="text" placeholder="@ or www" value={newRec.name} onChange={e => setNewRec({...newRec, name: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-3 text-white font-mono text-sm focus:border-primary outline-none focus:bg-primary/5" />
            </div>
            <div className="flex-[2] w-full">
               <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest block mb-1">Record Content / Value</label>
               <input type="text" placeholder="1.2.3.4 or target.domain.com" value={newRec.content} onChange={e => setNewRec({...newRec, content: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-3 text-white font-mono text-sm focus:border-primary outline-none focus:bg-primary/5" />
            </div>
            {newRec.type === "MX" && (
              <div className="w-24 border-l border-white/5 pl-4 ml-2">
                 <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest block mb-1">Priority</label>
                 <input type="number" placeholder="10" value={newRec.priority} onChange={e => setNewRec({...newRec, priority: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-3 text-white font-mono text-sm focus:border-primary outline-none text-center" />
              </div>
            )}
            <button 
              disabled={addMutation.isPending || !newRec.name || !newRec.content}
              onClick={() => {
                addMutation.mutate({
                   name: newRec.name, type: newRec.type, content: newRec.content, priority: newRec.priority ? parseInt(newRec.priority) : undefined
                });
              }}
              className="w-full md:w-auto px-8 py-3 bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-primary transition-colors disabled:opacity-50 text-center"
            >
              Commit
            </button>
         </div>
      </div>

      {/* Record List */}
      <div className="glass-card rounded-2xl overflow-hidden border border-white/5 bg-zinc-900/50">
         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead>
                  <tr className="bg-black/40 text-[10px] uppercase tracking-widest text-zinc-500 font-black">
                     <th className="p-5 pl-6">Name</th>
                     <th className="p-5 w-24">Type</th>
                     <th className="p-5">Value / Route</th>
                     <th className="p-5 w-24">TTL (Sec)</th>
                     <th className="p-5 w-20 text-right pr-6">Action</th>
                  </tr>
               </thead>
               <tbody>
                  {records.map((r: DnsRecord) => (
                     <tr key={r.id} className="border-t border-white/[0.03] hover:bg-white/[0.02]">
                        <td className="p-5 pl-6 text-white font-bold">{r.name}</td>
                        <td className="p-5">
                           <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${r.type === 'A' || r.type === 'AAAA' ? 'bg-blue-500/20 text-blue-400' : r.type === 'CNAME' ? 'bg-purple-500/20 text-purple-400' : r.type === 'MX' ? 'bg-amber-500/20 text-amber-400' : r.type === 'TXT' ? 'bg-green-500/20 text-green-400' : 'bg-zinc-500/20 text-zinc-400'}`}>
                             {r.type}
                           </span>
                        </td>
                        <td className="p-5 text-zinc-300 font-mono text-[13px] leading-relaxed break-all">
                           {r.type === 'MX' ? <span className="text-amber-500 mr-2 font-black">[{r.priority}]</span> : ''}
                           {r.content}
                        </td>
                        <td className="p-5 text-zinc-600 font-mono text-[11px]">{r.ttl}</td>
                        <td className="p-5 text-right pr-6">
                           <button 
                              onClick={() => { if(confirm("Are you sure you want to drop this record?")) deleteMutation.mutate(r.id) }}
                              disabled={deleteMutation.isPending}
                              className="text-zinc-600 hover:text-red-500 transition-colors bg-white/5 hover:bg-red-500/10 p-2 rounded-lg"
                           >
                              <span className="material-symbols-outlined text-[16px]">close</span>
                           </button>
                        </td>
                     </tr>
                  ))}
                  {records.length === 0 && (
                     <tr>
                        <td colSpan={5} className="p-10 text-center text-zinc-500">No explicit rules connected. System is using fallback propagation.</td>
                     </tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
}
