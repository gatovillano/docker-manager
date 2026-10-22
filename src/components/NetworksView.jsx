import React, { useState, useEffect } from 'react';
import { Network, Trash2, Search, RefreshCw, Sparkles, Layers } from 'lucide-react';

export function NetworksView() {
  const [networks, setNetworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [pruning, setPruning] = useState(false);

  const fetchNetworks = async () => {
    if (!window.dockerAPI) return;
    setLoading(true);
    try {
      const res = await window.dockerAPI.listNetworks();
      if (res.ok) {
        setNetworks(res.networks || []);
      }
    } catch (e) {
      console.error('Error fetching networks:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNetworks();
  }, []);

  const handlePrune = async () => {
    if (!confirm('¿Deseas eliminar las redes personalizadas que no estén en uso?')) return;
    setPruning(true);
    try {
      const res = await window.dockerAPI.pruneNetworks();
      if (res.ok) {
        const deleted = res.result?.NetworksDeleted || [];
        alert(`Limpieza completada. Redes eliminadas: ${deleted.length}`);
        fetchNetworks();
      }
    } catch (e) {
      alert(`Error al limpiar redes: ${e.message}`);
    } finally {
      setPruning(false);
    }
  };

  const filteredNetworks = networks.filter((net) => {
    const name = (net.Name || '').toLowerCase();
    const driver = (net.Driver || '').toLowerCase();
    const id = (net.Id || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    return name.includes(q) || driver.includes(q) || id.includes(q);
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Subheader */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 bg-slate-900/60 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Network className="w-5 h-5 text-purple-400" />
          <h2 className="text-sm font-bold text-slate-100">Redes Docker ({networks.length})</h2>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar red..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-56 bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <button
            disabled={pruning}
            onClick={handlePrune}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 border border-purple-500/30 text-xs font-medium transition disabled:opacity-50"
            title="Eliminar redes no usadas"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{pruning ? 'Limpiando...' : 'Limpiar No Usadas'}</span>
          </button>

          <button
            onClick={fetchNetworks}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition border border-slate-700"
            title="Refrescar redes"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-slate-500 italic">
            Cargando redes...
          </div>
        ) : filteredNetworks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <Network className="w-12 h-12 text-slate-700 mb-2" />
            <span>No se encontraron redes.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNetworks.map((net) => {
              const containersCount = Object.keys(net.Containers || {}).length;
              const ipamConfigs = net.IPAM?.Config || [];

              return (
                <div
                  key={net.Id}
                  className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 text-xs space-y-3 hover:border-slate-700 transition"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <Network className="w-4 h-4 text-purple-400" />
                      <span className="font-bold text-slate-200 font-mono text-sm">{net.Name}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-purple-300 text-[10px] font-mono border border-slate-700">
                      {net.Driver}
                    </span>
                  </div>

                  <div className="space-y-1 font-mono text-[11px]">
                    <div className="flex justify-between text-slate-400">
                      <span>ID:</span>
                      <span className="text-slate-300">{net.Id.slice(0, 12)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Ámbito (Scope):</span>
                      <span className="text-slate-300">{net.Scope}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Contenedores unidos:</span>
                      <span className="text-emerald-400 font-semibold">{containersCount}</span>
                    </div>
                  </div>

                  {ipamConfigs.length > 0 && (
                    <div className="pt-2 border-t border-slate-800/60 font-mono text-[10px] space-y-1">
                      {ipamConfigs.map((cfg, idx) => (
                        <div key={idx} className="bg-slate-950 p-2 rounded border border-slate-850">
                          {cfg.Subnet && (
                            <div className="text-slate-300">
                              <span className="text-slate-500">Subnet:</span> {cfg.Subnet}
                            </div>
                          )}
                          {cfg.Gateway && (
                            <div className="text-slate-300">
                              <span className="text-slate-500">Gateway:</span> {cfg.Gateway}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
