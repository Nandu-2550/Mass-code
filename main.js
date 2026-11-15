require('./pdf-polyfill');
const { app, BrowserWindow, ipcMain, dialog, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const dgram = require('dgram');
const { spawn, exec, execSync } = require('child_process');
const cEngine = require('./c-engine');

let mainWindow = null;
let currentSecurityMode = 'entry'; // 'entry' | 'kiosk'
const SUPERVISOR_EMERGENCY_KEY = 'GECM@8123';

const DEFAULT_HTTP_PORT = 8080;
const UDP_BROADCAST_PORT = 45454;

// Runtime Directories
let sessionsDir = path.join(__dirname, 'sessions');
let submissionsDir = path.join(__dirname, 'submissions');
let syncedSubmissionsDir = path.join(__dirname, 'synced_submissions');
let archivesDir = path.join(__dirname, 'archives');
let tempDir = path.join(__dirname, 'temp');
let contestsDir = path.join(__dirname, 'contests');

function initRuntimeDirectories() {
  if (app && app.isPackaged) {
    const baseDir = app.getPath('userData');
    sessionsDir = path.join(baseDir, 'sessions');
    submissionsDir = path.join(app.getPath('desktop'), 'Mass-Code-Submissions');
    syncedSubmissionsDir = path.join(app.getPath('desktop'), 'Mass-Code-Synced-Submissions');
    archivesDir = path.join(app.getPath('desktop'), 'Mass-Code-Archives');
    tempDir = path.join(baseDir, 'sandbox');
  }
  [sessionsDir, submissionsDir, syncedSubmissionsDir, archivesDir, tempDir, contestsDir].forEach((dir) => {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch (_) { }
  });
}

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
            } catch (_) { }
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
      this.broadcastSocket.on('error', () => { });

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
              try {
                this.broadcastSocket.send(message, 0, message.length, UDP_BROADCAST_PORT, addr, () => { });
              } catch (_) { }
            });
          };

          broadcastPacket();
          this.broadcastTimer = setInterval(broadcastPacket, 2000);
        } catch (_) { }
      });
    } catch (_) { }
  }

  stopBroadcasting() {
    this.isBroadcasting = false;
    if (this.broadcastTimer) {
      clearInterval(this.broadcastTimer);
      this.broadcastTimer = null;
    }
    if (this.broadcastSocket) {
      try { this.broadcastSocket.close(); } catch (_) { }
      this.broadcastSocket = null;
    }
    this.activeContestData = null;
  }

  startListening(onDiscovered) {
    if (this.isListening) return;

    try {
      this.listenerSocket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
      this.listenerSocket.on('error', () => { });

      this.listenerSocket.on('message', (msg, rinfo) => {
        try {
          const packet = JSON.parse(msg.toString('utf-8'));
          if (packet && packet.type === 'MASSCODE_HOST_ANNOUNCE') {
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
        } catch (_) { }
      });

      this.listenerSocket.bind(UDP_BROADCAST_PORT, '0.0.0.0', () => {
        this.isListening = true;
      });
    } catch (_) { }
  }

  stopListening() {
    this.isListening = false;
    if (this.listenerSocket) {
      try { this.listenerSocket.close(); } catch (_) { }
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
      return Promise.resolve({ success: true, port: this.port, ips: this.getLocalIps(), primaryIp: this.getLocalIps()[0] || '127.0.0.1' });
    }

    this.port = port || DEFAULT_HTTP_PORT;
    if (contestConfig) {
      this.activeContest = contestConfig;
    } else if (!this.activeContest) {
      const activePath = path.join(contestsDir, 'active-contest.json');
      const r1Path = path.join(__dirname, 'round 1.json');
      if (fs.existsSync(activePath)) {
        try { this.activeContest = JSON.parse(fs.readFileSync(activePath, 'utf-8')); } catch (_) { }
      } else if (fs.existsSync(r1Path)) {
        try { this.activeContest = safeParseContestJson(fs.readFileSync(r1Path, 'utf-8')); } catch (_) { }
      }
    }

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

        let parsedUrl;
        try {
          parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        } catch (_) {
          res.writeHead(400);
          res.end('Invalid URL');
          return;
        }
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
            contestToken: this.activeContest ? this.activeContest.token : null,
            contestMode: (this.activeContest && this.activeContest.type) ? this.activeContest.type : 'contest'
          }));
          return;
        }

        // Exam Assignment Retrieval: GET /api/exam-assignment?usn=...
        if (req.method === 'GET' && (pathname === '/api/exam-assignment' || pathname === '/exam-assignment')) {
          if (!this.activeContest) {
            const activePath = path.join(contestsDir, 'active-contest.json');
            if (fs.existsSync(activePath)) {
              try { this.activeContest = JSON.parse(fs.readFileSync(activePath, 'utf-8')); } catch (_) { }
            }
          }

          if (!this.activeContest) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'No active contest/exam running on Host server.' }));
            return;
          }

          const rawUsn = parsedUrl.searchParams.get('usn') || '';
          const usn = rawUsn.trim().toUpperCase();
          if (!usn) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'USN parameter is required.' }));
            return;
          }

          const batches = this.activeContest.batches || [];
          const activeBatchId = this.activeContest.activeBatchId;
          const activeBatch = batches.find(b => b.id === activeBatchId) || batches[0];

          if (!activeBatch) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'No active batch configured on Host.' }));
            return;
          }

          const student = (activeBatch.students || []).find(s => s.usn && s.usn.trim().toUpperCase() === usn);
          if (!student) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              error: `USN "${usn}" is not enrolled in the active batch ("${activeBatch.name}"). Please contact the lab examiner.`
            }));
            return;
          }

          if (!student.assignedProblemId) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              error: `No lab experiment allocated for ${usn} (${student.name || 'Student'}) yet. Please wait for the examiner to assign an experiment.`
            }));
            return;
          }

          // 4-Digit Exam Access OTP Validation
          const rawOtp = parsedUrl.searchParams.get('otp') || '';
          const reqOtp = rawOtp.trim();

          // Ensure student record has an OTP if allocated
          if (!student.otp) {
            student.otp = Math.floor(1000 + Math.random() * 9000).toString();
          }

          const expectedOtp = String(student.otp).trim();
          if (!reqOtp || reqOtp !== expectedOtp) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              error: `Invalid 4-digit Exam Access OTP. Please check the OTP assigned next to your USN on the Host screen.`
            }));
            return;
          }

          const problem = (this.activeContest.problems || []).find(p => p.id === student.assignedProblemId);
          if (!problem) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              error: `Assigned experiment was not found in the question bank.`
            }));
            return;
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            examTitle: this.activeContest.title || 'Lab Examination',
            batchName: activeBatch.name,
            duration: this.activeContest.duration || 90,
            token: this.activeContest.token || 'MASS2026',
            student,
            problem
          }));
          return;
        }

        // Contest Retrieval: GET /api/contest/:code or GET /contest/:code or GET /api/contest or GET /contest
        if (req.method === 'GET' && (pathname.startsWith('/api/contest') || pathname.startsWith('/contest'))) {
          // Fallback auto-load if activeContest was unset
          if (!this.activeContest) {
            const activePath = path.join(contestsDir, 'active-contest.json');
            const r1Path = path.join(__dirname, 'round 1.json');
            if (fs.existsSync(activePath)) {
              try { this.activeContest = JSON.parse(fs.readFileSync(activePath, 'utf-8')); } catch (_) { }
            } else if (fs.existsSync(r1Path)) {
              try { this.activeContest = safeParseContestJson(fs.readFileSync(r1Path, 'utf-8')); } catch (_) { }
            }
          }

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
        const ips = this.getLocalIps();
        const primaryIp = ips[0] || '127.0.0.1';

        // Attempt automatic Windows Firewall rule registration
        if (process.platform === 'win32') {
          try {
            exec('netsh advfirewall firewall add rule name="MassCode Host Server (8080)" dir=in action=allow protocol=TCP localport=8080', () => { });
            exec('netsh advfirewall firewall add rule name="MassCode UDP Discovery (45454)" dir=in action=allow protocol=UDP localport=45454', () => { });
          } catch (_) { }
        }

        if (this.activeContest) {
          lanDiscovery.startBroadcasting({
            host: primaryIp,
            port: this.port,
            contestId: this.activeContest.id || this.activeContest.token,
            contestToken: this.activeContest.token || 'MASS2026',
            contestTitle: this.activeContest.title || 'Mass-Code Contest',
            durationMinutes: this.activeContest.durationMinutes || 60,
            problemCount: (this.activeContest.problems || []).length
          });
        }
        resolve({ success: true, port: this.port, ips, primaryIp });
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
        this.isRunning = false;
        resolve({ success: true, message: 'Server was not running.' });
      }
    });
  }
}

const hostServer = new HostServer();

// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// Compiler & Runtime Resolution Engine (Multi-Version Fallback for GCC + Python)
// ----------------------------------------------------------------------------
let cachedGccPath = null;

