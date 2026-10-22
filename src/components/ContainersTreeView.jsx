import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Layers,
  Search,
  Play,
  Square,
  RotateCw,
  Pause,
  Trash2,
  FileText,
  Terminal as TerminalIcon,
  ExternalLink,
  ChevronsUpDown,
  Boxes,
  HelpCircle,
  Clock
} from 'lucide-react';
import { getStatusColor, parsePorts, formatRelativeTime } from '../utils/formatters';

export function ContainersTreeView({
  containers,
  onSelectContainer,
  onStartContainer,
  onStopContainer,
  onRestartContainer,
  onPauseContainer,
  onRemoveContainer,
  onOpenLogs,
  onOpenTerminal,
  onStartStack,
  onStopStack,
  onRestartStack,
}) {
  const [filterState, setFilterState] = useState('all'); // all, running, exited, paused
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedStacks, setCollapsedStacks] = useState({});
  const [loadingStackAction, setLoadingStackAction] = useState({});

  // Group containers by stack (using com.docker.compose.project label or fallback to "Independientes")
  const { stacks, counts } = useMemo(() => {
    const map = new Map();
    let totalRunning = 0;
    let totalExited = 0;
    let totalPaused = 0;

    containers.forEach((c) => {
      if (c.State === 'running') totalRunning++;
      else if (c.State === 'paused') totalPaused++;
      else totalExited++;

      const stackName = c.Labels?.['com.docker.compose.project'] || 'Independientes';

      if (!map.has(stackName)) {
        map.set(stackName, []);
      }
      map.get(stackName).push(c);
    });

    const stackList = Array.from(map.entries()).map(([name, items]) => {
      const runningCount = items.filter((i) => i.State === 'running').length;
      let workingDir = null;
      let configFile = null;

      for (const item of items) {
        if (item.Labels) {
          if (!workingDir && item.Labels['com.docker.compose.project.working_dir']) {
            workingDir = item.Labels['com.docker.compose.project.working_dir'];
          }
          if (!configFile && item.Labels['com.docker.compose.project.config_files']) {
            configFile = item.Labels['com.docker.compose.project.config_files'].split(',')[0];
          }
        }
      }

      return {
        name,
        isDefault: name === 'Independientes',
        containers: items,
        total: items.length,
        running: runningCount,
        workingDir,
        configFile,
      };
    });

    // Sort: compose stacks first alphabetically, "Independientes" at the end
    stackList.sort((a, b) => {
      if (a.isDefault) return 1;
      if (b.isDefault) return -1;
      return a.name.localeCompare(b.name);
    });

    return {
      stacks: stackList,
      counts: {
        all: containers.length,
        running: totalRunning,
        exited: totalExited,
        paused: totalPaused,
      },
    };
  }, [containers]);

  // Filter stacks and containers based on search and status
  const filteredStacks = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return stacks
      .map((stack) => {
        const matchingContainers = stack.containers.filter((c) => {
          // Status filter
          if (filterState === 'running' && c.State !== 'running') return false;
          if (filterState === 'exited' && c.State !== 'exited' && c.State !== 'stopped' && c.State !== 'dead') return false;
          if (filterState === 'paused' && c.State !== 'paused') return false;

          // Search query
          if (!q) return true;
          const name = (c.Names?.[0] || '').toLowerCase();
          const image = (c.Image || '').toLowerCase();
          const id = (c.Id || '').toLowerCase();
          const service = (c.Labels?.['com.docker.compose.service'] || '').toLowerCase();
          const stackN = stack.name.toLowerCase();

          return name.includes(q) || image.includes(q) || id.includes(q) || service.includes(q) || stackN.includes(q);
        });

        return {
          ...stack,
          containers: matchingContainers,
        };
      })
      .filter((stack) => stack.containers.length > 0);
  }, [stacks, filterState, searchQuery]);

  const toggleStack = (stackName) => {
    setCollapsedStacks((prev) => ({
      ...prev,
      [stackName]: !prev[stackName],
    }));
  };

  const expandAll = () => setCollapsedStacks({});
  const collapseAll = () => {
    const next = {};
    stacks.forEach((s) => (next[s.name] = true));
    setCollapsedStacks(next);
  };

  const openPort = (e, url) => {
    e.stopPropagation();
    if (window.dockerAPI && url) {
      window.dockerAPI.openExternal(url);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
      {/* Top Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 bg-slate-900/60 border-b border-slate-800/80">
        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFilterState('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterState === 'all'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            Todos ({counts.all})
          </button>
          <button
            onClick={() => setFilterState('running')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterState === 'running'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                : 'bg-slate-800 text-slate-400 hover:text-emerald-400 hover:bg-slate-700'
            }`}
          >
            En ejecución ({counts.running})
          </button>
          <button
            onClick={() => setFilterState('exited')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterState === 'exited'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/25'
                : 'bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-700'
            }`}
          >
            Detenidos ({counts.exited})
          </button>
          <button
            onClick={() => setFilterState('paused')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterState === 'paused'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/25'
                : 'bg-slate-800 text-slate-400 hover:text-amber-400 hover:bg-slate-700'
            }`}
          >
            Pausados ({counts.paused})
          </button>
        </div>

        {/* Search and Expand/Collapse actions */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar en stacks o contenedores..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
            <button
              onClick={expandAll}
              className="px-2.5 py-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Expandir todos los stacks"
            >
              Expandir
            </button>
            <button
              onClick={collapseAll}
              className="px-2.5 py-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Colapsar todos los stacks"
            >
              Colapsar
            </button>
          </div>
        </div>
      </div>

      {/* Main Tree View Area */}
      <div className="flex-1 p-6 overflow-y-auto space-y-4">
        {filteredStacks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-80 text-center text-slate-500">
            <Boxes className="w-12 h-12 text-slate-700 mb-3" />
            <h3 className="text-base font-semibold text-slate-300 mb-1">No se encontraron contenedores ni stacks</h3>
            <p className="text-xs text-slate-500 max-w-sm">
              {searchQuery
                ? 'Ningún stack o contenedor coincide con los términos de búsqueda.'
                : 'No hay contenedores registrados en el daemon.'}
            </p>
          </div>
        ) : (
          filteredStacks.map((stack) => {
            const isCollapsed = Boolean(collapsedStacks[stack.name]);
            const allRunning = stack.running === stack.total && stack.total > 0;
            const noneRunning = stack.running === 0;

            return (
              <div
                key={stack.name}
                className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-lg transition-all"
              >
                {/* Stack Group Header Node */}
                <div
                  onClick={() => toggleStack(stack.name)}
                  className="flex items-center justify-between px-4 py-3 bg-slate-900/90 hover:bg-slate-850 cursor-pointer border-b border-slate-800/60 transition group select-none"
                >
                  {/* Left: Chevron + Icon + Stack Name */}
                  <div className="flex items-center gap-3">
                    <button className="text-slate-400 group-hover:text-white transition">
                      {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {isCollapsed ? <Folder className="w-4 h-4" /> : <FolderOpen className="w-4 h-4" />}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-100 group-hover:text-blue-400 transition-colors font-mono">
                        {stack.name}
                      </span>

                      {/* Stack Running Badge */}
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border font-mono ${
                          allRunning
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : noneRunning
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            allRunning ? 'bg-emerald-400 animate-pulse' : noneRunning ? 'bg-rose-400' : 'bg-amber-400'
                          }`}
                        />
                        <span>
                          {stack.running}/{stack.total} activos
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Right: Stack Batch Actions */}
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {stack.workingDir && (
                      <button
                        onClick={() => {
                          if (window.dockerAPI?.openPath) {
                            window.dockerAPI.openPath(stack.workingDir);
                          }
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 text-amber-300 hover:text-amber-200 hover:bg-slate-700/80 border border-slate-700 text-xs font-medium transition shadow-sm"
                        title={`Abrir carpeta local:\n${stack.workingDir}`}
                      >
                        <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                        <span className="hidden sm:inline font-sans">Carpeta</span>
                      </button>
                    )}

                    <button
                      disabled={Boolean(loadingStackAction[stack.name])}
                      onClick={async () => {
                        setLoadingStackAction((prev) => ({ ...prev, [stack.name]: 'up' }));
                        try {
                          await onStartStack(stack);
                        } finally {
                          setLoadingStackAction((prev) => ({ ...prev, [stack.name]: null }));
                        }
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 text-emerald-400 hover:bg-emerald-500/20 border border-slate-700 hover:border-emerald-500/40 text-xs font-medium transition disabled:opacity-50"
                      title={
                        stack.workingDir || !stack.isDefault
                          ? `Ejecutar 'docker compose up -d' (${stack.name})`
                          : 'Iniciar contenedores del stack'
                      }
                    >
                      {loadingStackAction[stack.name] === 'up' ? (
                        <RotateCw className="w-3 h-3 animate-spin text-emerald-400" />
                      ) : (
                        <Play className="w-3 h-3 fill-current" />
                      )}
                      <span>{loadingStackAction[stack.name] === 'up' ? 'Iniciando...' : 'Iniciar Stack'}</span>
                    </button>

                    <button
                      disabled={Boolean(loadingStackAction[stack.name])}
                      onClick={async () => {
                        setLoadingStackAction((prev) => ({ ...prev, [stack.name]: 'stop' }));
                        try {
                          await onStopStack(stack);
                        } finally {
                          setLoadingStackAction((prev) => ({ ...prev, [stack.name]: null }));
                        }
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 text-rose-400 hover:bg-rose-500/20 border border-slate-700 hover:border-rose-500/40 text-xs font-medium transition disabled:opacity-50"
                      title={
                        stack.workingDir || !stack.isDefault
                          ? `Ejecutar 'docker compose stop' (${stack.name})`
                          : 'Detener contenedores del stack'
                      }
                    >
                      {loadingStackAction[stack.name] === 'stop' ? (
                        <RotateCw className="w-3 h-3 animate-spin text-rose-400" />
                      ) : (
                        <Square className="w-3 h-3 fill-current" />
                      )}
                      <span>{loadingStackAction[stack.name] === 'stop' ? 'Deteniendo...' : 'Detener Stack'}</span>
                    </button>

                    <button
                      disabled={Boolean(loadingStackAction[stack.name])}
                      onClick={async () => {
                        setLoadingStackAction((prev) => ({ ...prev, [stack.name]: 'restart' }));
                        try {
                          await onRestartStack(stack);
                        } finally {
                          setLoadingStackAction((prev) => ({ ...prev, [stack.name]: null }));
                        }
                      }}
                      className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-blue-400 hover:bg-slate-700 border border-slate-700 transition disabled:opacity-50"
                      title={
                        stack.workingDir || !stack.isDefault
                          ? `Ejecutar 'docker compose restart' (${stack.name})`
                          : 'Reiniciar contenedores del stack'
                      }
                    >
                      <RotateCw
                        className={`w-3.5 h-3.5 ${loadingStackAction[stack.name] === 'restart' ? 'animate-spin text-blue-400' : ''}`}
                      />
                    </button>
                  </div>
                </div>

                {/* Stack Children Tree Rows */}
                {!isCollapsed && (
                  <div className="divide-y divide-slate-800/40 bg-slate-950/40">
                    {stack.containers.map((container, idx) => {
                      const name = container.Names?.[0]?.replace(/^\//, '') || container.Id.slice(0, 12);
                      const service = container.Labels?.['com.docker.compose.service'];
                      const isRunning = container.State === 'running';
                      const isPaused = container.State === 'paused';
                      const statusInfo = getStatusColor(container.State);
                      const ports = parsePorts(container.Ports);

                      return (
                        <div
                          key={container.Id}
                          onClick={() => onSelectContainer(container)}
                          className="flex items-center justify-between px-6 py-3 hover:bg-slate-800/40 transition-colors cursor-pointer group"
                        >
                          {/* Tree branch line + Status + Container details */}
                          <div className="flex items-center gap-3.5 min-w-0 flex-1">
                            {/* Branch tree guide icon */}
                            <div className="text-slate-700 font-mono text-sm select-none pl-2">
                              {idx === stack.containers.length - 1 ? '└─' : '├─'}
                            </div>

                            {/* Status Dot */}
                            <div
                              className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusInfo.dot} ${
                                isRunning ? 'animate-pulse' : ''
                              }`}
                              title={statusInfo.text}
                            />

                            {/* Container Identification */}
                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-200 group-hover:text-blue-400 transition-colors font-mono truncate">
                                  {name}
                                </span>

                                {service && (
                                  <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono text-[10px] border border-slate-700/80">
                                    svc: {service}
                                  </span>
                                )}

                                <span className="text-[10px] text-slate-500 font-mono">
                                  ({container.Id.slice(0, 8)})
                                </span>
                              </div>

                              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono truncate">
                                <span className="truncate">{container.Image}</span>
                                <span>•</span>
                                <span className="text-slate-500">{formatRelativeTime(container.Created)}</span>
                              </div>
                            </div>

                            {/* Clickable Ports */}
                            {ports.length > 0 && (
                              <div className="hidden lg:flex items-center gap-1.5 ml-4 flex-wrap" onClick={(e) => e.stopPropagation()}>
                                {ports.map((p, pIdx) => (
                                  <span key={pIdx}>
                                    {p.clickable ? (
                                      <button
                                        onClick={(e) => openPort(e, p.url)}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-950/70 hover:bg-sky-900 border border-sky-800/80 text-sky-400 font-mono text-[10px] transition"
                                        title="Abrir en navegador web"
                                      >
                                        <span>{p.display}</span>
                                        <ExternalLink className="w-2.5 h-2.5" />
                                      </button>
                                    ) : (
                                      <span className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 font-mono text-[10px] border border-slate-800">
                                        {p.display}
                                      </span>
                                    )}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Quick Actions Toolbar */}
                          <div
                            className="flex items-center gap-1 shrink-0 ml-4"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {isRunning ? (
                              <>
                                <button
                                  onClick={() => onStopContainer(container)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                                  title="Detener"
                                >
                                  <Square className="w-3.5 h-3.5 fill-current" />
                                </button>
                                <button
                                  onClick={() => onRestartContainer(container)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition"
                                  title="Reiniciar"
                                >
                                  <RotateCw className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => onPauseContainer(container)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition"
                                  title={isPaused ? 'Reanudar' : 'Pausar'}
                                >
                                  <Pause className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => onStartContainer(container)}
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
                              disabled={!isRunning}
                              className={`p-1.5 rounded-lg transition ${
                                isRunning
                                  ? 'text-slate-400 hover:text-sky-400 hover:bg-sky-500/10'
                                  : 'text-slate-700 cursor-not-allowed'
                              }`}
                              title={isRunning ? 'Consola interactiva' : 'Requiere contenedor en ejecución'}
                            >
                              <TerminalIcon className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => onRemoveContainer(container)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
