"use client";
import React, { useState } from "react";

interface IndexRule {
  id: string;
  path: string;
  type: "default" | "no_indexes" | "show_indexes" | "two_column";
}

const TYPE_LABELS = {
  default: { label: "Predeterminado", icon: "settings", desc: "Usa la configuración global del servidor." },
  no_indexes: { label: "No Mostrar", icon: "disabled_by_default", desc: "No listar archivos. Muestra error 403 Forbidden." },
  show_indexes: { label: "Mostrar Lista", icon: "list_alt", desc: "Muestra la lista de archivos (Index Of)." },
  two_column: { label: "Estilo Dos Columnas", icon: "view_column", desc: "Muestra lista formateada en dos columnas." },
};

export default function AdvancedIndexesPage() {
  const [rules, setRules] = useState<IndexRule[]>([
    { id: "1", path: "/public_html/descargas", type: "show_indexes" },
    { id: "2", path: "/public_html/assets", type: "no_indexes" },
  ]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ path: "", type: "no_indexes" as IndexRule["type"] });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.path) return;
    setRules([...rules, { ...form, id: Date.now().toString() }]);
    setForm({ path: "", type: "no_indexes" });
    setShowForm(false);
  };

  const deleteRule = (id: string) => {
    if (confirm("¿Eliminar regla de indexación?")) {
      setRules(rules.filter(r => r.id !== id));
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <span className="material-symbols-outlined text-white text-[20px]">folder_open</span>
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Administrador de Índices</h1>
            <p className="text-xs text-slate-500 font-medium">Controla si los visitantes pueden ver el contenido de tus directorios</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Nueva Regla
        </button>
      </div>

      {/* Info Box */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-start gap-3">
        <span className="material-symbols-outlined text-indigo-600 text-[20px] mt-0.5 font-bold">info</span>
        <div>
          <p className="text-xs text-indigo-700 font-medium leading-relaxed">
            Si no hay un archivo de inicio (como <code className="bg-indigo-100 px-1 rounded font-mono">index.php</code> o <code className="bg-indigo-100 px-1 rounded font-mono">index.html</code>) en una carpeta, el servidor web puede mostrar una lista de los archivos que contiene. Usa esta herramienta para personalizar ese comportamiento por directorio.
          </p>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 animate-in slide-in-from-top duration-200">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4">Nueva Configuración de Índice</h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Ruta del Directorio (Relativa a Home)</label>
                <input
                  type="text"
                  placeholder="Ej: /public_html/mis-archivos"
                  value={form.path}
                  onChange={e => setForm({ ...form, path: e.target.value })}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-[#00A3FF] transition-all font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Estilo de Indexación</label>
                <select
                  value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value as IndexRule["type"] })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-[#00A3FF] transition-all"
                >
                  <option value="default">Por defecto del Servidor</option>
                  <option value="no_indexes">No Mostrar (Recomendado / Seguro)</option>
                  <option value="show_indexes">Mostrar Lista de Archivos (Index Of)</option>
                  <option value="two_column">Estilo Fancy de dos columnas</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-500 transition-all">Guardar Regla</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Rules list */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Reglas Activas ({rules.length})</h2>
        </div>
        {rules.length === 0 ? (
          <div className="py-16 text-center">
            <span className="material-symbols-outlined text-5xl text-slate-200 block mb-3">folder_open</span>
            <p className="text-slate-400 text-sm font-medium">No hay reglas personalizadas</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {rules.map(rule => {
              const info = TYPE_LABELS[rule.type];
              return (
                <div key={rule.id} className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-slate-500 text-[20px]">folder</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 font-mono">{rule.path}</p>
                      <p className="text-xs text-slate-400 font-medium">{info.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700">
                      <span className="material-symbols-outlined text-[14px]">{info.icon}</span>
                      {info.label}
                    </span>
                    <button
                      onClick={() => deleteRule(rule.id)}
                      className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
                    >
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
