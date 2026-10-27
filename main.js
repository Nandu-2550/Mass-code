const { app, BrowserWindow, ipcMain, dialog, globalShortcut, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const os = require('os');
const { spawn, exec } = require('child_process');

// ============================================================================
// MASS-CODE MAIN PROCESS & SECURITY ENGINE
// ============================================================================

let mainWindow = null;
let currentSecurityMode = 'welcome'; // 'welcome' | 'host' | 'competitor'
const SUPERVISOR_EMERGENCY_KEY = 'MASSCODE_EMERGENCY_2026';

// Persistent Storage Directories
const submissionsDir = path.join(__dirname, 'submissions');
const sessionsDir = path.join(__dirname, 'sessions');
const contestsDir = path.join(__dirname, 'contests');
const tempDir = path.join(__dirname, 'temp');

[submissionsDir, sessionsDir, contestsDir, tempDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// ----------------------------------------------------------------------------
// Embedded Host LAN Server Module
// ----------------------------------------------------------------------------
class HostServer {
  constructor() {
    this.server = null;
    this.port = 4500;
    this.activeContest = null;
    this.isRunning = false;
  }

  getLocalIps() {
    const interfaces = os.networkInterfaces();
    const addresses = [];
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          addresses.push(iface.address);
        }
      }
    }
    return addresses.length > 0 ? addresses : ['127.0.0.1'];
  }

  start(port = 4500, contestConfig = null) {
    if (this.isRunning) {
      if (contestConfig) this.activeContest = contestConfig;
      return { success: true, port: this.port, ips: this.getLocalIps() };
    }

    this.port = port;
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

        // Discovery / Health
        if (req.method === 'GET' && pathname === '/api/ping') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'online',
            platform: 'Mass-Code Host Distribution Engine',
            contestActive: !!this.activeContest,
            contestId: this.activeContest ? (this.activeContest.id || this.activeContest.token) : null,
            contestTitle: this.activeContest ? this.activeContest.title : null
          }));
          return;
        }

        // Contest Retrieval: GET /api/contest/:code
        if (req.method === 'GET' && pathname.startsWith('/api/contest/')) {
          const code = pathname.replace('/api/contest/', '').trim().toLowerCase();
          if (!this.activeContest) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'No active contest configured on Host server.' }));
            return;
          }

          const idMatch = (this.activeContest.id || '').toLowerCase() === code;
          const tokenMatch = (this.activeContest.token || '').toLowerCase() === code;

          if (!idMatch && !tokenMatch) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `Contest ID mismatch. Expected: ${this.activeContest.id || this.activeContest.token}, got: ${code}` }));
            return;
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(this.activeContest));
          return;
        }

        // Final Submission Sync: POST /api/contest/sync-submission
        if (req.method === 'POST' && pathname === '/api/contest/sync-submission') {
          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', () => {
            try {
              const submission = JSON.parse(body);
              if (!submission.usn) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Missing USN in submission package.' }));
                return;
              }

              const safeUsn = submission.usn.replace(/[^a-zA-Z0-9_-]/g, '_');
              const filename = `FINAL_${safeUsn}.json`;
              const filePath = path.join(submissionsDir, filename);

              fs.writeFileSync(filePath, JSON.stringify(submission, null, 2), 'utf-8');

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: true,
                message: `Submission for ${submission.usn} synchronized to Host.`,
                filename
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
  const samplePath = path.join(__dirname, 'sample-contest.json');
  if (fs.existsSync(samplePath)) {
    return { success: true, contest: JSON.parse(fs.readFileSync(samplePath, 'utf-8')) };
  }
  return { success: false };
});

ipcMain.handle('contest:save', async (event, contestConfig) => {
  try {
    const filename = `contest-${contestConfig.id || Date.now()}.json`;
    const localPath = path.join(contestsDir, filename);
    fs.writeFileSync(localPath, JSON.stringify(contestConfig, null, 2), 'utf-8');
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
ipcMain.handle('server:start', async (event, { port = 4500, contestConfig = null }) => {
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

// Grading Leaderboard Scanner
ipcMain.handle('grading:scan-folder', async (event, customFolder = null) => {
  try {
    const targetDir = customFolder || submissionsDir;
    if (!fs.existsSync(targetDir)) return { success: false, error: 'Directory does not exist.' };

    const files = fs.readdirSync(targetDir).filter(f => f.startsWith('FINAL_') && f.endsWith('.json'));
    const records = [];

    for (const file of files) {
      try {
        const fullPath = path.join(targetDir, file);
        const data = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
        records.push({
          usn: data.usn || file.replace('FINAL_', '').replace('.json', ''),
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
      } catch (_) {}
    }

    // Competitive Grading: 1. Highest Score, 2. Fastest CPU Time, 3. Lowest Elapsed Time
    records.sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      if (a.totalExecutionTimeMs !== b.totalExecutionTimeMs) return a.totalExecutionTimeMs - b.totalExecutionTimeMs;
      return a.timeElapsedSeconds - b.timeElapsedSeconds;
    });

    records.forEach((r, idx) => { r.rank = idx + 1; });

    return { success: true, directory: targetDir, totalCount: records.length, records };
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

// Remote LAN Sync Bridge (Attender -> Host)
ipcMain.handle('sync:fetch-remote-contest', async (event, { hostUrl, contestCode }) => {
  return new Promise((resolve) => {
    try {
      const url = new URL(`/api/contest/${encodeURIComponent(contestCode)}`, hostUrl);
      const req = http.get(url, { timeout: 4000 }, (res) => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve({ success: true, contest: JSON.parse(body) });
          } else {
            resolve({ success: false, error: body });
          }
        });
      });
      req.on('error', err => resolve({ success: false, error: err.message }));
      req.on('timeout', () => { req.destroy(); resolve({ success: false, error: 'Connection timed out' }); });
    } catch (err) {
      resolve({ success: false, error: err.message });
    }
  });
});

ipcMain.handle('sync:push-submission', async (event, { hostUrl, payload }) => {
  return new Promise((resolve) => {
    try {
      const url = new URL('/api/contest/sync-submission', hostUrl);
      const postData = JSON.stringify(payload);
      const req = http.request(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 4000
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
