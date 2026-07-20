"use client";
import React, { useState } from "react";

interface MailingList {
  id: string;
  name: string;
  email: string;
  members: number;
  description: string;
  public: boolean;
}

export default function EmailListsPage() {
  const [lists, setLists] = useState<MailingList[]>([
    { id: "1", name: "Boletín Noticias", email: "noticias@midominio.com", members: 142, description: "Lista de distribución para el boletín mensual.", public: true },
    { id: "2", name: "Equipo Interno", email: "equipo@midominio.com", members: 8, description: "Lista interna del equipo de trabajo.", public: false },
  ]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", description: "", public: true });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) return;
    setLists([...lists, { ...form, id: Date.now().toString(), members: 0 }]);
    setForm({ name: "", email: "", description: "", public: true });
    setShowForm(false);
  };

  const deleteList = (id: string) => { if (confirm("¿Eliminar esta lista de correo?")) setLists(lists.filter(l => l.id !== id)); };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <span className="material-symbols-outlined text-white text-[20px]">group</span>
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Listas de Correo</h1>
            <p className="text-xs text-slate-500 font-medium">Gestiona grupos y listas de distribución de correo</p>
          </div>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-500/20 active:scale-95">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Nueva Lista
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: "Listas totales", value: lists.length, icon: "list", color: "text-[#00A3FF]" },
          { label: "Miembros totales", value: lists.reduce((a, l) => a + l.members, 0), icon: "people", color: "text-emerald-600" },
          { label: "Listas públicas", value: lists.filter(l => l.public).length, icon: "public", color: "text-violet-600" },
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
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4">Nueva Lista de Correo</h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Nombre de la Lista</label>
                <input type="text" placeholder="Boletín mensual" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Dirección de Correo</label>
                <input type="email" placeholder="lista@midominio.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 transition-all" />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Descripción (opcional)</label>
                <input type="text" placeholder="Descripción de la lista..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 transition-all" />
              </div>
              <div className="sm:col-span-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className={`w-10 h-6 rounded-full transition-all relative ${form.public ? "bg-emerald-500" : "bg-slate-200"}`} onClick={() => setForm({ ...form, public: !form.public })}>
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.public ? "left-4" : "left-0.5"}`} />
                  </div>
                  <span className="text-sm font-medium text-slate-700">Lista pública (cualquiera puede suscribirse)</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-500 transition-all">Crear Lista</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Lists */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Listas ({lists.length})</h2>
        </div>
        {lists.length === 0 ? (
          <div className="py-16 text-center">
            <span className="material-symbols-outlined text-5xl text-slate-200 block mb-3">group</span>
            <p className="text-slate-400 text-sm font-medium">No hay listas de correo</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {lists.map(list => (
              <div key={list.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-emerald-600 text-[20px]">group</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-800">{list.name}</span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${list.public ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                      {list.public ? "Pública" : "Privada"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-[#00A3FF] font-mono">{list.email}</span>
                    <span className="text-xs text-slate-400">{list.members} miembros</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#00A3FF] px-3 py-2 rounded-xl hover:bg-blue-50 transition-colors">
                    <span className="material-symbols-outlined text-[16px]">manage_accounts</span>
                    Miembros
                  </button>
                  <button onClick={() => deleteList(list.id)} className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors">
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
