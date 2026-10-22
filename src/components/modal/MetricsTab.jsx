import React, { useEffect, useState, useRef } from 'react';
import { Cpu, HardDrive, Network, Activity, AlertCircle } from 'lucide-react';
import { formatBytes } from '../../utils/formatters';

export function MetricsTab({ containerId, isRunning }) {
  const [stats, setStats] = useState({
    cpuPercent: 0,
    memoryUsage: 0,
    memoryLimit: 0,
    memoryPercent: 0,
    netRx: 0,
    netTx: 0,
    blockRead: 0,
    blockWrite: 0,
    timestamp: '--:--:--',
  });
  const [history, setHistory] = useState([]);
  const streamIdRef = useRef(`stats-${containerId}-${Date.now()}`);

  useEffect(() => {
    if (!isRunning || !window.dockerAPI) return;

    const streamId = streamIdRef.current;
    let unsub = null;

    window.dockerAPI.startStatsStream(streamId, containerId).then(() => {
      unsub = window.dockerAPI.onStatsData(streamId, (newStats) => {
        setStats(newStats);
        setHistory((prev) => {
          const updated = [...prev, newStats.cpuPercent];
          return updated.slice(-20); // keep last 20 readings
        });
      });
    });

    return () => {
      if (window.dockerAPI) {
        window.dockerAPI.stopStatsStream(streamId);
      }
      if (unsub) unsub();
    };
  }, [containerId, isRunning]);

  if (!isRunning) {
    return (
      <div className="flex flex-col items-center justify-center h-[520px] bg-slate-950/70 border border-slate-800 rounded-xl p-6 text-center text-slate-400">
        <AlertCircle className="w-12 h-12 text-amber-400 mb-3" />
        <h3 className="text-base font-semibold text-slate-200 mb-1">Contenedor Detenido</h3>
        <p className="text-xs max-w-sm text-slate-400">
          Las métricas en tiempo real de CPU, memoria, red y disco solo están disponibles cuando el contenedor está en ejecución.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[520px] p-5 overflow-y-auto space-y-5 bg-slate-950/50 border border-slate-800 rounded-xl">
      {/* Live Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-400 animate-pulse" />
          <h3 className="text-sm font-semibold text-slate-100">Rendimiento en Vivo</h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
          <span>Última lectura:</span>
          <span className="text-slate-200 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
            {stats.timestamp}
          </span>
        </div>
      </div>

      {/* Grid of Key Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CPU Card */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-400 font-medium">Uso de CPU</span>
                <div className="text-2xl font-bold text-slate-100 font-mono">
                  {stats.cpuPercent}%
                </div>
              </div>
            </div>
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                stats.cpuPercent > 80
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : stats.cpuPercent > 50
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
              }`}
            >
              {stats.cpuPercent > 80 ? 'Alto' : stats.cpuPercent > 50 ? 'Moderado' : 'Normal'}
            </span>
          </div>

          {/* Sparkline visualization */}
          <div className="h-14 flex items-end gap-1 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
            {history.length === 0 ? (
              <span className="text-[10px] text-slate-500 italic mx-auto self-center">Recopilando datos...</span>
            ) : (
              history.map((val, idx) => {
                const heightPercent = Math.min(100, Math.max(6, val));
                return (
                  <div
                    key={idx}
                    className="flex-1 bg-blue-500/70 hover:bg-blue-400 rounded-xs transition-all duration-300"
                    style={{ height: `${heightPercent}%` }}
                    title={`${val}%`}
                  />
                );
              })
            )}
          </div>
        </div>

        {/* Memory Card */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-400 font-medium">Memoria RAM</span>
                <div className="text-2xl font-bold text-slate-100 font-mono">
                  {formatBytes(stats.memoryUsage)}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold text-emerald-400 font-mono">
                {stats.memoryPercent}%
              </div>
              <div className="text-[11px] text-slate-400">
                Límite: {formatBytes(stats.memoryLimit)}
              </div>
            </div>
          </div>

          {/* Memory progress bar */}
          <div className="space-y-1.5">
            <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-500 ${
                  stats.memoryPercent > 85
                    ? 'bg-rose-500'
                    : stats.memoryPercent > 60
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, stats.memoryPercent)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0 MB</span>
              <span>{formatBytes(stats.memoryLimit)}</span>
            </div>
          </div>
        </div>

        {/* Network I/O */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium">Tráfico de Red</span>
              <div className="text-sm font-semibold text-slate-200">I/O de Red acumulado</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
              <div className="text-[11px] text-slate-400">Entrada (RX):</div>
              <div className="text-base font-bold text-purple-400 font-mono">
                {formatBytes(stats.netRx)}
              </div>
            </div>
            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
              <div className="text-[11px] text-slate-400">Salida (TX):</div>
              <div className="text-base font-bold text-purple-400 font-mono">
                {formatBytes(stats.netTx)}
              </div>
            </div>
          </div>
        </div>

        {/* Disk Block I/O */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium">Operaciones de Disco</span>
              <div className="text-sm font-semibold text-slate-200">Lectura / Escritura en Bloque</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
              <div className="text-[11px] text-slate-400">Lectura:</div>
              <div className="text-base font-bold text-amber-400 font-mono">
                {formatBytes(stats.blockRead)}
              </div>
            </div>
            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
              <div className="text-[11px] text-slate-400">Escritura:</div>
              <div className="text-base font-bold text-amber-400 font-mono">
                {formatBytes(stats.blockWrite)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
