"use client";

import React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { fetchEmailWebmailSsoLink } from "../../../../../../lib/email";
import { useEmailAccount } from "../../../../../../lib/hooks/use-email-accounts";
import { EmailBreadcrumbs } from "../../../../../../components/email/EmailUI";

export default function WebmailLaunchPage() {
  const router = useRouter();
  const params = useParams<{ accountId: string }>();
  const accountId = typeof params?.accountId === "string" ? params.accountId : "";
  const { data: account, isLoading, isError } = useEmailAccount(accountId);
  const [launchError, setLaunchError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!accountId || isError) return;

    const launch = async () => {
      try {
        const nextUrl = await fetchEmailWebmailSsoLink(accountId);
        window.location.href = nextUrl;
      } catch (error) {
        setLaunchError(error instanceof Error ? error.message : "No se pudo abrir el webmail.");
      }
    };

    void launch();
  }, [accountId, isError, router]);

  if (isError || launchError) {
    return (
      <div className="space-y-6 animate-in fade-in duration-700 max-w-7xl mx-auto">
        <EmailBreadcrumbs
          items={[
            { label: "Dashboard", href: "/" },
            { label: "Correo", href: "/email/accounts" },
            { label: "Webmail" }
          ]}
        />
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-[32px]">error</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">Acceso Denegado</h1>
          <p className="text-slate-500 max-w-md mx-auto text-xs font-medium">
            {launchError ?? "La cuenta solicitada no existe o no se pudo establecer una sesión segura en este momento."}
          </p>
          <div className="pt-4">
            <Link href="/email/accounts" className="inline-flex rounded-xl bg-[#00A3FF] px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-[#00A3FF]/20 hover:bg-[#008EE0] transition-all active:scale-95">
              Volver a Cuentas
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700 max-w-7xl mx-auto">
      <EmailBreadcrumbs
        items={[
          { label: "Dashboard", href: "/" },
          { label: "Correo", href: "/email/accounts" },
          { label: "Webmail" }
        ]}
      />

      <div className="bg-white border border-slate-200 rounded-2xl min-h-[50vh] p-8 md:p-16 relative overflow-hidden shadow-2xl shadow-slate-200/50 flex items-center justify-center">
        {/* Background Tech Elements */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#00A3FF]/5 blur-[120px] rounded-full animate-pulse" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-slate-100 blur-[100px] rounded-full" />
          
          {/* Subtle Grid Pattern inside the card */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#00A3FF 1px, transparent 0)', backgroundSize: '30px 30px' }} />
        </div>

        <div className="relative z-10 w-full max-w-4xl flex flex-col items-center text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-xl border border-[#00A3FF]/20 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#00A3FF] shadow-xl shadow-[#00A3FF]/5 animate-bounce-subtle">
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00A3FF] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00A3FF]"></span>
            </div>
            Puente de Conexión Seguro
          </div>

          {/* Main Title Section */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-black text-slate-900 uppercase italic tracking-[ -0.05em] leading-none">
              MAIL <span className="text-[#00A3FF] not-italic">WORKSPACE</span>
            </h1>
            <p className="max-w-xl mx-auto text-sm leading-relaxed text-slate-400 font-medium">
              {isLoading
                ? "Autenticando identidad en el clúster de mensajería..."
                : `Preparando acceso remoto para ${account?.address}. Redirigiendo a entorno seguro.`}
            </p>
          </div>

          {/* New Advanced Progress Bar */}
          <div className="w-full max-w-xl space-y-6">
            <div className="relative h-3 overflow-hidden rounded-full bg-slate-50 border border-slate-100 shadow-inner">
               {/* Background Glow Shimmer */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00A3FF]/10 to-transparent animate-shimmer" />
              
              {/* Main Progress Fill */}
              <div className="h-full w-full bg-gradient-to-r from-[#00A3FF] via-[#33C2FF] to-[#00A3FF] origin-left animate-load-progress rounded-full shadow-[0_0_15px_rgba(0,163,255,0.4)]" />
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <LaunchStep label="Vínculo SSO" icon="verified_user" delay="0s" done={!isLoading} />
              <LaunchStep label="Sincronización" icon="sync_alt" delay="0.2s" done={!isLoading} />
              <LaunchStep label="Despliegue" icon="rocket_launch" delay="0.4s" done={!isLoading} />
            </div>
          </div>

          {/* Footer Info */}
          <div className="flex flex-col md:flex-row items-center gap-6 pt-4">
            <div className="group relative overflow-hidden px-6 py-3 rounded-xl bg-slate-900 text-white shadow-2xl transition-all hover:scale-105 active:scale-95">
               {/* Scanning Line Animation */}
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#00A3FF] to-transparent animate-scan z-0" />
              <div className="relative z-10 flex items-center gap-3">
                <span className="material-symbols-outlined text-[#00A3FF] text-[18px]">account_circle</span>
                <span className="text-xs font-bold tracking-tight">{account?.address ?? "Cargando credenciales..."}</span>
              </div>
            </div>

            <Link href="/email/accounts" className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 transition-all group">
              <span className="material-symbols-outlined text-[15px] group-hover:rotate-180 transition-transform duration-500">cancel</span>
              Abortar Conexión
            </Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes load-progress {
          0% { transform: scaleX(0); }
          100% { transform: scaleX(1); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes scan {
          0% { transform: translateY(0); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(60px); opacity: 0; }
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-load-progress {
          animation: load-progress 2s cubic-bezier(0.65, 0, 0.35, 1) forwards;
        }
        .animate-shimmer {
          animation: shimmer 1.5s infinite linear;
        }
        .animate-scan {
          animation: scan 3s infinite ease-in-out;
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 3s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}

function LaunchStep({ label, icon, done, delay }: { label: string; icon: string; done: boolean; delay: string }) {
  return (
    <div 
      className={`rounded-2xl border transition-all duration-700 p-6 flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 shadow-sm ${
        done ? 'border-[#00A3FF]/20 bg-[#00A3FF]/5' : 'border-slate-100 bg-slate-50/50'
      }`}
      style={{ animationDelay: delay }}
    >
      <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 ${
        done ? 'bg-[#00A3FF] text-white rotate-[360deg] shadow-lg shadow-[#00A3FF]/30' : 'bg-slate-100 text-slate-300'
      }`}>
        <span className="material-symbols-outlined text-[24px]">{icon}</span>
      </div>
      <span className={`text-[10px] font-black uppercase tracking-[0.15em] ${done ? "text-slate-900" : "text-slate-400"}`}>
        {label}
      </span>
    </div>
  );
}
