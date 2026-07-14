"use client";

import { useState, useRef, useCallback, useEffect, type FormEvent } from "react";
import { useFiles, useDeleteFile, useCreateFolder, useUploadFiles } from "../../../lib/hooks/use-files";
import { getOdinAccessToken } from "../../../lib/api";

const API_BASE = (() => {
  if (typeof window === "undefined") {
    const envUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";
    return envUrl.startsWith("//") ? "http:" + envUrl : envUrl;
  }
  const host = window.location.hostname;
  const proto = window.location.protocol;
  if (host === "localhost") return "http://localhost:3001/api/v1";
  if (host.match(/^\d+\.\d+\.\d+\.\d+$/)) {
    let port = "3001";
    try {
      const u = process.env.NEXT_PUBLIC_API_URL ? new URL(process.env.NEXT_PUBLIC_API_URL) : null;
      if (u && u.port) port = u.port;
    } catch {}
    return `${proto}//${host}:${port}/api/v1`;
  }
  const parts = host.split(".");
  return `${proto}//api.${parts.length >= 2 ? parts.slice(-2).join(".") : host}/api/v1`;
})();
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
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [pathInput, setPathInput] = useState(currentPath);

  useEffect(() => {
    setPathInput(currentPath);
  }, [currentPath]);

  const handlePathSubmit = (e: FormEvent) => {
    e.preventDefault();
    let target = pathInput.trim();
    if (!target) target = "/";
    if (!target.startsWith("/")) target = "/" + target;
    setCurrentPath(target);
  };

  const navigateUp = () => {
    const parts = currentPath.split("/").filter(Boolean);
    parts.pop();
    setCurrentPath("/" + parts.join("/"));
  };

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
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

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
    setUploadProgress(0);
    uploadMutation.mutate({ 
      path: currentPath, 
      files: fileList,
      onProgress: (p) => setUploadProgress(p)
    }, {
      onSettled: () => setUploadProgress(null)
    });
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
    <div className="flex flex-col h-[calc(100vh-10rem)] space-y-6 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200 pb-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 mb-0.5">
             <span className="px-2 py-0.5 bg-[#00A3FF]/10 text-[#00A3FF] text-[9px] font-bold uppercase rounded-full tracking-wider">
                Almacenamiento Cloud
             </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 uppercase">
            Gestor de <span className="text-[#00A3FF]">Archivos</span>
          </h1>
          <p className="text-slate-500 text-xs font-medium">
            Administra los ficheros de tu servidor de forma segura y profesional.
          </p>
        </div>
        
        <div className="flex gap-2">
          <button onClick={handleCreateFolder} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-500 font-bold text-xs uppercase hover:border-[#00A3FF]/30 hover:text-[#00A3FF] transition-all shadow-sm flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">create_new_folder</span>
            Carpeta
          </button>
          <input type="file" ref={fileInputRef} onChange={e => handleUploadFiles(e.target.files)} className="hidden" multiple />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
            className="bg-[#00A3FF] px-4 py-2 rounded-lg text-white font-bold uppercase text-xs shadow-md shadow-[#00A3FF]/10 hover:bg-[#008EE0] transition-all disabled:opacity-40 flex items-center gap-1.5 relative overflow-hidden"
          >
            {uploadMutation.isPending && uploadProgress !== null && (
              <div 
                className="absolute inset-y-0 left-0 bg-black/10 transition-all duration-300 pointer-events-none"
                style={{ width: `${uploadProgress}%` }}
              />
            )}
            <span className="material-symbols-outlined text-[16px] relative z-10">upload</span>
            <span className="relative z-10">
              {uploadMutation.isPending 
                ? (uploadProgress !== null ? `Subiendo ${uploadProgress}%` : "Subiendo...") 
                : "Subir"}
            </span>
          </button>
        </div>
      </header>

      {/* Main Two Pane Layout */}
      <div className="flex-1 flex gap-6 min-h-0 overflow-hidden">
        
        {/* Navigation Sidebar Pane */}
        <aside className="hidden md:flex w-60 flex-col bg-white border border-slate-200 rounded-xl shadow-sm p-4 overflow-y-auto custom-scrollbar space-y-4 flex-shrink-0">
           <div>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 block px-1 mb-2">Acceso Rápido</span>
              <div className="space-y-0.5">
                 <button 
                   onClick={() => setCurrentPath("/")}
                   className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs font-semibold transition-all ${currentPath === "/" ? 'bg-[#00A3FF]/10 text-[#00A3FF]' : 'text-slate-600 hover:bg-slate-50'}`}
                 >
                    <span className="material-symbols-outlined text-[16px] text-slate-400">home</span>
                    Raíz (/)
                 </button>
                 <button 
                   onClick={() => setCurrentPath("/logs")}
                   className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs font-semibold transition-all ${currentPath === "/logs" ? 'bg-[#00A3FF]/10 text-[#00A3FF]' : 'text-slate-600 hover:bg-slate-50'}`}
                 >
                    <span className="material-symbols-outlined text-[16px] text-slate-400">folder</span>
                    logs
                 </button>
                 <button 
                   onClick={() => setCurrentPath("/public_html")}
                   className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs font-semibold transition-all ${currentPath === "/public_html" ? 'bg-[#00A3FF]/10 text-[#00A3FF]' : 'text-slate-600 hover:bg-slate-50'}`}
                 >
                    <span className="material-symbols-outlined text-[16px] text-slate-400">folder</span>
                    public_html
                 </button>
              </div>
           </div>
           
           <div className="pt-2 border-t border-slate-100">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 block px-1 mb-2">Este Equipo</span>
              <div className="space-y-0.5 pl-1">
                 <div className="text-xs font-medium text-slate-700">
                    <div 
                      onClick={() => setCurrentPath("/")}
                      className={`flex items-center gap-1.5 py-1 cursor-pointer hover:text-[#00A3FF] transition-colors ${currentPath === "/" ? 'text-[#00A3FF] font-bold' : ''}`}
                    >
                       <span className="material-symbols-outlined text-[16px] text-slate-400">dns</span>
                       <span>/</span>
                    </div>
                    
                    {breadcrumbs.map((crumb, idx) => {
                       const crumbPath = "/" + breadcrumbs.slice(0, idx + 1).join("/");
                       const indent = (idx + 1) * 8;
                       return (
                          <div 
                            key={idx}
                            onClick={() => setCurrentPath(crumbPath)}
                            className="flex items-center gap-1.5 py-1 cursor-pointer hover:text-[#00A3FF] transition-colors"
                            style={{ paddingLeft: `${indent}px` }}
                          >
                             <span className="material-symbols-outlined text-[16px] text-amber-500">folder_open</span>
                             <span className={currentPath === crumbPath ? 'text-[#00A3FF] font-bold' : 'text-slate-600'}>{crumb}</span>
                          </div>
                       );
                    })}
                    
                    {files && files.filter(f => f.isDirectory).map((folder) => {
                       const indent = (breadcrumbs.length + 1) * 8;
                       return (
                          <div 
                            key={folder.path}
                            onClick={() => navigateTo(folder.name)}
                            className="flex items-center gap-1.5 py-1 cursor-pointer text-slate-500 hover:text-[#00A3FF] transition-colors"
                            style={{ paddingLeft: `${indent}px` }}
                          >
                             <span className="material-symbols-outlined text-[16px] text-amber-400">folder</span>
                             <span className="truncate">{folder.name}</span>
                          </div>
                       );
                    })}
                 </div>
              </div>
           </div>
        </aside>

        {/* Workspace Display Card */}
        <div
          ref={dropZoneRef}
          className={`flex-1 bg-white border rounded-xl shadow-sm transition-all overflow-hidden flex flex-col relative ${isDragging ? "border-[#00A3FF] bg-[#00A3FF]/5 scale-[0.99]" : "border-slate-200"}`}
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          {isDragging && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-sm rounded-xl pointer-events-none">
              <div className="text-center animate-bounce">
                <span className="material-symbols-outlined text-[#00A3FF] text-7xl">cloud_upload</span>
                <p className="text-[#00A3FF] font-black text-base uppercase tracking-widest mt-4">Soltar para subir</p>
              </div>
            </div>
          )}

          {/* Windows-like address bar & view toggle */}
          <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50 justify-between">
            <div className="flex items-center gap-2">
              <button 
                onClick={navigateUp}
                disabled={currentPath === "/"}
                className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all flex items-center justify-center disabled:opacity-30 shadow-sm"
                title="Subir un nivel"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
              </button>
              <button 
                onClick={() => refetch()}
                className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all flex items-center justify-center shadow-sm"
                title="Actualizar"
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
              </button>
            </div>

            <form onSubmit={handlePathSubmit} className="flex-1 flex items-center bg-white border border-slate-200 rounded-lg px-3 py-1 shadow-inner gap-2">
              <span className="material-symbols-outlined text-[16px] text-slate-400">folder_open</span>
              <input 
                type="text" 
                value={pathInput}
                onChange={e => setPathInput(e.target.value)}
                className="bg-transparent border-none outline-none text-slate-700 w-full text-xs font-mono"
              />
              <button 
                type="button" 
                onClick={() => {
                  navigator.clipboard.writeText("/home/user" + currentPath);
                  alert("Ruta copiada: /home/user" + currentPath);
                }}
                className="text-slate-400 hover:text-[#00A3FF] transition-colors"
                title="Copiar ruta absoluta"
              >
                <span className="material-symbols-outlined text-[14px]">content_copy</span>
              </button>
            </form>

            <div className="flex items-center border border-slate-200 rounded-lg bg-white p-0.5 shadow-sm">
              <button 
                type="button"
                onClick={() => setViewMode("grid")}
                className={`px-2 py-1 rounded-md transition-all flex items-center justify-center ${viewMode === "grid" ? "bg-[#00A3FF] text-white" : "text-slate-500 hover:bg-slate-50"}`}
                title="Vista de Iconos"
              >
                <span className="material-symbols-outlined text-[16px]">grid_view</span>
              </button>
              <button 
                type="button"
                onClick={() => setViewMode("list")}
                className={`px-2 py-1 rounded-md transition-all flex items-center justify-center ${viewMode === "list" ? "bg-[#00A3FF] text-white" : "text-slate-500 hover:bg-slate-50"}`}
                title="Vista de Detalles"
              >
                <span className="material-symbols-outlined text-[16px]">format_list_bulleted</span>
              </button>
            </div>
          </div>

          {/* Main workspace listing area */}
          <div className="flex-1 overflow-auto custom-scrollbar p-4">
            {isLoading && (
              <div className="py-20 text-center">
                <div className="flex flex-col items-center gap-3">
                   <div className="w-8 h-8 border-[3px] border-[#00A3FF]/20 border-t-[#00A3FF] rounded-full animate-spin"></div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Escaneando archivos...</p>
                </div>
              </div>
            )}

            {!isLoading && files?.length === 0 && (
              <div className="py-20 text-center">
                 <div className="flex flex-col items-center opacity-30">
                    <span className="material-symbols-outlined text-5xl text-slate-400">folder_off</span>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2">Directorio Vacío</p>
                 </div>
              </div>
            )}

            {!isLoading && files && files.length > 0 && (
              viewMode === "grid" ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {currentPath !== "/" && (
                    <div 
                      onClick={() => navigateTo("..")}
                      className="flex flex-col items-center justify-center p-3 rounded-lg border border-dashed border-slate-200 hover:border-[#00A3FF] hover:bg-[#00A3FF]/5 cursor-pointer group transition-all text-center aspect-square"
                    >
                      <span className="material-symbols-outlined text-2xl text-[#00A3FF] mb-1.5 group-hover:-translate-x-0.5 transition-transform">keyboard_backspace</span>
                      <span className="text-[10px] font-bold text-[#00A3FF] uppercase tracking-wider">Atrás</span>
                    </div>
                  )}

                  {files.map((file) => (
                    <div 
                      key={file.path}
                      className="flex flex-col items-center justify-center p-3 bg-white border border-slate-100 hover:border-[#00A3FF]/30 hover:bg-[#00A3FF]/5 hover:shadow-sm rounded-lg cursor-pointer group transition-all text-center relative aspect-square"
                      onClick={() => file.isDirectory && navigateTo(file.name)}
                    >
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-1.5 shadow-sm transition-all group-hover:scale-105 ${
                        file.isDirectory ? "bg-amber-50 text-amber-500 border border-amber-100/50" : "bg-slate-50 text-slate-400 border border-slate-100/50"
                      }`}>
                        <span className="material-symbols-outlined text-2xl">
                          {getFileIcon(file.name, file.isDirectory)}
                        </span>
                      </div>

                      {renameTarget === file.path ? (
                        <div className="w-full px-1" onClick={e => e.stopPropagation()}>
                          <input
                            autoFocus
                            value={renameValue}
                            onChange={e => setRenameValue(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") confirmRename(); if (e.key === "Escape") setRenameTarget(null); }}
                            className="w-full bg-slate-50 border border-[#00A3FF] rounded px-1.5 py-0.5 text-[10px] text-slate-900 font-bold focus:outline-none text-center shadow-inner"
                          />
                          <div className="flex justify-center gap-1 mt-1">
                            <button onClick={confirmRename} className="w-5 h-5 rounded bg-[#00A3FF] text-white flex items-center justify-center shadow-sm">
                              <span className="material-symbols-outlined text-[10px]">check</span>
                            </button>
                            <button onClick={() => setRenameTarget(null)} className="w-5 h-5 rounded bg-slate-100 text-slate-400 flex items-center justify-center">
                              <span className="material-symbols-outlined text-[10px]">close</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <span className={`text-[11px] font-bold text-slate-700 truncate w-full px-1 ${file.isDirectory ? "group-hover:text-[#00A3FF]" : ""}`} title={file.name}>
                            {file.name}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono mt-0.5">
                            {file.isDirectory ? "Carpeta" : formatSize(file.size)}
                          </span>
                        </>
                      )}

                      {renameTarget !== file.path && (
                        <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 backdrop-blur-sm p-0.5 rounded border border-slate-100 shadow-sm" onClick={e => e.stopPropagation()}>
                          {!file.isDirectory && isTextFile(file.name) && (
                            <button onClick={() => openEditor(file.path, file.name)} className="w-5 h-5 rounded bg-slate-50 border border-slate-200 text-slate-500 hover:text-[#00A3FF] hover:border-[#00A3FF]/30 transition-all flex items-center justify-center" title="Editar">
                              <span className="material-symbols-outlined text-[12px]">edit</span>
                            </button>
                          )}
                          {!file.isDirectory && isArchive(file.name) && (
                            <button onClick={() => extractArchive(file.path)} disabled={extracting === file.path} className="w-5 h-5 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center" title="Extraer">
                              <span className={`material-symbols-outlined text-[12px] ${extracting === file.path ? "animate-spin" : ""}`}>
                                {extracting === file.path ? "refresh" : "folder_zip"}
                              </span>
                            </button>
                          )}
                          <button onClick={() => startRename(file)} className="w-5 h-5 rounded bg-slate-50 border border-slate-200 text-slate-500 hover:text-[#00A3FF] transition-all flex items-center justify-center" title="Renombrar">
                            <span className="material-symbols-outlined text-[12px]">drive_file_rename_outline</span>
                          </button>
                          {!file.isDirectory && (
                            <a href={`${API_BASE}/odin-panel/files/download?path=${encodeURIComponent(file.path)}`} target="_blank" className="w-5 h-5 rounded bg-slate-50 border border-slate-200 text-slate-500 hover:text-[#00A3FF] transition-all flex items-center justify-center" title="Descargar">
                              <span className="material-symbols-outlined text-[12px]">download</span>
                            </a>
                          )}
                          <button onClick={() => handleDelete(file.path, file.isDirectory)} className="w-5 h-5 rounded bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center" title="Eliminar">
                            <span className="material-symbols-outlined text-[12px]">delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left whitespace-nowrap">
                    <thead>
                      <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 bg-slate-50/20">
                        <th className="px-4 py-2">Nombre del Elemento</th>
                        <th className="px-4 py-2">Tamaño</th>
                        <th className="px-4 py-2">Fecha</th>
                        <th className="px-4 py-2">Permisos</th>
                        <th className="px-4 py-2 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {currentPath !== "/" && (
                        <tr className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => navigateTo("..")}>
                          <td className="px-4 py-2 flex items-center gap-2 text-[#00A3FF]">
                            <span className="material-symbols-outlined text-[16px]">keyboard_backspace</span>
                            <span className="font-bold text-[10px] uppercase tracking-wider">Volver al Directorio Anterior</span>
                          </td>
                          <td colSpan={4}></td>
                        </tr>
                      )}

                      {files.map((file) => (
                        <tr key={file.path} className="hover:bg-slate-50/50 transition-colors group border-l-2 border-transparent hover:border-l-[#00A3FF]">
                          <td className="px-4 py-1.5">
                            {renameTarget === file.path ? (
                              <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                <input
                                  autoFocus
                                  value={renameValue}
                                  onChange={e => setRenameValue(e.target.value)}
                                  onKeyDown={e => { if (e.key === "Enter") confirmRename(); if (e.key === "Escape") setRenameTarget(null); }}
                                  className="bg-slate-50 border border-[#00A3FF] rounded px-2 py-0.5 text-xs text-slate-900 font-bold focus:outline-none w-64 shadow-inner"
                                />
                                <button onClick={confirmRename} className="w-6 h-6 rounded bg-[#00A3FF] text-white flex items-center justify-center shadow-sm">
                                  <span className="material-symbols-outlined text-[12px]">check</span>
                                </button>
                                <button onClick={() => setRenameTarget(null)} className="w-6 h-6 rounded bg-slate-100 text-slate-400 flex items-center justify-center">
                                  <span className="material-symbols-outlined text-[12px]">close</span>
                                </button>
                              </div>
                            ) : (
                              <div
                                className="flex items-center gap-2.5 cursor-pointer"
                                onClick={() => file.isDirectory && navigateTo(file.name)}
                              >
                                <span className={`material-symbols-outlined text-[18px] ${file.isDirectory ? "text-amber-500" : "text-slate-400"}`}>
                                  {getFileIcon(file.name, file.isDirectory)}
                                </span>
                                <span className={`text-xs font-bold tracking-tight ${file.isDirectory ? "text-slate-900 group-hover:text-[#00A3FF]" : "text-slate-600"} transition-colors`}>
                                  {file.name}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-1.5 text-slate-400 text-xs font-semibold font-mono">
                            {file.isDirectory ? "—" : formatSize(file.size)}
                          </td>
                          <td className="px-4 py-1.5 text-slate-400 text-xs font-semibold font-mono">
                            {new Date(file.lastModified).toLocaleDateString("es-ES")}
                          </td>
                          <td className="px-4 py-1.5 text-slate-300 text-xs font-mono">{file.permissions}</td>
                          <td className="px-4 py-1.5 text-right">
                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                              {!file.isDirectory && isTextFile(file.name) && (
                                <button onClick={() => openEditor(file.path, file.name)} className="w-6 h-6 rounded bg-white border border-slate-200 text-slate-400 hover:text-[#00A3FF] hover:border-[#00A3FF]/30 transition-all flex items-center justify-center shadow-sm" title="Editar">
                                  <span className="material-symbols-outlined text-[14px]">edit</span>
                                </button>
                              )}
                              {!file.isDirectory && isArchive(file.name) && (
                                <button onClick={() => extractArchive(file.path)} disabled={extracting === file.path} className="w-6 h-6 rounded bg-emerald-50 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center shadow-sm" title="Extraer">
                                   <span className={`material-symbols-outlined text-[14px] ${extracting === file.path ? "animate-spin" : ""}`}>
                                     {extracting === file.path ? "refresh" : "folder_zip"}
                                   </span>
                                </button>
                              )}
                              <button onClick={() => startRename(file)} className="w-6 h-6 rounded bg-white border border-slate-200 text-slate-400 hover:text-[#00A3FF] transition-all flex items-center justify-center shadow-sm" title="Renombrar">
                                <span className="material-symbols-outlined text-[14px]">drive_file_rename_outline</span>
                              </button>
                              {!file.isDirectory && (
                                <a href={`${API_BASE}/odin-panel/files/download?path=${encodeURIComponent(file.path)}`} target="_blank" className="w-6 h-6 rounded bg-white border border-slate-200 text-slate-400 hover:text-[#00A3FF] transition-all flex items-center justify-center shadow-sm" title="Descargar">
                                  <span className="material-symbols-outlined text-[14px]">download</span>
                                </a>
                              )}
                              <button onClick={() => handleDelete(file.path, file.isDirectory)} className="w-6 h-6 rounded bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shadow-sm" title="Eliminar">
                                <span className="material-symbols-outlined text-[14px]">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>

          <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
              Ruta: <span className="text-slate-500">/home/user{currentPath}</span>
            </p>
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
              {files?.length ?? 0} elementos cargados
            </p>
          </div>
        </div>
      </div>

      {editorOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => !editorSaving && setEditorOpen(false)} />
          <div className="relative z-10 w-full max-w-6xl h-[85vh] flex flex-col bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[#00A3FF] shadow-sm">
                   <span className="material-symbols-outlined text-lg">edit_document</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">{editorFile?.name}</h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{editorFile?.path}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={saveEditor}
                  disabled={editorSaving || editorLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00A3FF] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#008EE0] active:scale-95 transition-all shadow-md shadow-[#00A3FF]/10 disabled:opacity-40"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  {editorSaving ? "Guardando..." : "Guardar Archivo"}
                </button>
                <button
                  onClick={() => setEditorOpen(false)}
                  disabled={editorSaving}
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-slate-900 transition-all shadow-sm"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden relative bg-slate-900">
              {editorLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-8 h-8 border-3 border-white/10 border-t-[#00A3FF] rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Cargando código...</p>
                  </div>
                </div>
              ) : (
                <textarea
                  value={editorContent}
                  onChange={e => setEditorContent(e.target.value)}
                  spellCheck={false}
                  className="w-full h-full bg-transparent text-emerald-400 font-mono text-xs resize-none focus:outline-none p-6 leading-relaxed custom-scrollbar"
                  style={{ tabSize: 2 }}
                />
              )}
            </div>

            <div className="px-6 py-2 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                {editorContent.split("\n").length} líneas · UTF-8
              </span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                Editor Odisea Cloud v1.0
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
