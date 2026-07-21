"use client";

import { useState, useRef, useCallback, useEffect, useMemo, type FormEvent } from "react";
import {
  useFiles, useDeleteFile, useCreateFolder, useUploadFiles,
  useMoveFile, useCopyFile, type FileItem,
} from "../../../lib/hooks/use-files";
import { getOdinAccessToken } from "../../../lib/api";

// ─── API Base ─────────────────────────────────────────────────────────────────
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

// ─── Constants ────────────────────────────────────────────────────────────────
const TEXT_EXTENSIONS = [
  ".php", ".html", ".htm", ".css", ".js", ".ts", ".jsx", ".tsx",
  ".json", ".xml", ".txt", ".md", ".conf", ".ini", ".env", ".sh",
  ".yaml", ".yml", ".htaccess", ".htpasswd", ".log", ".sql",
];
const ARCHIVE_EXTENSIONS = [".zip", ".tar", ".tar.gz", ".tgz", ".tar.bz2"];

const isTextFile = (name: string) => TEXT_EXTENSIONS.some((e) => name.toLowerCase().endsWith(e));
const isArchive  = (name: string) => ARCHIVE_EXTENSIONS.some((e) => name.toLowerCase().endsWith(e));

const formatSize = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const k = 1024, sizes = ["B","KB","MB","GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

const formatDate = (str: string) => {
  if (!str) return "—";
  return new Date(str).toLocaleString("es-ES", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
};

const getFileIcon = (name: string, isDir: boolean) => {
  if (isDir) return "folder";
  if (name.endsWith(".php")) return "code";
  if (name.endsWith(".html") || name.endsWith(".htm")) return "html";
  if (name.endsWith(".css")) return "css";
  if ([".js",".ts",".jsx",".tsx"].some(e => name.endsWith(e))) return "javascript";
  if (name.endsWith(".json")) return "data_object";
  if (isArchive(name)) return "archive";
  if ([".jpg",".jpeg",".png",".gif",".svg",".webp"].some(e => name.toLowerCase().endsWith(e))) return "image";
  if (name.endsWith(".pdf")) return "picture_as_pdf";
  return "draft";
};

const getFileIconColor = (name: string, isDir: boolean) => {
  if (isDir) return "text-amber-400";
  if (name.endsWith(".php")) return "text-violet-400";
  if (name.endsWith(".html") || name.endsWith(".htm")) return "text-orange-400";
  if (name.endsWith(".css")) return "text-blue-400";
  if ([".js",".ts",".jsx",".tsx"].some(e => name.endsWith(e))) return "text-yellow-400";
  if (name.endsWith(".json")) return "text-emerald-400";
  if (isArchive(name)) return "text-rose-400";
  if ([".jpg",".jpeg",".png",".gif",".svg",".webp"].some(e => name.toLowerCase().endsWith(e))) return "text-pink-400";
  return "text-slate-400";
};

const getFileBadge = (name: string) => {
  if (name.endsWith(".php"))  return { label:"PHP",  color:"bg-violet-100 text-violet-600" };
  if (name.endsWith(".html") || name.endsWith(".htm")) return { label:"HTML", color:"bg-orange-100 text-orange-600" };
  if (name.endsWith(".css"))  return { label:"CSS",  color:"bg-blue-100 text-blue-600" };
  if (name.endsWith(".js"))   return { label:"JS",   color:"bg-yellow-100 text-yellow-700" };
  if (name.endsWith(".ts"))   return { label:"TS",   color:"bg-sky-100 text-sky-700" };
  if (name.endsWith(".json")) return { label:"JSON", color:"bg-emerald-100 text-emerald-700" };
  if (name.endsWith(".sh"))   return { label:"SH",   color:"bg-slate-800 text-slate-100" };
  if (isArchive(name))        return { label:"ZIP",  color:"bg-rose-100 text-rose-600" };
  return null;
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface Toast { id: string; message: string; type: "success"|"error"|"info"|"warning"; }
interface ContextMenuState { x: number; y: number; file: FileItem; }
interface ConfirmState { title: string; message: string; danger?: boolean; onConfirm: () => void; }

// ─── Toast Component ──────────────────────────────────────────────────────────
function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  const icons: Record<string,string> = { success:"check_circle", error:"error", info:"info", warning:"warning" };
  const colors: Record<string,string> = { success:"bg-emerald-500", error:"bg-red-500", info:"bg-[#00A3FF]", warning:"bg-amber-500" };
  return (
    <div className="fixed bottom-6 right-6 z-[600] flex flex-col gap-2 pointer-events-none min-w-[280px] max-w-sm">
      {toasts.map((t) => (
        <div key={t.id} className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-white text-xs font-bold animate-in slide-in-from-bottom-4 duration-300 ${colors[t.type]}`}>
          <span className="material-symbols-outlined text-[18px] flex-shrink-0">{icons[t.type]}</span>
          <span className="flex-1 leading-snug">{t.message}</span>
          <button onClick={() => onDismiss(t.id)} className="opacity-70 hover:opacity-100 transition-opacity">
            <span className="material-symbols-outlined text-[14px]">close</span>
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────
function ConfirmDialog({ title, message, danger=true, onConfirm, onCancel }: ConfirmState & { onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 bg-[#161b22] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/50 p-6 max-w-sm w-full animate-in zoom-in-95 duration-200">
        <div className="flex items-start gap-4 mb-5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${danger ? "bg-red-500/10" : "bg-[#00A3FF]/10"}`}>
            <span className={`material-symbols-outlined text-xl ${danger ? "text-red-400" : "text-[#00A3FF]"}`}>{danger ? "warning" : "help"}</span>
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-200">{title}</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl bg-white/5 text-slate-400 text-xs font-bold hover:bg-white/10 transition-all">Cancelar</button>
          <button onClick={onConfirm} className={`px-4 py-2 rounded-xl text-white text-xs font-bold transition-all active:scale-95 ${danger ? "bg-red-500 hover:bg-red-600" : "bg-[#00A3FF] hover:bg-[#008EE0]"}`}>
            {danger ? "Eliminar" : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Folder Picker Modal ──────────────────────────────────────────────────────
function FolderPickerModal({ title, subtitle, confirmLabel, onConfirm, onCancel }: {
  title: string; subtitle: string; confirmLabel: string;
  onConfirm: (destPath: string) => void; onCancel: () => void;
}) {
  const [navPath, setNavPath]     = useState("/");
  const [navFolders, setNavFolders] = useState<FileItem[]>([]);
  const [loading, setLoading]     = useState(false);

  const loadFolder = async (path: string) => {
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/odin-panel/files?path=${encodeURIComponent(path)}`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setNavFolders((data.data ?? []).filter((f: FileItem) => f.isDirectory));
    } finally { setLoading(false); }
  };

  useEffect(() => { loadFolder(navPath); }, [navPath]);

  const navUp      = () => { const p = navPath.split("/").filter(Boolean); p.pop(); setNavPath("/" + p.join("/")); };
  const breadcrumbs = navPath.split("/").filter(Boolean);

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 bg-[#161b22] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/50 w-full max-w-md animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#00A3FF]/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-[#00A3FF] text-lg">drive_file_move</span>
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-200">{title}</h3>
            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider mt-0.5">{subtitle}</p>
          </div>
        </div>
        {/* Nav breadcrumb */}
        <div className="px-3 py-2 bg-black/20 border-b border-white/[0.06] flex items-center gap-1.5">
          <button onClick={navUp} disabled={navPath==="/"} className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:bg-white/10 hover:text-slate-400 disabled:opacity-30 transition-all">
            <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
          </button>
          <div className="flex items-center gap-1 text-xs overflow-x-auto flex-1 min-w-0">
            <button onClick={() => setNavPath("/")} className="text-slate-500 hover:text-[#00A3FF] transition-colors font-mono shrink-0">/</button>
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1 shrink-0">
                <span className="text-slate-700">/</span>
                <button onClick={() => setNavPath("/"+breadcrumbs.slice(0,i+1).join("/"))} className="hover:text-[#00A3FF] transition-colors font-mono text-slate-500">{crumb}</button>
              </span>
            ))}
          </div>
        </div>
        {/* Folder list */}
        <div className="p-2 h-48 overflow-y-auto custom-scrollbar">
          {loading && <div className="flex justify-center items-center h-full"><div className="w-5 h-5 border-2 border-[#00A3FF]/20 border-t-[#00A3FF] rounded-full animate-spin"/></div>}
          {!loading && navFolders.length===0 && (
            <div className="flex flex-col items-center justify-center h-full opacity-30">
              <span className="material-symbols-outlined text-3xl text-slate-500">folder_off</span>
              <p className="text-xs text-slate-500 mt-1.5">Sin subcarpetas</p>
            </div>
          )}
          {!loading && navFolders.map((f) => (
            <button key={f.path} onClick={() => setNavPath(f.path)} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 hover:text-[#00A3FF] transition-all text-left text-xs font-medium text-slate-400 group">
              <span className="material-symbols-outlined text-[16px] text-amber-400">folder</span>
              <span className="flex-1 truncate font-mono">{f.name}</span>
              <span className="material-symbols-outlined text-[13px] text-slate-700 group-hover:text-[#00A3FF]">chevron_right</span>
            </button>
          ))}
        </div>
        {/* Destination */}
        <div className="px-4 py-2.5 bg-[#00A3FF]/5 border-t border-[#00A3FF]/10">
          <p className="text-[9px] font-black text-slate-600 uppercase tracking-wider">Destino</p>
          <p className="text-xs font-mono text-slate-400 font-bold mt-0.5 truncate">{navPath||"/"}</p>
        </div>
        {/* Actions */}
        <div className="px-4 py-3 border-t border-white/[0.06] flex gap-2 justify-end bg-black/20">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl bg-white/5 text-slate-400 text-xs font-bold hover:bg-white/10 transition-all">Cancelar</button>
          <button onClick={() => onConfirm(navPath)} className="px-4 py-2 rounded-xl bg-[#00A3FF] text-white text-xs font-bold hover:bg-[#008EE0] transition-all flex items-center gap-1.5 active:scale-95">
            <span className="material-symbols-outlined text-[14px]">done</span>{confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── New File Modal ───────────────────────────────────────────────────────────
function NewFileModal({ currentPath, onConfirm, onCancel, loading }: {
  currentPath: string; onConfirm: (name: string) => void; onCancel: () => void; loading: boolean;
}) {
  const [name, setName] = useState("");
  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 bg-[#161b22] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/50 p-6 max-w-sm w-full animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-[#00A3FF]/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-[#00A3FF] text-lg">note_add</span>
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-200">Crear archivo</h3>
            <p className="text-[10px] text-slate-600 font-mono mt-0.5">{currentPath}</p>
          </div>
        </div>
        <input autoFocus type="text" value={name} onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key==="Enter"&&name.trim()) onConfirm(name.trim()); if (e.key==="Escape") onCancel(); }}
          placeholder="nombre-archivo.txt"
          className="w-full bg-black/30 border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-slate-300 font-mono focus:outline-none focus:border-[#00A3FF]/50 transition-all placeholder:text-slate-700"
        />
        <div className="flex gap-2 justify-end mt-4">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl bg-white/5 text-slate-400 text-xs font-bold hover:bg-white/10 transition-all">Cancelar</button>
          <button onClick={() => name.trim()&&onConfirm(name.trim())} disabled={!name.trim()||loading}
            className="px-4 py-2 rounded-xl bg-[#00A3FF] text-white text-xs font-bold hover:bg-[#008EE0] transition-all disabled:opacity-40 flex items-center gap-1.5 active:scale-95">
            {loading ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <span className="material-symbols-outlined text-[14px]">add</span>}
            Crear
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Context Menu ─────────────────────────────────────────────────────────────
function ContextMenu({ menu, onClose, onEdit, onRename, onMove, onCopy, onDownload, onCompress, onExtract, onDelete, extracting, compressing }: {
  menu: ContextMenuState; onClose: () => void;
  onEdit?: () => void; onRename: () => void; onMove: () => void; onCopy: () => void;
  onDownload?: () => void; onCompress: () => void; onExtract?: () => void; onDelete: () => void;
  extracting: boolean; compressing: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect();
      if (r.right  > window.innerWidth)  ref.current.style.left = `${menu.x - r.width}px`;
      if (r.bottom > window.innerHeight) ref.current.style.top  = `${menu.y - r.height}px`;
    }
  }, [menu]);

  const item = (icon: string, label: string, action: () => void, color="text-slate-400", disabled=false) => (
    <button onClick={() => { if (!disabled) { action(); onClose(); } }} disabled={disabled}
      className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-semibold rounded-lg hover:bg-white/5 transition-colors text-left disabled:opacity-40 ${color}`}>
      <span className={`material-symbols-outlined text-[15px] ${color}`}>{icon}</span>{label}
    </button>
  );

  return (
    <div ref={ref} style={{ top: menu.y, left: menu.x }} onClick={(e) => e.stopPropagation()}
      className="fixed z-[550] bg-[#161b22] border border-white/[0.08] rounded-xl shadow-2xl shadow-black/50 p-1.5 min-w-[175px] animate-in zoom-in-95 fade-in duration-150">
      <p className="px-3 py-1 text-[9px] font-black text-slate-600 uppercase tracking-wider truncate max-w-[155px]">{menu.file.name}</p>
      <div className="border-t border-white/[0.06] my-1"/>
      {onEdit    && item("edit",                    "Editar",      onEdit,    "text-[#00A3FF]")}
      {            item("drive_file_rename_outline","Renombrar",   onRename)}
      {            item("drive_file_move",          "Mover a…",    onMove)}
      {            item("content_copy",             "Copiar a…",   onCopy)}
      {onDownload && item("download",               "Descargar",   onDownload)}
      {            item("folder_zip",               compressing ? "Comprimiendo…" : "Comprimir", onCompress, "text-violet-400", compressing)}
      {onExtract  && item("unarchive",              extracting ? "Extrayendo…" : "Extraer", onExtract, "text-emerald-400", extracting)}
      <div className="border-t border-white/[0.06] my-1"/>
      {            item("delete",                   "Eliminar",    onDelete,  "text-red-400")}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function FileManagerPage() {
  // Navigation
  const [currentPath, setCurrentPath] = useState("/");
  const [viewMode, setViewMode]       = useState<"list"|"grid">("grid");
  const [pathInput, setPathInput]     = useState("/");
  // Selection
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  // Search & Sort
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey]   = useState<"name"|"size"|"date">("name");
  const [sortDir, setSortDir]   = useState<"asc"|"desc">("asc");
  // Editor
  const [editorOpen,    setEditorOpen]    = useState(false);
  const [editorFile,    setEditorFile]    = useState<{path:string;name:string}|null>(null);
  const [editorContent, setEditorContent] = useState("");
  const [editorLoading, setEditorLoading] = useState(false);
  const [editorSaving,  setEditorSaving]  = useState(false);
  const [editorError,   setEditorError]   = useState<string|null>(null);
  const [editorLine,    setEditorLine]    = useState(1);
  // Rename
  const [renameTarget, setRenameTarget] = useState<string|null>(null);
  const [renameValue,  setRenameValue]  = useState("");
  // Extract + Compress
  const [extracting,  setExtracting]  = useState<string|null>(null);
  const [compressing, setCompressing] = useState<string|null>(null);
  // Modals
  const [folderPicker,   setFolderPicker]   = useState<{title:string;subtitle:string;confirmLabel:string;files:FileItem[];type:"move"|"copy"}|null>(null);
  const [confirmDialog,  setConfirmDialog]  = useState<ConfirmState|null>(null);
  const [newFileOpen,    setNewFileOpen]    = useState(false);
  const [creatingFile,   setCreatingFile]   = useState(false);
  const [contextMenu,    setContextMenu]    = useState<ContextMenuState|null>(null);
  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);
  // Upload
  const [isDragging,      setIsDragging]      = useState(false);
  const [uploadProgress,  setUploadProgress]  = useState<number|null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef  = useRef<HTMLDivElement>(null);

  // Node.js Execution States
  const [runningNpm, setRunningNpm] = useState(false);
  const [runningScript, setRunningScript] = useState<string | null>(null);
  const [scriptModalOpen, setScriptModalOpen] = useState(false);
  const [selectedScript, setSelectedScript] = useState("");
  const [scriptOutput, setScriptOutput] = useState<string | null>(null);
  const [scriptOutputOpen, setScriptOutputOpen] = useState(false);


  // Hooks
  const { data: files, isLoading, refetch } = useFiles(currentPath);
  const deleteMutation       = useDeleteFile();
  const createFolderMutation = useCreateFolder();
  const uploadMutation       = useUploadFiles();
  const moveMutation         = useMoveFile();
  const copyMutation         = useCopyFile();

  // Toast helpers
  const addToast = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4500);
  }, []);
  const dismissToast = (id: string) => setToasts((p) => p.filter((t) => t.id !== id));
  const showConfirm  = (s: ConfirmState) => setConfirmDialog(s);
  const clearSel     = () => setSelectedFiles(new Set());

  const selectedItems = useMemo(() => (files ?? []).filter((f) => selectedFiles.has(f.path)), [files, selectedFiles]);

  // Reset on path change
  useEffect(() => { setPathInput(currentPath); setSelectedFiles(new Set()); setSearchQuery(""); }, [currentPath]);

  // Close context menu on click/scroll
  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("contextmenu", close);
    window.addEventListener("scroll", close, true);
    return () => { window.removeEventListener("click", close); window.removeEventListener("contextmenu", close); window.removeEventListener("scroll", close, true); };
  }, []);

  // Navigation
  const navigateUp = () => { const p = currentPath.split("/").filter(Boolean); p.pop(); setCurrentPath("/"+p.join("/")); };
  const navigateTo = (name: string) => {
    if (name === "..") { navigateUp(); return; }
    setCurrentPath(currentPath === "/" ? `/${name}` : `${currentPath}/${name}`);
  };
  const handlePathSubmit = (e: FormEvent) => {
    e.preventDefault();
    let t = pathInput.trim() || "/";
    if (!t.startsWith("/")) t = "/"+t;
    setCurrentPath(t);
  };

  // Sort
  const handleSort = (k: string) => {
    const key = k as typeof sortKey;
    if (sortKey === key) setSortDir((d) => d==="asc"?"desc":"asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  // Filtered + sorted files
  const displayFiles = useMemo(() => {
    if (!files) return [];
    let r = [...files];
    if (searchQuery) r = r.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
    r.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      let cmp = 0;
      if (sortKey==="name") cmp = a.name.localeCompare(b.name);
      else if (sortKey==="size") cmp = a.size - b.size;
      else cmp = new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime();
      return sortDir==="asc" ? cmp : -cmp;
    });
    return r;
  }, [files, searchQuery, sortKey, sortDir]);

  // Selection
  const toggleSelect = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFiles((p) => { const n=new Set(p); if (n.has(path)) n.delete(path); else n.add(path); return n; });
  };

  // Context menu opener
  const openCtx = (e: React.MouseEvent, file: FileItem) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x:e.clientX, y:e.clientY, file }); };

  // Editor
  const openEditor = async (filePath: string, fileName: string) => {
    setEditorFile({path:filePath,name:fileName}); setEditorContent(""); setEditorError(null); setEditorLoading(true); setEditorOpen(true); setContextMenu(null);
    try {
      const res  = await fetch(`${API_BASE}/odin-panel/files/content?path=${encodeURIComponent(filePath)}`, { headers:authHeaders() });
      const data = await res.json();
      if (!res.ok||!data.success) throw new Error(data?.error?.message??"Error al leer archivo");
      setEditorContent(data.data??"");
    } catch (err:any) { setEditorError(err.message??"No se pudo cargar"); }
    finally { setEditorLoading(false); }
  };
  const saveEditor = async () => {
    if (!editorFile) return;
    setEditorSaving(true); setEditorError(null);
    try {
      const res  = await fetch(`${API_BASE}/odin-panel/files/content`, { method:"PUT", headers:authHeaders({"Content-Type":"application/json"}), body:JSON.stringify({path:editorFile.path,content:editorContent}) });
      const data = await res.json();
      if (!res.ok||!data.success) throw new Error(data?.error?.message??"Error al guardar");
      addToast(`"${editorFile.name}" guardado`, "success"); setEditorOpen(false); refetch();
    } catch (err:any) { setEditorError(err.message??"No se pudo guardar"); }
    finally { setEditorSaving(false); }
  };
  const handleEditorKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey||e.metaKey)&&e.key==="s") { e.preventDefault(); saveEditor(); }
    if (e.key==="Tab") {
      e.preventDefault();
      const ta=e.currentTarget, s=ta.selectionStart, en=ta.selectionEnd;
      const v=editorContent.substring(0,s)+"  "+editorContent.substring(en);
      setEditorContent(v);
      requestAnimationFrame(()=>{ ta.selectionStart=ta.selectionEnd=s+2; });
    }
  };

  // Rename
  const startRename = (file: FileItem) => { setRenameTarget(file.path); setRenameValue(file.name); setContextMenu(null); };
  const confirmRename = async () => {
    if (!renameTarget||!renameValue.trim()) return;
    const dir=renameTarget.substring(0,renameTarget.lastIndexOf("/")+1);
    const newPath=dir+renameValue.trim();
    if (newPath===renameTarget) { setRenameTarget(null); return; }
    try {
      const res=await fetch(`${API_BASE}/odin-panel/files/rename`,{method:"PUT",headers:authHeaders({"Content-Type":"application/json"}),body:JSON.stringify({oldPath:renameTarget,newPath})});
      const data=await res.json();
      if (!res.ok||!data.success) throw new Error(data?.error?.message??"Error");
      setRenameTarget(null); addToast("Renombrado correctamente","success"); refetch();
    } catch (err:any) { addToast("Error al renombrar: "+err.message,"error"); }
  };

  // Move
  const openMove = (targets: FileItem[]) => { setContextMenu(null); setFolderPicker({title:targets.length===1?`Mover "${targets[0].name}"`:  `Mover ${targets.length} elementos`,subtitle:"Selecciona el directorio de destino",confirmLabel:"Mover aquí",files:targets,type:"move"}); };
  const handleMove = async (targets: FileItem[], dest: string) => {
    setFolderPicker(null); let errors=0;
    for (const file of targets) {
      const newPath=dest==="/"?`/${file.name}`:`${dest}/${file.name}`;
      try { await new Promise<void>((res,rej)=>moveMutation.mutate({oldPath:file.path,newPath},{onSuccess:()=>res(),onError:()=>rej()})); }
      catch { errors++; }
    }
    clearSel();
    if (errors===0) addToast(`${targets.length>1?targets.length+" elementos":'"'+targets[0].name+'"'} movido(s) a ${dest}`,"success");
    else addToast(`${errors} elemento(s) no se pudieron mover`,"error");
    refetch();
  };

  // Copy
  const openCopy = (targets: FileItem[]) => { setContextMenu(null); setFolderPicker({title:targets.length===1?`Copiar "${targets[0].name}"`:  `Copiar ${targets.length} elementos`,subtitle:"Selecciona el directorio de destino",confirmLabel:"Copiar aquí",files:targets,type:"copy"}); };
  const handleCopy = async (targets: FileItem[], dest: string) => {
    setFolderPicker(null); let errors=0;
    for (const file of targets) {
      const newPath=dest==="/"?`/${file.name}`:`${dest}/${file.name}`;
      try { await new Promise<void>((res,rej)=>copyMutation.mutate({sourcePath:file.path,destPath:newPath},{onSuccess:()=>res(),onError:()=>rej()})); }
      catch { errors++; }
    }
    clearSel();
    if (errors===0) addToast(`${targets.length>1?targets.length+" elementos":'"'+targets[0].name+'"'} copiado(s) a ${dest}`,"success");
    else addToast("No se pudo copiar (endpoint puede no estar disponible)","error");
    refetch();
  };

  // Delete
  const handleDelete = (targets: FileItem[]) => {
    setContextMenu(null);
    const names=targets.length===1?`"${targets[0].name}"`:  `${targets.length} elementos`;
    showConfirm({ title:"Confirmar eliminación", message:`¿Estás seguro de eliminar ${names}? Esta acción es irreversible.`, danger:true,
      onConfirm: async () => {
        setConfirmDialog(null); let ok=0, err=0;
        for (const f of targets) {
          try { await new Promise<void>((res,rej)=>deleteMutation.mutate(f.path,{onSuccess:()=>res(),onError:()=>rej()})); ok++; }
          catch { err++; }
        }
        clearSel();
        if (err===0) addToast(`${ok>1?ok+" elementos":names} eliminado(s)`,"success");
        else addToast(`${err} elemento(s) no pudieron eliminarse`,"error");
        refetch();
      }
    });
  };

  // Extract
  const handleExtract = async (filePath: string) => {
    const dir=filePath.substring(0,filePath.lastIndexOf("/")+1)||"/";
    setExtracting(filePath); setContextMenu(null);
    try {
      const res=await fetch(`${API_BASE}/odin-panel/files/extract`,{method:"POST",headers:authHeaders({"Content-Type":"application/json"}),body:JSON.stringify({zipPath:filePath,destPath:dir})});
      const data=await res.json();
      if (!res.ok||!data.success) throw new Error(data?.error?.message??"Error al extraer");
      addToast("Archivo extraído correctamente","success"); refetch();
    } catch (err:any) { addToast("Error al extraer: "+err.message,"error"); }
    finally { setExtracting(null); }
  };

  // Compress (create ZIP)
  const handleCompress = async (filePath: string, fileName: string) => {
    const dir   = filePath.substring(0, filePath.lastIndexOf("/")+1) || "/";
    const base  = fileName.replace(/\.[^.]+$/, ""); // strip extension for folders too
    const dest  = dir + base + ".zip";
    setCompressing(filePath); setContextMenu(null);
    try {
      const res  = await fetch(`${API_BASE}/odin-panel/files/compress`, { method:"POST", headers:authHeaders({"Content-Type":"application/json"}), body:JSON.stringify({ targetPath: filePath, zipName: dest }) });
      const data = await res.json();
      if (!res.ok||!data.success) throw new Error(data?.error?.message??"Error al comprimir");
      addToast(`"${base}.zip" creado correctamente`, "success"); refetch();
    } catch (err:any) { addToast("Error al comprimir: "+err.message, "error"); }
    finally { setCompressing(null); }
  };

  // Upload
  const handleUpload = (fileList: FileList|null) => {
    if (!fileList||fileList.length===0) return;
    setUploadProgress(0);
    uploadMutation.mutate({path:currentPath,files:fileList,onProgress:(p)=>setUploadProgress(p)},{
      onSuccess:()=>addToast("Archivos subidos correctamente","success"),
      onError:()=>addToast("Error al subir archivos","error"),
      onSettled:()=>setUploadProgress(null),
    });
  };
  const handleDrop = useCallback((e:React.DragEvent)=>{ e.preventDefault(); setIsDragging(false); handleUpload(e.dataTransfer.files); },[currentPath]);

  // Create folder
  const handleCreateFolder = () => {
    const name=window.prompt("Nombre de la nueva carpeta:");
    if (!name?.trim()) return;
    const t=currentPath==="/"?`/${name.trim()}`:`${currentPath}/${name.trim()}`;
    createFolderMutation.mutate(t,{onSuccess:()=>addToast(`Carpeta "${name.trim()}" creada`,"success"),onError:()=>addToast("Error al crear carpeta","error")});
  };

  // Create file
  const handleCreateFile = async (fileName: string) => {
    const fp=currentPath==="/"?`/${fileName}`:`${currentPath}/${fileName}`;
    setCreatingFile(true);
    try {
      const res=await fetch(`${API_BASE}/odin-panel/files/content`,{method:"PUT",headers:authHeaders({"Content-Type":"application/json"}),body:JSON.stringify({path:fp,content:""})});
      const data=await res.json();
      if (!res.ok||!data.success) throw new Error(data?.error?.message??"Error al crear");
      setNewFileOpen(false); addToast(`Archivo "${fileName}" creado`,"success"); refetch();
      // If package.json is created, automatically update list
    } catch (err:any) { addToast("Error al crear archivo: "+err.message,"error"); }
    finally { setCreatingFile(false); }
  };

  // Node.js Executions
  const hasPackageJson = useMemo(() => {
    return (files ?? []).some(f => f.name === "package.json" && !f.isDirectory);
  }, [files]);

  const jsFiles = useMemo(() => {
    return (files ?? []).filter(f => f.name.endsWith(".js") && !f.isDirectory);
  }, [files]);

  const handleNpmInstall = async () => {
    setRunningNpm(true);
    try {
      const res = await fetch(`${API_BASE}/odin-panel/files/npm-install`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ path: currentPath })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data?.error?.message ?? "Error en npm install");
      addToast(data.message || "npm install ejecutado correctamente.", "success");
      refetch();
    } catch (err: any) {
      addToast(err.message || "Error al ejecutar npm install", "error");
    } finally {
      setRunningNpm(false);
    }
  };

  const handleRunScript = async (scriptName: string) => {
    const fullScriptPath = currentPath === "/" ? `/${scriptName}` : `${currentPath}/${scriptName}`;
    setRunningScript(scriptName);
    setScriptOutput(null);
    try {
      const res = await fetch(`${API_BASE}/odin-panel/files/run-script`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ path: fullScriptPath })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data?.error?.message ?? "Error al ejecutar script");
      
      setScriptOutput(data.output || "Script ejecutado correctamente (sin salida de consola).");
      setScriptOutputOpen(true);
    } catch (err: any) {
      addToast(err.message || "Error al ejecutar script", "error");
    } finally {
      setRunningScript(null);
      setScriptModalOpen(false);
    }
  };

  const breadcrumbs = currentPath.split("/").filter(Boolean);

  // Sort button
  const SortBtn = ({ label, k }: { label:string; k:"name"|"size"|"date" }) => (
    <button onClick={()=>handleSort(k)} className={`px-2 py-1 rounded font-black text-[9px] uppercase tracking-widest transition-all flex items-center gap-0.5 ${sortKey===k?"bg-[#00A3FF]/15 text-[#00A3FF]":"text-slate-600 hover:text-slate-400"}`}>
      {label}{sortKey===k&&<span className="material-symbols-outlined text-[10px]">{sortDir==="asc"?"arrow_upward":"arrow_downward"}</span>}
    </button>
  );

  // Badge renderer
  const Badge = ({ name }: { name: string }) => {
    const b = getFileBadge(name);
    return b ? <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${b.color}`}>{b.label}</span> : null;
  };

  return (
    <div className="flex h-full bg-[#0d1117] text-slate-300 overflow-hidden">

      {/* ── Left sidebar ──────────────────────────────────────────────────────── */}
      <aside className="hidden md:flex w-52 flex-col bg-[#161b22] border-r border-white/[0.06] shrink-0 overflow-hidden">
        {/* Actions */}
        <div className="p-3 border-b border-white/[0.06] space-y-1">
          <button onClick={()=>setNewFileOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-all">
            <span className="material-symbols-outlined text-[15px] text-slate-400">note_add</span>Nuevo archivo
          </button>
          <button onClick={handleCreateFolder}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-all">
            <span className="material-symbols-outlined text-[15px] text-amber-400">create_new_folder</span>Nueva carpeta
          </button>
          <input type="file" ref={fileInputRef} onChange={(e)=>handleUpload(e.target.files)} className="hidden" multiple/>
          <button onClick={()=>fileInputRef.current?.click()} disabled={uploadMutation.isPending}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[#00A3FF]/10 hover:bg-[#00A3FF]/20 text-[#00A3FF] text-xs font-bold transition-all relative overflow-hidden disabled:opacity-50">
            {uploadMutation.isPending&&uploadProgress!==null&&<div className="absolute inset-y-0 left-0 bg-[#00A3FF]/20 transition-all pointer-events-none" style={{width:`${uploadProgress}%`}}/>}
            <span className="material-symbols-outlined text-[15px] relative z-10">upload</span>
            <span className="relative z-10">{uploadMutation.isPending?(uploadProgress!==null?`${uploadProgress}%`:"Subiendo..."):"Subir archivos"}</span>
          </button>
        </div>

        {/* Quick access */}
        <div className="p-3 border-b border-white/[0.06]">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 px-1 mb-2">Acceso rápido</p>
          <div className="space-y-0.5">
            {[{label:"Raíz (/)",path:"/",icon:"home"},{label:"public_html",path:"/public_html",icon:"language"},{label:"logs",path:"/logs",icon:"article"},{label:"tmp",path:"/tmp",icon:"hourglass_empty"}].map((item)=>(
              <button key={item.path} onClick={()=>setCurrentPath(item.path)}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs font-medium transition-all ${currentPath===item.path?"bg-[#00A3FF]/15 text-[#00A3FF]":"text-slate-400 hover:bg-white/5 hover:text-slate-200"}`}>
                <span className={`material-symbols-outlined text-[15px] ${currentPath===item.path?"text-[#00A3FF]":"text-slate-600"}`}>{item.icon}</span>
                <span className="font-mono">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tree */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 px-1 mb-2">Árbol</p>
          <div className="space-y-0.5">
            <div onClick={()=>setCurrentPath("/")}
              className={`flex items-center gap-1.5 py-1 px-2 cursor-pointer rounded-lg text-xs transition-all ${currentPath==="/"?"text-[#00A3FF] bg-[#00A3FF]/10":"text-slate-500 hover:bg-white/5 hover:text-slate-300"}`}>
              <span className="material-symbols-outlined text-[13px] text-slate-600">dns</span>
              <span className="font-mono font-bold">/</span>
            </div>
            {breadcrumbs.map((crumb,idx)=>{
              const cp="/"+breadcrumbs.slice(0,idx+1).join("/");
              return <div key={idx} onClick={()=>setCurrentPath(cp)}
                className="flex items-center gap-1.5 py-1 cursor-pointer rounded-lg text-xs transition-all text-slate-500 hover:bg-white/5 hover:text-slate-300"
                style={{paddingLeft:`${(idx+1)*10+8}px`}}>
                <span className="material-symbols-outlined text-[13px] text-amber-500">folder_open</span>
                <span className={`font-mono ${currentPath===cp?"text-[#00A3FF] font-bold":"font-medium"}`}>{crumb}</span>
              </div>;
            })}
            {files&&files.filter(f=>f.isDirectory).slice(0,10).map(folder=>(
              <div key={folder.path} onClick={()=>navigateTo(folder.name)}
                className="flex items-center gap-1.5 py-1 cursor-pointer rounded-lg text-xs text-slate-600 hover:bg-white/5 hover:text-slate-300 transition-all"
                style={{paddingLeft:`${(breadcrumbs.length+1)*10+8}px`}}>
                <span className="material-symbols-outlined text-[13px] text-amber-400">folder</span>
                <span className="font-mono truncate">{folder.name}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Workspace */}
        <div ref={dropZoneRef} className={`flex-1 flex flex-col overflow-hidden relative transition-all ${isDragging?"ring-2 ring-inset ring-[#00A3FF]/60":""}`}
          onDragOver={(e)=>{e.preventDefault();setIsDragging(true);}} onDragLeave={()=>setIsDragging(false)} onDrop={handleDrop}>
          {isDragging&&(
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#0d1117]/90 backdrop-blur-sm pointer-events-none">
              <div className="text-center animate-bounce">
                <span className="material-symbols-outlined text-[#00A3FF] text-7xl">cloud_upload</span>
                <p className="text-[#00A3FF] font-black text-sm uppercase tracking-widest mt-3">Soltar para subir</p>
              </div>
            </div>
          )}

          {/* Address bar */}
          <div className="px-3 py-2 border-b border-white/[0.06] flex items-center gap-1.5 bg-[#161b22] shrink-0">
            <button onClick={navigateUp} disabled={currentPath==="/"} className="w-7 h-7 rounded-md bg-white/5 hover:bg-white/10 text-slate-500 hover:text-slate-300 transition-all flex items-center justify-center disabled:opacity-20 shrink-0">
              <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
            </button>
            <button onClick={()=>refetch()} className="w-7 h-7 rounded-md bg-white/5 hover:bg-white/10 text-slate-500 hover:text-slate-300 transition-all flex items-center justify-center shrink-0">
              <span className={`material-symbols-outlined text-[14px] ${isLoading?"animate-spin":""}`}>refresh</span>
            </button>
            <form onSubmit={handlePathSubmit} className="flex-1 flex items-center bg-black/30 border border-white/[0.08] rounded-md px-2.5 py-1 gap-1.5 min-w-0">
              <span className="material-symbols-outlined text-[13px] text-slate-600 shrink-0">folder_open</span>
              <input type="text" value={pathInput} onChange={(e)=>setPathInput(e.target.value)} className="bg-transparent border-none outline-none text-slate-300 w-full text-xs font-mono min-w-0"/>
              <button type="button" onClick={()=>{navigator.clipboard.writeText(currentPath);addToast("Ruta copiada","info");}} className="text-slate-600 hover:text-slate-400 transition-colors shrink-0">
                <span className="material-symbols-outlined text-[12px]">content_copy</span>
              </button>
            </form>
            <div className="relative flex items-center w-36 shrink-0">
              <span className="material-symbols-outlined text-[13px] text-slate-600 absolute left-2 pointer-events-none">search</span>
              <input type="text" value={searchQuery} onChange={(e)=>setSearchQuery(e.target.value)} placeholder="Buscar..."
                className="w-full bg-black/30 border border-white/[0.08] rounded-md pl-7 pr-5 py-1 text-xs text-slate-300 focus:outline-none focus:border-[#00A3FF]/40 transition-all placeholder:text-slate-600"/>
              {searchQuery&&<button onClick={()=>setSearchQuery("")} className="absolute right-1.5 text-slate-600 hover:text-slate-400"><span className="material-symbols-outlined text-[11px]">close</span></button>}
            </div>
            <div className="flex items-center bg-black/30 border border-white/[0.08] rounded-md p-0.5 shrink-0">
              <button onClick={()=>setViewMode("grid")} className={`px-2 py-1 rounded transition-all ${viewMode==="grid"?"bg-[#00A3FF] text-white":"text-slate-600 hover:text-slate-300"}`}>
                <span className="material-symbols-outlined text-[13px]">grid_view</span>
              </button>
              <button onClick={()=>setViewMode("list")} className={`px-2 py-1 rounded transition-all ${viewMode==="list"?"bg-[#00A3FF] text-white":"text-slate-600 hover:text-slate-300"}`}>
                <span className="material-symbols-outlined text-[13px]">format_list_bulleted</span>
              </button>
            </div>
          </div>

          {/* Sort + count bar */}
          <div className="px-3 py-1.5 border-b border-white/[0.06] bg-[#0d1117] flex items-center gap-2 shrink-0">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-700 mr-1">Orden:</span>
            <SortBtn label="Nombre" k="name"/><SortBtn label="Tamaño" k="size"/><SortBtn label="Fecha" k="date"/>
            {displayFiles.length>0&&<span className="ml-auto text-[10px] text-slate-700 font-mono">{displayFiles.length} elemento{displayFiles.length!==1?"s":""}</span>}
          </div>

          {/* Bulk bar */}
          {selectedFiles.size>0&&(
            <div className="px-3 py-2 bg-[#00A3FF]/10 border-b border-[#00A3FF]/20 flex items-center gap-3 animate-in slide-in-from-top-1 duration-150 shrink-0">
              <span className="text-xs font-black text-[#00A3FF] uppercase tracking-wide">{selectedFiles.size} seleccionado(s)</span>
              <div className="flex gap-1.5 ml-auto">
                <button onClick={()=>openMove(selectedItems)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                  <span className="material-symbols-outlined text-[12px]">drive_file_move</span>Mover
                </button>
                <button onClick={()=>openCopy(selectedItems)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                  <span className="material-symbols-outlined text-[12px]">content_copy</span>Copiar
                </button>
                <button onClick={()=>handleDelete(selectedItems)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs font-bold text-red-400 hover:bg-red-500 hover:text-white transition-all">
                  <span className="material-symbols-outlined text-[12px]">delete</span>Eliminar
                </button>
                <button onClick={clearSel} className="w-7 h-7 rounded-lg bg-white/5 text-slate-600 hover:text-slate-300 flex items-center justify-center transition-all">
                  <span className="material-symbols-outlined text-[12px]">close</span>
                </button>
              </div>
            </div>
          )}

          {/* File listing */}
          <div className="flex-1 overflow-auto custom-scrollbar p-3">
            {isLoading&&<div className="py-20 text-center"><div className="flex flex-col items-center gap-3"><div className="w-7 h-7 border-[3px] border-[#00A3FF]/20 border-t-[#00A3FF] rounded-full animate-spin"/><p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Escaneando...</p></div></div>}
            {!isLoading&&displayFiles.length===0&&(
              <div className="py-20 text-center"><div className="flex flex-col items-center opacity-30">
                <span className="material-symbols-outlined text-5xl text-slate-500">{searchQuery?"search_off":"folder_off"}</span>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2">{searchQuery?`Sin resultados para "${searchQuery}"`:"Directorio vacío"}</p>
              </div></div>
            )}

            {/* ── Grid View ── */}
            {!isLoading&&displayFiles.length>0&&viewMode==="grid"&&(
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-2">
                {currentPath!=="/"&&(
                  <div onClick={()=>navigateTo("..")} className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-dashed border-white/10 hover:border-[#00A3FF]/40 hover:bg-[#00A3FF]/5 cursor-pointer group transition-all text-center aspect-square">
                    <span className="material-symbols-outlined text-xl text-slate-600 group-hover:text-[#00A3FF] transition-colors">keyboard_backspace</span>
                    <span className="text-[9px] font-bold text-slate-600 group-hover:text-[#00A3FF] uppercase tracking-wider mt-1">Atrás</span>
                  </div>
                )}
                {displayFiles.map((file)=>(
                  <div key={file.path} onClick={()=>file.isDirectory&&navigateTo(file.name)} onContextMenu={(e)=>openCtx(e,file)}
                    className={`flex flex-col items-center justify-center p-2.5 border rounded-xl cursor-pointer group transition-all text-center relative aspect-square select-none ${selectedFiles.has(file.path)?"border-[#00A3FF]/50 bg-[#00A3FF]/10":"border-white/[0.05] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.05]"}`}>
                    <div className={`absolute top-1.5 left-1.5 z-10 transition-opacity ${selectedFiles.has(file.path)?"opacity-100":"opacity-0 group-hover:opacity-100"}`} onClick={(e)=>toggleSelect(file.path,e)}>
                      <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition-all ${selectedFiles.has(file.path)?"bg-[#00A3FF] border-[#00A3FF]":"border-white/20 bg-black/40"}`}>
                        {selectedFiles.has(file.path)&&<span className="material-symbols-outlined text-[9px] text-white">check</span>}
                      </div>
                    </div>
                    <button onClick={(e)=>{ e.stopPropagation(); openCtx(e,file); }}
                      className="absolute top-1 right-1 z-10 w-5 h-5 rounded bg-white/5 text-slate-600 hover:text-slate-300 flex items-center justify-center md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <span className="material-symbols-outlined text-[13px]">more_vert</span>
                    </button>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-1 transition-all group-hover:scale-110 ${file.isDirectory?"bg-amber-500/10":"bg-white/5"}`}>
                      <span className={`material-symbols-outlined text-xl ${getFileIconColor(file.name,file.isDirectory)}`}>{getFileIcon(file.name,file.isDirectory)}</span>
                    </div>
                    {renameTarget===file.path?(
                      <div className="w-full px-0.5" onClick={(e)=>e.stopPropagation()}>
                        <input autoFocus value={renameValue} onChange={(e)=>setRenameValue(e.target.value)}
                          onKeyDown={(e)=>{if(e.key==="Enter")confirmRename();if(e.key==="Escape")setRenameTarget(null);}}
                          className="w-full bg-black/40 border border-[#00A3FF] rounded px-1 py-0.5 text-[10px] text-slate-200 font-mono focus:outline-none text-center"/>
                        <div className="flex justify-center gap-1 mt-1">
                          <button onClick={confirmRename} className="w-4 h-4 rounded bg-[#00A3FF] text-white flex items-center justify-center"><span className="material-symbols-outlined text-[9px]">check</span></button>
                          <button onClick={()=>setRenameTarget(null)} className="w-4 h-4 rounded bg-white/10 text-slate-400 flex items-center justify-center"><span className="material-symbols-outlined text-[9px]">close</span></button>
                        </div>
                      </div>
                    ):(
                      <>
                        <span className="text-[10px] font-medium text-slate-400 group-hover:text-slate-200 truncate w-full px-0.5 transition-colors leading-tight" title={file.name}>{file.name}</span>
                        <span className="text-[9px] text-slate-700 font-mono mt-0.5">{file.isDirectory?"dir":formatSize(file.size)}</span>
                      </>
                    )}
                    {renameTarget!==file.path&&(
                      <div className="absolute bottom-1 right-1 hidden md:flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-[#161b22]/95 backdrop-blur-sm p-0.5 rounded border border-white/10" onClick={(e)=>e.stopPropagation()}>
                        {!file.isDirectory&&isTextFile(file.name)&&<button onClick={()=>openEditor(file.path,file.name)} className="w-4 h-4 rounded text-slate-500 hover:text-[#00A3FF] flex items-center justify-center" title="Editar"><span className="material-symbols-outlined text-[11px]">edit</span></button>}
                        <button onClick={()=>startRename(file)} className="w-4 h-4 rounded text-slate-500 hover:text-[#00A3FF] flex items-center justify-center"><span className="material-symbols-outlined text-[11px]">drive_file_rename_outline</span></button>
                        <button onClick={()=>openMove([file])} className="w-4 h-4 rounded text-slate-500 hover:text-[#00A3FF] flex items-center justify-center"><span className="material-symbols-outlined text-[11px]">drive_file_move</span></button>
                        {!file.isDirectory&&isArchive(file.name)&&<button onClick={()=>handleExtract(file.path)} disabled={extracting===file.path} className="w-4 h-4 rounded text-emerald-600 hover:text-emerald-400 flex items-center justify-center"><span className={`material-symbols-outlined text-[11px] ${extracting===file.path?"animate-spin":""}`}>{extracting===file.path?"refresh":"folder_zip"}</span></button>}
                        {!file.isDirectory&&<a href={`${API_BASE}/odin-panel/files/download?path=${encodeURIComponent(file.path)}`} target="_blank" className="w-4 h-4 rounded text-slate-500 hover:text-[#00A3FF] flex items-center justify-center"><span className="material-symbols-outlined text-[11px]">download</span></a>}
                        <button onClick={()=>handleDelete([file])} className="w-4 h-4 rounded text-slate-600 hover:text-red-400 flex items-center justify-center"><span className="material-symbols-outlined text-[11px]">delete</span></button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ── List View ── */}
            {!isLoading&&displayFiles.length>0&&viewMode==="list"&&(
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="px-3 py-1.5 w-8">
                        <div onClick={()=>{if(selectedFiles.size===displayFiles.length)clearSel();else setSelectedFiles(new Set(displayFiles.map(f=>f.path)));}}
                          className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center cursor-pointer transition-all ${selectedFiles.size===displayFiles.length&&displayFiles.length>0?"bg-[#00A3FF] border-[#00A3FF]":"border-white/20 bg-black/20 hover:border-[#00A3FF]"}`}>
                          {selectedFiles.size===displayFiles.length&&displayFiles.length>0&&<span className="material-symbols-outlined text-[9px] text-white">check</span>}
                        </div>
                      </th>
                      <th className="px-3 py-1.5"><SortBtn label="Nombre" k="name"/></th>
                      <th className="px-3 py-1.5 hidden md:table-cell"><SortBtn label="Tamaño" k="size"/></th>
                      <th className="px-3 py-1.5 hidden md:table-cell"><SortBtn label="Fecha" k="date"/></th>
                      <th className="px-3 py-1.5 hidden md:table-cell"><span className="text-[9px] font-black uppercase tracking-widest text-slate-700">Permisos</span></th>
                      <th className="px-3 py-1.5 text-right"><span className="text-[9px] font-black uppercase tracking-widest text-slate-700">Acciones</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {currentPath!=="/"&&(
                      <tr className="hover:bg-white/5 cursor-pointer transition-colors" onClick={()=>navigateTo("..")}>
                        <td className="px-3 py-1.5"/><td className="px-3 py-1.5" colSpan={5}>
                          <div className="flex items-center gap-2 text-[#00A3FF]">
                            <span className="material-symbols-outlined text-[15px]">keyboard_backspace</span>
                            <span className="font-bold text-[10px] uppercase tracking-wider">Directorio anterior</span>
                          </div>
                        </td>
                      </tr>
                    )}
                    {displayFiles.map((file)=>(
                      <tr key={file.path} onContextMenu={(e)=>openCtx(e,file)}
                        className={`transition-colors group border-l-2 ${selectedFiles.has(file.path)?"border-l-[#00A3FF] bg-[#00A3FF]/5":"border-transparent hover:bg-white/[0.03] hover:border-l-white/10"}`}>
                        <td className="px-3 py-1.5" onClick={(e)=>e.stopPropagation()}>
                          <div onClick={(e)=>toggleSelect(file.path,e)} className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center cursor-pointer transition-all md:opacity-0 md:group-hover:opacity-100 ${selectedFiles.has(file.path)?"!opacity-100 bg-[#00A3FF] border-[#00A3FF]":"border-white/20 bg-black/20 hover:border-[#00A3FF]"}`}>
                            {selectedFiles.has(file.path)&&<span className="material-symbols-outlined text-[9px] text-white">check</span>}
                          </div>
                        </td>
                        <td className="px-3 py-1.5">
                          {renameTarget===file.path?(
                            <div className="flex items-center gap-2" onClick={(e)=>e.stopPropagation()}>
                              <input autoFocus value={renameValue} onChange={(e)=>setRenameValue(e.target.value)} onKeyDown={(e)=>{if(e.key==="Enter")confirmRename();if(e.key==="Escape")setRenameTarget(null);}}
                                className="bg-black/40 border border-[#00A3FF] rounded px-2 py-0.5 text-xs text-slate-200 font-mono focus:outline-none w-48"/>
                              <button onClick={confirmRename} className="w-5 h-5 rounded bg-[#00A3FF] text-white flex items-center justify-center"><span className="material-symbols-outlined text-[11px]">check</span></button>
                              <button onClick={()=>setRenameTarget(null)} className="w-5 h-5 rounded bg-white/10 text-slate-400 flex items-center justify-center"><span className="material-symbols-outlined text-[11px]">close</span></button>
                            </div>
                          ):(
                            <div className="flex items-center gap-2 cursor-pointer" onClick={()=>file.isDirectory&&navigateTo(file.name)}>
                              <span className={`material-symbols-outlined text-[16px] ${getFileIconColor(file.name,file.isDirectory)}`}>{getFileIcon(file.name,file.isDirectory)}</span>
                              <span className={`text-xs font-medium transition-colors ${file.isDirectory?"text-slate-300 group-hover:text-white":"text-slate-400 group-hover:text-slate-300"}`}>{file.name}</span>
                              <Badge name={file.name}/>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-slate-600 text-xs font-mono hidden md:table-cell">{file.isDirectory?"—":formatSize(file.size)}</td>
                        <td className="px-3 py-1.5 text-slate-600 text-xs font-mono hidden md:table-cell">{formatDate(file.lastModified)}</td>
                        <td className="px-3 py-1.5 hidden md:table-cell"><span className="text-slate-700 text-xs font-mono">{file.permissions}</span></td>
                        <td className="px-3 py-1.5 text-right" onClick={(e)=>e.stopPropagation()}>
                          <div className="hidden md:flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!file.isDirectory&&isTextFile(file.name)&&<button onClick={()=>openEditor(file.path,file.name)} className="w-6 h-6 rounded bg-white/5 text-slate-500 hover:text-[#00A3FF] transition-all flex items-center justify-center" title="Editar"><span className="material-symbols-outlined text-[13px]">edit</span></button>}
                            <button onClick={()=>startRename(file)} className="w-6 h-6 rounded bg-white/5 text-slate-500 hover:text-[#00A3FF] transition-all flex items-center justify-center"><span className="material-symbols-outlined text-[13px]">drive_file_rename_outline</span></button>
                            <button onClick={()=>openMove([file])} className="w-6 h-6 rounded bg-white/5 text-slate-500 hover:text-[#00A3FF] transition-all flex items-center justify-center"><span className="material-symbols-outlined text-[13px]">drive_file_move</span></button>
                            <button onClick={()=>openCopy([file])} className="w-6 h-6 rounded bg-white/5 text-slate-500 hover:text-[#00A3FF] transition-all flex items-center justify-center"><span className="material-symbols-outlined text-[13px]">content_copy</span></button>
                            {!file.isDirectory&&isArchive(file.name)&&<button onClick={()=>handleExtract(file.path)} disabled={extracting===file.path} className="w-6 h-6 rounded bg-white/5 text-emerald-600 hover:text-emerald-400 transition-all flex items-center justify-center"><span className={`material-symbols-outlined text-[13px] ${extracting===file.path?"animate-spin":""}`}>{extracting===file.path?"refresh":"folder_zip"}</span></button>}
                            {!file.isDirectory&&<a href={`${API_BASE}/odin-panel/files/download?path=${encodeURIComponent(file.path)}`} target="_blank" className="w-6 h-6 rounded bg-white/5 text-slate-500 hover:text-[#00A3FF] transition-all flex items-center justify-center"><span className="material-symbols-outlined text-[13px]">download</span></a>}
                            <button onClick={()=>handleDelete([file])} className="w-6 h-6 rounded bg-white/5 text-slate-600 hover:text-red-400 transition-all flex items-center justify-center"><span className="material-symbols-outlined text-[13px]">delete</span></button>
                          </div>
                          <div className="flex md:hidden justify-end">
                            <button onClick={(e)=>{ e.stopPropagation(); openCtx(e,file); }} className="w-6 h-6 rounded bg-white/5 text-slate-500 hover:text-slate-300 flex items-center justify-center">
                              <span className="material-symbols-outlined text-[14px]">more_vert</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Status bar */}
          <div className="px-4 py-1.5 border-t border-white/[0.06] bg-[#161b22] flex items-center justify-between gap-4 shrink-0">
            <p className="text-[9px] font-mono text-slate-700 truncate">{currentPath}</p>
            <div className="flex items-center gap-3 shrink-0">
              {searchQuery&&<p className="text-[9px] font-bold uppercase tracking-widest text-[#00A3FF]">{displayFiles.length} resultado(s)</p>}
              <p className="text-[9px] font-mono text-slate-700">{files?.length??0} items</p>
              {selectedFiles.size>0&&<p className="text-[9px] font-bold text-[#00A3FF]">· {selectedFiles.size} sel.</p>}
            </div>
          </div>
        </div>

      {/* ── Editor Modal ──────────────────────────────────────────────────────── */}
      {editorOpen&&(
        <div className="fixed inset-0 z-[200] flex items-center justify-center sm:p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={()=>!editorSaving&&setEditorOpen(false)}/>
          <div className="relative z-10 w-full h-full sm:h-[88vh] sm:max-w-6xl flex flex-col bg-[#161b22] border border-white/[0.08] sm:rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3 border-b border-white/[0.06] bg-[#0d1117]">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#00A3FF]/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[#00A3FF] text-base sm:text-lg">edit_document</span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-200 leading-tight truncate" title={editorFile?.name}>{editorFile?.name}</h3>
                    {editorFile&&<Badge name={editorFile.name}/>}
                  </div>
                  <p className="text-[8px] sm:text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-0.5 truncate">{editorFile?.path}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <span className="hidden lg:block text-[9px] text-slate-600 font-mono bg-black/30 px-2 py-1 rounded">Ctrl+S · Tab=2</span>
                <button onClick={saveEditor} disabled={editorSaving||editorLoading}
                  className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-[#00A3FF] text-white text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-[#008EE0] active:scale-95 transition-all disabled:opacity-40">
                  <span className="material-symbols-outlined text-[13px] sm:text-[15px]">save</span><span>{editorSaving?"Guardando...":"Guardar"}</span>
                </button>
                <button onClick={()=>setEditorOpen(false)} disabled={editorSaving} className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl bg-white/5 text-slate-500 hover:text-slate-300 transition-all">
                  <span className="material-symbols-outlined text-base sm:text-lg">close</span>
                </button>
              </div>
            </div>
            {editorError&&<div className="px-5 py-2 bg-red-500/10 border-b border-red-500/20 flex items-center gap-2"><span className="material-symbols-outlined text-red-400 text-[16px]">error</span><p className="text-xs font-bold text-red-400">{editorError}</p></div>}
            <div className="flex-1 overflow-hidden relative bg-[#0d1117]">
              {editorLoading?(
                <div className="flex items-center justify-center h-full"><div className="text-center"><div className="w-8 h-8 border-2 border-white/10 border-t-[#00A3FF] rounded-full animate-spin mx-auto mb-2"/><p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest">Cargando código...</p></div></div>
              ):(
                <textarea value={editorContent} onChange={(e)=>setEditorContent(e.target.value)} onKeyDown={handleEditorKey}
                  onSelect={(e)=>{ const ta=e.currentTarget; setEditorLine(editorContent.substring(0,ta.selectionStart).split("\n").length); }}
                  spellCheck={false} className="w-full h-full bg-transparent text-emerald-400 font-mono text-xs resize-none focus:outline-none p-3 sm:p-5 leading-relaxed custom-scrollbar" style={{tabSize:2}}/>
              )}
            </div>
            <div className="px-5 py-1.5 border-t border-white/[0.06] bg-[#161b22] flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">Línea {editorLine} · {editorContent.split("\n").length} líneas · UTF-8</span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-700 hidden sm:inline-block">Editor Odisea Cloud</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────────────────────────────── */}
      {folderPicker&&<FolderPickerModal title={folderPicker.title} subtitle={folderPicker.subtitle} confirmLabel={folderPicker.confirmLabel} onCancel={()=>setFolderPicker(null)} onConfirm={(dest)=>{ if(folderPicker.type==="move") handleMove(folderPicker.files,dest); else handleCopy(folderPicker.files,dest); }}/>}
      {confirmDialog&&<ConfirmDialog {...confirmDialog} onCancel={()=>setConfirmDialog(null)}/>}
      {newFileOpen&&<NewFileModal currentPath={currentPath} onConfirm={handleCreateFile} onCancel={()=>setNewFileOpen(false)} loading={creatingFile}/>}

      {/* ── Run JS Script Modal ── */}
      {scriptModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#161b22] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/50 p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div>
              <h3 className="text-sm font-black text-slate-200 uppercase tracking-wide">Ejecutar script JS</h3>
              <p className="text-xs text-slate-600 mt-1">Elige un archivo .js para ejecutar con Node.js.</p>
            </div>
            {jsFiles.length === 0 ? (
              <div className="bg-white/5 border border-white/[0.06] rounded-xl p-4 text-center">
                <span className="material-symbols-outlined text-slate-600 text-2xl mb-1.5 block">javascript</span>
                <p className="text-xs text-slate-600">No hay archivos .js en este directorio.</p>
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1.5 custom-scrollbar">
                {jsFiles.map(file => (
                  <button key={file.name} type="button" onClick={() => setSelectedScript(file.name)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${selectedScript === file.name ? "border-[#00A3FF]/50 bg-[#00A3FF]/10" : "border-white/[0.06] bg-white/[0.02] hover:bg-white/5"}`}>
                    <span className="material-symbols-outlined text-yellow-500 text-lg">javascript</span>
                    <span className="text-xs font-mono text-slate-300 truncate">{file.name}</span>
                    {selectedScript === file.name && <span className="material-symbols-outlined text-[#00A3FF] ml-auto text-[16px]">check_circle</span>}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <button type="button" disabled={!selectedScript || runningScript !== null} onClick={() => handleRunScript(selectedScript)}
                className="flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white bg-[#00A3FF] hover:bg-[#008EE0] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5">
                {runningScript ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Ejecutando...</> : <><span className="material-symbols-outlined text-xs">play_arrow</span>Ejecutar</>}
              </button>
              <button type="button" onClick={() => { setScriptModalOpen(false); setSelectedScript(""); }}
                className="flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white/5 hover:bg-white/10 text-slate-400 transition-all">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Script Output Modal ── */}
      {scriptOutputOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-[#0d1117] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/50 p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <span className="text-xs font-mono text-slate-600 ml-2">output</span>
              </div>
              <button type="button" onClick={() => setScriptOutputOpen(false)} className="text-slate-600 hover:text-slate-400 transition-colors">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
            <pre className="w-full max-h-80 overflow-auto bg-black/40 border border-white/[0.06] rounded-xl p-4 text-xs font-mono text-emerald-400 whitespace-pre-wrap select-text custom-scrollbar">
              {scriptOutput}
            </pre>
            <div className="flex justify-end">
              <button type="button" onClick={() => setScriptOutputOpen(false)}
                className="px-5 py-2 rounded-xl bg-white/5 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ── Context Menu ───────────────────────────────────────────────────────── */}
      {contextMenu&&<ContextMenu menu={contextMenu} onClose={()=>setContextMenu(null)}
        onEdit={!contextMenu.file.isDirectory&&isTextFile(contextMenu.file.name)?()=>openEditor(contextMenu.file.path,contextMenu.file.name):undefined}
        onRename={()=>startRename(contextMenu.file)} onMove={()=>openMove([contextMenu.file])} onCopy={()=>openCopy([contextMenu.file])}
        onDownload={!contextMenu.file.isDirectory?()=>window.open(`${API_BASE}/odin-panel/files/download?path=${encodeURIComponent(contextMenu.file.path)}`,"_blank"):undefined}
        onCompress={()=>handleCompress(contextMenu.file.path,contextMenu.file.name)}
        onExtract={isArchive(contextMenu.file.name)?()=>handleExtract(contextMenu.file.path):undefined}
        onDelete={()=>handleDelete([contextMenu.file])}
        extracting={extracting===contextMenu.file.path}
        compressing={compressing===contextMenu.file.path}/>}

      {/* ── Toasts ─────────────────────────────────────────────────────────────── */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast}/>
    </div>
  );
}
