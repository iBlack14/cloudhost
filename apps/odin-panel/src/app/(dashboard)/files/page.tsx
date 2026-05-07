"use client";

import { useState, useRef, useCallback } from "react";
import { useFiles, useDeleteFile, useCreateFolder, useUploadFiles } from "../../../lib/hooks/use-files";
import { getOdinAccessToken } from "../../../lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";
const authHeaders = (extra: Record<string, string> = {}) => {
  const t = getOdinAccessToken();
  return t ? { ...extra, Authorization: `Bearer ${t}` } : extra;
};

const TEXT_EXTENSIONS = [
  ".php", ".html", ".htm", ".css", ".js", ".ts", ".json", ".xml",
  ".txt", ".md", ".conf", ".ini", ".env", ".sh", ".yaml", ".yml",
  ".htaccess", ".htpasswd", ".log", ".sql"
];

const ARCHIVE_EXTENSIONS = [".zip", ".tar", ".tar.gz", ".tgz", ".tar.bz2"];

const isTextFile = (name: string) =>
  TEXT_EXTENSIONS.some(ext => name.toLowerCase().endsWith(ext));

const isArchive = (name: string) =>
  ARCHIVE_EXTENSIONS.some(ext => name.toLowerCase().endsWith(ext));

const formatSize = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

const getFileIcon = (name: string, isDir: boolean) => {
  if (isDir) return "folder";
  if (name.endsWith(".php")) return "code";
  if (name.endsWith(".html") || name.endsWith(".htm")) return "html";
  if (name.endsWith(".css")) return "css";
  if (name.endsWith(".js") || name.endsWith(".ts")) return "javascript";
  if (name.endsWith(".json")) return "data_object";
  if (isArchive(name)) return "archive";
  if ([".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp"].some(e => name.endsWith(e))) return "image";
  if ([".pdf"].some(e => name.endsWith(e))) return "picture_as_pdf";
  return "draft";
};

