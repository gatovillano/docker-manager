import React, { useState, useEffect } from 'react';
import { Package, Trash2, Search, RefreshCw, Sparkles, HardDrive, AlertTriangle } from 'lucide-react';
import { formatBytes, formatRelativeTime } from '../utils/formatters';

export function ImagesView({ onQuickRun }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [pruning, setPruning] = useState(false);

  const fetchImages = async () => {
    if (!window.dockerAPI) return;
    setLoading(true);
    try {
      const res = await window.dockerAPI.listImages();
      if (res.ok) {
        setImages(res.images || []);
      }
    } catch (e) {
      console.error('Error fetching images:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  const handleRemove = async (id, repoTag) => {
    if (!confirm(`¿Eliminar la imagen "${repoTag || id.slice(7, 19)}"?`)) return;
    try {
      const res = await window.dockerAPI.removeImage(id, { force: false });
      if (res.ok) {
        fetchImages();
      } else {
        alert(`Error al eliminar: ${res.error}`);
      }
    } catch (e) {
      alert(`Error: ${e.message}`);
    }
  };

  const handlePrune = async () => {
    if (!confirm('¿Deseas limpiar todas las imágenes huérfanas (dangling)?')) return;
    setPruning(true);
    try {
      const res = await window.dockerAPI.pruneImages();
      if (res.ok) {
        const reclaimed = formatBytes(res.result?.SpaceReclaimed || 0);
        alert(`Limpieza completada. Espacio liberado: ${reclaimed}`);
        fetchImages();
      }
    } catch (e) {
      alert(`Error al limpiar: ${e.message}`);
    } finally {
      setPruning(false);
    }
  };

  const filteredImages = images.filter((img) => {
    const tags = (img.RepoTags || []).join(' ').toLowerCase();
    const id = img.Id.toLowerCase();
    const q = searchQuery.toLowerCase();
    return tags.includes(q) || id.includes(q);
  });

  const totalSize = images.reduce((acc, curr) => acc + (curr.Size || 0), 0);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Subheader */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 bg-slate-900/60 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-400" />
            <h2 className="text-sm font-bold text-slate-100">Imágenes Docker ({images.length})</h2>
          </div>
          <span className="text-xs text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-700 font-mono">
            Espacio total: {formatBytes(totalSize)}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por tag o ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-56 bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            disabled={pruning}
            onClick={handlePrune}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-medium transition disabled:opacity-50"
            title="Eliminar imágenes intermedias o no referenciadas"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{pruning ? 'Limpiando...' : 'Limpiar Huérfanas'}</span>
          </button>

          <button
            onClick={fetchImages}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition border border-slate-700"
            title="Refrescar imágenes"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-slate-500 italic">
            Cargando imágenes locales...
          </div>
        ) : filteredImages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <Package className="w-12 h-12 text-slate-700 mb-2" />
            <span>No se encontraron imágenes Docker.</span>
          </div>
        ) : (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
                <tr>
                  <th className="px-4 py-3">Repositorio y Etiqueta</th>
                  <th className="px-4 py-3">ID de Imagen</th>
                  <th className="px-4 py-3">Tamaño</th>
                  <th className="px-4 py-3">Creada</th>
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredImages.map((img) => {
                  const repoTag = img.RepoTags?.[0] || '<sin etiqueta>';
                  const isDangling = repoTag === '<none>:<none>' || repoTag === '<sin etiqueta>';

                  return (
                    <tr key={img.Id} className="hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-indigo-400 shrink-0" />
                          <span
                            className={`font-semibold font-mono ${
                              isDangling ? 'text-amber-400/80 italic' : 'text-slate-200'
                            }`}
                          >
                            {repoTag}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">
                        {img.Id.replace(/^sha256:/, '').slice(0, 12)}
                      </td>

                      <td className="px-4 py-3 font-mono font-medium text-slate-300">
                        {formatBytes(img.Size)}
                      </td>

                      <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                        {formatRelativeTime(img.Created)}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleRemove(img.Id, repoTag)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                          title="Eliminar imagen"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
