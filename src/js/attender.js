/**
 * ============================================================================
 * CODEVAULT ATTENDER OFFLINE ENGINE
 * - PIN initialization & institutional USN registration
 * - Monotonic isolated relative execution timer (immune to OS time-tampering)
 * - Problem switcher & state persistence
 * - "Run Test Cases" handler with native compiler bridge & green terminal stream
 * - Final submission packaging (FINAL_[USN].json) & network sync
 * ============================================================================
 */

class AttenderEngine {
  constructor() {
    this.contest = null;
    this.usn = '';
    this.name = '';
    this.currentProblemIndex = 0;
    this.problemCodes = {};
    this.problemEvaluations = {};

    // Isolated relative timer state
    this.timerInterval = null;
    this.uptimeSeconds = 0;
    this.durationSeconds = 3600; // default 60 minutes
    this.isContestActive = false;

    this._initElements();
    this._bindEvents();
  }

  _initElements() {
    // Init Overlay
    this.initOverlay = document.getElementById('attender-init-overlay');
    this.contestCodeInput = document.getElementById('attender-contest-code-input');
    this.hostUrlInput = document.getElementById('attender-host-url-input');
    this.usnInput = document.getElementById('attender-usn-input');
    this.nameInput = document.getElementById('attender-name-input');
    this.btnPullRemote = document.getElementById('btn-pull-remote-contest');
    this.btnLoadLocal = document.getElementById('btn-load-local-contest-attender');
    this.btnStartContest = document.getElementById('btn-start-contest-attender');
    this.initGccStatus = document.getElementById('init-gcc-status');
    this.initContestStatus = document.getElementById('init-contest-status');

    // Split Screen - Left Panel Elements
    this.problemNavTabs = document.getElementById('problem-nav-tabs');
    this.panelTitle = document.getElementById('panel-problem-title');
    this.panelCategory = document.getElementById('panel-problem-category');
    this.panelDifficulty = document.getElementById('panel-problem-difficulty');
    this.panelPoints = document.getElementById('panel-problem-points');
    this.panelDesc = document.getElementById('panel-problem-description');
    this.panelSampleInput = document.getElementById('panel-sample-input');
    this.panelSampleOutput = document.getElementById('panel-sample-output');

    // Left Bottom Metrics
    this.metricScore = document.getElementById('metric-problem-score');
    this.metricTestsPassed = document.getElementById('metric-tests-passed');
    this.metricCpuTime = document.getElementById('metric-cpu-time');

    // Right Panel Elements
    this.btnRunTests = document.getElementById('btn-run-tests');
    this.btnResetCode = document.getElementById('btn-reset-code');
    this.btnSubmitFinal = document.getElementById('btn-submit-final-contest');
    this.editorLangLabel = document.getElementById('editor-lang-label');
    this.autosaveIndicator = document.getElementById('attender-autosave-indicator');

    // Top Navigation Timer Elements
    this.navTimerBox = document.getElementById('nav-timer-box');
    this.navTimerDigits = document.getElementById('nav-timer-digits');

    // Submission Complete Modal
    this.submissionModal = document.getElementById('modal-submission-complete');
    this.submissionFilename = document.getElementById('submission-filename');
    this.finalModalScore = document.getElementById('final-modal-score');
    this.finalModalTime = document.getElementById('final-modal-time');
    this.finalModalCpu = document.getElementById('final-modal-cpu');
    this.finalModalStrikes = document.getElementById('final-modal-strikes');
    this.syncStatusDetail = document.getElementById('sync-status-detail');
    this.btnRetrySync = document.getElementById('btn-retry-sync');
    this.btnCloseSubmissionModal = document.getElementById('btn-close-submission-modal');
  }

