/**
 * ============================================================================
 * CODEVAULT HOST CONTROLLER ENGINE
 * - Visual contest builder (multi-problem stack & test cases array)
 * - JSON config compiler & file exporter (contest-config.json)
 * - LAN distribution server controller
 * - Competitive grading reporter & CSV leaderboard exporter
 * ============================================================================
 */

class HostController {
  constructor() {
    this.problems = [];
    this.currentSubmissions = [];
    this.serverRunning = false;

    this._initElements();
    this._bindEvents();
    this._loadInitialState();
  }

  _initElements() {
    // Builder Inputs
    this.titleInput = document.getElementById('builder-contest-title');
    this.idInput = document.getElementById('builder-contest-id');
    this.durationInput = document.getElementById('builder-contest-duration');
    this.languageSelect = document.getElementById('builder-contest-language');
    this.timeoutInput = document.getElementById('builder-contest-timeout');
    this.problemStackContainer = document.getElementById('builder-problem-stack');

    // Builder Buttons
    this.btnAddProblem = document.getElementById('btn-add-problem');
    this.btnGenerateId = document.getElementById('btn-generate-contest-id');
    this.btnExportJson = document.getElementById('btn-export-contest-json');
    this.btnSaveAndHost = document.getElementById('btn-save-and-host');
    this.btnLoadSample = document.getElementById('btn-load-sample-contest');
    this.btnImportContest = document.getElementById('btn-import-contest-file');

    // Server Tab Elements
    this.serverStatusText = document.getElementById('server-status-text');
    this.serverPortText = document.getElementById('server-port-text');
    this.serverActiveContestCode = document.getElementById('server-active-contest-code');
    this.serverIpsList = document.getElementById('server-ips-list');
    this.btnToggleServer = document.getElementById('btn-toggle-server');
    this.btnRefreshServer = document.getElementById('btn-refresh-server');

    // Grading Tab Elements
    this.gradingFolderInput = document.getElementById('grading-folder-input');
    this.btnChooseFolder = document.getElementById('btn-choose-grading-folder');
    this.btnScanSubmissions = document.getElementById('btn-scan-submissions');
    this.btnExportCsv = document.getElementById('btn-export-csv');
    this.leaderboardBody = document.getElementById('leaderboard-body');

    // Stats
    this.statTotalSubmissions = document.getElementById('stat-total-submissions');
    this.statHighestScore = document.getElementById('stat-highest-score');
    this.statFastestExec = document.getElementById('stat-fastest-exec');
    this.statTotalViolations = document.getElementById('stat-total-violations');

    // Inspector Modal
    this.inspectModal = document.getElementById('modal-inspect-submission');
    this.btnCloseInspect = document.getElementById('btn-close-inspect');
    this.inspectName = document.getElementById('inspect-name');
    this.inspectUsn = document.getElementById('inspect-usn');
    this.inspectScore = document.getElementById('inspect-score');
    this.inspectCpu = document.getElementById('inspect-cpu');
    this.inspectViolations = document.getElementById('inspect-violations');
    this.inspectCodeView = document.getElementById('inspect-code-view');
    this.inspectEvalLogs = document.getElementById('inspect-eval-logs');
  }

