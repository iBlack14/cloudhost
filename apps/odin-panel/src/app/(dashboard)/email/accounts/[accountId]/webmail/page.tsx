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

    const timer = window.setTimeout(() => {
      void launch();
    }, 900);

    return () => window.clearTimeout(timer);
  }, [accountId, isError, router]);

  if (isError || launchError) {
    return (
      <div className="space-y-8">
        <EmailBreadcrumbs
          items={[
            { label: "Dashboard", href: "/" },
            { label: "Email", href: "/email/accounts" },
            { label: "Webmail" }
          ]}
        />
        <div className="glass-card p-10 text-center space-y-4">
          <h1 className="text-3xl font-headline font-black text-white uppercase italic">No pudimos abrir WebMail</h1>
          <p className="text-zinc-400">
            {launchError ?? "La cuenta solicitada no existe o aún no fue provisionada."}
          </p>
          <Link href="/email/accounts" className="inline-flex rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-primary">
            Volver a cuentas
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <EmailBreadcrumbs
        items={[
          { label: "Dashboard", href: "/" },
          { label: "Email", href: "/email/accounts" },
          { label: "Webmail" }
        ]}
      />

      <div className="glass-card min-h-[70vh] p-10 md:p-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,163,255,0.15),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(0,229,255,0.12),transparent_30%)]" />
        <div className="relative z-10 max-w-3xl space-y-8">
          <div className="inline-flex items-center gap-3 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-primary">
            <span className="h-2 w-2 rounded-full bg-primary pulse-glow" />
            Iniciando sesión en WebMail
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-headline font-black text-white uppercase italic tracking-tighter">
              Mail Workspace
            </h1>
            <p className="max-w-2xl text-base leading-7 text-zinc-400">
              {isLoading
                ? "Validando credenciales del buzón y preparando la sesión segura..."
                : `Abriendo el webmail independiente de ${account?.address} con SSO desde ODIN.`}
            </p>
          </div>

          <div className="space-y-4">
            <div className="h-2 overflow-hidden rounded-full bg-white/5">
              <div className="h-full w-1/2 animate-[progress_1.8s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-primary via-secondary to-primary" />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <LaunchStep label="Verificando buzón" done={!isLoading} />
              <LaunchStep label="Sincronizando mensajes" done={!isLoading} />
              <LaunchStep label="Montando workspace" done={!isLoading} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-4">
            <span className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-300">
              {account?.address ?? "Cargando cuenta..."}
            </span>
            <Link href="/email/accounts" className="text-sm font-black uppercase tracking-[0.16em] text-zinc-500 transition-colors hover:text-white">
              ← Volver
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function LaunchStep({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
      <div className="flex items-center gap-3">
        <span className={`material-symbols-outlined text-[18px] ${done ? "text-primary" : "text-zinc-600"}`}>
          {done ? "check_circle" : "hourglass_top"}
        </span>
        <span className="text-[11px] font-black uppercase tracking-[0.14em] text-zinc-300">{label}</span>
      </div>
    </div>
  );
}