function findGccExecutable() {
  if (cachedGccPath) return cachedGccPath;

  const candidates = [
    'gcc',
    'C:\\MinGW\\bin\\gcc.exe',
    'C:\\mingw64\\bin\\gcc.exe',
    'C:\\Program Files\\CodeBlocks\\MinGW\\bin\\gcc.exe',
    'C:\\Program Files (x86)\\CodeBlocks\\MinGW\\bin\\gcc.exe',
    'C:\\Program Files (x86)\\Dev-Cpp\\MinGW64\\bin\\gcc.exe',
    'C:\\Dev-Cpp\\MinGW64\\bin\\gcc.exe',
    'C:\\TDM-GCC-64\\bin\\gcc.exe',
    'C:\\TDM-GCC-32\\bin\\gcc.exe',
    'C:\\msys64\\mingw64\\bin\\gcc.exe',
    'C:\\msys64\\ucrt64\\bin\\gcc.exe',
    'C:\\Strawberry\\c\\bin\\gcc.exe',
    'C:\\MinGW-w64\\bin\\gcc.exe'
  ];

  const userProfile = process.env.USERPROFILE || '';
  if (userProfile) {
    candidates.push(
      path.join(userProfile, 'scoop', 'apps', 'gcc', 'current', 'bin', 'gcc.exe'),
      path.join(userProfile, 'AppData', 'Local', 'Programs', 'CodeBlocks', 'MinGW', 'bin', 'gcc.exe')
    );
  }

  for (const c of candidates) {
    try {
      if (c !== 'gcc' && !fs.existsSync(c)) continue;
      const cmd = c.includes(' ') ? `"${c}"` : c;
      const out = execSync(`${cmd} --version`, { stdio: 'pipe', timeout: 1500 });
      if (out && out.toString().toLowerCase().includes('gcc')) {
        cachedGccPath = c;
        return c;
      }
    } catch (_) { }
  }

  cachedGccPath = 'gcc';
  return 'gcc';
}

let cachedPythonInfo = null;

function findPythonExecutable() {
  if (cachedPythonInfo) return cachedPythonInfo;

  const directCommands = ['py', 'python3', 'python'];
  const versions = ['314', '313', '312', '311', '310', '39', '38', '37'];
  const explicitPaths = [];

  for (const v of versions) {
    explicitPaths.push(
      `C:\\Python${v}\\python.exe`,
      `C:\\Program Files\\Python${v}\\python.exe`,
      `C:\\Program Files (x86)\\Python${v}\\python.exe`
    );
  }

  const userProfile = process.env.USERPROFILE || '';
  if (userProfile) {
    for (const v of versions) {
      explicitPaths.push(
        path.join(userProfile, 'AppData', 'Local', 'Programs', 'Python', `Python${v}`, 'python.exe')
      );
    }
    explicitPaths.push(
      path.join(userProfile, 'anaconda3', 'python.exe'),
      path.join(userProfile, 'miniconda3', 'python.exe'),
      path.join(userProfile, 'scoop', 'apps', 'python', 'current', 'python.exe')
    );
  }

  explicitPaths.push(
    'C:\\ProgramData\\anaconda3\\python.exe',
    'C:\\ProgramData\\miniconda3\\python.exe'
  );

  const testScript = 'import sys; print(f"PY_{sys.version_info[0]}_{sys.version_info[1]}")';

  // 1. First test `py -3` (Standard Windows Python Launcher)
  try {
    const out = execSync(`py -3 -c "${testScript}"`, { stdio: 'pipe', timeout: 1500 });
    if (out && out.toString().includes('PY_3')) {
      cachedPythonInfo = { cmd: 'py', argsPrefix: ['-3'] };
      return cachedPythonInfo;
    }
  } catch (_) { }

  // 2. Test direct commands in PATH (validates that it is not a Microsoft Store stub)
  for (const cmd of directCommands) {
    try {
      const out = execSync(`${cmd} -c "${testScript}"`, { stdio: 'pipe', timeout: 1500 });
      if (out && out.toString().includes('PY_')) {
        cachedPythonInfo = { cmd, argsPrefix: [] };
        return cachedPythonInfo;
      }
    } catch (_) { }
  }

  // 3. Test explicit installed disk locations
  for (const p of explicitPaths) {
    try {
      if (!fs.existsSync(p)) continue;
      const quoted = `"${p}"`;
      const out = execSync(`${quoted} -c "${testScript}"`, { stdio: 'pipe', timeout: 1500 });
      if (out && out.toString().includes('PY_')) {
        cachedPythonInfo = { cmd: p, argsPrefix: [] };
        return cachedPythonInfo;
      }
    } catch (_) { }
  }

  cachedPythonInfo = { cmd: 'python', argsPrefix: [] };
  return cachedPythonInfo;
}

let cachedJavacPath = null;
let cachedJavaPath = null;

function findJavacExecutable() {
  if (cachedJavacPath) return cachedJavacPath;

  const candidates = ['javac'];

  if (process.env.JAVA_HOME) {
    candidates.push(path.join(process.env.JAVA_HOME, 'bin', 'javac.exe'));
    candidates.push(path.join(process.env.JAVA_HOME, 'bin', 'javac'));
  }
  if (process.env.JDK_HOME) {
    candidates.push(path.join(process.env.JDK_HOME, 'bin', 'javac.exe'));
  }

  const standardDirs = [
    'C:\\Program Files\\Java',
    'C:\\Program Files (x86)\\Java',
    'C:\\Program Files\\Eclipse Adoptium',
    'C:\\Program Files\\Amazon Corretto',
    'C:\\Program Files\\Microsoft',
    'C:\\Program Files\\BellSoft',
    'C:\\Program Files\\Zulu',
    'C:\\Java'
  ];

  for (const sDir of standardDirs) {
    if (fs.existsSync(sDir)) {
      try {
        const subdirs = fs.readdirSync(sDir);
        for (const sub of subdirs) {
          const jc = path.join(sDir, sub, 'bin', 'javac.exe');
          if (fs.existsSync(jc)) {
            candidates.push(jc);
          }
        }
      } catch (_) {}
    }
  }

  const userProfile = process.env.USERPROFILE || '';
  if (userProfile) {
    candidates.push(
      path.join(userProfile, 'scoop', 'apps', 'openjdk', 'current', 'bin', 'javac.exe')
    );
  }

  for (const c of candidates) {
    try {
      if (c !== 'javac' && !fs.existsSync(c)) continue;
      const cmd = c.includes(' ') ? `"${c}"` : c;
      const out = execSync(`${cmd} -version`, { stdio: 'pipe', timeout: 1500 });
      if (out !== undefined) {
        cachedJavacPath = c;
        return c;
      }
    } catch (_) {}
  }

  cachedJavacPath = 'javac';
  return 'javac';
}

function findJavaExecutable() {
  if (cachedJavaPath) return cachedJavaPath;

  const javac = findJavacExecutable();
  if (javac && path.isAbsolute(javac)) {
    const javaCandidate = path.join(path.dirname(javac), 'java.exe');
    if (fs.existsSync(javaCandidate)) {
      cachedJavaPath = javaCandidate;
      return javaCandidate;
    }
  }

  if (process.env.JAVA_HOME) {
    const j = path.join(process.env.JAVA_HOME, 'bin', 'java.exe');
    if (fs.existsSync(j)) {
      cachedJavaPath = j;
      return j;
    }
  }

  cachedJavaPath = 'java';
  return 'java';
}

async function checkDiagnostics() {
  const gccCmd = findGccExecutable();
  const gcc = await new Promise((resolve) => {
    exec(`"${gccCmd}" --version`, (err, stdout, stderr) => {
      const out = stdout || stderr || '';
      resolve({ available: !err, version: out ? out.split('\n')[0].trim() : null, command: gccCmd });
    });
  });

  const py = findPythonExecutable();
  const python = await new Promise((resolve) => {
    const execTarget = py.argsPrefix.length ? `"${py.cmd}" ${py.argsPrefix.join(' ')}` : `"${py.cmd}"`;
    exec(`${execTarget} --version`, (err, stdout, stderr) => {
      const out = stdout || stderr || '';
      resolve({ available: !err, version: out ? out.split('\n')[0].trim() : null, command: py.cmd });
    });
  });

  const javacCmd = findJavacExecutable();
  const java = await new Promise((resolve) => {
    exec(`"${javacCmd}" -version`, (err, stdout, stderr) => {
      const out = stderr || stdout || '';
      resolve({ available: !err, version: out ? out.split('\n')[0].trim() : null, command: javacCmd });
    });
  });

  return { gcc, python, java, os: process.platform, arch: process.arch };
}

function normalizeTokens(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').map(l => l.trimEnd()).join('\n').trim();
}

