import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { ContainersTreeView } from './components/ContainersTreeView';
import { ImagesView } from './components/ImagesView';
import { VolumesView } from './components/VolumesView';
import { NetworksView } from './components/NetworksView';
import { ContainerModal } from './components/ContainerModal';
import { CreateContainerModal } from './components/CreateContainerModal';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function App() {
  const [activeNav, setActiveNav] = useState('containers');
  const [containers, setContainers] = useState([]);
  const [daemonStatus, setDaemonStatus] = useState({ ok: false });
  const [systemInfo, setSystemInfo] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(5000);

  // Modals
  const [selectedContainer, setSelectedContainer] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Fetch Docker daemon status and containers
  const refreshAll = useCallback(async () => {
    if (!window.dockerAPI) return;
    setIsRefreshing(true);
    try {
      const [pingRes, infoRes, containersRes] = await Promise.all([
        window.dockerAPI.ping(),
        window.dockerAPI.getSystemInfo(),
        window.dockerAPI.listContainers({ all: true }),
      ]);

      setDaemonStatus(pingRes);
      if (infoRes.ok) setSystemInfo(infoRes);
      if (containersRes.ok) {
        setContainers(containersRes.containers || []);
        // Update selected container if modal is open
        if (selectedContainer) {
          const updated = containersRes.containers.find((c) => c.Id === selectedContainer.Id);
          if (updated) setSelectedContainer(updated);
        }
      }
    } catch (err) {
      console.error('Error refreshing Docker data:', err);
      setDaemonStatus({ ok: false, error: err.message });
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedContainer]);

  // Initial load
  useEffect(() => {
    refreshAll();
  }, []);

  // Auto-refresh interval
  useEffect(() => {
    if (autoRefreshInterval <= 0) return;
    const timer = setInterval(() => {
      refreshAll();
    }, autoRefreshInterval);
    return () => clearInterval(timer);
  }, [autoRefreshInterval, refreshAll]);

  // Running containers count for sidebar badge
  const runningCount = useMemo(() => {
    return containers.filter((c) => c.State === 'running').length;
  }, [containers]);

  // Container quick actions
  const handleStartContainer = async (c) => {
    try {
      await window.dockerAPI.startContainer(c.Id);
      refreshAll();
    } catch (e) {
      alert(`Error al iniciar: ${e.message}`);
    }
  };

  const handleStopContainer = async (c) => {
    try {
      await window.dockerAPI.stopContainer(c.Id);
      refreshAll();
    } catch (e) {
      alert(`Error al detener: ${e.message}`);
    }
  };

  const handleRestartContainer = async (c) => {
    try {
      await window.dockerAPI.restartContainer(c.Id);
      refreshAll();
    } catch (e) {
      alert(`Error al reiniciar: ${e.message}`);
    }
  };

  const handlePauseContainer = async (c) => {
    try {
      if (c.State === 'paused') {
        await window.dockerAPI.unpauseContainer(c.Id);
      } else {
        await window.dockerAPI.pauseContainer(c.Id);
      }
      refreshAll();
    } catch (e) {
      alert(`Error al pausar/reanudar: ${e.message}`);
    }
  };

  const handleRemoveContainer = async (c) => {
    const name = c.Names?.[0] || c.Id.slice(0, 12);
    if (!confirm(`¿Estás seguro de eliminar el contenedor "${name}"?`)) return;
    try {
      await window.dockerAPI.removeContainer(c.Id, { force: true });
      if (selectedContainer?.Id === c.Id) {
        setSelectedContainer(null);
      }
      refreshAll();
    } catch (e) {
      alert(`Error al eliminar: ${e.message}`);
    }
  };

  // Stack batch operations via Docker Compose (or direct API fallback)
  const handleStartStack = async (stack) => {
    try {
      if (stack.workingDir || (!stack.isDefault && stack.name)) {
        const res = await window.dockerAPI.composeUp({
          workingDir: stack.workingDir,
          configFile: stack.configFile,
          project: stack.name !== 'Independientes' ? stack.name : undefined,
        });

        if (!res.ok) {
          // If compose up fails (e.g. yml moved), fallback to starting the stopped containers directly
          console.warn('Compose up failed, falling back to direct container start:', res.error);
          const stopped = (stack.containers || []).filter((c) => c.State !== 'running');
          if (stopped.length > 0) {
            await Promise.all(stopped.map((c) => window.dockerAPI.startContainer(c.Id)));
          } else {
            alert(`Error en docker compose up: ${res.error}`);
          }
        }
      } else {
        const stopped = (stack.containers || []).filter((c) => c.State !== 'running');
        await Promise.all(stopped.map((c) => window.dockerAPI.startContainer(c.Id)));
      }
      refreshAll();
    } catch (e) {
      alert(`Error al iniciar el stack: ${e.message}`);
    }
  };

  const handleStopStack = async (stack) => {
    try {
      if (stack.workingDir || (!stack.isDefault && stack.name)) {
        const res = await window.dockerAPI.composeStop({
          workingDir: stack.workingDir,
          configFile: stack.configFile,
          project: stack.name !== 'Independientes' ? stack.name : undefined,
        });

        if (!res.ok) {
          console.warn('Compose stop failed, falling back to direct container stop:', res.error);
          const running = (stack.containers || []).filter((c) => c.State === 'running');
          await Promise.all(running.map((c) => window.dockerAPI.stopContainer(c.Id)));
        }
      } else {
        const running = (stack.containers || []).filter((c) => c.State === 'running');
        await Promise.all(running.map((c) => window.dockerAPI.stopContainer(c.Id)));
      }
      refreshAll();
    } catch (e) {
      alert(`Error al detener el stack: ${e.message}`);
    }
  };

  const handleRestartStack = async (stack) => {
    try {
      if (stack.workingDir || (!stack.isDefault && stack.name)) {
        const res = await window.dockerAPI.composeRestart({
          workingDir: stack.workingDir,
          configFile: stack.configFile,
          project: stack.name !== 'Independientes' ? stack.name : undefined,
        });

        if (!res.ok) {
          console.warn('Compose restart failed, falling back to direct container restart:', res.error);
          await Promise.all((stack.containers || []).map((c) => window.dockerAPI.restartContainer(c.Id)));
        }
      } else {
        await Promise.all((stack.containers || []).map((c) => window.dockerAPI.restartContainer(c.Id)));
      }
      refreshAll();
    } catch (e) {
      alert(`Error al reiniciar el stack: ${e.message}`);
    }
  };

  const handleOpenLogs = (c) => {
    setSelectedContainer(c);
  };

  const handleOpenTerminal = (c) => {
    setSelectedContainer(c);
  };

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100 select-none overflow-hidden font-sans">
      {/* Left Sidebar */}
      <Sidebar
        activeNav={activeNav}
        onNavChange={setActiveNav}
        containersCount={containers.length}
        runningCount={runningCount}
        daemonStatus={daemonStatus}
        systemInfo={systemInfo}
        onRefresh={refreshAll}
        isRefreshing={isRefreshing}
        onOpenCreate={() => setIsCreateOpen(true)}
        autoRefreshInterval={autoRefreshInterval}
        onAutoRefreshChange={setAutoRefreshInterval}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Connection warning if Docker daemon isn't reachable */}
        {!daemonStatus.ok && (
          <div className="flex items-center justify-between px-6 py-2.5 bg-rose-950/80 border-b border-rose-900 text-rose-200 text-xs shrink-0">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                <strong>No se pudo conectar al daemon de Docker.</strong> Asegúrate de que el servicio Docker esté
                ejecutándose (<code>sudo systemctl start docker</code>) y que tu usuario tenga permisos sobre{' '}
                <code>/var/run/docker.sock</code>.
              </span>
            </div>
            <button
              onClick={refreshAll}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-rose-900/60 hover:bg-rose-800 text-rose-100 text-xs font-medium border border-rose-700 transition"
            >
              <RefreshCw className="w-3 h-3" /> Reintentar
            </button>
          </div>
        )}

        {/* Views */}
        <main className="flex-1 flex overflow-hidden">
          {activeNav === 'containers' && (
            <ContainersTreeView
              containers={containers}
              onSelectContainer={(c) => setSelectedContainer(c)}
              onStartContainer={handleStartContainer}
              onStopContainer={handleStopContainer}
              onRestartContainer={handleRestartContainer}
              onPauseContainer={handlePauseContainer}
              onRemoveContainer={handleRemoveContainer}
              onOpenLogs={handleOpenLogs}
              onOpenTerminal={handleOpenTerminal}
              onStartStack={handleStartStack}
              onStopStack={handleStopStack}
              onRestartStack={handleRestartStack}
            />
          )}

          {activeNav === 'images' && <ImagesView onQuickRun={() => setIsCreateOpen(true)} />}

          {activeNav === 'volumes' && <VolumesView />}

          {activeNav === 'networks' && <NetworksView />}
        </main>
      </div>

      {/* Full Container Inspector Modal */}
      {selectedContainer && (
        <ContainerModal
          container={selectedContainer}
          onClose={() => setSelectedContainer(null)}
          onActionTriggered={refreshAll}
        />
      )}

      {/* Create / Run Container Modal */}
      <CreateContainerModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          refreshAll();
          setActiveNav('containers');
        }}
      />
    </div>
  );
}