  _bindEvents() {
    // Pull contest from Host Server over LAN
    if (this.btnPullRemote) {
      this.btnPullRemote.addEventListener('click', () => this.pullRemoteContest());
    }

    // Load local config file
    if (this.btnLoadLocal) {
      this.btnLoadLocal.addEventListener('click', () => this.loadLocalContestFile());
    }

    // Start contest
    if (this.btnStartContest) {
      this.btnStartContest.addEventListener('click', () => this.startContest());
    }

    // Run test cases button & Ctrl+Enter shortcut
    if (this.btnRunTests) {
      this.btnRunTests.addEventListener('click', () => this.runTestCases());
    }

    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (this.isContestActive) {
          e.preventDefault();
          this.runTestCases();
        }
      }
    });

    // Reset starter code
    if (this.btnResetCode) {
      this.btnResetCode.addEventListener('click', () => this.resetCurrentProblemCode());
    }

    // Final submit contest
    if (this.btnSubmitFinal) {
      this.btnSubmitFinal.addEventListener('click', () => this.confirmAndSubmitFinal());
    }

    // Code editor change -> track code in memory and trigger auto-save
    if (window.codeEditor) {
      window.codeEditor.onChange((newCode) => {
        if (this.contest && this.contest.problems[this.currentProblemIndex]) {
          const prob = this.contest.problems[this.currentProblemIndex];
          this.problemCodes[prob.id] = newCode;
          this._triggerAutosave();
        }
      });
    }

    // Retry Sync button in modal
    if (this.btnRetrySync) {
      this.btnRetrySync.addEventListener('click', () => this.retryFinalSync());
    }

    if (this.btnCloseSubmissionModal) {
      this.btnCloseSubmissionModal.addEventListener('click', () => {
        this.submissionModal.classList.remove('active');
        window.app.setMode('host');
      });
    }

    // Check USN validity to enable start button
    this.usnInput.addEventListener('input', () => this._checkReadyToStart());
  }

  _checkReadyToStart() {
    const hasUsn = this.usnInput.value.trim().length >= 3;
    const hasContest = !!this.contest;
    this.btnStartContest.disabled = !(hasUsn && hasContest);
  }

  async checkEnvironment() {
    if (window.api && window.api.getDiagnostics) {
      const diag = await window.api.getDiagnostics();
      if (diag.gcc && diag.gcc.available) {
        this.initGccStatus.textContent = diag.gcc.version;
        this.initGccStatus.className = 'status-badge-ok';
      } else {
        this.initGccStatus.textContent = 'GCC Compiler Not Found';
        this.initGccStatus.style.color = 'var(--color-red-bright)';
      }
    }
  }

  setContest(contestConfig) {
    this.contest = contestConfig;
    this.durationSeconds = (contestConfig.durationMinutes || 60) * 60;
    this.contestCodeInput.value = contestConfig.id || contestConfig.token || '';

    this.initContestStatus.textContent = `Ready: ${contestConfig.title} (${contestConfig.problems ? contestConfig.problems.length : 0} problems)`;
    this.initContestStatus.style.color = 'var(--color-green-bright)';

    this._checkReadyToStart();
  }

  async pullRemoteContest() {
    const code = this.contestCodeInput.value.trim();
    const hostUrl = this.hostUrlInput.value.trim() || 'http://localhost:4500';

    if (!code) {
      window.app.showToast('Please enter Contest Code.', 'warning');
      return;
    }

    window.syncBridge.setHostUrl(hostUrl);

    if (window.api && window.api.fetchRemoteContest) {
      this.initContestStatus.textContent = 'Contacting Host Server...';
      const res = await window.api.fetchRemoteContest({ hostUrl, contestCode: code });
      if (res.success && res.contest) {
        this.setContest(res.contest);
        window.app.showToast(`Contest package [${code}] pulled from Host Server.`, 'success');
      } else {
        this.initContestStatus.textContent = 'Failed to pull config';
        this.initContestStatus.style.color = 'var(--color-red-bright)';
        window.app.showToast('Remote pull error: ' + (res.error || 'Server unreachable'), 'error');
      }
    }
  }

  async loadLocalContestFile() {
    if (window.api && window.api.importContestDialog) {
      const res = await window.api.importContestDialog();
      if (res && res.success && res.config) {
        this.setContest(res.config);
        window.app.showToast(`Loaded local contest file: ${res.config.title}`, 'success');
      }
    }
  }

  // --------------------------------------------------------------------------
  // Contest Lifecycle & Isolated Relative Execution Timer
  // --------------------------------------------------------------------------
  async startContest() {
    this.usn = this.usnInput.value.trim().toUpperCase();
    this.name = this.nameInput.value.trim() || 'Candidate ' + this.usn;

    if (!this.contest || !this.usn) return;

    // Check if an existing session snapshot is present to recover from power-cut
    const existing = await window.syncBridge.loadSessionSnapshot(this.usn);
    if (existing) {
      window.app.showToast(`Restoring prior session snapshot for ${this.usn}...`, 'info');
      this.uptimeSeconds = existing.timeElapsedSeconds || 0;
      this.problemCodes = existing.problemCodes || {};
      this.problemEvaluations = existing.problemEvaluations || {};
      this.currentProblemIndex = existing.currentProblemIndex || 0;
    } else {
      // Initialize starter codes
      this.contest.problems.forEach((prob) => {
        if (!this.problemCodes[prob.id]) {
          this.problemCodes[prob.id] = prob.starterCode || '// Type solution here\n';
        }
      });
      this.uptimeSeconds = 0;
    }

    // Hide registration overlay, engage Anti-Cheat primitives
    this.initOverlay.style.display = 'none';
    this.isContestActive = true;
    window.antiCheatManager.activate();

    // Start Isolated Monotonic Relative Timer
    this._startRelativeTimer();

    // Render workspace tabs and first problem
    this.renderProblemTabs();
    this.selectProblem(this.currentProblemIndex);

    // Update navigation
    window.app.updateContestTitle(this.contest.title);
    if (this.navTimerBox) this.navTimerBox.style.display = 'flex';
  }

  /**
   * ISOLATED RELATIVE TIMER
   * Driven strictly by monotonic setInterval uptime counter (relative seconds)
   * OS system date changes have zero impact on this timer.
   */
  _startRelativeTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerInterval = setInterval(() => {
      if (!this.isContestActive) return;

      this.uptimeSeconds++;
      const remainingSeconds = Math.max(0, this.durationSeconds - this.uptimeSeconds);

      // Render countdown format HH:MM:SS
      const hours = Math.floor(remainingSeconds / 3600);
      const minutes = Math.floor((remainingSeconds % 3600) / 60);
      const seconds = remainingSeconds % 60;

      const pad = (n) => (n < 10 ? '0' + n : n);
      if (this.navTimerDigits) {
        this.navTimerDigits.textContent = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
      }

      // Visual warning when less than 5 minutes remaining
      if (remainingSeconds <= 300) {
        if (this.navTimerBox) this.navTimerBox.classList.add('warning');
      }

      // Timer expiration -> trigger automatic final submission
      if (remainingSeconds <= 0) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        window.app.showToast('TIME UP! Auto-submitting contest...', 'warning');
        this.submitFinalPayload(true);
      }
    }, 1000);
  }

  renderProblemTabs() {
    if (!this.problemNavTabs || !this.contest) return;
    this.problemNavTabs.innerHTML = '';

    this.contest.problems.forEach((prob, index) => {
      const btn = document.createElement('button');
      btn.className = `problem-tab-btn ${index === this.currentProblemIndex ? 'active' : ''}`;
      const evalData = this.problemEvaluations[prob.id];
      if (evalData && evalData.passedCount === evalData.totalCount && evalData.totalCount > 0) {
        btn.classList.add('solved');
      }

      btn.innerHTML = `<span>Problem ${index + 1}: ${this._escape(prob.title.substring(0, 18))}...</span> <span class="badge-points" style="font-size: 0.7rem;">${prob.maxPoints} pts</span>`;
      btn.addEventListener('click', () => {
        this.selectProblem(index);
      });
      this.problemNavTabs.appendChild(btn);
    });
  }

  selectProblem(index) {
    if (!this.contest || !this.contest.problems[index]) return;
    this.currentProblemIndex = index;
    const prob = this.contest.problems[index];

    // Update Tab Styles
    const tabs = this.problemNavTabs.querySelectorAll('.problem-tab-btn');
    tabs.forEach((t, i) => {
      if (i === index) t.classList.add('active');
      else t.classList.remove('active');
    });

    // Populate Left Panel
    this.panelTitle.textContent = prob.title;
    this.panelCategory.textContent = `Category: ${prob.category || 'General'} | Timeout: ${prob.timeLimitMs || 2000}ms`;
    this.panelDifficulty.textContent = prob.difficulty || 'Medium';
    this.panelPoints.textContent = `${prob.maxPoints || 30} Pts`;

    // Markdown description
    this.panelDesc.innerHTML = this._renderMarkdown(prob.description);

    // Sample Test Case
    const sampleTc = prob.testCases.find(tc => tc.isSample) || prob.testCases[0];
    if (sampleTc) {
      this.panelSampleInput.textContent = sampleTc.input || '(empty)';
      this.panelSampleOutput.textContent = sampleTc.expectedOutput || '(empty)';
    } else {
      this.panelSampleInput.textContent = '(no sample provided)';
      this.panelSampleOutput.textContent = '(no sample provided)';
    }

    // Populate Right Panel Code Editor
    const currentCode = this.problemCodes[prob.id] || prob.starterCode || '';
    window.codeEditor.setCode(currentCode);

    // Language display
    const lang = this.contest.language === 'cpp' ? 'C++ (G++ MinGW)' : 'C (GCC MinGW)';
    this.editorLangLabel.textContent = `${lang} // ${prob.title.substring(0, 20)}`;

    // Update execution metrics for this problem
    this._updateProblemMetrics(prob.id);
  }

  resetCurrentProblemCode() {
    if (!this.contest || !this.contest.problems[this.currentProblemIndex]) return;
    const prob = this.contest.problems[this.currentProblemIndex];
    if (confirm('Reset code to starter template? Any unsaved edits will be lost.')) {
      window.codeEditor.setCode(prob.starterCode || '');
      this.problemCodes[prob.id] = prob.starterCode || '';
      this._triggerAutosave();
    }
  }

  // --------------------------------------------------------------------------
  // Run Test Cases Handler
  // --------------------------------------------------------------------------
  async runTestCases() {
    if (!this.isContestActive || !this.contest) return;
    const prob = this.contest.problems[this.currentProblemIndex];
    const code = window.codeEditor.getCode();

    this.btnRunTests.disabled = true;
    this.btnRunTests.textContent = '⏳ Compiling & Running...';

    const result = await window.compilerTerminal.runEvaluation({
      code,
      language: this.contest.language || 'c',
      testCases: prob.testCases || [],
      timeoutMs: prob.timeLimitMs || 2000,
      maxPoints: prob.maxPoints || 100
    });

    this.btnRunTests.disabled = false;
    this.btnRunTests.textContent = '▶ Run Test Cases (Ctrl+Enter)';

    if (result && result.testResults) {
      // Store evaluation outcome
      this.problemEvaluations[prob.id] = {
        totalScore: result.totalScore,
        maxScore: result.maxScore,
        passedCount: result.passedCount,
        totalCount: result.totalCount,
        totalExecutionTimeMs: result.totalExecutionTimeMs,
        testResults: result.testResults,
        evaluatedAt: new Date().toISOString()
      };

      this._updateProblemMetrics(prob.id);
      this.renderProblemTabs();
      this._triggerAutosave();
    }
  }

  _updateProblemMetrics(probId) {
    const evalData = this.problemEvaluations[probId];
    const prob = this.contest.problems.find(p => p.id === probId);
    const maxPoints = prob ? prob.maxPoints : 100;

    if (evalData) {
      this.metricScore.textContent = `${evalData.totalScore} / ${maxPoints}`;
      this.metricTestsPassed.textContent = `${evalData.passedCount} / ${evalData.totalCount}`;
      this.metricCpuTime.textContent = `${evalData.totalExecutionTimeMs} ms`;
    } else {
      this.metricScore.textContent = `0 / ${maxPoints}`;
      this.metricTestsPassed.textContent = `0 / ${prob ? prob.testCases.length : 0}`;
      this.metricCpuTime.textContent = '0 ms';
    }
  }

  _triggerAutosave() {
    if (!this.isContestActive) return;
    window.syncBridge.saveSessionSnapshot({
      usn: this.usn,
      name: this.name,
      contestId: this.contest.id,
      timeElapsedSeconds: this.uptimeSeconds,
      currentProblemIndex: this.currentProblemIndex,
      problemCodes: this.problemCodes,
      problemEvaluations: this.problemEvaluations,
      violations: window.antiCheatManager.getAuditData().auditLog
    });

    if (this.autosaveIndicator) {
      this.autosaveIndicator.textContent = `SAVED TO SESSION_${this.usn}.json [${new Date().toLocaleTimeString()}]`;
    }
  }

  // --------------------------------------------------------------------------
  // Final Contest Submission & Packaging
  // --------------------------------------------------------------------------
  confirmAndSubmitFinal() {
    if (confirm('Are you sure you want to finalize your contest submission? Your code and evaluations will be locked and synced.')) {
      this.submitFinalPayload(false);
    }
  }

  async submitFinalPayload(isAutoTimeout = false) {
    this.isContestActive = false;
    if (this.timerInterval) clearInterval(this.timerInterval);

    // Calculate aggregated metrics
    let totalScore = 0;
    let maxContestScore = 0;
    let totalCpuMs = 0;
    let problemsSolved = 0;

    this.contest.problems.forEach(prob => {
      maxContestScore += (prob.maxPoints || 0);
      const ev = this.problemEvaluations[prob.id];
      if (ev) {
        totalScore += (ev.totalScore || 0);
        totalCpuMs += (ev.totalExecutionTimeMs || 0);
        if (ev.passedCount === ev.totalCount && ev.totalCount > 0) {
          problemsSolved++;
        }
      }
    });

    const auditData = window.antiCheatManager.getAuditData();

    // Immutable JSON payload
    const finalPayload = {
      usn: this.usn,
      name: this.name,
      contestId: this.contest.id,
      contestTitle: this.contest.title,
      totalScore,
      maxScore: maxContestScore,
      problemsSolvedCount: problemsSolved,
      totalProblems: this.contest.problems.length,
      timeElapsedSeconds: this.uptimeSeconds,
      totalExecutionTimeMs: Math.round(totalCpuMs * 10) / 10,
      isAutoTimeout,
      submittedAt: new Date().toISOString(),
      problemCodes: this.problemCodes,
      problemEvaluations: this.problemEvaluations,
      violationStrikes: auditData.violationCount,
      violations: auditData.auditLog
    };

    // Deactivate anti-cheat screen lock
    window.antiCheatManager.deactivate();

    // Package to disk and sync over network bridge
    this.lastPayload = finalPayload;
    const submitResult = await window.syncBridge.submitFinalPayload(finalPayload);

    // Show Completion Modal
    this.submissionFilename.textContent = submitResult.filename;
    this.finalModalScore.textContent = `${totalScore} / ${maxContestScore}`;
    const mins = Math.floor(this.uptimeSeconds / 60);
    const secs = this.uptimeSeconds % 60;
    this.finalModalTime.textContent = `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
    this.finalModalCpu.textContent = `${Math.round(totalCpuMs * 10) / 10} ms`;
    this.finalModalStrikes.textContent = auditData.violationCount;

    if (submitResult.sync.success) {
      this.syncStatusDetail.textContent = `✔ SYNCED OVER LAN: ${submitResult.sync.message}`;
      this.syncStatusDetail.style.color = 'var(--color-green-bright)';
    } else {
      this.syncStatusDetail.textContent = `⚠ SAVED OFFLINE TO DISK: ${submitResult.sync.error}. Pending network recovery sync.`;
      this.syncStatusDetail.style.color = 'var(--color-amber-bright)';
    }

    this.submissionModal.classList.add('active');
  }

  async retryFinalSync() {
    if (!this.lastPayload) return;
    this.syncStatusDetail.textContent = 'Retrying sync to Host Server...';
    this.syncStatusDetail.style.color = 'var(--color-blue-bright)';

    const res = await window.syncBridge.submitFinalPayload(this.lastPayload);
    if (res.sync.success) {
      this.syncStatusDetail.textContent = `✔ SYNCED OVER LAN: ${res.sync.message}`;
      this.syncStatusDetail.style.color = 'var(--color-green-bright)';
    } else {
      this.syncStatusDetail.textContent = `⚠ SYNC RETRY FAILED: ${res.sync.error}`;
      this.syncStatusDetail.style.color = 'var(--color-red-bright)';
    }
  }

  _renderMarkdown(md) {
    if (!md) return '';
    return md
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/`([^`]+)`/gim, '<code>$1</code>')
      .replace(/\n\n/gim, '<br><br>')
      .replace(/\n/gim, '<br>');
  }

  _escape(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}

window.attenderEngine = new AttenderEngine();
