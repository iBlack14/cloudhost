"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { getOdinAccessToken } from "../../../../lib/api";

const API_BASE = typeof window !== "undefined" && window.location.hostname !== "localhost" && !window.location.hostname.match(/^\d+\.\d+\.\d+\.\d+$/)
  ? `${window.location.protocol}//api.${window.location.hostname.split(".").slice(-2).join(".")}/api/v1`
  : (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1");
const authHeaders = (): Record<string, string> => {
  const t = getOdinAccessToken();
  return t ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
};

type RecordType = "A" | "AAAA" | "CNAME" | "MX" | "TXT" | "SRV" | "NS";

interface DnsRecord {
  id: string;
  name: string;
  type: RecordType;
  content: string;
  priority: number | null;
  ttl: number;
}

export default function OdinDnsZoneEditor() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  
  const [filterType, setFilterType] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  
  // New record form state
  const [newRec, setNewRec] = useState<{ name: string; type: RecordType; content: string; priority: string; ttl: number }>({
    name: "", type: "A", content: "", priority: "", ttl: 14400
  });

  // Inline edit state
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState({
    name: "",
    type: "A" as RecordType,
    content: "",
    priority: "",
    ttl: 14400
  });

  const { data, isLoading } = useQuery({
    queryKey: ["odin_dns_zone", id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/odin-panel/domains/${id}/dns`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Error fetching zone");
      const json = await res.json();
      return json.data;
    }
  });

  const addMutation = useMutation({
    mutationFn: async (payload: object) => {
      const res = await fetch(`${API_BASE}/odin-panel/dns/zones/${data.zone.id}/records`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Add failed");
      return res.json();
    },
    onSuccess: () => {
      setNewRec({ name: "", type: "A", content: "", priority: "", ttl: 14400 });
      setShowAddForm(false);
      queryClient.invalidateQueries({ queryKey: ["odin_dns_zone", id] });
    },
    onError: (err: any) => alert(`Error al añadir registro: ${err.message}`)
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: { recordId: string; name: string; type: RecordType; content: string; priority?: number }) => {
      // 1. Delete
      const delRes = await fetch(`${API_BASE}/odin-panel/dns/records/${payload.recordId}`, {
        method: "DELETE",
        headers: authHeaders()
      });
      if (!delRes.ok) throw new Error("Delete before update failed");
      
      // 2. Add
      const addRes = await fetch(`${API_BASE}/odin-panel/dns/zones/${data.zone.id}/records`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          name: payload.name,
          type: payload.type,
          content: payload.content,
          priority: payload.priority
        })
      });
      if (!addRes.ok) throw new Error("Add after update failed");
      return addRes.json();
    },
    onSuccess: () => {
      setEditingRecordId(null);
      queryClient.invalidateQueries({ queryKey: ["odin_dns_zone", id] });
    },
    onError: (err: any) => alert(`Error al actualizar registro: ${err.message}`)
  });

  const deleteMutation = useMutation({
    mutationFn: async (recordId: string) => {
      const res = await fetch(`${API_BASE}/odin-panel/dns/records/${recordId}`, {
         method: "DELETE",
         headers: authHeaders()
      });
      if (!res.ok) throw new Error("Delete failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["odin_dns_zone", id] });
    },
    onError: (err: any) => alert(`Error al eliminar registro: ${err.message}`)
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-zinc-500 gap-3">
        <div className="w-8 h-8 border-[3px] border-[#00A3FF]/20 border-t-[#00A3FF] rounded-full animate-spin"></div>
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Cargando Zona DNS...</span>
      </div>
    );
  }

  if (!data) return <div className="text-red-500 font-bold p-10">No se encontró la zona DNS.</div>;

  const { domain, zone, records = [] } = data;

  const startEdit = (r: DnsRecord) => {
    setEditingRecordId(r.id);
    setEditFields({
      name: r.name,
      type: r.type,
      content: r.content,
      priority: r.priority?.toString() ?? "",
      ttl: r.ttl ?? 14400
    });
  };

  const handleSaveEdit = (recordId: string) => {
    updateMutation.mutate({
      recordId,
      name: editFields.name,
      type: editFields.type,
      content: editFields.content,
      priority: editFields.priority ? parseInt(editFields.priority, 10) : undefined
    });
  };

  // Filter logic
  const filteredRecords = (records as DnsRecord[]).filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "All" || r.type === filterType;
    return matchesSearch && matchesType;
  });

  // Fallback nameservers
  const nsList = domain.nameservers || [
    zone.soa_mname || "dns1.supremepanel.com",
    zone.soa_rname?.replace("admin.", "ns2.") || "dns2.supremepanel.com",
    "dns3.supremepanel.com",
    "dns4.supremepanel.com"
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500 w-full min-w-0">
      {/* Return to domains link */}
      <button
        onClick={() => router.back()}
        className="text-slate-500 font-bold uppercase text-[10px] tracking-widest hover:text-[#00A3FF] flex items-center gap-1.5 group transition-colors"
      >
        <span className="material-symbols-outlined text-[16px] group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
        Volver a Dominios
      </button>

      {/* Header Info */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h1 className="text-3xl font-light text-slate-800">
          Zone Records for <span className="font-semibold text-[#00A3FF]">"{domain.domain_name}"</span>
        </h1>
        <div className="flex flex-wrap gap-2 items-center pt-2">
          <span className="text-slate-500 font-bold uppercase text-[10px] tracking-wider mr-2">Configured nameservers for this zone:</span>
          {nsList.map((ns: string, idx: number) => (
            <span key={idx} className="bg-slate-100 border border-slate-200 text-slate-700 font-mono text-xs px-2.5 py-1 rounded-md font-bold shadow-inner">
              {ns.replace(/\.$/, "")}
            </span>
          ))}
        </div>
      </div>

      {/* Filter and Actions Bar */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center w-full xl:w-auto">
          {/* Search */}
          <div className="flex items-center w-full md:w-64 border border-slate-300 rounded-lg overflow-hidden shadow-inner bg-white">
            <input
              type="text"
              placeholder="Filter by name"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-2 text-xs text-slate-700 outline-none w-full placeholder:text-slate-400 font-semibold"
            />
            <button className="bg-slate-50 border-l border-slate-200 px-3 py-2 text-slate-400">
              <span className="material-symbols-outlined text-[16px] leading-none block">search</span>
            </button>
          </div>

          {/* Record Type Category Filters */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Filter:</span>
            {["All", "A", "CNAME", "MX", "SRV", "TXT"].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterType === type
                    ? "bg-[#00A3FF] text-white shadow-md shadow-[#00A3FF]/15"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2.5 items-center w-full xl:w-auto xl:justify-end">
          <button className="px-4 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-600 font-bold text-xs hover:bg-slate-100">
            Acciones
          </button>
          <button className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-100">
            Save All Records
          </button>
          <button
            onClick={() => setShowAddForm((prev) => !prev)}
            className="px-5 py-2.5 bg-[#00A3FF] text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md shadow-[#00A3FF]/15 hover:bg-[#008EE0] transition-all"
          >
            {showAddForm ? "Cancelar" : "+ Add Record"}
          </button>
          <button className="p-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-400 hover:text-slate-600">
            <span className="material-symbols-outlined text-[18px] leading-none block">settings</span>
          </button>
        </div>
      </div>

      {/* Add Record Form */}
      {showAddForm && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-inner animate-in slide-in-from-top-4 duration-300">
          <h3 className="text-slate-800 font-bold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00A3FF]">add_circle</span> Add Record
          </h3>
          <div className="flex flex-col lg:flex-row gap-4 items-end">
            <div className="w-full lg:w-36 space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block ml-1">Type</label>
              <select
                value={newRec.type}
                onChange={(e) => setNewRec({ ...newRec, type: e.target.value as RecordType })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-3 text-slate-800 font-bold text-sm outline-none focus:border-[#00A3FF] transition-all"
              >
                <option value="A">A</option>
                <option value="AAAA">AAAA</option>
                <option value="CNAME">CNAME</option>
                <option value="MX">MX</option>
                <option value="TXT">TXT</option>
                <option value="SRV">SRV</option>
              </select>
            </div>
            <div className="flex-1 w-full space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block ml-1">Name (Host)</label>
              <input
                type="text"
                placeholder="@ or sub"
                value={newRec.name}
                onChange={(e) => setNewRec({ ...newRec, name: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-800 font-semibold text-sm outline-none focus:border-[#00A3FF] transition-all"
              />
            </div>
            <div className="w-full lg:w-36 space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block ml-1">TTL</label>
              <input
                type="number"
                placeholder="14400"
                value={newRec.ttl}
                onChange={(e) => setNewRec({ ...newRec, ttl: parseInt(e.target.value, 10) || 14400 })}
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-800 font-semibold text-sm outline-none focus:border-[#00A3FF] transition-all"
              />
            </div>
            <div className="flex-[2] w-full space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block ml-1">Record Content / Value</label>
              <input
                type="text"
                placeholder="1.2.3.4 or target.domain.com"
                value={newRec.content}
                onChange={(e) => setNewRec({ ...newRec, content: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-800 font-semibold text-sm outline-none focus:border-[#00A3FF] transition-all"
              />
            </div>
            {newRec.type === "MX" && (
              <div className="w-full lg:w-28 space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block ml-1">Priority</label>
                <input
                  type="number"
                  placeholder="10"
                  value={newRec.priority}
                  onChange={(e) => setNewRec({ ...newRec, priority: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-800 font-semibold text-sm outline-none focus:border-[#00A3FF] transition-all text-center"
                />
              </div>
            )}
            <button
              disabled={addMutation.isPending || !newRec.name || !newRec.content}
              onClick={() => {
                addMutation.mutate({
                  name: newRec.name,
                  type: newRec.type,
                  content: newRec.content,
                  priority: newRec.priority ? parseInt(newRec.priority, 10) : undefined
                });
              }}
              className="w-full lg:w-auto bg-[#00A3FF] text-white font-black uppercase text-xs tracking-widest px-8 py-3.5 rounded-xl hover:bg-[#008EE0] active:scale-[0.98] transition-all shadow-md shadow-[#00A3FF]/15 disabled:opacity-50"
            >
              Añadir
            </button>
          </div>
        </div>
      )}

      {/* Record List Table */}
      <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm max-w-full">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left min-w-[1000px] table-auto">
            <thead>
              <tr className="text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-slate-200 bg-slate-50/50">
                <th className="px-8 py-5">Name</th>
                <th className="px-8 py-5 w-24">TTL</th>
                <th className="px-8 py-5 w-28">Tipo</th>
                <th className="px-8 py-5">Registrar</th>
                <th className="px-8 py-5 text-right w-52">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.map((r: DnsRecord) => {
                const isEditing = editingRecordId === r.id;
                return (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition-all duration-300">
                    {/* NAME */}
                    <td className="px-8 py-5">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editFields.name}
                          onChange={(e) => setEditFields({ ...editFields, name: e.target.value })}
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-800 outline-none focus:border-[#00A3FF]"
                        />
                      ) : (
                        <span className="text-slate-800 font-bold text-sm font-mono">{r.name}</span>
                      )}
                    </td>

                    {/* TTL */}
                    <td className="px-8 py-5">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editFields.ttl}
                          onChange={(e) => setEditFields({ ...editFields, ttl: parseInt(e.target.value, 10) || 14400 })}
                          className="w-20 bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#00A3FF]"
                        />
                      ) : (
                        <span className="text-slate-500 font-mono text-xs font-medium">{r.ttl}</span>
                      )}
                    </td>

                    {/* TYPE */}
                    <td className="px-8 py-5">
                      <span
                        className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider border transition-all ${
                          r.type === "A" || r.type === "AAAA"
                            ? "bg-blue-50 text-blue-600 border-blue-100"
                            : r.type === "CNAME"
                            ? "bg-purple-50 text-purple-600 border-purple-100"
                            : r.type === "MX"
                            ? "bg-amber-50 text-amber-600 border-amber-100"
                            : r.type === "TXT"
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                            : "bg-slate-50 text-slate-500 border-slate-100"
                        }`}
                      >
                        {r.type}
                      </span>
                    </td>

                    {/* VALUE */}
                    <td className="px-8 py-5">
                      {isEditing ? (
                        <div className="flex items-center gap-3">
                          <input
                            type="text"
                            value={editFields.content}
                            onChange={(e) => setEditFields({ ...editFields, content: e.target.value })}
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-800 outline-none focus:border-[#00A3FF]"
                          />
                          {editFields.type === "MX" && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Priority:</span>
                              <input
                                type="number"
                                value={editFields.priority}
                                onChange={(e) => setEditFields({ ...editFields, priority: e.target.value })}
                                className="w-16 bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#00A3FF] text-center"
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-600 font-mono text-xs font-semibold break-all leading-relaxed">
                          {r.type === "MX" && <span className="text-amber-600 font-bold mr-2">Prioridad: {r.priority || 10}</span>}
                          {r.content}
                        </span>
                      )}
                    </td>

                    {/* OPERATIONS */}
                    <td className="px-8 py-5 text-right">
                      {isEditing ? (
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => setEditingRecordId(null)}
                            className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 rounded-lg text-xs font-bold uppercase transition-all"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveEdit(r.id)}
                            disabled={updateMutation.isPending}
                            className="px-4 py-1.5 bg-[#00A3FF] text-white hover:bg-[#008EE0] rounded-lg text-xs font-bold uppercase transition-all shadow-md shadow-[#00A3FF]/10"
                          >
                            {updateMutation.isPending ? "Saving..." : "Save"}
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => startEdit(r)}
                            className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300 rounded-lg text-[11px] font-bold uppercase tracking-wide flex items-center gap-1 transition-all"
                          >
                            <span className="material-symbols-outlined text-[13px] text-slate-500">edit</span>
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`¿Estás seguro de que deseas eliminar permanentemente el registro "${r.name}"?`)) {
                                deleteMutation.mutate(r.id);
                              }
                            }}
                            disabled={deleteMutation.isPending}
                            className="px-3.5 py-1.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-[11px] font-bold uppercase tracking-wide flex items-center gap-1 transition-all"
                          >
                            <span className="material-symbols-outlined text-[13px]">delete</span>
                            Eliminar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-slate-400 font-medium italic text-sm">
                    No se encontraron registros de zona coincidentes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