export default function FileManagerPage() {
  const [currentPath, setCurrentPath] = useState("/");
  const { data: files, isLoading, refetch } = useFiles(currentPath);
  const deleteMutation = useDeleteFile();
  const createFolderMutation = useCreateFolder();
  const uploadMutation = useUploadFiles();

  // Editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorFile, setEditorFile] = useState<{ path: string; name: string } | null>(null);
  const [editorContent, setEditorContent] = useState("");
  const [editorLoading, setEditorLoading] = useState(false);
  const [editorSaving, setEditorSaving] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);

  // Rename state
  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Extract state
  const [extracting, setExtracting] = useState<string | null>(null);

  // Drag and drop
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const openEditor = async (filePath: string, fileName: string) => {
    setEditorFile({ path: filePath, name: fileName });
    setEditorContent("");
    setEditorError(null);
    setEditorLoading(true);
    setEditorOpen(true);
    try {
      const res = await fetch(`${API_BASE}/odin-panel/files/content?path=${encodeURIComponent(filePath)}`, {
        headers: authHeaders()
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data?.error?.message ?? "Error al leer archivo");
      setEditorContent(data.data ?? "");
    } catch (err: any) {
      setEditorError(err.message ?? "No se pudo cargar el archivo");
    } finally {
      setEditorLoading(false);
    }
  };

  const saveEditor = async () => {
    if (!editorFile) return;
    setEditorSaving(true);
    setEditorError(null);
    try {
      const res = await fetch(`${API_BASE}/odin-panel/files/content`, {
        method: "PUT",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ path: editorFile.path, content: editorContent })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data?.error?.message ?? "Error al guardar");
      setEditorOpen(false);
      refetch();
    } catch (err: any) {
      setEditorError(err.message ?? "No se pudo guardar el archivo");
    } finally {
      setEditorSaving(false);
    }
  };

  const startRename = (file: any) => {
    setRenameTarget(file.path);
    setRenameValue(file.name);
  };

  const confirmRename = async () => {
    if (!renameTarget || !renameValue.trim()) return;
    const dir = renameTarget.substring(0, renameTarget.lastIndexOf("/") + 1);
    const newPath = dir + renameValue.trim();
    try {
      const res = await fetch(`${API_BASE}/odin-panel/files/rename`, {
        method: "PUT",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ oldPath: renameTarget, newPath })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data?.error?.message ?? "Error al renombrar");
      setRenameTarget(null);
      refetch();
    } catch (err: any) {
      alert("Error al renombrar: " + err.message);
    }
  };

  const extractArchive = async (filePath: string) => {
    const dir = filePath.substring(0, filePath.lastIndexOf("/") + 1) || "/";
    setExtracting(filePath);
    try {
      const res = await fetch(`${API_BASE}/odin-panel/files/extract`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ zipPath: filePath, destPath: dir })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data?.error?.message ?? "Error al extraer");
      refetch();
    } catch (err: any) {
      alert("Error al extraer: " + err.message);
    } finally {
      setExtracting(null);
    }
  };

  const handleUploadFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    uploadMutation.mutate({ path: currentPath, files: fileList });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleUploadFiles(e.dataTransfer.files);
  }, [currentPath]);

  const navigateTo = (folderName: string) => {
    if (folderName === "..") {
      const parts = currentPath.split("/").filter(Boolean);
      parts.pop();
      setCurrentPath("/" + parts.join("/"));
      return;
    }
    const target = currentPath === "/" ? `/${folderName}` : `${currentPath}/${folderName}`;
    setCurrentPath(target);
  };

  const handleCreateFolder = () => {
    const name = window.prompt("Nombre de la nueva carpeta:");
    if (!name) return;
    const target = currentPath === "/" ? `/${name}` : `${currentPath}/${name}`;
    createFolderMutation.mutate(target);
  };

  const handleDelete = (path: string, isDir: boolean) => {
    if (window.confirm(`¿Eliminar ${isDir ? "carpeta" : "archivo"} "${path}"? Esta acción es irreversible.`)) {
      deleteMutation.mutate(path);
    }
  };

  const breadcrumbs = currentPath.split("/").filter(Boolean);

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-200 pb-10">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3 mb-1">
             <span className="px-2.5 py-1 bg-[#00A3FF]/10 text-[#00A3FF] text-[10px] font-bold uppercase rounded-full tracking-wider">
                Almacenamiento Cloud
             </span>
          </div>
          <h1 className="text-5xl font-black text-slate-900 uppercase">
            Gestor de <span className="text-[#00A3FF]">Archivos</span>
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-2">
            Administra los ficheros de tu servidor de forma segura y profesional.
          </p>
        </div>
        
        <div className="flex gap-3">
          <button onClick={handleCreateFolder} className="px-6 py-4 bg-white border border-slate-200 rounded-2xl text-slate-500 font-black text-[10px] uppercase tracking-widest hover:border-[#00A3FF]/30 hover:text-[#00A3FF] transition-all shadow-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">create_new_folder</span>
            Carpeta
          </button>
          <input type="file" ref={fileInputRef} onChange={e => handleUploadFiles(e.target.files)} className="hidden" multiple />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
            className="bg-[#00A3FF] px-8 py-4 rounded-2xl text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-[#00A3FF]/20 hover:bg-[#008EE0] transition-all disabled:opacity-40 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">upload</span>
            {uploadMutation.isPending ? "Subiendo..." : "Subir"}
          </button>
        </div>
      </header>

      <div
        ref={dropZoneRef}
        className={`flex-1 bg-white border rounded-[2.5rem] shadow-sm transition-all overflow-hidden flex flex-col relative ${isDragging ? "border-[#00A3FF] bg-[#00A3FF]/5 scale-[0.99]" : "border-slate-200"}`}
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-sm rounded-[2.5rem] pointer-events-none">
            <div className="text-center animate-bounce">
              <span className="material-symbols-outlined text-[#00A3FF] text-7xl">cloud_upload</span>
              <p className="text-[#00A3FF] font-black text-base uppercase tracking-widest mt-4">Soltar para subir</p>
            </div>
          </div>
        )}

        <div className="px-8 py-5 border-b border-slate-100 flex items-center gap-3 text-xs bg-slate-50/50">
          <div 
            onClick={() => setCurrentPath("/")}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-[#00A3FF]/5 hover:border-[#00A3FF]/30 transition-all font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-[#00A3FF] shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">home</span>
            Raíz
          </div>
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            const target = "/" + breadcrumbs.slice(0, idx + 1).join("/");
            return (
              <div key={idx} className="flex items-center gap-3">
                <span className="text-slate-200 material-symbols-outlined text-[18px]">chevron_right</span>
                <div
                  onClick={() => !isLast && setCurrentPath(target)}
                  className={`px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${isLast ? "bg-[#00A3FF] text-white shadow-lg shadow-[#00A3FF]/20" : "bg-white border border-slate-200 text-slate-400 hover:text-[#00A3FF] hover:bg-[#00A3FF]/5 cursor-pointer shadow-sm"}`}
                >
                  {crumb}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="px-10 py-5">Nombre del Elemento</th>
                <th className="px-6 py-5">Tamaño</th>
                <th className="px-6 py-5">Fecha</th>
                <th className="px-6 py-5">Permisos</th>
                <th className="px-10 py-5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading && (
                <tr>
                  <td colSpan={5} className="py-24 text-center">
                    <div className="flex flex-col items-center gap-4">
                       <div className="w-10 h-10 border-4 border-slate-100 border-t-[#00A3FF] rounded-full animate-spin"></div>
                       <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Escaneando archivos...</p>
                    </div>
                  </td>
                </tr>
              )}

              {!isLoading && currentPath !== "/" && (
                <tr className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => navigateTo("..")}>
                  <td className="px-10 py-4 flex items-center gap-4 text-[#00A3FF]">
                    <span className="material-symbols-outlined text-[20px]">keyboard_backspace</span>
                    <span className="font-bold text-xs uppercase tracking-widest">Volver al Directorio Anterior</span>
                  </td>
                  <td colSpan={4}></td>
                </tr>
              )}

              {!isLoading && files?.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-24 text-center">
                     <div className="flex flex-col items-center opacity-30">
                        <span className="material-symbols-outlined text-6xl text-slate-400">folder_off</span>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-4">Directorio Vacío</p>
                     </div>
                  </td>
                </tr>
              )}

              {!isLoading && files?.map((file) => (
                <tr key={file.path} className="hover:bg-slate-50/50 transition-colors group border-l-4 border-transparent hover:border-l-[#00A3FF]">
                  <td className="px-10 py-5">
                    {renameTarget === file.path ? (
                      <div className="flex items-center gap-3">
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") confirmRename(); if (e.key === "Escape") setRenameTarget(null); }}
                          className="bg-slate-50 border border-[#00A3FF] rounded-xl px-4 py-2 text-sm text-slate-900 font-bold focus:outline-none w-64 shadow-inner"
                        />
                        <button onClick={confirmRename} className="w-9 h-9 rounded-xl bg-[#00A3FF] text-white flex items-center justify-center shadow-lg shadow-[#00A3FF]/20">
                          <span className="material-symbols-outlined text-[18px]">check</span>
                        </button>
                        <button onClick={() => setRenameTarget(null)} className="w-9 h-9 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center">
                          <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                      </div>
                    ) : (
                      <div
                        className="flex items-center gap-5 cursor-pointer"
                        onClick={() => file.isDirectory && navigateTo(file.name)}
                      >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm transition-all group-hover:scale-110 ${
                          file.isDirectory ? "bg-amber-50 text-amber-500 border border-amber-100" : "bg-slate-50 text-slate-400 border border-slate-100"
                        }`}>
                           <span className="material-symbols-outlined text-2xl">
                             {getFileIcon(file.name, file.isDirectory)}
                           </span>
                        </div>
                        <span className={`text-sm font-black tracking-tight ${file.isDirectory ? "text-slate-900 group-hover:text-[#00A3FF]" : "text-slate-600"} transition-colors`}>
                          {file.name}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-5 text-slate-400 text-xs font-bold font-mono">
                    {file.isDirectory ? "—" : formatSize(file.size)}
                  </td>
                  <td className="px-6 py-5 text-slate-400 text-xs font-bold font-mono">
                    {new Date(file.lastModified).toLocaleDateString("es-ES")}
                  </td>
                  <td className="px-6 py-5 text-slate-300 text-xs font-mono">{file.permissions}</td>
                  <td className="px-10 py-5 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!file.isDirectory && isTextFile(file.name) && (
                        <button onClick={() => openEditor(file.path, file.name)} className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-[#00A3FF] hover:border-[#00A3FF]/30 transition-all flex items-center justify-center shadow-sm">
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                      )}
                      {!file.isDirectory && isArchive(file.name) && (
                        <button onClick={() => extractArchive(file.path)} disabled={extracting === file.path} className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center shadow-sm">
                           <span className={`material-symbols-outlined text-[18px] ${extracting === file.path ? "animate-spin" : ""}`}>
                             {extracting === file.path ? "refresh" : "folder_zip"}
                           </span>
                        </button>
                      )}
                      <button onClick={() => startRename(file)} className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-[#00A3FF] transition-all flex items-center justify-center shadow-sm">
                        <span className="material-symbols-outlined text-[18px]">drive_file_rename_outline</span>
                      </button>
                      {!file.isDirectory && (
                        <a href={`${API_BASE}/odin-panel/files/download?path=${encodeURIComponent(file.path)}`} target="_blank" className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-[#00A3FF] transition-all flex items-center justify-center shadow-sm">
                          <span className="material-symbols-outlined text-[18px]">download</span>
                        </a>
                      )}
                      <button onClick={() => handleDelete(file.path, file.isDirectory)} className="w-10 h-10 rounded-xl bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shadow-sm">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-10 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">
            Ruta: <span className="text-slate-500">/home/user{currentPath}</span>
          </p>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">
            {files?.length ?? 0} elementos cargados
          </p>
        </div>
      </div>

      {editorOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => !editorSaving && setEditorOpen(false)} />
          <div className="relative z-10 w-full max-w-6xl h-[85vh] flex flex-col bg-white border border-slate-200 rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between px-10 py-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-[#00A3FF] shadow-sm">
                   <span className="material-symbols-outlined text-2xl">edit_document</span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 leading-tight">{editorFile?.name}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{editorFile?.path}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={saveEditor}
                  disabled={editorSaving || editorLoading}
                  className="flex items-center gap-3 px-8 py-3.5 rounded-2xl bg-[#00A3FF] text-white text-[11px] font-black uppercase tracking-widest hover:bg-[#008EE0] active:scale-95 transition-all shadow-xl shadow-[#00A3FF]/20 disabled:opacity-40"
                >
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  {editorSaving ? "Guardando..." : "Guardar Archivo"}
                </button>
                <button
                  onClick={() => setEditorOpen(false)}
                  disabled={editorSaving}
                  className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-slate-900 transition-all shadow-sm"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden relative bg-slate-900">
              {editorLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-white/10 border-t-[#00A3FF] rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-500 text-xs font-black uppercase tracking-widest">Cargando código...</p>
                  </div>
                </div>
              ) : (
                <textarea
                  value={editorContent}
                  onChange={e => setEditorContent(e.target.value)}
                  spellCheck={false}
                  className="w-full h-full bg-transparent text-emerald-400 font-mono text-sm resize-none focus:outline-none p-10 leading-relaxed custom-scrollbar"
                  style={{ tabSize: 2 }}
                />
              )}
            </div>

            <div className="px-10 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {editorContent.split("\n").length} líneas · UTF-8
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Editor Odisea Cloud v1.0
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
