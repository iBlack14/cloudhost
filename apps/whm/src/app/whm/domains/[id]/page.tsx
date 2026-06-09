"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

const API_BASE = typeof window !== "undefined" && window.location.hostname !== "localhost" && !window.location.hostname.match(/^\d+\.\d+\.\d+\.\d+$/)
  ? `${window.location.protocol}//api.${window.location.hostname.split(".").slice(-2).join(".")}/api/v1`
  : (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1");
const getWhmToken = () => typeof window !== "undefined" ? window.sessionStorage.getItem("whm-access-token") : null;
const whmHeaders = (): Record<string, string> => {
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
      if (!res.ok) throw new Error("Error obteniendo la zona");
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
      if (!res.ok) throw new Error("Fallo al añadir");
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
      if (!res.ok) throw new Error("Fallo al eliminar");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whm_dns_zone", params.id] });
    }
  });

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center p-20 gap-4">
      <div className="w-10 h-10 border-4 border-[#00A3FF]/20 border-t-[#00A3FF] rounded-full animate-spin"></div>
      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Cargando Zona DNS...</span>
    </div>
  );

  if (!data) return <div className="p-20 text-center text-red-500 font-bold">No se encontró la zona DNS.</div>;

  const { domain, zone, records } = data;

  return (
    <div className="space-y-10 animate-in fade-in duration-700 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="text-slate-400 font-bold uppercase text-[10px] tracking-widest hover:text-[#00A3FF] flex items-center gap-2 transition-all">
           <span className="material-symbols-outlined text-[18px]">arrow_back</span> Volver al listado
        </button>
      </div>

      <header className="space-y-4 border-b border-slate-200 pb-8">
        <h1 className="text-5xl font-black text-slate-900 uppercase">
          {domain.domain_name} <span className="text-[#00A3FF]">ZONA DNS</span>
        </h1>
        <div className="flex gap-4">
           <span className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-[10px] text-slate-500 uppercase tracking-tight">
             Usuario: <strong className="text-slate-800 ml-1">{domain.username || domain.owner_name}</strong>
           </span>
           <span className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-[10px] text-slate-500 uppercase tracking-tight">
             Servidor: <strong className="text-slate-800 ml-1">{zone.soa_mname}</strong>
           </span>
        </div>
      </header>

      {/* Add Record Form */}
      <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden group">
         <div className="flex items-center gap-4 mb-8">
            <div className="w-10 h-10 rounded-xl bg-[#00A3FF]/5 flex items-center justify-center text-[#00A3FF] border border-[#00A3FF]/10">
               <span className="material-symbols-outlined">add_box</span>
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase">Añadir Registro</h3>
         </div>
         
         <div className="flex flex-wrap gap-6 items-end relative z-10">
            <div className="flex-1 min-w-[200px] space-y-2">
               <label className="text-[11px] font-bold uppercase text-slate-500 tracking-widest block ml-1">Nombre / Host</label>
               <input type="text" placeholder="@ o www" value={newRec.name} onChange={e => setNewRec({...newRec, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold text-sm focus:border-[#00A3FF]/50 focus:bg-white transition-all outline-none" />
            </div>
            <div className="w-32 space-y-2">
               <label className="text-[11px] font-bold uppercase text-slate-500 tracking-widest block ml-1">Tipo</label>
               <select value={newRec.type} onChange={e => setNewRec({...newRec, type: e.target.value as RecordType})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold text-sm focus:border-[#00A3FF]/50 focus:bg-white transition-all outline-none appearance-none cursor-pointer">
                  <option value="A">A</option>
                  <option value="AAAA">AAAA</option>
                  <option value="CNAME">CNAME</option>
                  <option value="MX">MX</option>
                  <option value="TXT">TXT</option>
                  <option value="SRV">SRV</option>
                  <option value="NS">NS</option>
               </select>
            </div>
            <div className="flex-[2] min-w-[300px] space-y-2">
               <label className="text-[11px] font-bold uppercase text-slate-500 tracking-widest block ml-1">Contenido (IP o Destino)</label>
               <input type="text" placeholder="1.2.3.4 o destino.com" value={newRec.content} onChange={e => setNewRec({...newRec, content: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold text-sm focus:border-[#00A3FF]/50 focus:bg-white transition-all outline-none" />
            </div>
            {newRec.type === "MX" && (
              <div className="w-24 space-y-2">
                 <label className="text-[11px] font-bold uppercase text-slate-500 tracking-widest block ml-1">Prio</label>
                 <input type="number" placeholder="10" value={newRec.priority} onChange={e => setNewRec({...newRec, priority: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold text-sm focus:border-[#00A3FF]/50 focus:bg-white transition-all outline-none" />
              </div>
            )}
            <button 
              disabled={addMutation.isPending || !newRec.name || !newRec.content}
              onClick={() => {
                addMutation.mutate({
                   name: newRec.name, type: newRec.type, content: newRec.content, priority: newRec.priority ? parseInt(newRec.priority) : undefined
                });
              }}
              className="px-8 py-3.5 bg-[#00A3FF] text-white font-bold uppercase tracking-widest text-[11px] rounded-xl hover:bg-[#008EE0] transition-all disabled:opacity-40 shadow-lg shadow-[#00A3FF]/20"
            >
              Guardar Registro
            </button>
         </div>
      </div>

      {/* Record List */}
      <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
         <table className="w-full text-left">
            <thead>
               <tr className="bg-slate-50/50 text-[11px] uppercase tracking-widest text-slate-500 font-bold border-b border-slate-100">
                  <th className="px-8 py-5">Host / Registro</th>
                  <th className="px-8 py-5 w-24 text-center">Tipo</th>
                  <th className="px-8 py-5">Contenido</th>
                  <th className="px-8 py-5 w-32">TTL</th>
                  <th className="px-8 py-5 w-16 text-right"></th>
               </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
               {records.map((r: DnsRecord) => (
                  <tr key={r.id} className="hover:bg-slate-50/30 transition-all">
                     <td className="px-8 py-5 text-slate-900 font-bold text-[15px]">{r.name}</td>
                     <td className="px-8 py-5 text-center">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${r.type === 'A' || r.type === 'AAAA' ? 'bg-[#00A3FF]/10 text-[#00A3FF]' : r.type === 'CNAME' ? 'bg-purple-100 text-purple-600' : r.type === 'MX' ? 'bg-amber-100 text-amber-600' : r.type === 'TXT' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                          {r.type}
                        </span>
                     </td>
                     <td className="px-8 py-5 text-slate-600 font-bold text-[14px]">
                        {r.type === 'MX' ? `[${r.priority}] ` : ''}{r.content}
                     </td>
                     <td className="px-8 py-5 text-slate-400 font-bold text-xs">{r.ttl}</td>
                     <td className="px-8 py-5 text-right">
                        <button 
                           onClick={() => { if(confirm("¿Eliminar este registro DNS?")) deleteMutation.mutate(r.id) }}
                           className="w-10 h-10 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center"
                           title="Eliminar Registro"
                        >
                           <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                     </td>
                  </tr>
               ))}
               {records.length === 0 && (
                  <tr>
                     <td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-medium italic">No se encontraron registros DNS configurados.</td>
                  </tr>
               )}
            </tbody>
         </table>
      </div>
    </div>
  );
}
