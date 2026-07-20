"use client";
import React, { useState } from "react";

interface DnsRecord {
  id: string;
  type: "A" | "AAAA" | "CNAME" | "MX" | "TXT" | "NS" | "SRV";
  name: string;
  value: string;
  ttl: number;
  priority?: number;
}

const TYPE_COLORS: Record<DnsRecord["type"], string> = {
  A: "bg-blue-100 text-blue-700",
  AAAA: "bg-indigo-100 text-indigo-700",
  CNAME: "bg-purple-100 text-purple-700",
  MX: "bg-emerald-100 text-emerald-700",
  TXT: "bg-amber-100 text-amber-700",
  NS: "bg-slate-100 text-slate-600",
  SRV: "bg-rose-100 text-rose-700",
};

export default function AdvancedDnsPage() {
  const [records, setRecords] = useState<DnsRecord[]>([
    { id: "1", type: "A", name: "@", value: "185.102.140.55", ttl: 3600 },
    { id: "2", type: "A", name: "www", value: "185.102.140.55", ttl: 3600 },
    { id: "3", type: "MX", name: "@", value: "mail.midominio.com", ttl: 3600, priority: 10 },
    { id: "4", type: "TXT", name: "@", value: "v=spf1 mx a ~all", ttl: 3600 },
    { id: "5", type: "CNAME", name: "mail", value: "mail.midominio.com.", ttl: 3600 },
    { id: "6", type: "NS", name: "@", value: "ns1.odiseacloud.com.", ttl: 86400 },
    { id: "7", type: "NS", name: "@", value: "ns2.odiseacloud.com.", ttl: 86400 },
  ]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "A" as DnsRecord["type"], name: "", value: "", ttl: 3600, priority: 10 });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.value) return;
    setRecords([...records, { ...form, id: Date.now().toString() }]);
    setForm({ type: "A", name: "", value: "", ttl: 3600, priority: 10 });
    setShowForm(false);
  };

  const deleteRecord = (id: string) => { if (confirm("¿Eliminar este registro DNS?")) setRecords(records.filter(r => r.id !== id)); };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#00A3FF] to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="material-symbols-outlined text-white text-[20px]">dns</span>
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Zona DNS</h1>
            <p className="text-xs text-slate-500 font-medium">Gestiona los registros DNS de tu dominio</p>
          </div>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-[#00A3FF] hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Agregar Registro
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
        <span className="material-symbols-outlined text-blue-500 text-[20px] mt-0.5">schedule</span>
        <p className="text-xs text-blue-700 font-medium">Los cambios en DNS pueden tardar entre 1-48 horas en propagarse globalmente (TTL dependiente).</p>
      </div>

      {showForm && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 animate-in slide-in-from-top duration-200">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4">Nuevo Registro DNS</h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Tipo</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as DnsRecord["type"] })}
                  className="w-full px-3 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-[#00A3FF] transition-all font-bold">
                  {["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SRV"].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Nombre</label>
                <input type="text" placeholder="@ o subdominio" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
                  className="w-full px-3 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-[#00A3FF] transition-all" />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Valor</label>
                <input type="text" placeholder="IP, dominio o valor del registro" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} required
                  className="w-full px-3 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-[#00A3FF] transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">TTL (seg)</label>
                <select value={form.ttl} onChange={e => setForm({ ...form, ttl: parseInt(e.target.value) })}
                  className="w-full px-3 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-[#00A3FF] transition-all">
                  <option value={300}>300 (5 min)</option>
                  <option value={3600}>3600 (1 hora)</option>
                  <option value={14400}>14400 (4 horas)</option>
                  <option value={86400}>86400 (1 día)</option>
                </select>
              </div>
              {form.type === "MX" && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Prioridad</label>
                  <input type="number" min={1} value={form.priority} onChange={e => setForm({ ...form, priority: parseInt(e.target.value) })}
                    className="w-full px-3 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-[#00A3FF] transition-all" />
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button type="submit" className="bg-[#00A3FF] text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-500 transition-all">Agregar</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Registros DNS ({records.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {["Tipo", "Nombre", "Valor", "TTL", ""].map(h => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-black text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map(record => (
                <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-black ${TYPE_COLORS[record.type]}`}>{record.type}</span>
                  </td>
                  <td className="px-6 py-4 font-mono text-sm font-bold text-slate-700">{record.name}</td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-600 max-w-[250px] truncate">
                    {record.priority !== undefined && <span className="text-slate-400 mr-2">[{record.priority}]</span>}
                    {record.value}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-400">{record.ttl}s</td>
                  <td className="px-6 py-4">
                    <button onClick={() => deleteRecord(record.id)} className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors">
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
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
