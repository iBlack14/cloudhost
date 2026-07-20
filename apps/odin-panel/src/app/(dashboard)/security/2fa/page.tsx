"use client";
import React, { useState } from "react";

export default function TwoFactorPage() {
  const [enabled, setEnabled] = useState(false);
  const [step, setStep] = useState<"idle" | "setup" | "verify" | "done">("idle");
  const [code, setCode] = useState("");
  const qrCode = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMTAgMjEwIj48cmVjdCB3aWR0aD0iMjEwIiBoZWlnaHQ9IjIxMCIgZmlsbD0id2hpdGUiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1zaXplPSIxNHB4IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZmlsbD0iIzMzMyI+UVIgQ29kZSAyRkE8L3RleHQ+PC9zdmc+";
  const backupCodes = ["ABCD-1234", "EFGH-5678", "IJKL-9012", "MNOP-3456", "QRST-7890", "UVWX-1234", "YZAB-5678", "CDEF-9012"];

  const handleEnable = () => setStep("setup");
  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length === 6) { setStep("done"); setEnabled(true); }
  };
  const handleDisable = () => {
    if (confirm("¿Desactivar la autenticación de dos factores? Esto reducirá la seguridad de tu cuenta.")) {
      setEnabled(false);
      setStep("idle");
      setCode("");
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-500/20">
          <span className="material-symbols-outlined text-white text-[20px]">security</span>
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Autenticación en Dos Pasos</h1>
          <p className="text-xs text-slate-500 font-medium">Añade una capa adicional de seguridad a tu cuenta</p>
        </div>
      </div>

      {/* Status Card */}
      <div className={`rounded-3xl border-2 p-6 flex items-center justify-between gap-4 transition-all ${enabled ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${enabled ? "bg-emerald-500" : "bg-slate-300"}`}>
            <span className="material-symbols-outlined text-white text-[24px]">{enabled ? "lock" : "lock_open"}</span>
          </div>
          <div>
            <p className="text-sm font-black text-slate-900">Estado actual</p>
            <p className={`text-lg font-black ${enabled ? "text-emerald-600" : "text-slate-400"}`}>{enabled ? "✓ Activo" : "✗ Inactivo"}</p>
          </div>
        </div>
        {!enabled && step === "idle" && (
          <button onClick={handleEnable} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-violet-500/20 active:scale-95">
            <span className="material-symbols-outlined text-[18px]">shield</span>
            Activar 2FA
          </button>
        )}
        {enabled && (
          <button onClick={handleDisable} className="flex items-center gap-2 bg-red-100 hover:bg-red-200 text-red-700 px-5 py-2.5 rounded-xl text-sm font-bold transition-all">
            <span className="material-symbols-outlined text-[18px]">no_encryption</span>
            Desactivar
          </button>
        )}
      </div>

      {/* Setup Steps */}
      {step === "setup" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6 animate-in slide-in-from-bottom duration-300">
          <div>
            <span className="text-xs font-black text-violet-600 uppercase tracking-widest bg-violet-50 px-2 py-1 rounded-lg">Paso 1 de 2</span>
            <h3 className="text-lg font-black text-slate-900 mt-2">Escanea el código QR</h3>
            <p className="text-xs text-slate-500 mt-1">Abre tu app de autenticación (Google Authenticator, Authy, etc.) y escanea el código QR.</p>
          </div>
          <div className="flex justify-center">
            <div className="w-48 h-48 bg-white border-2 border-slate-200 rounded-2xl flex items-center justify-center p-4">
              <div className="w-full h-full bg-slate-100 rounded-xl flex flex-col items-center justify-center gap-2">
                <span className="material-symbols-outlined text-slate-400 text-[40px]">qr_code_2</span>
                <p className="text-xs text-slate-400 text-center font-medium px-2">QR Code se genera en el servidor</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-50 rounded-2xl p-4">
            <p className="text-xs font-bold text-slate-600 mb-1">Clave manual</p>
            <p className="text-sm font-mono text-slate-800 tracking-widest">JBSW Y3DP EHPK 3PXP</p>
          </div>
          <button onClick={() => setStep("verify")} className="w-full bg-violet-600 hover:bg-violet-500 text-white py-3 rounded-xl text-sm font-bold transition-all">
            Continuar a verificación →
          </button>
        </div>
      )}

      {step === "verify" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6 animate-in slide-in-from-bottom duration-300">
          <div>
            <span className="text-xs font-black text-violet-600 uppercase tracking-widest bg-violet-50 px-2 py-1 rounded-lg">Paso 2 de 2</span>
            <h3 className="text-lg font-black text-slate-900 mt-2">Verifica el código</h3>
            <p className="text-xs text-slate-500 mt-1">Ingresa el código de 6 dígitos de tu app de autenticación para confirmar la configuración.</p>
          </div>
          <form onSubmit={handleVerify} className="space-y-4">
            <input
              type="text"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
              className="w-full text-center text-3xl font-black tracking-[0.5em] py-5 rounded-2xl border-2 border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400 transition-all"
            />
            <button type="submit" disabled={code.length !== 6} className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white py-3 rounded-xl text-sm font-bold transition-all">
              Verificar y Activar 2FA
            </button>
          </form>
        </div>
      )}

      {(step === "done" || enabled) && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4 animate-in fade-in duration-300">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Códigos de Respaldo</h3>
          <p className="text-xs text-slate-500">Guarda estos códigos en un lugar seguro. Si pierdes acceso a tu app de 2FA, podrás usarlos para iniciar sesión.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {backupCodes.map(code => (
              <div key={code} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-center">
                <span className="text-xs font-mono font-bold text-slate-700">{code}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => { navigator.clipboard.writeText(backupCodes.join("\n")); alert("¡Códigos copiados!"); }}
            className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 px-4 py-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">content_copy</span>
            Copiar todos los códigos
          </button>
        </div>
      )}
    </div>
  );
}
