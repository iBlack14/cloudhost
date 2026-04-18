"use client";

import { useState } from "react";

export default function FileManagerPage() {
  const [currentPath, setCurrentPath] = useState("/");

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Administrador de Archivos</h1>
          <p className="text-gray-400">Gestiona los archivos de tu servidor directamente desde el navegador, estilo cPanel.</p>
        </div>
        
        <div className="flex bg-[#0f172a] rounded-lg p-1 border border-gray-800">
          <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 rounded transition-colors">
            <span className="material-symbols-outlined text-[18px]">create_new_folder</span> Nueva Carpeta
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 rounded transition-colors">
            <span className="material-symbols-outlined text-[18px]">upload</span> Cargar
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 rounded transition-colors">
            <span className="material-symbols-outlined text-[18px]">refresh</span> Actualizar
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-6 min-h-0">
        {/* Sidebar Árbol de Directorios */}
        <div className="w-64 flex-shrink-0 bg-[#0f172a] rounded-xl border border-gray-800 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-800">
             <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Árbol de Directorios</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <div className="flex items-center gap-2 p-2 hover:bg-gray-800/50 rounded cursor-pointer text-cyan-400">
               <span className="material-symbols-outlined text-[18px]">folder</span>
               <span className="text-sm font-medium">/home/user</span>
            </div>
            <div className="ml-4 border-l border-gray-700 pl-2 mt-1 space-y-1">
               <div className="flex items-center gap-2 p-1.5 hover:bg-gray-800/50 rounded cursor-pointer text-gray-300">
                 <span className="material-symbols-outlined text-[18px] text-orange-400">folder</span>
                 <span className="text-sm">public_html</span>
               </div>
               <div className="flex items-center gap-2 p-1.5 hover:bg-gray-800/50 rounded cursor-pointer text-gray-300">
                 <span className="material-symbols-outlined text-[18px] text-gray-400">folder</span>
                 <span className="text-sm">logs</span>
               </div>
               <div className="flex items-center gap-2 p-1.5 hover:bg-gray-800/50 rounded cursor-pointer text-gray-300">
                 <span className="material-symbols-outlined text-[18px] text-green-400">folder</span>
                 <span className="text-sm">ssl</span>
               </div>
            </div>
          </div>
        </div>

        {/* Panel Principal */}
        <div className="flex-1 bg-[#0f172a] rounded-xl border border-gray-800 flex flex-col overflow-hidden">
          
          {/* Breadcrumb & Toolbar */}
          <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-800/20">
             <div className="flex items-center gap-2 text-sm text-gray-400">
               <span className="hover:text-white cursor-pointer transition-colors">Inicio</span>
               <span>/</span>
               <span className="text-cyan-400 font-medium">public_html</span>
             </div>
             
             <div className="flex gap-2">
                <button className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors" title="Editar">
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                </button>
                <button className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors" title="Descargar">
                  <span className="material-symbols-outlined text-[18px]">download</span>
                </button>
                <div className="w-px h-6 bg-gray-700 mx-1 self-center"></div>
                <button className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded transition-colors" title="Eliminar">
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
             </div>
          </div>

          {/* Tabla de Archivos */}
          <div className="flex-1 overflow-auto">
             <table className="w-full text-left text-sm whitespace-nowrap text-gray-300">
               <thead className="bg-[#1e293b] sticky top-0 border-b border-gray-800 text-gray-400 font-medium">
                 <tr>
                   <th className="px-6 py-3 w-8">
                     <input type="checkbox" className="rounded bg-gray-700 border-gray-600 border" />
                   </th>
                   <th className="px-6 py-3">Nombre</th>
                   <th className="px-6 py-3">Tamaño</th>
                   <th className="px-6 py-3">Modificado</th>
                   <th className="px-6 py-3">Permisos</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-800/50">
                 {/* Ejemplo de Archivo */}
                 <tr className="hover:bg-gray-800/30 transition-colors group">
                   <td className="px-6 py-3">
                     <input type="checkbox" className="rounded bg-gray-900 border-gray-700" />
                   </td>
                   <td className="px-6 py-3 flex items-center gap-3">
                     <span className="material-symbols-outlined text-orange-400 text-[20px]">folder</span>
                     <span className="font-medium text-white cursor-pointer hover:underline">wp-admin</span>
                   </td>
                   <td className="px-6 py-3 text-gray-400">4 KB</td>
                   <td className="px-6 py-3 text-gray-400">18 abr 2026, 10:45</td>
                   <td className="px-6 py-3 text-gray-400 font-mono text-xs">0755</td>
                 </tr>

                 <tr className="hover:bg-gray-800/30 transition-colors group">
                   <td className="px-6 py-3">
                     <input type="checkbox" className="rounded bg-gray-900 border-gray-700" />
                   </td>
                   <td className="px-6 py-3 flex items-center gap-3">
                     <span className="material-symbols-outlined text-blue-400 text-[20px]">draft</span>
                     <span className="font-medium text-white cursor-pointer hover:underline">wp-config.php</span>
                   </td>
                   <td className="px-6 py-3 text-gray-400">3.2 KB</td>
                   <td className="px-6 py-3 text-gray-400">18 abr 2026, 11:20</td>
                   <td className="px-6 py-3 text-gray-400 font-mono text-xs">0644</td>
                 </tr>
               </tbody>
             </table>
          </div>
          
          <div className="p-3 border-t border-gray-800 bg-[#1e293b]/50 text-xs text-gray-500">
            <p>Mostrando el contenido de /home/user/public_html</p>
          </div>
        </div>
      </div>
    </div>
  );
}
