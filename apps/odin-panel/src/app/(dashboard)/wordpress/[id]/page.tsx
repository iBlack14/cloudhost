"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchWpSiteById } from "../../../../lib/api";

export default function WordPressDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [site, setSite] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const loadSite = async () => {
      try {
        setIsLoading(true);
        const data = await fetchWpSiteById(id as string);
        setSite(data);
      } catch (err) {
        console.error("Failed to load site details", err);
      } finally {
        setIsLoading(false);
      }
    };
    if (id) loadSite();
  }, [id]);

  if (isLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center animate-pulse">
        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-6"></div>
        <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Hydrating Management Console...</p>
      </div>
    );
  }

  if (!site) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-center">
        <span className="material-symbols-outlined text-6xl text-zinc-800 mb-6">error</span>
        <h2 className="text-2xl font-headline font-black text-white italic tracking-tighter uppercase leading-none">Instance Not Found</h2>
        <p className="text-zinc-600 text-xs mt-2 uppercase tracking-widest">The requested WordPress node does not exist or access was denied.</p>
        <button onClick={() => router.back()} className="mt-8 px-8 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      {/* Header / Identity Area */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-4">
          <Link href="/wordpress" className="flex items-center gap-2 text-primary font-black text-[9px] uppercase tracking-[0.2em] hover:opacity-70 transition-all">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back to Cluster
          </Link>
          <div className="flex items-center gap-6">
             <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center text-primary shadow-2xl">
                <span className="material-symbols-outlined text-4xl">browser_updated</span>
             </div>
             <div>
                <h1 className="text-5xl font-headline font-black text-white tracking-tighter uppercase italic leading-none">
                  {site.site_title}
                </h1>
                <div className="flex items-center gap-4 mt-2">
                   <p className="text-zinc-500 font-mono text-xs tracking-widest">{site.domain}</p>
                   <span className="w-1 h-1 rounded-full bg-zinc-800"></span>
                   <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></span>
                      <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Status: Healthy</span>
                   </div>
                </div>
             </div>
          </div>
        </div>

        <div className="flex gap-4">
           <button className="glass-card px-8 py-4 text-white font-black text-[10px] uppercase tracking-widest hover:border-primary/40 transition-all active:scale-95 group">
              <div className="flex items-center gap-3">
                 <span className="material-symbols-outlined text-sm group-hover:rotate-180 transition-transform duration-500">sync</span>
                 Sync Filesystem
              </div>
           </button>
           <button 
             onClick={() => window.open(`http://${site.domain}/wp-admin`, '_blank')}
             className="kinetic-gradient px-10 py-4 rounded-2xl text-white font-black font-headline tracking-widest active:scale-95 transition-all shadow-xl shadow-primary/40 uppercase text-xs flex items-center gap-3"
           >
              <span>Admin Login</span>
              <span className="material-symbols-outlined text-sm">open_in_new</span>
           </button>
        </div>
      </header>

      {/* Tabs Navigation */}
      <div className="flex border-b border-white/5 gap-8 overflow-x-auto pb-px">
         {["overview", "plugins", "themes", "backups", "database", "security"].map((tab) => (
           <button
             key={tab}
             onClick={() => setActiveTab(tab)}
             className={`px-2 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${
               activeTab === tab ? 'text-primary' : 'text-zinc-500 hover:text-zinc-300'
             }`}
           >
             {tab}
             {activeTab === tab && (
               <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary animate-in fade-in slide-in-from-bottom-1 blur-[1px]"></div>
             )}
           </button>
         ))}
      </div>

      {/* Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {activeTab === "overview" && (
           <>
              {/* Main Technical Specs */}
              <div className="lg:col-span-2 space-y-8">
                 <div className="glass-card p-1">
                    <div className="bg-white/[0.02] p-8 space-y-8">
                       <h3 className="text-zinc-500 font-black text-[10px] uppercase tracking-widest border-l-2 border-primary pl-4">Platform Intelligence</h3>
                       
                       <div className="grid grid-cols-2 lg:grid-cols-3 gap-12">
                          <SpecItem label="Core Version" value={`WordPress v${site.wp_version}`} subValue="Last checked 2 mins ago" />
                          <SpecItem label="Execution Engine" value={`PHP ${site.php_version}`} subValue="FPM/FastCGI Mode" />
                          <SpecItem label="Database Cluster" value={site.db_name} subValue={`User: ${site.db_user}`} />
                          <SpecItem label="Memory Limit" value="512 MB" subValue="High performance" />
                          <SpecItem label="Storage Path" value={`/home/wp_sites/${site.domain}`} subValue="NVMe SSD Isolated" />
                          <SpecItem label="SSL Status" value="Let's Encrypt Active" subValue="Expires in 82 days" />
                       </div>

                       <div className="pt-8 border-t border-white/5 flex justify-between items-center">
                          <div className="flex items-center gap-3">
                             <div className={`w-12 h-6 rounded-full relative transition-all cursor-pointer ${site.auto_updates ? 'bg-primary' : 'bg-zinc-800'}`}>
                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${site.auto_updates ? 'left-7' : 'left-1'}`}></div>
                             </div>
                             <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Automatic Core Updates</span>
                          </div>
                          <button className="text-primary text-[10px] font-black uppercase tracking-widest hover:underline">Update Settings</button>
                       </div>
                    </div>
                 </div>

                 {/* Performance Insights */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="glass-card p-8 bg-white/[0.01]">
                       <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-6">Page Speed Score</h4>
                       <div className="flex items-end gap-4">
                          <span className="text-5xl font-headline font-black text-white italic leading-none">94<span className="text-primary text-2xl">/100</span></span>
                          <span className="text-[10px] text-green-500 font-bold uppercase mb-2 tracking-widest">A - Grade</span>
                       </div>
                       <div className="w-full h-1 bg-zinc-900 rounded-full mt-6 overflow-hidden">
                          <div className="w-[94%] h-full bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]"></div>
                       </div>
                    </div>
                    <div className="glass-card p-8 bg-white/[0.01]">
                       <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-6">Security Baseline</h4>
                       <div className="flex items-end gap-4">
                          <span className="text-5xl font-headline font-black text-white italic leading-none">98<span className="text-primary text-2xl">%</span></span>
                          <span className="text-[10px] text-green-500 font-bold uppercase mb-2 tracking-widest">Fortified</span>
                       </div>
                       <div className="w-full h-1 bg-zinc-900 rounded-full mt-6 overflow-hidden">
                          <div className="w-[98%] h-full bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]"></div>
                       </div>
                    </div>
                 </div>
              </div>

              {/* Sidebar Info */}
              <div className="space-y-8">
                 <div className="glass-card p-8 bg-white/[0.02]">
                    <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-6">Site Health</h3>
                    <div className="space-y-6">
                       <HealthIndicator label="SSL Certificate" status="Secure" icon="verified_user" />
                       <HealthIndicator label="PHP Version" status="Up to date" icon="check_circle" />
                       <HealthIndicator label="Plugin Security" status="No issues" icon="security" />
                       <HealthIndicator label="Disk Quotas" status="72% Available" icon="dns" />
                    </div>
                    <button className="w-full mt-8 py-4 border border-white/5 bg-white/5 rounded-xl text-white text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">
                       Run Detailed Diagnostic
                    </button>
                 </div>

                 <div className="glass-card p-8 bg-white/[0.02] border-primary/10">
                    <h3 className="text-[10px] font-black text-primary uppercase tracking-widest mb-4 italic">Odisea AI Advisor</h3>
                    <p className="text-[11px] text-zinc-400 leading-relaxed font-medium">
                       "Your database table <span className="text-white italic">wp_options</span> is growing. Consider optimizing autoloaded options to improve load times by ~15%."
                    </p>
                    <button className="mt-4 text-primary text-[9px] font-black uppercase tracking-widest hover:underline flex items-center gap-2">
                       Apply Optimization
                       <span className="material-symbols-outlined text-xs">auto_fix_high</span>
                    </button>
                 </div>
              </div>
           </>
         )}

         {activeTab !== "overview" && (
           <div className="lg:col-span-3 py-20 flex flex-col items-center justify-center glass-card border-dashed">
              <span className="material-symbols-outlined text-zinc-800 text-6xl mb-6">construction</span>
              <h4 className="text-sm font-black text-zinc-500 uppercase tracking-widest">Module under orchestration</h4>
              <p className="text-[10px] text-zinc-700 mt-2 uppercase tracking-widest">The {activeTab} control plane is currently being provisioned for your node.</p>
           </div>
         )}
      </div>
    </div>
  );
}

function SpecItem({ label, value, subValue }: { label: string; value: string; subValue?: string }) {
  return (
    <div className="space-y-1.5">
       <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest block">{label}</label>
       <p className="text-white font-headline text-lg italic uppercase tracking-tighter leading-none">{value}</p>
       {subValue && <span className="text-[10px] text-zinc-600 font-mono tracking-tighter">{subValue}</span>}
    </div>
  );
}

function HealthIndicator({ label, status, icon }: { label: string; status: string; icon: string }) {
  return (
    <div className="flex items-center justify-between group">
       <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-sm text-zinc-700 group-hover:text-primary transition-colors">{icon}</span>
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{label}</span>
       </div>
       <span className="text-[9px] font-black text-primary uppercase tracking-widest">{status}</span>
    </div>
  );
}
