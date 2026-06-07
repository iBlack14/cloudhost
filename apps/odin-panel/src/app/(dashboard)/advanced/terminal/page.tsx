"use client";
import React, { useState, useEffect, useRef } from "react";

interface TerminalLine {
  text: string;
  type: "input" | "output" | "error" | "system";
}

export default function WebTerminalPage() {
  const [history, setHistory] = useState<TerminalLine[]>([
    { text: "Odisea Cloud SSH Terminal Gateway [v1.0.0]", type: "system" },
    { text: "Conexión cifrada establecida con el servidor local.", type: "system" },
    { text: "Escribe 'help' para ver una lista de comandos disponibles.", type: "system" },
    { text: "", type: "output" }
  ]);
  const [inputVal, setInputVal] = useState("");
  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const command = inputVal.trim();
    if (!command) return;

    const newLines: TerminalLine[] = [
      ...history,
      { text: `$ ${command}`, type: "input" }
    ];

    const cmdParts = command.toLowerCase().split(/\s+/);
    const primaryCmd = cmdParts[0];

    switch (primaryCmd) {
      case "help":
        newLines.push({
          text: "Comandos disponibles:\n  help      - Muestra esta ayuda\n  ls        - Lista archivos en el directorio actual\n  pwd       - Muestra la ruta del directorio de trabajo\n  whoami    - Muestra el usuario actual\n  node -v   - Muestra la versión de Node.js del entorno\n  python -v - Muestra la versión de Python instalada\n  clear     - Limpia la pantalla",
          type: "output"
        });
        break;
      case "ls":
        newLines.push({
          text: "public_html/   logs/   tmp/   mail/   ssl/   package.json   app.js",
          type: "output"
        });
        break;
      case "pwd":
        newLines.push({ text: "/home/user_starter", type: "output" });
        break;
      case "whoami":
        newLines.push({ text: "user_starter", type: "output" });
        break;
      case "clear":
        setHistory([]);
        setInputVal("");
        return;
      case "node":
        if (cmdParts[1] === "-v" || cmdParts[1] === "--version") {
          newLines.push({ text: "v20.11.0", type: "output" });
        } else {
          newLines.push({ text: "node: Uso: 'node -v' para verificar versión.", type: "output" });
        }
        break;
      case "python":
        if (cmdParts[1] === "-v" || cmdParts[1] === "--version" || cmdParts[1] === "-v") {
          newLines.push({ text: "Python 3.11.5", type: "output" });
        } else {
          newLines.push({ text: "python: Uso: 'python -v' para verificar versión.", type: "output" });
        }
        break;
      default:
        newLines.push({
          text: `odisea-bash: ${primaryCmd}: comando no encontrado. Acceso restringido.`,
          type: "error"
        });
        break;
    }

    setHistory(newLines);
    setInputVal("");
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-200 pb-10">
         <div className="space-y-1.5">
           <div className="flex items-center gap-3 mb-1">
              <span className="px-2.5 py-1 bg-[#00A3FF]/10 text-[#00A3FF] text-[10px] font-bold uppercase rounded-full tracking-wider">
                 Avanzado
              </span>
           </div>
           <h1 className="text-5xl font-black text-slate-900 uppercase">
             Terminal <span className="text-[#00A3FF]">Web SSH</span>
           </h1>
           <p className="text-slate-500 text-sm font-medium mt-2">
             Interactúa con la consola de tu plan de hosting sin necesidad de instalar llaves SSH locales.
           </p>
         </div>
      </header>

      {/* Terminal Board */}
      <div className="bg-[#050B14] border border-slate-800 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden flex flex-col min-h-[500px]">
         {/* Top Bar */}
         <div className="flex justify-between items-center border-b border-slate-800 pb-5 mb-6">
            <div className="flex gap-2">
               <span className="w-3.5 h-3.5 rounded-full bg-red-500/80"></span>
               <span className="w-3.5 h-3.5 rounded-full bg-yellow-500/80"></span>
               <span className="w-3.5 h-3.5 rounded-full bg-green-500/80"></span>
            </div>
            <span className="font-mono text-[10px] text-slate-500 uppercase tracking-widest font-black">bash (user_starter@odisea)</span>
            <div className="w-4"></div>
         </div>

         {/* Shell Output */}
         <div className="flex-1 overflow-y-auto font-mono text-sm leading-relaxed space-y-4 max-h-[400px] pr-2">
            {history.map((line, idx) => (
              <div 
                key={idx} 
                className={`whitespace-pre-wrap ${
                  line.type === "input" 
                    ? "text-[#00E5FF] font-bold" 
                    : line.type === "error" 
                      ? "text-red-400" 
                      : line.type === "system" 
                        ? "text-slate-400 font-bold" 
                        : "text-slate-200"
                }`}
              >
                 {line.text}
              </div>
            ))}
            <div ref={terminalEndRef} />
         </div>

         {/* Shell Command Form */}
         <form onSubmit={handleCommandSubmit} className="mt-6 border-t border-slate-800 pt-6 flex items-center gap-3">
            <span className="font-mono text-[#00E5FF] font-black">$</span>
            <input 
              type="text" 
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Escribe un comando aquí..."
              className="flex-1 bg-transparent border-none outline-none font-mono text-sm text-white caret-[#00E5FF] placeholder:text-slate-700"
              autoFocus
            />
         </form>
      </div>
    </div>
  );
}
