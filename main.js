const { app, BrowserWindow, ipcMain, dialog, globalShortcut, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const dgram = require('dgram');
const os = require('os');
const { spawn, exec } = require('child_process');

// ============================================================================
// MASS-CODE MAIN PROCESS & SECURITY ENGINE
// ============================================================================

let mainWindow = null;
let currentSecurityMode = 'welcome'; // 'welcome' | 'host' | 'competitor'
const SUPERVISOR_EMERGENCY_KEY = 'GECM@8123';

// Network Port Standards
const DEFAULT_HTTP_PORT = 8080;
const UDP_BROADCAST_PORT = 45454;

// Persistent Storage Directories
const submissionsDir = path.join(__dirname, 'submissions');
const syncedSubmissionsDir = path.join(__dirname, 'synced_submissions');
const sessionsDir = path.join(__dirname, 'sessions');
const contestsDir = path.join(__dirname, 'contests');
const tempDir = path.join(__dirname, 'temp');

[submissionsDir, syncedSubmissionsDir, sessionsDir, contestsDir, tempDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// ----------------------------------------------------------------------------
// Local LAN UDP Discovery Engine (Host Broadcast & Competitor Discovery)
// ----------------------------------------------------------------------------
class LanDiscoveryEngine {
  constructor() {
    this.broadcastSocket = null;
    this.listenerSocket = null;
    this.broadcastTimer = null;
    this.isBroadcasting = false;
    this.isListening = false;
    this.activeContestData = null;
  }

  getLocalBroadcastAddresses() {
    const interfaces = os.networkInterfaces();
    const addresses = new Set();
    addresses.add('255.255.255.255');
    addresses.add('127.0.0.1');

    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          if (iface.netmask && iface.address) {
            try {
              const ipParts = iface.address.split('.').map(Number);
              const maskParts = iface.netmask.split('.').map(Number);
              const bcastParts = ipParts.map((p, i) => (p | (~maskParts[i] & 255)));
              addresses.add(bcastParts.join('.'));
            } catch (_) {}
          }
        }
      }
    }
    return Array.from(addresses);
  }

  startBroadcasting(hostPayload) {
    this.stopBroadcasting();
    this.activeContestData = hostPayload;

    try {
      this.broadcastSocket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
      this.broadcastSocket.on('error', (err) => {
        // Non-critical UDP logging
      });

      this.broadcastSocket.bind(0, () => {
        try {
          this.broadcastSocket.setBroadcast(true);
          this.isBroadcasting = true;

          const broadcastPacket = () => {
            if (!this.isBroadcasting || !this.broadcastSocket || !this.activeContestData) return;
            const message = Buffer.from(JSON.stringify({
              type: 'MASSCODE_HOST_ANNOUNCE',
              ...this.activeContestData,
              timestamp: Date.now()
            }));

            const targets = this.getLocalBroadcastAddresses();
            targets.forEach((addr) => {
              this.broadcastSocket.send(message, 0, message.length, UDP_BROADCAST_PORT, addr, () => {});
            });
          };

          broadcastPacket();
          this.broadcastTimer = setInterval(broadcastPacket, 2000);
        } catch (_) {}
      });
    } catch (_) {}
  }

  stopBroadcasting() {
    this.isBroadcasting = false;
    if (this.broadcastTimer) {
      clearInterval(this.broadcastTimer);
      this.broadcastTimer = null;
    }
    if (this.broadcastSocket) {
      try { this.broadcastSocket.close(); } catch (_) {}
      this.broadcastSocket = null;
    }
    this.activeContestData = null;
  }

  startListening(onDiscovered) {
    if (this.isListening) return;

    try {
      this.listenerSocket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
      this.listenerSocket.on('error', (err) => {
        // Non-critical UDP logging
      });

      this.listenerSocket.on('message', (msg, rinfo) => {
        try {
          const packet = JSON.parse(msg.toString('utf-8'));
          if (packet && packet.type === 'MASSCODE_HOST_ANNOUNCE') {
            // Prioritize actual physical network address over broadcast payload virtual adapters
            const hostIp = (rinfo.address && rinfo.address !== '127.0.0.1') ? rinfo.address : (packet.host || rinfo.address);
            const port = packet.port || DEFAULT_HTTP_PORT;
            const payload = {
              ...packet,
              senderIp: rinfo.address,
              hostIp,
              port,
              url: `http://${hostIp}:${port}`
            };
            if (onDiscovered) onDiscovered(payload);
          }
        } catch (_) {}
      });

      this.listenerSocket.bind(UDP_BROADCAST_PORT, '0.0.0.0', () => {
        this.isListening = true;
      });
    } catch (_) {}
  }

  stopListening() {
    this.isListening = false;
    if (this.listenerSocket) {
      try { this.listenerSocket.close(); } catch (_) {}
      this.listenerSocket = null;
    }
  }
}

