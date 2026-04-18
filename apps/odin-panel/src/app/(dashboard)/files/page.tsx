"use client";

import { useState, useRef } from "react";
import { useFiles, useDeleteFile, useCreateFolder, useUploadFiles } from "../../../lib/hooks/use-files";

export default function FileManagerPage() {
  const [currentPath, setCurrentPath] = useState("/");
  const { data: files, isLoading, refetch } = useFiles(currentPath);
  const deleteMutation = useDeleteFile();
  const createFolderMutation = useCreateFolder();
  const uploadMutation = useUploadFiles();
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreateFolder = () => {
    const name = window.prompt("Nombre de la nueva carpeta:");
    if (!name) return;
    
    // Simple basic check to avoid trailing slash doubling
    const target = currentPath === "/" ? `/${name}` : `${currentPath}/${name}`;
    createFolderMutation.mutate(target);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadMutation.mutate({ path: currentPath, files: e.target.files });
    }
  };

  const handleDelete = (path: string, isDir: boolean) => {
    if (window.confirm(`¿Estás seguro de eliminar el ${isDir ? 'directorio' : 'archivo'} '${path}'? Esta acción es irreversible.`)) {
      deleteMutation.mutate(path);
    }
  };

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

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const breadcrumbs = currentPath.split("/").filter(Boolean);

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Administrador de Archivos</h1>
          <p className="text-gray-400">Gestiona los archivos de tu servidor directamente desde el navegador, estilo cPanel.</p>
        </div>
        
        <div className="flex bg-[#0f172a] rounded-lg p-1 border border-gray-800">
          <button 
            onClick={handleCreateFolder}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 rounded transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">create_new_folder</span> Nueva Carpeta
          </button>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            multiple 
          />
          <button 
            onClick={handleUploadClick}
            disabled={uploadMutation.isPending}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 rounded transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">upload</span> 
            {uploadMutation.isPending ? "Subiendo..." : "Cargar"}
          </button>
          
          <button 
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 rounded transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span> Actualizar
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-6 min-h-0">
        {/* Panel Principal */}
        <div className="flex-1 bg-[#0f172a] rounded-xl border border-gray-800 flex flex-col overflow-hidden">
          
          {/* Breadcrumb & Toolbar */}
          <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-800/20 shadow-sm">
             <div className="flex items-center gap-2 text-sm text-gray-400 overflow-x-auto whitespace-nowrap">
               <span 
                 onClick={() => setCurrentPath("/")} 
                 className="hover:text-white cursor-pointer transition-colors"
               >
                 /home/user
               </span>
               {breadcrumbs.map((crumb, idx) => {
                 const isLast = idx === breadcrumbs.length - 1;
                 const target = "/" + breadcrumbs.slice(0, idx + 1).join("/");
                 return (
                   <div key={idx} className="flex items-center gap-2">
                      <span>/</span>
                      <span 
                        onClick={() => !isLast && setCurrentPath(target)}
                        className={`${isLast ? "text-cyan-400 font-medium" : "hover:text-white cursor-pointer transition-colors"}`}
                      >
                        {crumb}
                      </span>
                   </div>
                 );
               })}
             </div>
          </div>

          {/* Tabla de Archivos */}
          <div className="flex-1 overflow-auto">
             <table className="w-full text-left text-sm whitespace-nowrap text-gray-300">
               <thead className="bg-[#1e293b] sticky top-0 border-b border-gray-800 text-gray-400 font-medium shadow-sm z-10">
                 <tr>
                   <th className="px-6 py-3">Nombre</th>
                   <th className="px-6 py-3">Tamaño</th>
                   <th className="px-6 py-3">Modificado</th>
                   <th className="px-6 py-3">Permisos</th>
                   <th className="px-6 py-3 text-right">Acciones</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-800/50 relative">
                 {isLoading && (
                   <tr>
                     <td colSpan={5} className="p-8 text-center text-gray-500">
                        Cargando archivos...
                     </td>
                   </tr>
                 )}
                 
                 {!isLoading && currentPath !== "/" && (
                    <tr 
                      className="hover:bg-gray-800/30 transition-colors cursor-pointer"
                      onClick={() => navigateTo("..")}
                    >
                      <td className="px-6 py-3 flex items-center gap-3">
                        <span className="material-symbols-outlined text-gray-400 text-[20px]">keyboard_return</span>
                        <span className="font-medium text-white hover:underline">.. (Volver)</span>
                      </td>
                      <td colSpan={4}></td>
                    </tr>
                 )}

                 {!isLoading && files?.length === 0 && (
                   <tr>
                     <td colSpan={5} className="p-8 text-center text-gray-500">
                        Directorio vacío
                     </td>
                   </tr>
                 )}

                 {!isLoading && files?.map((file) => (
                   <tr key={file.name} className="hover:bg-gray-800/30 transition-colors group">
                     <td className="px-6 py-3">
                       <div 
                         className="flex items-center gap-3 cursor-pointer"
                         onClick={() => file.isDirectory && navigateTo(file.name)}
                       >
                         <span className={`material-symbols-outlined text-[20px] ${file.isDirectory ? "text-orange-400" : "text-blue-400"}`}>
                           {file.isDirectory ? "folder" : "draft"}
                         </span>
                         <span className="font-medium text-white group-hover:underline">
                           {file.name}
                         </span>
                       </div>
                     </td>
                     <td className="px-6 py-3 text-gray-400">
                       {file.isDirectory ? "-" : formatSize(file.size)}
                     </td>
                     <td className="px-6 py-3 text-gray-400">
                       {new Date(file.lastModified).toLocaleString()}
                     </td>
                     <td className="px-6 py-3 text-gray-400 font-mono text-xs">
                       {file.permissions}
                     </td>
                     <td className="px-6 py-3 text-right">
                       <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!file.isDirectory && (
                             <a 
                               href={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1"}/odin-panel/files/download?path=${encodeURIComponent(file.path)}`}
                               target="_blank"
                               className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors" 
                               title="Descargar"
                             >
                                <span className="material-symbols-outlined text-[18px]">download</span>
                             </a>
                          )}
                          <button 
                            onClick={() => handleDelete(file.path, file.isDirectory)}
                            className="p-1.5 text-red-500 hover:bg-red-500/20 rounded transition-colors" 
                            title="Eliminar"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                       </div>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
          
          <div className="p-3 border-t border-gray-800 bg-[#1e293b]/50 text-xs text-gray-500">
            <p>Mostrando el contenido de /home/user{currentPath !== "/" ? currentPath : ""}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
