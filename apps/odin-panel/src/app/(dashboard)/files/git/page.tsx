"use client";
import React, { useState } from "react";

interface GitRepo {
  id: string;
  name: string;
  path: string;
  branch: string;
  remote: string;
  lastCommit: string;
  status: "synced" | "behind" | "ahead" | "diverged";
}

const STATUS_INFO = {
  synced: { label: "Sincronizado", icon: "check_circle", color: "text-emerald-600 bg-emerald-50" },
  behind: { label: "Desactualizado", icon: "download", color: "text-amber-600 bg-amber-50" },
  ahead: { label: "Con cambios locales", icon: "upload", color: "text-blue-600 bg-blue-50" },
  diverged: { label: "Divergente", icon: "fork_right", color: "text-red-600 bg-red-50" },
};

export default function FilesGitPage() {
  const [repos] = useState<GitRepo[]>([
    { id: "1", name: "mi-sitio-web", path: "/home/user/public_html", branch: "main", remote: "https://github.com/usuario/mi-sitio-web", lastCommit: "Hace 2 horas", status: "synced" },
    { id: "2", name: "api-backend", path: "/home/user/api", branch: "develop", remote: "https://github.com/usuario/api-backend", lastCommit: "Hace 1 día", status: "behind" },
  ]);
  const [showClone, setShowClone] = useState(false);
  const [cloneUrl, setCloneUrl] = useState("");
  const [clonePath, setClonePath] = useState("");

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <span className="material-symbols-outlined text-white text-[20px]">merge_type</span>
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Repositorios Git</h1>
            <p className="text-xs text-slate-500 font-medium">Gestiona y sincroniza tus repositorios de código directamente desde el servidor</p>
          </div>
        </div>
        <button onClick={() => setShowClone(true)} className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-orange-500/20 active:scale-95">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Clonar Repositorio
        </button>
      </div>

      {showClone && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 animate-in slide-in-from-top duration-200">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4">Clonar Repositorio</h3>
          <form onSubmit={e => { e.preventDefault(); setShowClone(false); }} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">URL del Repositorio</label>
                <input type="url" placeholder="https://github.com/usuario/repo.git" value={cloneUrl} onChange={e => setCloneUrl(e.target.value)} required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 transition-all font-mono" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Directorio destino</label>
                <input type="text" placeholder="/home/user/public_html" value={clonePath} onChange={e => setClonePath(e.target.value)} required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 transition-all font-mono" />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="bg-orange-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-orange-500 transition-all flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">download</span>
                Clonar
              </button>
              <button type="button" onClick={() => setShowClone(false)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {repos.map(repo => {
          const info = STATUS_INFO[repo.status];
          return (
            <div key={repo.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-orange-600 text-[20px]">merge_type</span>
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">{repo.name}</p>
                    <p className="text-xs text-slate-400 font-mono">{repo.path}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${info.color} shrink-0`}>
                  <span className="material-symbols-outlined text-[14px]">{info.icon}</span>
                  {info.label}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <div className="bg-slate-50 rounded-xl px-4 py-3">
                  <p className="text-xs text-slate-400 font-medium mb-0.5">Rama activa</p>
                  <p className="text-sm font-bold text-slate-800 font-mono flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px] text-orange-500">call_split</span>
                    {repo.branch}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl px-4 py-3 sm:col-span-2">
                  <p className="text-xs text-slate-400 font-medium mb-0.5">Repositorio remoto</p>
                  <p className="text-xs font-mono text-slate-700 truncate">{repo.remote}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">Último commit: {repo.lastCommit}</p>
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#00A3FF] px-3 py-2 rounded-xl hover:bg-blue-50 transition-colors">
                    <span className="material-symbols-outlined text-[16px]">download</span>
                    Pull
                  </button>
                  <button className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-emerald-600 px-3 py-2 rounded-xl hover:bg-emerald-50 transition-colors">
                    <span className="material-symbols-outlined text-[16px]">upload</span>
                    Push
                  </button>
                  <button className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-violet-600 px-3 py-2 rounded-xl hover:bg-violet-50 transition-colors">
                    <span className="material-symbols-outlined text-[16px]">history</span>
                    Log
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