async function compileAndEvaluate({ code, language = 'c', testCases = [], timeoutMs = 2000, maxPoints = 100 }, onProgress) {
  const sessionId = `eval_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const sessionDir = path.join(tempDir, 'sessions', sessionId);
  try {
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }
  } catch (_) { }

  // ---------------------------------------------------------
  // PYTHON 3 EXECUTION PATH
  // ---------------------------------------------------------
  if (language === 'python' || language === 'py') {
    const py = findPythonExecutable();
    const scriptPath = path.join(sessionDir, 'solution.py');
    fs.writeFileSync(scriptPath, code || '', 'utf-8');

    // Syntax validation via py_compile with multi-version fallback
    if (onProgress) onProgress({ phase: 'compiling', message: `Validating Python syntax (${path.basename(py.cmd)})...` });
    const syntaxRes = await new Promise((resolve) => {
      let stderr = '';
      const proc = spawn(py.cmd, [...py.argsPrefix, '-m', 'py_compile', scriptPath], { cwd: sessionDir, windowsHide: true, shell: true });
      proc.stderr.on('data', d => { stderr += d.toString(); });
      proc.on('close', codeVal => resolve({ success: codeVal === 0, stderr }));
      proc.on('error', err => resolve({ success: false, stderr: err.message }));
    });

    if (!syntaxRes.success) {
      try { if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { recursive: true, force: true }); } catch (_) { }
      return {
        success: false,
        phase: 'compilation',
        compilerError: syntaxRes.stderr || 'Python syntax error.',
        testResults: [],
        totalScore: 0,
        maxScore: maxPoints,
        passedCount: 0,
        totalCount: testCases.length
      };
    }

    // Step 2: Test Case Evaluation Stream
    const testResults = [];
    let passedCount = 0;
    let totalCpuMs = 0;

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      if (onProgress) onProgress({ phase: 'running_test', index: i + 1, total: testCases.length });

      const evalRes = await new Promise((resolve) => {
        const startTime = process.hrtime();
        let stdout = '';
        let stderr = '';
        let timedOut = false;

        let proc = null;
        try {
          proc = spawn(py.cmd, [...py.argsPrefix, '-u', scriptPath], { cwd: sessionDir, windowsHide: true, shell: true });
        } catch (e) {
          return resolve({ exitCode: -1, stdout: '', stderr: e.message, timedOut: false, durationMs: 0 });
        }

        const timer = setTimeout(() => {
          timedOut = true;
          try {
            if (process.platform === 'win32' && proc && proc.pid) {
              exec(`taskkill /pid ${proc.pid} /T /F`, () => {});
            } else if (proc) {
              proc.kill('SIGKILL');
            }
          } catch (_) { }
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
        } catch (_) { }
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
        actualOutput: tc.isSample ? evalRes.stdout : (isPassed ? '[CORRECT]' : (evalRes.stderr ? `[ERROR: ${evalRes.stderr.trim()}]` : '[INCORRECT MATCH]'))
      });
    }

    try { if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { recursive: true, force: true }); } catch (_) { }

    const earnedScore = testCases.length > 0 ? Math.round((passedCount / testCases.length) * maxPoints * 10) / 10 : 0;
    return {
      success: true,
      phase: 'evaluated',
      compilerOutput: 'Python execution completed successfully.',
      testResults,
      totalScore: earnedScore,
      maxScore: maxPoints,
      passedCount,
      totalCount: testCases.length,
      totalExecutionTimeMs: Math.round(totalCpuMs * 10) / 10
    };
  }

  // ---------------------------------------------------------
  // JAVA (JDK) EXECUTION PATH
  // ---------------------------------------------------------
  if (language === 'java') {
    const javacCmd = findJavacExecutable();
    const javaCmd = findJavaExecutable();

    // Detect public class name from Java code or fallback to Solution
    let className = 'Solution';
    const classMatch = (code || '').match(/public\s+class\s+([A-Za-z0-9_$]+)/);
    if (classMatch && classMatch[1]) {
      className = classMatch[1];
    }

    const sourcePath = path.join(sessionDir, `${className}.java`);
    fs.writeFileSync(sourcePath, code || '', 'utf-8');

    // Step 1: Compile with javac
    if (onProgress) onProgress({ phase: 'compiling', message: `Compiling ${className}.java (${path.basename(javacCmd)})...` });
    const compileRes = await new Promise((resolve) => {
      let stderr = '';
      let stdout = '';
      const proc = spawn(javacCmd, [sourcePath], { cwd: sessionDir, windowsHide: true, shell: true });
      proc.stdout.on('data', d => { stdout += d.toString(); });
      proc.stderr.on('data', d => { stderr += d.toString(); });
      proc.on('close', codeVal => resolve({ success: codeVal === 0, stderr: stderr || stdout }));
      proc.on('error', err => resolve({ success: false, stderr: err.message }));
    });

    if (!compileRes.success) {
      try { if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { recursive: true, force: true }); } catch (_) { }
      return {
        success: false,
        phase: 'compilation',
        compilerError: compileRes.stderr || 'Java compilation failed. Ensure JDK is installed on this machine.',
        testResults: [],
        totalScore: 0,
        maxScore: maxPoints,
        passedCount: 0,
        totalCount: testCases.length
      };
    }

    // Step 2: Run test cases with java -cp . <className>
    const testResults = [];
    let passedCount = 0;
    let totalCpuMs = 0;

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      if (onProgress) onProgress({ phase: 'running_test', index: i + 1, total: testCases.length });

      const evalRes = await new Promise((resolve) => {
        const startTime = process.hrtime();
        let stdout = '';
        let stderr = '';
        let timedOut = false;

        let proc = null;
        try {
          proc = spawn(javaCmd, ['-cp', '.', className], { cwd: sessionDir, windowsHide: true, shell: true });
        } catch (e) {
          return resolve({ exitCode: -1, stdout: '', stderr: e.message, timedOut: false, durationMs: 0 });
        }

        const timer = setTimeout(() => {
          timedOut = true;
          try {
            if (process.platform === 'win32' && proc && proc.pid) {
              exec(`taskkill /pid ${proc.pid} /T /F`, () => {});
            } else if (proc) {
              proc.kill('SIGKILL');
            }
          } catch (_) { }
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
        } catch (_) { }
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
        actualOutput: tc.isSample ? evalRes.stdout : (isPassed ? '[CORRECT]' : (evalRes.stderr ? `[ERROR: ${evalRes.stderr.trim()}]` : '[INCORRECT MATCH]'))
      });
    }

    try { if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { recursive: true, force: true }); } catch (_) { }

    const earnedScore = testCases.length > 0 ? Math.round((passedCount / testCases.length) * maxPoints * 10) / 10 : 0;
    return {
      success: true,
      phase: 'evaluated',
      compilerOutput: 'Java execution completed successfully.',
      testResults,
      totalScore: earnedScore,
      maxScore: maxPoints,
      passedCount,
      totalCount: testCases.length,
      totalExecutionTimeMs: Math.round(totalCpuMs * 10) / 10
    };
  }

  // ---------------------------------------------------------
  // C (GCC) EXECUTION PATH
  // ---------------------------------------------------------
  const gccCmd = findGccExecutable();
  const sourcePath = path.join(sessionDir, 'solution.c');
  const binaryPath = path.join(sessionDir, 'runner.exe');
  fs.writeFileSync(sourcePath, code || '', 'utf-8');

  if (onProgress) onProgress({ phase: 'compiling', message: `Invoking native compiler: ${path.basename(gccCmd)}` });

  // Progressive flag fallback: modern gnu11 with static linking -> c99 -> standard -O2 -> bare gcc
  const flagVariations = [
    ['-O2', '-static', '-static-libgcc', '-std=gnu11'],
    ['-O2', '-static', '-static-libgcc', '-std=c99'],
    ['-O2', '-static', '-std=c99'],
    ['-O2', '-std=gnu11'],
    ['-O2', '-std=c99'],
    ['-O2'],
    []
  ];

  const gccDir = path.dirname(gccCmd);
  const runtimeEnv = {
    ...process.env,
    PATH: gccDir && gccDir !== '.' ? `${gccDir};${process.env.PATH || ''}` : (process.env.PATH || '')
  };

  let compileRes = { success: false, stdout: '', stderr: 'Compilation failed' };

  for (const flags of flagVariations) {
    compileRes = await new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      const proc = spawn(gccCmd, [sourcePath, '-o', binaryPath, ...flags], { cwd: sessionDir, env: runtimeEnv, windowsHide: true, shell: true });
      proc.stdout.on('data', d => { stdout += d.toString(); });
      proc.stderr.on('data', d => { stderr += d.toString(); });
      proc.on('close', codeVal => resolve({ success: codeVal === 0, stdout, stderr }));
      proc.on('error', err => resolve({ success: false, stdout: '', stderr: err.message }));
    });

    if (compileRes.success) break;

    // If failure was an actual code syntax error (not an invalid compiler flag option), don't retry other flags
    const errText = (compileRes.stderr || '').toLowerCase();
    const isCodeSyntaxError = (errText.includes('error:') || errText.includes('fatal error:')) &&
      !errText.includes('unrecognized') &&
      !errText.includes('unsupported') &&
      !errText.includes('invalid option');
    if (isCodeSyntaxError) {
      break;
    }
  }

  let useInProcessEngine = false;

  if (!compileRes.success) {
    const errText = (compileRes.stderr || '').toLowerCase();
    const isCodeSyntaxError = (errText.includes('error:') || errText.includes('fatal error:')) &&
      !errText.includes('unrecognized') &&
      !errText.includes('unsupported') &&
      !errText.includes('cannot execute') &&
      !errText.includes('relocation') &&
      !errText.includes('permission denied') &&
      !errText.includes('invalid option');

    if (isCodeSyntaxError) {
      try { if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { recursive: true, force: true }); } catch (_) { }
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
    } else {
      // Native GCC was blocked by OS security or relocation. Fallback to in-process C runtime
      useInProcessEngine = true;
    }
  }

  await new Promise(r => setTimeout(r, 100));

  const testResults = [];
  let passedCount = 0;
  let totalCpuMs = 0;

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    if (onProgress) onProgress({ phase: 'running_test', index: i + 1, total: testCases.length });

    let evalRes = null;

    if (!useInProcessEngine) {
      evalRes = await new Promise((resolve) => {
        let attempts = 0;
        const tryRun = () => {
          attempts++;
          const startTime = process.hrtime();
          let stdout = '';
          let stderr = '';
          let timedOut = false;
          let proc = null;

          try {
            proc = spawn(binaryPath, [], { cwd: sessionDir, env: runtimeEnv, windowsHide: true, shell: true });
          } catch (e) {
            return resolve({ exitCode: -1, stdout: '', stderr: e.message, timedOut: false, durationMs: 0 });
          }

          const timer = setTimeout(() => {
            timedOut = true;
            try {
              if (process.platform === 'win32' && proc && proc.pid) {
                exec(`taskkill /pid ${proc.pid} /T /F`, () => {});
              } else if (proc) {
                proc.kill('SIGKILL');
              }
            } catch (_) { }
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
          } catch (_) { }
        };

        tryRun();
      });

      // Check if native binary execution was blocked by Device Guard / WDAC / Smart App Control (code 4551)
      const isDeviceGuardBlocked = !evalRes || evalRes.exitCode === 4551 ||
        (evalRes.stderr && (evalRes.stderr.includes('Device Guard') || evalRes.stderr.includes('Application Control') || evalRes.stderr.includes('policy')));
      if (isDeviceGuardBlocked) {
        useInProcessEngine = true;
      }
    }

    if (useInProcessEngine) {
      evalRes = await cEngine.executeC(code, tc.input || '', timeoutMs);
    }

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
      actualOutput: tc.isSample
        ? (evalRes.stdout || (evalRes.stderr ? `[RUNTIME ERROR: ${evalRes.stderr.trim()}]` : (evalRes.exitCode !== 0 ? `[EXIT CODE: ${evalRes.exitCode}]` : '')))
        : (isPassed ? '[CORRECT]' : (evalRes.stderr ? `[ERROR: ${evalRes.stderr.trim()}]` : (evalRes.exitCode !== 0 ? `[EXIT CODE: ${evalRes.exitCode}]` : '[INCORRECT MATCH]'))),
      runtimeError: evalRes.stderr ? evalRes.stderr.trim() : (evalRes.exitCode !== 0 ? `Process exited with code ${evalRes.exitCode}` : null)
    });
  }

  try {
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    }
  } catch (_) { }

  const earnedScore = testCases.length > 0 ? Math.round((passedCount / testCases.length) * maxPoints * 10) / 10 : 0;
  return {
    success: true,
    phase: 'evaluated',
    compilerOutput: 'Compilation and execution succeeded.',
    testResults,
    totalScore: earnedScore,
    maxScore: maxPoints,
    passedCount,
    totalCount: testCases.length,
    totalExecutionTimeMs: Math.round(totalCpuMs * 10) / 10
  };
}

function setWindowsKioskPolicies(enable) {
  if (process.platform !== 'win32') return;
  const key = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\System';
  try {
    if (enable) {
      // Disable Windows Task Manager, Lock Screen, and Change Password while in Kiosk mode
      exec(`reg add "${key}" /v DisableTaskMgr /t REG_DWORD /d 1 /f`, () => { });
      exec(`reg add "${key}" /v DisableLockWorkstation /t REG_DWORD /d 1 /f`, () => { });
      exec(`reg add "${key}" /v DisableChangePassword /t REG_DWORD /d 1 /f`, () => { });
    } else {
      // Restore standard user permissions
      exec(`reg delete "${key}" /v DisableTaskMgr /f`, () => { });
      exec(`reg delete "${key}" /v DisableLockWorkstation /f`, () => { });
      exec(`reg delete "${key}" /v DisableChangePassword /f`, () => { });
    }
  } catch (_) { }
}

// ----------------------------------------------------------------------------
// Window Creation & Kiosk Confinement Framework
// ----------------------------------------------------------------------------
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1080,
    minHeight: 720,
    backgroundColor: '#090d16',
    title: 'Mass-Code (GECM) // Competitor Terminal',
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

  mainWindow.on('blur', () => {
    if (mainWindow && !mainWindow.isDestroyed() && currentSecurityMode === 'kiosk') {
      mainWindow.webContents.send('window-blur-detected', { timestamp: new Date().toISOString() });
      // Immediately snap window back to front and refocus
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed() && currentSecurityMode === 'kiosk') {
          mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
          mainWindow.setAlwaysOnTop(true, 'screen-saver');
        }
      }, 60);
    }
  });

  mainWindow.on('minimize', (e) => {
    if (currentSecurityMode === 'kiosk') {
      e.preventDefault();
      mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
    }
  });

  // Native Context Menu for text inputs & textareas (Active in Host Mode, blocked in Kiosk mode)
  mainWindow.webContents.on('context-menu', (event, params) => {
    if (currentSecurityMode === 'kiosk' || currentSecurityMode === 'thankyou') return;
    const menuTemplate = [];

    if (params.isEditable) {
      menuTemplate.push(
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { type: 'separator' },
        { role: 'selectAll' }
      );
    } else if (params.selectionText) {
      menuTemplate.push(
        { role: 'copy' },
        { role: 'selectAll' }
      );
    }

    if (menuTemplate.length > 0) {
      const menu = Menu.buildFromTemplate(menuTemplate);
      menu.popup({ window: mainWindow });
    }
  });

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (currentSecurityMode === 'kiosk') {
      const key = (input.key || '').toLowerCase();
      const ctrl = input.control;
      const alt = input.alt;
      const meta = input.meta; // Windows Key
      const shift = input.shift;

      // 1. Intercept Ctrl+D, Win+D, Alt+D, and all Desktop/Navigation D triggers
      if ((ctrl || meta || alt) && key === 'd') {
        event.preventDefault();
        return;
      }

      // 2. Intercept Ctrl+Shift+Esc, Ctrl+Esc, Alt+Esc, and Task Manager interruptions
      if ((ctrl || meta) && (shift || alt) && (key === 'escape' || key === 'esc')) {
        event.preventDefault();
        return;
      }

      // 3. Intercept Ctrl+Alt+Del, Ctrl+Alt+Delete, Alt+Del
      if ((ctrl || meta) && alt && (key === 'delete' || key === 'del')) {
        event.preventDefault();
        return;
      }

      // 4. Intercept all Windows Meta keys (Win, Win+D, Win+R, Win+E, Win+L, Win+Tab, etc.)
      if (meta || key === 'meta' || key === 'os') {
        event.preventDefault();
        return;
      }

      // 5. Intercept Alt combos (Alt+Tab, Alt+F4, Alt+Esc, Alt+Space)
      if (alt && (key === 'tab' || key === 'f4' || key === 'escape' || key === 'esc' || key === ' ' || key === 'space')) {
        event.preventDefault();
        return;
      }

      // 6. Intercept Ctrl system navigation combos (Ctrl+Esc, Ctrl+W, Ctrl+Q)
      if (ctrl && (key === 'escape' || key === 'esc' || key === 'w' || key === 'q')) {
        event.preventDefault();
        return;
      }

      // 7. Intercept function keys (F1 help, F3 search, F5 refresh, F11 fullscreen, F12 devtools)
      if (key === 'f1' || key === 'f3' || key === 'f5' || key === 'f11' || key === 'f12') {
        event.preventDefault();
        return;
      }
    }
  });

  mainWindow.on('close', (e) => {
    if (currentSecurityMode === 'kiosk' || currentSecurityMode === 'thankyou') {
      e.preventDefault();
      mainWindow.webContents.send('competitor-close-attempted');
    }
  });
}

function applySecurityMode(mode) {
  if (!mainWindow) return;
  const targetMode = (mode === 'competitor' || mode === 'kiosk') ? 'kiosk' : mode;
  currentSecurityMode = targetMode;

  if (targetMode === 'kiosk' || targetMode === 'thankyou') {
    setWindowsKioskPolicies(true);
    try {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.setResizable(true);
      mainWindow.setKiosk(true);
      if (process.platform === 'darwin') {
        mainWindow.setAlwaysOnTop(true, 'screen-saver');
      } else {
        mainWindow.setAlwaysOnTop(true);
      }
      mainWindow.setMinimizable(false);
      mainWindow.focus();
    } catch (err) {
      console.error('Kiosk activation error:', err);
    }

    try {
      globalShortcut.register('Alt+Tab', () => { });
      globalShortcut.register('Alt+F4', () => { });
      globalShortcut.register('Alt+Escape', () => { });
      globalShortcut.register('CommandOrControl+Shift+Escape', () => { });
      globalShortcut.register('CommandOrControl+Alt+Delete', () => { });
      globalShortcut.register('CommandOrControl+Alt+Del', () => { });
      globalShortcut.register('CommandOrControl+D', () => { });
      globalShortcut.register('CommandOrControl+Shift+D', () => { });
      globalShortcut.register('CommandOrControl+Alt+D', () => { });
      globalShortcut.register('Alt+D', () => { });
      globalShortcut.register('CommandOrControl+Shift+I', () => { });
      globalShortcut.register('F12', () => { });
      globalShortcut.register('F11', () => { });
      globalShortcut.register('F5', () => { });
    } catch (_) { }
  } else {
    setWindowsKioskPolicies(false);
    try {
      mainWindow.setKiosk(false);
      mainWindow.setAlwaysOnTop(false);
      mainWindow.setFullScreen(false);
      mainWindow.setResizable(true);
      mainWindow.setMinimizable(true);
    } catch (_) { }
    globalShortcut.unregisterAll();
  }
}

const { Menu } = require('electron');

app.whenReady().then(() => {
  initRuntimeDirectories();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  setWindowsKioskPolicies(false);
  globalShortcut.unregisterAll();
  try {
    hostServer.stop();
  } catch (_) { }
});

process.on('exit', () => {
  setWindowsKioskPolicies(false);
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
    applySecurityMode('entry');
  }
  return { success: isMatch };
});

ipcMain.handle('app:quit', () => {
  currentSecurityMode = 'quit';
  setWindowsKioskPolicies(false);
  if (mainWindow) {
    try { mainWindow.destroy(); } catch (_) { }
  }
  app.quit();
  return { success: true };
});

ipcMain.handle('env:get-diagnostics', async () => {
  return await checkDiagnostics();
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
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return { success: true, found: true, data };
    }
    return { success: true, found: false };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('submission:save-final', async (event, payload) => {
  try {
    const safeUsn = (payload.usn || 'candidate').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `FINAL_${safeUsn}.json`;
    const filePath = path.join(submissionsDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
    try {
      const syncedPath = path.join(syncedSubmissionsDir, filename);
      fs.writeFileSync(syncedPath, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (_) { }
    return { success: true, filename, filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('contest:get-default', async () => {
  const activePath = path.join(contestsDir, 'active-contest.json');
  if (fs.existsSync(activePath)) {
    try {
      const activeRaw = JSON.parse(fs.readFileSync(activePath, 'utf-8'));
      if (activeRaw && (activeRaw.problems || []).length > 0) {
        return { success: true, contest: activeRaw, round: 1 };
      }
    } catch (_) { }
  }
  // Start with a clean, empty contest template for new contests
  return {
    success: true,
    contest: {
      id: 'MASS-' + Date.now(),
      type: 'contest',
      title: 'Mass-Code Championship',
      token: 'MASS' + Math.floor(1000 + Math.random() * 9000),
      durationMinutes: 60,
      language: 'c',
      problems: [],
      batches: [
        {
          id: 'batch_1',
          name: 'Batch 1 (Morning)',
          students: []
        }
      ],
      activeBatchId: 'batch_1'
    },
    round: 1
  };
});

function safeParseContestJson(raw) {
  try {
    return JSON.parse(raw);
  } catch (err) {
    // Attempt automatic repair for unescaped quotes in starterCode
    try {
      const repaired = raw.replace(/"starterCode":\s*"([\s\S]*?)"\s*,\s*"(testCases|starterCodePython)"/g, (match, code, nextKey) => {
        const fixedCode = code
          .replace(/printf\("([^"]*)"\)/g, 'printf(\\"$1\\")')
          .replace(/printf\("([^"]*)",/g, 'printf(\\"$1\\",')
          .replace(/scanf\("([^"]*)",/g, 'scanf(\\"$1\\",');
        return `"starterCode": "${fixedCode}",\n"${nextKey}"`;
      });
      return JSON.parse(repaired);
    } catch (_) { }
    throw err;
  }
}

ipcMain.handle('contest:import-dialog', async () => {
  const { filePaths, canceled } = await dialog.showOpenDialog(mainWindow, {
    title: 'Load Question Paper Configuration (JSON)',
    filters: [{ name: 'JSON Contest Package', extensions: ['json'] }],
    properties: ['openFile']
  });
  if (canceled || !filePaths || filePaths.length === 0) return { canceled: true };
  try {
    const raw = fs.readFileSync(filePaths[0], 'utf-8');
    const config = safeParseContestJson(raw);
    return { success: true, config, filePath: filePaths[0] };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ----------------------------------------------------------------------------
// Offline PDF Question Paper Auto-Importer & Parser Engine
// ----------------------------------------------------------------------------
async function extractTextFromPdf(buffer) {
  try {
    const pdfModule = require('pdf-parse');
    if (pdfModule.PDFParse) {
      const parser = new pdfModule.PDFParse({ data: buffer });
      const res = await parser.getText();
      const txt = res.text || (res.pages ? res.pages.map(p => p.text).join('\n') : '');
      try { await parser.destroy(); } catch (_) { }
      return txt;
    } else if (typeof pdfModule === 'function') {
      const data = await pdfModule(buffer);
      return data.text || '';
    } else {
      throw new Error('Unsupported pdf-parse module format');
    }
  } catch (err) {
    throw new Error('PDF extraction failed: ' + err.message);
  }
}

function parseQuestionsFromText(rawText, mode = 'auto') {
  if (!rawText || !rawText.trim()) {
    return [];
  }

  // Determine effective mode: 'exam' (lab experiments) or 'contest' (multi-tier easy/med/hard)
  let effectiveMode = mode;
  if (!effectiveMode || effectiveMode === 'auto') {
    const isExamSignal = /(?:Experiment|Exp\s*\d+|Lab\s*Exam|Laboratory|VTU|Program\s*\d+|Lab\s*Manual)/i.test(rawText);
    const isContestSignal = /(?:Easy\s*Tier|Medium\s*Tier|Hard\s*Tier|Round\s*1|Round\s*2|Round\s*3)/i.test(rawText);
    effectiveMode = (isExamSignal && !isContestSignal) ? 'exam' : 'contest';
  }

  const text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = text.split('\n');
  let currentTier = effectiveMode === 'exam' ? 'lab' : 'easy';

  // Question boundary markers:
  // In Exam Mode: matches Experiment 1, Exp 1, Program 1, Lab 1, Exercise 1, Part A: Q1, etc.
  // In Contest Mode: matches Question 1, Problem 1, Q1, etc.
  let questionRegex;
  if (effectiveMode === 'exam') {
    questionRegex = /^(?:(?:Experiment|Exp\.?|Program|Prog\.?|Lab\s*Experiment|Lab|Exercise|Part\s*[A-B]\s*[-–—:]?\s*(?:Q|Prog|Exp)?)\s*(\d+)[\s:.)\-—]+|(?:\[\s*(?:Experiment|Exp|Program|Lab|Part\s*[A-B])\s*(\d+)\s*\])|(?:\b(\d+)[\.)]\s+([A-Z0-9].*))|(?:(?:Question|Problem|Q\.?)\s*(\d+)[\s:.)\-—]+))/i;
  } else {
    questionRegex = /^(?:(?:Question|Problem|Q\.?)\s*(\d+)[\s:.)\-—]+|(?:\[\s*(?:Question|Problem|Q)\s*(\d+)\s*\])|(?:\b(\d+)[\.)]\s+([A-Z0-9].*)))/i;
  }
  const sectionRegex = /(?:Section|Round|Part|Tier)\s*([A-Za-z0-9]+)?[\s:.\-—]*(Easy|Medium|Hard)/i;

  const chunks = [];
  let currentChunk = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    const secMatch = trimmed.match(sectionRegex);
    if (secMatch) {
      currentTier = secMatch[2].toLowerCase();
      continue;
    }

    const qMatch = trimmed.match(questionRegex);
    if (qMatch) {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      currentChunk = {
        headerLine: trimmed,
        defaultTier: currentTier,
        lines: [trimmed],
        qNumber: qMatch[1] || qMatch[2] || qMatch[3] || qMatch[4] || (chunks.length + 1)
      };
    } else {
      if (currentChunk) {
        currentChunk.lines.push(line);
      } else {
        const preMatch = trimmed.match(/\b(Easy|Medium|Hard)\b/i);
        if (preMatch) {
          const t = preMatch[1].toLowerCase();
          if (['easy', 'medium', 'hard'].includes(t)) {
            currentTier = t;
          }
        }
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  if (chunks.length === 0) {
    chunks.push({
      headerLine: effectiveMode === 'exam' ? 'Experiment 1' : 'Problem 1',
      defaultTier: effectiveMode === 'exam' ? 'lab' : 'easy',
      lines: lines,
      qNumber: 1
    });
  }

  const parsedProblems = [];

  chunks.forEach((chunk, idx) => {
    const chunkText = chunk.lines.join('\n');
    const qNum = chunk.qNumber || (idx + 1);

    let tier = effectiveMode === 'exam' ? 'lab' : (chunk.defaultTier || 'easy');
    let difficulty = effectiveMode === 'exam' ? 'Lab' : 'Easy';

    if (effectiveMode === 'contest') {
      const headerTierMatch = chunk.headerLine.match(/\b(easy|medium|hard)\b/i);
      const tierMatch = headerTierMatch ||
        chunkText.match(/\b(?:tier|difficulty|level)[\s:.\-—]+(easy|medium|hard)\b/i) ||
        chunkText.match(/\[\s*(easy|medium|hard)\s*\]/i) ||
        chunkText.match(/\b(easy|medium|hard)\s+(?:tier|level)\b/i) ||
        chunkText.match(/\b(easy|medium|hard)\b/i);

      if (tierMatch) {
        const found = (tierMatch[1] || tierMatch[2] || tierMatch[0]).toLowerCase();
        if (['easy', 'medium', 'hard'].includes(found)) {
          tier = found;
        }
      }
      difficulty = tier.charAt(0).toUpperCase() + tier.slice(1);
    }

    // 2. Max Points: check "10 Marks", "Marks: 10", "[10 Marks]", etc.
    let maxPoints = effectiveMode === 'exam' ? 50 : (tier === 'hard' ? 15 : (tier === 'medium' ? 10 : 5));
    const ptsMatch = chunkText.match(/(\d+)\s*(?:marks?|points?|pts)\b/i) ||
      chunkText.match(/(?:max\s*points?|points?|marks?)\s*[:=\-—]?\s*(\d+)/i) ||
      chunkText.match(/\[\s*(\d+)\s*(?:marks?|points?|pts)\s*\]/i) ||
      chunkText.match(/\(\s*(\d+)\s*(?:marks?|points?|pts)\s*\)/i);
    if (ptsMatch) {
      const parsedPts = parseInt(ptsMatch[1] || ptsMatch[2], 10);
      if (parsedPts > 0 && parsedPts <= 100) {
        maxPoints = parsedPts;
      }
    }

    // 3. Title Extraction
    let rawTitle = '';
    const titleMatch = chunkText.match(/Title\s*[:=\-—]\s*([^\n]+)/i);
    if (titleMatch) {
      rawTitle = titleMatch[1].trim();
    } else {
      let h = chunk.headerLine
        .replace(/^(?:Experiment|Exp\.?|Program|Prog\.?|Lab|Exercise|Question|Problem|Q\.?)\s*\d+[\s:.)\-—]*/i, '')
        .replace(/^\d+[\.)]\s*/, '')
        .replace(/\[\s*(?:Easy|Medium|Hard|Lab|\d+\s*Marks?|\d+\s*Pts)\s*\]/gi, '')
        .replace(/\(\s*(?:Easy|Medium|Hard|Lab|\d+\s*Marks?|\d+\s*Pts)\s*\)/gi, '')
        .replace(/\b(?:Easy|Medium|Hard)\b/gi, '')
        .replace(/[-–—:]\s*\d+\s*(?:marks?|points?|pts)\b/gi, '')
        .replace(/\b\d+\s*(?:marks?|points?|pts)\b/gi, '')
        .trim();

      if (h.length > 2) {
        rawTitle = h;
      } else {
        const secondLine = (chunk.lines[1] || '').trim();
        if (secondLine && !secondLine.match(/^(?:Points|Marks|Tier|Difficulty|Description|Problem Description|Aim)/i)) {
          rawTitle = secondLine;
        } else {
          rawTitle = effectiveMode === 'exam' ? `Lab Program ${qNum}` : `Problem ${qNum}`;
        }
      }
    }

    rawTitle = rawTitle.replace(/^[:\-—\s]+/, '').replace(/[:\-—\s]+$/, '').trim();

    let cleanTitle;
    if (effectiveMode === 'exam') {
      cleanTitle = rawTitle.toLowerCase().startsWith('exp') || rawTitle.toLowerCase().startsWith('prog')
        ? rawTitle
        : `Experiment ${qNum}: ${rawTitle}`;
    } else {
      cleanTitle = rawTitle.toLowerCase().startsWith('question') || rawTitle.toLowerCase().startsWith('problem')
        ? rawTitle
        : `Question ${qNum}: ${rawTitle}`;
    }

    // 4. Starter Code with lookahead
    let starterCode = '';
    const codeBlockMatch = chunkText.match(/(?:Starter\s*Code|Buggy\s*Code|Faulty\s*Code|Code(?:\s*Template)?)\s*[:=\-—]?\s*(?:```[a-z]*\s*)?\n([\s\S]*?)(?:```|(?=\n\s*(?:Sample\s+Input|Test\s*Case|Input\s*:|Expected\s+Output))|$)/i);
    if (codeBlockMatch) {
      starterCode = codeBlockMatch[1].trim();
    } else {
      const fencedMatch = chunkText.match(/```(?:c|cpp|python)?\n([\s\S]*?)```/i);
      if (fencedMatch) {
        starterCode = fencedMatch[1].trim();
      } else {
        const includeMatch = chunkText.match(/(#include\s*<[\s\S]*?int\s+main[\s\S]*?\n\})/i);
        if (includeMatch) {
          starterCode = includeMatch[1].trim();
        }
      }
    }

    if (!starterCode) {
      starterCode = '#include <stdio.h>\n#include <stdlib.h>\n\nint main(void) {\n    // Write solution here\n    return 0;\n}\n';
    } else {
      if (!starterCode.endsWith('\n')) starterCode += '\n';
    }

    // 5. Test Cases
    const testCases = [];
    const tcRegex = /(?:Sample\s+Input(?:\s*\d+)?|Test\s*Case\s*\d*\s*Input|Input\s*\d*)\s*[:=\-—]?\s*\n?([\s\S]*?)(?:(?:Sample\s+Output(?:\s*\d+)?|Expected\s*Output(?:\s*\d+)?|Output\s*\d*)\s*[:=\-—]?\s*\n?([\s\S]*?))(?=(?:\b(?:Sample\s+Input|Test\s*Case|Input\s*\d*|Question|Problem|Experiment|Exp)\b|\n\n\n|$))/gi;
    let tcMatch;
    let tcCount = 1;

    while ((tcMatch = tcRegex.exec(chunkText)) !== null) {
      let rawIn = tcMatch[1].trim();
      let rawOut = tcMatch[2].trim();

      rawIn = rawIn.replace(/^```[a-z]*\n?/i, '').replace(/```$/i, '').trim();
      rawOut = rawOut.replace(/^```[a-z]*\n?/i, '').replace(/```$/i, '').trim();

      if (rawIn.length > 0 && !rawIn.endsWith('\n')) rawIn += '\n';
      if (rawOut.length > 0 && !rawOut.endsWith('\n')) rawOut += '\n';

      testCases.push({
        id: `tc_p${qNum}_${tcCount}`,
        isSample: tcCount === 1,
        input: rawIn,
        expectedOutput: rawOut
      });
      tcCount++;
    }

    if (testCases.length === 0) {
      testCases.push({
        id: `tc_p${qNum}_1`,
        isSample: true,
        input: '',
        expectedOutput: ''
      });
    }

    // 6. Description Extraction
    let desc = chunkText;
    desc = desc.replace(chunk.headerLine, '');
    if (codeBlockMatch) {
      desc = desc.replace(codeBlockMatch[0], '');
    } else if (starterCode) {
      desc = desc.replace(/(?:Starter\s*Code|Code)[\s\S]*?(?:return\s*0\s*;?\s*\}|\})/i, '');
    }
    desc = desc.replace(/(?:\bSample\s+Input|\bExpected\s+Output|\bSample\s+Output|\bTest\s*Case)[\s\S]*/gi, '');
    desc = desc.replace(/^(?:Problem\s*Description|Description|Problem\s*Statement|Experiment\s*Aim|Aim)\s*[:=\-—]?\s*/gim, '');
    desc = desc.replace(/(?:tier|difficulty|level|points?|marks?)\s*[:=\-—][^\n]+/gi, '');
    desc = desc.replace(/[-–—:]\s*\d+\s*(?:marks?|points?|pts)\b/gi, '');
    desc = desc.replace(/\[\s*(?:easy|medium|hard|lab|\d+\s*marks?|\d+\s*pts)\s*\]/gi, '');

    desc = desc.trim();
    if (!desc) {
      desc = effectiveMode === 'exam'
        ? 'Implement the lab experiment as per specification, handle all edge cases, and pass the test cases.'
        : 'Implement the solution according to specifications and pass all test cases.';
    }

    parsedProblems.push({
      id: `p_pdf_${qNum}_${Date.now() % 10000}`,
      tier: tier,
      difficulty: difficulty,
      title: cleanTitle,
      category: effectiveMode === 'exam' ? 'Lab Experiment' : 'Algorithmic Challenge',
      maxPoints: maxPoints,
      timeLimitMs: 2000,
      description: desc,
      starterCode: starterCode,
      testCases: testCases
    });
  });

  return parsedProblems;
}

ipcMain.handle('contest:import-pdf-dialog', async (event, options = {}) => {
  const mode = (options && options.mode) || 'auto';
  const { filePaths, canceled } = await dialog.showOpenDialog(mainWindow, {
    title: mode === 'exam' ? 'Select Lab Exam Question Paper PDF' : 'Select Contest Question Paper PDF',
    filters: [{ name: 'PDF Document (*.pdf)', extensions: ['pdf'] }],
    properties: ['openFile']
  });
  if (canceled || !filePaths || filePaths.length === 0) return { canceled: true };
  const filePath = filePaths[0];
  try {
    const buffer = fs.readFileSync(filePath);
    const rawText = await extractTextFromPdf(buffer);
    if (!rawText || !rawText.trim()) {
      return {
        success: false,
        error: 'The PDF has no selectable text (scanned image-only document). Please use a digital text PDF or enter questions manually.'
      };
    }
    const problems = parseQuestionsFromText(rawText, mode);
    if (!problems || problems.length === 0) {
      return {
        success: false,
        error: 'Could not detect any questions in the PDF. Please check the document structure or format.'
      };
    }
    return {
      success: true,
      filename: path.basename(filePath),
      filePath,
      problems,
      count: problems.length,
      mode
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('contest:parse-pdf-buffer', async (event, { base64Data, filename, mode = 'auto' }) => {
  try {
    if (!base64Data) {
      return { success: false, error: 'No PDF data received.' };
    }
    const buffer = Buffer.from(base64Data, 'base64');
    const rawText = await extractTextFromPdf(buffer);
    if (!rawText || !rawText.trim()) {
      return {
        success: false,
        error: 'The PDF has no selectable text (scanned image-only document). Please use a digital text PDF.'
      };
    }
    const problems = parseQuestionsFromText(rawText, mode);
    if (!problems || problems.length === 0) {
      return {
        success: false,
        error: 'No questions detected in the uploaded PDF.'
      };
    }
    return {
      success: true,
      filename: filename || 'uploaded.pdf',
      problems,
      count: problems.length,
      mode
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('contest:save', async (event, contestConfig) => {
  try {
    const safeId = (contestConfig.id || contestConfig.token || `contest_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `contest-${safeId}.json`;
    const localPath = path.join(contestsDir, filename);
    const activePath = path.join(contestsDir, 'active-contest.json');
    const samplePath = path.join(__dirname, 'sample-contest.json');
    const jsonStr = JSON.stringify(contestConfig, null, 2);

    fs.writeFileSync(localPath, jsonStr, 'utf-8');
    fs.writeFileSync(activePath, jsonStr, 'utf-8');
    try { fs.writeFileSync(samplePath, jsonStr, 'utf-8'); } catch (_) { }

    if (hostServer) {
      hostServer.activeContest = contestConfig;
    }
    return { success: true, filePath: localPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('contest:export-dialog', async (event, contestConfig) => {
  const safeId = (contestConfig.id || contestConfig.token || 'config').replace(/[^a-zA-Z0-9_-]/g, '_');
  const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Mass-Code Contest Package',
    defaultPath: `contest-${safeId}.json`,
    filters: [{ name: 'JSON Contest Package', extensions: ['json'] }]
  });
  if (canceled || !filePath) return { canceled: true };
  try {
    fs.writeFileSync(filePath, JSON.stringify(contestConfig, null, 2), 'utf-8');
    if (hostServer) {
      hostServer.activeContest = contestConfig;
    }
    return { success: true, filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
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
      } catch (_) { }
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

      const req = http.get(targetUrl, { timeout: 10000 }, (res) => {
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
      req.on('error', err => {
        let msg = err.message;
        if (err.code === 'ECONNREFUSED') {
          msg = `Connection refused at ${parsed.origin}. Ensure Host server is running and port is correct.`;
        } else if (err.code === 'ETIMEDOUT') {
          msg = `Connection timed out to ${parsed.origin}. Ensure Host laptop allows port 8080 through Windows Defender Firewall.`;
        } else if (err.code === 'EHOSTUNREACH') {
          msg = `Host unreachable at ${parsed.origin}. Ensure both computers are on the same Wi-Fi / network.`;
        }
        resolve({ success: false, error: msg });
      });
      req.on('timeout', () => {
        req.destroy();
        resolve({ success: false, error: `Connection timed out (10s) connecting to ${parsed.origin}. Check Host IP & Firewall.` });
      });
    } catch (err) {
      resolve({ success: false, error: err.message });
    }
  });
});

