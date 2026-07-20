"use client";
import React, { useState } from "react";

interface BlockedIP {
  id: string;
  ip: string;
  reason: string;
  blockedAt: string;
  permanent: boolean;
  attempts?: number;
}

export default function IpBlockerPage() {
  const [blocked, setBlocked] = useState<BlockedIP[]>([
    { id: "1", ip: "185.234.219.41", reason: "Fuerza bruta SSH", blockedAt: "Hace 2 horas", permanent: true, attempts: 847 },
    { id: "2", ip: "45.129.56.200", reason: "Escaneo de puertos", blockedAt: "Hace 1 día", permanent: false, attempts: 1204 },
    { id: "3", ip: "193.32.127.89", reason: "Intentos de login fallidos", blockedAt: "Hace 3 días", permanent: false, attempts: 32 },
  ]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ip: "", reason: "", permanent: false });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.ip) return;
    setBlocked([...blocked, { ...form, id: Date.now().toString(), blockedAt: "Ahora", attempts: 0 }]);
    setForm({ ip: "", reason: "", permanent: false });
    setShowForm(false);
  };

  const unblock = (id: string) => { if (confirm("¿Desbloquear esta IP?")) setBlocked(blocked.filter(b => b.id !== id)); };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center shadow-lg shadow-red-500/20">
            <span className="material-symbols-outlined text-white text-[20px]">block</span>
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Bloqueador de IPs</h1>
            <p className="text-xs text-slate-500 font-medium">Bloquea IPs maliciosas y protege tu servidor de ataques</p>
          </div>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-red-500/20 active:scale-95">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Bloquear IP
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "IPs bloqueadas", value: blocked.length, icon: "block", color: "text-red-600" },
          { label: "Bloqueos permanentes", value: blocked.filter(b => b.permanent).length, icon: "do_not_disturb_on", color: "text-rose-600" },
          { label: "Intentos bloqueados", value: blocked.reduce((a, b) => a + (b.attempts ?? 0), 0).toLocaleString(), icon: "security", color: "text-orange-600" },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
            <span className={`material-symbols-outlined text-[28px] ${stat.color}`}>{stat.icon}</span>
            <div>
              <p className="text-2xl font-black text-slate-900">{stat.value}</p>
              <p className="text-xs text-slate-500 font-medium">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 animate-in slide-in-from-top duration-200">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4">Bloquear IP o Rango</h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">IP o Rango CIDR</label>
                <input type="text" placeholder="192.168.1.1 o 10.0.0.0/24" value={form.ip} onChange={e => setForm({ ...form, ip: e.target.value })} required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Motivo</label>
                <input type="text" placeholder="Ej: Intento de fuerza bruta" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 transition-all" />
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <div className={`w-10 h-6 rounded-full transition-all relative ${form.permanent ? "bg-red-500" : "bg-slate-200"}`} onClick={() => setForm({ ...form, permanent: !form.permanent })}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.permanent ? "left-4" : "left-0.5"}`} />
              </div>
              <span className="text-sm font-medium text-slate-700">Bloqueo permanente</span>
            </label>
            <div className="flex gap-3">
              <button type="submit" className="bg-red-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-red-500 transition-all flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">block</span>
                Bloquear
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Blocked List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">IPs Bloqueadas ({blocked.length})</h2>
        </div>
        {blocked.length === 0 ? (
          <div className="py-16 text-center">
            <span className="material-symbols-outlined text-5xl text-slate-200 block mb-3">verified_user</span>
            <p className="text-slate-400 text-sm font-medium">No hay IPs bloqueadas</p>
            <p className="text-slate-300 text-xs mt-1">Tu servidor acepta conexiones de todas las IPs</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {blocked.map(item => (
              <div key={item.id} className="flex items-center gap-4 px-6 py-4 hover:bg-red-50/30 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-red-600 text-[20px]">block</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-800 font-mono">{item.ip}</span>
                    {item.permanent && (
                      <span className="text-[10px] font-black bg-red-100 text-red-700 px-2 py-0.5 rounded-full uppercase tracking-wider">Permanente</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-slate-500">{item.reason}</span>
                    {item.attempts && item.attempts > 0 && (
                      <span className="text-xs text-red-400 font-bold">{item.attempts.toLocaleString()} intentos</span>
                    )}
                    <span className="text-xs text-slate-300">{item.blockedAt}</span>
                  </div>
                </div>
                <button onClick={() => unblock(item.id)} className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:bg-emerald-50 px-3 py-2 rounded-xl transition-colors shrink-0">
                  <span className="material-symbols-outlined text-[16px]">lock_open</span>
                  Desbloquear
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
