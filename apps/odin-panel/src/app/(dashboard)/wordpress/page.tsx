"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";

import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWpSites, installWordPress, fetchDomains, deleteWordPress, fetchWpSsoUrl, fetchOdinDashboard, fetchWpVersions, updateWpSite } from "../../../lib/api";

export default function WordPressManagerPage() {
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [installStep, setInstallStep] = useState(0);
  const queryClient = useQueryClient();

  const { data: sites = [], isLoading: sitesLoading } = useQuery({
    queryKey: ["odin", "wordpress", "sites"],
    queryFn: fetchWpSites,
    staleTime: 1000 * 60 * 5
  });

  const { data: domains = [], isLoading: domainsLoading } = useQuery({
    queryKey: ["odin", "domains"],
    queryFn: fetchDomains,
    staleTime: 1000 * 60 * 5
  });

  const { data: dashboard } = useQuery({
    queryKey: ["odin", "dashboard"],
    queryFn: fetchOdinDashboard,
    staleTime: 1000 * 60 * 5
  });

  // System username (e.g. "blxkstudio") — used as DB/user prefix (cPanel convention)
  const osUsername = dashboard?.account.username ?? "";

  const installMutation = useMutation({
    mutationFn: installWordPress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["odin", "wordpress", "sites"] });
      setIsWizardOpen(false);
      setInstallStep(0);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWordPress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["odin", "wordpress", "sites"] });
    },
    onError: (error: any) => alert("Error eliminando el sitio: " + error.message)
  });

  const ssoMutation = useMutation({
    mutationFn: fetchWpSsoUrl,
    onSuccess: (url) => window.open(url, '_blank'),
    onError: (error: any) => alert("Error al generar acceso directo: " + error.message)
  });

  const { data: wpVersions = [] } = useQuery({
    queryKey: ["odin", "wordpress", "versions"],
    queryFn: fetchWpVersions,
    staleTime: 1000 * 60 * 60 // cache 1h
  });

  const updateMutation = useMutation({
    mutationFn: updateWpSite,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["odin", "wordpress", "sites"] });
      alert(`✅ WordPress actualizado a v${data.newVersion}\nBackup guardado en: ${data.backupPath}`);
    },
    onError: (error: any) => alert("Error al actualizar: " + error.message)
  });

  // Latest stable version — first item from WordPress.org API
  const latestVersion = wpVersions[0]?.version ?? null;

  // Genera un sufijo de 4 chars alfanuméricos
  const genSuffix = () => Math.random().toString(36).slice(2, 6);

  const [formData, setFormData] = useState({
    protocol: "https://",
    domain: "",
    directory: "",
    wpVersion: "",  // auto-filled from API once loaded
    phpVersion: "8.4",
    adminUser: "admin",
    adminPass: "",
    adminEmail: "admin@domain.com",
    siteTitle: "",
    siteDescription: "",
    dbSuffix: genSuffix(),   // editable suffix for DB name
    tablePrefix: "wp_"       // editable table prefix
  });

  // The first domain registered to the account is treated as primary.
  // Matches the backend logic: primary domain → public_html/, addon → ~/domain.com/
  const primaryDomain = domains[0]?.domain_name ?? "";

  const getDirectoryPreview = (domain: string, subdir: string) => {
    if (!domain) return "";
    const isPrimary = domain === primaryDomain;
    const base = isPrimary ? "~/public_html" : `~/${domain}`;
    return subdir ? `${base}/${subdir}/` : `${base}/`;
  };

  const dirPreview = getDirectoryPreview(formData.domain, formData.directory);

  // DB name = [username]_[suffix]  (cPanel convention, e.g. blxkstudio_ab3f)
  // DB user = [username]_[suffix]  (same prefix, same suffix for traceability)
  const sanitizePart = (s: string) => s.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  const dbPrefix     = osUsername ? `${sanitizePart(osUsername)}_` : "wp_";
  const dbUserPrefix = osUsername ? `${sanitizePart(osUsername)}_` : "u_";
  const fullDbName   = `${dbPrefix}${formData.dbSuffix}`;
  const fullDbUser   = `${dbUserPrefix}${formData.dbSuffix}`;

  const [showPassword, setShowPassword] = useState(false);

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let pass = "";
    for (let i = 0; i < 16; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
    setFormData(prev => ({ ...prev, adminPass: pass }));
    setShowPassword(true);
  };

  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length > 8) score += 20;
    if (pass.length > 12) score += 20;
    if (/[A-Z]/.test(pass)) score += 20;
    if (/[0-9]/.test(pass)) score += 20;
    if (/[^A-Za-z0-9]/.test(pass)) score += 20;
    return score;
  };

  const passStrength = getPasswordStrength(formData.adminPass);
  const strengthColor = passStrength < 40 ? "bg-red-500" : passStrength < 80 ? "bg-yellow-500" : "bg-emerald-500";

  const installLogs = [
    "PROVISIONANDO CONTENEDOR AISLADO...",
    "EXTRAYENDO NÚCLEO DE WORDPRESS v6.4.3...",
    "CONFIGURANDO CLUSTER DE BASE DE DATOS...",
    "GENERANDO SALES DE SEGURIDAD...",
    "OPTIMIZANDO ENTORNO DE EJECUCIÓN...",
  ];

  const handleInstall = async () => {
    setInstallStep(0);
    const logInterval = setInterval(() => {
      setInstallStep(prev => {
        if (prev < installLogs.length - 1) return prev + 1;
        clearInterval(logInterval);
        return prev;
      });
    }, 1200);
    
    try {
      await installMutation.mutateAsync({
        ...formData,
        // Send the resolved DB name/user/prefix so backend can use them
        dbName: fullDbName,
        dbUser: fullDbUser,
        tablePrefix: formData.tablePrefix
      } as any);
    } catch (err) {
      clearInterval(logInterval);
      alert("Error: " + (err instanceof Error ? err.message : "Falla en el despliegue"));
    }
  };

  const isLoading = sitesLoading || domainsLoading;
  const isInstalling = installMutation.isPending;

  if (isWizardOpen) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <header className="flex justify-between items-center border-b border-slate-200 pb-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => !isInstalling && setIsWizardOpen(false)}
              disabled={isInstalling}
              className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 transition-all hover:shadow-sm disabled:opacity-40"
              title="Volver"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                 <span className="px-2 py-0.5 bg-[#00A3FF]/10 text-[#00A3FF] text-[9px] font-bold uppercase rounded-full tracking-wider">
                    Instalar WordPress
                 </span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 uppercase">
                Nueva <span className="text-[#00A3FF]">Instancia</span>
              </h1>
            </div>
          </div>
        </header>

        <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm max-w-4xl mx-auto">
          {isInstalling ? (
            <div className="py-12 flex flex-col items-center px-8 text-center animate-in fade-in duration-500">
              <div className="w-20 h-20 relative mb-8 flex items-center justify-center bg-[#00A3FF]/5 rounded-full border border-[#00A3FF]/10 shadow-lg shadow-[#00A3FF]/5">
                {/* Ring spinner */}
                <div className="absolute inset-0 border-[3px] border-[#00A3FF]/10 rounded-full" />
                <div className="absolute inset-0 border-[3px] border-[#00A3FF] rounded-full border-t-transparent animate-spin" />
                <span className="material-symbols-outlined text-[#00A3FF] text-3xl animate-pulse">cloud_download</span>
              </div>

              {/* Progress bar */}
              <div className="w-full max-w-sm mb-6 space-y-2">
                <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-400">
                  <span>Progreso del despliegue</span>
                  <span className="text-[#00A3FF] font-black">{Math.round((installStep / (installLogs.length - 1)) * 100)}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#00A3FF] to-[#00C2FF] rounded-full transition-all duration-500" style={{ width: `${(installStep / (installLogs.length - 1)) * 100}%` }} />
                </div>
              </div>

              {/* Steps Card */}
              <div className="w-full max-w-sm bg-gradient-to-b from-slate-50 to-white border border-slate-100 rounded-2xl p-6 space-y-4 shadow-sm text-left">
                {installLogs.map((log, i) => {
                  const isDone = i < installStep;
                  const isActive = i === installStep;
                  return (
                    <div key={i} className={`flex items-center gap-3 transition-all duration-300 ${isDone || isActive ? 'opacity-100' : 'opacity-25'}`}>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                        isDone ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 
                        isActive ? 'bg-[#00A3FF]/10 border-[#00A3FF]/20 text-[#00A3FF]' : 
                        'bg-slate-50 border-slate-200 text-slate-400'
                      }`}>
                        {isDone ? (
                          <span className="material-symbols-outlined text-[10px] font-bold">check</span>
                        ) : isActive ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#00A3FF] animate-pulse" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        )}
                      </div>
                      <span className={`text-[10px] font-bold tracking-tight transition-colors ${
                        isDone ? 'text-slate-400 line-through decoration-slate-200' : 
                        isActive ? 'text-slate-800 font-black' : 
                        'text-slate-400'
                      }`}>
                        {log}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Row 1: Domain (with inline dir) + WP + PHP */}
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12 md:col-span-5 space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Dominio de destino</label>
                  <select
                    value={formData.domain}
                    onChange={(e) => setFormData(prev => ({ ...prev, domain: e.target.value, adminEmail: `admin@${e.target.value}` }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-bold outline-none focus:border-[#00A3FF] transition-all cursor-pointer"
                  >
                    <option value="">— Selecciona un dominio —</option>
                    {domains.map(d => (
                      <option key={d.id} value={d.domain_name}>{d.domain_name}</option>
                    ))}
                  </select>
                  {/* inline dir preview */}
                  {formData.domain && (
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl p-2.5 mt-2">
                      <span className="material-symbols-outlined text-[14px] text-slate-400">folder_open</span>
                      <span className="text-[10px] font-mono font-bold text-slate-500 truncate flex-1">{dirPreview}</span>
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${formData.domain === primaryDomain ? "bg-[#00A3FF]/10 text-[#00A3FF]" : "bg-violet-100 text-violet-600"}`}>
                        {formData.domain === primaryDomain ? "Principal" : "Addon"}
                      </span>
                      <input className="w-20 bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-mono text-slate-600 font-bold outline-none focus:border-[#00A3FF]" placeholder="sub/" value={formData.directory} onChange={(e) => setFormData(prev => ({ ...prev, directory: e.target.value }))} />
                    </div>
                  )}
                </div>
                <div className="col-span-12 md:col-span-4 space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Versión de WordPress</label>
                  <select
                    value={formData.wpVersion || (wpVersions[0]?.version ?? "")}
                    onChange={(e) => setFormData(prev => ({ ...prev, wpVersion: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-[#00A3FF] transition-all"
                  >
                    {wpVersions.length === 0 ? (
                      <option value="latest">WP Latest ✔ Stable</option>
                    ) : (
                      wpVersions.slice(0, 8).map(v => (
                        <option key={v.version} value={v.version}>{v.label}{v.isCurrent ? "" : v.isLegacy ? " (Legacy)" : ""}</option>
                      ))
                    )}
                  </select>
                </div>
                <div className="col-span-12 md:col-span-3 space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Versión de PHP</label>
                  <select value={formData.phpVersion} onChange={(e) => setFormData(prev => ({ ...prev, phpVersion: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-[#00A3FF] transition-all">
                    <option value="8.4">8.4 🔥</option>
                    <option value="8.3">8.3</option>
                    <option value="8.2">8.2</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Site title + Admin + Email + Password */}
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12 md:col-span-4 space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Título del Sitio</label>
                  <input placeholder="Mi Blog de WordPress" value={formData.siteTitle} onChange={(e) => setFormData(prev => ({ ...prev, siteTitle: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-bold outline-none focus:border-[#00A3FF] focus:bg-white transition-all" />
                </div>
                <div className="col-span-12 md:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Usuario Admin</label>
                  <input placeholder="admin" value={formData.adminUser} onChange={(e) => setFormData(prev => ({ ...prev, adminUser: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-bold outline-none focus:border-[#00A3FF] focus:bg-white transition-all" />
                </div>
                <div className="col-span-12 md:col-span-3 space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Email Admin</label>
                  <input placeholder="admin@dominio.com" value={formData.adminEmail} onChange={(e) => setFormData(prev => ({ ...prev, adminEmail: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-bold outline-none focus:border-[#00A3FF] focus:bg-white transition-all" />
                </div>
                <div className="col-span-12 md:col-span-3 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contraseña</label>
                    <button type="button" onClick={generatePassword} className="text-[9px] font-black text-[#00A3FF] flex items-center gap-0.5 hover:underline">
                      <span className="material-symbols-outlined text-[12px]">cycle</span>Gen
                    </button>
                  </div>
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} placeholder="••••••••" value={formData.adminPass} onChange={(e) => setFormData(prev => ({ ...prev, adminPass: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-bold outline-none focus:border-[#00A3FF] focus:bg-white transition-all pr-10" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <span className="material-symbols-outlined text-[16px]">{showPassword ? "visibility_off" : "visibility"}</span>
                    </button>
                  </div>
                  <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden mt-1">
                    <div className={`h-full transition-all duration-500 ${strengthColor}`} style={{ width: `${passStrength}%` }} />
                  </div>
                </div>
              </div>

              {/* Row 3: DB Config */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200">
                  <span className="material-symbols-outlined text-[15px] text-slate-400">database</span>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Base de Datos</span>
                  <button type="button" onClick={() => setFormData(prev => ({ ...prev, dbSuffix: genSuffix() }))} className="ml-auto text-[9px] font-black text-slate-400 hover:text-[#00A3FF] flex items-center gap-0.5 transition-colors">
                    <span className="material-symbols-outlined text-[13px]">cycle</span>Regenerar
                  </button>
                </div>
                <div className="px-4 py-4 grid grid-cols-12 gap-4 bg-white">
                  {/* DB Name */}
                  <div className="col-span-12 md:col-span-5 space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Nombre BD</label>
                    <div className="flex items-stretch border border-slate-200 rounded-xl overflow-hidden focus-within:border-[#00A3FF] transition-colors">
                      <span className="bg-slate-50 text-slate-400 text-[10px] font-mono font-bold px-3 flex items-center border-r border-slate-200 select-none whitespace-nowrap shrink-0">{dbPrefix}</span>
                      <input className="flex-1 px-3 py-2 text-xs font-mono font-bold text-slate-900 outline-none bg-white min-w-0" value={formData.dbSuffix} onChange={(e) => setFormData(prev => ({ ...prev, dbSuffix: e.target.value.replace(/[^a-z0-9]/gi, "").toLowerCase() }))} maxLength={8} spellCheck={false} />
                    </div>
                    <p className="text-[9px] text-slate-400 font-mono pl-0.5 mt-1">{fullDbName}</p>
                  </div>
                  {/* DB User */}
                  <div className="col-span-12 md:col-span-4 space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Usuario DB</label>
                    <div className="flex items-stretch border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                      <span className="text-slate-400 text-[10px] font-mono font-bold px-3 flex items-center border-r border-slate-200 select-none whitespace-nowrap shrink-0">{dbUserPrefix}</span>
                      <span className="flex-1 px-3 py-2 text-xs font-mono font-bold text-slate-500 select-none">{formData.dbSuffix}</span>
                    </div>
                    <p className="text-[9px] text-slate-400 font-mono pl-0.5 mt-1">{fullDbUser}</p>
                  </div>
                  {/* Table Prefix */}
                  <div className="col-span-12 md:col-span-3 space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Prefijo</label>
                    <input className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 outline-none focus:border-[#00A3FF] transition-colors bg-slate-50 focus:bg-white" value={formData.tablePrefix} onChange={(e) => setFormData(prev => ({ ...prev, tablePrefix: e.target.value }))} placeholder="wp_" maxLength={16} spellCheck={false} />
                    <p className="text-[9px] text-slate-400 pl-0.5 mt-1">Host: 127.0.0.1</p>
                  </div>
                </div>
              </div>

              {/* Submit Row */}
              <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
                <p className="text-[10px] font-bold">
                  {formData.domain && formData.siteTitle && formData.adminPass
                    ? <span className="text-emerald-500 font-black flex items-center gap-1.5"><span className="material-symbols-outlined text-[14px]">check_circle</span>Listo para desplegar</span>
                    : <span className="text-slate-400">Completa los campos requeridos</span>}
                </p>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setIsWizardOpen(false)} className="px-6 py-3 bg-white border border-slate-200 rounded-xl text-slate-500 font-black uppercase text-[10px] tracking-widest hover:border-slate-300 transition-all shadow-sm">
                    Cancelar
                  </button>
                  <button onClick={handleInstall} disabled={!formData.domain || !formData.adminPass || !formData.siteTitle} className="bg-[#00A3FF] px-8 py-3.5 rounded-xl text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-[#00A3FF]/20 hover:bg-[#008EE0] active:scale-[0.98] transition-all disabled:opacity-40 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">rocket_launch</span>
                    Iniciar Despliegue
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-200 pb-10">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3 mb-1">
             <span className="px-2.5 py-1 bg-[#00A3FF]/10 text-[#00A3FF] text-[10px] font-bold uppercase rounded-full tracking-wider">
                Ecosistema CMS
             </span>
          </div>
          <h1 className="text-5xl font-black text-slate-900 uppercase">
            WordPress <span className="text-[#00A3FF]">Manager</span>
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-2">
            Orquestación centralizada de instancias, temas, plugins y seguridad.
          </p>
        </div>
        
        <div className="flex gap-4">
          <button 
            onClick={() => queryClient.invalidateQueries({ queryKey: ["odin", "wordpress", "sites"] })}
            className="px-6 py-4 bg-white border border-slate-200 rounded-2xl text-slate-400 font-black text-[10px] uppercase tracking-widest hover:border-[#00A3FF]/30 hover:text-[#00A3FF] transition-all shadow-sm"
          >
             Sincronizar
          </button>
          <button 
            onClick={() => setIsWizardOpen(true)}
            className="bg-[#00A3FF] px-10 py-5 rounded-2xl text-white font-black uppercase text-[11px] tracking-widest shadow-xl shadow-[#00A3FF]/20 hover:bg-[#008EE0] active:scale-[0.98] transition-all"
          >
            + Instalar WordPress
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-8">
        {isLoading ? (
          <div className="p-24 flex flex-col items-center justify-center bg-white border border-slate-200 rounded-[3rem] shadow-sm animate-pulse">
             <div className="w-12 h-12 border-4 border-slate-100 border-t-[#00A3FF] rounded-full animate-spin mb-4"></div>
             <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Consultando Infraestructura...</p>
          </div>
        ) : sites.length === 0 ? (
          <div className="p-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center justify-center text-center group hover:border-[#00A3FF]/20 transition-all cursor-pointer" onClick={() => setIsWizardOpen(true)}>
             <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-slate-200 mb-6 shadow-sm">
                <span className="material-symbols-outlined text-5xl">deployed_code</span>
             </div>
             <h4 className="text-lg font-black text-slate-900 uppercase">Sin Despliegues Activos</h4>
             <p className="text-sm text-slate-500 mt-2 font-medium">Inicia tu primera instancia de WordPress para comenzar a gestionar tu sitio.</p>
          </div>
        ) : (
          sites.map((site) => (
            <div key={site.id} className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm group hover:border-[#00A3FF]/30 transition-all duration-500">
              <div className="flex flex-col xl:flex-row items-center gap-10">
                
                <div className="flex items-center gap-6 min-w-[320px] w-full xl:w-1/4">
                  <div className="w-20 h-20 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-[#00A3FF] group-hover:text-white transition-all shadow-sm shrink-0">
                     <span className="material-symbols-outlined text-4xl">language</span>
                  </div>
                  <div>
                     <h3 className="text-2xl font-black text-slate-900 group-hover:text-[#00A3FF] transition-colors">{site.site_title}</h3>
                     <p className="text-[#00A3FF] font-bold text-xs mt-1 uppercase tracking-tight">{site.domain}</p>
                     <div className="flex items-center gap-2.5 mt-3">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">En Línea</span>
                     </div>
                  </div>
                </div>

                 <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-6 w-full border-y xl:border-y-0 xl:border-x border-slate-100 py-6 xl:py-0 px-8">
                   <div className="space-y-1.5">
                     <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest block">Versión Core</span>
                     <div className="flex items-center gap-2">
                       <span className="text-sm font-bold tracking-tight text-slate-700">v{site.wp_version}</span>
                       {latestVersion && site.wp_version !== latestVersion && (
                         <button 
                           onClick={() => { if (confirm(`¿Actualizar ${site.domain} a v${latestVersion}?`)) updateMutation.mutate(site.id); }}
                           className="inline-flex items-center gap-1 text-[8px] font-black bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse hover:bg-amber-500 hover:text-white transition-colors"
                         >
                           <span className="material-symbols-outlined text-[10px]">update</span>
                           v{latestVersion}
                         </button>
                       )}
                     </div>
                   </div>
                   <TechStat label="Motor PHP" value={site.php_version} icon="settings_suggest" />
                   <TechStat label="Base de Datos" value={site.db_name} icon="database" />
                   <TechStat
                     label="Actualizaciones"
                     value={site.auto_updates ? "Automáticas" : "Manuales"}
                     active={site.auto_updates}
                   />
                 </div>

                <div className="flex gap-3 w-full xl:w-auto">
                   <button 
                     onClick={() => { if (confirm(`¿Eliminar permanentemente ${site.domain}?`)) deleteMutation.mutate(site.id); }}
                     className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shadow-sm"
                     title="Eliminar sitio"
                   >
                      <span className="material-symbols-outlined text-[20px]">delete_forever</span>
                   </button>
                   <Link 
                     href={`/wordpress/${site.id}`}
                     className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 hover:text-[#00A3FF] hover:bg-[#00A3FF]/5 transition-all flex items-center justify-center shadow-sm"
                   >
                      <span className="material-symbols-outlined text-[20px]">settings</span>
                   </Link>
                   <button 
                     onClick={() => ssoMutation.mutate(site.id)}
                     disabled={ssoMutation.isPending}
                     className="flex-1 xl:flex-none flex items-center justify-center gap-3 px-8 py-3.5 rounded-2xl bg-[#00A3FF] text-white font-black text-[11px] uppercase tracking-widest hover:bg-[#008EE0] active:scale-[0.98] transition-all disabled:opacity-40 shadow-xl shadow-[#00A3FF]/20"
                   >
                      <span>{ssoMutation.isPending ? "Accediendo..." : "Panel WP"}</span>
                      <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
                   </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
function TechStat({ label, value, icon, active }: { label: string; value: string; icon?: string; active?: boolean }) {
  return (
    <div className="space-y-1.5">
      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest block">{label}</span>
      <div className="flex items-center gap-2">
         {icon && <span className="material-symbols-outlined text-[16px] text-slate-400">{icon}</span>}
         <span className={`text-sm font-bold tracking-tight ${active === true ? 'text-emerald-600' : active === false ? 'text-slate-400' : 'text-slate-700'}`}>
           {value}
         </span>
      </div>
    </div>
  );
}

// Renders outside the <main> DOM tree so fixed positioning and stacking contexts
// from the layout (overflow-hidden, transforms, etc.) don’t clip the overlay.
function ModalPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}
