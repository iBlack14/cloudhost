"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { MailIdentity } from "@odisea/types";

import { fetchMailMe } from "../../lib/mail-client";
import { MailShell } from "../../components/MailShell";

export default function SettingsPage() {
  const router = useRouter();
  const [me, setMe] = useState<MailIdentity | null>(null);

  useEffect(() => {
    fetchMailMe()
      .then(setMe)
      .catch(() => router.replace("/login"));
  }, [router]);

  return (
    <MailShell
      me={me}
      title="Settings"
      subtitle="Resumen de identidad y estado de la sesión del webmail."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card p-6">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Mailbox identity</div>
          <div className="mt-5 space-y-3 text-sm text-zinc-300">
            <div>Address: {me?.address ?? "Cargando..."}</div>
            <div>Username: {me?.username ?? "-"}</div>
            <div>Domain: {me?.domain ?? "-"}</div>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Session</div>
          <div className="mt-5 space-y-3 text-sm text-zinc-300">
            <div>Scope: independiente del panel ODIN</div>
            <div>Storage: cookie HttpOnly en `/mail`</div>
            <div>Access: login directo y SSO desde ODIN</div>
          </div>
        </div>
      </div>
    </MailShell>
  );
}
