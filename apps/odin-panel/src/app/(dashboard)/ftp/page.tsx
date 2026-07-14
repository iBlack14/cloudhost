"use client";

import React, { useState } from "react";
import { useFtpAccounts, useCreateFtpAccount, useDeleteFtpAccount, useUpdateFtpPassword } from "../../../lib/hooks/use-ftp";

export default function FtpPage() {
  const { data: accounts, isLoading } = useFtpAccounts();
  const createMutation = useCreateFtpAccount();
  const deleteMutation = useDeleteFtpAccount();
  const updatePasswordMutation = useUpdateFtpPassword();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPath, setNewPath] = useState("/");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPassword, setEditPassword] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword || !newPath) return;

    createMutation.mutate(
      { username: newUsername, password: newPassword, path: newPath },
      {
        onSuccess: () => {
          setIsModalOpen(false);
          setNewUsername("");
          setNewPassword("");
          setNewPath("/");
        },
        onError: (err: any) => {
          alert(err.message || "Error al crear cuenta FTP");
        }
      }
    );
  };

  const handleDelete = (id: string, username: string) => {
    if (confirm(`¿Estás seguro de eliminar la cuenta FTP ${username}?`)) {
      deleteMutation.mutate(id, {
        onError: (err: any) => alert(err.message || "Error al eliminar")
      });
    }
  };

  const handleUpdatePassword = (id: string) => {
    if (!editPassword) return;
    updatePasswordMutation.mutate(
      { id, password: editPassword },
      {
        onSuccess: () => {
          alert("Contraseña actualizada exitosamente.");
          setEditingId(null);
          setEditPassword("");
        },
        onError: (err: any) => {
          alert(err.message || "Error al actualizar contraseña");
        }
      }
    );
  };

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    let pass = "";
    for (let i = 0; i < 16; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pass);
  };

  return (
    <div className="flex flex-col space-y-6 animate-in fade-in duration-700 max-w-6xl mx-auto w-full">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200 pb-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 mb-0.5">
             <span className="px-2 py-0.5 bg-[#00A3FF]/10 text-[#00A3FF] text-[9px] font-bold uppercase rounded-full tracking-wider">
                Almacenamiento Cloud
             </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 uppercase">
            Cuentas <span className="text-[#00A3FF]">FTP</span>
          </h1>
          <p className="text-slate-500 text-xs font-medium">
            Administra tus cuentas FTP para acceso remoto a tus archivos.
          </p>
        </div>
        
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#00A3FF] px-5 py-2.5 rounded-xl text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-[#00A3FF]/20 hover:bg-[#008EE0] hover:shadow-xl hover:shadow-[#00A3FF]/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          Crear Cuenta FTP
        </button>
      </header>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-10 h-10 border-4 border-slate-100 border-t-[#00A3FF] rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cargando Cuentas FTP...</p>
          </div>
        ) : !accounts || accounts.length === 0 ? (
          <div className="p-16 text-center">
            <span className="material-symbols-outlined text-6xl text-slate-300 mb-4 block">folder_off</span>
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-2">No hay cuentas FTP</h3>
            <p className="text-xs text-slate-500 font-medium">Crea tu primera cuenta FTP para subir archivos de forma remota.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 bg-slate-50/50">
                  <th className="px-6 py-4">Usuario</th>
                  <th className="px-6 py-4">Directorio</th>
                  <th className="px-6 py-4">Creado</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {accounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500">
                          <span className="material-symbols-outlined text-[18px]">person</span>
                        </div>
                        <span className="text-sm font-bold text-slate-900">{acc.username}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-500 text-xs font-mono bg-slate-100 px-2 py-1 rounded w-max">
                        <span className="material-symbols-outlined text-[14px]">folder</span>
                        {acc.path}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                      {new Date(acc.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {editingId === acc.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <input 
                            type="password"
                            placeholder="Nueva contraseña"
                            value={editPassword}
                            onChange={e => setEditPassword(e.target.value)}
                            className="text-xs px-2 py-1 border border-slate-200 rounded outline-none focus:border-[#00A3FF]"
                          />
                          <button 
                            onClick={() => handleUpdatePassword(acc.id)}
                            disabled={updatePasswordMutation.isPending}
                            className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded text-[10px] font-bold uppercase"
                          >
                            OK
                          </button>
                          <button 
                            onClick={() => { setEditingId(null); setEditPassword(""); }}
                            className="bg-slate-100 text-slate-500 px-2 py-1 rounded text-[10px] font-bold uppercase"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => setEditingId(acc.id)}
                            className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-amber-500 hover:border-amber-200 transition-all flex items-center justify-center shadow-sm"
                            title="Cambiar Contraseña"
                          >
                            <span className="material-symbols-outlined text-[16px]">password</span>
                          </button>
                          <button 
                            onClick={() => handleDelete(acc.id, acc.username)}
                            className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 transition-all flex items-center justify-center shadow-sm"
                            title="Eliminar Cuenta"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-black text-slate-800 uppercase tracking-wide text-sm">Nueva Cuenta FTP</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nombre de Usuario</label>
                <input 
                  type="text" 
                  required
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  placeholder="ej. dev_team"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#00A3FF]/20 focus:border-[#00A3FF] transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-end">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Contraseña</label>
                  <button type="button" onClick={generatePassword} className="text-[10px] font-bold text-[#00A3FF] hover:underline uppercase">Generar</button>
                </div>
                <input 
                  type="text" 
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#00A3FF]/20 focus:border-[#00A3FF] transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Directorio de Acceso</label>
                <input 
                  type="text" 
                  required
                  value={newPath}
                  onChange={e => setNewPath(e.target.value)}
                  placeholder="/public_html"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#00A3FF]/20 focus:border-[#00A3FF] transition-all"
                />
                <p className="text-[10px] text-slate-400">Ruta relativa a la raíz. Usa <code className="bg-slate-100 px-1 rounded">/</code> para acceso total.</p>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors uppercase tracking-wider"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={createMutation.isPending}
                  className="bg-[#00A3FF] px-6 py-2.5 rounded-xl text-white font-black uppercase text-[10px] tracking-widest shadow-md shadow-[#00A3FF]/20 hover:bg-[#008EE0] transition-all disabled:opacity-50"
                >
                  {createMutation.isPending ? "Creando..." : "Crear Cuenta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