ipcMain.handle('sync:fetch-exam-assignment', async (event, { hostUrl, usn, otp }) => {
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

      const safeUsn = encodeURIComponent((usn || '').trim().toUpperCase());
      const safeOtp = encodeURIComponent((otp || '').trim());
      const targetUrl = new URL(`/api/exam-assignment?usn=${safeUsn}&otp=${safeOtp}`, parsed.origin);

      const req = http.get(targetUrl, { timeout: 10000 }, (res) => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            resolve(data);
          } catch (e) {
            resolve({ success: false, error: 'Malformed JSON payload from host.' });
          }
        });
      });
      req.on('error', err => {
        let msg = err.message;
        if (err.code === 'ECONNREFUSED') {
          msg = `Connection refused at ${parsed.origin}. Ensure Host server is running and port is correct.`;
        } else if (err.code === 'ETIMEDOUT') {
          msg = `Connection timed out to ${parsed.origin}. Ensure Host allows port 8080 through Windows Firewall.`;
        } else if (err.code === 'EHOSTUNREACH') {
          msg = `Host unreachable at ${parsed.origin}. Ensure both computers are on the same network.`;
        }
        resolve({ success: false, error: msg });
      });
      req.on('timeout', () => {
        req.destroy();
        resolve({ success: false, error: `Connection timed out (10s) connecting to ${parsed.origin}.` });
      });
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

