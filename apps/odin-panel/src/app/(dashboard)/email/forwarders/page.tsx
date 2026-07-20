"use client";
import React, { useState } from "react";

interface Forwarder {
  id: string;
  source: string;
  destination: string;
  created: string;
}

export default function EmailForwardersPage() {
  const [forwarders, setForwarders] = useState<Forwarder[]>([
    { id: "1", source: "info@midominio.com", destination: "admin@gmail.com", created: "2025-01-15" },
    { id: "2", source: "ventas@midominio.com", destination: "sales@gmail.com", created: "2025-02-20" },
  ]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ source: "", destination: "" });
  const [loading, setLoading] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.source || !form.destination) return;
    setLoading(true);
    // Simulate API
    await new Promise((r) => setTimeout(r, 600));
    setForwarders([...forwarders, {
      id: Date.now().toString(),
      source: form.source,
      destination: form.destination,
      created: new Date().toISOString().split("T")[0],
    }]);
    setForm({ source: "", destination: "" });
    setShowForm(false);
    setLoading(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("¿Eliminar este reenviador?")) {
      setForwarders(forwarders.filter((f) => f.id !== id));
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#00A3FF] to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="material-symbols-outlined text-white text-[20px]">forward_to_inbox</span>
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Reenviadores de Correo</h1>
            <p className="text-xs text-slate-500 font-medium">Redirige correos de una dirección a otra automáticamente</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-[#00A3FF] hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Nuevo Reenviador
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
        <span className="material-symbols-outlined text-blue-500 text-[20px] mt-0.5">info</span>
        <div>
          <p className="text-sm font-bold text-blue-800">¿Cómo funciona el reenvío?</p>
          <p className="text-xs text-blue-600 mt-0.5">
            Los correos enviados a la dirección origen se copian automáticamente a la dirección destino.
            La dirección origen debe pertenecer a uno de tus dominios.
          </p>
        </div>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 animate-in slide-in-from-top duration-200">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4">Nuevo Reenviador</h3>
          <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Dirección Origen</label>
              <input
                type="email"
                placeholder="info@tudominio.com"
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A3FF]/30 focus:border-[#00A3FF] transition-all"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Dirección Destino</label>
              <input
                type="email"
                placeholder="destino@gmail.com"
                value={form.destination}
                onChange={(e) => setForm({ ...form, destination: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A3FF]/30 focus:border-[#00A3FF] transition-all"
                required
              />
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="bg-[#00A3FF] text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-500 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {loading && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Guardar Reenviador
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Forwarders List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Reenviadores Activos ({forwarders.length})</h2>
        </div>
        {forwarders.length === 0 ? (
          <div className="py-16 text-center">
            <span className="material-symbols-outlined text-5xl text-slate-200 block mb-3">forward_to_inbox</span>
            <p className="text-slate-400 text-sm font-medium">No hay reenviadores configurados</p>
            <p className="text-slate-300 text-xs mt-1">Crea tu primer reenviador para redirigir correos</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {forwarders.map((f) => (
              <div key={f.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-blue-500 text-[18px]">forward_to_inbox</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-800 font-mono">{f.source}</span>
                    <span className="material-symbols-outlined text-slate-400 text-[16px]">arrow_forward</span>
                    <span className="text-sm text-slate-600 font-mono">{f.destination}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">Creado: {f.created}</p>
                </div>
                <button
                  onClick={() => handleDelete(f.id)}
                  className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