const lanDiscovery = new LanDiscoveryEngine();

// ----------------------------------------------------------------------------
// Embedded Host LAN Server Module (HTTP on Port 8080 + UDP Broadcast)
// ----------------------------------------------------------------------------
class HostServer {
  constructor() {
    this.server = null;
    this.port = DEFAULT_HTTP_PORT;
    this.activeContest = null;
    this.isRunning = false;
  }

  getLocalIps() {
    const interfaces = os.networkInterfaces();
    const ranked = [];
    for (const name of Object.keys(interfaces)) {
      const lowerName = name.toLowerCase();
      const isVirtual = lowerName.includes('virtual') || 
                        lowerName.includes('vethernet') || 
                        lowerName.includes('wsl') || 
                        lowerName.includes('pseudo') || 
                        lowerName.includes('hyper-v') ||
                        lowerName.includes('vmware') ||
                        lowerName.includes('loopback');
      
      const isPrimary = lowerName.includes('wi-fi') || 
                        lowerName.includes('wifi') || 
                        lowerName.includes('wlan') || 
                        lowerName.includes('ethernet') || 
                        lowerName.includes('eth') || 
                        lowerName.includes('lan');

      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          let priority = 1;
          if (isPrimary && !isVirtual) priority = 3;
          else if (!isVirtual) priority = 2;
          else priority = 0;
          ranked.push({ address: iface.address, priority });
        }
      }
    }
    ranked.sort((a, b) => b.priority - a.priority);
    const addresses = ranked.map(r => r.address);
    return addresses.length > 0 ? addresses : ['127.0.0.1'];
  }

  start(port = DEFAULT_HTTP_PORT, contestConfig = null) {
    if (this.isRunning) {
      if (contestConfig) {
        this.activeContest = contestConfig;
        lanDiscovery.startBroadcasting({
          host: this.getLocalIps()[0] || '127.0.0.1',
          port: this.port,
          contestId: this.activeContest.id || this.activeContest.token,
          contestToken: this.activeContest.token || 'MASS2026',
          contestTitle: this.activeContest.title || 'Mass-Code Contest',
          durationMinutes: this.activeContest.durationMinutes || 60,
          problemCount: (this.activeContest.problems || []).length
        });
      }
      return { success: true, port: this.port, ips: this.getLocalIps() };
    }

    this.port = port || DEFAULT_HTTP_PORT;
    if (contestConfig) this.activeContest = contestConfig;

    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }

        const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const pathname = parsedUrl.pathname;

        // Discovery / Health: GET /ping or /api/ping
        if (req.method === 'GET' && (pathname === '/api/ping' || pathname === '/ping')) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'online',
            platform: 'Mass-Code Host Distribution Engine',
            port: this.port,
            contestActive: !!this.activeContest,
            contestId: this.activeContest ? (this.activeContest.id || this.activeContest.token) : null,
            contestTitle: this.activeContest ? this.activeContest.title : null,
            contestToken: this.activeContest ? this.activeContest.token : null
          }));
          return;
        }

        // Contest Retrieval: GET /api/contest/:code or GET /contest/:code or GET /api/contest or GET /contest
        if (req.method === 'GET' && (pathname.startsWith('/api/contest') || pathname.startsWith('/contest'))) {
          if (!this.activeContest) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'No active contest configured on Host server. Please host a contest in Host Mode.' }));
            return;
          }

          let code = '';
          if (pathname.startsWith('/api/contest/')) {
            code = pathname.replace('/api/contest/', '').trim().toLowerCase();
          } else if (pathname.startsWith('/contest/')) {
            code = pathname.replace('/contest/', '').trim().toLowerCase();
          }

          if (code && code !== 'any') {
            const expectedToken = (this.activeContest.token || 'MASS2026').trim().toLowerCase();
            const expectedId = (this.activeContest.id || '').trim().toLowerCase();
            const idMatch = expectedId === code;
            const tokenMatch = expectedToken === code;
            if (!idMatch && !tokenMatch) {
              res.writeHead(403, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                error: `Contest PIN mismatch. Expected: "${this.activeContest.token || 'MASS2026'}"`,
                expectedPin: this.activeContest.token || 'MASS2026',
                contestTitle: this.activeContest.title
              }));
              return;
            }
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(this.activeContest));
          return;
        }

        // Final Submission Sync: POST /sync-result and POST /api/contest/sync-submission
        if (req.method === 'POST' && (pathname === '/sync-result' || pathname === '/api/contest/sync-submission')) {
          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', () => {
            try {
              const submission = JSON.parse(body);
              if (!submission.usn) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Missing candidate USN in submission payload.' }));
                return;
              }

              const safeUsn = submission.usn.replace(/[^a-zA-Z0-9_-]/g, '_');
              const filename = `FINAL_${safeUsn}.json`;

              // Write to synced_submissions/
              const syncedPath = path.join(syncedSubmissionsDir, filename);
              fs.writeFileSync(syncedPath, JSON.stringify(submission, null, 2), 'utf-8');

              // Mirror to submissions/ for backward compatibility
              const subPath = path.join(submissionsDir, filename);
              fs.writeFileSync(subPath, JSON.stringify(submission, null, 2), 'utf-8');

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: true,
                message: `Submission for ${submission.usn} synchronized to Host.`,
                filename,
                savedFolder: 'synced_submissions'
              }));
            } catch (err) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Endpoint not found.' }));
      });

      this.server.listen(this.port, '0.0.0.0', () => {
        this.isRunning = true;
        if (this.activeContest) {
          lanDiscovery.startBroadcasting({
            host: this.getLocalIps()[0] || '127.0.0.1',
            port: this.port,
            contestId: this.activeContest.id || this.activeContest.token,
            contestToken: this.activeContest.token || 'MASS2026',
            contestTitle: this.activeContest.title || 'Mass-Code Contest',
            durationMinutes: this.activeContest.durationMinutes || 60,
            problemCount: (this.activeContest.problems || []).length
          });
        }
        resolve({ success: true, port: this.port, ips: this.getLocalIps() });
      });

      this.server.on('error', (err) => {
        this.isRunning = false;
        reject(err);
      });
    });
  }

  stop() {
    return new Promise((resolve) => {
      lanDiscovery.stopBroadcasting();
      if (this.server && this.isRunning) {
        this.server.close(() => {
          this.isRunning = false;
          resolve({ success: true });
        });
      } else {
        resolve({ success: true });
      }
    });
  }
}

