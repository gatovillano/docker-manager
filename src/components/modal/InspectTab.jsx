import React, { useState, useEffect } from 'react';
import { Copy, Check, Info, Server, Network, Folder, FolderOpen, ShieldCheck } from 'lucide-react';

export function InspectTab({ containerId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState(null);
  const [viewRaw, setViewRaw] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchInspect = async () => {
      if (!window.dockerAPI) return;
      try {
        setLoading(true);
        const res = await window.dockerAPI.inspectContainer(containerId);
        if (mounted && res.ok) {
          setData(res.data);
        }
      } catch (e) {
        console.error('Error inspecting container:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchInspect();
    return () => {
      mounted = false;
    };
  }, [containerId]);

  const copyText = (text, key) => {
    navigator.clipboard.writeText(typeof text === 'object' ? JSON.stringify(text, null, 2) : String(text));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[520px] text-slate-500 italic">
        Inspeccionando contenedor...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-[520px] text-rose-400">
        No se pudo cargar la información de inspección.
      </div>
    );
  }

  const { Config = {}, State = {}, NetworkSettings = {}, Mounts = [], HostConfig = {} } = data;
  const networks = NetworkSettings.Networks || {};
  const envList = Config.Env || [];

  return (
    <div className="flex flex-col h-[520px] bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden">
      {/* Subheader */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <Info className="w-4 h-4 text-sky-400" />
          <span className="font-medium">Detalles técnicos e inspección</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => copyText(data, 'raw-all')}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition border border-slate-700"
          >
            {copiedKey === 'raw-all' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Copiar todo (JSON)</span>
          </button>
          <button
            onClick={() => setViewRaw(!viewRaw)}
            className={`px-2.5 py-1 rounded border transition ${
              viewRaw ? 'bg-sky-500/20 text-sky-300 border-sky-500/30' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            {viewRaw ? 'Vista Estructurada' : 'Ver JSON sin procesar'}
          </button>
        </div>
      </div>

      <div className="flex-1 p-5 overflow-y-auto space-y-6">
        {viewRaw ? (
          <pre className="p-4 bg-slate-950 font-mono text-[11px] text-slate-300 rounded-lg overflow-x-auto border border-slate-800 select-text">
            {JSON.stringify(data, null, 2)}
          </pre>
        ) : (
          <>
            {/* General Info */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-sky-400" /> Configuración General
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800/80">
                  <span className="text-slate-500 block text-[10px] uppercase">ID Completo</span>
                  <span className="text-slate-200 select-all">{data.Id}</span>
                </div>
                <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800/80">
                  <span className="text-slate-500 block text-[10px] uppercase">Creado el</span>
                  <span className="text-slate-200">{new Date(data.Created).toLocaleString()}</span>
                </div>
                <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800/80">
                  <span className="text-slate-500 block text-[10px] uppercase">Comando</span>
                  <span className="text-slate-200 select-all">
                    {Array.isArray(Config.Cmd) ? Config.Cmd.join(' ') : Config.Cmd || '-'}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800/80">
                  <span className="text-slate-500 block text-[10px] uppercase">Directorio de Trabajo</span>
                  <span className="text-slate-200">{Config.WorkingDir || '/'}</span>
                </div>
                <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800/80">
                  <span className="text-slate-500 block text-[10px] uppercase">Política de Reinicio</span>
                  <span className="text-slate-200">{HostConfig.RestartPolicy?.Name || 'no'}</span>
                </div>
                <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800/80">
                  <span className="text-slate-500 block text-[10px] uppercase">Estado / PID</span>
                  <span className="text-slate-200">
                    {State.Status} (PID: {State.Pid || '0'})
                  </span>
                </div>
                {Config.Labels?.['com.docker.compose.project.working_dir'] && (
                  <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800/80 md:col-span-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-slate-500 block text-[10px] uppercase">Carpeta Local del Stack</span>
                      <span className="text-amber-400 select-all font-mono text-[11px] truncate block">
                        {Config.Labels['com.docker.compose.project.working_dir']}
                      </span>
                    </div>
                    <button
                      onClick={() => window.dockerAPI?.openPath(Config.Labels['com.docker.compose.project.working_dir'])}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-amber-300 hover:text-amber-200 hover:bg-slate-700/80 text-xs border border-slate-700 transition shrink-0"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                      <span>Abrir Carpeta</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Redes e IPs */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Network className="w-3.5 h-3.5 text-purple-400" /> Redes y Direcciones IP
              </h4>
              <div className="space-y-2">
                {Object.entries(networks).map(([netName, netDetails]) => (
                  <div key={netName} className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 text-xs">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/60 mb-2">
                      <span className="font-semibold text-purple-300 font-mono">{netName}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{netDetails.NetworkID?.slice(0, 12)}</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 font-mono text-[11px]">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Dirección IP</span>
                        <span className="text-slate-200 select-all">{netDetails.IPAddress || 'Sin IP'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Puerta de Enlace (Gateway)</span>
                        <span className="text-slate-200">{netDetails.Gateway || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Dirección MAC</span>
                        <span className="text-slate-200">{netDetails.MacAddress || '-'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Volúmenes y Montajes */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-amber-400" /> Volúmenes y Puntos de Montaje
              </h4>
              {Mounts.length === 0 ? (
                <div className="text-xs text-slate-500 italic p-3 bg-slate-900/40 rounded-lg border border-slate-800/60">
                  Sin volúmenes montados configurados.
                </div>
              ) : (
                <div className="space-y-2">
                  {Mounts.map((mount, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800 text-xs font-mono">
                      <div className="flex items-center justify-between text-slate-400 mb-1">
                        <span className="text-amber-400 text-[11px] font-semibold">{mount.Type?.toUpperCase()}</span>
                        <span className="text-[10px]">{mount.RW ? 'Lectura/Escritura (RW)' : 'Solo Lectura (RO)'}</span>
                      </div>
                      <div className="text-slate-300 break-all">
                        <span className="text-slate-500">Host:</span> {mount.Source}
                      </div>
                      <div className="text-emerald-300 break-all mt-0.5">
                        <span className="text-slate-500">Contenedor:</span> {mount.Destination}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Variables de Entorno */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Variables de Entorno ({envList.length})
                </h4>
                <button
                  onClick={() => copyText(envList.join('\n'), 'envs')}
                  className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
                >
                  {copiedKey === 'envs' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copiar variables</span>
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto p-2.5 bg-slate-900/80 rounded-lg border border-slate-800 space-y-1 font-mono text-[11px]">
                {envList.map((env, i) => {
                  const [key, ...rest] = env.split('=');
                  const val = rest.join('=');
                  return (
                    <div key={i} className="flex gap-2 hover:bg-slate-800/60 p-1 rounded">
                      <span className="text-sky-300 font-semibold">{key}:</span>
                      <span className="text-slate-400 select-all break-all">{val}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
