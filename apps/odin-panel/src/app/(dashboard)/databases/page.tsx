"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchDatabases,
  createDatabase,
  issueDatabaseSsoLink,
  fetchOdinDashboard
} from "../../../lib/api";

// ── Portal helper ─────────────────────────────────────────────────────────────
function Portal({ children }: { children: React.ReactNode }) {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  if (!m) return null;
  return createPortal(children, document.body);
}

// ── Pill badge ────────────────────────────────────────────────────────────────
function Badge({ label, color }: { label: string; color: "blue" | "violet" | "emerald" }) {
  const map = {
    blue: "bg-[#00A3FF]/10 text-[#00A3FF]",
    violet: "bg-violet-100 text-violet-600",
    emerald: "bg-emerald-100 text-emerald-600"
  };
  return (
    <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${map[color]}`}>
      {label}
    </span>
  );
}

// ── Separator ─────────────────────────────────────────────────────────────────
function Section({ title, icon, id, children }: { title: string; icon: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="flex items-center gap-3 px-6 py-4 bg-slate-50 border-b border-slate-200">
        <span className="material-symbols-outlined text-[18px] text-slate-400">{icon}</span>
        <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DatabasesPage() {
  const queryClient = useQueryClient();

  // ── State ──────────────────────────────────────────────────────────────────
  const [dbSuffix, setDbSuffix] = useState("");
  const [dbPass, setDbPass]     = useState("");
  const [showDbPass, setShowDbPass] = useState(false);

  const [userSuffix, setUserSuffix]   = useState("");
  const [userPass, setUserPass]       = useState("");
  const [showUserPass, setShowUserPass] = useState(false);

  const [assignUser, setAssignUser] = useState("");
  const [assignDb, setAssignDb]     = useState("");

  // rename / delete confirm
  const [renameTarget, setRenameTarget] = useState<{ kind: "db" | "user"; name: string } | null>(null);
  const [renameValue, setRenameValue]   = useState("");

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: databases = [], isLoading } = useQuery({
    queryKey: ["odin", "databases"],
    queryFn: fetchDatabases,
    staleTime: 1000 * 60
  });

  const { data: dashboard } = useQuery({
    queryKey: ["odin", "dashboard"],
    queryFn: fetchOdinDashboard,
    staleTime: 1000 * 60 * 5
  });

  const osUsername = dashboard?.account.username ?? "";
  const prefix     = osUsername ? `${osUsername}_` : "";

  // ── Derived lists ──────────────────────────────────────────────────────────
  const dbList   = databases; // all dbs (custom + wp)
  const userList = [...new Map(databases.map(d => [d.user, d])).values()]; // unique users

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createDbMutation = useMutation({
    mutationFn: () => createDatabase(dbSuffix, dbPass),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["odin", "databases"] });
      setDbSuffix("");
      setDbPass("");
    },
    onError: (e: any) => alert("Error: " + e.message)
  });

  const ssoMutation = useMutation({
    mutationFn: (name: string) => issueDatabaseSsoLink(name),
    onSuccess: (data) => window.open(data.url, "_blank", "noopener"),
    onError: (e: any) => alert("Error abriendo phpMyAdmin: " + e.message)
  });

  const fullDbName   = prefix + (dbSuffix || "nombre");
  const fullUserName = prefix + (userSuffix || "usuario");

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 animate-in fade-in duration-700">

      {/* Page header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200 pb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-1 bg-[#00A3FF]/10 text-[#00A3FF] text-[10px] font-black uppercase rounded-full tracking-wider">
              MySQL · MariaDB
            </span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 uppercase">
            Bases de <span className="text-[#00A3FF]">Datos</span>
          </h1>
          <p className="text-slate-400 text-xs font-medium">
            Administra tus bases de datos MySQL y usuarios de acceso
          </p>
        </div>
        {/* Jump links */}
        <div className="flex gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
          <a href="#databases" className="hover:text-[#00A3FF] transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">storage</span>Bases de Datos
          </a>
          <span className="text-slate-200">·</span>
          <a href="#users" className="hover:text-[#00A3FF] transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">person</span>Usuarios
          </a>
        </div>
      </header>

      {/* ───────── DATABASES SECTION ───────── */}
      <Section id="databases" title="Crear Nueva Base de Datos" icon="add_circle">
        {/* Alineación: grid de 3 columnas, filas explícitas para labels e inputs */}
        <div className="grid grid-cols-[1fr_1fr_auto] gap-x-3 gap-y-1 items-end">
          {/* Row 1 — labels */}
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nueva Base de Datos</label>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Contraseña</label>
          <span />{/* empty cell */}

          {/* Row 2 — inputs + button */}
          <div className="flex items-stretch border border-slate-200 rounded-xl overflow-hidden focus-within:border-[#00A3FF] transition-colors">
            <span className="bg-slate-50 text-slate-400 text-xs font-mono font-bold px-3 flex items-center border-r border-slate-200 select-none whitespace-nowrap shrink-0">
              {prefix || "usuario_"}
            </span>
            <input
              className="flex-1 px-3 py-2.5 text-sm font-mono font-bold text-slate-900 outline-none bg-white min-w-0"
              placeholder="mi_tienda"
              value={dbSuffix}
              onChange={e => setDbSuffix(e.target.value.replace(/[^a-z0-9_]/gi, "").toLowerCase())}
              maxLength={24}
            />
          </div>
          <div className="relative">
            <input
              type={showDbPass ? "text" : "password"}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-[#00A3FF] bg-slate-50 focus:bg-white transition-colors pr-10"
              placeholder="••••••••"
              value={dbPass}
              onChange={e => setDbPass(e.target.value)}
            />
            <button type="button" onClick={() => setShowDbPass(!showDbPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600">
              <span className="material-symbols-outlined text-[16px]">{showDbPass ? "visibility_off" : "visibility"}</span>
            </button>
          </div>
          <button
            onClick={() => createDbMutation.mutate()}
            disabled={createDbMutation.isPending || !dbSuffix || !dbPass}
            className="h-[42px] px-6 bg-[#00A3FF] text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-[#008EE0] active:scale-[0.98] transition-all disabled:opacity-40 flex items-center gap-2 shadow-lg shadow-[#00A3FF]/20 shrink-0 whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[16px]">{createDbMutation.isPending ? "hourglass_top" : "add"}</span>
            {createDbMutation.isPending ? "Creando..." : "Crear Base de Datos"}
          </button>

          {/* Row 3 — preview hint (spans col 1 only) */}
          <p className="text-[9px] text-slate-400 font-mono pl-0.5 col-start-1">→ {fullDbName}</p>
        </div>
      </Section>

      {/* ── Current Databases table ── */}
      <Section id="databases-list" title="Bases de Datos Actuales" icon="storage">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 gap-3 text-slate-400">
            <div className="w-5 h-5 border-2 border-slate-200 border-t-[#00A3FF] rounded-full animate-spin" />
            <span className="text-xs font-bold">Cargando...</span>
          </div>
        ) : dbList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
            <span className="material-symbols-outlined text-4xl">database_off</span>
            <p className="text-xs font-bold">Sin bases de datos</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-[9px] font-black text-slate-400 uppercase tracking-widest pb-3 pl-1">Base de Datos</th>
                  <th className="text-left text-[9px] font-black text-slate-400 uppercase tracking-widest pb-3">Tipo</th>
                  <th className="text-left text-[9px] font-black text-slate-400 uppercase tracking-widest pb-3">Usuario Privilegiado</th>
                  <th className="text-right text-[9px] font-black text-slate-400 uppercase tracking-widest pb-3 pr-1">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {dbList.map((db, i) => (
                  <tr key={i} className="hover:bg-slate-50/70 transition-colors group">
                    <td className="py-3 pl-1 font-mono font-bold text-slate-800 text-xs">{db.name}</td>
                    <td className="py-3">
                      <Badge label={db.type} color={db.type === "wordpress" ? "blue" : "emerald"} />
                    </td>
                    <td className="py-3 font-mono text-slate-500 text-[11px] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[13px] text-slate-300">person</span>
                      {db.user}
                    </td>
                    <td className="py-3 pr-1">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => ssoMutation.mutate(db.name)}
                          className="flex items-center gap-1.5 text-[9px] font-black text-[#00A3FF] hover:bg-[#00A3FF]/10 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                          phpMyAdmin
                        </button>
                        <button
                          onClick={() => { setRenameTarget({ kind: "db", name: db.name }); setRenameValue(db.name); }}
                          className="flex items-center gap-1 text-[9px] font-black text-slate-400 hover:text-slate-700 hover:bg-slate-100 px-2 py-1.5 rounded-lg transition-colors"
                        >
                          <span className="material-symbols-outlined text-[13px]">edit</span>
                          Renombrar
                        </button>
                        <button
                          onClick={() => { if (confirm(`¿Eliminar la base de datos "${db.name}"? Esta acción es irreversible.`)) alert("Pendiente de implementación"); }}
                          className="flex items-center gap-1 text-[9px] font-black text-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-1.5 rounded-lg transition-colors"
                        >
                          <span className="material-symbols-outlined text-[13px]">delete</span>
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* ───────── USERS SECTION ───────── */}
      <Section id="users" title="Crear Usuario de Base de Datos" icon="person_add">
        <div className="grid grid-cols-[1fr_1fr_auto] gap-x-3 gap-y-1 items-end">
          {/* Row 1 — labels */}
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nombre de Usuario</label>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Contraseña</label>
          <span />

          {/* Row 2 — inputs + button */}
          <div className="flex items-stretch border border-slate-200 rounded-xl overflow-hidden focus-within:border-[#00A3FF] transition-colors">
            <span className="bg-slate-50 text-slate-400 text-xs font-mono font-bold px-3 flex items-center border-r border-slate-200 select-none whitespace-nowrap shrink-0">
              {prefix || "usuario_"}
            </span>
            <input
              className="flex-1 px-3 py-2.5 text-sm font-mono font-bold text-slate-900 outline-none bg-white min-w-0"
              placeholder="app_user"
              value={userSuffix}
              onChange={e => setUserSuffix(e.target.value.replace(/[^a-z0-9_]/gi, "").toLowerCase())}
              maxLength={20}
            />
          </div>
          <div className="relative">
            <input
              type={showUserPass ? "text" : "password"}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-[#00A3FF] bg-slate-50 focus:bg-white transition-colors pr-10"
              placeholder="••••••••"
              value={userPass}
              onChange={e => setUserPass(e.target.value)}
            />
            <button type="button" onClick={() => setShowUserPass(!showUserPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600">
              <span className="material-symbols-outlined text-[16px]">{showUserPass ? "visibility_off" : "visibility"}</span>
            </button>
          </div>
          <button
            onClick={() => alert("Crear usuario independiente — próximamente")}
            disabled={!userSuffix || !userPass}
            className="h-[42px] px-6 bg-slate-800 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-700 active:scale-[0.98] transition-all disabled:opacity-40 flex items-center gap-2 shrink-0 whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[16px]">person_add</span>
            Crear Usuario
          </button>

          {/* Row 3 — preview */}
          <p className="text-[9px] text-slate-400 font-mono pl-0.5 col-start-1">→ {fullUserName}</p>
        </div>
      </Section>

      {/* ── Assign User → DB ── */}
      <Section title="Asignar Usuario a Base de Datos" icon="link">
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Usuario</label>
            <select
              value={assignUser}
              onChange={e => setAssignUser(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-[#00A3FF] bg-slate-50 focus:bg-white transition-colors cursor-pointer"
            >
              <option value="">— Selecciona usuario —</option>
              {userList.map((u, i) => (
                <option key={i} value={u.user}>{u.user}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Base de Datos</label>
            <select
              value={assignDb}
              onChange={e => setAssignDb(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-[#00A3FF] bg-slate-50 focus:bg-white transition-colors cursor-pointer"
            >
              <option value="">— Selecciona base de datos —</option>
              {dbList.map((d, i) => (
                <option key={i} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => alert("Asignar usuario — próximamente")}
            disabled={!assignUser || !assignDb}
            className="h-[42px] px-6 bg-slate-800 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-700 active:scale-[0.98] transition-all disabled:opacity-40 flex items-center gap-2 shrink-0"
          >
            <span className="material-symbols-outlined text-[16px]">add_link</span>
            Asignar
          </button>
        </div>
      </Section>

      {/* ── Current Users table ── */}
      <Section id="users-list" title="Usuarios Actuales" icon="group">
        {userList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
            <span className="material-symbols-outlined text-3xl">person_off</span>
            <p className="text-xs font-bold">Sin usuarios</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-[9px] font-black text-slate-400 uppercase tracking-widest pb-3 pl-1">Usuario</th>
                  <th className="text-left text-[9px] font-black text-slate-400 uppercase tracking-widest pb-3">Base(s) Asignada(s)</th>
                  <th className="text-right text-[9px] font-black text-slate-400 uppercase tracking-widest pb-3 pr-1">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {userList.map((u, i) => {
                  const dbs = databases.filter(d => d.user === u.user);
                  return (
                    <tr key={i} className="hover:bg-slate-50/70 transition-colors group">
                      <td className="py-3 pl-1 font-mono font-bold text-slate-800">{u.user}</td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {dbs.map((d, j) => (
                            <span key={j} className="text-[9px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg">{d.name}</span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 pr-1">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => alert("Cambiar contraseña — próximamente")}
                            className="flex items-center gap-1 text-[9px] font-black text-[#00A3FF] hover:bg-[#00A3FF]/10 px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            <span className="material-symbols-outlined text-[13px]">lock_reset</span>
                            Cambiar Contraseña
                          </button>
                          <button
                            onClick={() => { setRenameTarget({ kind: "user", name: u.user }); setRenameValue(u.user); }}
                            className="flex items-center gap-1 text-[9px] font-black text-slate-400 hover:text-slate-700 hover:bg-slate-100 px-2 py-1.5 rounded-lg transition-colors"
                          >
                            <span className="material-symbols-outlined text-[13px]">edit</span>
                            Renombrar
                          </button>
                          <button
                            onClick={() => { if (confirm(`¿Eliminar el usuario "${u.user}"?`)) alert("Pendiente de implementación"); }}
                            className="flex items-center gap-1 text-[9px] font-black text-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-1.5 rounded-lg transition-colors"
                          >
                            <span className="material-symbols-outlined text-[13px]">delete</span>
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* ── Rename modal (portal) ── */}
      {renameTarget && (
        <Portal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center pl-72 px-4 animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-md" onClick={() => setRenameTarget(null)} />
            <div className="relative z-10 bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md animate-in zoom-in-95 duration-200 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                    Renombrar {renameTarget.kind === "db" ? "Base de Datos" : "Usuario"}
                  </h3>
                  <p className="text-[9px] text-slate-400 font-bold mt-0.5">Actual: <span className="font-mono">{renameTarget.name}</span></p>
                </div>
                <button onClick={() => setRenameTarget(null)} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900">
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Nuevo Nombre</label>
                <input
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono font-bold text-slate-900 outline-none focus:border-[#00A3FF] bg-slate-50 focus:bg-white transition-colors"
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setRenameTarget(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-black text-slate-500 hover:bg-slate-50 transition-colors">Cancelar</button>
                <button
                  onClick={() => { alert("Renombrar — próximamente"); setRenameTarget(null); }}
                  disabled={!renameValue || renameValue === renameTarget.name}
                  className="flex-1 py-2.5 rounded-xl bg-[#00A3FF] text-white text-xs font-black uppercase tracking-widest hover:bg-[#008EE0] transition-colors disabled:opacity-40"
                >
                  Renombrar
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
