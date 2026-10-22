import React, { useState, useEffect } from 'react';
import { Database, Trash2, Search, RefreshCw, Sparkles, Folder } from 'lucide-react';
import { formatBytes } from '../utils/formatters';

export function VolumesView() {
  const [volumes, setVolumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [pruning, setPruning] = useState(false);

  const fetchVolumes = async () => {
    if (!window.dockerAPI) return;
    setLoading(true);
    try {
      const res = await window.dockerAPI.listVolumes();
      if (res.ok) {
        setVolumes(res.volumes || []);
      }
    } catch (e) {
      console.error('Error fetching volumes:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVolumes();
  }, []);

  const handlePrune = async () => {
    if (!confirm('¿Deseas eliminar todos los volúmenes que no estén en uso por ningún contenedor?')) return;
    setPruning(true);
    try {
      const res = await window.dockerAPI.pruneVolumes();
      if (res.ok) {
        const reclaimed = formatBytes(res.result?.SpaceReclaimed || 0);
        alert(`Limpieza de volúmenes completada. Espacio liberado: ${reclaimed}`);
        fetchVolumes();
      }
    } catch (e) {
      alert(`Error al limpiar volúmenes: ${e.message}`);
    } finally {
      setPruning(false);
    }
  };

  const filteredVolumes = volumes.filter((vol) => {
    const name = (vol.Name || '').toLowerCase();
    const driver = (vol.Driver || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    return name.includes(q) || driver.includes(q);
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Subheader */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 bg-slate-900/60 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-amber-400" />
          <h2 className="text-sm font-bold text-slate-100">Volúmenes Persistentes ({volumes.length})</h2>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar volumen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-56 bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <button
            disabled={pruning}
            onClick={handlePrune}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-medium transition disabled:opacity-50"
            title="Eliminar volúmenes no usados"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{pruning ? 'Limpiando...' : 'Limpiar Huérfanos'}</span>
          </button>

          <button
            onClick={fetchVolumes}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition border border-slate-700"
            title="Refrescar volúmenes"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-slate-500 italic">
            Cargando volúmenes...
          </div>
        ) : filteredVolumes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <Database className="w-12 h-12 text-slate-700 mb-2" />
            <span>No se encontraron volúmenes.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredVolumes.map((vol) => (
              <div
                key={vol.Name}
                className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 text-xs space-y-2 hover:border-slate-700 transition"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <Folder className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-slate-200 font-mono text-sm">{vol.Name}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-mono border border-slate-700">
                    {vol.Driver || 'local'}
                  </span>
                </div>

                <div className="text-[11px] font-mono text-slate-400 break-all">
                  <span className="text-slate-500 block text-[10px] uppercase">Punto de montaje en host:</span>
                  {vol.Mountpoint}
                </div>

                {vol.CreatedAt && (
                  <div className="text-[10px] text-slate-500 font-mono">
                    Creado: {new Date(vol.CreatedAt).toLocaleString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