const hostServer = new HostServer();

// ----------------------------------------------------------------------------
// Native C Compiler Sandbox Engine
// ----------------------------------------------------------------------------
async function checkGcc() {
  return new Promise((resolve) => {
    exec('gcc --version', (err, stdout) => {
      if (err) {
        resolve({ available: false, version: null });
      } else {
        resolve({ available: true, version: stdout.split('\n')[0].trim() });
      }
    });
  });
}

function normalizeTokens(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').map(l => l.trimEnd()).join('\n').trim();
}

async function compileAndEvaluate({ code, language = 'c', testCases = [], timeoutMs = 2000, maxPoints = 100 }, onProgress) {
  const sessionId = `eval_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const ext = language === 'cpp' ? 'cpp' : 'c';
  const sourcePath = path.join(tempDir, `${sessionId}.${ext}`);
  const binaryPath = path.join(tempDir, `${sessionId}.exe`);

  fs.writeFileSync(sourcePath, code || '', 'utf-8');

  // Step 1: Compilation Phase
  const compiler = language === 'cpp' ? 'g++' : 'gcc';
  if (onProgress) onProgress({ phase: 'compiling', message: `Invoking native compiler: ${compiler} -O2` });

  const compileRes = await new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    const proc = spawn(compiler, [sourcePath, '-o', binaryPath, '-O2'], { windowsHide: true });
    proc.stdout.on('data', d => { stdout += d.toString(); });
    proc.stderr.on('data', d => { stderr += d.toString(); });
    proc.on('close', codeVal => resolve({ success: codeVal === 0, stdout, stderr }));
    proc.on('error', err => resolve({ success: false, stdout: '', stderr: err.message }));
  });

  if (!compileRes.success) {
    try { if (fs.existsSync(sourcePath)) fs.unlinkSync(sourcePath); } catch (_) {}
    return {
      success: false,
      phase: 'compilation',
      compilerError: compileRes.stderr || 'Compilation failed.',
      testResults: [],
      totalScore: 0,
      maxScore: maxPoints,
      passedCount: 0,
      totalCount: testCases.length
    };
  }

  // Grace period to ensure binary file handle is unlocked by linker on Windows
  await new Promise(r => setTimeout(r, 100));

  // Step 2: Test Case Evaluation Stream
  const testResults = [];
  let passedCount = 0;
  let totalCpuMs = 0;

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    if (onProgress) onProgress({ phase: 'running_test', index: i + 1, total: testCases.length });

    const evalRes = await new Promise(async (resolve) => {
      const startTime = process.hrtime();
      let stdout = '';
      let stderr = '';
      let timedOut = false;

      let proc = null;
      let attempts = 0;
      while (attempts < 4) {
        attempts++;
        try {
          proc = spawn(binaryPath, [], { cwd: tempDir, windowsHide: true });
          break;
        } catch (_) {
          await new Promise(r => setTimeout(r, 80));
        }
      }

      if (!proc) {
        return resolve({ exitCode: -1, stdout: '', stderr: 'Spawn failure', timedOut: false, durationMs: 0 });
      }

      const timer = setTimeout(() => {
        timedOut = true;
        try { proc.kill('SIGKILL'); } catch (_) {}
      }, timeoutMs);

      proc.stdout.on('data', d => { stdout += d.toString(); });
      proc.stderr.on('data', d => { stderr += d.toString(); });

      proc.on('close', codeVal => {
        clearTimeout(timer);
        const diff = process.hrtime(startTime);
        const durationMs = Math.round((diff[0] * 1e3 + diff[1] / 1e6) * 10) / 10;
        resolve({ exitCode: codeVal, stdout, stderr, timedOut, durationMs });
      });

      proc.on('error', err => {
        clearTimeout(timer);
        resolve({ exitCode: -1, stdout: '', stderr: err.message, timedOut: false, durationMs: 0 });
      });

      try {
        if (tc.input) proc.stdin.write(tc.input);
        proc.stdin.end();
      } catch (_) {}
    });

    totalCpuMs += evalRes.durationMs;
    const isPassed = !evalRes.timedOut && evalRes.exitCode === 0 && normalizeTokens(evalRes.stdout) === normalizeTokens(tc.expectedOutput || '');

    if (isPassed) passedCount++;

    testResults.push({
      index: i + 1,
      isSample: !!tc.isSample,
      passed: isPassed,
      timedOut: evalRes.timedOut,
      exitCode: evalRes.exitCode,
      executionTimeMs: evalRes.durationMs,
      input: tc.isSample ? tc.input : '[HIDDEN PARAMETERS]',
      expectedOutput: tc.isSample ? tc.expectedOutput : '[HIDDEN]',
      actualOutput: tc.isSample ? evalRes.stdout : (isPassed ? '[CORRECT]' : '[INCORRECT MATCH]')
    });
  }

  // Cleanup binary and source
  try {
    if (fs.existsSync(sourcePath)) fs.unlinkSync(sourcePath);
    if (fs.existsSync(binaryPath)) fs.unlinkSync(binaryPath);
  } catch (_) {}

  const earnedScore = testCases.length > 0 ? Math.round((passedCount / testCases.length) * maxPoints * 10) / 10 : 0;

  return {
    success: true,
    phase: 'evaluated',
    compilerOutput: 'Compilation succeeded.',
    testResults,
    totalScore: earnedScore,
    maxScore: maxPoints,
    passedCount,
    totalCount: testCases.length,
    totalExecutionTimeMs: Math.round(totalCpuMs * 10) / 10
  };
}

// ----------------------------------------------------------------------------
// Window Creation & Security Rules Engine
// ----------------------------------------------------------------------------
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1080,
    minHeight: 720,
    backgroundColor: '#090d16',
    title: 'Mass-Code // Universal Offline Competitive Programming Platform',
    icon: path.join(__dirname, 'assets', 'logo.png'),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  Menu.setApplicationMenu(null);
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Window Focus / Blur Cheating Detection in Competitor Mode
  mainWindow.on('blur', () => {
    if (mainWindow && !mainWindow.isDestroyed() && currentSecurityMode === 'competitor') {
      mainWindow.webContents.send('window-blur-detected', { timestamp: new Date().toISOString() });
    }
  });

  // Strict shortcut interception
  mainWindow.webContents.on('before-input-event', (event, input) => {
    const key = (input.key || '').toLowerCase();
    const ctrl = input.control || input.meta;
    const alt = input.alt;
    const shift = input.shift;

    // In all modes, block DevTools & accidental reloads
    if (key === 'f12' || (ctrl && shift && (key === 'i' || key === 'j' || key === 'c'))) {
      event.preventDefault();
      return;
    }
    if (ctrl && (key === 'r' || key === 'f5')) {
      event.preventDefault();
      return;
    }
    if (key === 'f11') {
      event.preventDefault();
      return;
    }

    // In Competitor Mode, enforce complete OS confinement
    if (currentSecurityMode === 'competitor') {
      if (alt && (key === 'tab' || key === 'f4' || key === 'escape')) {
        event.preventDefault();
        return;
      }
      if (ctrl && (key === 'w' || key === 'q')) {
        event.preventDefault();
        return;
      }
    }
  });

  mainWindow.on('close', (e) => {
    if (currentSecurityMode === 'competitor') {
      e.preventDefault();
      mainWindow.webContents.send('competitor-close-attempted');
    }
  });
}

// ----------------------------------------------------------------------------
// Mode Security Switching Logic
// ----------------------------------------------------------------------------
function applySecurityMode(mode) {
  if (!mainWindow) return;
  currentSecurityMode = mode;

  if (mode === 'host') {
    // HOST MODE: Full computing freedom. Can minimize, switch tabs, switch desktop apps!
    mainWindow.setKiosk(false);
    mainWindow.setAlwaysOnTop(false);
    mainWindow.setFullScreen(false);
    mainWindow.setResizable(true);
    mainWindow.setMinimizable(true);
    globalShortcut.unregisterAll();
  } else if (mode === 'competitor') {
    // COMPETITOR MODE: Strict kiosk window confinement framework
    mainWindow.setFullScreen(true);
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.setKiosk(true);
    mainWindow.setResizable(false);

    try {
      globalShortcut.register('Alt+Tab', () => {});
      globalShortcut.register('Alt+F4', () => {});
      globalShortcut.register('CommandOrControl+Shift+I', () => {});
      globalShortcut.register('F12', () => {});
    } catch (_) {}
  } else {
    // WELCOME / LANDING MODE
    mainWindow.setKiosk(false);
    mainWindow.setAlwaysOnTop(false);
    mainWindow.setFullScreen(false);
    mainWindow.setResizable(true);
    mainWindow.setMinimizable(true);
    globalShortcut.unregisterAll();
  }
}

// ----------------------------------------------------------------------------
// App Lifecycle
// ----------------------------------------------------------------------------
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  try { hostServer.stop(); } catch (_) {}
});

// ----------------------------------------------------------------------------
// IPC Handlers
// ----------------------------------------------------------------------------
ipcMain.handle('security:set-mode', (event, { mode }) => {
  applySecurityMode(mode);
  return { success: true, mode: currentSecurityMode };
});

ipcMain.handle('security:verify-supervisor-key', (event, { key }) => {
  const isMatch = (key || '').trim() === SUPERVISOR_EMERGENCY_KEY;
  if (isMatch) {
    applySecurityMode('welcome'); // Unlock station
  }
  return { success: isMatch };
});

ipcMain.handle('env:get-diagnostics', async () => {
  const gcc = await checkGcc();
  return {
    os: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    gcc,
    serverIps: hostServer.getLocalIps()
  };
});

ipcMain.handle('env:get-launch-args', () => {
  return {
    competitorOnly: process.argv.includes('--competitor-only')
  };
});

ipcMain.handle('compiler:compile-and-evaluate', async (event, payload) => {
  return await compileAndEvaluate(payload, (prog) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('compiler:progress', prog);
    }
  });
});

ipcMain.handle('session:save-snapshot', async (event, sessionData) => {
  try {
    const safeUsn = (sessionData.usn || 'anonymous').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = path.join(sessionsDir, `SESSION_${safeUsn}.json`);
    fs.writeFileSync(filePath, JSON.stringify(sessionData, null, 2), 'utf-8');
    return { success: true, filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('session:load-snapshot', async (event, { usn }) => {
  try {
    const safeUsn = (usn || '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = path.join(sessionsDir, `SESSION_${safeUsn}.json`);
    if (fs.existsSync(filePath)) {
      return { success: true, found: true, data: JSON.parse(fs.readFileSync(filePath, 'utf-8')) };
    }
    return { success: true, found: false };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('submission:save-final', async (event, payload) => {
  try {
    const safeUsn = (payload.usn || 'anonymous').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `FINAL_${safeUsn}.json`;
    const filePath = path.join(submissionsDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
    return { success: true, filename, filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Contest Package Management
ipcMain.handle('contest:get-default', async () => {
  const activePath = path.join(contestsDir, 'active-contest.json');
  if (fs.existsSync(activePath)) {
    try {
      return { success: true, contest: JSON.parse(fs.readFileSync(activePath, 'utf-8')) };
    } catch (_) {}
  }
  const samplePath = path.join(__dirname, 'sample-contest.json');
  if (fs.existsSync(samplePath)) {
    return { success: true, contest: JSON.parse(fs.readFileSync(samplePath, 'utf-8')) };
  }
  return { success: false };
});

ipcMain.handle('contest:list-saved', async () => {
  try {
    if (!fs.existsSync(contestsDir)) return { success: true, contests: [] };
    const files = fs.readdirSync(contestsDir).filter(f => f.endsWith('.json') && f !== 'active-contest.json');
    const list = [];
    for (const file of files) {
      try {
        const fullPath = path.join(contestsDir, file);
        const data = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
        list.push({
          filename: file,
          id: data.id || data.token,
          title: data.title || file,
          token: data.token || 'MASS2026',
          problemCount: (data.problems || []).length
        });
      } catch (_) {}
    }
    return { success: true, contests: list };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('contest:load-saved-by-filename', async (event, filename) => {
  try {
    const safeName = path.basename(filename);
    const fullPath = path.join(contestsDir, safeName);
    if (!fs.existsSync(fullPath)) return { success: false, error: 'File not found' };
    const data = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
    return { success: true, contest: data };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('contest:save', async (event, contestConfig) => {
  try {
    const filename = `contest-${contestConfig.id || Date.now()}.json`;
    const localPath = path.join(contestsDir, filename);
    const activePath = path.join(contestsDir, 'active-contest.json');
    const samplePath = path.join(__dirname, 'sample-contest.json');
    fs.writeFileSync(localPath, JSON.stringify(contestConfig, null, 2), 'utf-8');
    fs.writeFileSync(activePath, JSON.stringify(contestConfig, null, 2), 'utf-8');
    try { fs.writeFileSync(samplePath, JSON.stringify(contestConfig, null, 2), 'utf-8'); } catch (_) {}
    hostServer.activeContest = contestConfig;
    return { success: true, filePath: localPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('contest:export-dialog', async (event, contestConfig) => {
  const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Mass-Code Contest Package',
    defaultPath: `contest-${contestConfig.id || 'config'}.json`,
    filters: [{ name: 'JSON Contest File', extensions: ['json'] }]
  });
  if (canceled || !filePath) return { canceled: true };
  fs.writeFileSync(filePath, JSON.stringify(contestConfig, null, 2), 'utf-8');
  hostServer.activeContest = contestConfig;
  return { success: true, filePath };
});

ipcMain.handle('contest:import-dialog', async () => {
  const { filePaths, canceled } = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Mass-Code Contest Configuration',
    filters: [{ name: 'JSON Contest File', extensions: ['json'] }],
    properties: ['openFile']
  });
  if (canceled || !filePaths || filePaths.length === 0) return { canceled: true };
  const config = JSON.parse(fs.readFileSync(filePaths[0], 'utf-8'));
  return { success: true, config, filePath: filePaths[0] };
});

// Host Server Management
ipcMain.handle('server:start', async (event, { port = DEFAULT_HTTP_PORT, contestConfig = null }) => {
  try {
    const res = await hostServer.start(port, contestConfig);
    return { success: true, ...res };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('server:stop', async () => {
  return await hostServer.stop();
});

ipcMain.handle('server:get-status', () => {
  return {
    isRunning: hostServer.isRunning,
    port: hostServer.port,
    activeContestId: hostServer.activeContest ? (hostServer.activeContest.id || hostServer.activeContest.token) : null,
    ips: hostServer.getLocalIps()
  };
});

// Grading Leaderboard Scanner (Scans synced_submissions/ and submissions/)
ipcMain.handle('grading:scan-folder', async (event, customFolder = null) => {
  try {
    const foldersToScan = customFolder ? [customFolder] : [syncedSubmissionsDir, submissionsDir];
    const recordsMap = new Map();

    for (const targetDir of foldersToScan) {
      if (!fs.existsSync(targetDir)) continue;

      const files = fs.readdirSync(targetDir).filter(f => f.startsWith('FINAL_') && f.endsWith('.json'));
      for (const file of files) {
        try {
          const fullPath = path.join(targetDir, file);
          const data = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
          const usn = data.usn || file.replace('FINAL_', '').replace('.json', '');

          // Keep latest submission if duplicate across folders
          if (!recordsMap.has(usn) || (data.submittedAt && recordsMap.get(usn).submittedAt < data.submittedAt)) {
            recordsMap.set(usn, {
              usn,
              name: data.name || 'Anonymous',
              totalScore: data.totalScore || 0,
              maxScore: data.maxScore || 100,
              problemsSolvedCount: data.problemsSolvedCount || 0,
              totalProblems: data.totalProblems || 0,
              timeElapsedSeconds: data.timeElapsedSeconds || 0,
              totalExecutionTimeMs: data.totalExecutionTimeMs || 0,
              violationsCount: data.violationStrikes || (data.violations ? data.violations.length : 0),
              submittedAt: data.submittedAt || 'N/A',
              filename: file,
              fullPayload: data
            });
          }
        } catch (_) {}
      }
    }

    const records = Array.from(recordsMap.values());

    // Competitive Grading: 1. Highest Score, 2. Fastest CPU Time, 3. Lowest Elapsed Time
    records.sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      if (a.totalExecutionTimeMs !== b.totalExecutionTimeMs) return a.totalExecutionTimeMs - b.totalExecutionTimeMs;
      return a.timeElapsedSeconds - b.timeElapsedSeconds;
    });

    records.forEach((r, idx) => { r.rank = idx + 1; });

    return { success: true, directory: syncedSubmissionsDir, totalCount: records.length, records };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('grading:export-csv', async (event, { records, contestTitle = 'Mass-Code Contest' }) => {
  const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Leaderboard Spreadsheet',
    defaultPath: `Leaderboard_${contestTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.csv`,
    filters: [{ name: 'CSV Spreadsheets', extensions: ['csv'] }]
  });
  if (canceled || !filePath) return { canceled: true };

  const headers = ['Rank', 'USN', 'Candidate Name', 'Score', 'Max Score', 'Problems Solved', 'Total Problems', 'Contest Time (s)', 'CPU Time (ms)', 'Violations', 'Submitted At'];
  const rows = records.map(r => [
    r.rank, `"${r.usn}"`, `"${r.name}"`, r.totalScore, r.maxScore, r.problemsSolvedCount, r.totalProblems, r.timeElapsedSeconds, r.totalExecutionTimeMs, r.violationsCount, `"${r.submittedAt}"`
  ].join(','));

  fs.writeFileSync(filePath, [headers.join(','), ...rows].join('\n'), 'utf-8');
  return { success: true, filePath };
});

// Remote LAN Sync Bridge (Competitor -> Host)
ipcMain.handle('sync:fetch-remote-contest', async (event, { hostUrl, contestCode }) => {
  return new Promise((resolve) => {
    try {
      let normalizedHost = (hostUrl || '').trim();
      if (!normalizedHost.startsWith('http://') && !normalizedHost.startsWith('https://')) {
        normalizedHost = `http://${normalizedHost}`;
      }

      const parsed = new URL(normalizedHost);
      if (!parsed.port && !hostUrl.includes(':')) {
        parsed.port = DEFAULT_HTTP_PORT.toString();
      }

      const codePart = contestCode ? encodeURIComponent(contestCode.trim()) : '';
      const targetUrl = new URL(`/api/contest/${codePart}`, parsed.origin);

      const req = http.get(targetUrl, { timeout: 5000 }, (res) => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              resolve({ success: true, contest: JSON.parse(body) });
            } catch (e) {
              resolve({ success: false, error: 'Malformed JSON payload from host.' });
            }
          } else {
            try {
              const errObj = JSON.parse(body);
              resolve({
                success: false,
                error: errObj.error || `Host returned HTTP ${res.statusCode}`,
                expectedPin: errObj.expectedPin,
                contestTitle: errObj.contestTitle
              });
            } catch (_) {
              resolve({ success: false, error: body || `Host returned HTTP ${res.statusCode}` });
            }
          }
        });
      });
      req.on('error', err => resolve({ success: false, error: `Network error: ${err.message}` }));
      req.on('timeout', () => { req.destroy(); resolve({ success: false, error: 'Connection timed out connecting to Host.' }); });
    } catch (err) {
      resolve({ success: false, error: err.message });
    }
  });
});

