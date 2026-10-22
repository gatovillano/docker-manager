import React, { useState } from 'react';
import { X, Play, Plus, Trash2, Box, Sparkles } from 'lucide-react';

const SUGGESTIONS = ['nginx:alpine', 'redis:alpine', 'mongo:latest', 'postgres:15', 'node:20-alpine'];

export function CreateContainerModal({ isOpen, onClose, onSuccess }) {
  const [image, setImage] = useState('');
  const [name, setName] = useState('');
  const [restartPolicy, setRestartPolicy] = useState('no');
  const [ports, setPorts] = useState([{ host: '', container: '' }]);
  const [envs, setEnvs] = useState(['']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleAddPort = () => {
    setPorts([...ports, { host: '', container: '' }]);
  };

  const handleRemovePort = (index) => {
    setPorts(ports.filter((_, i) => i !== index));
  };

  const handlePortChange = (index, field, value) => {
    const updated = [...ports];
    updated[index][field] = value;
    setPorts(updated);
  };

  const handleAddEnv = () => {
    setEnvs([...envs, '']);
  };

  const handleRemoveEnv = (index) => {
    setEnvs(envs.filter((_, i) => i !== index));
  };

  const handleEnvChange = (index, value) => {
    const updated = [...envs];
    updated[index] = value;
    setEnvs(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!image.trim()) {
      setError('Debes especificar un nombre de imagen Docker.');
      return;
    }

    if (!window.dockerAPI) return;
    setLoading(true);
    setError(null);

    try {
      const validPorts = ports
        .filter((p) => p.container)
        .map((p) => ({
          host: p.host ? parseInt(p.host, 10) : undefined,
          container: parseInt(p.container, 10),
          protocol: 'tcp',
        }));

      const res = await window.dockerAPI.createContainer({
        Image: image.trim(),
        name: name.trim() || undefined,
        ports: validPorts,
        envs: envs.filter((e) => e.trim().length > 0),
        restart: restartPolicy,
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        setError(res.error || 'Error al crear el contenedor.');
      }
    } catch (err) {
      setError(err.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="flex flex-col w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950/70 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Crear y Ejecutar Contenedor</h3>
              <p className="text-xs text-slate-400">Despliega un nuevo contenedor a partir de una imagen</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-900/60 text-xs text-rose-300">
              {error}
            </div>
          )}

          {/* Imagen Docker */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Imagen Docker <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="p. ej. nginx:alpine, redis:alpine, ubuntu:latest"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            {/* Quick Suggestions */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> Populares:
              </span>
              {SUGGESTIONS.map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setImage(s)}
                  className="px-2 py-0.5 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-mono text-[10px] border border-slate-700 transition"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Nombre del Contenedor */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Nombre del Contenedor (opcional)</label>
            <input
              type="text"
              placeholder="p. ej. mi-servidor-web"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Mapeo de Puertos */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">Mapeo de Puertos (Host : Contenedor)</label>
              <button
                type="button"
                onClick={handleAddPort}
                className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Añadir puerto
              </button>
            </div>
            {ports.map((p, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Host (ej. 8080)"
                  value={p.host}
                  onChange={(e) => handlePortChange(idx, 'host', e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <span className="text-slate-500 font-bold">:</span>
                <input
                  type="number"
                  placeholder="Contenedor (ej. 80)"
                  value={p.container}
                  onChange={(e) => handlePortChange(idx, 'container', e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                {ports.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemovePort(idx)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Variables de Entorno */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">Variables de Entorno (KEY=VALOR)</label>
              <button
                type="button"
                onClick={handleAddEnv}
                className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Añadir variable
              </button>
            </div>
            {envs.map((env, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="ej. PORT=3000 o ENV=production"
                  value={env}
                  onChange={(e) => handleEnvChange(idx, e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                {envs.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveEnv(idx)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Política de reinicio */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Política de Reinicio</label>
            <select
              value={restartPolicy}
              onChange={(e) => setRestartPolicy(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="no">No reiniciar (no)</option>
              <option value="always">Siempre reiniciar (always)</option>
              <option value="unless-stopped">A menos que se detenga manualmente (unless-stopped)</option>
            </select>
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{loading ? 'Creando...' : 'Crear y Arrancar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
