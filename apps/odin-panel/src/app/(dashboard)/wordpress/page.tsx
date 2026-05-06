"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWpSites, installWordPress, fetchDomains, deleteWordPress, fetchWpSsoUrl } from "../../../lib/api";

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

  const [formData, setFormData] = useState({
    protocol: "https://",
    domain: "",
    directory: "",
    wpVersion: "6.4.3",
    phpVersion: "8.4",
    adminUser: "admin",
    adminPass: "",
    adminEmail: "admin@domain.com",
    siteTitle: "",
    siteDescription: ""
  });
  
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
      await installMutation.mutateAsync(formData);
    } catch (err) {
      clearInterval(logInterval);
      alert("Error: " + (err instanceof Error ? err.message : "Falla en el despliegue"));
    }
  };

  const isLoading = sitesLoading || domainsLoading;
  const isInstalling = installMutation.isPending;

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
                   <TechStat label="Versión Core" value={`v${site.wp_version}`} />
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

      {isWizardOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => !isInstalling && setIsWizardOpen(false)}></div>
           
           <div className="bg-white w-full max-w-2xl relative z-10 rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-10 border-b border-slate-100 bg-slate-50/50">
                 <div className="flex justify-between items-center">
                    <div>
                       <h2 className="text-2xl font-black text-slate-900 uppercase">Asistente de Instalación</h2>
                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Despliegue en Nodos de Alto Rendimiento</p>
                    </div>
                    {!isInstalling && (
                      <button onClick={() => setIsWizardOpen(false)} className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all shadow-sm">
                         <span className="material-symbols-outlined">close</span>
                      </button>
                    )}
                 </div>
              </div>

              <div className="p-10 space-y-8">
                 {isInstalling ? (
                   <div className="py-12 flex flex-col items-center">
                      <div className="w-24 h-24 relative mb-12">
                         <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                         <div className="absolute inset-0 border-4 border-[#00A3FF] rounded-full border-t-transparent animate-spin"></div>
                         <div className="absolute inset-0 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[#00A3FF] text-4xl animate-pulse">cloud_download</span>
                         </div>
                      </div>
                      <div className="w-full max-w-sm bg-slate-900 rounded-2xl p-8 space-y-3 shadow-2xl">
                         {installLogs.map((log, i) => (
                           <div key={i} className={`text-[10px] font-bold flex items-center gap-3 transition-opacity duration-300 ${i <= installStep ? 'opacity-100' : 'opacity-20'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${i === installStep ? 'bg-[#00A3FF] animate-pulse' : i < installStep ? 'bg-emerald-500' : 'bg-slate-700'}`}></span>
                              <span className={i === installStep ? 'text-[#00A3FF]' : i < installStep ? 'text-slate-400' : 'text-slate-600'}>{log}</span>
                           </div>
                         ))}
                      </div>
                   </div>
                 ) : (
                   <div className="space-y-10">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-4">
                          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2 block">Dominio de Destino</label>
                          <div className="flex gap-2">
                             <select 
                               value={formData.domain}
                               onChange={(e) => setFormData(prev => ({ ...prev, domain: e.target.value, adminEmail: `admin@${e.target.value}` }))}
                               className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 font-bold outline-none focus:border-[#00A3FF] focus:bg-white transition-all shadow-inner cursor-pointer"
                             >
                               <option value="">Selecciona Dominio</option>
                               {domains.map(d => (
                                 <option key={d.id} value={d.domain_name}>{d.domain_name}</option>
                               ))}
                             </select>
                          </div>
                          <div className="flex gap-2 items-center px-2">
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Directorio:</span>
                            <input 
                               className="flex-1 bg-white border-b border-slate-200 px-2 py-1 text-sm text-slate-900 font-bold outline-none focus:border-[#00A3FF] transition-all"
                               placeholder="Vacío para raíz (root)"
                               value={formData.directory}
                               onChange={(e) => setFormData(prev => ({ ...prev, directory: e.target.value }))}
                             />
                          </div>
                        </div>

                        <div className="space-y-6">
                           <div className="space-y-3">
                              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2 block">Versión de Motor</label>
                              <div className="grid grid-cols-2 gap-2">
                                 <select 
                                   value={formData.wpVersion}
                                   onChange={(e) => setFormData(prev => ({ ...prev, wpVersion: e.target.value }))}
                                   className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-600 outline-none focus:border-[#00A3FF]"
                                 >
                                   <option value="6.4.3">WP 6.4.3</option>
                                   <option value="6.3.2">WP 6.3.2</option>
                                 </select>
                                 <select 
                                   value={formData.phpVersion}
                                   onChange={(e) => setFormData(prev => ({ ...prev, phpVersion: e.target.value }))}
                                   className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-600 outline-none focus:border-[#00A3FF]"
                                 >
                                   <option value="8.4">PHP 8.4 🔥</option>
                                   <option value="8.3">PHP 8.3</option>
                                   <option value="8.2">PHP 8.2</option>
                                 </select>
                              </div>
                           </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-6 border-t border-slate-100">
                        <div className="space-y-6">
                           <WizardField 
                             label="Título del Sitio" 
                             placeholder="Mi Blog de Odisea" 
                             value={formData.siteTitle}
                             onChange={(v) => setFormData(prev => ({ ...prev, siteTitle: v }))}
                           />
                           <WizardField 
                             label="Usuario Administrador" 
                             placeholder="admin" 
                             value={formData.adminUser}
                             onChange={(v) => setFormData(prev => ({ ...prev, adminUser: v }))}
                           />
                        </div>

                        <div className="space-y-6">
                           <div className="space-y-3">
                              <div className="flex justify-between items-center ml-2">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Contraseña Admin</label>
                                <button type="button" onClick={generatePassword} className="text-[10px] font-black text-[#00A3FF] hover:underline flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[14px]">cycle</span> Generar
                                </button>
                              </div>
                              <div className="relative">
                                <input 
                                  type={showPassword ? "text" : "password"} 
                                  placeholder="••••••••••••"
                                  value={formData.adminPass}
                                  onChange={(e) => setFormData(prev => ({ ...prev, adminPass: e.target.value }))}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm text-slate-900 font-bold outline-none focus:border-[#00A3FF] focus:bg-white shadow-inner"
                                />
                                <button 
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-900 transition-colors"
                                >
                                  <span className="material-symbols-outlined text-[18px]">
                                    {showPassword ? "visibility_off" : "visibility"}
                                  </span>
                                </button>
                              </div>
                              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mt-2">
                                 <div className={`h-full transition-all duration-500 ${strengthColor}`} style={{ width: `${passStrength}%` }}></div>
                              </div>
                           </div>
                           
                           <WizardField 
                               label="Correo de Contacto" 
                               placeholder="admin@dominio.com" 
                               value={formData.adminEmail}
                               onChange={(v) => setFormData(prev => ({ ...prev, adminEmail: v }))}
                           />
                        </div>
                      </div>
                      
                      <div className="pt-6 flex justify-end">
                         <button 
                           onClick={handleInstall}
                           disabled={!formData.domain || !formData.adminPass || !formData.siteTitle}
                           className="bg-[#00A3FF] px-12 py-5 rounded-2xl text-white font-black uppercase text-[11px] tracking-widest shadow-xl shadow-[#00A3FF]/20 hover:bg-[#008EE0] active:scale-[0.98] transition-all disabled:opacity-40"
                         >
                           Iniciar Despliegue
                         </button>
                      </div>
                   </div>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

function WizardField({ label, placeholder, type = "text", value, onChange }: { label: string; placeholder: string; type?: string, value: string, onChange: (v: string) => void }) {
  return (
    <div className="space-y-3">
       <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">{label}</label>
       <input 
         type={type} 
         placeholder={placeholder}
         value={value}
         onChange={(e) => onChange(e.target.value)}
         className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm text-slate-900 font-bold outline-none focus:border-[#00A3FF] focus:bg-white transition-all shadow-inner"
       />
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