ipcMain.handle('sync:push-submission', async (event, { hostUrl, payload }) => {
  return new Promise((resolve) => {
    try {
      let normalizedHost = (hostUrl || '').trim();
      if (!normalizedHost.startsWith('http://') && !normalizedHost.startsWith('https://')) {
        normalizedHost = `http://${normalizedHost}`;
      }

      const parsed = new URL(normalizedHost);
      if (!parsed.port && !hostUrl.includes(':')) {
        parsed.port = DEFAULT_HTTP_PORT.toString();
      }

      // User requirement: HTTP POST http://[Host-IP]:8080/sync-result
      const url = new URL('/sync-result', parsed.origin);
      const postData = JSON.stringify(payload);
      const req = http.request(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 5000
      }, (res) => {
        let respData = '';
        res.on('data', chunk => { respData += chunk; });
        res.on('end', () => {
          resolve({ success: res.statusCode === 200, response: respData });
        });
      });
      req.on('error', err => resolve({ success: false, error: err.message }));
      req.on('timeout', () => { req.destroy(); resolve({ success: false, error: 'Timed out contacting host' }); });
      req.write(postData);
      req.end();
    } catch (err) {
      resolve({ success: false, error: err.message });
    }
  });
});

// UDP LAN Discovery Handlers
ipcMain.handle('lan:start-listening', () => {
  lanDiscovery.startListening((discoveredHost) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('lan:host-discovered', discoveredHost);
    }
  });
  return { success: true };
});

ipcMain.handle('lan:stop-listening', () => {
  lanDiscovery.stopListening();
  return { success: true };
});
