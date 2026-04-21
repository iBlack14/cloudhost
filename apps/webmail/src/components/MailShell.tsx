"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { MailIdentity } from "@odisea/types";

export function MailShell({
  children,
  me,
  title,
  subtitle
}: {
  children: React.ReactNode;
  me: MailIdentity | null;
  title: string;
  subtitle: string;
}) {
  const pathname = usePathname();

  return (
    <div className="mail-shell">
      <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="glass-card p-6 xl:sticky xl:top-6 xl:h-[calc(100vh-3rem)]">
          <div className="space-y-3">
            <div className="text-xs font-black uppercase tracking-[0.28em] text-primary">Odisea Mail</div>
            <div className="text-3xl font-headline font-black uppercase italic tracking-tight text-white">
              {me?.domain ?? "Workspace"}
            </div>
            <div className="text-sm leading-6 text-zinc-400">
              Webmail independiente con login propio y acceso directo desde ODIN.
            </div>
          </div>

          <nav className="mt-8 space-y-2">
            <MailNavItem href="/inbox" icon="inbox" label="Inbox" active={pathname.endsWith("/inbox")} />
            <MailNavItem href="/compose" icon="edit" label="Compose" active={pathname.endsWith("/compose")} />
            <MailNavItem href="/settings" icon="settings" label="Settings" active={pathname.endsWith("/settings")} />
            <MailNavItem href="/logout" icon="logout" label="Logout" active={pathname.endsWith("/logout")} />
          </nav>

          <div className="mt-8 rounded-3xl border border-primary/10 bg-primary/10 p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Active mailbox</div>
            <div className="mt-3 text-sm text-white">{me?.address ?? "Loading..."}</div>
          </div>
        </aside>

        <main className="space-y-6">
          <header className="glass-card p-6">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500">Mail Workspace</div>
            <h1 className="mt-3 text-4xl font-headline font-black uppercase italic tracking-tight text-white">{title}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">{subtitle}</p>
          </header>
          {children}
        </main>
      </div>
    </div>
  );
}

function MailNavItem({
  href,
  icon,
  label,
  active
}: {
  href: string;
  icon: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-black uppercase tracking-[0.14em] transition-all ${
        active
          ? "border-primary/20 bg-primary/10 text-primary"
          : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-white"
      }`}
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
      {label}
    </Link>
  );
}
