const { app, BrowserWindow, ipcMain, dialog, globalShortcut, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const compilerEngine = require('./compiler-engine');
const contestServer = require('./server');

let mainWindow = null;
let isLockdownActive = false;
const submissionsDir = path.join(__dirname, 'submissions');
const sessionsDir = path.join(__dirname, 'sessions');
const contestsDir = path.join(__dirname, 'contests');

// Ensure storage directories exist
[submissionsDir, sessionsDir, contestsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0d1117',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  // Remove default application menu to prevent Alt-key access
  Menu.setApplicationMenu(null);

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Window Focus / Blur Cheating Detection
  mainWindow.on('blur', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window-blur-detected', {
        timestamp: new Date().toISOString(),
        isLockdownActive
      });
    }
  });

  mainWindow.on('focus', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window-focus-detected', {
        timestamp: new Date().toISOString()
      });
    }
  });

  // Intercept keyboard events in webContents to block DevTools and window switching
  mainWindow.webContents.on('before-input-event', (event, input) => {
    const key = (input.key || '').toLowerCase();
    const isControlOrMeta = input.control || input.meta;
    const isAlt = input.alt;
    const isShift = input.shift;

    // Strict interception of DevTools, reload, and navigation
    if (key === 'f12') {
      event.preventDefault();
      return;
    }
    if (isControlOrMeta && isShift && (key === 'i' || key === 'j' || key === 'c')) {
      event.preventDefault();
      return;
    }
    if (isControlOrMeta && (key === 'r' || key === 'f5')) {
      event.preventDefault();
      return;
    }
    if (key === 'f11') {
      event.preventDefault();
      return;
    }

    // When under lockdown, kill Alt shortcuts and window closing
    if (isLockdownActive) {
      if (isAlt && (key === 'tab' || key === 'f4' || key === 'escape')) {
        event.preventDefault();
        return;
      }
      if (isControlOrMeta && (key === 'w' || key === 'q')) {
        event.preventDefault();
        return;
      }
    }
  });

  mainWindow.on('close', (e) => {
    if (isLockdownActive) {
      e.preventDefault();
      mainWindow.webContents.send('lockdown-close-attempted');
    }
  });
}

// App Lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  try {
    contestServer.stop();
  } catch (_) {}
});

// IPC Handler: Environment & Diagnostics
ipcMain.handle('env:get-diagnostics', async () => {
  const gcc = await compilerEngine.checkGcc();
  const serverIps = contestServer.getLocalIps();
  return {
    os: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    electronVersion: process.versions.electron,
    gcc,
    serverIps
  };
});

// IPC Handler: Lockdown Mode Control (Fullscreen + Always on top + Shortcut capture)
ipcMain.handle('window:set-lockdown', (event, { enable = true, kiosk = false }) => {
  if (!mainWindow) return { success: false };

  isLockdownActive = enable;

  if (enable) {
    mainWindow.setFullScreen(true);
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    if (kiosk) {
      mainWindow.setKiosk(true);
    }

    // Register global shortcuts to swallow Alt+Tab / Win keys where OS permits
    try {
      globalShortcut.register('Alt+Tab', () => {});
      globalShortcut.register('Alt+F4', () => {});
      globalShortcut.register('CommandOrControl+Shift+I', () => {});
      globalShortcut.register('F12', () => {});
    } catch (_) {}
  } else {
    mainWindow.setKiosk(false);
    mainWindow.setAlwaysOnTop(false);
    mainWindow.setFullScreen(false);
    globalShortcut.unregisterAll();
  }

  return { success: true, isLockdownActive };
});

// IPC Handler: Compiler Execution & Test Stream
ipcMain.handle('compiler:compile-and-evaluate', async (event, payload) => {
  return await compilerEngine.compileAndEvaluate(payload, (progress) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('compiler:progress-stream', progress);
    }
  });
});

// IPC Handler: Session Snapshots (for crash and power-loss recovery)
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
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return { success: true, found: true, data };
    }
    return { success: true, found: false };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC Handler: Save Final Submission Package
