"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWpSites, installWordPress, fetchDomains } from "../../../lib/api";

export default function WordPressManagerPage() {
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [installStep, setInstallStep] = useState(0);
  const queryClient = useQueryClient();

  // FIX #5: Use React Query instead of manual useState + useEffect
  const { data: sites = [], isLoading: sitesLoading, error: sitesError } = useQuery({
    queryKey: ["odin", "wordpress", "sites"],
    queryFn: fetchWpSites,
    staleTime: 1000 * 60 * 5 // 5 minutes
  });

  const { data: domains = [], isLoading: domainsLoading } = useQuery({
    queryKey: ["odin", "domains"],
    queryFn: fetchDomains,
    staleTime: 1000 * 60 * 5 // 5 minutes
  });

  // FIX #7: useMutation handles installation with proper cleanup
  const installMutation = useMutation({
    mutationFn: installWordPress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["odin", "wordpress", "sites"] });
      setIsWizardOpen(false);
      setInstallStep(0);
    }
  });

  // Form State
  const [formData, setFormData] = useState({
    domain: "",
    directory: "",
    adminUser: "admin",
    adminPass: "",
    siteTitle: ""
  });

  const installLogs = [
    "PROVISIONING ISOLATED CONTAINER...",
    "EXTRACTING WORDPRESS CORE v6.4.3...",
    "CONFIGURING MYSQL DATABASE CLUSTER...",
    "GENERATING SECURITY SALTS...",
    "FINALIZING ENVIRONMENT OPTIMIZATION...",
  ];

  const installIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    return () => {
      if (installIntervalRef.current) clearInterval(installIntervalRef.current);
    };
  }, []);

  const handleInstall = async () => {
    setInstallStep(0);
    
    if (installIntervalRef.current) clearInterval(installIntervalRef.current);

    // Simulate log progression
    installIntervalRef.current = setInterval(() => {
      setInstallStep(prev => {
        if (prev < installLogs.length - 1) return prev + 1;
        if (installIntervalRef.current) clearInterval(installIntervalRef.current);
        return prev;
      });
    }, 1500);
    
    try {
      await installMutation.mutateAsync(formData);
      setTimeout(() => {
        setFormData({ domain: "", directory: "", adminUser: "admin", adminPass: "", siteTitle: "" });
      }, 2000);
    } catch (err) {
      if (installIntervalRef.current) clearInterval(installIntervalRef.current);
      alert("Error: " + (err instanceof Error ? err.message : "Falla técnica en el despliegue"));
    }
  };

  const isLoading = sitesLoading || domainsLoading;
  const isInstalling = installMutation.isPending;

  return (
    <div className="space-y-12">
      <header className="flex justify-between items-end">
        <div className="space-y-1">
          <div className="flex items-center gap-3 mb-1">
             <span className="px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-black uppercase rounded border border-primary/20 tracking-widest">
                CMS Ecosystem
             </span>
          </div>
          <h1 className="text-6xl font-headline font-black text-white tracking-tighter uppercase italic">
            WordPress <span className="text-zinc-600">Manager</span>
          </h1>
          <p className="text-zinc-500 text-sm font-mono tracking-widest mt-1">
            Centralized orchestration for WordPress core, plugins, and security.
          </p>
        </div>
        
        <div className="flex gap-4">
          <button 
            onClick={() => queryClient.invalidateQueries({ queryKey: ["odin", "wordpress", "sites"] })}
            className="glass-card px-6 py-4 text-white font-black text-[10px] uppercase tracking-widest hover:border-primary/40 transition-all active:scale-95"
          >
             Scan Infrastructure
          </button>
          <button 
            onClick={() => setIsWizardOpen(true)}
            className="kinetic-gradient px-8 py-4 rounded-2xl text-white font-black font-headline tracking-widest active:scale-95 transition-all shadow-xl shadow-primary/40 uppercase text-xs"
          >
            + Install WordPress
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6">
        {isLoading ? (
          <div className="p-24 flex flex-col items-center justify-center glass-card animate-pulse">
             <span className="material-symbols-outlined text-zinc-800 text-6xl mb-4">refresh</span>
             <p className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">Synchronizing instances...</p>
          </div>
        ) : sites.length === 0 ? (
          <div className="p-20 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center text-center group hover:border-primary/20 transition-all cursor-pointer" onClick={() => setIsWizardOpen(true)}>
             <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6 grow-animation">
                <span className="material-symbols-outlined text-zinc-600 group-hover:text-primary">deployed_code</span>
             </div>
             <h4 className="text-sm font-black text-zinc-400 uppercase tracking-widest">No active deployments found.</h4>
             <p className="text-[10px] text-zinc-600 mt-2 uppercase tracking-tighter">Initialize your first WordPress instance to start managing resources.</p>
          </div>
        ) : (
          sites.map((site) => (
            <div key={site.id} className="glass-card p-1 overflow-hidden group">
              <div className="bg-white/[0.02] p-8 flex flex-col lg:flex-row items-center gap-12 group-hover:bg-white/[0.04] transition-all duration-500">
                
                {/* Site Identity */}
                <div className="flex items-center gap-8 min-w-[300px]">
                  <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-500 group-hover:text-primary group-hover:border-primary/20 transition-all duration-500 shrink-0 shadow-2xl">
                     <span className="material-symbols-outlined text-4xl">browser_updated</span>
                  </div>
                  <div>
                     <h3 className="text-2xl font-headline font-black text-white italic tracking-tighter uppercase">{site.site_title}</h3>
                     <p className="text-primary font-mono text-[10px] tracking-widest mt-1 uppercase">{site.domain}</p>
                     <div className="flex items-center gap-2 mt-4">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{site.status}</span>
                     </div>
                  </div>
                </div>

                {/* Technical Matrix */}
                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-8">
                   <TechStat label="Version" value={`v${site.wp_version}`} />
                   <TechStat label="PHP Engine" value={site.php_version} icon="settings_suggest" />
                   <TechStat label="Database" value={site.db_name} icon="database" />
                   <TechStat 
                     label="Auto-Updates" 
                     value={site.auto_updates ? "Active" : "Disabled"} 
                     active={site.auto_updates} 
                   />
                </div>

                {/* Action Cluster */}
                <div className="flex gap-3">
                   <Link 
                     href={`/wordpress/${site.id}`}
                     className="p-4 rounded-xl bg-white/5 border border-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                   >
                      <span className="material-symbols-outlined">settings</span>
                   </Link>
                   <button 
                     onClick={() => window.open(site.admin_url ?? `https://${site.domain}/wp-admin`, '_blank')}
                     className="flex items-center gap-3 px-6 py-4 rounded-xl bg-primary text-black font-black text-[10px] uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all"
                   >
                      <span>Admin Login</span>
                      <span className="material-symbols-outlined text-sm">open_in_new</span>
                   </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Installation Wizard Modal */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
           <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => !isInstalling && setIsWizardOpen(false)}></div>
           
           <div className="glass-card w-full max-w-2xl relative z-10 overflow-hidden animate-in fade-in zoom-in duration-300">
              <div className="p-8 border-b border-white/5 bg-white/[0.02]">
                 <div className="flex justify-between items-center">
                    <div>
                       <h2 className="text-2xl font-headline font-black text-white italic tracking-tighter uppercase">WP Installation Wizard</h2>
                       <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Deploying to high-performance cloud nodes</p>
                    </div>
                    {!isInstalling && (
                      <button onClick={() => setIsWizardOpen(false)} className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all">
                         <span className="material-symbols-outlined">close</span>
                      </button>
                    )}
                 </div>
              </div>

              <div className="p-8 space-y-8">
                 {isInstalling ? (
                   <div className="py-12 flex flex-col items-center">
                      <div className="w-24 h-24 relative mb-12">
                         <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                         <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
                         <div className="absolute inset-0 flex items-center justify-center">
                            <span className="material-symbols-outlined text-primary text-3xl animate-pulse">cloud_download</span>
                         </div>
                      </div>
                      <div className="w-full max-w-sm bg-black/40 border border-white/5 rounded-xl p-6 font-mono space-y-2">
                         {installLogs.map((log, i) => (
                           <div key={i} className={`text-[9px] flex items-center gap-3 transition-opacity duration-300 ${i <= installStep ? 'opacity-100' : 'opacity-20'}`}>
                              <span className={`w-1 h-1 rounded-full ${i === installStep ? 'bg-primary animate-pulse' : i < installStep ? 'bg-green-500' : 'bg-zinc-800'}`}></span>
                              <span className={i === installStep ? 'text-primary' : i < installStep ? 'text-zinc-400' : 'text-zinc-600'}>{log}</span>
                           </div>
                         ))}
                      </div>
                   </div>
                 ) : (
                   <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                         {domains.length > 0 ? (
                           <div className="space-y-2">
                             <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Installation Domain</label>
                             <select 
                               value={formData.domain}
                               onChange={(e) => setFormData(prev => ({ ...prev, domain: e.target.value }))}
                               className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer"
                             >
                               <option value="" className="bg-zinc-900">Select a domain...</option>
                               {domains.map(d => (
                                 <option key={d.id} value={d.domain_name} className="bg-zinc-900">{d.domain_name}</option>
                               ))}
                             </select>
                           </div>
                         ) : (
                           <WizardField 
                              label="Installation Domain" 
                              placeholder="e.g. site.com" 
                              value={formData.domain}
                              onChange={(v) => setFormData(prev => ({ ...prev, domain: v }))}
                           />
                         )}
                         <WizardField 
                            label="Directory (Optional)" 
                            placeholder="e.g. blog" 
                            value={formData.directory}
                            onChange={(v) => setFormData(prev => ({ ...prev, directory: v }))}
                         />
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                         <WizardField 
                            label="Admin User" 
                            placeholder="admin" 
                            value={formData.adminUser}
                            onChange={(v) => setFormData(prev => ({ ...prev, adminUser: v }))}
                         />
                         <WizardField 
                            label="Admin Password" 
                            placeholder="••••••••••••" 
                            type="password" 
                            value={formData.adminPass}
                            onChange={(v) => setFormData(prev => ({ ...prev, adminPass: v }))}
                         />
                      </div>
                      <WizardField 
                        label="Site Title" 
                        placeholder="My Awesome WordPress Site" 
                        value={formData.siteTitle}
                        onChange={(v) => setFormData(prev => ({ ...prev, siteTitle: v }))}
                      />
                      
                      <div className="pt-6 flex justify-end">
                         <button 
                           onClick={handleInstall}
                           disabled={!formData.domain || !formData.adminPass || !formData.siteTitle}
                           className="kinetic-gradient px-12 py-4 rounded-xl text-white font-black font-headline tracking-widest active:scale-95 transition-all shadow-xl shadow-primary/40 uppercase text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                         >
                           Initiate Deployment
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
    <div className="space-y-2">
       <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">{label}</label>
       <input 
         type={type} 
         placeholder={placeholder}
         value={value}
         onChange={(e) => onChange(e.target.value)}
         className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary/50 transition-all placeholder:text-zinc-700"
       />
    </div>
  );
}

function TechStat({ label, value, icon, active }: { label: string; value: string; icon?: string; active?: boolean }) {
  return (
    <div className="space-y-1">
      <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] block">{label}</span>
      <div className="flex items-center gap-2">
         {icon && <span className="material-symbols-outlined text-[14px] text-zinc-700">{icon}</span>}
         <span className={`text-sm font-bold tracking-tight ${active === true ? 'text-primary' : active === false ? 'text-zinc-500' : 'text-zinc-200'}`}>
           {value}
         </span>
      </div>
    </div>
  );
}
