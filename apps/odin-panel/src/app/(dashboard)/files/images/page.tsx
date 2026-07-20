"use client";
import React, { useState } from "react";

export default function FilesImagesPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-500/20">
          <span className="material-symbols-outlined text-white text-[20px]">image</span>
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Administrador de Imágenes</h1>
          <p className="text-xs text-slate-500 font-medium">Optimiza, redimensiona y gestiona las imágenes de tu sitio</p>
        </div>
      </div>

      <div className="bg-pink-50 border border-pink-200 rounded-2xl p-4 flex items-start gap-3">
        <span className="material-symbols-outlined text-pink-500 text-[20px] mt-0.5">info</span>
        <p className="text-xs text-pink-700 font-medium">Esta herramienta permite optimizar imágenes automáticamente para mejorar el rendimiento de tu sitio web.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: "compress", label: "Comprimir imágenes", desc: "Reduce el tamaño sin perder calidad usando algoritmos de compresión sin pérdida.", color: "from-pink-500 to-rose-600", bg: "bg-pink-50 border-pink-200" },
          { icon: "photo_size_select_large", label: "Redimensionar", desc: "Ajusta las dimensiones de imágenes en lotes para diferentes tamaños de pantalla.", color: "from-violet-500 to-purple-600", bg: "bg-violet-50 border-violet-200" },
          { icon: "auto_fix_high", label: "Convertir formato", desc: "Convierte imágenes PNG, JPG a formatos modernos como WebP y AVIF.", color: "from-[#00A3FF] to-blue-600", bg: "bg-blue-50 border-blue-200" },
        ].map(card => (
          <div key={card.label} className={`rounded-3xl border p-6 ${card.bg}`}>
            <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-3 shadow-sm`}>
              <span className="material-symbols-outlined text-white text-[20px]">{card.icon}</span>
            </div>
            <h3 className="text-sm font-black text-slate-900 mb-1">{card.label}</h3>
            <p className="text-xs text-slate-500 mb-4">{card.desc}</p>
            <button className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 transition-colors">
              Próximamente
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </button>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-slate-400 text-[32px]">image_search</span>
        </div>
        <h3 className="text-sm font-black text-slate-900 mb-2">Explorador de Imágenes</h3>
        <p className="text-xs text-slate-400 font-medium mb-4">Navega por las imágenes de tu public_html y optimízalas directamente desde aquí</p>
        <button className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl text-sm font-bold transition-all">
          <span className="material-symbols-outlined text-[18px]">folder_open</span>
          Ir al Gestor de Archivos
        </button>
      </div>
    </div>
  );
}
