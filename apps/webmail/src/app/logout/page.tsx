"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { logoutMail } from "../../lib/mail-client";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    logoutMail().finally(() => router.replace("/login"));
  }, [router]);

  return (
    <div className="mail-shell flex min-h-screen items-center justify-center">
      <div className="glass-card w-full max-w-xl p-10 text-center">
        <div className="text-xs font-black uppercase tracking-[0.28em] text-primary">Logout</div>
        <h1 className="mt-4 text-4xl font-headline font-black uppercase italic tracking-tight text-white">
          Cerrando sesión
        </h1>
        <p className="mt-5 text-base leading-8 text-zinc-400">
          Estamos cerrando tu sesión segura de webmail.
        </p>
      </div>
    </div>
  );
}
