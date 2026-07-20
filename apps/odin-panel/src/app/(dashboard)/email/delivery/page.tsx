"use client";
import React, { useState } from "react";

interface DeliveryLog {
  id: string;
  from: string;
  to: string;
  subject: string;
  status: "delivered" | "bounced" | "deferred" | "rejected";
  time: string;
  size: string;
}

const STATUS_INFO = {
  delivered: { label: "Entregado", icon: "check_circle", color: "text-emerald-600 bg-emerald-50" },
  bounced: { label: "Rebotado", icon: "cancel", color: "text-red-600 bg-red-50" },
  deferred: { label: "Diferido", icon: "schedule", color: "text-amber-600 bg-amber-50" },
  rejected: { label: "Rechazado", icon: "block", color: "text-slate-600 bg-slate-100" },
};

export default function EmailDeliveryPage() {
  const [logs] = useState<DeliveryLog[]>([
    { id: "1", from: "noreply@midominio.com", to: "cliente@gmail.com", subject: "Confirmación de pedido #1234", status: "delivered", time: "Hace 5 min", size: "12 KB" },
    { id: "2", from: "info@midominio.com", to: "usuario@outlook.com", subject: "Bienvenido a nuestro servicio", status: "delivered", time: "Hace 23 min", size: "8 KB" },
    { id: "3", from: "factura@midominio.com", to: "invalido@dominio.xyz", subject: "Factura del mes de julio", status: "bounced", time: "Hace 1 hora", size: "22 KB" },
    { id: "4", from: "soporte@midominio.com", to: "cliente2@yahoo.com", subject: "Respuesta a tu ticket", status: "deferred", time: "Hace 2 horas", size: "5 KB" },
    { id: "5", from: "spam@otro.com", to: "info@midominio.com", subject: "Oferta imperdible!!!!", status: "rejected", time: "Hace 3 horas", size: "3 KB" },
  ]);
  const [filter, setFilter] = useState<"all" | DeliveryLog["status"]>("all");

  const filtered = filter === "all" ? logs : logs.filter(l => l.status === filter);

  const stats = {
    delivered: logs.filter(l => l.status === "delivered").length,
    bounced: logs.filter(l => l.status === "bounced").length,
    deferred: logs.filter(l => l.status === "deferred").length,
    rejected: logs.filter(l => l.status === "rejected").length,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
          <span className="material-symbols-outlined text-white text-[20px]">local_shipping</span>
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Entrega de Correo</h1>
          <p className="text-xs text-slate-500 font-medium">Monitorea el estado de entrega de los correos de tu dominio</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {(Object.entries(stats) as [string, number][]).map(([key, val]) => {
          const info = STATUS_INFO[key as DeliveryLog["status"]];
          return (
            <button key={key} onClick={() => setFilter(filter === key ? "all" : key as DeliveryLog["status"])}
              className={`p-4 rounded-2xl border-2 text-left transition-all ${filter === key ? "border-[#00A3FF] bg-blue-50 shadow-sm" : "bg-white border-slate-200 hover:border-slate-300"}`}>
              <span className={`material-symbols-outlined text-[24px] block mb-2 ${info.color.split(" ")[0]}`}>{info.icon}</span>
              <p className="text-2xl font-black text-slate-900">{val}</p>
              <p className="text-xs text-slate-500 font-medium">{info.label}</p>
            </button>
          );
        })}
      </div>

      {/* Log Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Registro de Entregas</h2>
          <span className="text-xs text-slate-400 font-medium">{filtered.length} registros</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-6 py-3 text-xs font-black text-slate-400 uppercase tracking-wider">Estado</th>
                <th className="text-left px-6 py-3 text-xs font-black text-slate-400 uppercase tracking-wider">De</th>
                <th className="text-left px-6 py-3 text-xs font-black text-slate-400 uppercase tracking-wider">Para</th>
                <th className="text-left px-6 py-3 text-xs font-black text-slate-400 uppercase tracking-wider hidden md:table-cell">Asunto</th>
                <th className="text-left px-6 py-3 text-xs font-black text-slate-400 uppercase tracking-wider hidden lg:table-cell">Hora</th>
                <th className="text-left px-6 py-3 text-xs font-black text-slate-400 uppercase tracking-wider hidden lg:table-cell">Tamaño</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(log => {
                const info = STATUS_INFO[log.status];
                return (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${info.color}`}>
                        <span className="material-symbols-outlined text-[14px]">{info.icon}</span>
                        {info.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-600 max-w-[150px] truncate">{log.from}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-600 max-w-[150px] truncate">{log.to}</td>
                    <td className="px-6 py-4 text-xs text-slate-600 hidden md:table-cell max-w-[200px] truncate">{log.subject}</td>
                    <td className="px-6 py-4 text-xs text-slate-400 hidden lg:table-cell whitespace-nowrap">{log.time}</td>
                    <td className="px-6 py-4 text-xs text-slate-400 hidden lg:table-cell">{log.size}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-slate-400 text-sm font-medium">No hay registros con este filtro</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
