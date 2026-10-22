const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dockerAPI', {
  // System
  ping: () => ipcRenderer.invoke('docker:ping'),
  getSystemInfo: () => ipcRenderer.invoke('docker:systemInfo'),
  openExternal: (url) => ipcRenderer.invoke('system:openExternal', url),
  openPath: (fullPath) => ipcRenderer.invoke('system:openPath', fullPath),

  // Containers
  listContainers: (options) => ipcRenderer.invoke('docker:listContainers', options),
  inspectContainer: (id) => ipcRenderer.invoke('docker:inspectContainer', id),
  startContainer: (id) => ipcRenderer.invoke('docker:startContainer', id),
  stopContainer: (id) => ipcRenderer.invoke('docker:stopContainer', id),
  restartContainer: (id) => ipcRenderer.invoke('docker:restartContainer', id),
  pauseContainer: (id) => ipcRenderer.invoke('docker:pauseContainer', id),
  unpauseContainer: (id) => ipcRenderer.invoke('docker:unpauseContainer', id),
  removeContainer: (id, options) => ipcRenderer.invoke('docker:removeContainer', id, options),
  createContainer: (options) => ipcRenderer.invoke('docker:createContainer', options),

  // Logs
  getLogs: (id, options) => ipcRenderer.invoke('docker:getLogs', id, options),
  startLogStream: (streamId, id) => ipcRenderer.invoke('docker:startLogStream', streamId, id),
  stopLogStream: (streamId) => ipcRenderer.invoke('docker:stopLogStream', streamId),
  onLogData: (streamId, callback) => {
    const channel = `docker:logData:${streamId}`;
    const listener = (event, data) => callback(data);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },

  // Stats
  startStatsStream: (streamId, id) => ipcRenderer.invoke('docker:startStatsStream', streamId, id),
  stopStatsStream: (streamId) => ipcRenderer.invoke('docker:stopStatsStream', streamId),
  onStatsData: (streamId, callback) => {
    const channel = `docker:statsData:${streamId}`;
    const listener = (event, data) => callback(data);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },

  // Terminal Exec
  startExecTerminal: (sessionId, containerId, options) => ipcRenderer.invoke('docker:startExecTerminal', sessionId, containerId, options),
  writeExecTerminal: (sessionId, data) => ipcRenderer.send('docker:writeExecTerminal', sessionId, data),
  resizeExecTerminal: (sessionId, cols, rows) => ipcRenderer.send('docker:resizeExecTerminal', sessionId, cols, rows),
  closeExecTerminal: (sessionId) => ipcRenderer.invoke('docker:closeExecTerminal', sessionId),
  onExecData: (sessionId, callback) => {
    const channel = `docker:execData:${sessionId}`;
    const listener = (event, data) => callback(data);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
  onExecExit: (sessionId, callback) => {
    const channel = `docker:execExit:${sessionId}`;
    const listener = (event, error) => callback(error);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },

  // Images
  listImages: () => ipcRenderer.invoke('docker:listImages'),
  removeImage: (id, options) => ipcRenderer.invoke('docker:removeImage', id, options),
  pruneImages: () => ipcRenderer.invoke('docker:pruneImages'),

  // Volumes
  listVolumes: () => ipcRenderer.invoke('docker:listVolumes'),
  pruneVolumes: () => ipcRenderer.invoke('docker:pruneVolumes'),

  // Networks
  listNetworks: () => ipcRenderer.invoke('docker:listNetworks'),
  pruneNetworks: () => ipcRenderer.invoke('docker:pruneNetworks'),

  // Docker Compose
  composeCommand: (action, options) => ipcRenderer.invoke('docker:composeCommand', action, options),
  composeUp: (options) => ipcRenderer.invoke('docker:composeCommand', 'up', options),
  composeStop: (options) => ipcRenderer.invoke('docker:composeCommand', 'stop', options),
  composeRestart: (options) => ipcRenderer.invoke('docker:composeCommand', 'restart', options),
  composeDown: (options) => ipcRenderer.invoke('docker:composeCommand', 'down', options),
});
