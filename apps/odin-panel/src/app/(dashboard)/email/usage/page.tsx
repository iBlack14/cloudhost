"use client";
import React from "react";

export default function EmailUsagePage() {
  const accounts = [
    { email: "info@midominio.com", used: 512, total: 1024, messages: 1847 },
    { email: "soporte@midominio.com", used: 234, total: 1024, messages: 653 },
    { email: "admin@midominio.com", used: 89, total: 512, messages: 312 },
    { email: "noreply@midominio.com", used: 12, total: 256, messages: 5420 },
  ];

  const totalUsed = accounts.reduce((a, b) => a + b.used, 0);
  const totalQuota = accounts.reduce((a, b) => a + b.total, 0);
  const totalPct = Math.round((totalUsed / totalQuota) * 100);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
          <span className="material-symbols-outlined text-white text-[20px]">storage</span>
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Uso de Correo</h1>
          <p className="text-xs text-slate-500 font-medium">Monitorea el almacenamiento de tus cuentas de correo</p>
        </div>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:col-span-2">
          <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Uso total del dominio</p>
          <div className="flex items-end gap-3 mb-3">
            <p className="text-4xl font-black text-slate-900">{totalUsed} <span className="text-2xl text-slate-400">MB</span></p>
            <p className="text-sm text-slate-400 font-medium mb-1">/ {totalQuota} MB</p>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${totalPct > 80 ? "bg-gradient-to-r from-red-500 to-rose-600" : totalPct > 60 ? "bg-gradient-to-r from-amber-400 to-orange-500" : "bg-gradient-to-r from-[#00A3FF] to-blue-600"}`}
              style={{ width: `${totalPct}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-2 font-medium">{totalPct}% utilizado</p>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col justify-center">
          <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1">Total de mensajes</p>
          <p className="text-4xl font-black text-slate-900">{accounts.reduce((a, b) => a + b.messages, 0).toLocaleString()}</p>
          <p className="text-xs text-slate-400 font-medium mt-1">en {accounts.length} cuentas</p>
        </div>
      </div>

      {/* Per Account */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Por cuenta</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {accounts.map(acc => {
            const pct = Math.round((acc.used / acc.total) * 100);
            return (
              <div key={acc.email} className="px-6 py-5 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center">
                      <span className="material-symbols-outlined text-orange-600 text-[16px]">email</span>
                    </div>
                    <span className="text-sm font-bold text-slate-800 font-mono">{acc.email}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-900">{acc.used} / {acc.total} MB</p>
                    <p className="text-xs text-slate-400">{acc.messages.toLocaleString()} mensajes</p>
                  </div>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${pct > 80 ? "bg-gradient-to-r from-red-500 to-rose-600" : pct > 60 ? "bg-gradient-to-r from-amber-400 to-orange-500" : "bg-gradient-to-r from-[#00A3FF] to-blue-500"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">{pct}% utilizado</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
