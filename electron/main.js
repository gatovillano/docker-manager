const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const dockerService = require('./docker-service');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#020617', // slate-950
    title: 'Docker Manager',
    icon: path.join(__dirname, '../assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    autoHideMenuBar: true,
  });

  const isDev = process.env.NODE_ENV === 'development' || Boolean(process.env.VITE_DEV_SERVER_URL);

  if (isDev) {
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    mainWindow.loadURL(devServerUrl).catch(() => {
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Open target links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    dockerService.destroyAll();
    mainWindow = null;
  });
}

// Setup IPC handlers
function registerIpcHandlers() {
  ipcMain.handle('system:openExternal', (event, url) => {
    return shell.openExternal(url);
  });

  ipcMain.handle('system:openPath', async (event, fullPath) => {
    if (process.platform === 'linux') {
      const { exec } = require('child_process');
      // Lista de gestores de archivos conocidos para evitar que editores de código (como VS Code / Codium)
      // intercepten la apertura de carpetas si se asociaron con 'inode/directory'.
      const fileManagers = ['nautilus', 'dolphin', 'thunar', 'nemo', 'pcmanfm', 'caja', 'dde-file-manager'];

      for (const fm of fileManagers) {
        try {
          const fmPath = await new Promise((resolve) => {
            exec(`which ${fm}`, (err, stdout) => {
              if (!err && stdout && stdout.trim()) resolve(stdout.trim());
              else resolve(null);
            });
          });

          if (fmPath) {
            exec(`"${fmPath}" "${fullPath}"`, (err) => {
              if (err) shell.openPath(fullPath);
            });
            return true;
          }
        } catch (e) {
          // continuar al siguiente
        }
      }
    }
    return shell.openPath(fullPath);
  });

  ipcMain.handle('docker:ping', () => dockerService.ping());
  ipcMain.handle('docker:systemInfo', () => dockerService.getSystemInfo());

  // Containers
  ipcMain.handle('docker:listContainers', (event, options) => dockerService.listContainers(options));
  ipcMain.handle('docker:inspectContainer', (event, id) => dockerService.inspectContainer(id));
  ipcMain.handle('docker:startContainer', (event, id) => dockerService.startContainer(id));
  ipcMain.handle('docker:stopContainer', (event, id) => dockerService.stopContainer(id));
  ipcMain.handle('docker:restartContainer', (event, id) => dockerService.restartContainer(id));
  ipcMain.handle('docker:pauseContainer', (event, id) => dockerService.pauseContainer(id));
  ipcMain.handle('docker:unpauseContainer', (event, id) => dockerService.unpauseContainer(id));
  ipcMain.handle('docker:removeContainer', (event, id, options) => dockerService.removeContainer(id, options));
  ipcMain.handle('docker:createContainer', (event, options) => dockerService.createContainer(options));

  // Logs
  ipcMain.handle('docker:getLogs', (event, id, options) => dockerService.getLogs(id, options));
  ipcMain.handle('docker:startLogStream', (event, streamId, id) => {
    dockerService.startLogStream(
      streamId,
      id,
      (chunk) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send(`docker:logData:${streamId}`, chunk);
        }
      },
      (err) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send(`docker:logData:${streamId}`, `\n[Stream Error: ${err.message}]\n`);
        }
      },
      () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send(`docker:logData:${streamId}`, '\n[Stream Ended]\n');
        }
      }
    );
    return { ok: true };
  });

  ipcMain.handle('docker:stopLogStream', (event, streamId) => {
    dockerService.stopLogStream(streamId);
    return { ok: true };
  });

  // Stats
  ipcMain.handle('docker:startStatsStream', (event, streamId, id) => {
    dockerService.startStatsStream(
      streamId,
      id,
      (stats) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send(`docker:statsData:${streamId}`, stats);
        }
      },
      (err) => {
        // silently handle or log
      }
    );
    return { ok: true };
  });

  ipcMain.handle('docker:stopStatsStream', (event, streamId) => {
    dockerService.stopStatsStream(streamId);
    return { ok: true };
  });

  // Exec Terminal
  ipcMain.handle('docker:startExecTerminal', async (event, sessionId, containerId, options) => {
    return dockerService.startExecTerminal(
      sessionId,
      containerId,
      options,
      (data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send(`docker:execData:${sessionId}`, data);
        }
      },
      (err) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send(`docker:execExit:${sessionId}`, err ? err.message : null);
        }
      }
    );
  });

  ipcMain.on('docker:writeExecTerminal', (event, sessionId, data) => {
    dockerService.writeExecTerminal(sessionId, data);
  });

  ipcMain.on('docker:resizeExecTerminal', (event, sessionId, cols, rows) => {
    dockerService.resizeExecTerminal(sessionId, cols, rows);
  });

  ipcMain.handle('docker:closeExecTerminal', (event, sessionId) => {
    dockerService.closeExecTerminal(sessionId);
    return { ok: true };
  });

  // Images
  ipcMain.handle('docker:listImages', () => dockerService.listImages());
  ipcMain.handle('docker:removeImage', (event, id, options) => dockerService.removeImage(id, options));
  ipcMain.handle('docker:pruneImages', () => dockerService.pruneImages());

  // Volumes
  ipcMain.handle('docker:listVolumes', () => dockerService.listVolumes());
  ipcMain.handle('docker:pruneVolumes', () => dockerService.pruneVolumes());

  // Networks
  ipcMain.handle('docker:listNetworks', () => dockerService.listNetworks());
  ipcMain.handle('docker:pruneNetworks', () => dockerService.pruneNetworks());

  // Docker Compose
  ipcMain.handle('docker:composeCommand', (event, action, options) => dockerService.composeCommand(action, options));
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  dockerService.destroyAll();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
