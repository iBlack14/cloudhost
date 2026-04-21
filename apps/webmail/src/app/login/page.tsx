"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { loginMail } from "../../lib/mail-client";

export default function LoginPage() {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await loginMail(address, password);
      router.replace("/inbox");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mail-shell flex min-h-screen items-center justify-center">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.1fr_520px]">
        <section className="glass-card p-8 md:p-10">
          <div className="text-xs font-black uppercase tracking-[0.28em] text-primary">Odisea Mail</div>
          <h1 className="mt-4 text-5xl font-headline font-black uppercase italic tracking-tight text-white">
            Webmail
          </h1>
          <p className="mt-6 max-w-xl text-base leading-8 text-zinc-400">
            Accede a tu correo con tu dirección completa y la contraseña de tu buzón. Si vienes desde el panel ODIN,
            el acceso directo usa SSO sin pedirte la clave otra vez.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <FeatureCard icon="shield_lock" title="Sesión segura" text="Cookie HttpOnly separada del panel administrativo." />
            <FeatureCard icon="alternate_email" title="Correo real" text="Bandeja, lectura y envío desde el backend de Odisea." />
          </div>
        </section>

        <section className="glass-card p-8 md:p-10">
          <div className="space-y-2">
            <div className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Login</div>
            <h2 className="text-3xl font-headline font-black uppercase italic tracking-tight text-white">
              Ingresar al buzón
            </h2>
          </div>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500">Correo completo</label>
              <input
                type="email"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="admin@odiseacloud.com"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-primary/35"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="********"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-primary/35"
                required
              />
            </div>

            {error ? (
              <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="kinetic-gradient w-full rounded-2xl px-5 py-4 text-sm font-black uppercase tracking-[0.16em] text-white disabled:opacity-60"
            >
              {loading ? "Abriendo sesión..." : "Entrar al Mail"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5">
      <span className="material-symbols-outlined text-primary">{icon}</span>
      <div className="mt-3 text-lg font-headline font-black text-white">{title}</div>
      <div className="mt-2 text-sm leading-6 text-zinc-400">{text}</div>
    </div>
  );
}
