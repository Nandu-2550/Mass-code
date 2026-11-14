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
    this.supervisorEmergencyKey = 'GECM@8123';

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
    this.hostContestType = 'contest'; // 'contest' | 'exam'
    this.hostProblems = [];
    this.hostBatches = [
      {
        id: 'batch_1',
        name: 'Batch 1 (Morning)',
        students: []
      }
    ];
    this.activeBatchId = 'batch_1';
    this.hostSubmissions = [];

    // Kiosk & Supervisor Review State
    this.isKioskUnlocked = false;
    this.isReviewMode = false;
    this.supervisorAction = 'kiosk';

    // Step Flow Tracking (1: Welcome, 2: Session Mode Select, 3: Workspace/Station, 4: Active Session)
    this.hostStep = 2;
    this.compStep = 2;
    this.candidateMode = 'contest';

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
    this.btnReviewBackToTy = document.getElementById('btn-review-back-to-ty');
    this.btnEndSession = document.getElementById('btn-end-session');
    this.btnExitHost = document.getElementById('btn-exit-host');
    this.btnExitComp = document.getElementById('btn-exit-comp');
    this.btnSupervisorKey = document.getElementById('btn-supervisor-key');

    // Welcome Screen
    this.cardEnterHost = document.getElementById('card-enter-host');
    this.cardEnterCompetitor = document.getElementById('card-enter-competitor');
    this.welcomeGccStatus = document.getElementById('welcome-gcc-status');
    this.welcomeArchStatus = document.getElementById('welcome-arch-status');
    this.welcomeIpStatus = document.getElementById('welcome-ip-status');

    // Host Mode Switcher Elements
    this.hostModeSelectScreen = document.getElementById('host-mode-select-screen');
    this.hostWorkspaceContent = document.getElementById('host-workspace-content');
    this.cardHostModeContest = document.getElementById('card-host-mode-contest');
    this.cardHostModeExam = document.getElementById('card-host-mode-exam');
    this.btnSwitchHostMode = document.getElementById('btn-switch-host-mode');
    this.btnModeContest = document.getElementById('btn-mode-contest');
    this.btnModeExam = document.getElementById('btn-mode-exam');
    this.hostModeIndicatorTag = document.getElementById('host-mode-indicator-tag');
    this.tabBtnBuilder = document.getElementById('tab-btn-builder');
    this.tabBtnBatches = document.getElementById('tab-btn-batches');
    this.tabBtnServer = document.getElementById('tab-btn-server');
    this.tabBtnGrading = document.getElementById('tab-btn-grading');
    this.builderConfigHeading = document.getElementById('builder-config-heading');
    this.builderBankHeading = document.getElementById('builder-bank-heading');
    this.pdfDropzoneTitleText = document.getElementById('pdf-dropzone-title-text');
    this.hostPdfDropzoneSubtitle = document.getElementById('host-pdf-dropzone-subtitle');
    this.lblContestTitle = document.getElementById('lbl-contest-title');
    this.lblContestToken = document.getElementById('lbl-contest-token');

    // Host Screen Elements
    this.hostTabs = document.querySelectorAll('.host-tab-btn');
    this.hostTitleInput = document.getElementById('host-contest-title');
    this.hostTokenInput = document.getElementById('host-contest-token');
    this.hostDurationInput = document.getElementById('host-contest-duration');
    this.hostProblemsList = document.getElementById('host-problems-list');
    this.btnHostAddProblem = document.getElementById('btn-host-add-problem');
    this.btnHostLoadSample = document.getElementById('btn-host-load-sample');
    this.btnHostImport = document.getElementById('btn-host-import');
    this.btnHostImportPdf = document.getElementById('btn-host-import-pdf');
    this.btnHostImportPdfBank = document.getElementById('btn-host-import-pdf-bank');
    this.hostPdfDropzone = document.getElementById('host-pdf-dropzone');
    this.btnBrowsePdfZone = document.getElementById('btn-browse-pdf-zone');
    this.linkBrowsePdf = document.getElementById('link-browse-pdf');
    this.hostPdfFileInput = document.getElementById('host-pdf-file-input');
    this.hostPdfStatus = document.getElementById('host-pdf-status');
    this.hostPdfStatusText = document.getElementById('host-pdf-status-text');
    this.btnHostExport = document.getElementById('btn-host-export');
    this.btnHostDeployTop = document.getElementById('btn-host-deploy-top');
    this.btnHostDeployBottom = document.getElementById('btn-host-deploy-bottom');
    this.serverGuidePin = document.getElementById('server-guide-pin');
    this.btnHostToggleServer = document.getElementById('btn-host-toggle-server');
    this.serverPortVal = document.getElementById('server-port-val');
    this.serverContestVal = document.getElementById('server-contest-val');
    this.serverStateVal = document.getElementById('server-state-val');
    this.serverIpBadges = document.getElementById('server-ip-badges');
    this.routerHostIp = document.getElementById('router-host-ip');
    this.routerHostPort = document.getElementById('router-host-port');
    this.routerHostPin = document.getElementById('router-host-pin');
    this.routerFullUrl = document.getElementById('router-full-url');
    this.btnCopyHostUrl = document.getElementById('btn-copy-host-url');
    this.btnHostScanFolder = document.getElementById('btn-host-scan-folder');
    this.btnHostExportCsv = document.getElementById('btn-host-export-csv');
    this.btnHostClearHistory = document.getElementById('btn-host-clear-history');
    this.btnHostEndSession = document.getElementById('btn-host-end-session');
    this.hostLeaderboardTbody = document.getElementById('host-leaderboard-tbody');
    this.gradingCountLabel = document.getElementById('grading-count-label');

    // Batch Management Elements
    this.hostBatchSelect = document.getElementById('host-batch-select');
    this.batchStatsPill = document.getElementById('batch-stats-pill');
    this.btnCreateBatch = document.getElementById('btn-create-batch');
    this.btnRenameBatch = document.getElementById('btn-rename-batch');
    this.btnDeleteBatch = document.getElementById('btn-delete-batch');
    this.btnImportUsns = document.getElementById('btn-import-usns');
    this.btnAddStudentSingle = document.getElementById('btn-add-student-single');
    this.btnRandomAssignAll = document.getElementById('btn-random-assign-all');
    this.btnResetBatchAllocations = document.getElementById('btn-reset-batch-allocations');
    this.btnExportAllocationsCsv = document.getElementById('btn-export-allocations-csv');
    this.batchStudentsTbody = document.getElementById('batch-students-tbody');

    // Batch & Allocation Modals
    this.modalImportUsns = document.getElementById('modal-import-usns');
    this.importUsnsTextarea = document.getElementById('import-usns-textarea');
    this.btnPasteClipboardUsns = document.getElementById('btn-paste-clipboard-usns');
    this.btnBrowseCsvUsns = document.getElementById('btn-browse-csv-usns');
    this.inputFileCsvUsns = document.getElementById('input-file-csv-usns');
    this.btnCloseImportUsns = document.getElementById('btn-close-import-usns');
    this.btnCancelImportUsns = document.getElementById('btn-cancel-import-usns');
    this.btnConfirmImportUsns = document.getElementById('btn-confirm-import-usns');

    this.modalCreateBatch = document.getElementById('modal-create-batch');
    this.createBatchNameInput = document.getElementById('create-batch-name-input');
    this.btnCancelCreateBatch = document.getElementById('btn-cancel-create-batch');
    this.btnConfirmCreateBatch = document.getElementById('btn-confirm-create-batch');

    this.modalRenameBatch = document.getElementById('modal-rename-batch');
    this.renameBatchNameInput = document.getElementById('rename-batch-name-input');
    this.btnCancelRenameBatch = document.getElementById('btn-cancel-rename-batch');
    this.btnConfirmRenameBatch = document.getElementById('btn-confirm-rename-batch');

    this.modalConfirmDeleteBatch = document.getElementById('modal-confirm-delete-batch');
    this.deleteBatchDesc = document.getElementById('delete-batch-desc');
    this.btnCancelDeleteBatch = document.getElementById('btn-cancel-delete-batch');
    this.btnConfirmDeleteBatch = document.getElementById('btn-confirm-delete-batch');

    this.modalConfirmResetAllocations = document.getElementById('modal-confirm-reset-allocations');
    this.resetAllocationsDesc = document.getElementById('reset-allocations-desc');
    this.btnCancelResetAllocations = document.getElementById('btn-cancel-reset-allocations');
    this.btnConfirmResetAllocations = document.getElementById('btn-confirm-reset-allocations');

    this.modalChangeOfExp = document.getElementById('modal-change-of-exp');
    this.coeStudentLabel = document.getElementById('coe-student-label');
    this.coeCurrentExpTitle = document.getElementById('coe-current-exp-title');
    this.coeNewExpSelect = document.getElementById('coe-new-exp-select');
    this.btnCoeRandomRoll = document.getElementById('btn-coe-random-roll');
    this.coePenaltyMarks = document.getElementById('coe-penalty-marks');
    this.coeRemarks = document.getElementById('coe-remarks');
    this.btnCloseChangeOfExp = document.getElementById('btn-close-change-of-exp');
    this.btnCancelChangeOfExp = document.getElementById('btn-cancel-change-of-exp');
    this.btnConfirmChangeOfExp = document.getElementById('btn-confirm-change-of-exp');
    this.currentCoeStudentUsn = null;

    this.modalSingleStudent = document.getElementById('modal-single-student');
    this.singleStudentUsn = document.getElementById('single-student-usn');
    this.singleStudentName = document.getElementById('single-student-name');
    this.singleStudentExpSelect = document.getElementById('single-student-exp-select');
    this.btnCloseSingleStudent = document.getElementById('btn-close-single-student');
    this.btnCancelSingleStudent = document.getElementById('btn-cancel-single-student');
    this.btnConfirmSingleStudent = document.getElementById('btn-confirm-single-student');

    // Competitor Notice Banner
    this.wsChangeOfExpNotice = document.getElementById('ws-change-of-exp-notice');
    this.wsChangeOfExpDetails = document.getElementById('ws-change-of-exp-details');

    // Competitor Overlay & Registration
    this.competitorModeSelectScreen = document.getElementById('competitor-mode-select-screen');
    this.cardCompModeContest = document.getElementById('card-comp-mode-contest');
    this.cardCompModeExam = document.getElementById('card-comp-mode-exam');
    this.compModeIndicatorTag = document.getElementById('comp-mode-indicator-tag');
    this.compRegHeaderTitle = document.getElementById('comp-reg-header-title');
    this.compRegHeaderDesc = document.getElementById('comp-reg-header-desc');
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
    this.compExamOtpInput = document.getElementById('comp-exam-otp-input');
    this.compExamOtpGroup = document.getElementById('comp-exam-otp-group');
    this.compNameGroup = document.getElementById('comp-name-group');
    this.btnCompPullLan = document.getElementById('btn-comp-pull-lan');
    this.btnCompLoadLocal = document.getElementById('btn-comp-load-local');
    this.btnCompStartContest = document.getElementById('btn-comp-start-contest');
    this.btnCompStartExam = document.getElementById('btn-comp-start-exam');
    this.btnCompModeContest = document.getElementById('btn-comp-mode-contest');
    this.btnCompModeExam = document.getElementById('btn-comp-mode-exam');
    this.compContestFields = document.getElementById('comp-contest-fields');
    this.compExamNotice = document.getElementById('comp-exam-notice');
    this.btnCompExit = document.getElementById('btn-comp-exit');
    this.compContestStatusBox = document.getElementById('comp-contest-status-box');
    this.compContestStatusText = document.getElementById('comp-contest-status-text');
    this.compContestCountBadge = document.getElementById('comp-contest-count-badge');

    // Competitor Multi-Tier Question Bank
    this.competitorWorkspace = document.getElementById('competitor-workspace');
    this.competitorBankView = document.getElementById('competitor-bank-view');
    this.competitorWorkspaceView = document.getElementById('competitor-workspace-view');
    this.wsLeftPanel = document.getElementById('ws-left-panel');
    this.wsRightPanel = document.getElementById('ws-right-panel');
    this.workspaceResizer = document.getElementById('workspace-resizer');
    this.terminalResizer = document.getElementById('terminal-resizer');
    this.wsTerminalContainer = document.getElementById('ws-terminal-container');
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
    this.wsStarterCodePreview = document.getElementById('ws-starter-code-preview');
    this.wsSampleCasesContainer = document.getElementById('ws-sample-cases-container');
    this.wsSampleInput = document.getElementById('ws-sample-input');
    this.wsSampleOutput = document.getElementById('ws-sample-output');
    this.wsMetricScore = document.getElementById('ws-metric-score');
    this.wsMetricTests = document.getElementById('ws-metric-tests');
    this.wsMetricCpu = document.getElementById('ws-metric-cpu');
    this.editorGutter = document.getElementById('editor-gutter');
    this.editorCode = document.getElementById('editor-code');
    this.clipboardToast = document.getElementById('clipboard-toast');
    this.terminalTopStatus = document.getElementById('terminal-top-status');
    this.terminalCwdTag = document.getElementById('terminal-cwd-tag');
    this.terminalStream = document.getElementById('terminal-stream');
    this.terminalCliInput = document.getElementById('terminal-cli-input');
    this.terminalCliPrompt = document.getElementById('terminal-cli-prompt');
    this.btnTerminalSendCli = document.getElementById('btn-terminal-send-cli');
    this.btnWsRunTerm = document.getElementById('btn-ws-run-term');
    this.btnWsKillTerm = document.getElementById('btn-ws-kill-term');
    this.wsAutosaveTag = document.getElementById('ws-autosave-tag');
    this.btnWsToggleExpand = document.getElementById('btn-ws-toggle-expand');
    this.btnWsResetCode = document.getElementById('btn-ws-reset-code');
    this.btnWsClearTerm = document.getElementById('btn-ws-clear-term');
    this.btnWsRunSample = document.getElementById('btn-ws-run-sample');
    this.btnWsRunTests = document.getElementById('btn-ws-run-tests');

    // Thank You Screen
    this.tyHeaderTitle = document.getElementById('ty-header-title');
    this.tyHeaderDesc = document.getElementById('ty-header-desc');
    this.tyContestScoresSection = document.getElementById('ty-contest-scores-section');
    this.tyAuditPackageLine = document.getElementById('ty-audit-package-line');
    this.tyTotalScore = document.getElementById('ty-total-score');
    this.tyDuration = document.getElementById('ty-duration');
    this.tyCandidateUsn = document.getElementById('ty-candidate-usn');
    this.tyPayloadFile = document.getElementById('ty-payload-file');
    this.tySyncStatus = document.getElementById('ty-sync-status');
    this.btnTyReviewCode = document.getElementById('btn-ty-review-code');
    this.btnTyExitApp = document.getElementById('btn-ty-exit-app');
    this.btnTyReturnHome = document.getElementById('btn-ty-return-home');
    this.tySolvedCount = document.getElementById('ty-solved-count');
    this.tyRoundCardsContainer = document.getElementById('ty-round-cards-container');
    this.tyProgramsTbody = document.getElementById('ty-programs-tbody');

    // Modals
    this.modalEndSession = document.getElementById('modal-end-session-warning');
    this.btnCancelEndSession = document.getElementById('btn-cancel-end-session');
    this.btnConfirmEndSession = document.getElementById('btn-confirm-end-session');

    this.modalHostEndSession = document.getElementById('modal-host-end-session');
    this.btnCancelHostEndSession = document.getElementById('btn-cancel-host-end-session');
    this.btnConfirmHostEndSession = document.getElementById('btn-confirm-host-end-session');

    this.modalEvaluatingAll = document.getElementById('modal-evaluating-all');
    this.evalProgressStatus = document.getElementById('eval-progress-status');
    this.evalProgressBar = document.getElementById('eval-progress-bar');
    this.evalProgressCount = document.getElementById('eval-progress-count');
    this.evalProgressPercent = document.getElementById('eval-progress-percent');

    this.btnHostGradeAll = document.getElementById('btn-host-grade-all');

    this.modalSupervisor = document.getElementById('modal-supervisor-override');
    this.supervisorModalTitle = document.getElementById('supervisor-modal-title');
    this.supervisorModalDesc = document.getElementById('supervisor-modal-desc');
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
    this.inspectTime = document.getElementById('inspect-time');
    this.inspectRoundsContainer = document.getElementById('inspect-rounds-container');
    this.inspectProgramsTbody = document.getElementById('inspect-programs-tbody');
    this.inspectCodeArea = document.getElementById('inspect-code-area');

    this.toastBox = document.getElementById('toast-box');
  }

  _bindEvents() {
    // Mode Selection triggers
    this.cardEnterHost.addEventListener('click', () => this.switchView('host'));
    this.cardEnterCompetitor.addEventListener('click', () => this.switchView('competitor'));
    this.btnExitHost.addEventListener('click', () => this._handleHostBack());
    if (this.btnExitComp) {
      this.btnExitComp.addEventListener('click', () => this._handleCompBack());
    }
    if (this.btnCompExit) {
      this.btnCompExit.addEventListener('click', () => this._handleCompBack());
    }
    if (this.btnTyReturnHome) {
      this.btnTyReturnHome.addEventListener('click', () => this.switchView('welcome'));
    }
    if (this.btnTyReviewCode) {
      this.btnTyReviewCode.addEventListener('click', () => this._promptSupervisorUnlock('review'));
    }
    if (this.btnReviewBackToTy) {
      this.btnReviewBackToTy.addEventListener('click', () => this._exitSupervisorReviewMode());
    }
    if (this.btnTyExitApp) {
      this.btnTyExitApp.addEventListener('click', () => {
        this._promptSupervisorUnlock('main_menu');
      });
    }
    if (this.btnTyReturnHome) {
      this.btnTyReturnHome.addEventListener('click', () => {
        this._promptSupervisorUnlock('main_menu');
      });
    }

    // Host Mode Screen Choice Cards (Step 2 -> Step 3)
    if (this.cardHostModeContest) {
      this.cardHostModeContest.addEventListener('click', () => this._chooseHostMode('contest'));
    }
    if (this.cardHostModeExam) {
      this.cardHostModeExam.addEventListener('click', () => this._chooseHostMode('exam'));
    }

    // Competitor Mode Screen Choice Cards (Step 2 -> Step 3)
    if (this.cardCompModeContest) {
      this.cardCompModeContest.addEventListener('click', () => this._launchCandidateEntry('contest'));
    }
    if (this.cardCompModeExam) {
      this.cardCompModeExam.addEventListener('click', () => this._launchCandidateEntry('exam'));
    }

    // Mode Switcher Buttons (Contest Mode vs Exam Mode)
    if (this.btnModeContest) {
      this.btnModeContest.addEventListener('click', () => this._chooseHostMode('contest'));
    }
    if (this.btnModeExam) {
      this.btnModeExam.addEventListener('click', () => this._chooseHostMode('exam'));
    }

    // Host Stage Navigation Tabs
    this.hostTabs.forEach(btn => {
      btn.addEventListener('click', () => {
        this._switchHostStage(btn.dataset.tab);
      });
    });

    // Host Stage Navigation Footer Buttons
    const btnNextStageBuilder = document.getElementById('btn-next-stage-builder');
    if (btnNextStageBuilder) {
      btnNextStageBuilder.addEventListener('click', () => {
        if (this.currentHostSessionMode === 'exam') {
          this._switchHostStage('batches');
        } else {
          this._switchHostStage('server');
        }
      });
    }

    const btnPrevStageBatches = document.getElementById('btn-prev-stage-batches');
    if (btnPrevStageBatches) {
      btnPrevStageBatches.addEventListener('click', () => this._switchHostStage('builder'));
    }

    const btnNextStageBatches = document.getElementById('btn-next-stage-batches');
    if (btnNextStageBatches) {
      btnNextStageBatches.addEventListener('click', () => this._switchHostStage('server'));
    }

    const btnPrevStageServer = document.getElementById('btn-prev-stage-server');
    if (btnPrevStageServer) {
      btnPrevStageServer.addEventListener('click', () => {
        if (this.currentHostSessionMode === 'exam') {
          this._switchHostStage('batches');
        } else {
          this._switchHostStage('builder');
        }
      });
    }

    const btnNextStageServer = document.getElementById('btn-next-stage-server');
    if (btnNextStageServer) {
      btnNextStageServer.addEventListener('click', () => this._switchHostStage('grading'));
    }

    const btnPrevStageGrading = document.getElementById('btn-prev-stage-grading');
    if (btnPrevStageGrading) {
      btnPrevStageGrading.addEventListener('click', () => this._switchHostStage('server'));
    }

    // Batch Management Events
    if (this.hostBatchSelect) {
      this.hostBatchSelect.addEventListener('change', (e) => {
        this.activeBatchId = e.target.value;
        this._renderBatchAllocationsTable();
      });
    }
    if (this.btnCreateBatch) {
      this.btnCreateBatch.addEventListener('click', () => this._openCreateBatchModal());
    }
    if (this.btnCancelCreateBatch) {
      this.btnCancelCreateBatch.addEventListener('click', () => this.modalCreateBatch.classList.remove('active'));
    }
    if (this.btnConfirmCreateBatch) {
      this.btnConfirmCreateBatch.addEventListener('click', () => this._handleCreateBatchSubmit());
    }
    if (this.createBatchNameInput) {
      this.createBatchNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this._handleCreateBatchSubmit();
      });
    }

    if (this.btnRenameBatch) {
      this.btnRenameBatch.addEventListener('click', () => this._openRenameBatchModal());
    }
    if (this.btnCancelRenameBatch) {
      this.btnCancelRenameBatch.addEventListener('click', () => this.modalRenameBatch.classList.remove('active'));
    }
    if (this.btnConfirmRenameBatch) {
      this.btnConfirmRenameBatch.addEventListener('click', () => this._handleRenameBatchSubmit());
    }
    if (this.renameBatchNameInput) {
      this.renameBatchNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this._handleRenameBatchSubmit();
      });
    }

    if (this.btnDeleteBatch) {
      this.btnDeleteBatch.addEventListener('click', () => this._openDeleteBatchModal());
    }
    if (this.btnCancelDeleteBatch) {
      this.btnCancelDeleteBatch.addEventListener('click', () => this.modalConfirmDeleteBatch.classList.remove('active'));
    }
    if (this.btnConfirmDeleteBatch) {
      this.btnConfirmDeleteBatch.addEventListener('click', () => this._handleDeleteBatchSubmit());
    }

    // Student Import & Add Events
    if (this.btnImportUsns) {
      this.btnImportUsns.addEventListener('click', () => {
        if (this.modalImportUsns) {
          if (this.importUsnsTextarea) this.importUsnsTextarea.value = '';
          this.modalImportUsns.classList.add('active');
        }
      });
    }
    if (this.btnPasteClipboardUsns) {
      this.btnPasteClipboardUsns.addEventListener('click', async () => {
        try {
          const text = await navigator.clipboard.readText();
          if (text && text.trim()) {
            this.importUsnsTextarea.value = (this.importUsnsTextarea.value ? this.importUsnsTextarea.value + '\n' : '') + text.trim();
            this.showToast('✓ Pasted clipboard text into importer!', 'success');
          } else {
            this.showToast('Clipboard is empty or has no text.', 'warning');
          }
        } catch (err) {
          this.showToast('Please press Ctrl+V directly to paste into the box.', 'info');
        }
      });
    }
    if (this.btnBrowseCsvUsns && this.inputFileCsvUsns) {
      this.btnBrowseCsvUsns.addEventListener('click', () => this.inputFileCsvUsns.click());
      this.inputFileCsvUsns.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
          const text = evt.target.result;
          if (text) {
            this.importUsnsTextarea.value = text;
            this.showToast(`✓ Loaded ${file.name} successfully!`, 'success');
          }
        };
        reader.readAsText(file);
        this.inputFileCsvUsns.value = '';
      });
    }

    if (this.btnCloseImportUsns) {
      this.btnCloseImportUsns.addEventListener('click', () => this.modalImportUsns.classList.remove('active'));
    }
    if (this.btnCancelImportUsns) {
      this.btnCancelImportUsns.addEventListener('click', () => this.modalImportUsns.classList.remove('active'));
    }
    if (this.btnConfirmImportUsns) {
      this.btnConfirmImportUsns.addEventListener('click', () => this._handleImportUsnsSubmit());
    }

    if (this.btnAddStudentSingle) {
      this.btnAddStudentSingle.addEventListener('click', () => this._openAddSingleStudentModal());
    }
    if (this.btnCloseSingleStudent) {
      this.btnCloseSingleStudent.addEventListener('click', () => this.modalSingleStudent.classList.remove('active'));
    }
    if (this.btnCancelSingleStudent) {
      this.btnCancelSingleStudent.addEventListener('click', () => this.modalSingleStudent.classList.remove('active'));
    }
    if (this.btnConfirmSingleStudent) {
      this.btnConfirmSingleStudent.addEventListener('click', () => this._handleAddSingleStudentSubmit());
    }

    // Batch Allocation & Export Controls
    if (this.btnResetBatchAllocations) {
      this.btnResetBatchAllocations.addEventListener('click', () => this._openResetAllocationsModal());
    }
    if (this.btnCancelResetAllocations) {
      this.btnCancelResetAllocations.addEventListener('click', () => this.modalConfirmResetAllocations.classList.remove('active'));
    }
    if (this.btnConfirmResetAllocations) {
      this.btnConfirmResetAllocations.addEventListener('click', () => this._handleResetAllocationsSubmit());
    }
    if (this.btnExportAllocationsCsv) {
      this.btnExportAllocationsCsv.addEventListener('click', () => this._exportAllocationsCsv());
    }

    // Change of Experiment Modal Events
    if (this.btnCloseChangeOfExp) {
      this.btnCloseChangeOfExp.addEventListener('click', () => this.modalChangeOfExp.classList.remove('active'));
    }
    if (this.btnCancelChangeOfExp) {
      this.btnCancelChangeOfExp.addEventListener('click', () => this.modalChangeOfExp.classList.remove('active'));
    }
    if (this.btnConfirmChangeOfExp) {
      this.btnConfirmChangeOfExp.addEventListener('click', () => this._handleConfirmChangeOfExp());
    }
    if (this.btnCoeRandomRoll) {
      this.btnCoeRandomRoll.addEventListener('click', () => this._rollRandomInCoeModal());
    }

    // Host Actions
    this.btnHostAddProblem.addEventListener('click', () => this._addHostProblem());
    if (this.btnHostLoadSample) {
      this.btnHostLoadSample.addEventListener('click', () => this._loadDefaultContestTemplate());
    }
    if (this.btnHostImport) {
      this.btnHostImport.addEventListener('click', () => this._importContestDialog());
    }
    if (this.btnHostImportPdf) {
      this.btnHostImportPdf.addEventListener('click', () => this._handlePdfImportDialog());
    }
    if (this.btnHostImportPdfBank) {
      this.btnHostImportPdfBank.addEventListener('click', () => this._handlePdfImportDialog());
    }
    if (this.btnBrowsePdfZone) {
      this.btnBrowsePdfZone.addEventListener('click', () => this._handlePdfImportDialog());
    }
    if (this.linkBrowsePdf && this.hostPdfFileInput) {
      this.linkBrowsePdf.addEventListener('click', () => this.hostPdfFileInput.click());
    }
    if (this.hostPdfFileInput) {
      this.hostPdfFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          this._handlePdfFileObject(e.target.files[0]);
          e.target.value = '';
        }
      });
    }
    if (this.hostPdfDropzone) {
      this.hostPdfDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.hostPdfDropzone.classList.add('drag-over');
      });
      this.hostPdfDropzone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.hostPdfDropzone.classList.remove('drag-over');
      });
      this.hostPdfDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.hostPdfDropzone.classList.remove('drag-over');
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
          this._handlePdfFileObject(e.dataTransfer.files[0]);
        }
      });
    }
    this.btnHostExport.addEventListener('click', () => this._exportContestDialog());
    const handleToggleServer = () => this._toggleHostServer();
    if (this.btnHostDeployTop) this.btnHostDeployTop.addEventListener('click', handleToggleServer);
    if (this.btnHostDeployBottom) this.btnHostDeployBottom.addEventListener('click', handleToggleServer);
    if (this.btnHostToggleServer) this.btnHostToggleServer.addEventListener('click', handleToggleServer);
    if (this.btnCopyHostUrl) {
      this.btnCopyHostUrl.addEventListener('click', () => {
        const url = (this.routerFullUrl && this.routerFullUrl.textContent) || '';
        if (url) {
          navigator.clipboard.writeText(url);
          this.showToast(`Copied ${url} to clipboard!`, 'success');
        }
      });
    }
    this.btnHostScanFolder.addEventListener('click', () => this._scanHostSubmissions());
    if (this.btnHostGradeAll) {
      this.btnHostGradeAll.addEventListener('click', () => this._autoGradeAllHostSubmissions());
    }
    this.btnHostExportCsv.addEventListener('click', () => this._exportLeaderboardCsv());
    if (this.btnHostClearHistory) {
      this.btnHostClearHistory.addEventListener('click', () => {
        if (this.modalHostEndSession) this.modalHostEndSession.classList.add('active');
      });
    }
    if (this.btnHostEndSession) {
      this.btnHostEndSession.addEventListener('click', () => {
        if (this.modalHostEndSession) this.modalHostEndSession.classList.add('active');
      });
    }
    if (this.btnCancelHostEndSession) {
      this.btnCancelHostEndSession.addEventListener('click', () => {
        if (this.modalHostEndSession) this.modalHostEndSession.classList.remove('active');
      });
    }
    if (this.btnConfirmHostEndSession) {
      this.btnConfirmHostEndSession.addEventListener('click', () => this._handleHostEndSession());
    }
    this.btnCloseInspector.addEventListener('click', () => this.modalInspector.classList.remove('active'));

    // Competitor Overlay Triggers
    if (this.btnCompModeContest) {
      this.btnCompModeContest.addEventListener('click', () => this._setCandidateMode('contest'));
    }
    if (this.btnCompModeExam) {
      this.btnCompModeExam.addEventListener('click', () => this._setCandidateMode('exam'));
    }
    if (this.btnCompStartExam) {
      this.btnCompStartExam.addEventListener('click', () => this._handleStartExamSubmit());
    }

    this.compUsnInput.addEventListener('input', () => this._checkCompStartButton());
    this.compUsnInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (this.candidateMode === 'exam') {
          if (this.compExamOtpInput && !this.compExamOtpInput.value) {
            this.compExamOtpInput.focus();
          } else {
            this._handleStartExamSubmit();
          }
        }
      }
    });
    if (this.compExamOtpInput) {
      this.compExamOtpInput.addEventListener('input', () => this._checkCompStartButton());
      this.compExamOtpInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this._handleStartExamSubmit();
      });
    }
    this.compPinInput.addEventListener('input', () => this._checkCompStartButton());
    this.compHostUrl.addEventListener('input', () => this._checkCompStartButton());
    if (this.btnLanAutoConnect) {
      this.btnLanAutoConnect.addEventListener('click', () => this._pullContestOverLan(false));
    }
    this.btnCompPullLan.addEventListener('click', () => this._pullContestOverLan(false));
    this.btnCompLoadLocal.addEventListener('click', () => this._loadContestLocalForCompetitor());
    if (this.btnCompExit) {
      this.btnCompExit.addEventListener('click', () => this._exitCompetitorEntry());
    }
    this.btnCompStartContest.addEventListener('click', () => this._startCompetitorSession());

    // Initialize horizontal and vertical resizers
    this._initResizers();

    // Initialize interactive GCC terminal sandbox
    this._initInteractiveTerminal();

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

    // Toggle full-width editor workspace
    if (this.btnWsToggleExpand) {
      this.btnWsToggleExpand.addEventListener('click', () => {
        const isCollapsed = this.wsLeftPanel && this.wsLeftPanel.style.display === 'none';
        if (isCollapsed) {
          if (this.wsLeftPanel) {
            this.wsLeftPanel.style.display = 'flex';
            this.wsLeftPanel.style.width = '44%';
          }
          if (this.workspaceResizer) this.workspaceResizer.style.display = 'block';
          this.btnWsToggleExpand.innerHTML = '⛶ Expand Workspace';
          this.btnWsToggleExpand.classList.remove('btn-primary');
          this.btnWsToggleExpand.classList.add('btn-secondary');
        } else {
          if (this.wsLeftPanel) this.wsLeftPanel.style.display = 'none';
          if (this.workspaceResizer) this.workspaceResizer.style.display = 'none';
          this.btnWsToggleExpand.innerHTML = '⛶ Show Question';
          this.btnWsToggleExpand.classList.remove('btn-secondary');
          this.btnWsToggleExpand.classList.add('btn-primary');
        }
      });
    }

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

    // Supervisor Emergency Key Override - Toggles between UNLOCK and LOCK
    this.btnSupervisorKey.addEventListener('click', () => {
      if (this.isKioskUnlocked) {
        this._reLockKiosk();
      } else {
        this._promptSupervisorUnlock('kiosk');
      }
    });
    this.btnCancelSupervisorKey.addEventListener('click', () => {
      this.modalSupervisor.classList.remove('active');
    });
    this.btnConfirmSupervisorKey.addEventListener('click', () => this._handleSupervisorConfirm());
    this.supervisorKeyInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._handleSupervisorConfirm();
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

      if (window.api.onCompetitorCloseAttempted) {
        window.api.onCompetitorCloseAttempted(() => {
          if (this.currentView === 'competitor' && this.competitor.isSessionActive) {
            this.modalEndSession.classList.add('active');
          } else if (this.currentView === 'thankyou') {
            this._promptSupervisorUnlock('close');
          }
        });
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

    // Auto-load default contest template for Host Builder
    const def = await window.api.getDefaultContest();
    if (def.success) {
      this.defaultContest = def.contest;
      this._populateHostContest(def.contest);
    }

    // Auto-launch directly into competitor mode if --competitor-only was passed
    if (window.api && window.api.getLaunchArgs) {
      try {
        const args = await window.api.getLaunchArgs();
        if (args && args.competitorOnly) {
          await this.switchView('competitor');
        }
      } catch (_) {}
    }
  }

  async _exitCompetitorEntry() {
    if (window.api && window.api.stopLanListening) {
      try {
        await window.api.stopLanListening();
      } catch (_) {}
    }
    await this.switchView('welcome');
  }

  async switchView(viewName) {
    this.currentView = viewName;
    document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));

    // Apply strict OS window security rules:
    // Only lock down in kiosk confinement when competitor session is completely entered and questions are visible
    const securityMode = (viewName === 'competitor' && this.competitor.isSessionActive)
      ? 'kiosk'
      : (viewName === 'thankyou' ? 'thankyou' : (viewName === 'host' ? 'host' : 'welcome'));

    if (window.api && window.api.setSecurityMode) {
      await window.api.setSecurityMode({ mode: securityMode });
    }

    if (viewName === 'welcome') {
      this.hostStep = 2;
      this.compStep = 2;
      if (window.api && window.api.stopLanListening) {
        try { window.api.stopLanListening(); } catch (_) {}
      }
      this.viewWelcome.classList.add('active');
      this.navCandidatePill.style.display = 'none';
      this.navTimerBox.style.display = 'none';
      this.navKioskBadge.style.display = 'none';
      this.btnEndSession.style.display = 'none';
      this.btnExitHost.style.display = 'none';
      if (this.btnHostEndSession) this.btnHostEndSession.style.display = 'none';
      if (this.btnExitComp) this.btnExitComp.style.display = 'none';
      this.btnSupervisorKey.style.display = 'none';
    } else if (viewName === 'host') {
      if (window.api && window.api.stopLanListening) {
        try { window.api.stopLanListening(); } catch (_) {}
      }
      this.hostStep = 2;
      this.viewHost.classList.add('active');
      this.navCandidatePill.style.display = 'none';
      this.navTimerBox.style.display = 'none';
      this.navKioskBadge.style.display = 'none';
      this.btnEndSession.style.display = 'none';
      this.btnExitHost.style.display = 'inline-flex';
      if (this.btnHostEndSession) this.btnHostEndSession.style.display = 'none';
      if (this.btnExitComp) this.btnExitComp.style.display = 'none';
      this.btnSupervisorKey.style.display = 'none';

      if (this.hostModeSelectScreen) this.hostModeSelectScreen.style.display = 'flex';
      if (this.hostWorkspaceContent) this.hostWorkspaceContent.style.display = 'none';

      this._refreshHostServerStatus();
      this._scanHostSubmissions();
    } else if (viewName === 'competitor') {
      this.viewCompetitor.classList.add('active');
      this.btnExitHost.style.display = 'none';
      if (this.btnHostEndSession) this.btnHostEndSession.style.display = 'none';

      if (!this.competitor.isSessionActive) {
        this.compStep = 2;
        if (window.api && window.api.startLanListening) {
          window.api.startLanListening();
        }
        this._updateCompetitorContestStatus(this.activeContest, this.activeContestSource || '');
        this._checkCompStartButton();
        if (this.competitorModeSelectScreen) this.competitorModeSelectScreen.style.display = 'flex';
        if (this.compRegOverlay) this.compRegOverlay.style.display = 'none';
        if (this.competitorWorkspace) this.competitorWorkspace.style.display = 'none';
        this.navCandidatePill.style.display = 'none';
        this.navTimerBox.style.display = 'none';
        this.navKioskBadge.style.display = 'none';
        this.btnEndSession.style.display = 'none';
        this.btnSupervisorKey.style.display = 'none';
        if (this.btnExitComp) this.btnExitComp.style.display = 'inline-flex';
      } else {
        this.compStep = 4;
        if (this.competitorModeSelectScreen) this.competitorModeSelectScreen.style.display = 'none';
        this.compRegOverlay.style.display = 'none';
        this.competitorWorkspace.style.display = 'flex';
        this.navCandidatePill.style.display = 'inline-flex';
        this.navTimerBox.style.display = 'inline-flex';
        this.navKioskBadge.style.display = 'inline-flex';
        this.btnEndSession.style.display = 'inline-flex';
        this.btnSupervisorKey.style.display = 'inline-flex';
        if (this.btnExitComp) this.btnExitComp.style.display = 'none';
      }
    } else if (viewName === 'thankyou') {
      if (window.api && window.api.stopLanListening) {
        try { window.api.stopLanListening(); } catch (_) {}
      }
      this.viewThankyou.classList.add('active');
      this.navCandidatePill.style.display = 'none';
      this.navTimerBox.style.display = 'none';
      this.navKioskBadge.style.display = 'none';
      this.btnEndSession.style.display = 'none';
      this.btnExitHost.style.display = 'none';
      if (this.btnExitComp) this.btnExitComp.style.display = 'none';
      this.btnSupervisorKey.style.display = 'none';
      if (this.btnReviewBackToTy) this.btnReviewBackToTy.style.display = 'none';
    }
  }

  async _handleLanHostDiscovered(data) {
    if (!this.lanDiscoveryBox) return;

    this.lanDiscoveryBox.style.background = 'rgba(0, 200, 83, 0.08)';
    this.lanDiscoveryBox.style.borderColor = 'rgba(0, 200, 83, 0.4)';
    if (this.lanDiscoveryDot) {
      this.lanDiscoveryDot.style.background = 'var(--color-emerald)';
      this.lanDiscoveryDot.style.boxShadow = '0 0 10px var(--color-emerald)';
    }
    if (this.lanDiscoveryTitle) {
      this.lanDiscoveryTitle.textContent = `🟢 Host Active: ${data.contestTitle || 'Mass-Code Contest'}`;
    }
    if (this.lanDiscoverySub) {
      this.lanDiscoverySub.textContent = `Host: ${data.url} | PIN: ${data.contestToken || 'MASS2026'} (${data.problemCount || 0} Questions)`;
    }

    if (data.url) {
      this.compHostUrl.value = data.url;
    }
    if (data.contestToken) {
      this.compPinInput.value = data.contestToken;
    }

    if (this.btnLanAutoConnect) {
      this.btnLanAutoConnect.style.display = 'inline-flex';
    }

    // AUTOMATIC SYNC: Download the host's actual contest questions immediately!
    await this._pullContestOverLan(true);
  }

  _updateCompetitorContestStatus(contest, source = '') {
    if (!this.compContestStatusBox || !this.compContestStatusText || !this.compContestCountBadge) return;

    if (contest && contest.problems && contest.problems.length > 0) {
      this.compContestStatusBox.style.background = 'rgba(0, 200, 83, 0.06)';
      this.compContestStatusBox.style.borderColor = 'rgba(0, 200, 83, 0.4)';
      this.compContestStatusText.innerHTML = `🟢 <strong>${this._escape(contest.title || 'Contest')}</strong> <span style="color: var(--text-muted); font-size: 0.75rem;">(${source || 'Synced'})</span>`;
      this.compContestCountBadge.textContent = `${contest.problems.length} Questions Ready`;
      this.compContestCountBadge.style.borderColor = 'var(--color-emerald)';
      this.compContestCountBadge.style.color = 'var(--color-emerald)';
    } else {
      this.compContestStatusBox.style.background = 'rgba(255, 255, 255, 0.03)';
      this.compContestStatusBox.style.borderColor = 'var(--border-subtle)';
      this.compContestStatusText.textContent = '🟡 Waiting to sync questions from Host...';
      this.compContestCountBadge.textContent = '0 Questions';
      this.compContestCountBadge.style.borderColor = 'var(--color-amber)';
      this.compContestCountBadge.style.color = 'var(--color-amber)';
    }
  }

  _checkCompStartButton() {
    const hasUsn = this.compUsnInput && this.compUsnInput.value.trim().length >= 3;
    const hasContest = !!this.activeContest && (this.activeContest.problems || []).length > 0;
    if (this.btnCompStartContest) {
      this.btnCompStartContest.disabled = !hasUsn;
      if (hasContest) {
        this.btnCompStartContest.textContent = 'Lock Down Station & Start Contest';
        this.btnCompStartContest.className = 'btn btn-success';
      } else {
        this.btnCompStartContest.textContent = '⚡ Sync Contest from Host & Start';
        this.btnCompStartContest.className = 'btn btn-primary';
      }
    }
  }

  // --------------------------------------------------------------------------
  // COMPETITOR WORKFLOW & MULTI-TIER QUESTION BANK
  // --------------------------------------------------------------------------
  async _pullContestOverLan(silent = false) {
    let code = this.compPinInput.value.trim();
    let hostUrl = (this.compHostUrl.value || '').trim();

    // If the input was left empty or as localhost on a remote client, check for discovered host or prompt
    if (!hostUrl || hostUrl === 'http://localhost:8080' || hostUrl === 'localhost:8080' || hostUrl === 'http://127.0.0.1:8080') {
      if (this.discoveredHostUrl) {
        hostUrl = this.discoveredHostUrl;
        this.compHostUrl.value = hostUrl;
      } else if (!hostUrl) {
        if (!silent) {
          this.showToast('Please enter the Host Laptop IP address (e.g., http://192.168.1.136:8080) shown on the Host screen.', 'warning');
        }
        return false;
      }
    }

    if (!code) {
      code = 'any';
    }

    if (!silent) this.showToast(`Connecting to Host at ${hostUrl}...`, 'info');
    const res = await window.api.fetchRemoteContest({ hostUrl, contestCode: code });
    if (res.success && res.contest) {
      this.activeContest = res.contest;
      this.activeContestSource = `Host: ${hostUrl}`;
      const count = (res.contest.problems || []).length;
      this._updateCompetitorContestStatus(res.contest, `Host: ${hostUrl}`);
      this._checkCompStartButton();
      if (!silent) {
        this.showToast(`✓ Contest "${res.contest.title}" (${count} questions) successfully synced from Host!`, 'success');
      }
      return true;
    } else {
      if (res.expectedPin && res.expectedPin !== code) {
        this.compPinInput.value = res.expectedPin;
        this.showToast(`PIN auto-matched from Host: "${res.expectedPin}". Pulling questions...`, 'info');
        return this._pullContestOverLan(silent);
      }
      if (!silent) {
        this.showToast('Failed to pull contest: ' + (res.error || 'Host server unreachable'), 'error');
      }
      return false;
    }
  }

  async _loadContestLocalForCompetitor() {
    const res = await window.api.importContestDialog();
    if (res.success && res.config) {
      this.activeContest = res.config;
      this.activeContestSource = 'Local USB File';
      this._updateCompetitorContestStatus(res.config, 'Local File');
      this._checkCompStartButton();
      this.showToast(`Loaded "${res.config.title}" (${(res.config.problems || []).length} questions).`, 'success');
    }
  }

  async _startCompetitorSession() {
    const usn = this.compUsnInput.value.trim().toUpperCase();
    const name = this.compNameInput.value.trim() || 'Candidate ' + usn;
    const hostUrl = this.compHostUrl.value.trim() || 'http://localhost:8080';

    if (!usn || usn.length < 3) {
      this.showToast('Please enter your valid Student USN / Reg No (min 3 characters).', 'warning');
      return;
    }

    // MANDATORY SYNC: If not yet synced, or if hostUrl is reachable, fetch latest questions from Host!
    if (!this.activeContest || (hostUrl && !hostUrl.includes('offline'))) {
      this.showToast('Syncing latest contest questions from Host...', 'info');
      const synced = await this._pullContestOverLan(false);
      if (!synced && !this.activeContest) {
        this.showToast(`Cannot start test: Could not load questions from Host (${hostUrl}). Ensure the Host laptop is broadcasting or click "Load Config File".`, 'error');
        return;
      }
    }

    if (!this.activeContest || !this.activeContest.problems || this.activeContest.problems.length === 0) {
      this.showToast('No contest questions available. Please sync from Host or load a contest file.', 'error');
      return;
    }

    this.competitor.usn = usn;
    this.competitor.name = name;
    this.competitor.hostUrl = hostUrl;
    this.competitor.durationSeconds = (this.activeContest.durationMinutes || 60) * 60;
    this.competitor.uptimeSeconds = 0;
    this.competitor.isSessionActive = true;
    this.compStep = 4;
    this.competitor.problemCodes = {};
    this.competitor.evaluations = {};

    // Check for prior session snapshot for crash/power-cut recovery
    const snap = await window.api.loadSessionSnapshot({ usn });
    if (snap.success && snap.found && snap.data) {
      this.showToast(`Restoring prior session snapshot for ${usn}...`, 'info');
      this.competitor.uptimeSeconds = snap.data.timeElapsedSeconds || 0;
      this.competitor.problemCodes = snap.data.problemCodes || {};
      this.competitor.evaluations = snap.data.evaluations || {};
    } else {
      // Seed starter codes from the active questions
      this.activeContest.problems.forEach(p => {
        this.competitor.problemCodes[p.id] = p.starterCode || '// Write solution here\n';
      });
    }

    // Initialize interactive terminal session for this USN
    if (window.api && window.api.initTerminalSession) {
      const termRes = await window.api.initTerminalSession({ usn });
      if (termRes && termRes.cwd) {
        if (this.terminalCwdTag) this.terminalCwdTag.textContent = termRes.cwd;
        if (this.terminalCliPrompt) this.terminalCliPrompt.textContent = termRes.cwd + '>';
      }
    }

    // Check if in Exam Mode and student has an assigned experiment
    const isExamMode = (this.activeContest.type === 'exam') || (this.activeContest.problems || []).some(p => p.tier === 'lab');
    let assignedProblemId = null;
    let foundStudent = null;

    if (isExamMode && this.activeContest.batches) {
      for (const b of this.activeContest.batches) {
        const found = (b.students || []).find(s => s.usn && s.usn.trim().toUpperCase() === usn);
        if (found) {
          foundStudent = found;
          if (found.assignedProblemId) {
            assignedProblemId = found.assignedProblemId;
          }
          break;
        }
      }
    }

    // Switch to active kiosk workspace
    this.compRegOverlay.style.display = 'none';
    this.competitorWorkspace.style.display = 'flex';

    if (isExamMode && assignedProblemId) {
      this._openProblemWorkspace(assignedProblemId);
      this.showToast(`Lab Exam: Welcome ${name}! Opening your allocated experiment (${foundStudent?.assignedProblemTitle || 'Assigned Experiment'}).`, 'success');
    } else {
      this.competitorBankView.style.display = 'flex';
      this.competitorWorkspaceView.style.display = 'none';
      this._renderQuestionMatrix();
    }

    // Enforce clean Kiosk lockdown state
    this.isKioskUnlocked = false;
    this.isReviewMode = false;
    this.btnSupervisorKey.textContent = '🔑 Supervisor UNLOCK';
    this.btnSupervisorKey.className = 'btn btn-secondary btn-sm';
    this.btnSupervisorKey.title = 'Supervisor Key Override';
    this.navKioskBadge.textContent = 'KIOSK CONFINEMENT ACTIVE';
    this.navKioskBadge.style.borderColor = '';
    this.navKioskBadge.style.color = '';

    // Once questions are rendered and visible to candidate, activate strict kiosk lockdown
    if (window.api && window.api.setSecurityMode) {
      await window.api.setSecurityMode({ mode: 'kiosk' });
    }

    // Update navigation
    this.navCandidateUsn.textContent = `${usn} (${name})`;
    this.navCandidatePill.style.display = 'inline-flex';
    this.navTimerBox.style.display = 'inline-flex';
    this.navKioskBadge.style.display = 'inline-flex';
    this.btnEndSession.style.display = 'inline-flex';
    this.btnSupervisorKey.style.display = 'inline-flex';
    if (this.btnExitComp) this.btnExitComp.style.display = 'none';

    // Start Relative Countdown
    this._startRelativeCountdown();

    this.showToast(`Test started with ${this.activeContest.problems.length} questions. Station locked down!`, 'success');
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
    const isExam = this.activeContest.type === 'exam';
    const problems = this.activeContest.problems || [];

    if (isExam) {
      const assignedProbId = this.competitor.assignedProblemId;
      const countAssigned = assignedProbId ? 1 : problems.length;
      const ev = assignedProbId ? this.competitor.evaluations[assignedProbId] : null;
      const passed = ev && ev.passedCount === ev.totalCount && ev.totalCount > 0 ? 1 : 0;

      this.tierCountEasy.textContent = `${problems.length} Exps`;
      this.tierStatusEasy.textContent = `${passed} / ${countAssigned} Evaluated`;
      this.tierCountMedium.textContent = 'Exam Mode';
      this.tierStatusMedium.textContent = assignedProbId ? 'Assigned' : 'General';
      this.tierCountHard.textContent = 'Lab Exam';
      this.tierStatusHard.textContent = 'Autonomous';
      return;
    }

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
    const isExam = this.activeContest && this.activeContest.type === 'exam';

    if (isExam) {
      this.matrixTierHeading.textContent = '🎓 Lab Examination Experiment';
      let problems = this.activeContest.problems || [];
      const assignedProbId = this.competitor.assignedProblemId;
      if (assignedProbId) {
        const assigned = problems.find(p => p.id === assignedProbId);
        if (assigned) problems = [assigned];
      }

      this.questionMatrixList.innerHTML = '';
      if (problems.length === 0) {
        this.questionMatrixList.innerHTML = `<div style="color: var(--text-muted); padding: 30px;">No lab examination experiments configured.</div>`;
        return;
      }

      problems.forEach(p => {
        const card = document.createElement('div');
        card.className = 'question-card';
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

        const isAssigned = p.id === assignedProbId;

        card.innerHTML = `
          <div class="question-card-left">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <div class="question-card-title">${this._escape(p.title)}</div>
              ${isAssigned ? '<span class="candidate-pill" style="color: var(--color-cyan); border-color: var(--color-cyan); font-size: 0.72rem;">★ Your Assigned Experiment</span>' : ''}
              ${this.competitor.isChangeOfExperiment && isAssigned ? '<span class="badge-change-of-exp">🔄 Change of Exp (-' + (this.competitor.changeOfExpPenalty || 5) + ' Marks)</span>' : ''}
            </div>
            <span class="status-tag ${statusClass}">● ${statusLabel}</span>
            <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 4px;">
              Marks: <strong style="color: var(--color-emerald);">${p.maxPoints || 50} Marks</strong> | Test Cases: ${(p.testCases || []).length}
            </div>
          </div>
          <button class="btn btn-primary btn-sm btn-open-workspace" data-id="${p.id}">
            Open Experiment Workspace →
          </button>
        `;

        card.querySelector('.btn-open-workspace').addEventListener('click', () => {
          this._openProblemWorkspace(p.id);
        });

        this.questionMatrixList.appendChild(card);
      });
      return;
    }

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

      const tier = (p.tier || 'easy').toLowerCase();
      const tierBadge = tier === 'hard'
        ? `<span class="badge-tier-hard">HARD</span>`
        : (tier === 'medium'
          ? `<span class="badge-tier-medium">MEDIUM</span>`
          : `<span class="badge-tier-easy">EASY</span>`);

      card.innerHTML = `
        <div class="question-card-left">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <div class="question-card-title">${this._escape(p.title)}</div>
            ${tierBadge}
          </div>
          <span class="status-tag ${statusClass}">● ${statusLabel}</span>
          <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 4px;">
            Marks: <strong style="color: var(--color-emerald);">${p.maxPoints} Marks</strong> | Category: ${this._escape(p.category || 'Algorithmic Challenge')}
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
    this.competitorWorkspaceView.style.display = 'flex';

    // In Exam Mode: hide Return to Bank, Reset Code, Run Code (Samples), and Submit & Grade buttons
    const isExam = !!(
      this.competitor.isExamMode ||
      (this.activeContest && (this.activeContest.type === 'exam' || (this.activeContest.problems || []).some(p => p.tier === 'lab')))
    );
    if (isExam) {
      if (this.btnBackToBank) this.btnBackToBank.style.display = 'none';
      if (this.btnWsResetCode) this.btnWsResetCode.style.display = 'none';
      if (this.btnWsRunSample) this.btnWsRunSample.style.display = 'none';
      if (this.btnWsRunTests) this.btnWsRunTests.style.display = 'none';
    } else {
      if (this.btnBackToBank) this.btnBackToBank.style.display = 'inline-flex';
      if (this.btnWsResetCode) this.btnWsResetCode.style.display = 'inline-flex';
      if (this.btnWsRunSample) this.btnWsRunSample.style.display = 'inline-flex';
      if (this.btnWsRunTests) this.btnWsRunTests.style.display = 'inline-flex';
    }

    // Sync starter/existing code to solution.c in workspace for terminal use
    if (window.api && window.api.syncTerminalEditorFile) {
      const existingCode = this.competitor.problemCodes[problemId] || prob.starterCode || '';
      window.api.syncTerminalEditorFile({ filename: 'solution.c', code: existingCode });
    }

    // Ensure split layout is properly visible on opening
    if (this.wsLeftPanel) {
      this.wsLeftPanel.style.display = 'flex';
      if (!this.wsLeftPanel.style.width) this.wsLeftPanel.style.width = '44%';
    }
    if (this.workspaceResizer) this.workspaceResizer.style.display = 'block';
    if (this.btnWsToggleExpand) {
      this.btnWsToggleExpand.innerHTML = '⛶ Expand Workspace';
      this.btnWsToggleExpand.classList.remove('btn-primary');
      this.btnWsToggleExpand.classList.add('btn-secondary');
    }

    // Populate Left Sub-Panel with highlighted tier and clean format
    this.wsProblemTitle.textContent = prob.title;
    const tier = (prob.tier || 'easy').toLowerCase();
    if (prob.tier === 'lab' || this.hostContestType === 'exam' || (this.activeContest && this.activeContest.type === 'exam') || this.competitor.isExamMode) {
      this.wsProblemTierTag.textContent = 'LAB EXPERIMENT';
      this.wsProblemTierTag.className = 'badge-tier-lab';
      this.wsProblemPoints.textContent = `— ${prob.maxPoints || 50} Marks`;
    } else {
      this.wsProblemTierTag.textContent = tier.toUpperCase();
      this.wsProblemTierTag.className = tier === 'hard' ? 'badge-tier-hard' : (tier === 'medium' ? 'badge-tier-medium' : 'badge-tier-easy');
      this.wsProblemPoints.textContent = `— ${prob.maxPoints || (tier === 'hard' ? 15 : (tier === 'medium' ? 10 : 5))} Marks`;
    }
    this.wsProblemDesc.textContent = prob.description;

    // Change of Experiment Notice Banner
    if (this.wsChangeOfExpNotice) {
      let isCoe = false;
      let coeDetails = '';
      if (this.activeContest && this.activeContest.batches) {
        for (const b of this.activeContest.batches) {
          const s = (b.students || []).find(st => st.usn && st.usn.trim().toUpperCase() === (this.competitor.usn || '').trim().toUpperCase());
          if (s && s.isChangeOfExperiment && s.assignedProblemId === problemId) {
            isCoe = true;
            coeDetails = `Original: ${s.originalProblemTitle || 'Previous Exp'} ➔ Assigned: ${s.assignedProblemTitle} (Penalty: -${s.penalty || 5} Marks applied per lab exam regulation)`;
            break;
          }
        }
      }
      if (isCoe) {
        if (this.wsChangeOfExpDetails) this.wsChangeOfExpDetails.textContent = coeDetails;
        this.wsChangeOfExpNotice.style.display = 'flex';
      } else {
        this.wsChangeOfExpNotice.style.display = 'none';
      }
    }

    // HackerRank Style Sample Test Cases & Hidden Test Cases rendering
    const allTestCases = prob.testCases || [];
    const sampleCases = allTestCases.filter(tc => tc.isSample);
    const displaySamples = sampleCases.length > 0 ? sampleCases : (allTestCases.length > 0 ? [allTestCases[0]] : []);
    const hiddenCount = allTestCases.length - displaySamples.length;

    if (this.wsSampleCasesContainer) {
      let html = displaySamples.map((tc, sIdx) => `
        <div class="sample-case-box" style="margin-bottom: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <div style="font-size: 0.8rem; font-weight: 700; color: var(--color-cyan); text-transform: uppercase;">
              Sample Test Case ${sIdx}
            </div>
            <span class="badge-sample-case" style="font-size: 0.68rem;">★ Visible Example</span>
          </div>
          <div class="sample-grid">
            <div>
              <label style="font-size: 0.8rem; color: var(--text-main); font-weight: 700; display: block; margin-bottom: 4px;">Sample Input:</label>
              <pre>${this._escape(tc.input || '--')}</pre>
            </div>
            <div>
              <label style="font-size: 0.8rem; color: var(--text-main); font-weight: 700; display: block; margin-bottom: 4px;">Expected Output:</label>
              <pre>${this._escape(tc.expectedOutput || '--')}</pre>
            </div>
          </div>
        </div>
      `).join('');

      if (hiddenCount > 0 && !isExam) {
        html += `
          <div class="hidden-cases-banner">
            <span style="font-size: 1.15rem;">🔒</span>
            <div style="flex: 1;">
              <strong style="color: var(--color-amber);">${hiddenCount} Hidden Test Case(s)</strong>
              <div style="font-size: 0.74rem; color: var(--text-secondary); margin-top: 2px; line-height: 1.4;">
                Input &amp; output values are protected to prevent hardcoding. They will be executed when you click <strong>"Submit &amp; Grade (All Cases)"</strong>.
              </div>
            </div>
          </div>
        `;
      }
      this.wsSampleCasesContainer.innerHTML = html;
    } else {
      const sample = displaySamples[0];
      if (this.wsSampleInput) this.wsSampleInput.textContent = sample ? sample.input : '--';
      if (this.wsSampleOutput) this.wsSampleOutput.textContent = sample ? sample.expectedOutput : '--';
    }

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

      // Allow native copy (Ctrl+C), cut (Ctrl+X), and paste (Ctrl+V) inside the code workspace editor
    });

    // Handle paste and cut in code editor to update gutter and autosave
    this.editorCode.addEventListener('paste', () => {
      setTimeout(() => {
        this._updateEditorGutter();
        if (this.competitor.isSessionActive) {
          const probId = this.competitor.activeProblemId;
          const lang = this.competitor.currentLanguage;
          if (probId) {
            this.competitor.problemCodes[`${probId}_${lang}`] = this.editorCode.value;
            this._autoSaveSessionSnapshot();
          }
        }
      }, 0);
    });

    this.editorCode.addEventListener('cut', () => {
      setTimeout(() => {
        this._updateEditorGutter();
        if (this.competitor.isSessionActive) {
          const probId = this.competitor.activeProblemId;
          const lang = this.competitor.currentLanguage;
          if (probId) {
            this.competitor.problemCodes[`${probId}_${lang}`] = this.editorCode.value;
            this._autoSaveSessionSnapshot();
          }
        }
      }, 0);
    });

    // Restrict copying outside the code workspace editor
    document.addEventListener('copy', (e) => {
      if (e.target === this.editorCode) return;
      e.preventDefault();
      this.showToast('Copying question text outside workspace is restricted.', 'warning');
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

    // HackerRank Style: Run Code (Sample Cases only)
    if (this.btnWsRunSample) {
      this.btnWsRunSample.addEventListener('click', () => this._runActiveProblemTests(true));
    }

    // Submit & Grade (Full Test Suite: Sample + Hidden Cases)
    if (this.btnWsRunTests) {
      this.btnWsRunTests.addEventListener('click', () => this._runActiveProblemTests(false));
    }

    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (this.currentView === 'competitor' && this.competitor.activeProblemId) {
          e.preventDefault();
          this._runActiveProblemTests(false);
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
    this.editorGutter.scrollTop = this.editorCode.scrollTop;
  }

  _appendTerminalLine(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    this.terminalStream.appendChild(div);
    this.terminalStream.scrollTop = this.terminalStream.scrollHeight;
  }

  async _runActiveProblemTests(samplesOnly = false) {
    const prob = (this.activeContest.problems || []).find(p => p.id === this.competitor.activeProblemId);
    if (!prob) return;

    if (this.btnWsRunSample) this.btnWsRunSample.disabled = true;
    if (this.btnWsRunTests) {
      this.btnWsRunTests.disabled = true;
      this.btnWsRunTests.textContent = '⏳ Compiling...';
    }

    this.terminalStream.innerHTML = '';
    const runModeLabel = samplesOnly ? 'SAMPLE CASES ONLY' : 'FULL SUITE (SAMPLE & HIDDEN CASES)';
    this._appendTerminalLine(`<span style="color: var(--color-cyan);">&gt; gcc -O2 temp.c -o temp.exe [${runModeLabel}]</span>`);

    // Determine target test cases
    let targetTestCases = prob.testCases || [];
    if (samplesOnly) {
      const explicitSamples = targetTestCases.filter(tc => tc.isSample);
      targetTestCases = explicitSamples.length > 0 ? explicitSamples : (targetTestCases.length > 0 ? [targetTestCases[0]] : []);
    }

    const result = await window.api.compileAndEvaluate({
      code: this.editorCode.value,
      language: this.activeContest.language || 'c',
      testCases: targetTestCases,
      timeoutMs: prob.timeLimitMs || 2000,
      maxPoints: prob.maxPoints || 20
    });

    if (this.btnWsRunSample) this.btnWsRunSample.disabled = false;
    if (this.btnWsRunTests) {
      this.btnWsRunTests.disabled = false;
      this.btnWsRunTests.textContent = '⚡ Submit & Grade (All Cases)';
    }

    if (!result.success && result.phase === 'compilation') {
      this.terminalTopStatus.textContent = 'STATUS // BUILD ERROR';
      this._appendTerminalLine(`<span style="color: var(--color-rose); font-weight: bold;">[COMPILATION FAILED]:</span>`);
      this._appendTerminalLine(`<pre style="color: var(--color-rose);">${this._escape(result.compilerError)}</pre>`);
      return;
    }

    if (samplesOnly) {
      this.terminalTopStatus.textContent = 'STATUS // SAMPLE CASES EVALUATED';
      this._appendTerminalLine(`<span style="color: var(--color-cyan); font-weight: bold;">SAMPLE TEST CASES: ${result.passedCount}/${result.totalCount} PASSED</span>`);
      this._appendTerminalLine(`<span style="color: var(--text-muted);">Execution Time: ${result.totalExecutionTimeMs} ms</span>\n`);

      (result.testResults || []).forEach(tc => {
        if (tc.passed) {
          this._appendTerminalLine(`<span style="color: #39ff14; font-weight: 700;">✔ Sample Case #${tc.index}: PASSED (${tc.executionTimeMs}ms)</span>`);
        } else if (tc.timedOut) {
          this._appendTerminalLine(`<span style="color: var(--color-rose); font-weight: 700;">✖ Sample Case #${tc.index}: TIME LIMIT EXCEEDED (> ${prob.timeLimitMs || 2000}ms)</span>`);
        } else {
          this._appendTerminalLine(`<span style="color: var(--color-rose); font-weight: 700;">✖ Sample Case #${tc.index}: WRONG ANSWER (${tc.executionTimeMs}ms)</span>`);
          this._appendTerminalLine(`    Input:           "${this._escape(tc.input.trim())}"`);
          this._appendTerminalLine(`    Your Output:     "${this._escape(tc.actualOutput.trim())}"`);
          this._appendTerminalLine(`    Expected Output: "${this._escape(tc.expectedOutput.trim())}"`);
        }
      });

      this._appendTerminalLine(`\n<span style="color: var(--color-cyan); font-weight: 600;">[HACKERRANK RUNTIME]: Sample evaluation complete. Click "⚡ Submit &amp; Grade (All Cases)" to evaluate against all hidden test cases and earn points!</span>`);
      return;
    }

    // Full Test Suite Evaluation (Sample + Hidden)
    this.terminalTopStatus.textContent = 'STATUS // EVALUATION COMPLETED';
    this._appendTerminalLine(`<span style="color: var(--color-emerald); font-weight: bold;">TEST SUITE EVALUATED: ${result.passedCount}/${result.totalCount} PASSED (${result.totalScore}/${result.maxScore} PTS)</span>`);
    this._appendTerminalLine(`<span style="color: var(--text-muted);">Total CPU Execution: ${result.totalExecutionTimeMs} ms</span>\n`);

    (result.testResults || []).forEach(tc => {
      const tag = tc.isSample ? '[SAMPLE]' : '[HIDDEN]';
      if (tc.passed) {
        this._appendTerminalLine(`<span style="color: #39ff14; font-weight: 700;">✔ Test Case #${tc.index} ${tag}: PASSED (${tc.executionTimeMs}ms)</span>`);
      } else if (tc.timedOut) {
        this._appendTerminalLine(`<span style="color: var(--color-rose); font-weight: 700;">✖ Test Case #${tc.index} ${tag}: TIME LIMIT EXCEEDED (> ${prob.timeLimitMs || 2000}ms)</span>`);
        if (!tc.isSample) {
          this._appendTerminalLine(`    (Possible infinite loop or inefficient time complexity for large hidden input)`);
        }
      } else if (tc.runtimeError) {
        this._appendTerminalLine(`<span style="color: var(--color-rose); font-weight: 700;">✖ Test Case #${tc.index} ${tag}: RUNTIME ERROR</span>`);
        this._appendTerminalLine(`    ${this._escape(tc.runtimeError)}`);
      } else {
        this._appendTerminalLine(`<span style="color: var(--color-rose); font-weight: 700;">✖ Test Case #${tc.index} ${tag}: FAILED - WRONG ANSWER (${tc.executionTimeMs}ms)</span>`);
        if (tc.isSample) {
          this._appendTerminalLine(`    Input:           "${this._escape(tc.input.trim())}"`);
          this._appendTerminalLine(`    Your Output:     "${this._escape(tc.actualOutput.trim())}"`);
          this._appendTerminalLine(`    Expected Output: "${this._escape(tc.expectedOutput.trim())}"`);
        } else {
          this._appendTerminalLine(`    [Hidden Case]: Output did not match expected output. Verify edge cases, boundary values, or formatting!`);
        }
      }
    });

    if (result.passedCount === result.totalCount && result.totalCount > 0) {
      this._appendTerminalLine(`\n<span style="color: #39ff14; font-weight: 800; font-size: 0.95rem;">🎉 SUCCESS! All ${result.totalCount} Test Cases Passed! Full Score: ${result.totalScore} / ${result.maxScore} Pts!</span>`);
    } else {
      this._appendTerminalLine(`\n<span style="color: var(--color-amber); font-weight: 800;">⚠ Test Evaluation: ${result.passedCount} / ${result.totalCount} Passed (${result.totalScore} / ${result.maxScore} Pts earned). Fix errors and re-submit!</span>`);
    }

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
  // SESSION FINALIZATION & END SESSION LOGIC (AUTOMATED BATCH TEST SUITE)
  // --------------------------------------------------------------------------
  async _finalizeSession(isTimeout = false) {
    this.competitor.isSessionActive = false;
    if (this.competitor.timerInterval) clearInterval(this.competitor.timerInterval);

    // Save current active problem code from editor if any
    if (this.competitor.activeProblemId && this.editorCode) {
      // Save under both plain key and language-keyed key to ensure batch lookup finds it
      const activeLang = this.activeContest?.language || 'c';
      this.competitor.problemCodes[this.competitor.activeProblemId] = this.editorCode.value;
      this.competitor.problemCodes[`${this.competitor.activeProblemId}_${activeLang}`] = this.editorCode.value;
    }

    const normalizeCode = (str) => {
      if (typeof str !== 'string') return '';
      return str.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    };

    const problems = (this.activeContest && this.activeContest.problems) || [];
    const contestLang = (this.activeContest && this.activeContest.language) || 'c';

    // Determine which problems were actually attempted (code differs from starter)
    const attemptedProblems = problems.filter(p => {
      const code = this.competitor.problemCodes[p.id] ||
                   this.competitor.problemCodes[`${p.id}_${contestLang}`] ||
                   this.competitor.problemCodes[`${p.id}_c`] ||
                   this.competitor.problemCodes[`${p.id}_python`] || '';
      const normCode = normalizeCode(code);
      const defaultC = normalizeCode(p.starterCode || '#include <stdio.h>\n#include <stdlib.h>\n\nint main() {\n    // Write C solution here\n    return 0;\n}\n');
      const defaultPy = normalizeCode(p.starterCodePython || '# Write Python 3 solution here\nimport sys\n\ndef main():\n    pass\n\nif __name__ == "__main__":\n    main()\n');
      return normCode.length > 0 && normCode !== defaultC && normCode !== defaultPy;
    });

    const isExam = !!(
      this.competitor.isExamMode ||
      (this.activeContest && (this.activeContest.type === 'exam' || (this.activeContest.problems || []).some(p => p.tier === 'lab')))
    );

    // AUTOMATED BATCH RUN: Run test cases for all attempted problems on End Session (Contest Mode only)
    if (!isExam) {
      if (this.modalEvaluatingAll) {
        this.modalEvaluatingAll.classList.add('active');
      }

      for (let i = 0; i < attemptedProblems.length; i++) {
        const p = attemptedProblems[i];
        const tierLabel = (p.tier || 'Round').toUpperCase();
        const pct = Math.round((i / Math.max(attemptedProblems.length, 1)) * 100);

        if (this.evalProgressStatus) {
          this.evalProgressStatus.innerHTML = `Evaluating <strong>[${tierLabel}] ${this._escape(p.title || p.id)}</strong>... (${i + 1}/${attemptedProblems.length})`;
        }
        if (this.evalProgressBar) this.evalProgressBar.style.width = `${pct}%`;
        if (this.evalProgressCount) this.evalProgressCount.textContent = `${i + 1} / ${attemptedProblems.length} Attempted Problems Evaluated`;
        if (this.evalProgressPercent) this.evalProgressPercent.textContent = `${pct}%`;

        const code = this.competitor.problemCodes[p.id] ||
                     this.competitor.problemCodes[`${p.id}_${contestLang}`] ||
                     p.starterCode || '';

        try {
          const evalRes = await window.api.compileAndEvaluate({
            code,
            language: contestLang,
            testCases: p.testCases || [],
            timeoutMs: p.timeLimitMs || 2500,
            maxPoints: p.maxPoints || 20
          });
          this.competitor.evaluations[p.id] = evalRes;
        } catch (err) {
          this.competitor.evaluations[p.id] = {
            success: false,
            phase: 'system',
            compilerError: err.message,
            totalScore: 0,
            maxScore: p.maxPoints || 0,
            passedCount: 0,
            totalCount: (p.testCases || []).length,
            totalExecutionTimeMs: 0
          };
        }
      }

      if (this.evalProgressBar) this.evalProgressBar.style.width = '100%';
      if (this.evalProgressPercent) this.evalProgressPercent.textContent = '100%';
      if (this.evalProgressCount) this.evalProgressCount.textContent = `${attemptedProblems.length} / ${attemptedProblems.length} Attempted Problems Evaluated`;
      if (this.evalProgressStatus) this.evalProgressStatus.textContent = attemptedProblems.length > 0 ? `All ${attemptedProblems.length} attempted problem(s) evaluated! Finalizing scores...` : 'No problems attempted. Finalizing...';
      await new Promise(r => setTimeout(r, 350));
      if (this.modalEvaluatingAll) this.modalEvaluatingAll.classList.remove('active');
    }

    // Build a Set of attempted problem IDs for O(1) lookup
    const attemptedIds = new Set(attemptedProblems.map(p => p.id));

    // Compute aggregated final metrics & round breakdowns
    let totalScore = 0;
    let maxContestScore = 0;
    let totalCpuMs = 0;
    let solvedCount = 0;
    const tierScores = {};
    const roundBreakdown = [];

    problems.forEach(p => {
      maxContestScore += (p.maxPoints || 0);
      const wasAttempted = attemptedIds.has(p.id);
      const ev = this.competitor.evaluations[p.id] || null;

      const earned = ev ? (ev.totalScore || 0) : 0;
      totalScore += earned;
      totalCpuMs += ev ? (ev.totalExecutionTimeMs || 0) : 0;
      const isSolved = ev && ev.passedCount === ev.totalCount && ev.totalCount > 0;
      if (isSolved) solvedCount++;

      const tierKey = (p.tier || 'general').toLowerCase();
      if (!tierScores[tierKey]) {
        let displayName = tierKey.toUpperCase();
        if (tierKey === 'easy') displayName = 'Easy (Round 1)';
        else if (tierKey === 'medium') displayName = 'Medium (Round 2)';
        else if (tierKey === 'hard') displayName = 'Hard (Round 3)';

        tierScores[tierKey] = {
          tier: tierKey,
          name: displayName,
          score: 0,
          maxScore: 0,
          solvedCount: 0,
          attemptedCount: 0,
          totalCount: 0
        };
      }
      tierScores[tierKey].score += earned;
      tierScores[tierKey].maxScore += (p.maxPoints || 0);
      if (isSolved) tierScores[tierKey].solvedCount++;
      if (wasAttempted) tierScores[tierKey].attemptedCount++;
      tierScores[tierKey].totalCount++;

      // Determine status — unattempted problems are NOT ATTEMPTED, not FAILED
      let status = 'NOT ATTEMPTED';
      if (wasAttempted && ev) {
        if (ev.phase === 'compilation' || (!ev.success && ev.compilerError)) {
          status = 'BUILD ERROR';
        } else if (isSolved) {
          status = 'PASSED';
        } else if (ev.passedCount > 0) {
          status = 'PARTIAL';
        } else {
          status = 'FAILED';
        }
      }

      roundBreakdown.push({
        id: p.id,
        title: p.title || p.id,
        tier: p.tier || 'easy',
        attempted: wasAttempted,
        score: earned,
        maxScore: p.maxPoints || 0,
        passedCount: ev ? (ev.passedCount || 0) : 0,
        totalCount: ev ? (ev.totalCount || (p.testCases || []).length) : (p.testCases || []).length,
        totalExecutionTimeMs: ev ? (ev.totalExecutionTimeMs || 0) : 0,
        status
      });
    });

    const finalPayload = {
      usn: this.competitor.usn,
      name: this.competitor.name,
      contestId: this.activeContest.id,
      contestTitle: this.activeContest.title,
      totalScore: Math.round(totalScore * 10) / 10,
      maxScore: maxContestScore,
      problemsSolvedCount: solvedCount,
      totalAttempted: attemptedProblems.length,
      totalProblems: problems.length,
      tierScores,
      roundBreakdown,
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
    if (isExam) {
      if (this.tyHeaderTitle) {
        this.tyHeaderTitle.textContent = 'Thank you and all the best for your result!';
      }
      if (this.tyHeaderDesc) {
        this.tyHeaderDesc.textContent = 'Your laboratory examination session has concluded and your solution has been successfully submitted. All the best for your result!';
      }
      if (this.tyContestScoresSection) {
        this.tyContestScoresSection.style.display = 'none';
      }
      if (this.tyAuditPackageLine) {
        this.tyAuditPackageLine.style.display = 'none';
      }
      this.tyCandidateUsn.textContent = `${this.competitor.usn} (${this.competitor.name})`;
      if (this.tySyncStatus) {
        this.tySyncStatus.innerHTML = `✔ Laboratory examination solution successfully recorded.${syncSuccess ? ' <span style="color: var(--color-emerald);">(Synchronized to Host)</span>' : ''}`;
        this.tySyncStatus.style.color = 'var(--color-emerald)';
      }
      if (this.btnTyReviewCode) {
        this.btnTyReviewCode.innerHTML = '🔑 Supervisor Review';
      }
      if (this.btnTyExitApp) {
        this.btnTyExitApp.innerHTML = '⌂ Return to Main Menu';
      }
    } else {
      if (this.tyHeaderTitle) {
        this.tyHeaderTitle.textContent = 'Thank You for Participating!';
      }
      if (this.tyHeaderDesc) {
        this.tyHeaderDesc.textContent = 'Your competitive programming session has ended. All your solutions across all rounds and tiers have been automatically executed against all test cases and finalized into an immutable audit package.';
      }
      if (this.tyContestScoresSection) {
        this.tyContestScoresSection.style.display = 'flex';
      }
      if (this.tyAuditPackageLine) {
        this.tyAuditPackageLine.style.display = 'block';
      }
      if (this.btnTyReviewCode) {
        this.btnTyReviewCode.innerHTML = '🔑 Supervisor Review';
      }
      if (this.btnTyExitApp) {
        this.btnTyExitApp.innerHTML = '⌂ Return to Main Menu';
      }

      const totalAttempted = attemptedProblems.length;
      this.tyTotalScore.textContent = `${Math.round(totalScore * 10) / 10} / ${maxContestScore}`;
      if (this.tySolvedCount) {
        this.tySolvedCount.textContent = `${solvedCount} / ${totalAttempted} Attempted`;
      }
      const m = Math.floor(this.competitor.uptimeSeconds / 60);
      const s = this.competitor.uptimeSeconds % 60;
      this.tyDuration.textContent = `${m}m ${s < 10 ? '0' : ''}${s}s`;
      this.tyCandidateUsn.textContent = `${this.competitor.usn} (${this.competitor.name})`;
      this.tyPayloadFile.textContent = saveRes.filename || `FINAL_${this.competitor.usn}.json`;

      if (syncSuccess) {
        this.tySyncStatus.innerHTML = `✔ Final package saved to submissions/${saveRes.filename || 'FINAL_' + this.competitor.usn + '.json'} <span style="color: var(--color-emerald);">(Synchronized to Host)</span>`;
        this.tySyncStatus.style.color = 'var(--color-emerald)';
      } else {
        this.tySyncStatus.innerHTML = `✔ Final package saved to submissions/${saveRes.filename || 'FINAL_' + this.competitor.usn + '.json'}`;
        this.tySyncStatus.style.color = 'var(--color-emerald)';
      }

      // Render Round/Tier Score Breakdown Cards
      if (this.tyRoundCardsContainer) {
        const roundOrder = ['easy', 'medium', 'hard'];
        const allTierKeys = Object.keys(tierScores);
        const sortedKeys = roundOrder.filter(k => allTierKeys.includes(k)).concat(allTierKeys.filter(k => !roundOrder.includes(k)));

        this.tyRoundCardsContainer.innerHTML = sortedKeys.map(k => {
          const item = tierScores[k];
          let color = 'var(--color-cyan)';
          if (k === 'easy') color = 'var(--color-emerald)';
          else if (k === 'medium') color = 'var(--color-amber)';
          else if (k === 'hard') color = 'var(--color-rose)';

          const attemptedInTier = item.attemptedCount || 0;
          return `
            <div class="round-score-card" style="border-left: 4px solid ${color};">
              <span style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">${this._escape(item.name)}</span>
              <div style="font-size: 1.35rem; font-weight: 800; font-family: var(--font-mono); color: ${color};">
                ${Math.round(item.score * 10) / 10} <span style="font-size: 0.85rem; color: var(--text-secondary); font-weight: 500;">/ ${item.maxScore} pts</span>
              </div>
              <span style="font-size: 0.75rem; color: var(--text-secondary);">${item.solvedCount} fully solved &nbsp;|&nbsp; ${attemptedInTier} / ${item.totalCount} attempted</span>
            </div>
          `;
        }).join('');
      }

      // Render Programs Test Suite Results Table
      if (this.tyProgramsTbody) {
        this.tyProgramsTbody.innerHTML = roundBreakdown.map((item, idx) => {
          let badgeClass = 'badge-status-failed';
          if (item.status === 'PASSED') badgeClass = 'badge-status-passed';
          else if (item.status === 'PARTIAL') badgeClass = 'badge-status-partial';
          else if (item.status === 'BUILD ERROR') badgeClass = 'badge-status-error';
          else if (item.status === 'NOT ATTEMPTED') badgeClass = 'badge-status-unattempted';

          let tierColor = 'var(--text-muted)';
          const tk = (item.tier || '').toLowerCase();
          if (tk === 'easy') tierColor = 'var(--color-emerald)';
          else if (tk === 'medium') tierColor = 'var(--color-amber)';
          else if (tk === 'hard') tierColor = 'var(--color-rose)';

          const scoreColor = item.score > 0 ? 'var(--color-emerald)' : 'var(--text-muted)';
          const testCaseDisplay = item.attempted ? `${item.passedCount} / ${item.totalCount}` : '—';
          const cpuDisplay = item.attempted ? `${item.totalExecutionTimeMs} ms` : '—';

          return `
            <tr style="${!item.attempted ? 'opacity: 0.5;' : ''}">
              <td style="text-align: center; color: var(--text-muted); font-family: var(--font-mono);">${idx + 1}</td>
              <td style="color: ${tierColor}; font-weight: 700; text-transform: uppercase;">${this._escape(item.tier)}</td>
              <td style="font-weight: 600;">${this._escape(item.title)}</td>
              <td style="text-align: center; font-family: var(--font-mono);">${testCaseDisplay}</td>
              <td style="text-align: center; font-family: var(--font-mono);"><strong style="color: ${scoreColor};">${item.attempted ? `${Math.round(item.score * 10) / 10} / ${item.maxScore}` : `0 / ${item.maxScore}`}</strong></td>
              <td style="text-align: center; font-family: var(--font-mono); font-size: 0.78rem;">${cpuDisplay}</td>
              <td style="text-align: center;"><span class="${badgeClass}">${item.status}</span></td>
            </tr>
          `;
        }).join('');
      }
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

  async _handleSupervisorConfirm() {
    const entered = this.supervisorKeyInput.value.trim();
    const res = await window.api.verifySupervisorKey({ key: entered });
    if (res && res.success) {
      this.modalSupervisor.classList.remove('active');
      if (this.supervisorAction === 'review') {
        this._startSupervisorReviewMode();
      } else if (this.supervisorAction === 'main_menu' || this.supervisorAction === 'close') {
        await this._returnToMainMenu();
      } else {
        // Kiosk unlock
        this.isKioskUnlocked = true;
        this.btnSupervisorKey.textContent = '🔒 Lock Kiosk';
        this.btnSupervisorKey.className = 'btn btn-warning btn-sm';
        this.btnSupervisorKey.title = 'Click to Re-Activate Kiosk Lockdown';
        this.navKioskBadge.textContent = 'KIOSK OVERRIDDEN (SUPERVISOR UNLOCK)';
        this.navKioskBadge.style.borderColor = 'var(--color-amber)';
        this.navKioskBadge.style.color = 'var(--color-amber)';
        this.showToast('Supervisor Key Accepted: Kiosk Lockdown Released.', 'success');
      }
    } else {
      this.supervisorKeyError.style.display = 'block';
    }
  }

  async _returnToMainMenu() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.competitor = {
      usn: '',
      name: '',
      isSessionActive: false,
      selectedTier: 'easy',
      activeProblemId: null,
      problemCodes: {},
      evaluations: {},
      uptimeSeconds: 0,
      violations: [],
      isExamMode: false
    };
    if (this.compUsnInput) this.compUsnInput.value = '';
    if (this.compNameInput) this.compNameInput.value = '';
    if (this.compExamOtpInput) this.compExamOtpInput.value = '';
    this.isKioskUnlocked = false;
    this.isReviewMode = false;

    // Reset sub-screens inside competitor view
    if (this.competitorModeSelectScreen) this.competitorModeSelectScreen.style.display = 'flex';
    if (this.compRegOverlay) this.compRegOverlay.style.display = 'none';
    if (this.competitorWorkspace) this.competitorWorkspace.style.display = 'none';

    // Switch view to welcome screen (Main Menu with Host Mode / Competitor Mode)
    await this.switchView('welcome');
    this.showToast('Station Unlocked: Returned to Main Menu.', 'success');
  }

  _promptSupervisorUnlock(action = 'kiosk') {
    this.supervisorAction = action;
    this.supervisorKeyInput.value = '';
    this.supervisorKeyError.style.display = 'none';
    if (action === 'review') {
      if (this.supervisorModalTitle) this.supervisorModalTitle.textContent = 'Supervisor Master Key (Review Mode)';
      if (this.supervisorModalDesc) this.supervisorModalDesc.textContent = 'Enter the Invigilator Supervisor Key to inspect the code and test evaluations submitted by the candidate.';
      if (this.btnConfirmSupervisorKey) this.btnConfirmSupervisorKey.textContent = 'Unlock Review Workspace';
    } else if (action === 'main_menu' || action === 'close') {
      if (this.supervisorModalTitle) this.supervisorModalTitle.textContent = 'Supervisor Key Required (Return to Main Menu)';
      if (this.supervisorModalDesc) this.supervisorModalDesc.textContent = 'Enter the Invigilator Supervisor Key to unlock this station and return to the main menu (Host Mode / Competitor Mode).';
      if (this.btnConfirmSupervisorKey) this.btnConfirmSupervisorKey.textContent = 'Unlock & Return to Main Menu';
    } else {
      if (this.supervisorModalTitle) this.supervisorModalTitle.textContent = 'Supervisor Emergency Key Override';
      if (this.supervisorModalDesc) this.supervisorModalDesc.textContent = 'Input the invigilator supervisor key to unlock the station and release kiosk mode.';
      if (this.btnConfirmSupervisorKey) this.btnConfirmSupervisorKey.textContent = 'Unlock Station';
    }
    this.modalSupervisor.classList.add('active');
    this.supervisorKeyInput.focus();
  }

  async _reLockKiosk() {
    if (window.api && window.api.setSecurityMode) {
      await window.api.setSecurityMode({ mode: 'kiosk' });
    }
    this.isKioskUnlocked = false;
    this.btnSupervisorKey.textContent = '🔑 Supervisor UNLOCK';
    this.btnSupervisorKey.className = 'btn btn-secondary btn-sm';
    this.btnSupervisorKey.title = 'Supervisor Key Override';
    this.navKioskBadge.textContent = 'KIOSK CONFINEMENT ACTIVE';
    this.navKioskBadge.style.borderColor = '';
    this.navKioskBadge.style.color = '';
    this.showToast('Kiosk Mode Re-Activated! Station is locked.', 'success');
  }

  _startSupervisorReviewMode() {
    this.isReviewMode = true;

    // Transition view containers
    this.viewThankyou.classList.remove('active');
    this.viewThankyou.style.display = 'none';

    this.viewCompetitor.classList.add('active');
    this.viewCompetitor.style.display = '';

    this.compRegOverlay.style.display = 'none';
    this.competitorWorkspace.style.display = 'flex';

    // Show Question Bank view initially
    this.competitorWorkspaceView.style.display = 'none';
    this.competitorBankView.style.display = 'flex';

    // Setup Review Mode Navbar
    this.navCandidatePill.style.display = 'flex';
    this.navCandidateUsn.textContent = `${this.competitor.usn} (${this.competitor.name})`;

    this.navTimerBox.style.display = 'flex';
    this.navTimerDigits.textContent = 'CONCLUDED';

    this.navKioskBadge.style.display = 'flex';
    this.navKioskBadge.textContent = 'SUPERVISOR CODE REVIEW';
    this.navKioskBadge.style.borderColor = 'var(--color-amber)';
    this.navKioskBadge.style.color = 'var(--color-amber)';

    if (this.btnReviewBackToTy) this.btnReviewBackToTy.style.display = 'inline-flex';
    this.btnEndSession.style.display = 'none';
    this.btnSupervisorKey.style.display = 'none';

    // Refresh Question Bank
    this._renderTierBadges();
    this._renderQuestionMatrix();

    this.showToast('Supervisor Review Mode: Inspect candidate answers and code.', 'success');
  }

  async _exitSupervisorReviewMode() {
    this.isReviewMode = false;

    // Transition back to Thank You view
    this.viewCompetitor.classList.remove('active');
    this.viewCompetitor.style.display = '';

    this.viewThankyou.classList.add('active');
    this.viewThankyou.style.display = '';

    if (this.btnReviewBackToTy) this.btnReviewBackToTy.style.display = 'none';
    this.navCandidatePill.style.display = 'none';
    this.navTimerBox.style.display = 'none';
    this.navKioskBadge.style.display = 'none';

    // Re-lock in thankyou kiosk mode
    if (window.api && window.api.setSecurityMode) {
      await window.api.setSecurityMode({ mode: 'thankyou' });
    }

    this.showToast('Returned to Final Summary.', 'info');
  }

  // --------------------------------------------------------------------------
  // HOST CONTROLLER ACTIONS & OFFLINE PDF AUTO-IMPORTER
  // --------------------------------------------------------------------------
  _setHostMode(mode) {
    this.hostContestType = mode === 'exam' ? 'exam' : 'contest';

    if (this.btnModeContest && this.btnModeExam) {
      if (this.hostContestType === 'exam') {
        this.btnModeExam.classList.add('active');
        this.btnModeContest.classList.remove('active');
      } else {
        this.btnModeContest.classList.add('active');
        this.btnModeExam.classList.remove('active');
      }
    }

    if (this.hostModeIndicatorTag) {
      if (this.hostContestType === 'exam') {
        this.hostModeIndicatorTag.textContent = 'EXAM MODE // Lab Experiments & Batches';
        this.hostModeIndicatorTag.className = 'candidate-pill mode-indicator-exam';
      } else {
        this.hostModeIndicatorTag.textContent = 'CONTEST MODE // Multi-Tier Competitive';
        this.hostModeIndicatorTag.className = 'candidate-pill mode-indicator-contest';
      }
    }

    // Toggle Tab Visibility
    if (this.tabBtnBatches) {
      this.tabBtnBatches.style.display = this.hostContestType === 'exam' ? 'inline-block' : 'none';
    }
    if (this.tabBtnBuilder) {
      this.tabBtnBuilder.textContent = this.hostContestType === 'exam' ? '🧪 Lab Exam Questions' : 'Contest Builder';
    }
    if (this.tabBtnGrading) {
      this.tabBtnGrading.textContent = this.hostContestType === 'exam' ? '📊 Lab Marks & Evaluation' : 'Grading Reporter & Leaderboard';
    }

    // Update Builder Labels
    if (this.builderConfigHeading) {
      this.builderConfigHeading.textContent = this.hostContestType === 'exam' ? 'Lab Examination Configuration' : 'Contest Configuration';
    }
    if (this.builderBankHeading) {
      this.builderBankHeading.textContent = this.hostContestType === 'exam' ? 'Lab Experiments Question Bank' : 'Multi-Tier Question Bank';
    }
    if (this.lblContestTitle) {
      this.lblContestTitle.textContent = this.hostContestType === 'exam' ? 'Lab Exam Title / Course' : 'Contest Title';
    }
    if (this.lblContestToken) {
      this.lblContestToken.textContent = this.hostContestType === 'exam' ? 'Exam Token / Lab PIN' : 'Contest Token / PIN';
    }
    if (this.btnHostAddProblem) {
      this.btnHostAddProblem.textContent = this.hostContestType === 'exam' ? '+ Add New Lab Experiment' : '+ Add New Question';
    }
    if (this.pdfDropzoneTitleText) {
      this.pdfDropzoneTitleText.textContent = this.hostContestType === 'exam'
        ? 'Import Lab Experiments from PDF (Offline Auto-Fill)'
        : 'Import Questions from PDF (Offline Auto-Fill)';
    }
    if (this.hostPdfDropzoneSubtitle) {
      this.hostPdfDropzoneSubtitle.innerHTML = this.hostContestType === 'exam'
        ? `Drag &amp; drop a lab syllabus or question paper PDF here, or <span id="link-browse-pdf" class="pdf-browse-link">browse file</span>. Auto-detects Lab Experiments (Exp 1..N / Program 1..N), Aim, Marks, Starter Code &amp; Test Cases.`
        : `Drag &amp; drop a question paper PDF here, or <span id="link-browse-pdf" class="pdf-browse-link">browse file</span>. Auto-detects Tiers (Easy/Medium/Hard), Marks, Starter Code &amp; Test Cases.`;
      const link = document.getElementById('link-browse-pdf');
      if (link && this.hostPdfFileInput) {
        link.addEventListener('click', () => this.hostPdfFileInput.click());
      }
    }

    // Refresh Question Cards & Tables
    this._renderHostProblemCards();
    if (this.hostContestType === 'exam') {
      this._renderBatchSelectOptions();
      this._renderBatchAllocationsTable();
    }
    this._renderLeaderboardTable();
  }

  _generate4DigitOtp() {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  _getActiveBatch() {
    if (!this.hostBatches || this.hostBatches.length === 0) {
      this.hostBatches = [{ id: 'batch_1', name: 'Batch 1 (Morning)', students: [] }];
      this.activeBatchId = 'batch_1';
    }
    return this.hostBatches.find(b => b.id === this.activeBatchId) || this.hostBatches[0];
  }

  _renderBatchSelectOptions() {
    if (!this.hostBatchSelect) return;
    if (!this.hostBatches || this.hostBatches.length === 0) {
      this.hostBatches = [{ id: 'batch_1', name: 'Batch 1 (Morning)', students: [] }];
      this.activeBatchId = 'batch_1';
    }
    this.hostBatchSelect.innerHTML = this.hostBatches.map(b => `
      <option value="${b.id}" ${b.id === this.activeBatchId ? 'selected' : ''}>
        ${this._escape(b.name)} (${(b.students || []).length} Students)
      </option>
    `).join('');
  }

  _openCreateBatchModal() {
    if (!this.modalCreateBatch) return;
    const nextIdx = (this.hostBatches || []).length + 1;
    if (this.createBatchNameInput) {
      this.createBatchNameInput.value = `Batch ${nextIdx}`;
    }
    this.modalCreateBatch.classList.add('active');
    setTimeout(() => {
      if (this.createBatchNameInput) {
        this.createBatchNameInput.focus();
        this.createBatchNameInput.select();
      }
    }, 50);
  }

  _handleCreateBatchSubmit() {
    if (!this.createBatchNameInput) return;
    const name = this.createBatchNameInput.value.trim();
    if (!name) {
      return this.showToast('Please enter a batch name.', 'warning');
    }

    if (!this.hostBatches) this.hostBatches = [];
    const newBatch = {
      id: 'batch_' + Date.now(),
      name: name,
      students: []
    };
    this.hostBatches.push(newBatch);
    this.activeBatchId = newBatch.id;
    if (this.modalCreateBatch) this.modalCreateBatch.classList.remove('active');
    this._renderBatchSelectOptions();
    this._renderBatchAllocationsTable();
    this.showToast(`✓ Created new batch "${newBatch.name}"!`, 'success');
  }

  _openRenameBatchModal() {
    const batch = this._getActiveBatch();
    if (!batch || !this.modalRenameBatch) return;
    if (this.renameBatchNameInput) {
      this.renameBatchNameInput.value = batch.name;
    }
    this.modalRenameBatch.classList.add('active');
    setTimeout(() => {
      if (this.renameBatchNameInput) {
        this.renameBatchNameInput.focus();
        this.renameBatchNameInput.select();
      }
    }, 50);
  }

  _handleRenameBatchSubmit() {
    if (!this.renameBatchNameInput) return;
    const batch = this._getActiveBatch();
    if (!batch) return;
    const newName = this.renameBatchNameInput.value.trim();
    if (!newName) {
      return this.showToast('Batch name cannot be empty.', 'warning');
    }

    batch.name = newName;
    if (this.modalRenameBatch) this.modalRenameBatch.classList.remove('active');
    this._renderBatchSelectOptions();
    this._renderBatchAllocationsTable();
    this.showToast(`✓ Batch renamed to "${batch.name}"!`, 'success');
  }

  _openDeleteBatchModal() {
    if ((this.hostBatches || []).length <= 1) {
      return this.showToast('Cannot delete: At least one batch must remain active.', 'warning');
    }
    const batch = this._getActiveBatch();
    if (!batch || !this.modalConfirmDeleteBatch) return;
    if (this.deleteBatchDesc) {
      const studentCount = (batch.students || []).length;
      this.deleteBatchDesc.innerHTML = `Are you sure you want to delete <strong>"${this._escape(batch.name)}"</strong> (${studentCount} student(s))? All student records in this batch will be removed.`;
    }
    this.modalConfirmDeleteBatch.classList.add('active');
  }

  _handleDeleteBatchSubmit() {
    const batch = this._getActiveBatch();
    if (!batch) return;
    this.hostBatches = (this.hostBatches || []).filter(b => b.id !== batch.id);
    if (this.hostBatches.length > 0) {
      this.activeBatchId = this.hostBatches[0].id;
    }
    if (this.modalConfirmDeleteBatch) this.modalConfirmDeleteBatch.classList.remove('active');
    this._renderBatchSelectOptions();
    this._renderBatchAllocationsTable();
    this.showToast(`Deleted batch "${batch.name}".`, 'info');
  }

  _openResetAllocationsModal() {
    const batch = this._getActiveBatch();
    if (!batch || !this.modalConfirmResetAllocations) return;
    const allocatedCount = (batch.students || []).filter(s => s.assignedProblemId).length;
    if (this.resetAllocationsDesc) {
      this.resetAllocationsDesc.innerHTML = `Are you sure you want to reset all experiment allocations for <strong>"${this._escape(batch.name)}"</strong>?<br><br>Currently <strong>${allocatedCount} of ${(batch.students || []).length} students</strong> have assigned experiments. Resetting will clear all assigned experiments, chit picks, and change of experiment records back to unassigned state.`;
    }
    this.modalConfirmResetAllocations.classList.add('active');
  }

  _handleResetAllocationsSubmit() {
    const batch = this._getActiveBatch();
    if (!batch) return;

    let resetCount = 0;
    (batch.students || []).forEach(s => {
      if (s.assignedProblemId || s.isChangeOfExperiment) resetCount++;
      s.assignedProblemId = null;
      s.assignedProblemTitle = '';
      s.chitPickType = 'none';
      s.allocationMethod = 'unassigned';
      s.isChangeOfExperiment = false;
      s.penalty = 0;
      s.originalProblemId = null;
      s.originalProblemTitle = '';
      s.changeOfExpRemarks = '';
      s.otp = null;
    });

    if (this.modalConfirmResetAllocations) this.modalConfirmResetAllocations.classList.remove('active');
    this._renderBatchSelectOptions();
    this._renderBatchAllocationsTable();
    this.showToast(`✓ Reset ${resetCount} allocation(s) in "${batch.name}". All students are now ready for new chit draws!`, 'success');
  }

  _handleImportUsnsSubmit() {
    if (!this.importUsnsTextarea) return;
    const raw = this.importUsnsTextarea.value.trim();
    if (!raw) {
      return this.showToast('Please enter or paste at least one USN to import.', 'warning');
    }

    const batch = this._getActiveBatch();
    if (!batch) return;
    if (!batch.students) batch.students = [];

    const lines = raw.split(/\r?\n/);
    let addedCount = 0;
    let updatedCount = 0;

    lines.forEach(line => {
      let cleanLine = line.trim();
      if (!cleanLine) return;

      // Strip surrounding quotes
      cleanLine = cleanLine.replace(/^["']|["']$/g, '');

      // Check if line is a header row (e.g. USN, Name, Roll No, etc.)
      if (/^(usn|roll\s*no|reg\s*no|student\s*name|candidate|sl\.?\s*no)/i.test(cleanLine)) {
        return; // skip CSV table header
      }

      let usn = '';
      let name = '';

      if (cleanLine.includes(',') || cleanLine.includes('\t') || cleanLine.includes(';')) {
        const parts = cleanLine.split(/,|\t|;/).map(p => p.trim().replace(/^["']|["']$/g, ''));
        if (parts.length >= 2) {
          // If first part is just a serial number (1, 2, 3), second part is USN
          if (/^\d+$/.test(parts[0]) && parts.length >= 3) {
            usn = parts[1].toUpperCase();
            name = parts.slice(2).join(' ').trim();
          } else {
            usn = parts[0].toUpperCase();
            name = parts.slice(1).join(' ').trim();
          }
        } else {
          usn = parts[0].toUpperCase();
        }
      } else {
        usn = cleanLine.toUpperCase();
      }

      if (!usn || usn.length < 2) return;

      const existing = batch.students.find(s => s.usn.toUpperCase() === usn);
      if (existing) {
        if (name) existing.name = name;
        updatedCount++;
      } else {
        batch.students.push({
          usn,
          name: name || '',
          assignedProblemId: null,
          assignedProblemTitle: '',
          chitPickType: 'none',
          allocationMethod: 'unassigned',
          isChangeOfExperiment: false,
          originalProblemId: null,
          originalProblemTitle: '',
          penalty: 0
        });
        addedCount++;
      }
    });

    if (this.modalImportUsns) this.modalImportUsns.classList.remove('active');
    this._renderBatchSelectOptions();
    this._renderBatchAllocationsTable();
    this.showToast(`✓ Batch updated: Added ${addedCount} new student(s), updated ${updatedCount} existing.`, 'success');
  }

  _openAddSingleStudentModal() {
    if (!this.modalSingleStudent) return;
    if (this.singleStudentUsn) this.singleStudentUsn.value = '';
    if (this.singleStudentName) this.singleStudentName.value = '';
    if (this.singleStudentExpSelect) {
      this.singleStudentExpSelect.innerHTML = `
        <option value="">-- Leave Unassigned for now --</option>
        ${(this.hostProblems || []).map((p, idx) => `
          <option value="${p.id}">${idx + 1}. ${this._escape(p.title)}</option>
        `).join('')}
      `;
    }
    this.modalSingleStudent.classList.add('active');
    if (this.singleStudentUsn) this.singleStudentUsn.focus();
  }

  _handleAddSingleStudentSubmit() {
    if (!this.singleStudentUsn) return;
    const usn = this.singleStudentUsn.value.trim().toUpperCase();
    if (!usn) {
      return this.showToast('Please enter a valid candidate USN.', 'warning');
    }
    const name = this.singleStudentName ? this.singleStudentName.value.trim() : '';
    const selectedExpId = this.singleStudentExpSelect ? this.singleStudentExpSelect.value : '';

    const batch = this._getActiveBatch();
    if (!batch) return;
    if (!batch.students) batch.students = [];

    const existing = batch.students.find(s => s.usn.toUpperCase() === usn);
    if (existing) {
      existing.name = name || existing.name;
      if (selectedExpId) {
        const prob = (this.hostProblems || []).find(p => p.id === selectedExpId);
        existing.assignedProblemId = selectedExpId;
        existing.assignedProblemTitle = prob ? prob.title : '';
        existing.allocationMethod = 'chit';
        existing.otp = existing.otp || this._generate4DigitOtp();
      }
      this.showToast(`Updated existing student ${usn} in ${batch.name}.`, 'info');
    } else {
      let expTitle = '';
      if (selectedExpId) {
        const prob = (this.hostProblems || []).find(p => p.id === selectedExpId);
        expTitle = prob ? prob.title : '';
      }
      batch.students.push({
        usn,
        name,
        assignedProblemId: selectedExpId || null,
        assignedProblemTitle: expTitle,
        allocationMethod: selectedExpId ? 'chit' : 'unassigned',
        isChangeOfExperiment: false,
        originalProblemId: null,
        originalProblemTitle: '',
        penalty: 0,
        otp: selectedExpId ? this._generate4DigitOtp() : null
      });
      this.showToast(`Added student ${usn} to ${batch.name}.`, 'success');
    }

    if (this.modalSingleStudent) this.modalSingleStudent.classList.remove('active');
    this._renderBatchSelectOptions();
    this._renderBatchAllocationsTable();
  }

  _deleteStudent(usn) {
    const batch = this._getActiveBatch();
    if (!batch || !batch.students) return;
    if (!confirm(`Remove student ${usn} from this batch?`)) return;

    batch.students = batch.students.filter(s => s.usn.toUpperCase() !== usn.toUpperCase());
    this._renderBatchSelectOptions();
    this._renderBatchAllocationsTable();
    this.showToast(`Removed student ${usn}.`, 'info');
  }

  _randomAssignAllExperiments() {
    this._syncCardsToHostProblems();
    if (!this.hostProblems || this.hostProblems.length === 0) {
      return this.showToast('No lab experiments found! Please add questions or import from PDF first.', 'warning');
    }

    const batch = this._getActiveBatch();
    if (!batch || !batch.students || batch.students.length === 0) {
      return this.showToast('No students in this batch to assign experiments to. Import USNs first.', 'warning');
    }

    const unassigned = batch.students.filter(s => !s.assignedProblemId || s.allocationMethod === 'unassigned');
    if (unassigned.length === 0) {
      const reassign = confirm('All students in this batch already have an experiment allocated. Re-roll random experiments for everyone?');
      if (!reassign) return;
    }

    // Shuffle problems to ensure fair, random distribution
    const shuffled = [...this.hostProblems].sort(() => Math.random() - 0.5);
    let assignedCount = 0;

    batch.students.forEach((s, idx) => {
      // Pick random experiment in cyclic order from shuffled array
      const chosen = shuffled[idx % shuffled.length];
      s.assignedProblemId = chosen.id;
      s.assignedProblemTitle = chosen.title;
      s.allocationMethod = 'random';
      s.isChangeOfExperiment = false;
      s.originalProblemId = null;
      s.originalProblemTitle = '';
      s.penalty = 0;
      s.otp = s.otp || this._generate4DigitOtp();
      assignedCount++;
    });

    this._renderBatchAllocationsTable();
    this.showToast(`🎲 Randomly distributed experiments across all ${assignedCount} students in "${batch.name}"!`, 'success');
  }

  _rollRandomForStudent(usn) {
    this._syncCardsToHostProblems();
    if (!this.hostProblems || this.hostProblems.length === 0) {
      return this.showToast('No lab experiments available to assign.', 'warning');
    }

    const batch = this._getActiveBatch();
    if (!batch || !batch.students) return;
    const student = batch.students.find(s => s.usn.toUpperCase() === usn.toUpperCase());
    if (!student) return;

    // Pick random problem different from current if multiple exist
    const available = this.hostProblems.length > 1
      ? this.hostProblems.filter(p => p.id !== student.assignedProblemId)
      : this.hostProblems;

    const chosen = available[Math.floor(Math.random() * available.length)];
    student.assignedProblemId = chosen.id;
    student.assignedProblemTitle = chosen.title;
    student.allocationMethod = 'random';
    student.otp = student.otp || this._generate4DigitOtp();

    this._renderBatchAllocationsTable();
    this.showToast(`🎲 Randomly rolled "${chosen.title}" for ${usn}!`, 'success');
  }

  _manualChitPick(usn, problemId) {
    const batch = this._getActiveBatch();
    if (!batch || !batch.students) return;
    const student = batch.students.find(s => s.usn.toUpperCase() === usn.toUpperCase());
    if (!student) return;

    const chosen = (this.hostProblems || []).find(p => p.id === problemId);
    if (!chosen) return;

    student.assignedProblemId = chosen.id;
    student.assignedProblemTitle = chosen.title;
    student.allocationMethod = 'chit';
    student.otp = student.otp || this._generate4DigitOtp();

    this._renderBatchAllocationsTable();
    this.showToast(`✏️ Mapped chit "${chosen.title}" for ${usn}!`, 'success');
  }

  _openChangeOfExpModal(usn) {
    const batch = this._getActiveBatch();
    if (!batch || !batch.students) return;
    const student = batch.students.find(s => s.usn.toUpperCase() === usn.toUpperCase());
    if (!student) return;

    this.currentCoeStudentUsn = usn;
    if (this.coeStudentLabel) {
      this.coeStudentLabel.textContent = `${student.usn} ${student.name ? '(' + student.name + ')' : ''}`;
    }
    if (this.coeCurrentExpTitle) {
      this.coeCurrentExpTitle.textContent = student.assignedProblemTitle || 'None';
    }

    if (this.coeNewExpSelect) {
      const options = (this.hostProblems || []).map((p, idx) => `
        <option value="${p.id}" ${p.id === student.assignedProblemId ? 'disabled' : ''}>
          ${idx + 1}. ${this._escape(p.title)} ${p.id === student.assignedProblemId ? '(Current)' : ''}
        </option>
      `).join('');
      this.coeNewExpSelect.innerHTML = options || '<option value="">No other experiments available</option>';
    }

    if (this.coePenaltyMarks) this.coePenaltyMarks.value = 5;
    if (this.modalChangeOfExp) this.modalChangeOfExp.classList.add('active');
  }

  _rollRandomInCoeModal() {
    if (!this.coeNewExpSelect) return;
    const batch = this._getActiveBatch();
    const student = batch ? (batch.students || []).find(s => s.usn.toUpperCase() === (this.currentCoeStudentUsn || '').toUpperCase()) : null;
    const curId = student ? student.assignedProblemId : null;

    const available = (this.hostProblems || []).filter(p => p.id !== curId);
    if (available.length === 0) {
      return this.showToast('No other lab experiments available to draw.', 'warning');
    }
    const chosen = available[Math.floor(Math.random() * available.length)];
    this.coeNewExpSelect.value = chosen.id;
    this.showToast(`🎲 Random chit drawn: "${chosen.title}"`, 'info');
  }

  _handleConfirmChangeOfExp() {
    if (!this.currentCoeStudentUsn) return;
    const batch = this._getActiveBatch();
    if (!batch || !batch.students) return;
    const student = batch.students.find(s => s.usn.toUpperCase() === this.currentCoeStudentUsn.toUpperCase());
    if (!student) return;

    const newExpId = this.coeNewExpSelect ? this.coeNewExpSelect.value : '';
    if (!newExpId) {
      return this.showToast('Please select a replacement experiment.', 'warning');
    }
    const chosen = (this.hostProblems || []).find(p => p.id === newExpId);
    if (!chosen) return;

    const penalty = this.coePenaltyMarks ? (parseInt(this.coePenaltyMarks.value) || 0) : 5;
    const remarks = this.coeRemarks ? this.coeRemarks.value.trim() : '';

    student.isChangeOfExperiment = true;
    student.originalProblemId = student.assignedProblemId || student.originalProblemId;
    student.originalProblemTitle = student.assignedProblemTitle || student.originalProblemTitle;
    student.assignedProblemId = chosen.id;
    student.assignedProblemTitle = chosen.title;
    student.allocationMethod = 'change';
    student.penalty = penalty;
    student.changeRemarks = remarks;
    student.otp = student.otp || this._generate4DigitOtp();

    if (this.modalChangeOfExp) this.modalChangeOfExp.classList.remove('active');
    this._renderBatchAllocationsTable();
    this.showToast(`⚠ Change of Experiment recorded for ${student.usn}: Changed to "${chosen.title}" (Penalty: -${penalty} Marks).`, 'success');
  }

  _exportAllocationsCsv() {
    const batch = this._getActiveBatch();
    if (!batch || !batch.students || batch.students.length === 0) {
      return this.showToast('No students in this batch to export.', 'warning');
    }

    const headers = ['Sl', 'USN', 'Candidate Name', 'Batch', 'Assigned Experiment ID', 'Assigned Experiment Title', 'Exam Access OTP', 'Chit Pick Type', 'Change of Experiment', 'Original Experiment', 'Penalty Marks'];
    const rows = batch.students.map((s, idx) => {
      return [
        idx + 1,
        `"${s.usn}"`,
        `"${s.name || ''}"`,
        `"${batch.name}"`,
        `"${s.assignedProblemId || ''}"`,
        `"${s.assignedProblemTitle || ''}"`,
        `"${s.otp || ''}"`,
        `"${s.allocationMethod || 'unassigned'}"`,
        s.isChangeOfExperiment ? 'YES' : 'NO',
        `"${s.originalProblemTitle || ''}"`,
        s.penalty || 0
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Batch_${(batch.name || 'Batch').replace(/[^a-zA-Z0-9_-]/g, '_')}_Allocations.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast(`Allocation sheet exported for "${batch.name}"!`, 'success');
  }

  _renderBatchAllocationsTable() {
    if (!this.batchStudentsTbody) return;
    const batch = this._getActiveBatch();
    if (!batch) {
      this.batchStudentsTbody.innerHTML = `
        <tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 32px;">No active batch found.</td></tr>
      `;
      return;
    }

    const students = batch.students || [];
    const allocatedCount = students.filter(s => s.assignedProblemId).length;
    if (this.batchStatsPill) {
      this.batchStatsPill.textContent = `${students.length} Students • ${allocatedCount} Allocated`;
    }

    if (students.length === 0) {
      this.batchStudentsTbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 32px;">
            No students in "${this._escape(batch.name)}" yet. Click <strong>"📥 Import / Paste USNs"</strong> or <strong>"+ Add Student"</strong> to populate this batch.
          </td>
        </tr>
      `;
      return;
    }

    this.batchStudentsTbody.innerHTML = students.map((s, idx) => {
      const assignedProb = s.assignedProblemId ? (this.hostProblems || []).find(p => p.id === s.assignedProblemId) : null;
      const assignedTitle = assignedProb ? assignedProb.title : (s.assignedProblemTitle || 'Not Allocated');

      let assignedBadge = '';
      if (s.assignedProblemId) {
        assignedBadge = `<span class="candidate-pill" style="color: var(--color-cyan); border-color: rgba(14, 165, 233, 0.4); font-weight: 700;">★ ${this._escape(assignedTitle)}</span>`;
      } else {
        assignedBadge = `<span class="candidate-pill" style="color: var(--color-amber); border-color: rgba(245, 158, 11, 0.4);">⚠ Not Allocated</span>`;
      }

      // Generate or retrieve 4-digit Exam Access OTP for assigned students
      if (s.assignedProblemId && !s.otp) {
        s.otp = this._generate4DigitOtp();
      }

      let otpBadge = '<span style="color: var(--text-muted); font-size: 0.75rem;">--</span>';
      if (s.assignedProblemId && s.otp) {
        otpBadge = `<span style="display: inline-block; padding: 2px 8px; font-family: var(--font-mono); font-weight: 800; font-size: 0.88rem; letter-spacing: 2px; color: var(--color-cyan); background: rgba(14, 165, 233, 0.12); border: 1px solid rgba(14, 165, 233, 0.4); border-radius: 4px; box-shadow: 0 0 6px rgba(14, 165, 233, 0.15);">${this._escape(s.otp)}</span>`;
      }

      let methodPill = '<span style="color: var(--text-muted); font-size: 0.75rem;">--</span>';
      if (s.allocationMethod === 'random') {
        methodPill = '<span class="badge-chit-random">🎲 Random Draw</span>';
      } else if (s.allocationMethod === 'chit') {
        methodPill = '<span class="badge-chit-manual">✏️ Chit Pick</span>';
      } else if (s.allocationMethod === 'change') {
        methodPill = '<span class="badge-change-of-exp">🔄 Change of Exp</span>';
      }

      let coeStatus = '<span style="color: var(--text-muted); font-size: 0.75rem;">None (Regular)</span>';
      if (s.isChangeOfExperiment) {
        coeStatus = `
          <div style="font-size: 0.76rem; color: var(--color-amber); font-weight: 700;">
            ⚠ Change (${this._escape(s.originalProblemTitle || 'Original')} ➔ ${this._escape(assignedTitle)})
            <div style="font-size: 0.70rem; color: var(--color-rose); font-weight: 600; margin-top: 2px;">
              Penalty: -${s.penalty || 5} Marks
            </div>
          </div>
        `;
      }

      return `
        <tr>
          <td style="text-align: center; font-size: 0.8rem; color: var(--text-muted);">${idx + 1}</td>
          <td style="font-family: var(--font-mono); font-weight: 800; color: var(--text-main);">${this._escape(s.usn)}</td>
          <td>${this._escape(s.name || '--')}</td>
          <td>${assignedBadge}</td>
          <td style="text-align: center;">${otpBadge}</td>
          <td style="text-align: center;">${methodPill}</td>
          <td>${coeStatus}</td>
          <td style="text-align: center;">
            <div style="display: flex; gap: 6px; justify-content: center; flex-wrap: wrap;">
              <button type="button" class="btn btn-secondary btn-sm btn-row-roll" data-usn="${this._escape(s.usn)}" title="Roll a random experiment for this student" style="padding: 3px 8px; font-size: 0.72rem;">
                🎲 Roll
              </button>
              <select class="form-control select-row-chit" data-usn="${this._escape(s.usn)}" style="width: auto; padding: 2px 6px; font-size: 0.72rem; height: 26px;">
                <option value="">Chit #...</option>
                ${(this.hostProblems || []).map((p, pIdx) => `
                  <option value="${p.id}" ${p.id === s.assignedProblemId ? 'selected' : ''}>
                    ${pIdx + 1}. ${this._escape(p.title.length > 20 ? p.title.substring(0, 18) + '...' : p.title)}
                  </option>
                `).join('')}
              </select>
              <button type="button" class="btn btn-outline btn-sm btn-row-coe" data-usn="${this._escape(s.usn)}" title="Grant Change of Experiment with Penalty" style="padding: 3px 8px; font-size: 0.72rem; color: var(--color-amber); border-color: rgba(245, 158, 11, 0.4);">
                🔄 Change
              </button>
              <button type="button" class="btn btn-danger btn-sm btn-row-del" data-usn="${this._escape(s.usn)}" title="Remove student" style="padding: 3px 6px; font-size: 0.72rem;">
                ✕
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    this.batchStudentsTbody.querySelectorAll('.btn-row-roll').forEach(btn => {
      btn.addEventListener('click', (e) => this._rollRandomForStudent(e.currentTarget.dataset.usn));
    });

    this.batchStudentsTbody.querySelectorAll('.select-row-chit').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const probId = e.target.value;
        if (probId) {
          this._manualChitPick(e.target.dataset.usn, probId);
        }
      });
    });

    this.batchStudentsTbody.querySelectorAll('.btn-row-coe').forEach(btn => {
      btn.addEventListener('click', (e) => this._openChangeOfExpModal(e.currentTarget.dataset.usn));
    });

    this.batchStudentsTbody.querySelectorAll('.btn-row-del').forEach(btn => {
      btn.addEventListener('click', (e) => this._deleteStudent(e.currentTarget.dataset.usn));
    });
  }

  _populateHostContest(contest) {
    if (!contest) return;
    const determinedType = contest.type || ((contest.problems || []).some(p => p.tier === 'lab') ? 'exam' : 'contest');
    this._setHostMode(determinedType);
    this.hostTitleInput.value = contest.title || (determinedType === 'exam' ? 'College Lab Examination' : 'Mass-Code Championship');
    this.hostTokenInput.value = contest.token || contest.id || 'MASS2026';
    this.hostDurationInput.value = contest.durationMinutes || 60;
    this.hostProblems = contest.problems || [];
    this.hostBatches = (contest.batches && contest.batches.length > 0) ? contest.batches : [
      { id: 'batch_1', name: 'Batch 1 (Morning)', students: [] }
    ];
    this.activeBatchId = contest.activeBatchId || (this.hostBatches[0] && this.hostBatches[0].id) || 'batch_1';
    this._renderHostProblemCards();
    this._renderBatchSelectOptions();
    this._renderBatchAllocationsTable();
  }

  _showPdfImportStatus(msg, isSpinner = true, isError = false) {
    if (!this.hostPdfStatus) return;
    this.hostPdfStatus.style.display = 'flex';
    this.hostPdfStatus.className = isError ? 'pdf-status-banner pdf-status-error' : 'pdf-status-banner';
    if (this.hostPdfStatusText) this.hostPdfStatusText.textContent = msg;
    const spinner = document.getElementById('host-pdf-status-spinner');
    if (spinner) spinner.textContent = isSpinner ? '⏳' : (isError ? '✖' : '✔');
  }

  _hidePdfImportStatus() {
    if (this.hostPdfStatus) this.hostPdfStatus.style.display = 'none';
  }

  async _handlePdfImportDialog() {
    this._showPdfImportStatus('Opening offline PDF file chooser...', true);
    try {
      const res = await window.api.importPdfDialog({ mode: this.hostContestType });
      if (!res.success) {
        if (res.canceled) {
          this._hidePdfImportStatus();
          return;
        }
        this._showPdfImportStatus(`Import failed: ${res.error}`, false, true);
        this.showToast(`PDF Import Error: ${res.error}`, 'error');
        return;
      }
      this._applyImportedPdfResult(res);
    } catch (err) {
      this._showPdfImportStatus(`Error: ${err.message}`, false, true);
      this.showToast(`PDF Import Error: ${err.message}`, 'error');
    }
  }

  async _handlePdfFileObject(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      this.showToast('Please upload a valid PDF document (.pdf)', 'warning');
      return;
    }
    this._showPdfImportStatus(`Reading & parsing "${file.name}" offline...`, true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      let binary = '';
      const bytes = new Uint8Array(arrayBuffer);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const bufferBase64 = btoa(binary);

      const res = await window.api.parsePdfBuffer({ bufferBase64, filename: file.name, mode: this.hostContestType });
      if (!res.success) {
        this._showPdfImportStatus(`Parsing error: ${res.error}`, false, true);
        this.showToast(`PDF Parse Error: ${res.error}`, 'error');
        return;
      }
      this._applyImportedPdfResult(res);
    } catch (err) {
      this._showPdfImportStatus(`Error: ${err.message}`, false, true);
      this.showToast(`Failed to parse PDF: ${err.message}`, 'error');
    }
  }

  _applyImportedPdfResult(res) {
    const problems = res.problems || [];
    if (problems.length === 0) {
      this._showPdfImportStatus('No recognizable questions found in PDF.', false, true);
      this.showToast('No questions could be extracted from this PDF. Please check if it contains text or use "+ Add New Question".', 'warning');
      return;
    }

    if (res.title && (!this.hostTitleInput.value || this.hostTitleInput.value === 'Mass-Code National Championship')) {
      this.hostTitleInput.value = res.title;
    }

    // Save existing edits before replacing with newly parsed problems
    this.hostProblems = problems;
    this._renderHostProblemCards();

    const modeLabel = this.hostContestType === 'exam' ? 'Lab Experiment(s)' : 'Contest Question(s)';
    this._showPdfImportStatus(`✓ Successfully extracted ${problems.length} ${modeLabel} from "${res.filename}"! Review and edit fields below.`, false, false);
    this.showToast(`✓ Auto-imported ${problems.length} ${modeLabel} from "${res.filename}". Ready for review!`, 'success');

    setTimeout(() => this._hidePdfImportStatus(), 7000);
  }

  _renderHostProblemCards() {
    this.hostProblemsList.innerHTML = '';
    this.hostProblems.forEach((p, idx) => {
      const card = document.createElement('div');
      card.className = 'builder-problem-card';
      card.dataset.idx = idx;

      const starterCode = p.starterCode || '#include <stdio.h>\n\nint main() {\n    return 0;\n}\n';
      const testCases = p.testCases && p.testCases.length > 0 ? p.testCases : [
        { id: `tc_${idx + 1}_1`, isSample: true, input: '', expectedOutput: '' }
      ];

      const tier = (p.tier || 'easy').toLowerCase();
      const tierBadge = this.hostContestType === 'exam'
        ? `<span class="badge-tier-lab">LAB EXPERIMENT</span>`
        : (tier === 'hard'
          ? `<span class="badge-tier-hard">HARD</span>`
          : (tier === 'medium'
            ? `<span class="badge-tier-medium">MEDIUM</span>`
            : `<span class="badge-tier-easy">EASY</span>`));

      const tcRowsHtml = testCases.map((tc, tcIdx) => `
        <div class="p-tc-row" data-tcidx="${tcIdx}" data-sample="${tc.isSample ? 'true' : 'false'}" style="display: flex; gap: 8px; align-items: flex-start; background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 8px; margin-bottom: 6px;">
          <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; width: 85px; margin-top: 6px;">
            <span style="font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono);">#${tcIdx + 1}</span>
            <button type="button" class="btn-toggle-tc-type ${tc.isSample ? 'badge-sample-case' : 'badge-hidden-case'}" data-pidx="${idx}" data-tcidx="${tcIdx}" title="Click to toggle between Sample Example and Hidden test case">
              ${tc.isSample ? '★ Sample' : '🔒 Hidden'}
            </button>
          </div>
          <div style="flex: 1;">
            <label style="font-size: 0.70rem; color: var(--text-muted); display: block; margin-bottom: 2px;">Input (Exact)</label>
            <textarea class="form-control tc-input" rows="2" style="font-family: var(--font-mono); font-size: 0.78rem; resize: vertical;">${this._escape(tc.input || '')}</textarea>
          </div>
          <div style="flex: 1;">
            <label style="font-size: 0.70rem; color: var(--text-muted); display: block; margin-bottom: 2px;">Expected Output (Exact)</label>
            <textarea class="form-control tc-output" rows="2" style="font-family: var(--font-mono); font-size: 0.78rem; resize: vertical;">${this._escape(tc.expectedOutput || '')}</textarea>
          </div>
          <button type="button" class="btn btn-danger btn-sm btn-del-tc" data-pidx="${idx}" data-tcidx="${tcIdx}" style="margin-top: 18px; padding: 4px 8px; font-size: 0.72rem;" title="Delete Test Case">✕</button>
        </div>
      `).join('');

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-subtle); padding-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 10px; flex: 1; flex-wrap: wrap;">
            <strong style="color: var(--color-cyan); font-size: 1.05rem;">#${idx + 1}</strong>
            ${tierBadge}
            <input type="text" class="form-control p-title" style="flex: 1; max-width: 440px; font-weight: 700;" value="${this._escape(p.title)}" placeholder="${this.hostContestType === 'exam' ? 'Experiment Title (e.g. Exp 1: Stack Operations)' : 'Question Title'}">
            <span style="font-weight: 700; color: var(--text-muted); font-size: 0.88rem;">— ${p.maxPoints || (this.hostContestType === 'exam' ? 50 : (tier === 'hard' ? 15 : (tier === 'medium' ? 10 : 5)))} Marks</span>
          </div>
          <button class="btn btn-danger btn-sm btn-del-prob" data-idx="${idx}">${this.hostContestType === 'exam' ? 'Remove Experiment' : 'Remove Question'}</button>
        </div>
        <div class="form-grid-3" style="margin-top: 10px;">
          <div class="form-group">
            <label>${this.hostContestType === 'exam' ? 'Category / Type' : 'Tier / Difficulty'}</label>
            <select class="form-control p-tier">
              ${this.hostContestType === 'exam' ? `
                <option value="lab" selected>Lab Experiment</option>
              ` : `
                <option value="easy" ${p.tier === 'easy' ? 'selected' : ''}>Easy (Round 1)</option>
                <option value="medium" ${p.tier === 'medium' ? 'selected' : ''}>Medium (Round 2)</option>
                <option value="hard" ${p.tier === 'hard' ? 'selected' : ''}>Hard (Round 3)</option>
              `}
            </select>
          </div>
          <div class="form-group">
            <label>${this.hostContestType === 'exam' ? 'Lab Marks' : 'Max Points'}</label>
            <input type="number" class="form-control p-points" value="${p.maxPoints || (this.hostContestType === 'exam' ? 50 : (p.tier === 'easy' ? 5 : (p.tier === 'medium' ? 10 : 15)))}">
          </div>
          <div class="form-group">
            <label>Time Limit (ms)</label>
            <input type="number" class="form-control p-timeout" value="${p.timeLimitMs || 2000}">
          </div>
        </div>
        <div class="form-group" style="margin-top: 10px;">
          <label>Problem Statement &amp; Requirements</label>
          <textarea class="form-control p-desc" rows="3" placeholder="Enter problem description, constraints, and instructions...">${this._escape(p.description)}</textarea>
        </div>
        <div class="form-group" style="margin-top: 10px;">
          <label style="color: var(--color-cyan); font-weight: 700;">Starter Code (C Language)</label>
          <textarea class="form-control p-starter-code" rows="4" style="font-family: var(--font-mono); font-size: 0.82rem; background: rgba(0, 0, 0, 0.35);">${this._escape(starterCode)}</textarea>
        </div>
        <div class="form-group" style="margin-top: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <label style="color: var(--color-emerald); font-weight: 700;">Test Cases (${testCases.length})</label>
            <button type="button" class="btn btn-secondary btn-sm btn-add-tc" data-pidx="${idx}" style="font-size: 0.72rem; padding: 4px 10px; border: 1px solid var(--color-emerald); color: var(--color-emerald);">+ Add Test Case</button>
          </div>
          <div class="p-tc-container" data-pidx="${idx}">
            ${tcRowsHtml}
          </div>
        </div>
      `;

      // Event: Change Tier dropdown
      const tierSelect = card.querySelector('.p-tier');
      if (tierSelect) {
        tierSelect.addEventListener('change', (e) => {
          this._syncCardsToHostProblems();
          const selectedTier = e.target.value;
          if (this.hostProblems[idx]) {
            this.hostProblems[idx].tier = selectedTier;
            if (this.hostContestType !== 'exam') {
              this.hostProblems[idx].maxPoints = selectedTier === 'hard' ? 15 : (selectedTier === 'medium' ? 10 : 5);
            }
          }
          this._renderHostProblemCards();
        });
      }

      // Event: Toggle Sample vs Hidden Test Case
      card.querySelectorAll('.btn-toggle-tc-type').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const pIdx = parseInt(e.currentTarget.dataset.pidx);
          const tcIdx = parseInt(e.currentTarget.dataset.tcidx);
          this._syncCardsToHostProblems();
          if (this.hostProblems[pIdx] && this.hostProblems[pIdx].testCases && this.hostProblems[pIdx].testCases[tcIdx]) {
            this.hostProblems[pIdx].testCases[tcIdx].isSample = !this.hostProblems[pIdx].testCases[tcIdx].isSample;
          }
          this._renderHostProblemCards();
        });
      });

      // Event: Remove question
      card.querySelector('.btn-del-prob').addEventListener('click', (e) => {
        this._syncCardsToHostProblems();
        this.hostProblems.splice(parseInt(e.target.dataset.idx), 1);
        this._renderHostProblemCards();
      });

      // Event: Add test case
      card.querySelector('.btn-add-tc').addEventListener('click', (e) => {
        const pIdx = parseInt(e.target.dataset.pidx);
        this._syncCardsToHostProblems();
        if (!this.hostProblems[pIdx].testCases) this.hostProblems[pIdx].testCases = [];
        const nextTc = this.hostProblems[pIdx].testCases.length + 1;
        this.hostProblems[pIdx].testCases.push({
          id: `tc_${pIdx + 1}_${nextTc}`,
          isSample: false,
          input: '',
          expectedOutput: ''
        });
        this._renderHostProblemCards();
      });

      // Event: Delete test case
      card.querySelectorAll('.btn-del-tc').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const pIdx = parseInt(e.target.dataset.pidx);
          const tcIdx = parseInt(e.target.dataset.tcidx);
          this._syncCardsToHostProblems();
          if (this.hostProblems[pIdx] && this.hostProblems[pIdx].testCases) {
            this.hostProblems[pIdx].testCases.splice(tcIdx, 1);
          }
          this._renderHostProblemCards();
        });
      });

      this.hostProblemsList.appendChild(card);
    });
  }

  _syncCardsToHostProblems() {
    const cards = this.hostProblemsList.querySelectorAll('.builder-problem-card');
    cards.forEach((card, i) => {
      if (!this.hostProblems[i]) return;
      this.hostProblems[i].title = card.querySelector('.p-title').value;
      this.hostProblems[i].tier = card.querySelector('.p-tier').value;
      this.hostProblems[i].maxPoints = parseInt(card.querySelector('.p-points').value) || 20;
      this.hostProblems[i].timeLimitMs = parseInt(card.querySelector('.p-timeout').value) || 2000;
      this.hostProblems[i].description = card.querySelector('.p-desc').value;

      const starterElem = card.querySelector('.p-starter-code');
      if (starterElem) {
        this.hostProblems[i].starterCode = starterElem.value;
      }

      const tcRows = card.querySelectorAll('.p-tc-row');
      const compiledTcs = [];
      tcRows.forEach((row, tcIdx) => {
        const inp = row.querySelector('.tc-input').value;
        const out = row.querySelector('.tc-output').value;
        const isSample = row.dataset.sample === 'true';
        compiledTcs.push({
          id: `tc_${i + 1}_${tcIdx + 1}`,
          isSample,
          input: inp,
          expectedOutput: out
        });
      });
      this.hostProblems[i].testCases = compiledTcs;
    });
  }

  async _handleHostEndSession() {
    if (this.modalHostEndSession) this.modalHostEndSession.classList.remove('active');
    this.showToast('Ending contest session & archiving submissions...', 'info');

    try {
      const res = await window.api.endHostSession();
      if (res && res.success) {
        this._resetHostContestToEmpty();
        this.showToast(`✓ Contest ended. ${res.archivedCount} submission(s) archived safely. Host workspace is now fresh & empty!`, 'success');
        await this.switchView('welcome');
      } else {
        this.showToast(`Failed to end session: ${res?.error || 'Unknown error'}`, 'error');
      }
    } catch (err) {
      this.showToast(`Error ending session: ${err.message}`, 'error');
    }
  }

  _resetHostContestToEmpty() {
    this.hostContestType = 'contest';
    this._setHostMode('contest');
    this.hostTitleInput.value = 'Mass-Code Championship';
    const randCode = 'MASS' + Math.floor(1000 + Math.random() * 9000);
    this.hostTokenInput.value = randCode;
    this.hostDurationInput.value = 60;
    this.hostProblems = [];
    this.hostBatches = [
      { id: 'batch_1', name: 'Batch 1 (Morning)', students: [] }
    ];
    this.activeBatchId = 'batch_1';
    this._renderHostProblemCards();
    this._renderBatchSelectOptions();
    this._renderBatchAllocationsTable();
    this.activeContest = null;

    if (this.hostLeaderboardTbody) {
      this.hostLeaderboardTbody.innerHTML = `
        <tr>
          <td colspan="12" style="text-align: center; color: var(--text-muted); padding: 32px;">
            No submissions yet for this contest. Broadcast is stopped.
          </td>
        </tr>
      `;
    }
    if (this.gradingCountLabel) {
      this.gradingCountLabel.textContent = '0 candidate submissions loaded';
    }
    if (this.serverStateVal) {
      this.serverStateVal.textContent = 'OFFLINE';
      this.serverStateVal.className = 'status-tag status-stopped';
    }
    if (this.btnHostToggleServer) {
      this.btnHostToggleServer.textContent = 'HOST(start Local server)';
      this.btnHostToggleServer.className = 'btn btn-success btn-sm';
    }
    if (this.btnHostDeployBottom) {
      this.btnHostDeployBottom.textContent = 'HOST(start Local server)';
      this.btnHostDeployBottom.className = 'btn btn-success';
    }
  }

  _addHostProblem() {
    this._syncCardsToHostProblems();
    const idx = this.hostProblems.length + 1;
    if (this.hostContestType === 'exam') {
      this.hostProblems.push({
        id: `p_exp_${idx}`,
        tier: 'lab',
        title: `Exp ${idx}: Lab Experiment`,
        category: 'Lab Experiment',
        maxPoints: 50,
        timeLimitMs: 2000,
        description: 'Describe the lab experiment aim, requirements, and input/output specifications.',
        starterCode: '#include <stdio.h>\n#include <stdlib.h>\n\nint main(void) {\n    // Implement lab experiment here\n    return 0;\n}\n',
        testCases: [{ id: `tc_${idx}_1`, isSample: true, input: '5\n', expectedOutput: '10\n' }]
      });
    } else {
      this.hostProblems.push({
        id: `p_custom_${idx}`,
        tier: 'easy',
        title: `Problem ${idx}: Algorithmic Challenge`,
        category: 'General',
        maxPoints: 5,
        timeLimitMs: 2000,
        description: 'Describe problem requirements, input/output specifications, and constraints.',
        starterCode: '#include <stdio.h>\n\nint main() {\n    return 0;\n}\n',
        testCases: [{ id: `tc_${idx}_1`, isSample: true, input: '5\n', expectedOutput: '10\n' }]
      });
    }
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
    this._syncCardsToHostProblems();

    // Ensure all assigned students have a 4-digit Exam Access OTP
    if (this.hostBatches) {
      this.hostBatches.forEach(b => {
        (b.students || []).forEach(s => {
          if (s.assignedProblemId && !s.otp) {
            s.otp = this._generate4DigitOtp();
          }
        });
      });
    }

    return {
      id: this.hostTokenInput.value.trim() || 'MASS-' + Date.now(),
      type: this.hostContestType || 'contest',
      title: this.hostTitleInput.value.trim() || (this.hostContestType === 'exam' ? 'College Lab Examination' : 'Mass-Code Contest'),
      token: this.hostTokenInput.value.trim() || 'MASS2026',
      durationMinutes: parseInt(this.hostDurationInput.value) || 60,
      language: 'c',
      problems: this.hostProblems,
      batches: this.hostBatches || [],
      activeBatchId: this.activeBatchId || 'batch_1'
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
    const primaryIp = status.primaryIp || (status.ips && status.ips[0]) || '127.0.0.1';
    const port = status.port || 8080;
    const pin = status.activeContestId || (this.activeContest && (this.activeContest.token || this.activeContest.id)) || 'MASS2026';
    const fullUrl = `http://${primaryIp}:${port}`;

    this.serverPortVal.textContent = port;
    this.serverContestVal.textContent = pin;
    this.serverStateVal.textContent = status.isRunning ? 'Online' : 'Stopped';
    this.serverStateVal.style.color = status.isRunning ? 'var(--color-emerald)' : 'var(--color-rose)';
    if (this.btnHostToggleServer) {
      this.btnHostToggleServer.textContent = status.isRunning ? 'Stop Local Server' : 'HOST(start Local server)';
      this.btnHostToggleServer.className = status.isRunning ? 'btn btn-danger btn-sm' : 'btn btn-success btn-sm';
    }
    if (this.btnHostDeployBottom) {
      this.btnHostDeployBottom.textContent = status.isRunning ? 'Stop Local Server' : 'HOST(start Local server)';
      this.btnHostDeployBottom.className = status.isRunning ? 'btn btn-danger' : 'btn btn-success';
    }
    const serverStatusPill = document.getElementById('server-status-pill-badge');
    if (serverStatusPill) {
      serverStatusPill.textContent = status.isRunning ? 'Server Active / Broadcasting' : 'Host Broadcast Ready';
      serverStatusPill.style.color = status.isRunning ? 'var(--color-emerald)' : 'var(--color-cyan)';
      serverStatusPill.style.borderColor = status.isRunning ? 'var(--color-emerald)' : 'var(--color-cyan)';
    }

    if (this.btnHostEndSession) {
      this.btnHostEndSession.style.display = (this.currentView === 'host' && this.hostStep === 3 && status.isRunning) ? 'inline-flex' : 'none';
    }

    if (this.routerHostIp) this.routerHostIp.textContent = primaryIp;
    if (this.routerHostPort) this.routerHostPort.textContent = `${port} (TCP)`;
    if (this.routerHostPin) this.routerHostPin.textContent = pin;
    if (this.routerFullUrl) this.routerFullUrl.textContent = fullUrl;

    this.serverIpBadges.innerHTML = (status.ips || []).map((ip, idx) => `
      <span class="candidate-pill" style="${idx === 0 ? 'border-color: var(--color-cyan); color: var(--color-cyan); font-weight: bold;' : ''}">
        ${idx === 0 ? '⭐ Primary Endpoint: ' : 'Endpoint: '}http://${ip}:${port}
      </span>
    `).join('');

    if (this.serverGuidePin) {
      this.serverGuidePin.textContent = pin;
    }
  }

  async _deployHostContest() {
    const config = this._compileHostContest();
    if (!config.problems || config.problems.length === 0) {
      this.showToast('Please add at least one question before hosting the contest.', 'warning');
      return;
    }

    this.activeContest = config;
    await window.api.saveContestConfig(config);
    const startRes = await window.api.startHostServer({ port: 8080, contestConfig: config });
    await this._refreshHostServerStatus();

    // Switch host stage to Server & LAN Distribution stage to show live endpoints
    this._switchHostStage('server');

    const primaryIp = (startRes && startRes.primaryIp) || (startRes && startRes.ips && startRes.ips[0]) || '127.0.0.1';
    const port = (startRes && startRes.port) || 8080;
    this.showToast(`Contest LIVE! IP: ${primaryIp} | Port: ${port} | PIN: ${config.token || 'MASS2026'}`, 'success');
  }

  async _toggleHostServer() {
    const status = await window.api.getHostServerStatus();
    if (status.isRunning) {
      await window.api.stopHostServer();
      this.showToast('Host Server stopped.', 'warning');
    } else {
      const config = this._compileHostContest();
      if (!config.problems || config.problems.length === 0) {
        this.showToast('Please add at least one question before hosting the contest.', 'warning');
        return;
      }
      this.activeContest = config;
      await window.api.saveContestConfig(config);
      const startRes = await window.api.startHostServer({ port: 8080, contestConfig: config });
      const primaryIp = (startRes && startRes.primaryIp) || (startRes && startRes.ips && startRes.ips[0]) || '127.0.0.1';
      const port = (startRes && startRes.port) || 8080;
      this.showToast(`Host Server started on http://${primaryIp}:${port} (PIN: ${config.token || 'MASS2026'})`, 'success');
    }
    await this._refreshHostServerStatus();
  }

  async _scanHostSubmissions() {
    const res = await window.api.scanGradingFolder();
    if (res.success) {
      this.hostSubmissions = res.records || [];
      this.gradingCountLabel.textContent = `${this.hostSubmissions.length} candidate submissions loaded`;
      this._renderLeaderboardTable();
    }
  }

  async _autoGradeAllHostSubmissions() {
    const problems = (this.activeContest && this.activeContest.problems) || this.hostProblems || [];
    if (!problems || problems.length === 0) {
      return this.showToast('No active contest problems found to evaluate against.', 'warning');
    }
    if (!this.hostSubmissions || this.hostSubmissions.length === 0) {
      await this._scanHostSubmissions();
    }
    if (!this.hostSubmissions || this.hostSubmissions.length === 0) {
      return this.showToast('No candidate submissions found to grade.', 'warning');
    }

    const ok = confirm(`Run all test cases for ALL ${this.hostSubmissions.length} candidates across ${problems.length} problems?\nThis will automatically execute code, verify test cases, and calculate scores for all rounds.`);
    if (!ok) return;

    if (this.btnHostGradeAll) {
      this.btnHostGradeAll.disabled = true;
      this.btnHostGradeAll.textContent = '⏳ Auto-Grading All...';
    }
    this.showToast(`Batch grading started for ${this.hostSubmissions.length} candidates...`, 'info');

    let processedCount = 0;
    for (let ci = 0; ci < this.hostSubmissions.length; ci++) {
      const sub = this.hostSubmissions[ci];
      const payload = sub.fullPayload || {};
      const problemCodes = payload.problemCodes || {};
      const evaluations = {};
      let totalScore = 0;
      let maxContestScore = 0;
      let solvedCount = 0;
      let totalCpuMs = 0;
      const tierScores = {};
      const roundBreakdown = [];

      this.gradingCountLabel.textContent = `Evaluating candidate ${ci + 1}/${this.hostSubmissions.length}: ${sub.usn}...`;

      for (let pi = 0; pi < problems.length; pi++) {
        const p = problems[pi];
        maxContestScore += (p.maxPoints || 0);
        const code = problemCodes[p.id] || problemCodes[`${p.id}_c`] || problemCodes[`${p.id}_python`] || p.starterCode || '';

        let evalRes = null;
        try {
          evalRes = await window.api.compileAndEvaluate({
            code,
            language: this.activeContest?.language || 'c',
            testCases: p.testCases || [],
            timeoutMs: p.timeLimitMs || 2500,
            maxPoints: p.maxPoints || 20
          });
        } catch (err) {
          evalRes = {
            success: false,
            phase: 'system',
            compilerError: err.message,
            totalScore: 0,
            maxScore: p.maxPoints || 0,
            passedCount: 0,
            totalCount: (p.testCases || []).length,
            totalExecutionTimeMs: 0
          };
        }

        evaluations[p.id] = evalRes;
        const earned = evalRes.totalScore || 0;
        totalScore += earned;
        totalCpuMs += (evalRes.totalExecutionTimeMs || 0);
        const isSolved = evalRes.passedCount === evalRes.totalCount && evalRes.totalCount > 0;
        if (isSolved) solvedCount++;

        const tierKey = (p.tier || 'general').toLowerCase();
        if (!tierScores[tierKey]) {
          let displayName = tierKey.toUpperCase();
          if (tierKey === 'easy') displayName = 'Easy (Round 1)';
          else if (tierKey === 'medium') displayName = 'Medium (Round 2)';
          else if (tierKey === 'hard') displayName = 'Hard (Round 3)';

          tierScores[tierKey] = {
            tier: tierKey,
            name: displayName,
            score: 0,
            maxScore: 0,
            solvedCount: 0,
            totalCount: 0
          };
        }
        tierScores[tierKey].score += earned;
        tierScores[tierKey].maxScore += (p.maxPoints || 0);
        if (isSolved) tierScores[tierKey].solvedCount++;
        tierScores[tierKey].totalCount++;

        let status = 'FAILED';
        if (evalRes.phase === 'compilation' || (!evalRes.success && evalRes.compilerError)) {
          status = 'BUILD ERROR';
        } else if (isSolved) {
          status = 'PASSED';
        } else if (evalRes.passedCount > 0) {
          status = 'PARTIAL';
        }

        roundBreakdown.push({
          id: p.id,
          title: p.title || p.id,
          tier: p.tier || 'easy',
          difficulty: p.difficulty || p.tier || 'Easy',
          score: earned,
          maxScore: p.maxPoints || 0,
          passedCount: evalRes.passedCount || 0,
          totalCount: evalRes.totalCount || (p.testCases || []).length,
          totalExecutionTimeMs: evalRes.totalExecutionTimeMs || 0,
          status
        });
      }

      // Update payload
      payload.totalScore = totalScore;
      payload.maxScore = maxContestScore;
      payload.problemsSolvedCount = solvedCount;
      payload.totalProblems = problems.length;
      payload.totalExecutionTimeMs = Math.round(totalCpuMs * 10) / 10;
      payload.evaluations = evaluations;
      payload.tierScores = tierScores;
      payload.roundBreakdown = roundBreakdown;

      // Save back to disk and mirror
      await window.api.saveFinalSubmission(payload);
      processedCount++;
    }

    if (this.btnHostGradeAll) {
      this.btnHostGradeAll.disabled = false;
      this.btnHostGradeAll.textContent = '⚡ Auto-Grade / Run All Tests';
    }
    this.showToast(`Batch evaluation complete! Evaluated ${processedCount} candidates for all rounds.`, 'success');
    await this._scanHostSubmissions();
  }

  _renderLeaderboardTable() {
    const isExam = this.hostContestType === 'exam' || (this.activeContest && this.activeContest.type === 'exam');

    if (this.leaderboardThead) {
      if (isExam) {
        this.leaderboardThead.innerHTML = `
          <tr>
            <th style="width: 50px; text-align: center;">Rank</th>
            <th style="width: 130px;">USN</th>
            <th>Candidate Name</th>
            <th>Batch</th>
            <th>Assigned Lab Experiment</th>
            <th style="text-align: center;">Change of Exp?</th>
            <th style="text-align: center;">Status</th>
            <th style="text-align: center;">Raw Marks</th>
            <th style="text-align: center; color: var(--color-emerald);">Final Marks</th>
            <th>Elapsed</th>
            <th>Violations</th>
            <th style="text-align: center;">Action</th>
          </tr>
        `;
      } else {
        this.leaderboardThead.innerHTML = `
          <tr>
            <th style="width: 55px; text-align: center;">Rank</th>
            <th>USN</th>
            <th>Candidate Name</th>
            <th style="color: var(--color-emerald); text-align: center;">Easy (R1)</th>
            <th style="color: var(--color-amber); text-align: center;">Medium (R2)</th>
            <th style="color: var(--color-rose); text-align: center;">Hard (R3)</th>
            <th style="text-align: center;">Total Score</th>
            <th style="text-align: center;">Solved</th>
            <th>Elapsed</th>
            <th>CPU Exec</th>
            <th>Violations</th>
            <th style="text-align: center;">Action</th>
          </tr>
        `;
      }
    }

    if (this.hostSubmissions.length === 0) {
      this.hostLeaderboardTbody.innerHTML = `
        <tr><td colspan="12" style="text-align: center; color: var(--text-muted); padding: 32px;">No submissions found. Click "Scan Submissions Folder" to load candidate records.</td></tr>
      `;
      return;
    }

    this.hostLeaderboardTbody.innerHTML = this.hostSubmissions.map(r => {
      const m = Math.floor(r.timeElapsedSeconds / 60);
      const s = r.timeElapsedSeconds % 60;
      const rankColor = r.rank === 1 ? 'color: #ffd700; font-weight: 900;' : r.rank === 2 ? 'color: #e0e0e0; font-weight: 800;' : r.rank === 3 ? 'color: #cd7f32; font-weight: 800;' : '';

      if (isExam) {
        const p = r.fullPayload || {};
        let studentBatchName = p.batchName || '';
        let studentAssignedExp = p.assignedProblemTitle || '';
        let isCoe = p.isChangeOfExperiment || false;
        let penalty = p.penalty || 0;

        if (!studentAssignedExp && this.hostBatches) {
          for (const b of this.hostBatches) {
            const found = (b.students || []).find(st => st.usn && st.usn.toUpperCase() === r.usn.toUpperCase());
            if (found) {
              studentBatchName = b.name;
              studentAssignedExp = found.assignedProblemTitle;
              isCoe = found.isChangeOfExperiment;
              penalty = found.penalty || 0;
              break;
            }
          }
        }

        const rawScore = r.totalScore || 0;
        const finalScore = isCoe ? Math.max(0, rawScore - penalty) : rawScore;
        const coeDisplay = isCoe
          ? `<span class="badge-change-of-exp">⚠ -${penalty} Pts (Changed)</span>`
          : `<span style="color: var(--text-muted); font-size: 0.76rem;">No (Regular)</span>`;

        return `
          <tr>
            <td style="text-align: center;"><span style="${rankColor}">#${r.rank}</span></td>
            <td style="font-family: var(--font-mono); font-weight: 700;">${this._escape(r.usn)}</td>
            <td>${this._escape(r.name)}</td>
            <td><span class="candidate-pill" style="font-size: 0.72rem;">${this._escape(studentBatchName || 'Batch 1')}</span></td>
            <td><strong style="color: var(--color-cyan); font-size: 0.85rem;">${this._escape(studentAssignedExp || 'Lab Program')}</strong></td>
            <td style="text-align: center;">${coeDisplay}</td>
            <td style="text-align: center; font-family: var(--font-mono);">${r.problemsSolvedCount > 0 ? '✔ Solved' : 'Incomplete'}</td>
            <td style="text-align: center; font-family: var(--font-mono); color: var(--text-muted);">${rawScore} / ${r.maxScore}</td>
            <td style="text-align: center; font-family: var(--font-mono);"><strong style="color: var(--color-emerald); font-size: 0.95rem;">${finalScore} / ${r.maxScore}</strong></td>
            <td style="font-family: var(--font-mono); font-size: 0.8rem;">${m}m ${s < 10 ? '0' : ''}${s}s</td>
            <td><span style="${r.violationsCount > 0 ? 'color: var(--color-rose); font-weight: bold;' : ''}">${r.violationsCount}</span></td>
            <td style="text-align: center;"><button class="btn btn-secondary btn-sm btn-inspect-cand" data-usn="${this._escape(r.usn)}">Inspect</button></td>
          </tr>
        `;
      }

      // Contest Mode Row
      const tierScores = r.tierScores || (r.fullPayload && r.fullPayload.tierScores) || {};
      let easyStr = (tierScores.easy && typeof tierScores.easy.score === 'number') ? `${tierScores.easy.score}/${tierScores.easy.maxScore}` : null;
      let medStr = (tierScores.medium && typeof tierScores.medium.score === 'number') ? `${tierScores.medium.score}/${tierScores.medium.maxScore}` : null;
      let hardStr = (tierScores.hard && typeof tierScores.hard.score === 'number') ? `${tierScores.hard.score}/${tierScores.hard.maxScore}` : null;

      // Dynamic calculation for legacy or fallback submissions
      if (!easyStr || !medStr || !hardStr) {
        const evs = (r.fullPayload && r.fullPayload.evaluations) || {};
        const probs = (this.activeContest && this.activeContest.problems) || this.hostProblems || [];
        let eS = 0, eM = 0, mS = 0, mM = 0, hS = 0, hM = 0;
        let hasE = false, hasM = false, hasH = false;
        probs.forEach(p => {
          const t = (p.tier || '').toLowerCase();
          const ev = evs[p.id];
          const sc = ev ? (ev.totalScore || 0) : 0;
          const maxP = p.maxPoints || 0;
          if (t === 'easy') { eS += sc; eM += maxP; hasE = true; }
          else if (t === 'medium') { mS += sc; mM += maxP; hasM = true; }
          else if (t === 'hard') { hS += sc; hM += maxP; hasH = true; }
        });
        if (hasE && !easyStr) easyStr = `${eS}/${eM}`;
        if (hasM && !medStr) medStr = `${mS}/${mM}`;
        if (hasH && !hardStr) hardStr = `${hS}/${hM}`;
      }

      return `
        <tr>
          <td style="text-align: center;"><span style="${rankColor}">#${r.rank}</span></td>
          <td style="font-family: var(--font-mono); font-weight: 700;">${this._escape(r.usn)}</td>
          <td>${this._escape(r.name)}</td>
          <td style="text-align: center; font-family: var(--font-mono); color: var(--color-emerald); font-weight: 700;">${easyStr || '--'}</td>
          <td style="text-align: center; font-family: var(--font-mono); color: var(--color-amber); font-weight: 700;">${medStr || '--'}</td>
          <td style="text-align: center; font-family: var(--font-mono); color: var(--color-rose); font-weight: 700;">${hardStr || '--'}</td>
          <td style="text-align: center;"><strong style="color: var(--color-emerald); font-size: 0.95rem;">${r.totalScore} / ${r.maxScore}</strong></td>
          <td style="text-align: center;">${r.problemsSolvedCount} / ${r.totalProblems}</td>
          <td style="font-family: var(--font-mono); font-size: 0.8rem;">${m}m ${s < 10 ? '0' : ''}${s}s</td>
          <td style="font-family: var(--font-mono); font-size: 0.8rem;">${r.totalExecutionTimeMs} ms</td>
          <td><span style="${r.violationsCount > 0 ? 'color: var(--color-rose); font-weight: bold;' : ''}">${r.violationsCount}</span></td>
          <td style="text-align: center;"><button class="btn btn-secondary btn-sm btn-inspect-cand" data-usn="${this._escape(r.usn)}">Inspect</button></td>
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
          const m = Math.floor(sub.timeElapsedSeconds / 60);
          const s = sub.timeElapsedSeconds % 60;
          if (this.inspectTime) {
            this.inspectTime.innerHTML = `Time: <strong>${m}m ${s < 10 ? '0' : ''}${s}s</strong> | CPU: <strong>${sub.totalExecutionTimeMs} ms</strong>`;
          }

          const p = sub.fullPayload || {};
          const tScores = sub.tierScores || p.tierScores || {};
          if (this.inspectRoundsContainer) {
            const keys = Object.keys(tScores);
            if (keys.length > 0) {
              this.inspectRoundsContainer.innerHTML = keys.map(k => {
                const item = tScores[k];
                let color = 'var(--color-cyan)';
                if (k === 'easy') color = 'var(--color-emerald)';
                else if (k === 'medium') color = 'var(--color-amber)';
                else if (k === 'hard') color = 'var(--color-rose)';
                return `
                  <div style="background: rgba(255,255,255,0.03); border: 1px solid ${color}; border-radius: 6px; padding: 6px 12px; font-size: 0.8rem;">
                    <span style="color: var(--text-muted);">${item.name || k.toUpperCase()}:</span>
                    <strong style="color: ${color}; margin-left: 6px;">${item.score} / ${item.maxScore}</strong>
                    <span style="color: var(--text-muted); font-size: 0.72rem; margin-left: 4px;">(${item.solvedCount || 0} solved)</span>
                  </div>
                `;
              }).join('');
            } else {
              this.inspectRoundsContainer.innerHTML = '<span style="color: var(--text-muted); font-size: 0.8rem;">No round breakdown saved. Click "⚡ Auto-Grade / Run All Tests" to compute.</span>';
            }
          }

          if (this.inspectProgramsTbody) {
            const breakdown = sub.roundBreakdown || p.roundBreakdown || [];
            if (breakdown.length > 0) {
              this.inspectProgramsTbody.innerHTML = breakdown.map((item, idx) => {
                let badgeClass = 'badge-status-failed';
                if (item.status === 'PASSED') badgeClass = 'badge-status-passed';
                else if (item.status === 'PARTIAL') badgeClass = 'badge-status-partial';
                else if (item.status === 'BUILD ERROR') badgeClass = 'badge-status-error';
                else if (item.status === 'NOT ATTEMPTED') badgeClass = 'badge-status-unattempted';

                return `
                  <tr>
                    <td style="text-align: center; color: var(--text-muted); font-family: var(--font-mono);">${idx + 1}</td>
                    <td style="text-transform: uppercase; font-weight: 700;">${this._escape(item.tier)}</td>
                    <td style="font-weight: 600;">${this._escape(item.title)}</td>
                    <td style="text-align: center; font-family: var(--font-mono);">${item.passedCount} / ${item.totalCount}</td>
                    <td style="text-align: center; font-family: var(--font-mono);"><strong style="color: var(--color-emerald);">${item.score} / ${item.maxScore}</strong></td>
                    <td style="text-align: center;"><span class="${badgeClass}">${item.status}</span></td>
                  </tr>
                `;
              }).join('');
            } else {
              this.inspectProgramsTbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 12px;">Detailed breakdown not recorded for this legacy submission. Click "⚡ Auto-Grade / Run All Tests" to evaluate.</td></tr>`;
            }
          }

          let codeLogs = '';
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

  // --------------------------------------------------------------------------
  // RESIZABLE WORKSPACE & TERMINAL SPLITTERS
  // --------------------------------------------------------------------------
  _initResizers() {
    const wsResizer = document.getElementById('workspace-resizer');
    const leftPanel = document.getElementById('ws-left-panel');
    const container = document.getElementById('competitor-workspace-view');

    if (wsResizer && leftPanel && container) {
      let isDragging = false;
      wsResizer.addEventListener('mousedown', (e) => {
        isDragging = true;
        wsResizer.classList.add('resizing');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
      });

      document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const rect = container.getBoundingClientRect();
        const newWidth = e.clientX - rect.left;
        const minWidth = 200;
        const maxWidth = rect.width - 260;
        const clampedWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));
        leftPanel.style.width = `${clampedWidth}px`;
      });

      document.addEventListener('mouseup', () => {
        if (isDragging) {
          isDragging = false;
          wsResizer.classList.remove('resizing');
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
        }
      });

      // Double-click on splitter resets to default 44% width
      wsResizer.addEventListener('dblclick', () => {
        leftPanel.style.width = '44%';
        if (leftPanel.style.display === 'none') {
          leftPanel.style.display = 'flex';
          wsResizer.style.display = 'block';
          if (this.btnWsToggleExpand) {
            this.btnWsToggleExpand.innerHTML = '⛶ Expand Workspace';
            this.btnWsToggleExpand.classList.remove('btn-primary');
            this.btnWsToggleExpand.classList.add('btn-secondary');
          }
        }
      });
    }

    // Terminal vertical resizer
    const termResizer = document.getElementById('terminal-resizer');
    const termContainer = document.getElementById('ws-terminal-container');
    if (termResizer && termContainer) {
      let isTermDragging = false;
      termResizer.addEventListener('mousedown', (e) => {
        isTermDragging = true;
        termResizer.classList.add('resizing');
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
      });

      document.addEventListener('mousemove', (e) => {
        if (!isTermDragging) return;
        const rect = termContainer.parentElement.getBoundingClientRect();
        const newHeight = rect.bottom - e.clientY;
        const minHeight = 90;
        const maxHeight = rect.height - 100;
        const clampedHeight = Math.max(minHeight, Math.min(newHeight, maxHeight));
        termContainer.style.height = `${clampedHeight}px`;
      });

      document.addEventListener('mouseup', () => {
        if (isTermDragging) {
          isTermDragging = false;
          termResizer.classList.remove('resizing');
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
        }
      });

      // Double-click on terminal splitter resets height to default 240px
      termResizer.addEventListener('dblclick', () => {
        termContainer.style.height = '240px';
      });
    }
  }

  // --------------------------------------------------------------------------
  // INTERACTIVE RUNTIME TERMINAL SANDBOX
  // --------------------------------------------------------------------------
  _initInteractiveTerminal() {
    this.terminalHistory = [];
    this.terminalHistoryIdx = -1;
    this.isTerminalRunningProcess = false;

    const terminalStream = document.getElementById('terminal-stream');
    const cliInput = document.getElementById('terminal-cli-input');
    const btnSendCli = document.getElementById('btn-terminal-send-cli');
    const btnRunTerm = document.getElementById('btn-ws-run-term');
    const btnKillTerm = document.getElementById('btn-ws-kill-term');
    const btnClearTerm = document.getElementById('btn-ws-clear-term');

    // Stream output listener from main process
    if (window.api && window.api.onTerminalStreamOutput) {
      window.api.onTerminalStreamOutput(({ text }) => {
        if (!terminalStream) return;
        terminalStream.textContent += text;
        const lines = terminalStream.textContent.split('\n');
        if (lines.length > 1000) {
          terminalStream.textContent = lines.slice(lines.length - 1000).join('\n');
        }
        terminalStream.scrollTop = terminalStream.scrollHeight;
      });
    }

    // Process exit listener
    if (window.api && window.api.onTerminalProcessExit) {
      window.api.onTerminalProcessExit(({ code, killed, error, cwd }) => {
        this.isTerminalRunningProcess = false;
        if (btnKillTerm) btnKillTerm.style.display = 'none';
        if (btnRunTerm) btnRunTerm.style.display = 'inline-block';
        if (this.terminalTopStatus) this.terminalTopStatus.textContent = 'RUNTIME TERMINAL SANDBOX';

        if (terminalStream) {
          if (killed) {
            terminalStream.textContent += '\r\n[Process terminated by user (Kill / Ctrl+C)]\r\n';
          } else if (error) {
            terminalStream.textContent += `\r\n[Process exited with error: ${error}]\r\n`;
          } else {
            terminalStream.textContent += `\r\n[Process exited with code ${code}]\r\n`;
          }

          terminalStream.scrollTop = terminalStream.scrollHeight;
        }

        if (cwd) {
          if (this.terminalCwdTag) this.terminalCwdTag.textContent = cwd;
          if (this.terminalCliPrompt) this.terminalCliPrompt.textContent = cwd + '>';
        }
      });
    }

    // CLI Input submission
    const sendCliCommand = async () => {
      if (!cliInput) return;
      const val = cliInput.value;
      cliInput.value = '';

      if (this.isTerminalRunningProcess) {
        if (terminalStream) {
          terminalStream.textContent += val + '\r\n';
          terminalStream.scrollTop = terminalStream.scrollHeight;
        }
        if (window.api && window.api.sendTerminalStdin) {
          await window.api.sendTerminalStdin({ input: val });
        }
        return;
      }

      const trimmed = val.trim();
      if (!trimmed) return;

      this.terminalHistory.push(trimmed);
      this.terminalHistoryIdx = this.terminalHistory.length;

      const promptText = (this.terminalCliPrompt ? this.terminalCliPrompt.textContent : 'C:\\workspace>') + ' ';
      if (terminalStream) {
        terminalStream.textContent += '\r\n' + promptText + trimmed + '\r\n';
        terminalStream.scrollTop = terminalStream.scrollHeight;
      }

      this.isTerminalRunningProcess = true;
      if (btnKillTerm) btnKillTerm.style.display = 'inline-block';
      if (btnRunTerm) btnRunTerm.style.display = 'none';
      if (this.terminalTopStatus) this.terminalTopStatus.textContent = 'RUNNING PROCESS // Press Kill or Ctrl+C to stop';

      const res = await window.api.runTerminalCommand({ command: trimmed });
      if (res && res.isClear) {
        if (terminalStream) terminalStream.textContent = '';
        this.isTerminalRunningProcess = false;
        if (btnKillTerm) btnKillTerm.style.display = 'none';
        if (btnRunTerm) btnRunTerm.style.display = 'inline-block';
        if (this.terminalTopStatus) this.terminalTopStatus.textContent = 'RUNTIME TERMINAL SANDBOX';
      } else if (res && res.isCd) {
        this.isTerminalRunningProcess = false;
        if (btnKillTerm) btnKillTerm.style.display = 'none';
        if (btnRunTerm) btnRunTerm.style.display = 'inline-block';
        if (this.terminalTopStatus) this.terminalTopStatus.textContent = 'RUNTIME TERMINAL SANDBOX';
        if (res.output && terminalStream) {
          terminalStream.textContent += res.output;
        }
        if (res.cwd) {
          if (this.terminalCwdTag) this.terminalCwdTag.textContent = res.cwd;
          if (this.terminalCliPrompt) this.terminalCliPrompt.textContent = res.cwd + '>';
        }
      }
    };

    if (cliInput) {
      cliInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          sendCliCommand();
        } else if (e.key === 'ArrowUp') {
          if (this.terminalHistory.length > 0 && this.terminalHistoryIdx > 0) {
            this.terminalHistoryIdx--;
            cliInput.value = this.terminalHistory[this.terminalHistoryIdx] || '';
          }
        } else if (e.key === 'ArrowDown') {
          if (this.terminalHistoryIdx < this.terminalHistory.length - 1) {
            this.terminalHistoryIdx++;
            cliInput.value = this.terminalHistory[this.terminalHistoryIdx] || '';
          } else {
            this.terminalHistoryIdx = this.terminalHistory.length;
            cliInput.value = '';
          }
        } else if (e.ctrlKey && e.key === 'c') {
          e.preventDefault();
          if (window.api && window.api.killTerminalProcess) {
            window.api.killTerminalProcess();
          }
        }
      });
    }

    if (btnSendCli) {
      btnSendCli.addEventListener('click', () => sendCliCommand());
    }

    if (btnKillTerm) {
      btnKillTerm.addEventListener('click', async () => {
        if (window.api && window.api.killTerminalProcess) {
          await window.api.killTerminalProcess();
        }
      });
    }

    if (btnRunTerm) {
      btnRunTerm.addEventListener('click', async () => {
        if (cliInput && cliInput.value.trim().length > 0) {
          sendCliCommand();
          return;
        }

        const code = this.editorCode ? this.editorCode.value : '';
        if (window.api && window.api.syncTerminalEditorFile) {
          await window.api.syncTerminalEditorFile({ filename: 'solution.c', code });
        }

        if (terminalStream) {
          terminalStream.textContent += '\r\n[Compiling solution.c with GCC and executing in terminal...]\r\n';
          terminalStream.scrollTop = terminalStream.scrollHeight;
        }

        this.isTerminalRunningProcess = true;
        if (btnKillTerm) btnKillTerm.style.display = 'inline-block';
        if (btnRunTerm) btnRunTerm.style.display = 'none';
        if (this.terminalTopStatus) this.terminalTopStatus.textContent = 'RUNNING: solution.exe (Active)';

        await window.api.runTerminalCommand({ command: 'gcc solution.c -o solution.exe && solution.exe' });
      });
    }

    if (btnClearTerm) {
      btnClearTerm.addEventListener('click', () => {
        if (terminalStream) terminalStream.textContent = '[MASS-CODE RUNTIME]: Terminal output cleared.\r\n';
      });
    }

  }

  // --------------------------------------------------------------------------
  // HOST MODE WORKSPACE STAGE FLOW
  // --------------------------------------------------------------------------
  _switchHostStage(stageKey) {
    const panels = {
      builder: document.getElementById('host-panel-builder'),
      batches: document.getElementById('host-panel-batches'),
      server: document.getElementById('host-panel-server'),
      grading: document.getElementById('host-panel-grading')
    };

    // Update active tab buttons
    this.hostTabs.forEach(btn => {
      if (btn.dataset.tab === stageKey) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Show only active stage panel and hide all others
    Object.keys(panels).forEach(key => {
      const panel = panels[key];
      if (!panel) return;
      if (key === stageKey) {
        panel.style.display = 'flex';
        panel.classList.add('active');
        if (this.hostWorkspaceContent) {
          this.hostWorkspaceContent.scrollTop = 0;
        }
      } else {
        panel.style.display = 'none';
        panel.classList.remove('active');
      }
    });

    // Handle stage-specific updates
    if (stageKey === 'batches') {
      this._renderBatchSelectOptions();
      this._renderBatchAllocationsTable();
    } else if (stageKey === 'server') {
      this._refreshHostServerStatus();
    } else if (stageKey === 'grading') {
      this._loadAndRenderLeaderboard();
    }
  }

  _chooseHostMode(mode) {
    this.hostStep = 3;
    this._setHostMode(mode);
    if (this.hostModeSelectScreen) this.hostModeSelectScreen.style.display = 'none';
    if (this.hostWorkspaceContent) this.hostWorkspaceContent.style.display = 'block';

    const tabBatches = document.getElementById('tab-btn-batches');
    const stageNumServer = document.getElementById('stage-num-server');
    const stageNumGrading = document.getElementById('stage-num-grading');
    const nextBtnBuilder = document.getElementById('btn-next-stage-builder');
    const prevBtnServer = document.getElementById('btn-prev-stage-server');

    if (mode === 'exam') {
      if (tabBatches) tabBatches.style.display = 'inline-flex';
      if (stageNumServer) stageNumServer.textContent = 'Stage 3:';
      if (stageNumGrading) stageNumGrading.textContent = 'Stage 4:';
      if (nextBtnBuilder) nextBtnBuilder.innerHTML = 'Next Stage: Batches &amp; Allocations →';
      if (prevBtnServer) prevBtnServer.innerHTML = '← Previous Stage: Batches';
    } else {
      if (tabBatches) tabBatches.style.display = 'none';
      if (stageNumServer) stageNumServer.textContent = 'Stage 2:';
      if (stageNumGrading) stageNumGrading.textContent = 'Stage 3:';
      if (nextBtnBuilder) nextBtnBuilder.innerHTML = 'Next Stage: Server &amp; LAN Distribution →';
      if (prevBtnServer) prevBtnServer.innerHTML = '← Previous Stage: Questions';
    }

    // Default to Stage 1: Questions / Lab Experiments builder
    this._switchHostStage('builder');
  }

  _handleHostBack() {
    if (this.hostStep === 3) {
      // Step 3 (Workspace) -> Step 2 (Session Mode Select)
      this.hostStep = 2;
      if (this.hostWorkspaceContent) this.hostWorkspaceContent.style.display = 'none';
      if (this.hostModeSelectScreen) this.hostModeSelectScreen.style.display = 'flex';
      if (this.btnHostEndSession) this.btnHostEndSession.style.display = 'none';
      this.btnExitHost.style.display = 'inline-flex';
    } else {
      // Step 2 (Session Mode Select) -> Step 1 (Welcome Screen)
      this.switchView('welcome');
    }
  }

  _showHostModeSelectScreen() {
    this.hostStep = 2;
    if (this.hostModeSelectScreen) this.hostModeSelectScreen.style.display = 'flex';
    if (this.hostWorkspaceContent) this.hostWorkspaceContent.style.display = 'none';
    if (this.btnHostEndSession) this.btnHostEndSession.style.display = 'none';
  }

  // --------------------------------------------------------------------------
  // CANDIDATE MODE FLOW (EXAM VS CONTEST)
  // --------------------------------------------------------------------------
  _launchCandidateEntry(mode) {
    this.candidateMode = mode;
    this.compStep = 3;
    if (this.competitorModeSelectScreen) this.competitorModeSelectScreen.style.display = 'none';
    if (this.compRegOverlay) this.compRegOverlay.style.display = 'flex';
    this._setCandidateMode(mode);
    if (this.btnExitComp) this.btnExitComp.style.display = 'inline-flex';
  }

  _handleCompBack() {
    if (this.compStep === 3) {
      // Step 3 (Candidate Registration) -> Step 2 (Competitor Mode Select)
      this.compStep = 2;
      if (this.compRegOverlay) this.compRegOverlay.style.display = 'none';
      if (this.competitorModeSelectScreen) this.competitorModeSelectScreen.style.display = 'flex';
      if (this.btnExitComp) this.btnExitComp.style.display = 'inline-flex';
    } else {
      // Step 2 (Competitor Mode Select) -> Step 1 (Welcome Screen)
      this._exitCompetitorEntry();
    }
  }

  _setCandidateMode(mode) {
    this.candidateMode = mode;
    if (mode === 'exam') {
      if (this.compModeIndicatorTag) {
        this.compModeIndicatorTag.textContent = '🎓 LAB EXAM MODE // Lab Experiments & Batches';
        this.compModeIndicatorTag.className = 'candidate-pill mode-indicator-exam';
      }
      if (this.btnCompModeExam) this.btnCompModeExam.classList.add('active');
      if (this.btnCompModeContest) this.btnCompModeContest.classList.remove('active');
      if (this.compContestFields) this.compContestFields.style.display = 'none';
      if (this.compExamNotice) this.compExamNotice.style.display = 'block';
      if (this.compExamOtpGroup) this.compExamOtpGroup.style.display = 'block';
      if (this.compNameGroup) this.compNameGroup.style.display = 'none';
      if (this.btnCompStartContest) this.btnCompStartContest.style.display = 'none';
      if (this.btnCompStartExam) this.btnCompStartExam.style.display = 'inline-block';
      const title = document.getElementById('comp-reg-header-title');
      const desc = document.getElementById('comp-reg-header-desc');
      if (title) title.textContent = 'Lab Exam Candidate Station';
      if (desc) desc.textContent = 'Enter your institutional USN and 4-digit Exam Access OTP to retrieve your allocated laboratory experiment.';
    } else {
      if (this.compModeIndicatorTag) {
        this.compModeIndicatorTag.textContent = '🏆 CONTEST MODE // Multi-Tier Competitive';
        this.compModeIndicatorTag.className = 'candidate-pill mode-indicator-contest';
      }
      if (this.btnCompModeContest) this.btnCompModeContest.classList.add('active');
      if (this.btnCompModeExam) this.btnCompModeExam.classList.remove('active');
      if (this.compContestFields) this.compContestFields.style.display = 'block';
      if (this.compExamNotice) this.compExamNotice.style.display = 'none';
      if (this.compExamOtpGroup) this.compExamOtpGroup.style.display = 'none';
      if (this.compNameGroup) this.compNameGroup.style.display = 'block';
      if (this.btnCompStartContest) this.btnCompStartContest.style.display = 'inline-block';
      if (this.btnCompStartExam) this.btnCompStartExam.style.display = 'none';
      const title = document.getElementById('comp-reg-header-title');
      const desc = document.getElementById('comp-reg-header-desc');
      if (title) title.textContent = 'Candidate Contest Entry';
      if (desc) desc.textContent = 'Connect to the active contest, register your institutional identifier, and lock down workspace.';
    }
    this._checkCompStartButton();
  }

  async _handleStartExamSubmit() {
    const usn = (this.compUsnInput?.value || '').trim().toUpperCase();
    if (!usn) {
      if (this.compUsnInput) this.compUsnInput.focus();
      return this.showToast('Please enter your Institutional USN / Reg No.', 'warning');
    }

    const otp = (this.compExamOtpInput?.value || '').trim();
    if (!otp || otp.length !== 4) {
      if (this.compExamOtpInput) this.compExamOtpInput.focus();
      return this.showToast('Please enter the 4-digit Exam Access OTP provided by your lab examiner.', 'warning');
    }

    let hostUrl = (this.compHostUrl.value || '').trim();
    if (!hostUrl && this.discoveredHostUrl) {
      hostUrl = this.discoveredHostUrl;
      this.compHostUrl.value = hostUrl;
    }
    if (!hostUrl) {
      hostUrl = 'http://localhost:8080';
    }

    this.showToast(`Connecting to Host (${hostUrl}) to verify credentials for ${usn}...`, 'info');
    const res = await window.api.fetchExamAssignment({ hostUrl, usn, otp });

    if (!res || !res.success) {
      return this.showToast(res?.error || 'Failed to retrieve assigned experiment from Host. Ensure Host server is running, USN is enrolled, and OTP is correct.', 'error');
    }

    const { examTitle, batchName, duration, student, problem } = res;

    // In Exam Mode, ONLY the mapped question is loaded! No other questions.
    this.activeContest = {
      title: examTitle || 'Lab Examination',
      type: 'exam',
      token: res.token || 'MASS2026',
      duration: duration || 90,
      problems: [problem],
      batches: [{
        name: batchName || 'Active Batch',
        students: [student]
      }]
    };

    const candidateName = student.name || student.usn;

    this.competitor.usn = student.usn;
    this.competitor.name = candidateName;
    this.competitor.isSessionActive = true;
    this.compStep = 4;
    this.competitor.uptimeSeconds = 0;
    this.competitor.problemCodes = { [problem.id]: problem.starterCode || '// Write solution here\n' };
    this.competitor.evaluations = {};
    this.competitor.activeProblemId = problem.id;
    this.competitor.isExamMode = true;

    // Initialize interactive terminal session for this student
    if (window.api && window.api.initTerminalSession) {
      const termRes = await window.api.initTerminalSession({ usn: student.usn });
      if (termRes && termRes.cwd) {
        if (this.terminalCwdTag) this.terminalCwdTag.textContent = termRes.cwd;
        if (this.terminalCliPrompt) this.terminalCliPrompt.textContent = termRes.cwd + '>';
      }
    }

    // Switch to active kiosk workspace
    this.compRegOverlay.style.display = 'none';
    this.competitorWorkspace.style.display = 'flex';
    this.competitorBankView.style.display = 'none';

    // In Exam Mode, hide the Return to Bank and evaluation action buttons
    if (this.btnBackToBank) this.btnBackToBank.style.display = 'none';
    if (this.btnWsResetCode) this.btnWsResetCode.style.display = 'none';
    if (this.btnWsRunSample) this.btnWsRunSample.style.display = 'none';
    if (this.btnWsRunTests) this.btnWsRunTests.style.display = 'none';

    this._openProblemWorkspace(problem.id);

    // Kiosk lockdown
    if (window.api && window.api.setSecurityMode) {
      await window.api.setSecurityMode({ mode: 'kiosk' });
    }

    // Update navigation
    this.navCandidateUsn.textContent = `${student.usn} (${candidateName})`;
    this.navCandidatePill.style.display = 'inline-flex';
    this.navTimerBox.style.display = 'inline-flex';
    this.navKioskBadge.style.display = 'inline-flex';
    this.btnEndSession.style.display = 'inline-flex';
    this.btnSupervisorKey.style.display = 'inline-flex';
    if (this.btnExitComp) this.btnExitComp.style.display = 'none';

    this._startRelativeCountdown();
    this.showToast(`Lab Exam Started! Allocated: ${problem.title}. Station locked down!`, 'success');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.massCodeApp = new MassCodeApp();
});
