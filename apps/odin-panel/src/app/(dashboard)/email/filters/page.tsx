"use client";
import React, { useState } from "react";

interface EmailFilter {
  id: string;
  name: string;
  account: string;
  condition: string;
  action: string;
  enabled: boolean;
}

export default function EmailFiltersPage() {
  const [filters, setFilters] = useState<EmailFilter[]>([
    { id: "1", name: "Bloquear spam", account: "info@midominio.com", condition: "El asunto contiene: 'oferta' o 'gratis'", action: "Mover a carpeta: Spam", enabled: true },
    { id: "2", name: "Prioridad alta", account: "soporte@midominio.com", condition: "El remitente es: jefe@empresa.com", action: "Marcar como importante", enabled: true },
  ]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", account: "", field: "subject", operator: "contains", value: "", action: "move_spam" });

  const ACTIONS = [
    { value: "move_spam", label: "Mover a Spam" },
    { value: "delete", label: "Eliminar" },
    { value: "mark_read", label: "Marcar como leído" },
    { value: "mark_important", label: "Marcar como importante" },
    { value: "forward", label: "Reenviar" },
    { value: "folder", label: "Mover a carpeta" },
  ];

  const FIELDS = [
    { value: "subject", label: "Asunto" },
    { value: "from", label: "Remitente (De)" },
    { value: "to", label: "Destinatario (Para)" },
    { value: "body", label: "Cuerpo del mensaje" },
  ];

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.value) return;
    const condText = `${FIELDS.find(f => f.value === form.field)?.label} contiene: "${form.value}"`;
    const actionText = ACTIONS.find(a => a.value === form.action)?.label ?? form.action;
    setFilters([...filters, { id: Date.now().toString(), name: form.name, account: form.account, condition: condText, action: actionText, enabled: true }]);
    setForm({ name: "", account: "", field: "subject", operator: "contains", value: "", action: "move_spam" });
    setShowForm(false);
  };

  const toggleFilter = (id: string) => setFilters(filters.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f));
  const deleteFilter = (id: string) => { if (confirm("¿Eliminar este filtro?")) setFilters(filters.filter(f => f.id !== id)); };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/20">
            <span className="material-symbols-outlined text-white text-[20px]">filter_list</span>
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Filtros de Correo</h1>
            <p className="text-xs text-slate-500 font-medium">Crea reglas para organizar y gestionar el correo automáticamente</p>
          </div>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-rose-500/20 active:scale-95">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Nuevo Filtro
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 animate-in slide-in-from-top duration-200">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4">Crear Filtro</h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Nombre del filtro</label>
                <input type="text" placeholder="Ej: Bloquear spam" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Cuenta de correo</label>
                <input type="text" placeholder="info@midominio.com" value={form.account} onChange={e => setForm({ ...form, account: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 transition-all" />
              </div>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
              <p className="text-xs font-black text-slate-600 uppercase tracking-wider">Condición</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select value={form.field} onChange={e => setForm({ ...form, field: e.target.value })}
                  className="px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 transition-all">
                  {FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
                <select value={form.operator} onChange={e => setForm({ ...form, operator: e.target.value })}
                  className="px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 transition-all">
                  <option value="contains">contiene</option>
                  <option value="equals">es igual a</option>
                  <option value="starts">empieza con</option>
                  <option value="ends">termina con</option>
                </select>
                <input type="text" placeholder="texto a buscar..." value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} required
                  className="px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 transition-all" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Acción a tomar</label>
              <select value={form.action} onChange={e => setForm({ ...form, action: e.target.value })}
                className="w-full sm:w-1/2 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400 transition-all">
                {ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="bg-rose-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-rose-500 transition-all">Crear Filtro</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Filters list */}
      <div className="space-y-3">
        {filters.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 py-16 text-center">
            <span className="material-symbols-outlined text-5xl text-slate-200 block mb-3">filter_list</span>
            <p className="text-slate-400 text-sm font-medium">No hay filtros configurados</p>
          </div>
        ) : filters.map((filter, index) => (
          <div key={filter.id} className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-start gap-4 transition-all ${!filter.enabled ? "opacity-50" : ""}`}>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
              <span className="text-xs font-black text-slate-400">{index + 1}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-sm font-black text-slate-900">{filter.name}</span>
                {filter.account && <span className="text-xs text-[#00A3FF] font-mono">{filter.account}</span>}
              </div>
              <p className="text-xs text-slate-500 mb-1"><span className="font-bold text-slate-600">Si:</span> {filter.condition}</p>
              <p className="text-xs text-slate-500"><span className="font-bold text-slate-600">Entonces:</span> {filter.action}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => toggleFilter(filter.id)} className={`w-10 h-6 rounded-full transition-all relative ${filter.enabled ? "bg-rose-500" : "bg-slate-200"}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${filter.enabled ? "left-4" : "left-0.5"}`} />
              </button>
              <button onClick={() => deleteFilter(filter.id)} className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors">
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
