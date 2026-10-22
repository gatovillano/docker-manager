export function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatRelativeTime(timestamp) {
  if (!timestamp) return '-';
  const date = typeof timestamp === 'number' && timestamp < 1e12 ? new Date(timestamp * 1000) : new Date(timestamp);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return `hace ${diffInSeconds}s`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `hace ${diffInMinutes}m`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `hace ${diffInHours}h`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `hace ${diffInDays}d`;
}

export function parsePorts(ports = []) {
  if (!Array.isArray(ports)) return [];
  return ports.map(p => {
    const ip = p.IP || 'localhost';
    const publicPort = p.PublicPort;
    const privatePort = p.PrivatePort;
    const type = p.Type || 'tcp';

    if (publicPort) {
      return {
        display: `${publicPort}:${privatePort}/${type}`,
        url: `http://${ip === '0.0.0.0' || ip === '::' ? 'localhost' : ip}:${publicPort}`,
        clickable: true,
      };
    }
    return {
      display: `${privatePort}/${type}`,
      url: null,
      clickable: false,
    };
  });
}

export function getStatusColor(state) {
  switch (state?.toLowerCase()) {
    case 'running':
      return {
        bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        dot: 'bg-emerald-500 shadow-emerald-500/50',
        text: 'En ejecución'
      };
    case 'exited':
    case 'stopped':
    case 'dead':
      return {
        bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
        dot: 'bg-rose-500 shadow-rose-500/50',
        text: 'Detenido'
      };
    case 'paused':
      return {
        bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        dot: 'bg-amber-500 shadow-amber-500/50',
        text: 'Pausado'
      };
    case 'restarting':
      return {
        bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        dot: 'bg-blue-500 shadow-blue-500/50',
        text: 'Reiniciando'
      };
    default:
      return {
        bg: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
        dot: 'bg-slate-400 shadow-slate-500/50',
        text: state || 'Desconocido'
      };
  }
}
