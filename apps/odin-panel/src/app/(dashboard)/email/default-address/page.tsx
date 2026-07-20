"use client";
import React, { useState } from "react";

export default function DefaultAddressPage() {
  const [mode, setMode] = useState<"discard" | "bounce" | "forward">("discard");
  const [forwardTo, setForwardTo] = useState("");
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const modeOptions = [
    {
      value: "discard",
      icon: "delete_sweep",
      label: "Descartar silenciosamente",
      desc: "Los correos enviados a direcciones inexistentes son ignorados sin notificación.",
      color: "from-red-500 to-rose-600",
      bg: "bg-red-50 border-red-200",
      selected: "border-red-500 bg-red-50 ring-2 ring-red-200",
    },
    {
      value: "bounce",
      icon: "reply",
      label: "Rebote (Error al remitente)",
      desc: "El remitente recibe un error indicando que la dirección no existe.",
      color: "from-amber-500 to-orange-600",
      bg: "bg-amber-50 border-amber-200",
      selected: "border-amber-500 bg-amber-50 ring-2 ring-amber-200",
    },
    {
      value: "forward",
      icon: "forward_to_inbox",
      label: "Reenviar a otra cuenta",
      desc: "Todos los correos a direcciones inexistentes son reenviados a una cuenta específica.",
      color: "from-[#00A3FF] to-blue-600",
      bg: "bg-blue-50 border-blue-200",
      selected: "border-[#00A3FF] bg-blue-50 ring-2 ring-blue-200",
    },
  ] as const;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
          <span className="material-symbols-outlined text-white text-[20px]">mark_email_unread</span>
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Dirección Predeterminada</h1>
          <p className="text-xs text-slate-500 font-medium">Configura qué hacer con correos enviados a cuentas que no existen</p>
        </div>
      </div>

      {/* Info */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
        <span className="material-symbols-outlined text-amber-500 text-[20px] mt-0.5">info</span>
        <p className="text-xs text-amber-700 font-medium">La dirección predeterminada gestiona los correos recibidos en tu dominio que no corresponden a ninguna cuenta o alias existente.</p>
      </div>

      {/* Options */}
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {modeOptions.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setMode(opt.value as typeof mode)}
              className={`text-left p-5 rounded-3xl border-2 transition-all ${mode === opt.value ? opt.selected : "bg-white border-slate-200 hover:border-slate-300"}`}
            >
              <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${opt.color} flex items-center justify-center mb-3 shadow-sm`}>
                <span className="material-symbols-outlined text-white text-[20px]">{opt.icon}</span>
              </div>
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-sm font-black text-slate-900">{opt.label}</p>
                {mode === opt.value && (
                  <div className="w-5 h-5 rounded-full bg-[#00A3FF] flex items-center justify-center shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-white text-[12px]">check</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500">{opt.desc}</p>
            </button>
          ))}
        </div>

        {mode === "forward" && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 animate-in slide-in-from-top duration-200">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">Reenviar correos a</label>
            <div className="flex gap-3">
              <input
                type="email"
                placeholder="admin@midominio.com"
                value={forwardTo}
                onChange={e => setForwardTo(e.target.value)}
                required={mode === "forward"}
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A3FF]/30 focus:border-[#00A3FF] transition-all"
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="flex items-center gap-2 bg-[#00A3FF] hover:bg-blue-500 text-white px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">save</span>
            Guardar Configuración
          </button>
          {saved && (
            <div className="flex items-center gap-2 text-emerald-600 animate-in fade-in duration-200">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              <span className="text-sm font-bold">¡Guardado!</span>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
