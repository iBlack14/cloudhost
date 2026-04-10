import type { ReactNode } from "react";

interface AppShellProps {
  title: string;
  accent: "violet" | "cyan";
  subtitle?: string;
  children?: ReactNode;
}

const accentClass = {
  violet: {
    header: "from-violet-500/30 via-indigo-500/15 to-transparent",
    glow: "shadow-[0_0_0_1px_rgba(167,139,250,0.25),0_24px_80px_-32px_rgba(124,58,237,0.6)]",
    badge: "border-violet-300/30 bg-violet-400/15 text-violet-100"
  },
  cyan: {
    header: "from-cyan-500/30 via-blue-500/15 to-transparent",
    glow: "shadow-[0_0_0_1px_rgba(103,232,249,0.25),0_24px_80px_-32px_rgba(6,182,212,0.6)]",
    badge: "border-cyan-300/30 bg-cyan-400/15 text-cyan-100"
  }
};

const navItems = {
  violet: [
    { href: "/", label: "Dashboard" },
    { href: "/whm/accounts", label: "Cuentas" },
    { href: "/whm/accounts/create", label: "Crear Cuenta" }
  ],
  cyan: [
    { href: "/", label: "Dashboard" },
    { href: "/auth/impersonate", label: "Impersonación" }
  ]
};

export const AppShell = ({ title, accent, subtitle, children }: AppShellProps) => {
  return (
    <div className="min-h-screen bg-[#07090d] text-zinc-100">
      <header className={`border-b border-white/10 bg-gradient-to-r ${accentClass[accent].header} px-6 py-5`}>
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm text-zinc-300">{subtitle}</p> : null}
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-widest ${accentClass[accent].badge}`}>
            {accent === "violet" ? "WHM" : "ODIN"}
          </span>
        </div>
      </header>
      <main className="mx-auto grid w-full max-w-7xl gap-6 p-6 lg:grid-cols-[220px_1fr]">
        <aside className={`hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4 lg:block ${accentClass[accent].glow}`}>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-zinc-400">Navegación</p>
          <nav className="space-y-2">
            {navItems[accent].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="block rounded-lg border border-transparent px-3 py-2 text-sm text-zinc-300 transition hover:border-white/10 hover:bg-white/[0.04] hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </aside>
        <section>{children}</section>
      </main>
    </div>
  );
};
