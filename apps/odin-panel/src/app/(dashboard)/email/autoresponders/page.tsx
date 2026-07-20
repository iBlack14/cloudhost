"use client";
import React, { useState } from "react";

interface Autoresponder {
  id: string;
  email: string;
  subject: string;
  body: string;
  startDate: string;
  endDate: string;
  enabled: boolean;
}

export default function AutorespondersPage() {
  const [items, setItems] = useState<Autoresponder[]>([
    {
      id: "1",
      email: "info@midominio.com",
      subject: "Estoy de vacaciones",
      body: "Gracias por tu correo. Estaré fuera hasta el 1 de agosto. Te responderé a mi regreso.",
      startDate: "2026-07-20",
      endDate: "2026-08-01",
      enabled: true,
    },
  ]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: "", subject: "", body: "", startDate: "", endDate: "" });
  const [selected, setSelected] = useState<Autoresponder | null>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.subject) return;
    setItems([...items, { ...form, id: Date.now().toString(), enabled: true }]);
    setForm({ email: "", subject: "", body: "", startDate: "", endDate: "" });
    setShowForm(false);
  };

  const toggleItem = (id: string) => setItems(items.map(i => i.id === id ? { ...i, enabled: !i.enabled } : i));
  const deleteItem = (id: string) => { if (confirm("¿Eliminar autoresponder?")) setItems(items.filter(i => i.id !== id)); };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <span className="material-symbols-outlined text-white text-[20px]">auto_reply</span>
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Autoresponders</h1>
            <p className="text-xs text-slate-500 font-medium">Respuestas automáticas para tus cuentas de correo</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-violet-500/20 active:scale-95"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Nuevo Autoresponder
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 animate-in slide-in-from-top duration-200">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4">Configurar Autoresponder</h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Cuenta de Correo</label>
                <input type="email" placeholder="info@midominio.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400 transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Asunto</label>
                <input type="text" placeholder="Respuesta automática" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400 transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Fecha inicio</label>
                <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400 transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Fecha fin</label>
                <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400 transition-all" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Mensaje</label>
              <textarea rows={4} placeholder="Escribe el mensaje de respuesta automática..." value={form.body} onChange={e => setForm({ ...form, body: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400 transition-all resize-none" />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="bg-violet-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-violet-500 transition-all">Guardar</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      <div className="grid grid-cols-1 gap-4">
        {items.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 py-16 text-center">
            <span className="material-symbols-outlined text-5xl text-slate-200 block mb-3">auto_reply</span>
            <p className="text-slate-400 text-sm font-medium">No hay autoresponders configurados</p>
          </div>
        ) : items.map(item => (
          <div key={item.id} className={`bg-white rounded-3xl border border-slate-200 shadow-sm p-6 transition-all ${!item.enabled ? "opacity-60" : ""}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="text-sm font-bold text-[#00A3FF] font-mono">{item.email}</span>
                  {item.startDate && item.endDate && (
                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">
                      {item.startDate} → {item.endDate}
                    </span>
                  )}
                </div>
                <p className="text-sm font-bold text-slate-800 mb-1">{item.subject}</p>
                <p className="text-xs text-slate-500 line-clamp-2">{item.body}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => toggleItem(item.id)} className={`w-10 h-6 rounded-full transition-all relative ${item.enabled ? "bg-violet-500" : "bg-slate-200"}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${item.enabled ? "left-4" : "left-0.5"}`} />
                </button>
                <button onClick={() => setSelected(item)} className="w-8 h-8 rounded-lg hover:bg-blue-50 flex items-center justify-center text-slate-400 hover:text-blue-500 transition-colors">
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                </button>
                <button onClick={() => deleteItem(item.id)} className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors">
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