ipcMain.handle('submission:save-final', async (event, submissionData) => {
  try {
    const safeUsn = (submissionData.usn || 'anonymous').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `FINAL_${safeUsn}.json`;
    const filePath = path.join(submissionsDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(submissionData, null, 2), 'utf-8');
    return { success: true, filename, filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC Handler: Get Bundled Sample Contest
ipcMain.handle('contest:get-sample-contest', async () => {
  try {
    const samplePath = path.join(__dirname, 'sample-contest.json');
    if (fs.existsSync(samplePath)) {
      const data = JSON.parse(fs.readFileSync(samplePath, 'utf-8'));
      return { success: true, contest: data };
    }
    return { success: false, error: 'sample-contest.json not found' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC Handler: Save & Export Contest Config
ipcMain.handle('contest:save-config', async (event, contestConfig) => {
  try {
    const filename = `contest-config-${contestConfig.id || Date.now()}.json`;
    const localPath = path.join(contestsDir, filename);
    fs.writeFileSync(localPath, JSON.stringify(contestConfig, null, 2), 'utf-8');

    // Also update server's active contest
    contestServer.setActiveContest(contestConfig);

    return { success: true, filename, filePath: localPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('contest:export-dialog', async (event, contestConfig) => {
  try {
    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Contest Package (contest-config.json)',
      defaultPath: `contest-config-${contestConfig.id || 'export'}.json`,
      filters: [{ name: 'JSON Contest Configuration', extensions: ['json'] }]
    });

    if (canceled || !filePath) return { canceled: true };

    fs.writeFileSync(filePath, JSON.stringify(contestConfig, null, 2), 'utf-8');
    contestServer.setActiveContest(contestConfig);
    return { success: true, filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('contest:import-dialog', async () => {
  try {
    const { filePaths, canceled } = await dialog.showOpenDialog(mainWindow, {
      title: 'Import Contest Configuration Package',
      filters: [{ name: 'JSON Contest Files', extensions: ['json'] }],
      properties: ['openFile']
    });

    if (canceled || !filePaths || filePaths.length === 0) return { canceled: true };

    const raw = fs.readFileSync(filePaths[0], 'utf-8');
    const config = JSON.parse(raw);
    return { success: true, config, filePath: filePaths[0] };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC Handler: Host Server Management
ipcMain.handle('server:start', async (event, { port = 4500, contestConfig = null }) => {
  try {
    const res = await contestServer.start(port, contestConfig);
    return { success: true, ...res };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('server:stop', async () => {
  return await contestServer.stop();
});

ipcMain.handle('server:get-status', () => {
  return {
    isRunning: contestServer.isRunning,
    port: contestServer.port,
    activeContestId: contestServer.activeContest ? contestServer.activeContest.id : null,
    ips: contestServer.getLocalIps()
  };
});

// IPC Handler: Grading Reporter - Scan submissions folder and rank candidates
ipcMain.handle('grading:scan-folder', async (event, customFolder = null) => {
  try {
    const targetDir = customFolder || submissionsDir;
    if (!fs.existsSync(targetDir)) {
      return { success: false, error: 'Directory does not exist.' };
    }

    const files = fs.readdirSync(targetDir);
    const finalFiles = files.filter(f => f.startsWith('FINAL_') && f.endsWith('.json'));

    const records = [];

    for (const file of finalFiles) {
      try {
        const fullPath = path.join(targetDir, file);
        const content = fs.readFileSync(fullPath, 'utf-8');
        const data = JSON.parse(content);

        records.push({
          usn: data.usn || file.replace('FINAL_', '').replace('.json', ''),
          name: data.name || 'Anonymous',
          totalScore: typeof data.totalScore === 'number' ? data.totalScore : 0,
          maxScore: data.maxScore || 100,
          problemsSolvedCount: data.problemsSolvedCount || (data.problemEvaluations ? Object.values(data.problemEvaluations).filter(p => p.passedCount === p.totalCount && p.totalCount > 0).length : 0),
          totalProblems: data.totalProblems || (data.problemEvaluations ? Object.keys(data.problemEvaluations).length : 0),
          timeElapsedSeconds: data.timeElapsedSeconds || 0,
          totalExecutionTimeMs: data.totalExecutionTimeMs || 0,
          violationsCount: data.violations ? data.violations.length : (data.violationStrikes || 0),
          submittedAt: data.submittedAt || data.timestamp || 'N/A',
          filename: file,
          fullPayload: data
        });
      } catch (parseErr) {
        console.error(`Failed to parse ${file}:`, parseErr.message);
      }
    }

    // Competitive Programming Grading Rules:
    // 1. Highest Score first (totalScore DESC)
    // 2. Ties broken by Fastest Execution Time (totalExecutionTimeMs ASC)
    // 3. Further ties broken by Time Elapsed in contest (timeElapsedSeconds ASC)
    records.sort((a, b) => {
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore;
      }
      if (a.totalExecutionTimeMs !== b.totalExecutionTimeMs) {
        return a.totalExecutionTimeMs - b.totalExecutionTimeMs;
      }
      return a.timeElapsedSeconds - b.timeElapsedSeconds;
    });

    // Assign Ranks with equal-rank tie notation if exact match
    let currentRank = 1;
    for (let i = 0; i < records.length; i++) {
      if (i > 0) {
        const prev = records[i - 1];
        const curr = records[i];
        if (curr.totalScore === prev.totalScore && curr.totalExecutionTimeMs === prev.totalExecutionTimeMs && curr.timeElapsedSeconds === prev.timeElapsedSeconds) {
          records[i].rank = prev.rank;
        } else {
          records[i].rank = i + 1;
        }
      } else {
        records[i].rank = 1;
      }
    }

    return {
      success: true,
      directory: targetDir,
      totalCount: records.length,
      records
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC Handler: Export CSV Leaderboard Spreadsheet
ipcMain.handle('grading:export-csv', async (event, { records, contestTitle = 'Contest' }) => {
  try {
    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Leaderboard Spreadsheet',
      defaultPath: `Leaderboard_${contestTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.csv`,
      filters: [{ name: 'CSV Spreadsheets', extensions: ['csv'] }]
    });

    if (canceled || !filePath) return { canceled: true };

    const headers = ['Rank', 'USN', 'Candidate Name', 'Score', 'Max Score', 'Problems Solved', 'Total Problems', 'Elapsed Time (s)', 'Elapsed Time (Formatted)', 'Execution Time (ms)', 'Cheating Violations', 'Submitted At', 'Log File'];
    const rows = records.map(r => {
      const mins = Math.floor((r.timeElapsedSeconds || 0) / 60);
      const secs = (r.timeElapsedSeconds || 0) % 60;
      const formattedTime = `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;

      return [
        r.rank,
        `"${r.usn}"`,
        `"${r.name}"`,
        r.totalScore,
        r.maxScore,
        r.problemsSolvedCount,
        r.totalProblems,
        r.timeElapsedSeconds,
        `"${formattedTime}"`,
        r.totalExecutionTimeMs,
        r.violationsCount,
        `"${r.submittedAt}"`,
        `"${r.filename}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    fs.writeFileSync(filePath, csvContent, 'utf-8');

    return { success: true, filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC Handler: Choose custom grading folder
ipcMain.handle('grading:pick-folder', async () => {
  const { filePaths, canceled } = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Folder Containing Student Submissions (FINAL_*.json)',
    properties: ['openDirectory']
  });

  if (canceled || !filePaths || filePaths.length === 0) return { canceled: true };
  return { success: true, folderPath: filePaths[0] };
});

// IPC Handler: HTTP POST Sync Client Bridge
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
        timeout: 5000
      }, (res) => {
        let respData = '';
        res.on('data', chunk => { respData += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve({ success: true, response: JSON.parse(respData) });
            } catch (_) {
              resolve({ success: true, response: respData });
            }
          } else {
            resolve({ success: false, status: res.statusCode, error: respData });
          }
        });
      });

      req.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ success: false, error: 'Connection timed out while contacting host server.' });
      });

      req.write(postData);
      req.end();
    } catch (err) {
      resolve({ success: false, error: err.message });
    }
  });
});

// IPC Handler: Fetch Contest from Host Server over LAN
ipcMain.handle('sync:fetch-remote-contest', async (event, { hostUrl, contestCode }) => {
  return new Promise((resolve) => {
    try {
      const url = new URL(`/api/contest/${encodeURIComponent(contestCode)}`, hostUrl);
      const req = http.get(url, { timeout: 5000 }, (res) => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const contest = JSON.parse(body);
              resolve({ success: true, contest });
            } catch (err) {
              resolve({ success: false, error: 'Invalid JSON from host server: ' + err.message });
            }
          } else {
            resolve({ success: false, status: res.statusCode, error: body });
          }
        });
      });

      req.on('error', (err) => {
        resolve({ success: false, error: 'Cannot connect to Host server at ' + hostUrl + ': ' + err.message });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ success: false, error: 'Connection timed out contacting Host server.' });
      });
    } catch (err) {
      resolve({ success: false, error: err.message });
    }
  });
});

// IPC Handler: Scan local pending unsynced submissions
ipcMain.handle('sync:get-pending-submissions', async () => {
  try {
    const files = fs.readdirSync(submissionsDir);
    const finalFiles = files.filter(f => f.startsWith('FINAL_') && f.endsWith('.json'));
    const items = [];
    for (const f of finalFiles) {
      const filePath = path.join(submissionsDir, f);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      items.push({
        filename: f,
        usn: data.usn,
        totalScore: data.totalScore,
        filePath
      });
    }
    return { success: true, submissions: items };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
