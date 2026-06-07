"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PhpMyAdminRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/databases");
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
      <div className="w-16 h-16 border-4 border-slate-200 border-t-[#00A3FF] rounded-full animate-spin"></div>
      <div className="text-center space-y-2">
         <h2 className="text-2xl font-black text-slate-900 uppercase">Cargando Gestor de Datos</h2>
         <p className="text-sm text-slate-500 font-medium">Redireccionando a tus Bases de Datos...</p>
      </div>
    </div>
  );
}
