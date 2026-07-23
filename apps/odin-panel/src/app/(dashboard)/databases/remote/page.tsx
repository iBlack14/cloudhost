"use client";

import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createRemoteDatabaseHost,
  deleteRemoteDatabaseHost,
  fetchDatabases,
  fetchRemoteDatabaseAccess,
  updateRemoteDatabaseHost
} from "../../../../lib/api";

const queryKey = ["odin", "databases", "remote"] as const;

export default function DatabasesRemotePage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", host: "" });
  const [error, setError] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey,
    queryFn: fetchRemoteDatabaseAccess,
    staleTime: 30_000
  });
  const { data: databases = [] } = useQuery({
    queryKey: ["odin", "databases"],
    queryFn: fetchDatabases,
    staleTime: 60_000
  });

  const addMutation = useMutation({
    mutationFn: createRemoteDatabaseHost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setForm({ name: "", host: "" });
      setError("");
      setShowForm(false);
    },
    onError: (reason: Error) => setError(reason.message)
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => updateRemoteDatabaseHost(id, enabled),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: (reason: Error) => alert(`No se pudo actualizar el acceso: ${reason.message}`)
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRemoteDatabaseHost,
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: (reason: Error) => alert(`No se pudo eliminar el acceso: ${reason.message}`)
  });

  const handleAdd = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    addMutation.mutate({ name: form.name, host: form.host });
  };

  const hosts = data?.hosts ?? [];
  const connection = data?.connection;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <span className="material-symbols-outlined text-white text-[20px]">lan</span>
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Acceso Remoto a Base de Datos</h1>
            <p className="text-xs text-slate-500 font-medium">Permite conexiones externas a MySQL desde IPs autorizadas</p>
          </div>
        </div>
        <button onClick={() => { setError(""); setShowForm(true); }} className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-cyan-500/20 active:scale-95">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Agregar IP/Rango
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
        <span className="material-symbols-outlined text-amber-500 text-[20px] mt-0.5">security</span>
        <div>
          <p className="text-sm font-bold text-amber-800">Precaución de seguridad</p>
          <p className="text-xs text-amber-600 mt-0.5">Solo agrega IPs públicas de confianza. Las IP privadas (como 192.168.x.x) no identifican tu equipo a través de Internet.</p>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 animate-in slide-in-from-top duration-200">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4">Agregar Host Remoto</h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Descripción (opcional)</label>
                <input type="text" maxLength={120} placeholder="Ej: Oficina, VPN Dev..." value={form.name} onChange={event => setForm({ ...form, name: event.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400 transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">IPv4 o Rango CIDR</label>
                <input type="text" inputMode="decimal" placeholder="203.0.113.10 o 203.0.113.0/24" value={form.host} onChange={event => setForm({ ...form, host: event.target.value })} required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400 transition-all" />
              </div>
            </div>
            {error && <p role="alert" className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>}
            <div className="flex gap-3">
              <button type="submit" disabled={addMutation.isPending || !form.host.trim()} className="bg-cyan-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-cyan-500 transition-all disabled:opacity-50">
                {addMutation.isPending ? "Aplicando permisos..." : "Agregar"}
              </button>
              <button type="button" disabled={addMutation.isPending} onClick={() => setShowForm(false)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">IPs Autorizadas</h2>
          {!isLoading && <span className="text-[10px] font-black text-slate-400 uppercase">{hosts.filter(host => host.enabled).length} activas</span>}
        </div>
        {isLoading ? (
          <div className="py-16 flex items-center justify-center gap-3 text-slate-400"><span className="w-5 h-5 rounded-full border-2 border-slate-200 border-t-cyan-500 animate-spin" /><span className="text-sm font-medium">Cargando accesos...</span></div>
        ) : isError ? (
          <div className="py-16 text-center"><p className="text-red-500 text-sm font-bold">No se pudieron cargar los accesos</p><button onClick={() => refetch()} className="mt-3 text-xs font-bold text-cyan-600">Reintentar</button></div>
        ) : hosts.length === 0 ? (
          <div className="py-16 text-center">
            <span className="material-symbols-outlined text-5xl text-slate-200 block mb-3">lan</span>
            <p className="text-slate-400 text-sm font-medium">No hay IPs autorizadas</p>
            <p className="text-slate-300 text-xs mt-1">Agrega una IP para permitir acceso remoto</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {hosts.map(host => {
              const busy = (toggleMutation.isPending && toggleMutation.variables?.id === host.id) || (deleteMutation.isPending && deleteMutation.variables === host.id);
              return (
                <div key={host.id} className={`flex items-center gap-4 px-6 py-4 transition-colors ${busy ? "opacity-60" : "hover:bg-slate-50"}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${host.enabled ? "bg-cyan-100" : "bg-slate-100"}`}>
                    <span className={`material-symbols-outlined text-[20px] ${host.enabled ? "text-cyan-600" : "text-slate-400"}`}>computer</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    {host.name && <p className="text-sm font-bold text-slate-800">{host.name}</p>}
                    <p className="text-xs font-mono text-[#00A3FF]">{host.host}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button aria-label={host.enabled ? "Desactivar acceso" : "Activar acceso"} aria-pressed={host.enabled} disabled={busy} onClick={() => toggleMutation.mutate({ id: host.id, enabled: !host.enabled })}
                      className={`w-10 h-6 rounded-full transition-all relative ${host.enabled ? "bg-cyan-500" : "bg-slate-200"}`}>
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${host.enabled ? "left-4" : "left-0.5"}`} />
                    </button>
                    <button disabled={busy} onClick={() => { if (confirm(`¿Eliminar el acceso para ${host.host}?`)) deleteMutation.mutate(host.id); }} className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors disabled:pointer-events-none">
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4">Datos de Conexión</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: "Host", value: connection?.host ?? "Cargando..." },
            { label: "Puerto", value: connection?.port ? String(connection.port) : "Cargando..." },
            { label: "Usuarios disponibles", value: databases.length ? databases.map(db => db.user).filter((value, index, all) => all.indexOf(value) === index).join(", ") : "Crea una base de datos primero" },
            { label: "Cliente recomendado", value: "MySQL Workbench / DBeaver" }
          ].map(item => (
            <div key={item.label} className="bg-slate-50 rounded-xl px-4 py-3 min-w-0">
              <p className="text-xs text-slate-400 font-medium mb-0.5">{item.label}</p>
              <p className="text-sm font-bold text-slate-800 font-mono break-words">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
