import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RefreshCw, Copy, Check, Download, Trash2, Search, ArrowDown } from 'lucide-react';

export function LogsTab({ containerId, containerName }) {
  const [logs, setLogs] = useState('');
  const [isStreaming, setIsStreaming] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [tailCount, setTailCount] = useState(300);
  const logsEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const streamIdRef = useRef(`stream-${containerId}-${Date.now()}`);

  // Fetch initial or snapshot logs
  const fetchLogs = async () => {
    if (!window.dockerAPI) return;
    try {
      const res = await window.dockerAPI.getLogs(containerId, { tail: tailCount, timestamps: true });
      if (res.ok) {
        setLogs(res.logs || 'Sin logs disponibles para este contenedor.');
      }
    } catch (e) {
      console.error('Error fetching logs:', e);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [containerId, tailCount]);

  // Live Stream
  useEffect(() => {
    if (!isStreaming || !window.dockerAPI) return;

    const streamId = streamIdRef.current;
    let unsub = null;

    window.dockerAPI.startLogStream(streamId, containerId).then(() => {
      unsub = window.dockerAPI.onLogData(streamId, (chunk) => {
        setLogs((prev) => {
          const next = prev + chunk;
          // Keep reasonable memory limit (max ~5000 lines)
          if (next.length > 500000) {
            return next.slice(-400000);
          }
          return next;
        });
      });
    });

    return () => {
      if (window.dockerAPI) {
        window.dockerAPI.stopLogStream(streamId);
      }
      if (unsub) unsub();
    };
  }, [containerId, isStreaming]);

  // Handle auto-scroll
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const handleCopy = () => {
    navigator.clipboard.writeText(logs);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([logs], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${containerName || containerId}-logs.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredLines = React.useMemo(() => {
    if (!logs) return [];
    const lines = logs.split('\n');
    if (!searchQuery.trim()) return lines;
    const q = searchQuery.toLowerCase();
    return lines.filter((line) => line.toLowerCase().includes(q));
  }, [logs, searchQuery]);

  return (
    <div className="flex flex-col h-[520px] bg-slate-950/70 border border-slate-800 rounded-xl overflow-hidden shadow-inner">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 text-xs">
        {/* Left: Stream controls & search */}
        <div className="flex items-center gap-2 flex-1 min-w-[280px]">
          <button
            onClick={() => setIsStreaming(!isStreaming)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition-all ${
              isStreaming
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
            }`}
            title={isStreaming ? 'Pausar transmisión en vivo' : 'Iniciar transmisión en vivo'}
          >
            {isStreaming ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>En vivo</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Pausado</span>
              </>
            )}
          </button>

          <button
            onClick={fetchLogs}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors border border-slate-700"
            title="Refrescar logs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar en logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-8 pr-2.5 py-1 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 text-xs font-mono"
            />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5">
          <select
            value={tailCount}
            onChange={(e) => setTailCount(Number(e.target.value))}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-slate-300 focus:outline-none text-xs"
          >
            <option value={100}>Últimas 100 líneas</option>
            <option value={300}>Últimas 300 líneas</option>
            <option value={1000}>Últimas 1000 líneas</option>
          </select>

          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-all ${
              autoScroll
                ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
            }`}
            title="Auto-scroll"
          >
            <ArrowDown className="w-3.5 h-3.5" />
            <span>Auto-scroll</span>
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors border border-slate-700"
            title="Copiar logs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copiado' : 'Copiar'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors border border-slate-700"
            title="Descargar archivo .log"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setLogs('')}
            className="p-1.5 rounded-lg bg-slate-800 text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition-colors border border-slate-700"
            title="Limpiar vista"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal View Container */}
      <div
        ref={scrollContainerRef}
        className="flex-1 p-3 overflow-y-auto font-mono text-[11px] leading-relaxed select-text"
      >
        {filteredLines.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 italic">
            {searchQuery ? 'No se encontraron coincidencias' : 'Cargando logs...'}
          </div>
        ) : (
          filteredLines.map((line, idx) => (
            <div
              key={idx}
              className={`hover:bg-slate-800/40 px-1.5 py-0.5 rounded break-all whitespace-pre-wrap ${
                line.toLowerCase().includes('error') || line.toLowerCase().includes('fatal')
                  ? 'text-rose-400 bg-rose-950/20'
                  : line.toLowerCase().includes('warn')
                  ? 'text-amber-300 bg-amber-950/20'
                  : 'text-slate-300'
              }`}
            >
              {line}
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}
