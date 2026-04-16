"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchDnsZone, addDnsRecord, deleteDnsRecord } from "../../../../lib/api";

export default function DnsZoneEditorPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  const [newRecord, setNewRecord] = useState({
    name: "@",
    type: "A",
    content: "",
    priority: 0
  });

  const loadZone = async () => {
    try {
      setIsLoading(true);
      const zoneData = await fetchDnsZone(id as string);
      setData(zoneData);
    } catch (err) {
      console.error("Failed to load DNS zone", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadZone();
  }, [id]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsAdding(true);
      await addDnsRecord(data.zone.id, newRecord);
      setNewRecord({ name: "@", type: "A", content: "", priority: 0 });
      await loadZone();
    } catch (err) {
      alert("Error adding record");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (recordId: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      await deleteDnsRecord(recordId);
      await loadZone();
    } catch (err) {
      alert("Error deleting record");
    }
  };

  if (isLoading) return <div className="p-20 text-center uppercase font-black text-zinc-700 tracking-widest animate-pulse">Initializing Zone Authority...</div>;
  if (!data) return <div className="p-20 text-center text-white">Zone not found</div>;

  const { domain, zone, records } = data;

  return (
    <div className="space-y-12">
      <header className="flex justify-between items-end">
        <div className="space-y-2">
          <Link href="/whm/domains" className="flex items-center gap-2 text-primary font-black text-[9px] uppercase tracking-widest hover:opacity-70 transition-all">
             <span className="material-symbols-outlined text-sm">arrow_back</span>
             Back to Domain Inventory
          </Link>
          <h1 className="text-5xl font-headline font-black text-white tracking-tighter uppercase italic">
            Zone <span className="text-zinc-600">Editor</span>
          </h1>
          <p className="text-zinc-500 text-sm font-mono tracking-widest">
            Managing authoritative records for <span className="text-white italic">{domain.domain_name}</span>
          </p>
        </div>
        
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
           <div className="text-right">
              <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Zone Serial</p>
              <p className="text-xs font-mono text-primary">{zone.soa_serial}</p>
           </div>
           <div className="w-px h-8 bg-white/5"></div>
           <div className="text-right">
              <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Primary NS</p>
              <p className="text-xs font-mono text-zinc-300">ns1.odisea.cloud</p>
           </div>
        </div>
      </header>

      {/* Add Record Row */}
      <div className="glass-card p-1">
         <form onSubmit={handleAdd} className="bg-white/[0.02] p-6 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div className="space-y-2">
               <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-1">Name</label>
               <input 
                 value={newRecord.name}
                 onChange={e => setNewRecord({...newRecord, name: e.target.value})}
                 placeholder="@"
                 className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary/50 transition-all font-mono text-xs" 
               />
            </div>
            <div className="space-y-2">
               <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-1">Type</label>
               <select 
                 value={newRecord.type}
                 onChange={e => setNewRecord({...newRecord, type: e.target.value})}
                 className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary/50 transition-all text-xs"
               >
                  <option value="A">A</option>
                  <option value="AAAA">AAAA</option>
                  <option value="CNAME">CNAME</option>
                  <option value="MX">MX</option>
                  <option value="TXT">TXT</option>
                  <option value="NS">NS</option>
               </select>
            </div>
            <div className="space-y-2 md:col-span-2">
               <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-1">Value / Content</label>
               <input 
                 value={newRecord.content}
                 onChange={e => setNewRecord({...newRecord, content: e.target.value})}
                 placeholder="1.2.3.4"
                 className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary/50 transition-all font-mono text-xs"
               />
            </div>
            <button 
              disabled={isAdding}
              className="kinetic-gradient py-3 rounded-xl text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all"
            >
              {isAdding ? "Saving..." : "+ Add Record"}
            </button>
         </form>
      </div>

      {/* Records Table */}
      <div className="glass-card overflow-hidden">
         <table className="w-full text-left">
            <thead>
               <tr className="bg-white/5 border-b border-white/5">
                  <th className="px-8 py-4 text-[10px] font-black text-zinc-600 uppercase tracking-widest">Name</th>
                  <th className="px-8 py-4 text-[10px] font-black text-zinc-600 uppercase tracking-widest">Type</th>
                  <th className="px-8 py-4 text-[10px] font-black text-zinc-600 uppercase tracking-widest">Value</th>
                  <th className="px-8 py-4 text-[10px] font-black text-zinc-600 uppercase tracking-widest text-right">TTL</th>
                  <th className="px-8 py-4 text-[10px] font-black text-zinc-600 uppercase tracking-widest text-right">Actions</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
               {records.map((record: any) => (
                 <tr key={record.id} className="hover:bg-white/[0.01] group transition-all">
                    <td className="px-8 py-5">
                       <span className="text-zinc-300 font-mono text-xs">{record.name}</span>
                    </td>
                    <td className="px-8 py-5">
                       <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                         record.type === 'A' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 
                         record.type === 'MX' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                         'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                       }`}>
                          {record.type}
                       </span>
                    </td>
                    <td className="px-8 py-5 max-w-md truncate">
                       <span className="text-zinc-500 font-mono text-xs group-hover:text-zinc-300 transition-colors">
                          {record.content}
                          {record.priority !== null && <span className="ml-2 text-primary">[{record.priority}]</span>}
                       </span>
                    </td>
                    <td className="px-8 py-5 text-right font-mono text-[10px] text-zinc-600">
                       {record.ttl}
                    </td>
                    <td className="px-8 py-5 text-right">
                       <button 
                         onClick={() => handleDelete(record.id)}
                         className="p-2 text-zinc-700 hover:text-red-500 transition-all"
                       >
                          <span className="material-symbols-outlined text-sm">delete</span>
                       </button>
                    </td>
                 </tr>
               ))}
            </tbody>
         </table>
      </div>
    </div>
  );
}
