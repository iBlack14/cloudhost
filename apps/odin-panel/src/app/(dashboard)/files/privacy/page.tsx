"use client";
import React, { useState } from "react";

type Privacy = "public" | "private" | "password";

interface PrivacyRule {
  id: string;
  path: string;
  type: Privacy;
  password?: string;
}

export default function FilesPrivacyPage() {
  const [rules, setRules] = useState<PrivacyRule[]>([
    { id: "1", path: "/admin", type: "password", password: "••••••••" },
    { id: "2", path: "/private", type: "private" },
  ]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ path: "", type: "private" as Privacy, password: "" });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.path) return;
    setRules([...rules, { ...form, id: Date.now().toString() }]);
    setForm({ path: "", type: "private", password: "" });
    setShowForm(false);
  };

  const PRIVACY_INFO = {
    public: { icon: "public", label: "Público", color: "text-emerald-600 bg-emerald-50" },
    private: { icon: "lock", label: "Privado", color: "text-red-600 bg-red-50" },
    password: { icon: "password", label: "Contraseña", color: "text-amber-600 bg-amber-50" },
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center shadow-lg shadow-slate-500/20">
            <span className="material-symbols-outlined text-white text-[20px]">folder_lock</span>
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Privacidad de Directorios</h1>
            <p className="text-xs text-slate-500 font-medium">Protege directorios con contraseña o restricciones de acceso</p>
          </div>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-slate-500/20 active:scale-95">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Proteger Directorio
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 animate-in slide-in-from-top duration-200">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4">Configurar Protección</h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Ruta del Directorio</label>
                <input type="text" placeholder="/admin o /privado" value={form.path} onChange={e => setForm({ ...form, path: e.target.value })} required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 transition-all font-mono" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Tipo de Protección</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as Privacy })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 transition-all">
                  <option value="private">Privado (bloquear acceso)</option>
                  <option value="password">Proteger con contraseña</option>
                  <option value="public">Público (sin restricciones)</option>
                </select>
              </div>
              {form.type === "password" && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Contraseña</label>
                  <input type="password" placeholder="Contraseña de acceso" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required={form.type === "password"}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 transition-all" />
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button type="submit" className="bg-slate-800 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-700 transition-all">Guardar</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Directorios Protegidos</h2>
        </div>
        {rules.length === 0 ? (
          <div className="py-16 text-center">
            <span className="material-symbols-outlined text-5xl text-slate-200 block mb-3">folder_lock</span>
            <p className="text-slate-400 text-sm font-medium">No hay directorios protegidos</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {rules.map(rule => {
              const info = PRIVACY_INFO[rule.type];
              return (
                <div key={rule.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-slate-500 text-[20px]">folder</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-bold text-slate-800 font-mono">{rule.path}</span>
                    {rule.password && <p className="text-xs text-slate-400 mt-0.5">Contraseña: {rule.password}</p>}
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${info.color}`}>
                    <span className="material-symbols-outlined text-[14px]">{info.icon}</span>
                    {info.label}
                  </span>
                  <button onClick={() => setRules(rules.filter(r => r.id !== rule.id))} className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors">
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
