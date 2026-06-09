"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchDomains, addDomain, deleteDomain, verifyDomain, getOdinAccessToken } from "../../../lib/api";

interface DomainRecord {
  id: string;
  domain_name: string;
  status: string;
  dns_provider: string;
  ssl_enabled: boolean;
  verification?: {
    publicUrl?: string | null;
    dns?: {
      resolves: boolean;
      aRecords: string[];
      cnameRecords: string[];
      error?: string;
    };
  };
}

export default function DomainsPage() {
  const [newDomain, setNewDomain] = useState("");
  const [search, setSearch] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: domains = [], isLoading } = useQuery<DomainRecord[]>({
    queryKey: ["odin", "domains"],
    queryFn: fetchDomains,
    staleTime: 1000 * 60 * 5
  });

  const addMutation = useMutation({
    mutationFn: addDomain,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["odin", "domains"] });
      setNewDomain("");
      setShowCreateForm(false);
    },
    onError: (err: any) => alert(`Error al añadir dominio: ${err.message}`)
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDomain,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["odin", "domains"] });
    },
    onError: (err: any) => alert(`Error al eliminar dominio: ${err.message}`)
  });

  const verifyMutation = useMutation({
    mutationFn: verifyDomain,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["odin", "domains"] });
      alert("Verificación de dominio completada.");
    },
    onError: (err: any) => alert(`Error al verificar dominio: ${err.message}`)
  });

  const sslMutation = useMutation({
    mutationFn: async (domainId: string) => {
      const res = await fetch(`http://localhost:3001/api/v1/odin-panel/domains/${domainId}/ssl/issue`, {
         method: "POST",
         headers: { Authorization: `Bearer ${getOdinAccessToken()}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "Fallo al emitir SSL");
      return data;
    },
    onSuccess: () => {
      alert("Certificado SSL emitido con éxito.");
      queryClient.invalidateQueries({ queryKey: ["odin", "domains"] });
    },
    onError: (err: any) => alert(`Error SSL: ${err.message}`)
  });

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain) return;
    await addMutation.mutateAsync(newDomain);
  };

  const handleDelete = async (domainId: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar este dominio? Se borrarán sus directorios asociados.")) {
      await deleteMutation.mutateAsync(domainId);
    }
  };

  const handleToggleHttps = (domainId: string, enabled: boolean) => {
    if (!enabled) {
      if (confirm("¿Habilitar Force HTTPS Redirect y emitir certificado SSL Let's Encrypt para este dominio?")) {
        sslMutation.mutate(domainId);
      }
    } else {
      alert("Para desactivar la redirección HTTPS forzada, contacta al soporte o edita las reglas en la sección Multi-PHP.");
    }
  };

  // Helper to determine the Main/Primary domain (shortest root domain)
  const isMainDomain = (domainName: string, allDomains: DomainRecord[]) => {
    const rootDomains = allDomains.filter(
      (d) => !d.domain_name.startsWith("*.") && d.domain_name.split(".").length === 2
    );
    if (rootDomains.length === 0) return false;
    const shortest = [...rootDomains].sort((a, b) => a.domain_name.length - b.domain_name.length)[0];
    return shortest?.domain_name === domainName;
  };

  const filteredDomains = domains.filter((d) =>
    d.domain_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto w-full min-w-0">
      {/* cPanel style header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h1 className="text-3xl font-light text-slate-800">Dominios</h1>
        <p className="text-slate-500 text-xs mt-1">List Domains</p>
        <p className="text-slate-600 text-sm mt-4 leading-relaxed">
          Use esta interfaz para administrar sus dominios. Para obtener más información, lea la{" "}
          <a href="https://docs.cpanel.net/" target="_blank" rel="noreferrer" className="text-[#00A3FF] hover:underline font-semibold">
            documentación
          </a>
          .
        </p>
      </div>

      {/* Toolbar / Search Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center w-full md:w-96 bg-white border border-slate-300 rounded-lg shadow-sm overflow-hidden">
          <input
            type="text"
            placeholder="Buscar"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-3 text-sm text-slate-700 outline-none w-full placeholder:text-slate-400 font-medium"
          />
          <button className="bg-slate-50 border-l border-slate-200 px-4 py-3 text-slate-500 hover:bg-slate-100 transition-colors">
            <span className="material-symbols-outlined text-[18px] leading-none block">search</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto md:justify-end">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider bg-slate-100 px-3 py-1.5 rounded-md">
            Mostrando {filteredDomains.length} - {filteredDomains.length} de {domains.length} dominios
          </span>
          <button
            onClick={() => setShowCreateForm((prev) => !prev)}
            className="bg-[#00A3FF] hover:bg-[#008EE0] text-white text-xs font-black px-6 py-3.5 rounded-xl shadow-md shadow-[#00A3FF]/10 transition-all active:scale-[0.98] uppercase tracking-wider"
          >
            {showCreateForm ? "Cancelar" : "Create A New Domain"}
          </button>
        </div>
      </div>

      {/* Collapsible Add Domain form */}
      {showCreateForm && (
        <div className="bg-slate-50 border border-slate-200 rounded-[2rem] p-8 shadow-inner animate-in slide-in-from-top-4 duration-300">
          <h3 className="text-slate-800 font-black uppercase text-xs tracking-widest mb-4">Vincular Nuevo Dominio</h3>
          <form onSubmit={handleAddDomain} className="flex flex-col md:flex-row items-end gap-4">
            <div className="flex-1 w-full space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre del Dominio</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">language</span>
                <input
                  type="text"
                  placeholder="ejemplo.com"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  disabled={addMutation.isPending}
                  className="w-full bg-white border border-slate-300 rounded-xl pl-12 pr-4 py-3.5 text-slate-900 font-bold outline-none focus:border-[#00A3FF] transition-all placeholder:text-slate-400 text-sm shadow-sm"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={addMutation.isPending || !newDomain}
              className="w-full md:w-auto bg-[#00A3FF] hover:bg-[#008EE0] text-white font-black text-xs uppercase tracking-widest px-8 py-4 rounded-xl transition-all shadow-md shadow-[#00A3FF]/15 disabled:opacity-50"
            >
              {addMutation.isPending ? "Conectando..." : "Vincular Dominio"}
            </button>
          </form>
        </div>
      )}

      {/* Table domains list */}
      <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm max-w-full">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left min-w-[1000px] table-auto">
            <thead>
              <tr className="text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-slate-200 bg-slate-50/50">
                <th className="px-6 py-4 w-10">
                  <input type="checkbox" className="rounded border-slate-300" />
                </th>
                <th className="px-6 py-4">Domain</th>
                <th className="px-6 py-4">Directorio raíz</th>
                <th className="px-6 py-4">Redirects To</th>
                <th className="px-6 py-4">Force HTTPS Redirect</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-[3px] border-[#00A3FF]/20 border-t-[#00A3FF] rounded-full animate-spin"></div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sincronizando dominios...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredDomains.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-20 text-center text-slate-500 font-medium italic text-sm">
                    No se encontraron dominios registrados.
                  </td>
                </tr>
              ) : (
                filteredDomains.map((domain) => {
                  const isPrimary = isMainDomain(domain.domain_name, domains);
                  // Root dir path calculations
                  const isWildcard = domain.domain_name.startsWith("*.");
                  const rootDir = isPrimary
                    ? "/public_html"
                    : isWildcard
                    ? `/_wildcard_${domain.domain_name.substring(2)}`
                    : `/${domain.domain_name}`;

                  return (
                    <tr key={domain.id} className="hover:bg-slate-50/60 transition-all group duration-300">
                      <td className="px-6 py-5">
                        <input type="checkbox" className="rounded border-slate-300" />
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-slate-400 text-lg">language</span>
                          <span className="text-slate-900 font-bold text-sm group-hover:text-[#00A3FF] transition-colors">
                            {domain.domain_name}
                          </span>
                          {isPrimary && (
                            <span className="px-2 py-0.5 bg-[#00A3FF]/10 text-[#00A3FF] text-[9px] font-black uppercase rounded border border-[#00A3FF]/20 tracking-wider">
                              Main Domain
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-[#00A3FF] hover:underline cursor-pointer flex items-center gap-1.5 font-mono text-xs font-semibold">
                          <span className="material-symbols-outlined text-[16px] leading-none">home</span>
                          {rootDir}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-slate-600 text-xs font-medium">
                        Not Redirected
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div
                            onClick={() => handleToggleHttps(domain.id, domain.ssl_enabled)}
                            className={`w-11 h-6 rounded-full p-1 cursor-pointer transition-all duration-300 flex items-center ${
                              domain.ssl_enabled ? "bg-[#00A3FF] justify-end" : "bg-slate-200 justify-start"
                            }`}
                          >
                            <div className="w-4 h-4 bg-white rounded-full shadow-sm"></div>
                          </div>
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            {domain.ssl_enabled ? "On" : "Off"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex justify-end items-center gap-2.5">
                          <button
                            onClick={() => window.location.href = `/domains/${domain.id}`}
                            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-100 hover:border-slate-300 font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5 transition-all"
                          >
                            <span className="material-symbols-outlined text-[15px] text-slate-500">construction</span>
                            Administrar
                          </button>
                          {!isWildcard && (
                            <button
                              onClick={() => window.location.href = `/email/accounts?domain=${domain.domain_name}`}
                              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-100 hover:border-slate-300 font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5 transition-all"
                            >
                              <span className="material-symbols-outlined text-[15px] text-slate-500">mail</span>
                              Create Email
                            </button>
                          )}
                          <button
                            onClick={() => verifyMutation.mutate(domain.id)}
                            disabled={verifyMutation.isPending}
                            className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 hover:text-[#00A3FF] hover:bg-slate-100 hover:border-slate-300 transition-all"
                            title="Sincronizar DNS"
                          >
                            <span className="material-symbols-outlined text-[15px] leading-none block">sync</span>
                          </button>
                          <button
                            onClick={() => handleDelete(domain.id)}
                            disabled={deleteMutation.isPending}
                            className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-all"
                            title="Eliminar Dominio"
                          >
                            <span className="material-symbols-outlined text-[15px] leading-none block">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
