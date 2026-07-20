"use client";
import React, { useState } from "react";

export default function EmailEncryptionPage() {
  const [dkimEnabled, setDkimEnabled] = useState(true);
  const [spfEnabled, setSpfEnabled] = useState(true);
  const [dmarcEnabled, setDmarcEnabled] = useState(false);
  const [dmarcPolicy, setDmarcPolicy] = useState<"none" | "quarantine" | "reject">("none");
  const [dmarcEmail, setDmarcEmail] = useState("");

  const dkimKey = `v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA2a5gVz...`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("¡Copiado al portapapeles!");
  };

  const StatusBadge = ({ ok }: { ok: boolean }) => (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${ok ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
      <span className="material-symbols-outlined text-[14px]">{ok ? "check_circle" : "cancel"}</span>
      {ok ? "Activo" : "Inactivo"}
    </span>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-700 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <span className="material-symbols-outlined text-white text-[20px]">lock</span>
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Cifrado de Correo</h1>
          <p className="text-xs text-slate-500 font-medium">Configura DKIM, SPF y DMARC para autenticar tu dominio</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DKIM */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-indigo-600 text-[18px]">vpn_key</span>
              </div>
              <div>
                <p className="text-sm font-black text-slate-900">DKIM</p>
                <p className="text-xs text-slate-500">DomainKeys Identified Mail</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge ok={dkimEnabled} />
              <button onClick={() => setDkimEnabled(!dkimEnabled)} className={`w-10 h-6 rounded-full transition-all relative ${dkimEnabled ? "bg-indigo-500" : "bg-slate-200"}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${dkimEnabled ? "left-4" : "left-0.5"}`} />
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-500">Firma criptográfica que verifica que el correo fue enviado desde tu servidor y no fue alterado.</p>
          {dkimEnabled && (
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs font-black text-slate-600 uppercase tracking-wider mb-2">Registro DNS TXT Público</p>
              <div className="flex items-start gap-2">
                <code className="text-xs text-slate-700 font-mono break-all flex-1 leading-relaxed">{dkimKey}</code>
                <button onClick={() => copyToClipboard(dkimKey)} className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center shrink-0 transition-colors">
                  <span className="material-symbols-outlined text-[14px] text-slate-500">content_copy</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* SPF */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-emerald-600 text-[18px]">verified_user</span>
              </div>
              <div>
                <p className="text-sm font-black text-slate-900">SPF</p>
                <p className="text-xs text-slate-500">Sender Policy Framework</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge ok={spfEnabled} />
              <button onClick={() => setSpfEnabled(!spfEnabled)} className={`w-10 h-6 rounded-full transition-all relative ${spfEnabled ? "bg-emerald-500" : "bg-slate-200"}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${spfEnabled ? "left-4" : "left-0.5"}`} />
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-500">Define qué servidores están autorizados para enviar correos en nombre de tu dominio.</p>
          {spfEnabled && (
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs font-black text-slate-600 uppercase tracking-wider mb-2">Registro DNS TXT</p>
              <div className="flex items-center gap-2">
                <code className="text-xs text-slate-700 font-mono flex-1">v=spf1 mx a ip4:your.server.ip ~all</code>
                <button onClick={() => copyToClipboard("v=spf1 mx a ip4:your.server.ip ~all")} className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center shrink-0 transition-colors">
                  <span className="material-symbols-outlined text-[14px] text-slate-500">content_copy</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* DMARC */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-amber-600 text-[18px]">policy</span>
              </div>
              <div>
                <p className="text-sm font-black text-slate-900">DMARC</p>
                <p className="text-xs text-slate-500">Domain-based Message Authentication</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge ok={dmarcEnabled} />
              <button onClick={() => setDmarcEnabled(!dmarcEnabled)} className={`w-10 h-6 rounded-full transition-all relative ${dmarcEnabled ? "bg-amber-500" : "bg-slate-200"}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${dmarcEnabled ? "left-4" : "left-0.5"}`} />
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-500">Especifica cómo deben manejar los servidores destino los correos que fallan la verificación DKIM/SPF.</p>
          {dmarcEnabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Política</label>
                <select value={dmarcPolicy} onChange={e => setDmarcPolicy(e.target.value as typeof dmarcPolicy)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-all">
                  <option value="none">none – Solo monitorear</option>
                  <option value="quarantine">quarantine – Enviar a spam</option>
                  <option value="reject">reject – Rechazar correos</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Reportes a (email)</label>
                <input type="email" placeholder="admin@midominio.com" value={dmarcEmail} onChange={e => setDmarcEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-all" />
              </div>
              <div className="sm:col-span-2 bg-slate-50 rounded-xl p-4">
                <p className="text-xs font-black text-slate-600 uppercase tracking-wider mb-2">Registro generado</p>
                <code className="text-xs text-slate-700 font-mono break-all">{`v=DMARC1; p=${dmarcPolicy}; rua=mailto:${dmarcEmail || "admin@tudominio.com"}`}</code>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
