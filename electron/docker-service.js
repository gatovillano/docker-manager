const http = require('http');

class DockerService {
  constructor() {
    this.socketPath = process.env.DOCKER_SOCKET || '/var/run/docker.sock';
    this.execSessions = new Map(); // sessionId -> { socket, execId }
    this.activeLogStreams = new Map(); // streamId -> req
    this.activeStatsStreams = new Map(); // streamId -> req
  }

  request(method, path, body = null) {
    return new Promise((resolve, reject) => {
      const postData = body ? JSON.stringify(body) : null;
      const options = {
        socketPath: this.socketPath,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
        },
      };

      const req = http.request(options, (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          let parsed = null;
          try {
            parsed = JSON.parse(buffer.toString('utf8'));
          } catch (e) {
            parsed = buffer.toString('utf8');
          }

          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ ok: true, data: parsed, statusCode: res.statusCode });
          } else {
            const errorMsg =
              (typeof parsed === 'object' && parsed !== null ? parsed.message || parsed.error : parsed) ||
              `HTTP Error ${res.statusCode}`;
            resolve({ ok: false, error: errorMsg, statusCode: res.statusCode });
          }
        });
      });

      req.on('error', (err) => resolve({ ok: false, error: err.message }));
      if (postData) req.write(postData);
      req.end();
    });
  }

  demuxBuffer(buffer) {
    if (!Buffer.isBuffer(buffer)) return String(buffer);
    let offset = 0;
    let text = '';
    while (offset < buffer.length) {
      if (offset + 8 > buffer.length) {
        text += buffer.toString('utf8', offset);
        break;
      }
      const size = buffer.readUInt32BE(offset + 4);
      offset += 8;
      if (offset + size <= buffer.length) {
        text += buffer.toString('utf8', offset, offset + size);
        offset += size;
      } else {
        text += buffer.toString('utf8', offset);
        break;
      }
    }
    return text || buffer.toString('utf8');
  }

  async ping() {
    const res = await this.request('GET', '/_ping');
    return { ok: res.ok, error: res.error };
  }

  async getSystemInfo() {
    const [infoRes, versionRes] = await Promise.all([
      this.request('GET', '/info'),
      this.request('GET', '/version'),
    ]);
    if (!infoRes.ok) return { ok: false, error: infoRes.error };
    return { ok: true, info: infoRes.data, version: versionRes.data };
  }

  async listContainers(options = { all: true }) {
    const res = await this.request('GET', `/containers/json?all=${options.all ? 1 : 0}`);
    if (!res.ok) return { ok: false, error: res.error };
    return { ok: true, containers: res.data || [] };
  }

  async inspectContainer(id) {
    const res = await this.request('GET', `/containers/${id}/json`);
    if (!res.ok) return { ok: false, error: res.error };
    return { ok: true, data: res.data };
  }

  async startContainer(id) {
    const res = await this.request('POST', `/containers/${id}/start`);
    return { ok: res.ok, error: res.error };
  }

  async stopContainer(id) {
    const res = await this.request('POST', `/containers/${id}/stop`);
    return { ok: res.ok, error: res.error };
  }

  async restartContainer(id) {
    const res = await this.request('POST', `/containers/${id}/restart`);
    return { ok: res.ok, error: res.error };
  }

  async pauseContainer(id) {
    const res = await this.request('POST', `/containers/${id}/pause`);
    return { ok: res.ok, error: res.error };
  }

  async unpauseContainer(id) {
    const res = await this.request('POST', `/containers/${id}/unpause`);
    return { ok: res.ok, error: res.error };
  }

  async removeContainer(id, options = { force: false }) {
    const res = await this.request('DELETE', `/containers/${id}?force=${options.force ? 1 : 0}&v=1`);
    return { ok: res.ok, error: res.error };
  }

  async getLogs(id, { tail = 200, timestamps = false } = {}) {
    return new Promise((resolve) => {
      const path = `/containers/${id}/logs?stdout=1&stderr=1&tail=${tail}&timestamps=${timestamps ? 1 : 0}`;
      const req = http.request(
        {
          socketPath: this.socketPath,
          path,
          method: 'GET',
        },
        (res) => {
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => {
            const buffer = Buffer.concat(chunks);
            const text = this.demuxBuffer(buffer);
            resolve({ ok: true, logs: text });
          });
        }
      );
      req.on('error', (err) => resolve({ ok: false, error: err.message }));
      req.end();
    });
  }

  startLogStream(streamId, id, onData, onError, onEnd) {
    try {
      const path = `/containers/${id}/logs?stdout=1&stderr=1&follow=1&tail=50&timestamps=1`;
      const req = http.request(
        {
          socketPath: this.socketPath,
          path,
          method: 'GET',
        },
        (res) => {
          res.on('data', (chunk) => {
            const text = this.demuxBuffer(chunk);
            if (onData) onData(text);
          });
          res.on('end', () => {
            this.activeLogStreams.delete(streamId);
            if (onEnd) onEnd();
          });
          res.on('error', (e) => {
            if (onError) onError(e);
          });
        }
      );

      req.on('error', (err) => {
        if (onError) onError(err);
      });

      this.activeLogStreams.set(streamId, req);
      req.end();
    } catch (e) {
      if (onError) onError(e);
    }
  }

  stopLogStream(streamId) {
    const req = this.activeLogStreams.get(streamId);
    if (req) {
      try {
        req.destroy();
      } catch (e) {}
      this.activeLogStreams.delete(streamId);
    }
  }

  startStatsStream(streamId, id, onData, onError) {
    try {
      const path = `/containers/${id}/stats?stream=1`;
      const req = http.request(
        {
          socketPath: this.socketPath,
          path,
          method: 'GET',
        },
        (res) => {
          let bufferStr = '';
          res.on('data', (chunk) => {
            bufferStr += chunk.toString('utf8');
            const lines = bufferStr.split('\n');
            bufferStr = lines.pop();

            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                const stats = JSON.parse(line);

                let cpuPercent = 0.0;
                if (stats.cpu_stats && stats.precpu_stats) {
                  const cpuDelta =
                    stats.cpu_stats.cpu_usage.total_usage - (stats.precpu_stats.cpu_usage?.total_usage || 0);
                  const systemDelta =
                    (stats.cpu_stats.system_cpu_usage || 0) - (stats.precpu_stats.system_cpu_usage || 0);
                  const onlineCpus =
                    stats.cpu_stats.online_cpus || stats.cpu_stats.cpu_usage.percpu_usage?.length || 1;
                  if (systemDelta > 0 && cpuDelta > 0) {
                    cpuPercent = (cpuDelta / systemDelta) * onlineCpus * 100.0;
                  }
                }

                const memoryUsage = (stats.memory_stats?.usage || 0) - (stats.memory_stats?.stats?.cache || 0);
                const memoryLimit = stats.memory_stats?.limit || 0;
                const memoryPercent = memoryLimit > 0 ? (memoryUsage / memoryLimit) * 100.0 : 0;

                let netRx = 0;
                let netTx = 0;
                if (stats.networks) {
                  for (const net of Object.values(stats.networks)) {
                    netRx += net.rx_bytes || 0;
                    netTx += net.tx_bytes || 0;
                  }
                }

                let blockRead = 0;
                let blockWrite = 0;
                if (stats.blkio_stats?.io_service_bytes_recursive) {
                  for (const entry of stats.blkio_stats.io_service_bytes_recursive) {
                    if (entry.op === 'Read' || entry.op === 'read') blockRead += entry.value;
                    if (entry.op === 'Write' || entry.op === 'write') blockWrite += entry.value;
                  }
                }

                if (onData) {
                  onData({
                    cpuPercent: parseFloat(cpuPercent.toFixed(2)),
                    memoryUsage,
                    memoryLimit,
                    memoryPercent: parseFloat(memoryPercent.toFixed(2)),
                    netRx,
                    netTx,
                    blockRead,
                    blockWrite,
                    timestamp: new Date().toLocaleTimeString(),
                  });
                }
              } catch (jsonErr) {}
            }
          });

          res.on('error', (err) => {
            if (onError) onError(err);
          });

          res.on('end', () => {
            this.activeStatsStreams.delete(streamId);
          });
        }
      );

      req.on('error', (err) => {
        if (onError) onError(err);
      });

      this.activeStatsStreams.set(streamId, req);
      req.end();
    } catch (e) {
      if (onError) onError(e);
    }
  }

  stopStatsStream(streamId) {
    const req = this.activeStatsStreams.get(streamId);
    if (req) {
      try {
        req.destroy();
      } catch (e) {}
      this.activeStatsStreams.delete(streamId);
    }
  }

  async startExecTerminal(sessionId, containerId, { shell = '/bin/bash', cols = 80, rows = 24 } = {}, onData, onExit) {
    try {
      let execRes = await this.request('POST', `/containers/${containerId}/exec`, {
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: true,
        Cmd: [shell],
      });

      if (!execRes.ok && shell !== '/bin/sh') {
        execRes = await this.request('POST', `/containers/${containerId}/exec`, {
          AttachStdin: true,
          AttachStdout: true,
          AttachStderr: true,
          Tty: true,
          Cmd: ['/bin/sh'],
        });
      }

      if (!execRes.ok) {
        return { ok: false, error: execRes.error };
      }

      const execId = execRes.data.Id;
      const postData = JSON.stringify({ Detach: false, Tty: true });

      const req = http.request({
        socketPath: this.socketPath,
        path: `/exec/${execId}/start`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Connection: 'Upgrade',
          Upgrade: 'tcp',
          'Content-Length': Buffer.byteLength(postData),
        },
      });

      req.on('upgrade', (upgradeRes, socket, head) => {
        this.execSessions.set(sessionId, { socket, execId });

        if (cols && rows) {
          this.resizeExecTerminal(sessionId, cols, rows);
        }

        if (head && head.length && onData) {
          onData(head.toString('utf8'));
        }

        socket.on('data', (chunk) => {
          if (onData) onData(chunk.toString('utf8'));
        });

        socket.on('end', () => {
          this.execSessions.delete(sessionId);
          if (onExit) onExit();
        });

        socket.on('error', (err) => {
          this.execSessions.delete(sessionId);
          if (onExit) onExit(err);
        });
      });

      req.on('error', (err) => {
        if (onExit) onExit(err);
      });

      req.write(postData);
      req.end();

      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  writeExecTerminal(sessionId, data) {
    const session = this.execSessions.get(sessionId);
    if (session && session.socket && session.socket.writable) {
      session.socket.write(data);
    }
  }

  resizeExecTerminal(sessionId, cols, rows) {
    const session = this.execSessions.get(sessionId);
    if (session && session.execId) {
      this.request('POST', `/exec/${session.execId}/resize?h=${rows}&w=${cols}`).catch(() => {});
    }
  }

  closeExecTerminal(sessionId) {
    const session = this.execSessions.get(sessionId);
    if (session) {
      try {
        if (session.socket && typeof session.socket.destroy === 'function') {
          session.socket.destroy();
        }
      } catch (e) {}
      this.execSessions.delete(sessionId);
    }
  }

  async listImages() {
    const res = await this.request('GET', '/images/json');
    if (!res.ok) return { ok: false, error: res.error };
    return { ok: true, images: res.data || [] };
  }

  async removeImage(id, options = { force: false }) {
    const res = await this.request('DELETE', `/images/${encodeURIComponent(id)}?force=${options.force ? 1 : 0}`);
    return { ok: res.ok, error: res.error };
  }

  async pruneImages() {
    const res = await this.request('POST', '/images/prune?filters={"dangling":{"false":false}}');
    if (!res.ok) return { ok: false, error: res.error };
    return { ok: true, result: res.data };
  }

  async listVolumes() {
    const res = await this.request('GET', '/volumes');
    if (!res.ok) return { ok: false, error: res.error };
    return { ok: true, volumes: res.data?.Volumes || [] };
  }

  async pruneVolumes() {
    const res = await this.request('POST', '/volumes/prune');
    if (!res.ok) return { ok: false, error: res.error };
    return { ok: true, result: res.data };
  }

  async listNetworks() {
    const res = await this.request('GET', '/networks');
    if (!res.ok) return { ok: false, error: res.error };
    return { ok: true, networks: res.data || [] };
  }

  async pruneNetworks() {
    const res = await this.request('POST', '/networks/prune');
    if (!res.ok) return { ok: false, error: res.error };
    return { ok: true, result: res.data };
  }

  async createContainer(options) {
    try {
      const { Image, name, ports = [], envs = [], restart = 'no' } = options;

      const ExposedPorts = {};
      const PortBindings = {};

      for (const p of ports) {
        if (p.container) {
          const proto = p.protocol || 'tcp';
          const key = `${p.container}/${proto}`;
          ExposedPorts[key] = {};
          if (p.host) {
            PortBindings[key] = [{ HostPort: String(p.host) }];
          }
        }
      }

      const createPath = name ? `/containers/create?name=${encodeURIComponent(name)}` : '/containers/create';
      const createRes = await this.request('POST', createPath, {
        Image,
        Env: envs.filter((e) => e.trim().length > 0),
        ExposedPorts,
        HostConfig: {
          PortBindings,
          RestartPolicy: { Name: restart },
        },
      });

      if (!createRes.ok) {
        return { ok: false, error: createRes.error };
      }

      const containerId = createRes.data.Id;
      await this.request('POST', `/containers/${containerId}/start`);
      return { ok: true, id: containerId };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  async composeCommand(action, { workingDir, configFile, project }) {
    const { exec } = require('child_process');
    return new Promise((resolve) => {
      let cmd = 'docker compose';
      if (configFile) {
        cmd += ` -f "${configFile}"`;
      } else if (project) {
        cmd += ` -p "${project}"`;
      }

      if (action === 'up') cmd += ' up -d';
      else if (action === 'stop') cmd += ' stop';
      else if (action === 'down') cmd += ' down';
      else if (action === 'restart') cmd += ' restart';
      else cmd += ` ${action}`;

      const options = {
        cwd: workingDir || process.cwd(),
        env: process.env,
        maxBuffer: 10 * 1024 * 1024,
      };

      exec(cmd, options, (error, stdout, stderr) => {
        if (error) {
          resolve({ ok: false, error: stderr || error.message, output: stdout, command: cmd });
        } else {
          resolve({ ok: true, output: stdout || stderr, command: cmd });
        }
      });
    });
  }

  destroyAll() {
    for (const [id, session] of this.execSessions.entries()) {
      try {
        if (session.socket && typeof session.socket.destroy === 'function') {
          session.socket.destroy();
        }
      } catch (e) {}
    }
    this.execSessions.clear();

    for (const [id, req] of this.activeLogStreams.entries()) {
      try {
        req.destroy();
      } catch (e) {}
    }
    this.activeLogStreams.clear();

    for (const [id, req] of this.activeStatsStreams.entries()) {
      try {
        req.destroy();
      } catch (e) {}
    }
    this.activeStatsStreams.clear();
  }
}

module.exports = new DockerService();
