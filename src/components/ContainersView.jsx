import React, { useState, useMemo } from 'react';
import {
  LayoutGrid,
  List,
  Search,
  Filter,
  Play,
  Square,
  Trash2,
  ExternalLink,
  ChevronRight,
  Layers,
  FileText,
  Terminal as TerminalIcon,
  RotateCw
} from 'lucide-react';
import { ContainerCard } from './ContainerCard';
import { getStatusColor, parsePorts, formatRelativeTime } from '../utils/formatters';

export function ContainersView({
  containers,
  onSelectContainer,
  onRefresh,
  onStartContainer,
  onStopContainer,
  onRestartContainer,
  onPauseContainer,
  onRemoveContainer,
  onOpenLogs,
  onOpenTerminal,
}) {
  const [filterState, setFilterState] = useState('all'); // all, running, exited, paused
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'

  const counts = useMemo(() => {
    let running = 0;
    let exited = 0;
    let paused = 0;
    containers.forEach((c) => {
      if (c.State === 'running') running++;
      else if (c.State === 'paused') paused++;
      else exited++;
    });
    return { all: containers.length, running, exited, paused };
  }, [containers]);

  const filteredContainers = useMemo(() => {
    return containers.filter((c) => {
      // Status filter
      if (filterState === 'running' && c.State !== 'running') return false;
      if (filterState === 'exited' && c.State !== 'exited' && c.State !== 'stopped' && c.State !== 'dead') return false;
      if (filterState === 'paused' && c.State !== 'paused') return false;

      // Text search
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const name = (c.Names?.[0] || '').toLowerCase();
      const image = (c.Image || '').toLowerCase();
      const id = (c.Id || '').toLowerCase();
      const ports = JSON.stringify(c.Ports || []).toLowerCase();

      return name.includes(q) || image.includes(q) || id.includes(q) || ports.includes(q);
    });
  }, [containers, filterState, searchQuery]);

  const openPort = (e, url) => {
    e.stopPropagation();
    if (window.dockerAPI && url) {
      window.dockerAPI.openExternal(url);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Subheader Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 bg-slate-900/60 border-b border-slate-800">
        {/* Status Filters */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFilterState('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterState === 'all'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            Todos ({counts.all})
          </button>
          <button
            onClick={() => setFilterState('running')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterState === 'running'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'bg-slate-800 text-slate-400 hover:text-emerald-400 hover:bg-slate-700'
            }`}
          >
            En ejecución ({counts.running})
          </button>
          <button
            onClick={() => setFilterState('exited')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterState === 'exited'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-700'
            }`}
          >
            Detenidos ({counts.exited})
          </button>
          <button
            onClick={() => setFilterState('paused')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterState === 'paused'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'bg-slate-800 text-slate-400 hover:text-amber-400 hover:bg-slate-700'
            }`}
          >
            Pausados ({counts.paused})
          </button>
        </div>

        {/* Search & View Mode Switcher */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar contenedor, imagen, puerto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'grid' ? 'bg-slate-800 text-blue-400 shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Vista de cuadrícula"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'table' ? 'bg-slate-800 text-blue-400 shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Vista de tabla"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Containers Area */}
      <div className="flex-1 p-6 overflow-y-auto">
        {filteredContainers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-80 text-center text-slate-400">
            <Layers className="w-12 h-12 text-slate-600 mb-3" />
            <h3 className="text-base font-semibold text-slate-300 mb-1">No se encontraron contenedores</h3>
            <p className="text-xs text-slate-500 max-w-sm">
              {searchQuery
                ? 'Ningún contenedor coincide con los términos de búsqueda.'
                : 'No hay contenedores en este estado.'}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredContainers.map((container) => (
              <ContainerCard
                key={container.Id}
                container={container}
                onSelect={onSelectContainer}
                onStart={onStartContainer}
                onStop={onStopContainer}
                onRestart={onRestartContainer}
                onPause={onPauseContainer}
                onRemove={onRemoveContainer}
                onOpenLogs={onOpenLogs}
                onOpenTerminal={onOpenTerminal}
              />
            ))}
          </div>
        ) : (
          /* Table View */
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
                <tr>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Imagen</th>
                  <th className="px-4 py-3">Puertos</th>
                  <th className="px-4 py-3">Creado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredContainers.map((c) => {
                  const name = c.Names?.[0]?.replace(/^\//, '') || c.Id.slice(0, 12);
                  const isRunning = c.State === 'running';
                  const isPaused = c.State === 'paused';
                  const statusInfo = getStatusColor(c.State);
                  const ports = parsePorts(c.Ports);

                  return (
                    <tr
                      key={c.Id}
                      onClick={() => onSelectContainer(c)}
                      className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusInfo.bg}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot} ${isRunning ? 'animate-pulse' : ''}`} />
                          {statusInfo.text}
                        </span>
                      </td>

                      <td className="px-4 py-3 font-semibold text-slate-200">
                        <div className="flex items-center gap-1.5">
                          <span>{name}</span>
                          <span className="text-[10px] font-mono text-slate-500">({c.Id.slice(0, 8)})</span>
                        </div>
                      </td>

                      <td className="px-4 py-3 font-mono text-[11px] text-slate-400 truncate max-w-xs">
                        {c.Image}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          {ports.length === 0 ? (
                            <span className="text-slate-600">-</span>
                          ) : (
                            ports.map((p, idx) => (
                              <span key={idx}>
                                {p.clickable ? (
                                  <button
                                    onClick={(e) => openPort(e, p.url)}
                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-sky-950/60 hover:bg-sky-900/60 border border-sky-800/60 text-sky-400 font-mono text-[10px]"
                                  >
                                    {p.display}
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </button>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 font-mono text-[10px] border border-slate-800">
                                    {p.display}
                                  </span>
                                )}
                              </span>
                            ))
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {formatRelativeTime(c.Created)}
                      </td>

                      <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {isRunning ? (
                            <>
                              <button
                                onClick={() => onStopContainer(c)}
                                className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                                title="Detener"
                              >
                                <Square className="w-3.5 h-3.5 fill-current" />
                              </button>
                              <button
                                onClick={() => onRestartContainer(c)}
                                className="p-1 rounded text-slate-400 hover:text-blue-400 hover:bg-blue-500/10"
                                title="Reiniciar"
                              >
                                <RotateCw className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onPauseContainer(c)}
                                className="p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-amber-500/10"
                                title={isPaused ? 'Reanudar' : 'Pausar'}
                              >
                                <Pause className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => onStartContainer(c)}
                              className="p-1 rounded text-emerald-400 hover:bg-emerald-500/10"
                              title="Iniciar"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                            </button>
                          )}

                          <button
                            onClick={() => onOpenLogs(c)}
                            className="p-1 rounded text-slate-400 hover:text-blue-400 hover:bg-blue-500/10"
                            title="Logs"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onOpenTerminal(c)}
                            disabled={!isRunning}
                            className={`p-1 rounded ${
                              isRunning
                                ? 'text-slate-400 hover:text-sky-400 hover:bg-sky-500/10'
                                : 'text-slate-600 cursor-not-allowed'
                            }`}
                            title="Consola"
                          >
                            <TerminalIcon className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onRemoveContainer(c)}
                            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
