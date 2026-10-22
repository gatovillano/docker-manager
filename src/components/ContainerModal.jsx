import React, { useState } from 'react';
import {
  X,
  Play,
  Square,
  RotateCw,
  Pause,
  Trash2,
  FileText,
  Terminal as TerminalIcon,
  Activity,
  Info,
  ExternalLink,
  Layers
} from 'lucide-react';
import { LogsTab } from './modal/LogsTab';
import { TerminalTab } from './modal/TerminalTab';
import { MetricsTab } from './modal/MetricsTab';
import { InspectTab } from './modal/InspectTab';
import { getStatusColor, parsePorts } from '../utils/formatters';

export function ContainerModal({ container, onClose, onActionTriggered }) {
  const [activeTab, setActiveTab] = useState('logs');
  const [loadingAction, setLoadingAction] = useState(false);

  if (!container) return null;

  const name = container.Names?.[0]?.replace(/^\//, '') || container.Id.slice(0, 12);
  const isRunning = container.State === 'running';
  const isPaused = container.State === 'paused';
  const statusInfo = getStatusColor(container.State);
  const ports = parsePorts(container.Ports);

  const handleAction = async (actionType) => {
    if (!window.dockerAPI) return;
    setLoadingAction(true);
    try {
      if (actionType === 'start') await window.dockerAPI.startContainer(container.Id);
      if (actionType === 'stop') await window.dockerAPI.stopContainer(container.Id);
      if (actionType === 'restart') await window.dockerAPI.restartContainer(container.Id);
      if (actionType === 'pause') {
        if (isPaused) await window.dockerAPI.unpauseContainer(container.Id);
        else await window.dockerAPI.pauseContainer(container.Id);
      }
      if (actionType === 'remove') {
        if (confirm(`¿Estás seguro de eliminar el contenedor "${name}"?`)) {
          await window.dockerAPI.removeContainer(container.Id, { force: true });
          onClose();
        }
      }
      if (onActionTriggered) onActionTriggered();
    } catch (e) {
      console.error(`Error during ${actionType}:`, e);
      alert(`Error: ${e.message || e}`);
    } finally {
      setLoadingAction(false);
    }
  };

  const openPort = (url) => {
    if (window.dockerAPI && url) {
      window.dockerAPI.openExternal(url);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="flex flex-col w-full max-w-5xl h-[88vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950/70 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-slate-100 tracking-tight">{name}</h2>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusInfo.bg}`}
                >
                  <span className={`w-2 h-2 rounded-full ${statusInfo.dot} ${isRunning ? 'animate-pulse' : ''}`} />
                  {statusInfo.text}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
                <span>{container.Image}</span>
                <span>•</span>
                <span>ID: {container.Id.slice(0, 12)}</span>
                {ports.length > 0 && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-1.5">
                      {ports.map((p, idx) => (
                        <span key={idx}>
                          {p.clickable ? (
                            <button
                              onClick={() => openPort(p.url)}
                              className="text-sky-400 hover:text-sky-300 hover:underline flex items-center gap-0.5"
                            >
                              {p.display}
                              <ExternalLink className="w-2.5 h-2.5" />
                            </button>
                          ) : (
                            <span className="text-slate-500">{p.display}</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Controls & Close */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
              {isRunning ? (
                <>
                  <button
                    disabled={loadingAction}
                    onClick={() => handleAction('stop')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition disabled:opacity-50"
                    title="Detener contenedor"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Detener</span>
                  </button>
                  <button
                    disabled={loadingAction}
                    onClick={() => handleAction('restart')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-400 hover:bg-blue-500/10 transition disabled:opacity-50"
                    title="Reiniciar contenedor"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Reiniciar</span>
                  </button>
                  <button
                    disabled={loadingAction}
                    onClick={() => handleAction('pause')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-400 hover:bg-amber-500/10 transition disabled:opacity-50"
                    title={isPaused ? 'Reanudar contenedor' : 'Pausar contenedor'}
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>{isPaused ? 'Reanudar' : 'Pausar'}</span>
                  </button>
                </>
              ) : (
                <button
                  disabled={loadingAction}
                  onClick={() => handleAction('start')}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition disabled:opacity-50"
                  title="Iniciar contenedor"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Iniciar</span>
                </button>
              )}

              <button
                disabled={loadingAction}
                onClick={() => handleAction('remove')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition disabled:opacity-50"
                title="Eliminar contenedor"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Cerrar modal (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 bg-slate-950/40 border-b border-slate-800">
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'logs'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Logs</span>
          </button>

          <button
            onClick={() => setActiveTab('terminal')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'terminal'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <TerminalIcon className="w-4 h-4" />
            <span>Terminal Shell</span>
          </button>

          <button
            onClick={() => setActiveTab('metrics')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'metrics'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Métricas en Vivo</span>
          </button>

          <button
            onClick={() => setActiveTab('inspect')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'inspect'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Info className="w-4 h-4" />
            <span>Inspección</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 p-6 overflow-hidden">
          {activeTab === 'logs' && <LogsTab containerId={container.Id} containerName={name} />}
          {activeTab === 'terminal' && <TerminalTab containerId={container.Id} isRunning={isRunning} />}
          {activeTab === 'metrics' && <MetricsTab containerId={container.Id} isRunning={isRunning} />}
          {activeTab === 'inspect' && <InspectTab containerId={container.Id} />}
        </div>
      </div>
    </div>
  );
}
