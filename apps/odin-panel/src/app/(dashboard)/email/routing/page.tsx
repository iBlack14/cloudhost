"use client";
import React, { useState } from "react";

interface RouteRule {
  id: string;
  priority: number;
  from: string;
  action: "deliver" | "redirect" | "discard" | "forward";
  destination: string;
  enabled: boolean;
}

const ACTION_LABELS: Record<RouteRule["action"], { label: string; icon: string; color: string }> = {
  deliver: { label: "Entregar", icon: "inbox", color: "text-emerald-600 bg-emerald-50" },
  redirect: { label: "Redirigir", icon: "forward", color: "text-blue-600 bg-blue-50" },
  discard: { label: "Descartar", icon: "delete_forever", color: "text-red-600 bg-red-50" },
  forward: { label: "Reenviar", icon: "send", color: "text-purple-600 bg-purple-50" },
};

export default function EmailRoutingPage() {
  const [rules, setRules] = useState<RouteRule[]>([
    { id: "1", priority: 1, from: "*@spam.com", action: "discard", destination: "", enabled: true },
    { id: "2", priority: 2, from: "info@*", action: "forward", destination: "admin@midominio.com", enabled: true },
  ]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ from: "", action: "deliver" as RouteRule["action"], destination: "" });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.from) return;
    setRules([...rules, {
      id: Date.now().toString(),
      priority: rules.length + 1,
      from: form.from,
      action: form.action,
      destination: form.destination,
      enabled: true,
    }]);
    setForm({ from: "", action: "deliver", destination: "" });
    setShowForm(false);
  };

  const toggleRule = (id: string) => {
    setRules(rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const deleteRule = (id: string) => {
    if (confirm("¿Eliminar esta regla de enrutamiento?")) {
      setRules(rules.filter(r => r.id !== id));
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#00A3FF] to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="material-symbols-outlined text-white text-[20px]">alt_route</span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Enrutamiento de Correo</h1>
              <p className="text-xs text-slate-500 font-medium">Define reglas para gestionar el flujo de correos entrantes</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-[#00A3FF] hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Nueva Regla
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
        <span className="material-symbols-outlined text-blue-500 text-[20px] mt-0.5">info</span>
        <div>
          <p className="text-sm font-bold text-blue-800">¿Cómo funciona el enrutamiento?</p>
          <p className="text-xs text-blue-600 mt-0.5">Las reglas se evalúan en orden de prioridad. Usa <code className="bg-blue-100 px-1 rounded">*</code> como comodín. Las reglas de mayor prioridad se aplican primero.</p>
        </div>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 animate-in slide-in-from-top duration-200">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4">Nueva Regla de Enrutamiento</h3>
          <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Dirección origen (From)</label>
              <input
                type="text"
                placeholder="*@spam.com"
                value={form.from}
                onChange={e => setForm({ ...form, from: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A3FF]/30 focus:border-[#00A3FF] transition-all"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Acción</label>
              <select
                value={form.action}
                onChange={e => setForm({ ...form, action: e.target.value as RouteRule["action"] })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A3FF]/30 focus:border-[#00A3FF] transition-all"
              >
                <option value="deliver">Entregar localmente</option>
                <option value="redirect">Redirigir</option>
                <option value="forward">Reenviar copia</option>
                <option value="discard">Descartar</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Destino</label>
              <input
                type="text"
                placeholder="destino@ejemplo.com"
                value={form.destination}
                onChange={e => setForm({ ...form, destination: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A3FF]/30 focus:border-[#00A3FF] transition-all"
                disabled={form.action === "discard"}
              />
            </div>
            <div className="sm:col-span-3 flex gap-3">
              <button type="submit" className="bg-[#00A3FF] text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-500 transition-all">Guardar Regla</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Rules List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Reglas Activas ({rules.length})</h2>
        </div>
        {rules.length === 0 ? (
          <div className="py-16 text-center">
            <span className="material-symbols-outlined text-5xl text-slate-200 block mb-3">alt_route</span>
            <p className="text-slate-400 text-sm font-medium">No hay reglas configuradas</p>
            <p className="text-slate-300 text-xs mt-1">Crea tu primera regla para gestionar el flujo de correos</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {rules.map((rule) => {
              const actionInfo = ACTION_LABELS[rule.action];
              return (
                <div key={rule.id} className={`flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors ${!rule.enabled ? "opacity-50" : ""}`}>
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <span className="text-xs font-black text-slate-400">{rule.priority}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-800 font-mono">{rule.from}</span>
                      <span className="text-slate-400">→</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold ${actionInfo.color}`}>
                        <span className="material-symbols-outlined text-[14px]">{actionInfo.icon}</span>
                        {actionInfo.label}
                      </span>
                      {rule.destination && (
                        <span className="text-xs text-slate-500 font-mono">{rule.destination}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleRule(rule.id)}
                      className={`w-10 h-6 rounded-full transition-all relative ${rule.enabled ? "bg-[#00A3FF]" : "bg-slate-200"}`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${rule.enabled ? "left-4" : "left-0.5"}`} />
                    </button>
                    <button onClick={() => deleteRule(rule.id)} className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors">
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
