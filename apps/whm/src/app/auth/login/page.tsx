"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { hasWhmSession, loginWhm } from "../../../lib/api";

export default function WhmLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (hasWhmSession()) {
      router.replace("/whm");
    }
  }, [router]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await loginWhm(username, password);
      router.replace("/whm");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo iniciar sesión");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050B14] flex items-center justify-center px-4">
      <div className="glass-card w-full max-w-md p-8 space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-headline font-black text-white tracking-tight uppercase italic">WHM Login</h1>
          <p className="text-zinc-500 text-xs uppercase tracking-widest">Administrative access required</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Username</label>
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary/50 transition-colors"
              placeholder="admin"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary/50 transition-colors"
              placeholder="********"
            />
          </div>

          {error ? (
            <div className="p-3 rounded-lg border border-red-500/40 bg-red-500/10 text-red-300 text-xs font-semibold">{error}</div>
          ) : null}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full kinetic-gradient py-3 rounded-xl text-white font-black uppercase tracking-widest text-xs disabled:opacity-60"
          >
            {isLoading ? "Verifying..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
