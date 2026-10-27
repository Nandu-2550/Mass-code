/**
 * ============================================================================
 * MASS-CODE RENDERER ENGINE
 * - Dynamic view router (Welcome, Host, Competitor, Thank You)
 * - Multi-tier Question Bank manager (Easy, Medium, Hard)
 * - Isolated monotonic relative timer & auto-timeout safety
 * - Native compiler streaming terminal sandbox
 * - Strict clipboard lockdown & supervisor emergency key override
 * ============================================================================
 */

class MassCodeApp {
  constructor() {
    this.currentView = 'welcome';
    this.activeContest = null;
    this.supervisorEmergencyKey = 'MASSCODE_EMERGENCY_2026';

    // Competitor State
    this.competitor = {
      usn: '',
      name: '',
      hostUrl: 'http://localhost:4500',
      activeProblemId: null,
      selectedTier: 'easy', // 'easy' | 'medium' | 'hard'
      problemCodes: {},
      evaluations: {},
      violations: [],
      uptimeSeconds: 0,
      durationSeconds: 3600,
      timerInterval: null,
      isSessionActive: false
    };

    // Host State
    this.hostProblems = [];
    this.hostSubmissions = [];

    this._initElements();
    this._bindEvents();
    this._initDiagnostics();
  }

  _initElements() {
    // Views
    this.viewWelcome = document.getElementById('view-welcome');
    this.viewHost = document.getElementById('view-host');
    this.viewCompetitor = document.getElementById('view-competitor');
    this.viewThankyou = document.getElementById('view-thankyou');

    // Header Controls
    this.navCandidatePill = document.getElementById('nav-candidate-pill');
    this.navCandidateUsn = document.getElementById('nav-candidate-usn');
    this.navTimerBox = document.getElementById('nav-timer-box');
    this.navTimerDigits = document.getElementById('nav-timer-digits');
    this.navKioskBadge = document.getElementById('nav-kiosk-badge');
    this.btnEndSession = document.getElementById('btn-end-session');
    this.btnExitHost = document.getElementById('btn-exit-host');
    this.btnSupervisorKey = document.getElementById('btn-supervisor-key');

    // Welcome Screen
    this.cardEnterHost = document.getElementById('card-enter-host');
    this.cardEnterCompetitor = document.getElementById('card-enter-competitor');
    this.welcomeGccStatus = document.getElementById('welcome-gcc-status');
    this.welcomeArchStatus = document.getElementById('welcome-arch-status');
    this.welcomeIpStatus = document.getElementById('welcome-ip-status');

    // Host Screen Elements
    this.hostTabs = document.querySelectorAll('.host-tab-btn');
    this.hostTitleInput = document.getElementById('host-contest-title');
    this.hostTokenInput = document.getElementById('host-contest-token');
    this.hostDurationInput = document.getElementById('host-contest-duration');
    this.hostProblemsList = document.getElementById('host-problems-list');
    this.btnHostAddProblem = document.getElementById('btn-host-add-problem');
    this.btnHostLoadSample = document.getElementById('btn-host-load-sample');
    this.btnHostImport = document.getElementById('btn-host-import');
    this.btnHostExport = document.getElementById('btn-host-export');
    this.btnHostDeployTop = document.getElementById('btn-host-deploy-top');
    this.btnHostDeployBottom = document.getElementById('btn-host-deploy-bottom');
    this.serverGuidePin = document.getElementById('server-guide-pin');
    this.btnHostToggleServer = document.getElementById('btn-host-toggle-server');
    this.serverPortVal = document.getElementById('server-port-val');
    this.serverContestVal = document.getElementById('server-contest-val');
    this.serverStateVal = document.getElementById('server-state-val');
    this.serverIpBadges = document.getElementById('server-ip-badges');
    this.btnHostScanFolder = document.getElementById('btn-host-scan-folder');
    this.btnHostExportCsv = document.getElementById('btn-host-export-csv');
    this.hostLeaderboardTbody = document.getElementById('host-leaderboard-tbody');
    this.gradingCountLabel = document.getElementById('grading-count-label');

    // Competitor Overlay & Registration
    this.compRegOverlay = document.getElementById('competitor-reg-overlay');
    this.lanDiscoveryBox = document.getElementById('lan-discovery-box');
    this.lanDiscoveryDot = document.getElementById('lan-discovery-dot');
    this.lanDiscoveryTitle = document.getElementById('lan-discovery-title');
    this.lanDiscoverySub = document.getElementById('lan-discovery-sub');
    this.btnLanAutoConnect = document.getElementById('btn-lan-auto-connect');
    this.compPinInput = document.getElementById('comp-pin-input');
    this.compHostUrl = document.getElementById('comp-host-url');
    this.compUsnInput = document.getElementById('comp-usn-input');
    this.compNameInput = document.getElementById('comp-name-input');
    this.btnCompPullLan = document.getElementById('btn-comp-pull-lan');
    this.btnCompLoadLocal = document.getElementById('btn-comp-load-local');
    this.btnCompStartContest = document.getElementById('btn-comp-start-contest');

    // Competitor Multi-Tier Question Bank
    this.competitorWorkspace = document.getElementById('competitor-workspace');
    this.competitorBankView = document.getElementById('competitor-bank-view');
    this.competitorWorkspaceView = document.getElementById('competitor-workspace-view');
    this.tierBtnEasy = document.getElementById('tier-btn-easy');
    this.tierBtnMedium = document.getElementById('tier-btn-medium');
    this.tierBtnHard = document.getElementById('tier-btn-hard');
    this.tierCountEasy = document.getElementById('tier-count-easy');
    this.tierCountMedium = document.getElementById('tier-count-medium');
    this.tierCountHard = document.getElementById('tier-count-hard');
    this.tierStatusEasy = document.getElementById('tier-status-easy');
    this.tierStatusMedium = document.getElementById('tier-status-medium');
    this.tierStatusHard = document.getElementById('tier-status-hard');
    this.matrixTierHeading = document.getElementById('matrix-tier-heading');
    this.matrixTierSummary = document.getElementById('matrix-tier-summary');
    this.questionMatrixList = document.getElementById('question-matrix-list');

    // Problem Workspace Split View
    this.btnBackToBank = document.getElementById('btn-back-to-bank');
    this.wsProblemTitle = document.getElementById('ws-problem-title');
    this.wsProblemTierTag = document.getElementById('ws-problem-tier-tag');
    this.wsProblemPoints = document.getElementById('ws-problem-points');
    this.wsProblemDesc = document.getElementById('ws-problem-desc');
    this.wsSampleInput = document.getElementById('ws-sample-input');
    this.wsSampleOutput = document.getElementById('ws-sample-output');
    this.wsMetricScore = document.getElementById('ws-metric-score');
    this.wsMetricTests = document.getElementById('ws-metric-tests');
    this.wsMetricCpu = document.getElementById('ws-metric-cpu');
    this.editorGutter = document.getElementById('editor-gutter');
    this.editorCode = document.getElementById('editor-code');
    this.clipboardToast = document.getElementById('clipboard-toast');
    this.terminalTopStatus = document.getElementById('terminal-top-status');
    this.terminalStream = document.getElementById('terminal-stream');
    this.wsAutosaveTag = document.getElementById('ws-autosave-tag');
    this.btnWsResetCode = document.getElementById('btn-ws-reset-code');
    this.btnWsClearTerm = document.getElementById('btn-ws-clear-term');
    this.btnWsRunTests = document.getElementById('btn-ws-run-tests');

    // Thank You Screen
    this.tyTotalScore = document.getElementById('ty-total-score');
    this.tyDuration = document.getElementById('ty-duration');
    this.tyCandidateUsn = document.getElementById('ty-candidate-usn');
    this.tyPayloadFile = document.getElementById('ty-payload-file');
    this.tySyncStatus = document.getElementById('ty-sync-status');
    this.btnTyReturnHome = document.getElementById('btn-ty-return-home');

    // Modals
    this.modalEndSession = document.getElementById('modal-end-session-warning');
    this.btnCancelEndSession = document.getElementById('btn-cancel-end-session');
    this.btnConfirmEndSession = document.getElementById('btn-confirm-end-session');

    this.modalSupervisor = document.getElementById('modal-supervisor-override');
    this.supervisorKeyInput = document.getElementById('supervisor-key-input');
    this.supervisorKeyError = document.getElementById('supervisor-key-error');
    this.btnCancelSupervisorKey = document.getElementById('btn-cancel-supervisor-key');
    this.btnConfirmSupervisorKey = document.getElementById('btn-confirm-supervisor-key');

    this.modalViolation = document.getElementById('modal-violation');
    this.violationCountLabel = document.getElementById('violation-count-label');
    this.btnAcknowledgeViolation = document.getElementById('btn-acknowledge-violation');

    this.modalInspector = document.getElementById('modal-inspector');
    this.btnCloseInspector = document.getElementById('btn-close-inspector');
    this.inspectUsn = document.getElementById('inspect-usn');
    this.inspectName = document.getElementById('inspect-name');
    this.inspectScore = document.getElementById('inspect-score');
    this.inspectCodeArea = document.getElementById('inspect-code-area');

    this.toastBox = document.getElementById('toast-box');
  }

