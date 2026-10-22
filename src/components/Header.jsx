import React from 'react';
import {
  Boxes,
  Layers,
  Package,
  Database,
  Network,
  RefreshCw,
  Plus,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';

export function Header({
  activeNav,
  onNavChange,
  containersCount,
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
    <header className="flex flex-col border-b border-slate-800 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40">
      <div className="flex items-center justify-between px-6 py-3.5">
        {/* Left: Brand + Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-600 to-sky-500 text-white shadow-lg shadow-blue-500/20">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-white tracking-tight flex items-center gap-1.5">
                <span>Docker</span>
                <span className="text-blue-400 font-light">Manager</span>
              </h1>
              <span className="text-[10px] text-slate-500 block font-mono">Control de Contenedores</span>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-800 mx-1 hidden sm:block" />

          {/* Daemon Status Badge */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs">
            {isConnected ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-medium text-slate-300">Docker Daemon</span>
                {dockerVersion && (
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-900/60">
                    v{dockerVersion}
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="font-medium text-rose-400">Desconectado</span>
              </>
            )}
          </div>
        </div>

        {/* Center: Navigation Pills */}
        <nav className="flex items-center bg-slate-900 p-1 rounded-2xl border border-slate-800">
          <button
            onClick={() => onNavChange('containers')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeNav === 'containers'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Contenedores</span>
            {containersCount > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeNav === 'containers' ? 'bg-blue-700 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {containersCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onNavChange('images')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeNav === 'images'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Imágenes</span>
          </button>

          <button
            onClick={() => onNavChange('volumes')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeNav === 'volumes'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Volúmenes</span>
          </button>

          <button
            onClick={() => onNavChange('networks')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeNav === 'networks'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Network className="w-4 h-4" />
            <span>Redes</span>
          </button>
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5">
          {/* Auto Refresh Dropdown */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={autoRefreshInterval}
              onChange={(e) => onAutoRefreshChange(Number(e.target.value))}
              className="bg-transparent text-slate-300 focus:outline-none text-xs cursor-pointer"
              title="Intervalo de actualización automática"
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
            title="Refrescar estado"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenCreate}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden md:inline">Nuevo Contenedor</span>
          </button>
        </div>
      </div>
    </header>
  );
}
