"use client";
import React, { useState } from "react";

export default function DatabasesRemotePage() {
  const [hosts, setHosts] = useState([
    { id: "1", name: "Oficina Madrid", host: "192.168.1.100", enabled: true },
    { id: "2", name: "VPN Equipo Dev", host: "10.0.0.0/24", enabled: true },
  ]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", host: "" });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.host) return;
    setHosts([...hosts, { ...form, id: Date.now().toString(), enabled: true }]);
    setForm({ name: "", host: "" });
    setShowForm(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <span className="material-symbols-outlined text-white text-[20px]">lan</span>
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Acceso Remoto a Base de Datos</h1>
            <p className="text-xs text-slate-500 font-medium">Permite conexiones externas a MySQL desde IPs autorizadas</p>
          </div>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-cyan-500/20 active:scale-95">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Agregar IP/Rango
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
        <span className="material-symbols-outlined text-amber-500 text-[20px] mt-0.5">security</span>
        <div>
          <p className="text-sm font-bold text-amber-800">Precaución de seguridad</p>
          <p className="text-xs text-amber-600 mt-0.5">Solo agrega IPs o rangos de confianza. El acceso remoto a la base de datos puede ser un vector de ataque si se configura incorrectamente.</p>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 animate-in slide-in-from-top duration-200">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4">Agregar Host Remoto</h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Descripción (opcional)</label>
                <input type="text" placeholder="Ej: Oficina, VPN Dev..." value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400 transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">IP o Rango CIDR</label>
                <input type="text" placeholder="192.168.1.1 o 10.0.0.0/24" value={form.host} onChange={e => setForm({ ...form, host: e.target.value })} required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400 transition-all" />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="bg-cyan-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-cyan-500 transition-all">Agregar</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">IPs Autorizadas</h2>
        </div>
        {hosts.length === 0 ? (
          <div className="py-16 text-center">
            <span className="material-symbols-outlined text-5xl text-slate-200 block mb-3">lan</span>
            <p className="text-slate-400 text-sm font-medium">Solo conexiones locales permitidas</p>
            <p className="text-slate-300 text-xs mt-1">Agrega IPs para permitir acceso remoto</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {hosts.map(host => (
              <div key={host.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-cyan-100 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-cyan-600 text-[20px]">computer</span>
                </div>
                <div className="flex-1 min-w-0">
                  {host.name && <p className="text-sm font-bold text-slate-800">{host.name}</p>}
                  <p className="text-xs font-mono text-[#00A3FF]">{host.host}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setHosts(hosts.map(h => h.id === host.id ? { ...h, enabled: !h.enabled } : h))}
                    className={`w-10 h-6 rounded-full transition-all relative ${host.enabled ? "bg-cyan-500" : "bg-slate-200"}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${host.enabled ? "left-4" : "left-0.5"}`} />
                  </button>
                  <button onClick={() => { if (confirm("¿Eliminar este host?")) setHosts(hosts.filter(h => h.id !== host.id)); }} className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors">
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Connection info */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4">Datos de Conexión</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: "Host", value: "tu-servidor.com" },
            { label: "Puerto", value: "3306" },
            { label: "Usuario", value: "tu_usuario_db" },
            { label: "Cliente recomendado", value: "MySQL Workbench / DBeaver" },
          ].map(item => (
            <div key={item.label} className="bg-slate-50 rounded-xl px-4 py-3">
              <p className="text-xs text-slate-400 font-medium mb-0.5">{item.label}</p>
              <p className="text-sm font-bold text-slate-800 font-mono">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
