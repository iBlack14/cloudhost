"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { exchangeMailSso } from "../../../lib/mail-client";

export default function SsoPage() {
  return (
    <Suspense fallback={<SsoFrame message="Preparando acceso directo..." />}>
      <SsoResolver />
    </Suspense>
  );
}

function SsoResolver() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setError("No se detectó token SSO.");
      return;
    }

    exchangeMailSso(token)
      .then(() => router.replace("/inbox"))
      .catch((reason) => setError(reason instanceof Error ? reason.message : "No se pudo abrir la sesión SSO."));
  }, [router, searchParams]);

  return <SsoFrame message={error ?? "Estamos validando el acceso directo generado por ODIN y preparando tu workspace."} error={error} />;
}

function SsoFrame({ message, error }: { message: string; error?: string | null }) {
  return (
    <div className="mail-shell flex min-h-screen items-center justify-center">
      <div className="glass-card w-full max-w-2xl p-10 text-center">
        <div className="text-xs font-black uppercase tracking-[0.28em] text-primary">SSO</div>
        <h1 className="mt-4 text-4xl font-headline font-black uppercase italic tracking-tight text-white">
          {error ? "No pudimos abrir tu sesión" : "Entrando al buzón"}
        </h1>
        <p className="mt-5 text-base leading-8 text-zinc-400">{message}</p>
        {error ? (
          <Link
            href="/login"
            className="mt-8 inline-flex rounded-2xl border border-primary/20 bg-primary/10 px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-primary"
          >
            Ir al login
          </Link>
        ) : (
          <div className="mt-8 h-2 overflow-hidden rounded-full bg-white/5">
            <div className="h-full w-1/2 animate-[progress_1.6s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-primary via-secondary to-accent" />
          </div>
        )}
      </div>
    </div>
  );
}