ipcMain.handle('lan:start-listening', () => {
  lanDiscovery.startListening((payload) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('lan:host-discovered', payload);
    }
  });
  return { success: true };
});

ipcMain.handle('lan:stop-listening', () => {
  lanDiscovery.stopListening();
  return { success: true };
});

// ----------------------------------------------------------------------------
// Host Server Controls
// ----------------------------------------------------------------------------
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
  const ips = hostServer.getLocalIps();
  return {
    isRunning: hostServer.isRunning,
    port: hostServer.port,
    activeContestId: hostServer.activeContest ? (hostServer.activeContest.id || hostServer.activeContest.token) : null,
    ips,
    primaryIp: ips[0] || '127.0.0.1'
  };
});

// ----------------------------------------------------------------------------
// Host Session & History Reset Engine
// ----------------------------------------------------------------------------
ipcMain.handle('host:end-session', async () => {
  try {
    // 1. Terminate LAN server & UDP broadcast
    try {
      await hostServer.stop();
    } catch (_) {}

    // 2. Prepare timestamped archive folder so records are preserved safely
    const now = new Date();
    const ts = now.toISOString().replace(/[:.]/g, '-');
    const contestTitle = (hostServer.activeContest && hostServer.activeContest.title)
      ? hostServer.activeContest.title.replace(/[^a-zA-Z0-9_-]/g, '_')
      : 'Contest';
    const archiveTarget = path.join(archivesDir, `${contestTitle}_${ts}`);

    if (!fs.existsSync(archiveTarget)) {
      fs.mkdirSync(archiveTarget, { recursive: true });
    }

    let archivedCount = 0;

    const archiveAndClean = (sourceDir, subfolderName) => {
      if (!fs.existsSync(sourceDir)) return;
      const files = fs.readdirSync(sourceDir);
      if (files.length === 0) return;

      const destSubfolder = path.join(archiveTarget, subfolderName);
      if (!fs.existsSync(destSubfolder)) {
        fs.mkdirSync(destSubfolder, { recursive: true });
      }

      for (const file of files) {
        try {
          const src = path.join(sourceDir, file);
          const stat = fs.statSync(src);
          if (stat.isFile()) {
            const dest = path.join(destSubfolder, file);
            fs.copyFileSync(src, dest);
            fs.unlinkSync(src);
            archivedCount++;
          }
        } catch (e) {
          console.warn(`Could not archive ${file}:`, e.message);
        }
      }
    };

    archiveAndClean(syncedSubmissionsDir, 'synced_submissions');
    archiveAndClean(submissionsDir, 'submissions');
    archiveAndClean(sessionsDir, 'sessions');

    // Remove active contest file so previous contest doesn't persist
    const activeContestPath = path.join(contestsDir, 'active-contest.json');
    if (fs.existsSync(activeContestPath)) {
      try {
        fs.copyFileSync(activeContestPath, path.join(archiveTarget, 'active-contest.json'));
        fs.unlinkSync(activeContestPath);
      } catch (_) {}
    }

    hostServer.activeContest = null;

    return {
      success: true,
      archivedCount,
      archivePath: archiveTarget
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('host:clear-history', async () => {
  try {
    let clearedCount = 0;
    const cleanDir = (sourceDir) => {
      if (!fs.existsSync(sourceDir)) return;
      const files = fs.readdirSync(sourceDir);
      for (const file of files) {
        try {
          const src = path.join(sourceDir, file);
          if (fs.statSync(src).isFile()) {
            fs.unlinkSync(src);
            clearedCount++;
          }
        } catch (_) {}
      }
    };
    cleanDir(syncedSubmissionsDir);
    cleanDir(submissionsDir);
    cleanDir(sessionsDir);
    return { success: true, clearedCount };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ----------------------------------------------------------------------------
// Grading Leaderboard Scanner (Scans synced_submissions/ and submissions/)
// ----------------------------------------------------------------------------
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

          if (!recordsMap.has(usn) || (data.submittedAt && recordsMap.get(usn).submittedAt < data.submittedAt)) {
            recordsMap.set(usn, {
              usn,
              name: data.name || 'Anonymous',
              totalScore: data.totalScore || 0,
              maxScore: data.maxScore || 100,
              tierScores: data.tierScores || {},
              roundBreakdown: data.roundBreakdown || [],
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
        } catch (_) { }
      }
    }

    const records = Array.from(recordsMap.values());

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

ipcMain.handle('grading:export-csv', async (event, { records, contestTitle = 'Mass-Code', isExam = false }) => {
  const defaultFilename = isExam
    ? `Lab_Marks_${(contestTitle || 'exam').replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.csv`
    : `Leaderboard_${(contestTitle || 'contest').replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.csv`;

  const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
    title: isExam ? 'Export Lab Marks Spreadsheet' : 'Export Leaderboard Spreadsheet',
    defaultPath: defaultFilename,
    filters: [{ name: 'CSV Spreadsheets', extensions: ['csv'] }]
  });
  if (canceled || !filePath) return { canceled: true };

  let headers, rows;
  if (isExam) {
    headers = ['Rank', 'USN', 'Candidate Name', 'Batch', 'Assigned Lab Experiment', 'Change of Experiment', 'Status', 'Raw Marks', 'Final Marks', 'Max Marks', 'Elapsed Time (s)', 'Violations', 'Submitted At'];
    rows = (records || []).map(r => {
      const p = r.fullPayload || {};
      const batch = p.batchName || 'Batch 1';
      const assigned = p.assignedProblemTitle || 'Lab Experiment';
      const isCoe = p.isChangeOfExperiment ? `Yes (-${p.penalty || 0} penalty)` : 'No (Regular)';
      const status = r.problemsSolvedCount > 0 ? 'Solved' : 'Incomplete';
      const rawScore = r.totalScore || 0;
      const penalty = p.penalty || 0;
      const finalScore = p.isChangeOfExperiment ? Math.max(0, rawScore - penalty) : rawScore;
      return [
        r.rank, `"${r.usn}"`, `"${r.name}"`, `"${batch}"`, `"${assigned}"`, `"${isCoe}"`, `"${status}"`, rawScore, finalScore, r.maxScore, r.timeElapsedSeconds, r.violationsCount, `"${r.submittedAt}"`
      ].join(',');
    });
  } else {
    headers = ['Rank', 'USN', 'Candidate Name', 'Easy (R1) Score', 'Medium (R2) Score', 'Hard (R3) Score', 'Total Score', 'Max Score', 'Problems Solved', 'Total Problems', 'Contest Time (s)', 'CPU Time (ms)', 'Violations', 'Submitted At'];
    rows = (records || []).map(r => {
      const easy = (r.tierScores && r.tierScores.easy) ? r.tierScores.easy.score : 0;
      const med = (r.tierScores && r.tierScores.medium) ? r.tierScores.medium.score : 0;
      const hard = (r.tierScores && r.tierScores.hard) ? r.tierScores.hard.score : 0;
      return [
        r.rank, `"${r.usn}"`, `"${r.name}"`, easy, med, hard, r.totalScore, r.maxScore, r.problemsSolvedCount, r.totalProblems, r.timeElapsedSeconds, r.totalExecutionTimeMs, r.violationsCount, `"${r.submittedAt}"`
      ].join(',');
    });
  }

  fs.writeFileSync(filePath, [headers.join(','), ...rows].join('\n'), 'utf-8');
  return { success: true, filePath };
});

// ============================================================================
// INTERACTIVE RUNTIME TERMINAL SANDBOX & PROCESS EXECUTION ENGINE
// ============================================================================
let activeTerminalProc = null;
let currentTerminalCwd = null;

function getTerminalRuntimeEnv() {
  const gccCmd = findGccExecutable();
  const gccDir = gccCmd && path.isAbsolute(gccCmd) ? path.dirname(gccCmd) : '';
  const py = findPythonExecutable();
  const pyDir = py.cmd && path.isAbsolute(py.cmd) ? path.dirname(py.cmd) : '';
  const javacCmd = findJavacExecutable();
  const javaDir = javacCmd && path.isAbsolute(javacCmd) ? path.dirname(javacCmd) : '';

  const extraDirs = [gccDir, pyDir, javaDir].filter(d => d && d !== '.' && fs.existsSync(d));
  return {
    ...process.env,
    PATH: extraDirs.length ? `${extraDirs.join(';')};${process.env.PATH || ''}` : (process.env.PATH || '')
  };
}

ipcMain.handle('terminal:init-session', async (event, { usn = 'candidate' } = {}) => {
  const safeUsn = (usn || 'candidate').replace(/[^a-zA-Z0-9_-]/g, '_');
  const workspaceDir = path.join(tempDir, 'workspaces', safeUsn);
  try {
    if (!fs.existsSync(workspaceDir)) {
      fs.mkdirSync(workspaceDir, { recursive: true });
    }
    currentTerminalCwd = workspaceDir;
    return { success: true, cwd: workspaceDir };
  } catch (err) {
    currentTerminalCwd = tempDir;
    return { success: false, cwd: tempDir, error: err.message };
  }
});

ipcMain.handle('terminal:sync-editor-file', async (event, { filename = 'solution.c', code = '', fallbackFilename = null } = {}) => {
  try {
    const targetDir = currentTerminalCwd || tempDir;
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const filePath = path.join(targetDir, filename);
    fs.writeFileSync(filePath, code || '', 'utf-8');
    if (fallbackFilename && fallbackFilename !== filename) {
      const fbPath = path.join(targetDir, fallbackFilename);
      fs.writeFileSync(fbPath, code || '', 'utf-8');
    }
    return { success: true, filePath, cwd: targetDir };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('terminal:run-command', async (event, { command = '' } = {}) => {
  const trimmed = (command || '').trim();
  if (!trimmed) {
    return { success: true, empty: true, cwd: currentTerminalCwd || tempDir };
  }

  // Native CD command handling
  const isCd = trimmed === 'cd' || trimmed.startsWith('cd ') || trimmed.startsWith('cd/');
  if (isCd) {
    if (trimmed === 'cd') {
      return { success: true, isCd: true, cwd: currentTerminalCwd, output: (currentTerminalCwd || tempDir) + '\r\n' };
    }
    const targetPath = trimmed.replace(/^cd\s*/i, '').trim();
    const currentBase = currentTerminalCwd || tempDir;
    const resolved = path.resolve(currentBase, targetPath);
    try {
      if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
        currentTerminalCwd = resolved;
        return { success: true, isCd: true, cwd: currentTerminalCwd, output: '' };
      } else {
        return { success: false, isCd: true, cwd: currentTerminalCwd, output: `The system cannot find the path specified: ${targetPath}\r\n` };
      }
    } catch (e) {
      return { success: false, isCd: true, cwd: currentTerminalCwd, output: `${e.message}\r\n` };
    }
  }

  // Clear screen
  if (trimmed.toLowerCase() === 'cls' || trimmed.toLowerCase() === 'clear') {
    return { success: true, isClear: true, cwd: currentTerminalCwd || tempDir };
  }

  // If another process is running, terminate it before starting new command
  if (activeTerminalProc) {
    const oldPid = activeTerminalProc.pid;
    try {
      if (process.platform === 'win32' && oldPid) {
        exec(`taskkill /pid ${oldPid} /T /F`, () => {});
      } else {
        activeTerminalProc.kill('SIGKILL');
      }
    } catch (_) {}
    activeTerminalProc = null;
  }

  const cwd = currentTerminalCwd || tempDir;
  const runtimeEnv = getTerminalRuntimeEnv();

  return new Promise((resolve) => {
    try {
      activeTerminalProc = spawn(trimmed, [], {
        cwd,
        shell: true,
        env: runtimeEnv,
        windowsHide: true
      });

      activeTerminalProc.stdout.on('data', (data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('terminal:stream-output', { text: data.toString() });
        }
      });

      activeTerminalProc.stderr.on('data', (data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('terminal:stream-output', { text: data.toString() });
        }
      });

      activeTerminalProc.on('close', async (code, signal) => {
        activeTerminalProc = null;

        if (code === 4551) {
          // Device Guard policy blocked the native .exe.
          // Fallback seamlessly to the in-process C runtime
          let foundCode = '';
          const potentialFiles = [];
          try {
            const allFiles = fs.readdirSync(cwd);
            const cFiles = allFiles.filter(f => f.toLowerCase().endsWith('.c'));
            potentialFiles.push(...cFiles);
          } catch (_) {}
          potentialFiles.push('solution.c', 'file.c', 'main.c', 'test.c');
          for (const pf of potentialFiles) {
            const pfp = path.join(cwd, pf);
            if (fs.existsSync(pfp)) {
              foundCode = fs.readFileSync(pfp, 'utf8');
              break;
            }
          }

          if (foundCode) {
            const cRes = await cEngine.executeC(foundCode, '', 5000);
            if (mainWindow && !mainWindow.isDestroyed()) {
              if (cRes.stdout) {
                mainWindow.webContents.send('terminal:stream-output', { text: cRes.stdout + '\r\n' });
              }
              if (cRes.stderr) {
                mainWindow.webContents.send('terminal:stream-output', { text: `[Runtime Notice: ${cRes.stderr}]\r\n` });
              }
              mainWindow.webContents.send('terminal:process-exit', { code: cRes.exitCode, cwd: currentTerminalCwd || tempDir });
            }
            return resolve({ success: true, exitCode: cRes.exitCode, cwd: currentTerminalCwd || tempDir });
          }
        }

        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('terminal:process-exit', { code, signal, cwd: currentTerminalCwd || tempDir });
        }
        resolve({ success: true, exitCode: code, cwd: currentTerminalCwd || tempDir });
      });

      activeTerminalProc.on('error', (err) => {
        activeTerminalProc = null;
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('terminal:stream-output', { text: `\r\n[Execution Error: ${err.message}]\r\n` });
          mainWindow.webContents.send('terminal:process-exit', { code: -1, error: err.message, cwd: currentTerminalCwd || tempDir });
        }
        resolve({ success: false, error: err.message, cwd: currentTerminalCwd || tempDir });
      });
    } catch (err) {
      activeTerminalProc = null;
      resolve({ success: false, error: err.message, cwd: currentTerminalCwd || tempDir });
    }
  });
});

ipcMain.handle('terminal:send-stdin', async (event, { input = '' } = {}) => {
  if (activeTerminalProc && activeTerminalProc.stdin && !activeTerminalProc.stdin.destroyed) {
    try {
      activeTerminalProc.stdin.write(input + '\n');
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
  return { success: false, error: 'No active running process waiting for stdin.' };
});

ipcMain.handle('terminal:kill-process', async () => {
  if (activeTerminalProc) {
    const pid = activeTerminalProc.pid;
    try {
      if (process.platform === 'win32' && pid) {
        exec(`taskkill /pid ${pid} /T /F`, () => {});
      } else {
        activeTerminalProc.kill('SIGKILL');
      }
    } catch (_) {}
    activeTerminalProc = null;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('terminal:stream-output', { text: '\r\n^C\r\n[Process terminated by user (Kill / Ctrl+C)]\r\n' });
      mainWindow.webContents.send('terminal:process-exit', { code: -1, killed: true, cwd: currentTerminalCwd || tempDir });
    }
    return { success: true, killed: true };
  }
  return { success: true, noProcess: true };
});

ipcMain.handle('system:fix-security-policy', async () => {
  const batPath = path.join(__dirname, 'fix_device_guard_and_defender.bat');
  try {
    if (fs.existsSync(batPath)) {
      const cmd = `powershell -Command "Start-Process cmd.exe -Verb RunAs -ArgumentList '/c \"\"${batPath}\"\"'"`;
      exec(cmd, () => {});
      return { success: true };
    }
    return { success: false, error: 'fix_device_guard_and_defender.bat not found' };
  } catch (e) {
    return { success: false, error: e.message };
  }
});
