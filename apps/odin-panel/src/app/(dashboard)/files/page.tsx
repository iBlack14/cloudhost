"use client";

import { useState, useRef, useCallback } from "react";
import { useFiles, useDeleteFile, useCreateFolder, useUploadFiles } from "../../../lib/hooks/use-files";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";
const ODIN_KEY = "odin-access-token";
const getToken = () => (typeof window !== "undefined" ? window.sessionStorage.getItem(ODIN_KEY) : null);
const authHeaders = (extra: Record<string, string> = {}) => {
  const t = getToken();
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

  // ── File Editor ──────────────────────────────────────────────────
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

  // ── Rename ───────────────────────────────────────────────────────
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

  // ── Extract ──────────────────────────────────────────────────────
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

  // ── Upload ───────────────────────────────────────────────────────
  const handleUploadFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    uploadMutation.mutate({ path: currentPath, files: fileList });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleUploadFiles(e.dataTransfer.files);
  }, [currentPath]);

  // ── Navigation ───────────────────────────────────────────────────
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
    <div className="flex flex-col h-[calc(100vh-8rem)] space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-headline font-black text-white tracking-tighter uppercase italic">
            File <span className="text-zinc-600">Manager</span>
          </h1>
          <p className="text-zinc-500 text-xs font-mono tracking-widest mt-1">
            Gestiona archivos del servidor directamente desde el navegador.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleCreateFolder} className="flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-zinc-300 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:text-white transition-all">
            <span className="material-symbols-outlined text-[16px]">create_new_folder</span>
            Nueva Carpeta
          </button>
          <input type="file" ref={fileInputRef} onChange={e => handleUploadFiles(e.target.files)} className="hidden" multiple />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-zinc-300 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]">upload</span>
            {uploadMutation.isPending ? "Subiendo..." : "Subir Archivos"}
          </button>
          <button onClick={() => refetch()} className="flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-zinc-300 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:text-white transition-all">
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            Actualizar
          </button>
        </div>
      </div>

      {/* ── Main Panel ── */}
      <div
        ref={dropZoneRef}
        className={`flex-1 bg-zinc-900/60 rounded-2xl border transition-all overflow-hidden flex flex-col ${isDragging ? "border-primary/60 bg-primary/5" : "border-white/5"}`}
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl pointer-events-none">
            <div className="text-center">
              <span className="material-symbols-outlined text-primary text-6xl">cloud_upload</span>
              <p className="text-primary font-black text-sm uppercase tracking-widest mt-2">Suelta los archivos aquí</p>
            </div>
          </div>
        )}

        {/* Breadcrumbs */}
        <div className="px-6 py-3 border-b border-white/5 flex items-center gap-2 text-xs text-zinc-500 bg-white/[0.02]">
          <span
            onClick={() => setCurrentPath("/")}
            className="hover:text-primary cursor-pointer transition-colors font-mono font-bold"
          >
            ~/home
          </span>
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            const target = "/" + breadcrumbs.slice(0, idx + 1).join("/");
            return (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-zinc-700">/</span>
                <span
                  onClick={() => !isLast && setCurrentPath(target)}
                  className={`font-mono font-bold ${isLast ? "text-primary" : "hover:text-white cursor-pointer transition-colors"}`}
                >
                  {crumb}
                </span>
              </div>
            );
          })}
        </div>

        {/* File Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="sticky top-0 z-10 bg-zinc-900 border-b border-white/5">
              <tr className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em]">
                <th className="px-6 py-3">Nombre</th>
                <th className="px-4 py-3">Tamaño</th>
                <th className="px-4 py-3">Modificado</th>
                <th className="px-4 py-3">Permisos</th>
                <th className="px-6 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {isLoading && (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-zinc-600 text-xs font-mono">
                    <span className="material-symbols-outlined animate-spin text-3xl block mb-2">refresh</span>
                    Cargando archivos...
                  </td>
                </tr>
              )}

              {!isLoading && currentPath !== "/" && (
                <tr className="hover:bg-white/[0.02] cursor-pointer transition-colors" onClick={() => navigateTo("..")}>
                  <td className="px-6 py-3 flex items-center gap-3">
                    <span className="material-symbols-outlined text-zinc-600 text-[18px]">keyboard_backspace</span>
                    <span className="text-zinc-400 font-medium text-xs">.. Volver</span>
                  </td>
                  <td colSpan={4}></td>
                </tr>
              )}

              {!isLoading && files?.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-zinc-700 text-xs font-mono">
                    Directorio vacío. Arrastra archivos aquí para subirlos.
                  </td>
                </tr>
              )}

              {!isLoading && files?.map((file) => (
                <tr key={file.path} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-3">
                    {renameTarget === file.path ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") confirmRename(); if (e.key === "Escape") setRenameTarget(null); }}
                          className="bg-white/10 border border-primary/40 rounded-lg px-3 py-1 text-sm text-white focus:outline-none w-48"
                        />
                        <button onClick={confirmRename} className="text-primary hover:text-white transition-colors">
                          <span className="material-symbols-outlined text-[16px]">check</span>
                        </button>
                        <button onClick={() => setRenameTarget(null)} className="text-zinc-500 hover:text-white transition-colors">
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      </div>
                    ) : (
                      <div
                        className="flex items-center gap-3 cursor-pointer"
                        onClick={() => file.isDirectory && navigateTo(file.name)}
                      >
                        <span className={`material-symbols-outlined text-[20px] ${
                          file.isDirectory ? "text-amber-400" :
                          file.name.endsWith(".php") ? "text-purple-400" :
                          file.name.endsWith(".html") || file.name.endsWith(".htm") ? "text-orange-400" :
                          file.name.endsWith(".css") ? "text-blue-400" :
                          file.name.endsWith(".js") || file.name.endsWith(".ts") ? "text-yellow-400" :
                          isArchive(file.name) ? "text-green-400" :
                          "text-zinc-400"
                        }`}>
                          {getFileIcon(file.name, file.isDirectory)}
                        </span>
                        <span className={`font-medium text-xs ${file.isDirectory ? "text-white group-hover:text-primary" : "text-zinc-300"} transition-colors`}>
                          {file.name}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 text-xs font-mono">
                    {file.isDirectory ? "—" : formatSize(file.size)}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 text-xs font-mono">
                    {new Date(file.lastModified).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3 text-zinc-700 text-xs font-mono">{file.permissions}</td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Edit button — text files only */}
                      {!file.isDirectory && isTextFile(file.name) && (
                        <button
                          onClick={() => openEditor(file.path, file.name)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                          title="Editar archivo"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                      )}
                      {/* Extract button — archives only */}
                      {!file.isDirectory && isArchive(file.name) && (
                        <button
                          onClick={() => extractArchive(file.path)}
                          disabled={extracting === file.path}
                          className="p-1.5 rounded-lg text-green-400 hover:text-white hover:bg-green-500/20 transition-all disabled:opacity-50"
                          title="Extraer archivo"
                        >
                          <span className={`material-symbols-outlined text-[16px] ${extracting === file.path ? "animate-spin" : ""}`}>
                            {extracting === file.path ? "refresh" : "folder_zip"}
                          </span>
                        </button>
                      )}
                      {/* Rename */}
                      <button
                        onClick={() => startRename(file)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                        title="Renombrar"
                      >
                        <span className="material-symbols-outlined text-[16px]">drive_file_rename_outline</span>
                      </button>
                      {/* Download */}
                      {!file.isDirectory && (
                        <a
                          href={`${API_BASE}/odin-panel/files/download?path=${encodeURIComponent(file.path)}`}
                          target="_blank"
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                          title="Descargar"
                        >
                          <span className="material-symbols-outlined text-[16px]">download</span>
                        </a>
                      )}
                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(file.path, file.isDirectory)}
                        className="p-1.5 rounded-lg text-red-500/60 hover:text-white hover:bg-red-500/20 transition-all"
                        title="Eliminar"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Status bar */}
        <div className="px-6 py-2 border-t border-white/5 bg-white/[0.01] flex items-center justify-between">
          <p className="text-[10px] font-mono text-zinc-700">
            /home/user{currentPath !== "/" ? currentPath : ""}
          </p>
          <p className="text-[10px] font-mono text-zinc-700">
            {files?.length ?? 0} elementos
          </p>
        </div>
      </div>

      {/* ── Editor Modal ── */}
      {editorOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => !editorSaving && setEditorOpen(false)} />
          <div className="relative z-10 w-full max-w-5xl h-[80vh] flex flex-col bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            {/* Editor header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-[18px]">edit_document</span>
                <div>
                  <h3 className="text-sm font-black text-white font-mono">{editorFile?.name}</h3>
                  <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{editorFile?.path}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {editorError && (
                  <span className="text-xs text-red-400 font-mono">{editorError}</span>
                )}
                <button
                  onClick={saveEditor}
                  disabled={editorSaving || editorLoading}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-black text-xs font-black uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  {editorSaving ? "Guardando..." : "Guardar"}
                </button>
                <button
                  onClick={() => setEditorOpen(false)}
                  disabled={editorSaving}
                  className="w-9 h-9 flex items-center justify-center rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            </div>

            {/* Editor body */}
            <div className="flex-1 overflow-hidden relative">
              {editorLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <span className="material-symbols-outlined animate-spin text-primary text-4xl block mb-3">refresh</span>
                    <p className="text-zinc-500 text-xs font-mono">Cargando archivo...</p>
                  </div>
                </div>
              ) : (
                <textarea
                  value={editorContent}
                  onChange={e => setEditorContent(e.target.value)}
                  spellCheck={false}
                  className="w-full h-full bg-transparent text-zinc-200 font-mono text-sm resize-none focus:outline-none p-6 leading-relaxed"
                  style={{ tabSize: 2 }}
                  placeholder="Archivo vacío..."
                />
              )}
            </div>

            {/* Editor footer */}
            <div className="px-6 py-2 border-t border-white/5 bg-white/[0.02] flex items-center justify-between">
              <span className="text-[10px] font-mono text-zinc-600">
                {editorContent.split("\n").length} líneas · {editorContent.length} caracteres
              </span>
              <span className="text-[10px] font-mono text-zinc-600">
                Ctrl+S para guardar · Esc para cerrar
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