  _bindEvents() {
    // Host tabs switching
    document.querySelectorAll('.host-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.host-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.host-tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        const targetTab = document.getElementById(`host-tab-${btn.dataset.tab}`);
        if (targetTab) targetTab.classList.add('active');
      });
    });

    // Add problem
    if (this.btnAddProblem) {
      this.btnAddProblem.addEventListener('click', () => {
        this.addProblem();
      });
    }

    // Generate random token ID
    if (this.btnGenerateId) {
      this.btnGenerateId.addEventListener('click', () => {
        const token = 'CONTEST-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        this.idInput.value = token;
      });
    }

    // Export contest config
    if (this.btnExportJson) {
      this.btnExportJson.addEventListener('click', () => this.exportContestJson());
    }

    // Save & Host
    if (this.btnSaveAndHost) {
      this.btnSaveAndHost.addEventListener('click', () => this.saveAndHostContest());
    }

    // Load sample contest
    if (this.btnLoadSample) {
      this.btnLoadSample.addEventListener('click', () => this.loadSampleContest());
    }

    // Import contest file dialog
    if (this.btnImportContest) {
      this.btnImportContest.addEventListener('click', () => this.importContestFile());
    }

    // Server Controls
    if (this.btnToggleServer) {
      this.btnToggleServer.addEventListener('click', () => this.toggleServer());
    }
    if (this.btnRefreshServer) {
      this.btnRefreshServer.addEventListener('click', () => this.refreshServerStatus());
    }

    // Grading controls
    if (this.btnScanSubmissions) {
      this.btnScanSubmissions.addEventListener('click', () => this.scanGradingFolder());
    }
    if (this.btnChooseFolder) {
      this.btnChooseFolder.addEventListener('click', () => this.chooseGradingFolder());
    }
    if (this.btnExportCsv) {
      this.btnExportCsv.addEventListener('click', () => this.exportLeaderboardCsv());
    }

    // Inspector modal close
    if (this.btnCloseInspect) {
      this.btnCloseInspect.addEventListener('click', () => {
        this.inspectModal.classList.remove('active');
      });
    }
  }

  async _loadInitialState() {
    await this.refreshServerStatus();
    // Default to sample contest on startup
    await this.loadSampleContest(true);
    await this.scanGradingFolder();
  }

  // --------------------------------------------------------------------------
  // Contest Builder Engine
  // --------------------------------------------------------------------------
  addProblem(problemData = null) {
    const idx = this.problems.length + 1;
    const defaultProblem = problemData || {
      id: `prob_${idx}`,
      title: `Problem ${idx}: New Algorithmic Challenge`,
      category: 'Algorithms',
      difficulty: 'Medium',
      maxPoints: 30,
      timeLimitMs: 2000,
      description: 'Describe problem requirements, input/output specifications, and edge cases here.',
      starterCode: '#include <stdio.h>\n\nint main() {\n    // Type solution here\n    return 0;\n}\n',
      testCases: [
        { id: `tc_${idx}_1`, isSample: true, input: '5\n', expectedOutput: '10\n' },
        { id: `tc_${idx}_2`, isSample: false, input: '12\n', expectedOutput: '24\n' }
      ]
    };

    this.problems.push(defaultProblem);
    this.renderProblemCards();
  }

  renderProblemCards() {
    if (!this.problemStackContainer) return;
    this.problemStackContainer.innerHTML = '';

    this.problems.forEach((prob, pIndex) => {
      const card = document.createElement('div');
      card.className = 'problem-card';
      card.dataset.index = pIndex;

      card.innerHTML = `
        <div class="problem-card-top">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span class="problem-index-badge">PROBLEM #${pIndex + 1}</span>
            <input type="text" class="form-control prob-title" style="font-weight: 700; width: 340px;" value="${this._escape(prob.title)}">
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-danger btn-sm btn-delete-problem" data-index="${pIndex}">Remove</button>
          </div>
        </div>

        <div class="builder-grid-3">
          <div class="form-group">
            <label>Points</label>
            <input type="number" class="form-control prob-points" value="${prob.maxPoints || 30}">
          </div>
          <div class="form-group">
            <label>Difficulty</label>
            <select class="form-control prob-difficulty">
              <option value="Easy" ${prob.difficulty === 'Easy' ? 'selected' : ''}>Easy</option>
              <option value="Medium" ${prob.difficulty === 'Medium' ? 'selected' : ''}>Medium</option>
              <option value="Hard" ${prob.difficulty === 'Hard' ? 'selected' : ''}>Hard</option>
            </select>
          </div>
          <div class="form-group">
            <label>Timeout (ms)</label>
            <input type="number" class="form-control prob-timeout" value="${prob.timeLimitMs || 2000}">
          </div>
        </div>

        <div class="form-group">
          <label>Problem Statement Markdown</label>
          <textarea class="form-control prob-desc" rows="4">${this._escape(prob.description)}</textarea>
        </div>

        <div class="form-group">
          <label>Starter Code Template</label>
          <textarea class="form-control prob-starter" rows="3" style="font-family: var(--font-mono); font-size: 0.8rem;">${this._escape(prob.starterCode)}</textarea>
        </div>

        <!-- Dynamic Test Cases Stack -->
        <div class="test-cases-section">
          <div class="test-cases-header">
            <h4>Evaluation Test Cases (${prob.testCases.length})</h4>
            <button class="btn btn-secondary btn-sm btn-add-testcase" data-pindex="${pIndex}">+ Add Test Case</button>
          </div>
          <div class="test-cases-list" id="tc-list-${pIndex}">
            ${prob.testCases.map((tc, tcIndex) => `
              <div class="test-case-row">
                <div class="sample-check-box">
                  <input type="checkbox" class="tc-sample-check" data-pindex="${pIndex}" data-tcindex="${tcIndex}" ${tc.isSample ? 'checked' : ''}>
                  <span>${tc.isSample ? 'Sample' : 'Hidden'}</span>
                </div>
                <div class="form-group">
                  <label style="font-size: 0.7rem;">Stdin Input</label>
                  <textarea class="form-control tc-input" rows="2" style="font-size: 0.78rem;">${this._escape(tc.input)}</textarea>
                </div>
                <div class="form-group">
                  <label style="font-size: 0.7rem;">Expected Stdout</label>
                  <textarea class="form-control tc-output" rows="2" style="font-size: 0.78rem;">${this._escape(tc.expectedOutput)}</textarea>
                </div>
                <div>
                  <button class="btn btn-danger btn-sm btn-delete-testcase" style="padding: 4px 8px; margin-top: 18px;" data-pindex="${pIndex}" data-tcindex="${tcIndex}">✕</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;

      this.problemStackContainer.appendChild(card);
    });

    this._bindProblemCardEvents();
  }

  _bindProblemCardEvents() {
    // Delete problem
    this.problemStackContainer.querySelectorAll('.btn-delete-problem').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const pIndex = parseInt(e.target.dataset.index);
        this.problems.splice(pIndex, 1);
        this.renderProblemCards();
      });
    });

    // Add test case
    this.problemStackContainer.querySelectorAll('.btn-add-testcase').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const pIndex = parseInt(e.target.dataset.pindex);
        this._syncProblemsFromDom();
        this.problems[pIndex].testCases.push({
          id: `tc_${pIndex + 1}_${this.problems[pIndex].testCases.length + 1}`,
          isSample: false,
          input: '',
          expectedOutput: ''
        });
        this.renderProblemCards();
      });
    });

    // Delete test case
    this.problemStackContainer.querySelectorAll('.btn-delete-testcase').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const pIndex = parseInt(e.target.dataset.pindex);
        const tcIndex = parseInt(e.target.dataset.tcindex);
        this._syncProblemsFromDom();
        this.problems[pIndex].testCases.splice(tcIndex, 1);
        this.renderProblemCards();
      });
    });
  }

  _syncProblemsFromDom() {
    const cards = this.problemStackContainer.querySelectorAll('.problem-card');
    cards.forEach((card, pIndex) => {
      if (!this.problems[pIndex]) return;
      this.problems[pIndex].title = card.querySelector('.prob-title').value;
      this.problems[pIndex].maxPoints = parseInt(card.querySelector('.prob-points').value) || 30;
      this.problems[pIndex].difficulty = card.querySelector('.prob-difficulty').value;
      this.problems[pIndex].timeLimitMs = parseInt(card.querySelector('.prob-timeout').value) || 2000;
      this.problems[pIndex].description = card.querySelector('.prob-desc').value;
      this.problems[pIndex].starterCode = card.querySelector('.prob-starter').value;

      const tcRows = card.querySelectorAll('.test-case-row');
      tcRows.forEach((row, tcIndex) => {
        if (!this.problems[pIndex].testCases[tcIndex]) return;
        this.problems[pIndex].testCases[tcIndex].isSample = row.querySelector('.tc-sample-check').checked;
        this.problems[pIndex].testCases[tcIndex].input = row.querySelector('.tc-input').value;
        this.problems[pIndex].testCases[tcIndex].expectedOutput = row.querySelector('.tc-output').value;
      });
    });
  }

  compileContestConfig() {
    this._syncProblemsFromDom();
    return {
      id: this.idInput.value.trim() || 'CONTEST-' + Date.now(),
      title: this.titleInput.value.trim() || 'Competitive Programming Contest',
      token: this.idInput.value.trim() || 'CONTEST-TOKEN',
      durationMinutes: parseInt(this.durationInput.value) || 60,
      language: this.languageSelect.value || 'c',
      defaultTimeoutMs: parseInt(this.timeoutInput.value) || 2000,
      createdAt: new Date().toISOString(),
      problems: this.problems
    };
  }

  async exportContestJson() {
    const config = this.compileContestConfig();
    if (window.api && window.api.exportContestDialog) {
      const res = await window.api.exportContestDialog(config);
      if (res && res.success) {
        window.app.showToast(`Contest configuration exported to: ${res.filePath}`, 'success');
      }
    }
  }

  async saveAndHostContest() {
    const config = this.compileContestConfig();
    if (window.api && window.api.saveContestConfig) {
      const saveRes = await window.api.saveContestConfig(config);
      if (saveRes.success) {
        window.app.showToast(`Contest [${config.id}] saved and activated on Host Server.`, 'success');
        this.serverActiveContestCode.textContent = config.id;
        window.app.setActiveContest(config);
      }
    }
  }

  async loadSampleContest(silent = false) {
    try {
      let sample = null;
      if (window.api && window.api.getSampleContest) {
        const res = await window.api.getSampleContest();
        if (res.success) sample = res.contest;
      }
      if (!sample) {
        const response = await fetch('../sample-contest.json');
        if (response.ok) sample = await response.json();
      }

      if (sample) {
        this.titleInput.value = sample.title;
        this.idInput.value = sample.id || sample.token;
        this.durationInput.value = sample.durationMinutes || 60;
        this.languageSelect.value = sample.language || 'c';
        this.problems = sample.problems || [];
        this.renderProblemCards();

        window.app.setActiveContest(sample);
        if (!silent) {
          window.app.showToast('Sample Contest loaded into Contest Builder.', 'info');
        }
      }
    } catch (err) {
      console.warn('Could not load sample contest:', err);
    }
  }

  async importContestFile() {
    if (window.api && window.api.importContestDialog) {
      const res = await window.api.importContestDialog();
      if (res && res.success && res.config) {
        const c = res.config;
        this.titleInput.value = c.title || '';
        this.idInput.value = c.id || c.token || '';
        this.durationInput.value = c.durationMinutes || 60;
        this.languageSelect.value = c.language || 'c';
        this.problems = c.problems || [];
        this.renderProblemCards();
        window.app.setActiveContest(c);
        window.app.showToast(`Loaded contest package: ${c.title}`, 'success');
      }
    }
  }

  // --------------------------------------------------------------------------
  // Server & LAN Distribution
  // --------------------------------------------------------------------------
  async refreshServerStatus() {
    if (!window.api || !window.api.getServerStatus) return;
    const status = await window.api.getServerStatus();
    this.serverRunning = status.isRunning;

    this.serverStatusText.textContent = status.isRunning ? 'Server Status: Running' : 'Server Status: Stopped';
    this.serverPortText.textContent = status.port;
    this.btnToggleServer.textContent = status.isRunning ? 'Stop Server' : 'Start Server';
    this.btnToggleServer.className = status.isRunning ? 'btn btn-danger btn-sm' : 'btn btn-primary btn-sm';

    if (this.serverIpsList && status.ips) {
      this.serverIpsList.innerHTML = status.ips.map(ip => `
        <span class="server-info-badge">
          <span>IP:</span>
          <span class="ip-pill">http://${ip}:${status.port}</span>
        </span>
      `).join('');
    }
  }

  async toggleServer() {
    if (this.serverRunning) {
      await window.api.stopServer();
      window.app.showToast('Host Server stopped.', 'warning');
    } else {
      const config = this.compileContestConfig();
      await window.api.startServer({ port: 4500, contestConfig: config });
      window.app.showToast('Host Server started on port 4500.', 'success');
    }
    await this.refreshServerStatus();
  }

  // --------------------------------------------------------------------------
  // Grading Reporter Module
  // --------------------------------------------------------------------------
  async chooseGradingFolder() {
    if (window.api && window.api.pickGradingFolder) {
      const res = await window.api.pickGradingFolder();
      if (res.success) {
        this.gradingFolderInput.value = res.folderPath;
        await this.scanGradingFolder();
      }
    }
  }

  async scanGradingFolder() {
    if (!window.api || !window.api.scanGradingFolder) return;
    const folder = this.gradingFolderInput.value.trim() || null;
    const res = await window.api.scanGradingFolder(folder);

    if (res.success) {
      this.currentSubmissions = res.records || [];
      this._renderLeaderboard();
      window.app.showToast(`Scanned ${res.records.length} student submission records.`, 'info');
    } else {
      window.app.showToast('Failed to scan submissions folder: ' + res.error, 'error');
    }
  }

  _renderLeaderboard() {
    if (!this.leaderboardBody) return;

    if (this.currentSubmissions.length === 0) {
      this.leaderboardBody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; color: var(--text-muted); padding: 30px;">
            No student submissions found in scanned folder.
          </td>
        </tr>
      `;
      this.statTotalSubmissions.textContent = '0';
      this.statHighestScore.textContent = '0';
      this.statFastestExec.textContent = '0 ms';
      this.statTotalViolations.textContent = '0';
      return;
    }

    let highestScore = 0;
    let fastestTime = Infinity;
    let totalViolations = 0;

    this.leaderboardBody.innerHTML = this.currentSubmissions.map((rec) => {
      if (rec.totalScore > highestScore) highestScore = rec.totalScore;
      if (rec.totalExecutionTimeMs < fastestTime && rec.totalExecutionTimeMs > 0) fastestTime = rec.totalExecutionTimeMs;
      totalViolations += (rec.violationsCount || 0);

      const mins = Math.floor((rec.timeElapsedSeconds || 0) / 60);
      const secs = (rec.timeElapsedSeconds || 0) % 60;
      const formattedTime = `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;

      const rankBadgeClass = rec.rank === 1 ? 'rank-1' : rec.rank === 2 ? 'rank-2' : rec.rank === 3 ? 'rank-3' : '';

      return `
        <tr>
          <td>
            <span class="rank-badge ${rankBadgeClass}">#${rec.rank}</span>
          </td>
          <td style="font-family: var(--font-mono); font-weight: 700;">${this._escape(rec.usn)}</td>
          <td>${this._escape(rec.name)}</td>
          <td><span class="score-badge">${rec.totalScore} / ${rec.maxScore}</span></td>
          <td>${rec.problemsSolvedCount} / ${rec.totalProblems}</td>
          <td style="font-family: var(--font-mono); font-size: 0.82rem;">${formattedTime}</td>
          <td style="font-family: var(--font-mono); font-size: 0.82rem;">${rec.totalExecutionTimeMs} ms</td>
          <td>
            <span class="${rec.violationsCount > 0 ? 'strike-alert' : ''}">${rec.violationsCount} strikes</span>
          </td>
          <td>
            <button class="btn btn-secondary btn-sm btn-inspect-sub" data-usn="${this._escape(rec.usn)}">Inspect</button>
          </td>
        </tr>
      `;
    }).join('');

    this.statTotalSubmissions.textContent = this.currentSubmissions.length;
    this.statHighestScore.textContent = highestScore;
    this.statFastestExec.textContent = fastestTime === Infinity ? '0 ms' : `${fastestTime} ms`;
    this.statTotalViolations.textContent = totalViolations;

    // Attach inspect handlers
    this.leaderboardBody.querySelectorAll('.btn-inspect-sub').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const usn = e.target.dataset.usn;
        this.openSubmissionInspector(usn);
      });
    });
  }

  openSubmissionInspector(usn) {
    const rec = this.currentSubmissions.find(s => s.usn === usn);
    if (!rec) return;

    this.inspectName.textContent = rec.name;
    this.inspectUsn.textContent = rec.usn;
    this.inspectScore.textContent = `${rec.totalScore} / ${rec.maxScore}`;
    this.inspectCpu.textContent = `${rec.totalExecutionTimeMs} ms`;
    this.inspectViolations.textContent = rec.violationsCount;

    // Show candidate code from payload
    const p = rec.fullPayload;
    if (p && p.problemCodes) {
      let codeDisplay = '';
      for (const [probId, code] of Object.entries(p.problemCodes)) {
        codeDisplay += `// ==========================================\n// PROBLEM: ${probId}\n// ==========================================\n${code}\n\n`;
      }
      this.inspectCodeView.textContent = codeDisplay || '// No code recorded.';
    } else {
      this.inspectCodeView.textContent = '// No code recorded.';
    }

    // Evaluation logs
    if (p && p.problemEvaluations) {
      this.inspectEvalLogs.innerHTML = Object.entries(p.problemEvaluations).map(([probId, evalData]) => `
        <div style="background-color: var(--bg-card); padding: 8px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
          <strong style="color: var(--color-blue-bright);">${probId}</strong>: Passed ${evalData.passedCount}/${evalData.totalCount} test cases (${evalData.totalScore} pts, ${evalData.totalExecutionTimeMs}ms)
        </div>
      `).join('');
    } else {
      this.inspectEvalLogs.innerHTML = '<span style="color: var(--text-muted);">No detailed evaluation logs.</span>';
    }

    this.inspectModal.classList.add('active');
  }

  async exportLeaderboardCsv() {
    if (!window.api || !window.api.exportLeaderboardCsv) return;
    if (this.currentSubmissions.length === 0) {
      window.app.showToast('No submissions to export. Scan folder first.', 'warning');
      return;
    }

    const res = await window.api.exportLeaderboardCsv({
      records: this.currentSubmissions,
      contestTitle: this.titleInput.value || 'Contest'
    });

    if (res.success) {
      window.app.showToast(`Spreadsheet exported: ${res.filePath}`, 'success');
    }
  }

  _escape(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}

window.hostController = new HostController();
