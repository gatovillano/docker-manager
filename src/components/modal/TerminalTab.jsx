import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { RefreshCw, Trash2, Terminal as TerminalIcon, AlertCircle } from 'lucide-react';

export function TerminalTab({ containerId, isRunning }) {
  const terminalRef = useRef(null);
  const xtermInstance = useRef(null);
  const fitAddonRef = useRef(null);
  const [shell, setShell] = useState('/bin/bash');
  const [sessionActive, setSessionActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const sessionIdRef = useRef(`term-${containerId}-${Date.now()}`);

  const startTerminalSession = async (chosenShell = shell) => {
    if (!isRunning) {
      setErrorMsg('El contenedor no está en ejecución. Inícialo para abrir una consola interactiva.');
      return;
    }

    if (!window.dockerAPI) return;
    setErrorMsg(null);

    // Initialize or clear xterm
    if (!xtermInstance.current && terminalRef.current) {
      const term = new XTerm({
        cursorBlink: true,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 13,
        lineHeight: 1.25,
        theme: {
          background: '#090d16',
          foreground: '#e2e8f0',
          cursor: '#38bdf8',
          cursorAccent: '#090d16',
          selectionBackground: '#1e3a8a',
          black: '#0f172a',
          red: '#f87171',
          green: '#4ade80',
          yellow: '#facc15',
          blue: '#60a5fa',
          magenta: '#c084fc',
          cyan: '#38bdf8',
          white: '#f1f5f9',
        },
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(terminalRef.current);

      try {
        fitAddon.fit();
      } catch (e) {}

      xtermInstance.current = term;
      fitAddonRef.current = fitAddon;
    }

    const term = xtermInstance.current;
    if (term) {
      term.clear();
      term.write(`\x1b[1;34m Conectando consola interactiva (${chosenShell})...\x1b[0m\r\n`);
    }

    const sessionId = sessionIdRef.current;

    // Start exec in backend
    const res = await window.dockerAPI.startExecTerminal(sessionId, containerId, {
      shell: chosenShell,
      cols: term ? term.cols : 80,
      rows: term ? term.rows : 24,
    });

    if (!res.ok) {
      setErrorMsg(`No se pudo conectar a ${chosenShell}: ${res.error}. Puedes probar con /bin/sh.`);
      if (term) term.write(`\r\n\x1b[1;31mError: ${res.error}\x1b[0m\r\n`);
      setSessionActive(false);
      return;
    }

    setSessionActive(true);

    // Attach listeners
    const unsubData = window.dockerAPI.onExecData(sessionId, (data) => {
      if (term) term.write(data);
    });

    const unsubExit = window.dockerAPI.onExecExit(sessionId, (err) => {
      if (term) term.write('\r\n\x1b[1;33m[Sesión de terminal finalizada]\x1b[0m\r\n');
      setSessionActive(false);
    });

    // Listen to user input from xterm
    const onDataDisposable = term.onData((data) => {
      window.dockerAPI.writeExecTerminal(sessionId, data);
    });

    // Resize observer
    const handleResize = () => {
      if (fitAddonRef.current && term) {
        try {
          fitAddonRef.current.fit();
          window.dockerAPI.resizeExecTerminal(sessionId, term.cols, term.rows);
        } catch (e) {}
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      unsubData();
      unsubExit();
      onDataDisposable.dispose();
      window.removeEventListener('resize', handleResize);
      window.dockerAPI.closeExecTerminal(sessionId);
    };
  };

  useEffect(() => {
    let cleanupFn = null;
    if (isRunning) {
      startTerminalSession(shell).then((cleanup) => {
        cleanupFn = cleanup;
      });
    }

    return () => {
      if (cleanupFn) cleanupFn();
      if (window.dockerAPI) {
        window.dockerAPI.closeExecTerminal(sessionIdRef.current);
      }
    };
  }, [containerId, isRunning]);

  const handleShellChange = (newShell) => {
    setShell(newShell);
    sessionIdRef.current = `term-${containerId}-${Date.now()}`;
    startTerminalSession(newShell);
  };

  const handleClear = () => {
    if (xtermInstance.current) {
      xtermInstance.current.clear();
    }
  };

  const handleReconnect = () => {
    sessionIdRef.current = `term-${containerId}-${Date.now()}`;
    startTerminalSession(shell);
  };

  if (!isRunning) {
    return (
      <div className="flex flex-col items-center justify-center h-[520px] bg-slate-950/70 border border-slate-800 rounded-xl p-6 text-center text-slate-400">
        <AlertCircle className="w-12 h-12 text-amber-400 mb-3" />
        <h3 className="text-base font-semibold text-slate-200 mb-1">Contenedor Detenido</h3>
        <p className="text-xs max-w-sm text-slate-400">
          La terminal interactiva requiere que el contenedor esté en ejecución. Inicia el contenedor desde los controles superiores para ejecutar comandos en su interior.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[520px] bg-[#090d16] border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Terminal Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4 text-sky-400" />
          <span className="font-semibold text-slate-200">Shell Exec:</span>

          <select
            value={shell}
            onChange={(e) => handleShellChange(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-slate-300 font-mono text-xs focus:outline-none focus:border-sky-500"
          >
            <option value="/bin/bash">/bin/bash</option>
            <option value="/bin/sh">/bin/sh</option>
            <option value="/bin/zsh">/bin/zsh</option>
          </select>

          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${
              sessionActive
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${sessionActive ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}
            />
            {sessionActive ? 'Conectado' : 'Desconectado'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleReconnect}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors border border-slate-700 text-xs"
            title="Reiniciar sesión de consola"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reconectar</span>
          </button>

          <button
            onClick={handleClear}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors border border-slate-700"
            title="Limpiar pantalla"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="px-4 py-2 bg-rose-950/40 border-b border-rose-900/60 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Terminal mount node */}
      <div className="flex-1 p-2 overflow-hidden" ref={terminalRef} />
    </div>
  );
}