  _bindEvents() {
    // Mode Selection triggers
    this.cardEnterHost.addEventListener('click', () => this.switchView('host'));
    this.cardEnterCompetitor.addEventListener('click', () => this.switchView('competitor'));
    this.btnExitHost.addEventListener('click', () => this.switchView('welcome'));
    this.btnTyReturnHome.addEventListener('click', () => this.switchView('welcome'));

    // Host Tabs
    this.hostTabs.forEach(btn => {
      btn.addEventListener('click', () => {
        this.hostTabs.forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.host-content-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const target = document.getElementById(`host-panel-${btn.dataset.tab}`);
        if (target) target.classList.add('active');
      });
    });

    // Host Actions
    this.btnHostAddProblem.addEventListener('click', () => this._addHostProblem());
    this.btnHostLoadSample.addEventListener('click', () => this._loadDefaultContestTemplate());
    this.btnHostImport.addEventListener('click', () => this._importContestDialog());
    this.btnHostExport.addEventListener('click', () => this._exportContestDialog());
    const handleDeployContest = () => this._deployHostContest();
    if (this.btnHostDeployTop) this.btnHostDeployTop.addEventListener('click', handleDeployContest);
    if (this.btnHostDeployBottom) this.btnHostDeployBottom.addEventListener('click', handleDeployContest);
    this.btnHostToggleServer.addEventListener('click', () => this._toggleHostServer());
    this.btnHostScanFolder.addEventListener('click', () => this._scanHostSubmissions());
    this.btnHostExportCsv.addEventListener('click', () => this._exportLeaderboardCsv());
    this.btnCloseInspector.addEventListener('click', () => this.modalInspector.classList.remove('active'));

    // Competitor Overlay Triggers
    this.compUsnInput.addEventListener('input', () => {
      const ok = this.compUsnInput.value.trim().length >= 3 && !!this.activeContest;
      this.btnCompStartContest.disabled = !ok;
    });
    if (this.btnLanAutoConnect) {
      this.btnLanAutoConnect.addEventListener('click', () => this._pullContestOverLan());
    }
    this.btnCompPullLan.addEventListener('click', () => this._pullContestOverLan());
    this.btnCompLoadLocal.addEventListener('click', () => this._loadContestLocalForCompetitor());
    this.btnCompStartContest.addEventListener('click', () => this._startCompetitorSession());

    // Competitor Multi-Tier Question Bank Buttons
    [this.tierBtnEasy, this.tierBtnMedium, this.tierBtnHard].forEach(btn => {
      btn.addEventListener('click', () => {
        [this.tierBtnEasy, this.tierBtnMedium, this.tierBtnHard].forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.competitor.selectedTier = btn.dataset.tier;
        this._renderQuestionMatrix();
      });
    });

    // Breadcrumb Return from Problem Workspace to Question Bank
    this.btnBackToBank.addEventListener('click', () => {
      this.competitorWorkspaceView.style.display = 'none';
      this.competitorBankView.style.display = 'flex';
      this._renderQuestionMatrix();
    });

    // Monospace Editor Events
    this._bindEditorEvents();

    // End Session Triggers
    this.btnEndSession.addEventListener('click', () => {
      this.modalEndSession.classList.add('active');
    });
    this.btnCancelEndSession.addEventListener('click', () => {
      this.modalEndSession.classList.remove('active');
    });
    this.btnConfirmEndSession.addEventListener('click', () => {
      this.modalEndSession.classList.remove('active');
      this._finalizeSession(false);
    });

    // Supervisor Emergency Key Override
    this.btnSupervisorKey.addEventListener('click', () => {
      this.supervisorKeyInput.value = '';
      this.supervisorKeyError.style.display = 'none';
      this.modalSupervisor.classList.add('active');
      this.supervisorKeyInput.focus();
    });
    this.btnCancelSupervisorKey.addEventListener('click', () => {
      this.modalSupervisor.classList.remove('active');
    });
    this.btnConfirmSupervisorKey.addEventListener('click', () => this._verifySupervisorOverride());
    this.supervisorKeyInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._verifySupervisorOverride();
    });

    // Violation Warning Modal
    this.btnAcknowledgeViolation.addEventListener('click', () => {
      this.modalViolation.classList.remove('active');
      window.focus();
    });

    // IPC Listeners
    if (window.api) {
      window.api.onWindowBlur(() => {
        if (this.currentView === 'competitor' && this.competitor.isSessionActive) {
          this._handleWindowBlur();
        }
      });

      window.api.onCompilerProgress((prog) => {
        if (prog.phase === 'compiling') {
          this.terminalTopStatus.textContent = 'STATUS // COMPILING GCC...';
          this._appendTerminalLine(`<span style="color: var(--color-cyan);">&gt; ${prog.message}</span>`);
        } else if (prog.phase === 'running_test') {
          this.terminalTopStatus.textContent = `STATUS // EVALUATING [${prog.index}/${prog.total}]...`;
        }
      });

      if (window.api.onHostDiscovered) {
        window.api.onHostDiscovered((data) => this._handleLanHostDiscovered(data));
      }
    }
  }

  // --------------------------------------------------------------------------
  // DIAGNOSTICS & VIEW ROUTER
  // --------------------------------------------------------------------------
  async _initDiagnostics() {
    if (!window.api) return;
    const diag = await window.api.getDiagnostics();
    if (diag.gcc && diag.gcc.available) {
      this.welcomeGccStatus.textContent = diag.gcc.version;
      this.welcomeGccStatus.className = 'status-ok';
    } else {
      this.welcomeGccStatus.textContent = 'GCC Missing';
      this.welcomeGccStatus.style.color = 'var(--color-rose)';
    }
    this.welcomeArchStatus.textContent = `${diag.os} (${diag.arch})`;
    this.welcomeIpStatus.textContent = diag.serverIps ? diag.serverIps.join(', ') : '127.0.0.1';

    // Auto-load default contest template
    const def = await window.api.getDefaultContest();
    if (def.success) {
      this.activeContest = def.contest;
      this._populateHostContest(def.contest);
    }
  }

  async switchView(viewName) {
    this.currentView = viewName;
    document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));

    // Apply strict OS window security rules
    if (window.api && window.api.setSecurityMode) {
      await window.api.setSecurityMode({ mode: viewName });
    }

    if (viewName === 'welcome') {
      this.viewWelcome.classList.add('active');
      this.navCandidatePill.style.display = 'none';
      this.navTimerBox.style.display = 'none';
      this.navKioskBadge.style.display = 'none';
      this.btnEndSession.style.display = 'none';
      this.btnExitHost.style.display = 'none';
      this.btnSupervisorKey.style.display = 'none';
    } else if (viewName === 'host') {
      this.viewHost.classList.add('active');
      this.navCandidatePill.style.display = 'none';
      this.navTimerBox.style.display = 'none';
      this.navKioskBadge.style.display = 'none';
      this.btnEndSession.style.display = 'none';
      this.btnExitHost.style.display = 'inline-flex';
      this.btnSupervisorKey.style.display = 'none';

      this._refreshHostServerStatus();
      this._scanHostSubmissions();
    } else if (viewName === 'competitor') {
      this.viewCompetitor.classList.add('active');
      this.btnExitHost.style.display = 'none';

      if (!this.competitor.isSessionActive) {
        if (window.api && window.api.startLanListening) {
          window.api.startLanListening();
        }
        this.compRegOverlay.style.display = 'flex';
        this.competitorWorkspace.style.display = 'none';
        this.navCandidatePill.style.display = 'none';
        this.navTimerBox.style.display = 'none';
        this.navKioskBadge.style.display = 'none';
        this.btnEndSession.style.display = 'none';
        this.btnSupervisorKey.style.display = 'none';
      } else {
        this.compRegOverlay.style.display = 'none';
        this.competitorWorkspace.style.display = 'flex';
        this.navCandidatePill.style.display = 'inline-flex';
        this.navTimerBox.style.display = 'inline-flex';
        this.navKioskBadge.style.display = 'inline-flex';
        this.btnEndSession.style.display = 'inline-flex';
        this.btnSupervisorKey.style.display = 'inline-flex';
      }
    } else if (viewName === 'thankyou') {
      this.viewThankyou.classList.add('active');
      this.navCandidatePill.style.display = 'none';
      this.navTimerBox.style.display = 'none';
      this.navKioskBadge.style.display = 'none';
      this.btnEndSession.style.display = 'none';
      this.btnExitHost.style.display = 'none';
      this.btnSupervisorKey.style.display = 'none';
    }
  }

  _handleLanHostDiscovered(data) {
    if (!this.lanDiscoveryBox) return;

    this.lanDiscoveryBox.style.background = 'rgba(0, 200, 83, 0.08)';
    this.lanDiscoveryBox.style.borderColor = 'rgba(0, 200, 83, 0.4)';
    if (this.lanDiscoveryDot) {
      this.lanDiscoveryDot.style.background = 'var(--color-emerald)';
      this.lanDiscoveryDot.style.boxShadow = '0 0 10px var(--color-emerald)';
    }
    if (this.lanDiscoveryTitle) {
      this.lanDiscoveryTitle.textContent = `🟢 Active Contest Discovered: ${data.contestTitle || 'Mass-Code Contest'}`;
    }
    if (this.lanDiscoverySub) {
      this.lanDiscoverySub.textContent = `Host: ${data.url} | PIN: ${data.contestToken || 'MASS2026'}`;
    }

    if (!this.compHostUrl.value || this.compHostUrl.value.includes('localhost') || this.compHostUrl.value.includes('4500')) {
      this.compHostUrl.value = data.url;
    }
    if (data.contestToken && (!this.compPinInput.value || this.compPinInput.value === 'MASS2026')) {
      this.compPinInput.value = data.contestToken;
    }

    if (this.btnLanAutoConnect) {
      this.btnLanAutoConnect.style.display = 'inline-flex';
    }
  }

  // --------------------------------------------------------------------------
  // COMPETITOR WORKFLOW & MULTI-TIER QUESTION BANK
  // --------------------------------------------------------------------------
  async _pullContestOverLan() {
    const code = this.compPinInput.value.trim();
    const hostUrl = this.compHostUrl.value.trim() || 'http://localhost:8080';
    if (!code) return this.showToast('Please enter Contest Code.', 'warning');

    const res = await window.api.fetchRemoteContest({ hostUrl, contestCode: code });
    if (res.success && res.contest) {
      this.activeContest = res.contest;
      this.showToast(`Contest "${res.contest.title}" pulled from Host.`, 'success');
      this.btnCompStartContest.disabled = this.compUsnInput.value.trim().length < 3;
    } else {
      this.showToast('Failed to pull contest: ' + (res.error || 'Server offline'), 'error');
    }
  }

  async _loadContestLocalForCompetitor() {
    const res = await window.api.importContestDialog();
    if (res.success && res.config) {
      this.activeContest = res.config;
      this.showToast(`Loaded "${res.config.title}".`, 'success');
      this.btnCompStartContest.disabled = this.compUsnInput.value.trim().length < 3;
    }
  }

  async _startCompetitorSession() {
    const usn = this.compUsnInput.value.trim().toUpperCase();
    const name = this.compNameInput.value.trim() || 'Candidate ' + usn;

    if (!usn || !this.activeContest) return;

    this.competitor.usn = usn;
    this.competitor.name = name;
    this.competitor.hostUrl = this.compHostUrl.value.trim() || 'http://localhost:8080';
    this.competitor.durationSeconds = (this.activeContest.durationMinutes || 60) * 60;
    this.competitor.uptimeSeconds = 0;
    this.competitor.isSessionActive = true;

    // Check for prior session snapshot for crash/power-cut recovery
    const snap = await window.api.loadSessionSnapshot({ usn });
    if (snap.success && snap.found && snap.data) {
      this.showToast(`Restoring prior session snapshot for ${usn}...`, 'info');
      this.competitor.uptimeSeconds = snap.data.timeElapsedSeconds || 0;
      this.competitor.problemCodes = snap.data.problemCodes || {};
      this.competitor.evaluations = snap.data.evaluations || {};
    } else {
      // Seed starter codes
      this.activeContest.problems.forEach(p => {
        this.competitor.problemCodes[p.id] = p.starterCode || '// Write solution here\n';
      });
    }

    // Switch to active kiosk workspace
    this.compRegOverlay.style.display = 'none';
    this.competitorWorkspace.style.display = 'flex';
    this.competitorBankView.style.display = 'flex';
    this.competitorWorkspaceView.style.display = 'none';

    // Update navigation
    this.navCandidateUsn.textContent = `${usn} (${name})`;
    this.navCandidatePill.style.display = 'inline-flex';
    this.navTimerBox.style.display = 'inline-flex';
    this.navKioskBadge.style.display = 'inline-flex';
    this.btnEndSession.style.display = 'inline-flex';
    this.btnSupervisorKey.style.display = 'inline-flex';

    // Start Isolated Monotonic Relative Timer
    this._startRelativeCountdown();

    // Render Question Bank
    this._renderTierBadges();
    this._renderQuestionMatrix();
  }

  /**
   * Monotonic relative timer: counts uptime seconds independently of OS system date.
   */
  _startRelativeCountdown() {
    if (this.competitor.timerInterval) clearInterval(this.competitor.timerInterval);

    this.competitor.timerInterval = setInterval(() => {
      if (!this.competitor.isSessionActive) return;

      this.competitor.uptimeSeconds++;
      const remain = Math.max(0, this.competitor.durationSeconds - this.competitor.uptimeSeconds);

      const h = Math.floor(remain / 3600);
      const m = Math.floor((remain % 3600) / 60);
      const s = remain % 60;
      const pad = n => n < 10 ? '0' + n : n;
      this.navTimerDigits.textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;

      if (remain <= 300) {
        this.navTimerBox.classList.add('warning');
      }

      // Automated Timeout Safety: drops to zero -> auto save and advance straight to thank-you!
      if (remain <= 0) {
        clearInterval(this.competitor.timerInterval);
        this.competitor.timerInterval = null;
        this.showToast('TIME EXPIRED! Finalizing contest answers...', 'warning');
        this._finalizeSession(true);
      }
    }, 1000);
  }

  _renderTierBadges() {
    if (!this.activeContest) return;
    const problems = this.activeContest.problems || [];

    const easyList = problems.filter(p => (p.tier || 'easy').toLowerCase() === 'easy');
    const medList = problems.filter(p => (p.tier || '').toLowerCase() === 'medium');
    const hardList = problems.filter(p => (p.tier || '').toLowerCase() === 'hard');

    const countPassed = list => list.filter(p => {
      const ev = this.competitor.evaluations[p.id];
      return ev && ev.passedCount === ev.totalCount && ev.totalCount > 0;
    }).length;

    this.tierCountEasy.textContent = `${easyList.length} Qs`;
    this.tierStatusEasy.textContent = `${countPassed(easyList)} / ${easyList.length} Verified`;

    this.tierCountMedium.textContent = `${medList.length} Qs`;
    this.tierStatusMedium.textContent = `${countPassed(medList)} / ${medList.length} Verified`;

    this.tierCountHard.textContent = `${hardList.length} Qs`;
    this.tierStatusHard.textContent = `${countPassed(hardList)} / ${hardList.length} Verified`;
  }

  _renderQuestionMatrix() {
    this._renderTierBadges();
    const tier = this.competitor.selectedTier;
    const tierName = tier.charAt(0).toUpperCase() + tier.slice(1);
    this.matrixTierHeading.textContent = `${tierName} Tier Problems`;

    const problems = (this.activeContest.problems || []).filter(p => (p.tier || 'easy').toLowerCase() === tier);
    this.questionMatrixList.innerHTML = '';

    if (problems.length === 0) {
      this.questionMatrixList.innerHTML = `<div style="color: var(--text-muted); padding: 30px;">No problems assigned to ${tierName} tier.</div>`;
      return;
    }

    problems.forEach(p => {
      const card = document.createElement('div');
      card.className = 'question-card';

      // Calculate Status Indicator Tag
      let statusClass = 'status-not-attempted';
      let statusLabel = 'Not Attempted';

      const ev = this.competitor.evaluations[p.id];
      const hasCode = this.competitor.problemCodes[p.id] && this.competitor.problemCodes[p.id].trim() !== (p.starterCode || '').trim();

      if (ev && ev.passedCount === ev.totalCount && ev.totalCount > 0) {
        statusClass = 'status-passed';
        statusLabel = 'Passed Verification';
      } else if (hasCode || ev) {
        statusClass = 'status-attempting';
        statusLabel = 'Attempting / Saved';
      }

      card.innerHTML = `
        <div class="question-card-left">
          <div class="question-card-title">${this._escape(p.title)}</div>
          <span class="status-tag ${statusClass}">● ${statusLabel}</span>
          <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 4px;">
            Points: <strong style="color: var(--color-emerald);">${p.maxPoints} pts</strong> | Category: ${this._escape(p.category || 'General')}
          </div>
        </div>
        <button class="btn btn-primary btn-sm btn-open-workspace" data-id="${p.id}">
          Open Problem Workspace →
        </button>
      `;

      card.querySelector('.btn-open-workspace').addEventListener('click', () => {
        this._openProblemWorkspace(p.id);
      });

      this.questionMatrixList.appendChild(card);
    });
  }

  _openProblemWorkspace(problemId) {
    const prob = (this.activeContest.problems || []).find(p => p.id === problemId);
    if (!prob) return;

    this.competitor.activeProblemId = problemId;
    this.competitorBankView.style.display = 'none';
    this.competitorWorkspaceView.style.display = 'grid';

    // Populate Left Sub-Panel
    this.wsProblemTitle.textContent = prob.title;
    this.wsProblemTierTag.textContent = `${(prob.tier || 'Easy').toUpperCase()} TIER`;
    this.wsProblemTierTag.className = `status-tag ${prob.tier === 'hard' ? 'status-not-attempted' : 'status-attempting'}`;
    this.wsProblemPoints.textContent = `${prob.maxPoints || 20} Pts`;
    this.wsProblemDesc.innerHTML = this._renderMarkdown(prob.description);

    const sample = (prob.testCases || []).find(tc => tc.isSample) || (prob.testCases || [])[0];
    this.wsSampleInput.textContent = sample ? sample.input : '--';
    this.wsSampleOutput.textContent = sample ? sample.expectedOutput : '--';

    // Populate Right Sub-Panel Code Editor
    const code = this.competitor.problemCodes[prob.id] || prob.starterCode || '';
    this.editorCode.value = code;
    this._updateEditorGutter();

    // Metrics
    this._updateWorkspaceMetrics(prob.id);
  }

  _updateWorkspaceMetrics(problemId) {
    const prob = (this.activeContest.problems || []).find(p => p.id === problemId);
    const ev = this.competitor.evaluations[problemId];
    if (ev) {
      this.wsMetricScore.textContent = `${ev.totalScore} / ${prob.maxPoints}`;
      this.wsMetricTests.textContent = `${ev.passedCount} / ${ev.totalCount}`;
      this.wsMetricCpu.textContent = `${ev.totalExecutionTimeMs} ms`;
    } else {
      this.wsMetricScore.textContent = `0 / ${prob.maxPoints}`;
      this.wsMetricTests.textContent = `0 / ${(prob.testCases || []).length}`;
      this.wsMetricCpu.textContent = '0 ms';
    }
  }

  // --------------------------------------------------------------------------
  // CODE EDITOR & COMPILER EXECUTION
  // --------------------------------------------------------------------------
  _bindEditorEvents() {
    this.editorCode.addEventListener('input', () => {
      this._updateEditorGutter();
      if (this.competitor.activeProblemId) {
        this.competitor.problemCodes[this.competitor.activeProblemId] = this.editorCode.value;
        this._autoSaveSessionSnapshot();
      }
    });

    this.editorCode.addEventListener('scroll', () => {
      this.editorGutter.scrollTop = this.editorCode.scrollTop;
    });

    // Tab key & auto-indent
    this.editorCode.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = this.editorCode.selectionStart;
        const end = this.editorCode.selectionEnd;
        this.editorCode.value = this.editorCode.value.substring(0, start) + '    ' + this.editorCode.value.substring(end);
        this.editorCode.selectionStart = this.editorCode.selectionEnd = start + 4;
        this._updateEditorGutter();
        return;
      }

      // STRICT CLIPBOARD INTERCEPTION
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && (e.key === 'c' || e.key === 'v' || e.key === 'x')) {
        e.preventDefault();
        this._showClipboardBlockedToast();
        return;
      }
    });

    // Block clipboard DOM events
    ['copy', 'cut', 'paste', 'beforecopy', 'beforepaste'].forEach(evt => {
      this.editorCode.addEventListener(evt, (e) => {
        e.preventDefault();
        this._showClipboardBlockedToast();
        return false;
      });
    });

    this.editorCode.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this._showClipboardBlockedToast();
    });

    // Reset Code
    this.btnWsResetCode.addEventListener('click', () => {
      const prob = (this.activeContest.problems || []).find(p => p.id === this.competitor.activeProblemId);
      if (prob && confirm('Reset code to starter template? Current edits will be cleared.')) {
        this.editorCode.value = prob.starterCode || '';
        this.competitor.problemCodes[prob.id] = prob.starterCode || '';
        this._updateEditorGutter();
        this._autoSaveSessionSnapshot();
      }
    });

    // Clear Terminal
    this.btnWsClearTerm.addEventListener('click', () => {
      this.terminalStream.innerHTML = '[MASS-CODE RUNTIME]: Terminal output cleared.';
    });

    // Run Test Cases button & Ctrl+Enter
    this.btnWsRunTests.addEventListener('click', () => this._runActiveProblemTests());
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (this.currentView === 'competitor' && this.competitor.activeProblemId) {
          e.preventDefault();
          this._runActiveProblemTests();
        }
      }
    });
  }

  _showClipboardBlockedToast() {
    this.clipboardToast.style.display = 'block';
    if (this._clipboardToastTimer) clearTimeout(this._clipboardToastTimer);
    this._clipboardToastTimer = setTimeout(() => {
      this.clipboardToast.style.display = 'none';
    }, 2000);
  }

  _updateEditorGutter() {
    const lines = this.editorCode.value.split('\n');
    let nums = '';
    for (let i = 1; i <= Math.max(lines.length, 1); i++) {
      nums += i + '\n';
    }
    this.editorGutter.textContent = nums;
  }

  _appendTerminalLine(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    this.terminalStream.appendChild(div);
    this.terminalStream.scrollTop = this.terminalStream.scrollHeight;
  }

  async _runActiveProblemTests() {
    const prob = (this.activeContest.problems || []).find(p => p.id === this.competitor.activeProblemId);
    if (!prob) return;

    this.btnWsRunTests.disabled = true;
    this.btnWsRunTests.textContent = '⏳ Compiling...';
    this.terminalStream.innerHTML = '';
    this._appendTerminalLine(`<span style="color: var(--color-cyan);">&gt; gcc -O2 temp.c -o temp.exe</span>`);

    const result = await window.api.compileAndEvaluate({
      code: this.editorCode.value,
      language: this.activeContest.language || 'c',
      testCases: prob.testCases || [],
      timeoutMs: prob.timeLimitMs || 2000,
      maxPoints: prob.maxPoints || 20
    });

    this.btnWsRunTests.disabled = false;
    this.btnWsRunTests.textContent = '▶ Run Test Cases (Ctrl+Enter)';

    if (!result.success && result.phase === 'compilation') {
      this.terminalTopStatus.textContent = 'STATUS // BUILD ERROR';
      this._appendTerminalLine(`<span style="color: var(--color-rose); font-weight: bold;">[COMPILATION FAILED]:</span>`);
      this._appendTerminalLine(`<pre style="color: var(--color-rose);">${this._escape(result.compilerError)}</pre>`);
      return;
    }

    this.terminalTopStatus.textContent = 'STATUS // EVALUATION COMPLETED';
    this._appendTerminalLine(`<span style="color: var(--color-emerald); font-weight: bold;">TEST SUITE EVALUATED: ${result.passedCount}/${result.totalCount} PASSED (${result.totalScore}/${result.maxScore} PTS)</span>`);
    this._appendTerminalLine(`<span style="color: var(--text-muted);">Total CPU Execution: ${result.totalExecutionTimeMs} ms</span>\n`);

    (result.testResults || []).forEach(tc => {
      const tag = tc.isSample ? '[SAMPLE]' : '[HIDDEN]';
      if (tc.passed) {
        this._appendTerminalLine(`<span style="color: #39ff14;">✔ Test Case #${tc.index} ${tag}: PASSED (${tc.executionTimeMs}ms)</span>`);
      } else if (tc.timedOut) {
        this._appendTerminalLine(`<span style="color: var(--color-rose);">✖ Test Case #${tc.index} ${tag}: TIME LIMIT EXCEEDED</span>`);
      } else {
        this._appendTerminalLine(`<span style="color: var(--color-rose);">✖ Test Case #${tc.index} ${tag}: FAILED - WRONG ANSWER (${tc.executionTimeMs}ms)</span>`);
        if (tc.isSample) {
          this._appendTerminalLine(`    Input:    "${this._escape(tc.input.trim())}"`);
          this._appendTerminalLine(`    Expected: "${this._escape(tc.expectedOutput.trim())}"`);
          this._appendTerminalLine(`    Actual:   "${this._escape(tc.actualOutput.trim())}"`);
        }
      }
    });

    // Store evaluation outcome
    this.competitor.evaluations[prob.id] = {
      totalScore: result.totalScore,
      maxScore: result.maxScore,
      passedCount: result.passedCount,
      totalCount: result.totalCount,
      totalExecutionTimeMs: result.totalExecutionTimeMs
    };

    this._updateWorkspaceMetrics(prob.id);
    this._autoSaveSessionSnapshot();
  }

  _autoSaveSessionSnapshot() {
    if (!this.competitor.isSessionActive) return;
    window.api.saveSessionSnapshot({
      usn: this.competitor.usn,
      name: this.competitor.name,
      contestId: this.activeContest.id,
      timeElapsedSeconds: this.competitor.uptimeSeconds,
      problemCodes: this.competitor.problemCodes,
      evaluations: this.competitor.evaluations,
      violations: this.competitor.violations
    });
    this.wsAutosaveTag.textContent = `SAVED [${new Date().toLocaleTimeString()}]`;
  }

  // --------------------------------------------------------------------------
  // SESSION FINALIZATION & END SESSION LOGIC
  // --------------------------------------------------------------------------
  async _finalizeSession(isTimeout = false) {
    this.competitor.isSessionActive = false;
    if (this.competitor.timerInterval) clearInterval(this.competitor.timerInterval);

    // Compute aggregated final metrics
    let totalScore = 0;
    let maxContestScore = 0;
    let totalCpuMs = 0;
    let solvedCount = 0;

    (this.activeContest.problems || []).forEach(p => {
      maxContestScore += (p.maxPoints || 0);
      const ev = this.competitor.evaluations[p.id];
      if (ev) {
        totalScore += (ev.totalScore || 0);
        totalCpuMs += (ev.totalExecutionTimeMs || 0);
        if (ev.passedCount === ev.totalCount && ev.totalCount > 0) solvedCount++;
      }
    });

    const finalPayload = {
      usn: this.competitor.usn,
      name: this.competitor.name,
      contestId: this.activeContest.id,
      contestTitle: this.activeContest.title,
      totalScore,
      maxScore: maxContestScore,
      problemsSolvedCount: solvedCount,
      totalProblems: (this.activeContest.problems || []).length,
      timeElapsedSeconds: this.competitor.uptimeSeconds,
      totalExecutionTimeMs: Math.round(totalCpuMs * 10) / 10,
      isAutoTimeout: isTimeout,
      submittedAt: new Date().toISOString(),
      problemCodes: this.competitor.problemCodes,
      evaluations: this.competitor.evaluations,
      violationStrikes: this.competitor.violations.length,
      violations: this.competitor.violations
    };

    // Save FINAL_[USN].json to disk
    const saveRes = await window.api.saveFinalSubmission(finalPayload);

    // Attempt LAN sync to Host
    let syncSuccess = false;
    try {
      const syncRes = await window.api.pushSubmissionHttp({
        hostUrl: this.competitor.hostUrl,
        payload: finalPayload
      });
      syncSuccess = syncRes.success;
    } catch (_) {}

    // Populate Thank You View
    this.tyTotalScore.textContent = `${totalScore} / ${maxContestScore}`;
    const m = Math.floor(this.competitor.uptimeSeconds / 60);
    const s = this.competitor.uptimeSeconds % 60;
    this.tyDuration.textContent = `${m}m ${s < 10 ? '0' : ''}${s}s`;
    this.tyCandidateUsn.textContent = `${this.competitor.usn} (${this.competitor.name})`;
    this.tyPayloadFile.textContent = saveRes.filename || `FINAL_${this.competitor.usn}.json`;

    if (syncSuccess) {
      this.tySyncStatus.textContent = '✔ Synchronized to Host Server';
      this.tySyncStatus.style.color = 'var(--color-emerald)';
    } else {
      this.tySyncStatus.textContent = '⚠ Saved Locally on Disk (Offline Standalone)';
      this.tySyncStatus.style.color = 'var(--color-amber)';
    }

    // Lift kiosk mode and switch to Thank You view
    await this.switchView('thankyou');
  }

  // --------------------------------------------------------------------------
  // CHEATING MONITORING & SUPERVISOR OVERRIDE
  // --------------------------------------------------------------------------
  _handleWindowBlur() {
    this.competitor.violations.push({ incident: 'WINDOW_BLUR', time: new Date().toISOString() });
    this.violationCountLabel.textContent = this.competitor.violations.length;
    this.modalViolation.classList.add('active');
  }

  async _verifySupervisorOverride() {
    const entered = this.supervisorKeyInput.value.trim();
    const res = await window.api.verifySupervisorKey({ key: entered });
    if (res.success) {
      this.modalSupervisor.classList.remove('active');
      this.showToast('Supervisor Emergency Key verified. Station unlocked.', 'success');
      this.switchView('welcome');
    } else {
      this.supervisorKeyError.style.display = 'block';
    }
  }

  // --------------------------------------------------------------------------
  // HOST CONTROLLER ACTIONS
  // --------------------------------------------------------------------------
  _populateHostContest(contest) {
    this.hostTitleInput.value = contest.title || '';
    this.hostTokenInput.value = contest.token || contest.id || '';
    this.hostDurationInput.value = contest.durationMinutes || 60;
    this.hostProblems = contest.problems || [];
    this._renderHostProblemCards();
  }

  _renderHostProblemCards() {
    this.hostProblemsList.innerHTML = '';
    this.hostProblems.forEach((p, idx) => {
      const card = document.createElement('div');
      card.className = 'builder-problem-card';
      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <strong style="color: var(--color-cyan);">#${idx + 1}</strong>
            <input type="text" class="form-control p-title" style="width: 320px; font-weight: 700;" value="${this._escape(p.title)}">
          </div>
          <button class="btn btn-danger btn-sm btn-del-prob" data-idx="${idx}">Remove</button>
        </div>
        <div class="form-grid-3">
          <div class="form-group">
            <label>Tier</label>
            <select class="form-control p-tier">
              <option value="easy" ${p.tier === 'easy' ? 'selected' : ''}>Easy</option>
              <option value="medium" ${p.tier === 'medium' ? 'selected' : ''}>Medium</option>
              <option value="hard" ${p.tier === 'hard' ? 'selected' : ''}>Hard</option>
            </select>
          </div>
          <div class="form-group">
            <label>Points</label>
            <input type="number" class="form-control p-points" value="${p.maxPoints || 20}">
          </div>
          <div class="form-group">
            <label>Time Limit (ms)</label>
            <input type="number" class="form-control p-timeout" value="${p.timeLimitMs || 2000}">
          </div>
        </div>
        <div class="form-group">
          <label>Problem Description</label>
          <textarea class="form-control p-desc" rows="3">${this._escape(p.description)}</textarea>
        </div>
      `;
      card.querySelector('.btn-del-prob').addEventListener('click', (e) => {
        this.hostProblems.splice(parseInt(e.target.dataset.idx), 1);
        this._renderHostProblemCards();
      });
      this.hostProblemsList.appendChild(card);
    });
  }

  _addHostProblem() {
    const idx = this.hostProblems.length + 1;
    this.hostProblems.push({
      id: `p_custom_${idx}`,
      tier: 'easy',
      title: `Problem ${idx}: Algorithmic Challenge`,
      category: 'General',
      maxPoints: 20,
      timeLimitMs: 2000,
      description: 'Describe problem requirements, input/output specifications, and constraints.',
      starterCode: '#include <stdio.h>\n\nint main() {\n    return 0;\n}\n',
      testCases: [{ id: `tc_${idx}_1`, isSample: true, input: '5\n', expectedOutput: '10\n' }]
    });
    this._renderHostProblemCards();
  }

  async _loadDefaultContestTemplate() {
    const def = await window.api.getDefaultContest();
    if (def.success) {
      this._populateHostContest(def.contest);
      this.showToast('Loaded standard Multi-Tier template.', 'info');
    }
  }

  _compileHostContest() {
    const cards = this.hostProblemsList.querySelectorAll('.builder-problem-card');
    cards.forEach((card, i) => {
      if (!this.hostProblems[i]) return;
      this.hostProblems[i].title = card.querySelector('.p-title').value;
      this.hostProblems[i].tier = card.querySelector('.p-tier').value;
      this.hostProblems[i].maxPoints = parseInt(card.querySelector('.p-points').value) || 20;
      this.hostProblems[i].timeLimitMs = parseInt(card.querySelector('.p-timeout').value) || 2000;
      this.hostProblems[i].description = card.querySelector('.p-desc').value;
    });

    return {
      id: this.hostTokenInput.value.trim() || 'MASS-' + Date.now(),
      title: this.hostTitleInput.value.trim() || 'Mass-Code Contest',
      token: this.hostTokenInput.value.trim() || 'MASS2026',
      durationMinutes: parseInt(this.hostDurationInput.value) || 60,
      language: 'c',
      problems: this.hostProblems
    };
  }

  async _exportContestDialog() {
    const config = this._compileHostContest();
    const res = await window.api.exportContestDialog(config);
    if (res.success) {
      this.showToast(`Contest exported: ${res.filePath}`, 'success');
      this.activeContest = config;
    }
  }

  async _importContestDialog() {
    const res = await window.api.importContestDialog();
    if (res.success && res.config) {
      this._populateHostContest(res.config);
      this.activeContest = res.config;
      this.showToast(`Imported contest: ${res.config.title}`, 'success');
    }
  }

  async _refreshHostServerStatus() {
    const status = await window.api.getHostServerStatus();
    this.serverPortVal.textContent = status.port;
    this.serverContestVal.textContent = status.activeContestId || 'MASS2026';
    this.serverStateVal.textContent = status.isRunning ? 'Online' : 'Stopped';
    this.serverStateVal.style.color = status.isRunning ? 'var(--color-emerald)' : 'var(--color-rose)';
    this.btnHostToggleServer.textContent = status.isRunning ? 'Stop Server' : 'Start Server';
    this.btnHostToggleServer.className = status.isRunning ? 'btn btn-danger btn-sm' : 'btn btn-success btn-sm';

    this.serverIpBadges.innerHTML = (status.ips || []).map(ip => `
      <span class="candidate-pill">Endpoint: http://${ip}:${status.port}</span>
    `).join('');

    if (this.serverGuidePin) {
      this.serverGuidePin.textContent = status.activeContestId || (this.activeContest && this.activeContest.token) || 'MASS2026';
    }
  }

  async _deployHostContest() {
    const config = this._compileHostContest();
    if (!config.problems || config.problems.length === 0) {
      this.showToast('Please add at least one question before hosting the contest.', 'warning');
      return;
    }

    this.activeContest = config;
    const startRes = await window.api.startHostServer({ port: 8080, contestConfig: config });
    await this._refreshHostServerStatus();

    // Switch host tabs to Server & LAN Distribution tab to show live endpoints
    this.hostTabs.forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.host-content-panel').forEach(p => p.classList.remove('active'));
    const serverTabBtn = Array.from(this.hostTabs).find(b => b.dataset.tab === 'server');
    if (serverTabBtn) serverTabBtn.classList.add('active');
    const serverPanel = document.getElementById('host-panel-server');
    if (serverPanel) serverPanel.classList.add('active');

    this.showToast(`Contest "${config.title}" is now LIVE on LAN (Port 8080)! (${config.problems.length} questions, PIN: ${config.token})`, 'success');
  }

  async _toggleHostServer() {
    const status = await window.api.getHostServerStatus();
    if (status.isRunning) {
      await window.api.stopHostServer();
      this.showToast('Host Server stopped.', 'warning');
    } else {
      const config = this._compileHostContest();
      await window.api.startHostServer({ port: 8080, contestConfig: config });
      this.showToast('Host Server started on port 8080 (UDP Broadcast Active).', 'success');
    }
    this._refreshHostServerStatus();
  }

  async _scanHostSubmissions() {
    const res = await window.api.scanGradingFolder();
    if (res.success) {
      this.hostSubmissions = res.records || [];
      this.gradingCountLabel.textContent = `${this.hostSubmissions.length} candidate submissions loaded`;
      this._renderLeaderboardTable();
    }
  }

  _renderLeaderboardTable() {
    if (this.hostSubmissions.length === 0) {
      this.hostLeaderboardTbody.innerHTML = `
        <tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 32px;">No submissions found.</td></tr>
      `;
      return;
    }

    this.hostLeaderboardTbody.innerHTML = this.hostSubmissions.map(r => {
      const m = Math.floor(r.timeElapsedSeconds / 60);
      const s = r.timeElapsedSeconds % 60;
      const rankColor = r.rank === 1 ? 'color: #ffd700; font-weight: 900;' : r.rank === 2 ? 'color: #e0e0e0; font-weight: 800;' : r.rank === 3 ? 'color: #cd7f32; font-weight: 800;' : '';

      return `
        <tr>
          <td><span style="${rankColor}">#${r.rank}</span></td>
          <td style="font-family: var(--font-mono); font-weight: 700;">${this._escape(r.usn)}</td>
          <td>${this._escape(r.name)}</td>
          <td><strong style="color: var(--color-emerald);">${r.totalScore} / ${r.maxScore}</strong></td>
          <td>${r.problemsSolvedCount} / ${r.totalProblems}</td>
          <td style="font-family: var(--font-mono); font-size: 0.8rem;">${m}m ${s < 10 ? '0' : ''}${s}s</td>
          <td style="font-family: var(--font-mono); font-size: 0.8rem;">${r.totalExecutionTimeMs} ms</td>
          <td><span style="${r.violationsCount > 0 ? 'color: var(--color-rose); font-weight: bold;' : ''}">${r.violationsCount}</span></td>
          <td><button class="btn btn-secondary btn-sm btn-inspect-cand" data-usn="${this._escape(r.usn)}">Inspect</button></td>
        </tr>
      `;
    }).join('');

    this.hostLeaderboardTbody.querySelectorAll('.btn-inspect-cand').forEach(btn => {
      btn.addEventListener('click', e => {
        const sub = this.hostSubmissions.find(s => s.usn === e.target.dataset.usn);
        if (sub) {
          this.inspectUsn.textContent = sub.usn;
          this.inspectName.textContent = sub.name;
          this.inspectScore.textContent = `${sub.totalScore} / ${sub.maxScore}`;

          let codeLogs = '';
          const p = sub.fullPayload;
          if (p && p.problemCodes) {
            for (const [probId, code] of Object.entries(p.problemCodes)) {
              codeLogs += `// ====================================\n// PROBLEM: ${probId}\n// ====================================\n${code}\n\n`;
            }
          }
          this.inspectCodeArea.textContent = codeLogs || '// No code recorded.';
          this.modalInspector.classList.add('active');
        }
      });
    });
  }

  async _exportLeaderboardCsv() {
    if (this.hostSubmissions.length === 0) return this.showToast('No submissions to export.', 'warning');
    const res = await window.api.exportLeaderboardCsv({ records: this.hostSubmissions, contestTitle: this.hostTitleInput.value });
    if (res.success) this.showToast(`CSV exported: ${res.filePath}`, 'success');
  }

  // --------------------------------------------------------------------------
  // UTILITIES & MARKDOWN
  // --------------------------------------------------------------------------
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    if (type === 'success') toast.style.borderLeft = '4px solid var(--color-emerald)';
    else if (type === 'error') toast.style.borderLeft = '4px solid var(--color-rose)';
    else if (type === 'warning') toast.style.borderLeft = '4px solid var(--color-amber)';
    else toast.style.borderLeft = '4px solid var(--color-cyan)';

    this.toastBox.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  _renderMarkdown(md) {
    if (!md) return '';
    return md
      .replace(/^### (.*$)/gim, '<h3 style="margin-top: 14px; margin-bottom: 6px; color: var(--text-main); font-size: 0.98rem;">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 style="margin-top: 16px; margin-bottom: 8px; color: var(--text-main); font-size: 1.1rem;">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 style="color: var(--text-main); font-size: 1.25rem;">$1</h1>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong style="color: var(--text-main);">$1</strong>')
      .replace(/`([^`]+)`/gim, '<code style="background-color: var(--bg-card); color: var(--color-cyan); padding: 2px 6px; border-radius: 4px; font-family: var(--font-mono);">$1</code>')
      .replace(/\n\n/gim, '<br><br>')
      .replace(/\n/gim, '<br>');
  }

  _escape(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.massCodeApp = new MassCodeApp();
});
