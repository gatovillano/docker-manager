import React from 'react';
import {
  Play,
  Square,
  RotateCw,
  Pause,
  Trash2,
  FileText,
  Terminal as TerminalIcon,
  ExternalLink,
  Cpu,
  Layers,
  ChevronRight
} from 'lucide-react';
import { getStatusColor, parsePorts, formatRelativeTime } from '../utils/formatters';

export function ContainerCard({
  container,
  onSelect,
  onStart,
  onStop,
  onRestart,
  onPause,
  onRemove,
  onOpenLogs,
  onOpenTerminal,
}) {
  const name = container.Names?.[0]?.replace(/^\//, '') || container.Id.slice(0, 12);
  const isRunning = container.State === 'running';
  const isPaused = container.State === 'paused';
  const statusInfo = getStatusColor(container.State);
  const ports = parsePorts(container.Ports);

  const openPort = (e, url) => {
    e.stopPropagation();
    if (window.dockerAPI && url) {
      window.dockerAPI.openExternal(url);
    }
  };

  return (
    <div
      onClick={() => onSelect(container)}
      className="group relative flex flex-col justify-between p-5 bg-slate-900/70 hover:bg-slate-900/90 border border-slate-800/80 hover:border-slate-700 rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl hover:shadow-black/40 cursor-pointer"
    >
      <div>
        {/* Top Header: State & Name */}
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`p-2 rounded-xl border ${
                isRunning
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              <Layers className="w-4 h-4 shrink-0" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-100 truncate group-hover:text-blue-400 transition-colors">
                {name}
              </h3>
              <span className="text-[11px] font-mono text-slate-400 truncate block">
                {container.Image}
              </span>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border shrink-0 ${statusInfo.bg}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot} ${isRunning ? 'animate-pulse' : ''}`} />
            {statusInfo.text}
          </span>
        </div>

        {/* Ports & Metadata */}
        <div className="space-y-2 mt-3 pt-3 border-t border-slate-800/60 text-xs">
          {ports.length > 0 && (
            <div className="flex items-center flex-wrap gap-1.5">
              <span className="text-[10px] text-slate-500 uppercase font-mono">Puertos:</span>
              {ports.map((p, idx) => (
                <span key={idx}>
                  {p.clickable ? (
                    <button
                      onClick={(e) => openPort(e, p.url)}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-950/60 hover:bg-sky-900/60 border border-sky-800/60 text-sky-400 font-mono text-[10px] transition"
                      title="Abrir en navegador"
                    >
                      {p.display}
                      <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  ) : (
                    <span className="inline-block px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 font-mono text-[10px] border border-slate-800">
                      {p.display}
                    </span>
                  )}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>ID: {container.Id.slice(0, 12)}</span>
            <span>{formatRelativeTime(container.Created)}</span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div
        className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800/80"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Quick Operations */}
        <div className="flex items-center gap-1">
          {isRunning ? (
            <>
              <button
                onClick={() => onStop(container)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                title="Detener"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>
              <button
                onClick={() => onRestart(container)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition"
                title="Reiniciar"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onPause(container)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition"
                title={isPaused ? 'Reanudar' : 'Pausar'}
              >
                <Pause className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <button
              onClick={() => onStart(container)}
              className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition"
              title="Iniciar"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
            </button>
          )}

          <button
            onClick={() => onOpenLogs(container)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition"
            title="Ver logs"
          >
            <FileText className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onOpenTerminal(container)}
            className={`p-1.5 rounded-lg transition ${
              isRunning ? 'text-slate-400 hover:text-sky-400 hover:bg-sky-500/10' : 'text-slate-600 cursor-not-allowed'
            }`}
            disabled={!isRunning}
            title={isRunning ? 'Consola interactiva' : 'Requiere contenedor en ejecución'}
          >
            <TerminalIcon className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onRemove(container)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
            title="Eliminar"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right Click Indicator */}
        <div
          onClick={() => onSelect(container)}
          className="flex items-center gap-0.5 text-xs text-slate-400 group-hover:text-blue-400 transition"
        >
          <span>Detalles</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
}
