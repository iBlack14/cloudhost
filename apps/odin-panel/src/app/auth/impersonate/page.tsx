"use client";

import { useSearchParams } from "next/navigation";

import { AppShell } from "@odisea/ui";

export default function OdinImpersonatePage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  return (
    <AppShell title="ODIN PANEL · Impersonación" accent="cyan" subtitle="Acceso delegado desde WHM para soporte y administración.">
      <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-6">
        <h2 className="text-xl font-semibold">Sesión iniciada desde WHM</h2>
        <p className="mt-2 text-sm text-zinc-300">
          Recibimos un token temporal de impersonación. En el siguiente paso conectaremos este token
          con sesión real del usuario dentro de ODIN PANEL.
        </p>
        <p className="mt-4 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-zinc-400">
          Token: {token ? `${token.slice(0, 24)}...` : "No encontrado"}
        </p>
      </section>
    </AppShell>
  );
}
