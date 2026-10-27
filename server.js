const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

class ContestServer {
  constructor() {
    this.server = null;
    this.port = 4500;
    this.activeContest = null;
    this.submissions = [];
    this.isRunning = false;
    this.submissionsDir = path.join(__dirname, 'submissions');
    this.contestsDir = path.join(__dirname, 'contests');

    this._ensureDirectories();
  }

  _ensureDirectories() {
    if (!fs.existsSync(this.submissionsDir)) {
      fs.mkdirSync(this.submissionsDir, { recursive: true });
    }
    if (!fs.existsSync(this.contestsDir)) {
      fs.mkdirSync(this.contestsDir, { recursive: true });
    }
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
    if (contestConfig) {
      this.activeContest = contestConfig;
    }

    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        // CORS headers for flexible lab integration
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

        // Health / Discovery endpoint
        if (req.method === 'GET' && pathname === '/api/ping') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'online',
            service: 'MassCode Contest Host Server',
            contestActive: !!this.activeContest,
            contestId: this.activeContest ? this.activeContest.id : null,
            contestTitle: this.activeContest ? this.activeContest.title : null,
            time: new Date().toISOString()
          }));
          return;
        }

        // Fetch contest configuration: /api/contest/:code
        if (req.method === 'GET' && pathname.startsWith('/api/contest/')) {
          const code = pathname.replace('/api/contest/', '').trim().toLowerCase();
          if (!this.activeContest) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'No active contest hosted on this server.' }));
            return;
          }

          const idMatch = (this.activeContest.id || '').toLowerCase() === code;
          const tokenMatch = (this.activeContest.token || '').toLowerCase() === code;

          if (!idMatch && !tokenMatch) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `Contest ID mismatch. Provided: ${code}, Active: ${this.activeContest.id || this.activeContest.token}` }));
            return;
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(this.activeContest));
          return;
        }

        // Sync submission endpoint: POST /api/contest/sync-submission
        if (req.method === 'POST' && pathname === '/api/contest/sync-submission') {
          let body = '';
          req.on('data', chunk => {
            body += chunk.toString();
          });

          req.on('end', () => {
            try {
              const submission = JSON.parse(body);
              if (!submission.usn) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Missing USN in submission payload.' }));
                return;
              }

              const safeUsn = submission.usn.replace(/[^a-zA-Z0-9_-]/g, '_');
              const filename = `FINAL_${safeUsn}.json`;
              const filePath = path.join(this.submissionsDir, filename);

              // Persist to disk
              fs.writeFileSync(filePath, JSON.stringify(submission, null, 2), 'utf-8');

              // Track in memory
              const existingIdx = this.submissions.findIndex(s => s.usn === submission.usn);
              const summary = {
                usn: submission.usn,
                name: submission.name || 'Anonymous',
                score: submission.totalScore || 0,
                maxScore: submission.maxScore || 100,
                timeElapsedSeconds: submission.timeElapsedSeconds || 0,
                totalExecutionTimeMs: submission.totalExecutionTimeMs || 0,
                violations: submission.violations ? submission.violations.length : 0,
                syncedAt: new Date().toISOString(),
                filename: filename
              };

              if (existingIdx >= 0) {
                this.submissions[existingIdx] = summary;
              } else {
                this.submissions.push(summary);
              }

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: true,
                message: `Submission for ${submission.usn} successfully synced to Host.`,
                filename: filename,
                receivedAt: summary.syncedAt
              }));
            } catch (err) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Failed to process submission payload: ' + err.message }));
            }
          });
          return;
        }

        // Submissions summary endpoint: GET /api/submissions
        if (req.method === 'GET' && pathname === '/api/submissions') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            total: this.submissions.length,
            submissions: this.submissions
          }));
          return;
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Endpoint not found.' }));
      });

      this.server.listen(this.port, '0.0.0.0', () => {
        this.isRunning = true;
        console.log(`[Host Server] Running at port ${this.port}`);
        resolve({
          success: true,
          port: this.port,
          ips: this.getLocalIps()
        });
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
          console.log('[Host Server] Stopped.');
          resolve({ success: true });
        });
      } else {
        resolve({ success: true, message: 'Server not running.' });
      }
    });
  }

  setActiveContest(contestConfig) {
    this.activeContest = contestConfig;
    const configPath = path.join(this.contestsDir, `${contestConfig.id || 'contest-config'}.json`);
    fs.writeFileSync(configPath, JSON.stringify(contestConfig, null, 2), 'utf-8');
    return configPath;
  }
}

module.exports = new ContestServer();
