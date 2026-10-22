import React from 'react';
import {
  Boxes,
  Layers,
  Package,
  Database,
  Network,
  RefreshCw,
  Plus,
  Clock,
  Server,
  Activity
} from 'lucide-react';

export function Sidebar({
  activeNav,
  onNavChange,
  containersCount,
  runningCount,
  daemonStatus,
  systemInfo,
  onRefresh,
  isRefreshing,
  onOpenCreate,
  autoRefreshInterval,
  onAutoRefreshChange,
}) {
  const isConnected = daemonStatus?.ok;
  const dockerVersion = systemInfo?.version?.Version;

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800/80 flex flex-col justify-between shrink-0 select-none">
      {/* Top Branding & Main Action */}
      <div className="p-4 space-y-4">
        {/* App Title */}
        <div className="flex items-center gap-3 px-1 py-1">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-600 to-sky-500 text-white shadow-lg shadow-blue-500/25">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-white tracking-tight flex items-center gap-1">
              <span>Docker</span>
              <span className="text-blue-400 font-light">Manager</span>
            </h1>
            <span className="text-[10px] text-slate-500 font-mono block">Control de Stacks & Contenedores</span>
          </div>
        </div>

        {/* Primary "+ Nuevo Contenedor" Button */}
        <button
          onClick={onOpenCreate}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 transition active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Contenedor</span>
        </button>

        {/* Navigation Section */}
        <div className="space-y-1 pt-2">
          <span className="px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-mono">
            Navegación
          </span>

          <nav className="space-y-1 pt-1">
            <button
              onClick={() => onNavChange('containers')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeNav === 'containers'
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4" />
                <span>Contenedores</span>
              </div>
              {containersCount > 0 && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium ${
                    activeNav === 'containers'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}
                >
                  {runningCount !== undefined ? `${runningCount}/${containersCount}` : containersCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onNavChange('images')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeNav === 'images'
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Package className="w-4 h-4" />
                <span>Imágenes</span>
              </div>
            </button>

            <button
              onClick={() => onNavChange('volumes')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeNav === 'volumes'
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Database className="w-4 h-4" />
                <span>Volúmenes</span>
              </div>
            </button>

            <button
              onClick={() => onNavChange('networks')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeNav === 'networks'
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Network className="w-4 h-4" />
                <span>Redes</span>
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Bottom Controls & Daemon Status */}
      <div className="p-4 space-y-3 border-t border-slate-900 bg-slate-950/40">
        {/* Refresh & Auto-refresh */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <select
              value={autoRefreshInterval}
              onChange={(e) => onAutoRefreshChange(Number(e.target.value))}
              className="bg-transparent text-slate-300 focus:outline-none text-xs cursor-pointer w-full font-mono"
              title="Intervalo de actualización"
            >
              <option value={0} className="bg-slate-900">Manual</option>
              <option value={3000} className="bg-slate-900">Auto: 3s</option>
              <option value={5000} className="bg-slate-900">Auto: 5s</option>
              <option value={10000} className="bg-slate-900">Auto: 10s</option>
            </select>
          </div>

          <button
            onClick={onRefresh}
            className={`p-2 rounded-xl bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white transition border border-slate-800 ${
              isRefreshing ? 'animate-spin text-blue-400' : ''
            }`}
            title="Refrescar estado ahora"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Daemon Connection Card */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-slate-500" /> Daemon
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                isConnected
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
              {isConnected ? 'Conectado' : 'Sin conexión'}
            </span>
          </div>

          {dockerVersion && (
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800/60">
              <span className="text-slate-500">Versión:</span>
              <span className="text-slate-300">v{dockerVersion}</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
