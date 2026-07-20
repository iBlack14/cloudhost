"use client";
import React, { useState } from "react";

interface CustomError {
  code: string;
  title: string;
  description: string;
  customPath?: string;
  isCustom: boolean;
}

export default function AdvancedErrorsPage() {
  const [errors, setErrors] = useState<CustomError[]>([
    { code: "400", title: "Bad Request", description: "La petición tiene una sintaxis incorrecta o no puede ser procesada.", isCustom: false },
    { code: "401", title: "Unauthorized", description: "Se requiere autenticación para acceder a este recurso.", isCustom: false },
    { code: "403", title: "Forbidden", description: "No tienes permiso para acceder o listar este directorio.", isCustom: true, customPath: "/403.html" },
    { code: "404", title: "Not Found", description: "El recurso solicitado no pudo ser encontrado en el servidor.", isCustom: true, customPath: "/404.html" },
    { code: "500", title: "Internal Server Error", description: "El servidor encontró una condición inesperada que le impidió completar la solicitud.", isCustom: true, customPath: "/500.html" },
    { code: "503", title: "Service Unavailable", description: "El servidor no está listo para manejar la solicitud (sobrecarga o mantenimiento).", isCustom: false },
  ]);
  const [editing, setEditing] = useState<string | null>(null);
  const [editPath, setEditPath] = useState("");

  const handleSave = (code: string) => {
    setErrors(errors.map(err => {
      if (err.code === code) {
        return { ...err, isCustom: !!editPath, customPath: editPath || undefined };
      }
      return err;
    }));
    setEditing(null);
    setEditPath("");
  };

  const startEdit = (err: CustomError) => {
    setEditing(err.code);
    setEditPath(err.customPath || "");
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-rose-500/20">
          <span className="material-symbols-outlined text-white text-[20px]">warning</span>
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Páginas de Error</h1>
          <p className="text-xs text-slate-500 font-medium">Personaliza las páginas que ven tus usuarios cuando ocurren errores HTTP</p>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 font-mono">Errores Comunes</h3>
        <div className="grid grid-cols-1 gap-4">
          {errors.map(err => (
            <div key={err.code} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex flex-col items-center justify-center shrink-0">
                  <span className="text-lg font-black text-slate-800">{err.code}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-800">{err.title}</h4>
                    {err.isCustom ? (
                      <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md uppercase tracking-wider">Personalizado</span>
                    ) : (
                      <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md uppercase tracking-wider">Por Defecto</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 max-w-xl">{err.description}</p>
                  {err.isCustom && err.customPath && (
                    <p className="text-xs text-[#00A3FF] font-mono mt-1">Ruta: {err.customPath}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 sm:self-center self-end">
                {editing === err.code ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="/mi-error-404.html"
                      value={editPath}
                      onChange={e => setEditPath(e.target.value)}
                      className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#00A3FF]/20"
                    />
                    <button
                      onClick={() => handleSave(err.code)}
                      className="bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-emerald-600 transition-colors"
                    >
                      OK
                    </button>
                    <button
                      onClick={() => setEditing(null)}
                      className="text-slate-500 text-xs font-bold px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => startEdit(err)}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#00A3FF] px-3 py-2 rounded-xl hover:bg-blue-50 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                    Personalizar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
