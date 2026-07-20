"use client";
import React, { useState } from "react";

interface ApiToken {
  id: string;
  name: string;
  token: string;
  createdAt: string;
  lastUsed: string;
  permissions: string[];
}

export default function ApiTokensPage() {
  const [tokens, setTokens] = useState<ApiToken[]>([
    { id: "1", name: "Script de backup automático", token: "tok_live_xK9m2...****", createdAt: "15 Jul 2026", lastUsed: "Hace 2 horas", permissions: ["files:read", "files:write", "backups:create"] },
    { id: "2", name: "Integración CI/CD", token: "tok_live_aB4n7...****", createdAt: "10 Jun 2026", lastUsed: "Hace 1 día", permissions: ["files:read", "cloudweb:deploy"] },
  ]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", perms: [] as string[] });
  const [newToken, setNewToken] = useState<string | null>(null);

  const allPerms = [
    { value: "files:read", label: "Archivos — Lectura" },
    { value: "files:write", label: "Archivos — Escritura" },
    { value: "databases:read", label: "Bases de datos — Lectura" },
    { value: "databases:write", label: "Bases de datos — Escritura" },
    { value: "backups:create", label: "Backups — Crear" },
    { value: "cloudweb:deploy", label: "CloudWeb — Deploy" },
    { value: "email:manage", label: "Email — Gestionar" },
    { value: "domains:manage", label: "Dominios — Gestionar" },
  ];

  const togglePerm = (perm: string) => {
    setForm({ ...form, perms: form.perms.includes(perm) ? form.perms.filter(p => p !== perm) : [...form.perms, perm] });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    const generated = `tok_live_${Math.random().toString(36).substring(2, 10).toUpperCase()}${Math.random().toString(36).substring(2, 20)}`;
    setTokens([...tokens, {
      id: Date.now().toString(),
      name: form.name,
      token: generated.substring(0, 20) + "****",
      createdAt: new Date().toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }),
      lastUsed: "Nunca",
      permissions: form.perms,
    }]);
    setNewToken(generated);
    setForm({ name: "", perms: [] });
    setShowForm(false);
  };

  const revokeToken = (id: string) => { if (confirm("¿Revocar este token? Esta acción no se puede deshacer.")) setTokens(tokens.filter(t => t.id !== id)); };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center shadow-lg shadow-yellow-500/20">
            <span className="material-symbols-outlined text-white text-[20px]">token</span>
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Tokens de API</h1>
            <p className="text-xs text-slate-500 font-medium">Genera claves para integrar scripts y herramientas externas</p>
          </div>
        </div>
        <button onClick={() => { setShowForm(true); setNewToken(null); }} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-amber-500/20 active:scale-95">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Crear Token
        </button>
      </div>

      {/* New Token Banner */}
      {newToken && (
        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-3xl p-6 animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-emerald-600">check_circle</span>
            <p className="text-sm font-black text-emerald-800">Token creado — ¡Cópialo ahora!</p>
          </div>
          <p className="text-xs text-emerald-600 mb-3">Este es el único momento en que podrás ver el token completo. Guárdalo en un lugar seguro.</p>
          <div className="flex items-center gap-3 bg-white rounded-xl border border-emerald-200 px-4 py-3">
            <code className="flex-1 text-xs font-mono text-slate-800 break-all">{newToken}</code>
            <button onClick={() => { navigator.clipboard.writeText(newToken); alert("Token copiado"); }} className="w-8 h-8 rounded-lg bg-emerald-100 hover:bg-emerald-200 flex items-center justify-center transition-colors shrink-0">
              <span className="material-symbols-outlined text-[16px] text-emerald-700">content_copy</span>
            </button>
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 animate-in slide-in-from-top duration-200">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4">Nuevo Token</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Nombre del token</label>
              <input type="text" placeholder="Ej: Script backup noche" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Permisos</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {allPerms.map(perm => (
                  <label key={perm.value} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-amber-300 cursor-pointer transition-colors">
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${form.perms.includes(perm.value) ? "bg-amber-500 border-amber-500" : "border-slate-300"}`}
                      onClick={() => togglePerm(perm.value)}>
                      {form.perms.includes(perm.value) && <span className="material-symbols-outlined text-white text-[14px]">check</span>}
                    </div>
                    <span className="text-xs font-medium text-slate-700">{perm.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="bg-amber-500 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-amber-400 transition-all">Generar Token</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Tokens List */}
      <div className="space-y-4">
        {tokens.map(token => (
          <div key={token.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-sm font-black text-slate-900">{token.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-xs font-mono text-slate-500">{token.token}</code>
                </div>
              </div>
              <button onClick={() => revokeToken(token.id)} className="flex items-center gap-1.5 text-xs font-bold text-red-600 hover:bg-red-50 px-3 py-2 rounded-xl transition-colors shrink-0">
                <span className="material-symbols-outlined text-[16px]">block</span>
                Revocar
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {token.permissions.map(perm => (
                <span key={perm} className="text-[10px] font-black bg-amber-100 text-amber-700 px-2 py-1 rounded-lg uppercase tracking-wider">{perm}</span>
              ))}
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">calendar_today</span> Creado: {token.createdAt}</span>
              <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">schedule</span> Último uso: {token.lastUsed}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
