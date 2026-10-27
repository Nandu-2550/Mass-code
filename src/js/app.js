/**
 * ============================================================================
 * CODEVAULT MAIN APPLICATION COORDINATOR
 * - Mode Routing (Host Mode vs Attender Mode)
 * - Supervisor Authentication Modal for security switches
 * - Startup Diagnostics & Toast Notifications
 * ============================================================================
 */

class AppController {
  constructor() {
    this.currentMode = 'host'; // 'host' or 'attender'
    this.activeContest = null;

    this._initElements();
    this._bindEvents();
    this._runStartupDiagnostics();
  }

  _initElements() {
    // Mode Buttons
    this.btnModeHost = document.getElementById('btn-mode-host');
    this.btnModeAttender = document.getElementById('btn-mode-attender');
    this.viewHost = document.getElementById('view-host');
    this.viewAttender = document.getElementById('view-attender');

    // Navigation displays
    this.navContestTitle = document.getElementById('nav-contest-title');
    this.compilerBadge = document.getElementById('compiler-status-badge');
    this.toastContainer = document.getElementById('toast-container');

    // Supervisor PIN Auth Modal
    this.btnHostPinUnlock = document.getElementById('btn-host-pin-unlock');
    this.modalSupervisor = document.getElementById('modal-supervisor-auth');
    this.supervisorPinInput = document.getElementById('supervisor-pin-input');
    this.btnConfirmSupervisor = document.getElementById('btn-confirm-supervisor-auth');
    this.btnCancelSupervisor = document.getElementById('btn-cancel-supervisor-auth');
    this.supervisorAuthError = document.getElementById('supervisor-auth-error');
  }

  _bindEvents() {
    // Mode Switch Click: Switching to Attender is direct. Switching to Host requires PIN!
    if (this.btnModeHost) {
      this.btnModeHost.addEventListener('click', () => {
        if (this.currentMode === 'attender' && window.attenderEngine && window.attenderEngine.isContestActive) {
          this.promptSupervisorAuth(() => {
            this.setMode('host');
          });
        } else {
          this.setMode('host');
        }
      });
    }

    if (this.btnModeAttender) {
      this.btnModeAttender.addEventListener('click', () => {
        this.setMode('attender');
      });
    }

    if (this.btnHostPinUnlock) {
      this.btnHostPinUnlock.addEventListener('click', () => {
        this.promptSupervisorAuth(() => {
          this.showToast('Supervisor authentication verified.', 'success');
        });
      });
    }

    // Supervisor Modal Handlers
    if (this.btnConfirmSupervisor) {
      this.btnConfirmSupervisor.addEventListener('click', () => this._verifySupervisorPin());
      this.supervisorPinInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this._verifySupervisorPin();
      });
    }

    if (this.btnCancelSupervisor) {
      this.btnCancelSupervisor.addEventListener('click', () => {
        this.modalSupervisor.classList.remove('active');
        this.pendingSupervisorAction = null;
      });
    }
  }

  async _runStartupDiagnostics() {
    if (window.api && window.api.getDiagnostics) {
      try {
        const diag = await window.api.getDiagnostics();
        if (diag.gcc && diag.gcc.available) {
          this.compilerBadge.textContent = 'GCC: MinGW 6.3.0 Ready';
          this.compilerBadge.className = 'compiler-pill';
        } else {
          this.compilerBadge.textContent = 'GCC: Not Found in PATH';
          this.compilerBadge.style.background = 'rgba(218, 54, 51, 0.2)';
          this.compilerBadge.style.color = 'var(--color-red-bright)';
        }

        if (window.attenderEngine) {
          window.attenderEngine.checkEnvironment();
        }
      } catch (err) {
        console.error('Diagnostics error:', err);
      }
    }
  }

  setMode(mode) {
    this.currentMode = mode;

    if (mode === 'host') {
      this.btnModeHost.classList.add('active');
      this.btnModeAttender.classList.remove('active');
      this.viewHost.classList.add('active');
      this.viewAttender.classList.remove('active');

      // Refresh grading leaderboard on returning to host
      if (window.hostController) {
        window.hostController.scanGradingFolder();
        window.hostController.refreshServerStatus();
      }
    } else {
      this.btnModeAttender.classList.add('active');
      this.btnModeHost.classList.remove('active');
      this.viewAttender.classList.add('active');
      this.viewHost.classList.remove('active');

      if (this.activeContest && window.attenderEngine) {
        window.attenderEngine.setContest(this.activeContest);
      }
    }
  }

  setActiveContest(contest) {
    this.activeContest = contest;
    this.updateContestTitle(contest.title);
    if (window.attenderEngine) {
      window.attenderEngine.setContest(contest);
    }
  }

  updateContestTitle(title) {
    if (this.navContestTitle) {
      this.navContestTitle.textContent = title || 'No Contest Loaded';
    }
  }

  promptSupervisorAuth(callback) {
    this.pendingSupervisorAction = callback;
    this.supervisorPinInput.value = '';
    this.supervisorAuthError.style.display = 'none';
    this.modalSupervisor.classList.add('active');
    this.supervisorPinInput.focus();
  }

  _verifySupervisorPin() {
    const entered = this.supervisorPinInput.value.trim();
    if (window.antiCheatManager && window.antiCheatManager.verifySupervisorPin(entered)) {
      this.modalSupervisor.classList.remove('active');
      if (this.pendingSupervisorAction) {
        this.pendingSupervisorAction();
        this.pendingSupervisorAction = null;
      }
    } else {
      this.supervisorAuthError.style.display = 'block';
    }
  }

  showToast(message, type = 'info') {
    if (!this.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icon = type === 'success' ? '✔' : type === 'error' ? '✖' : type === 'warning' ? '⚠' : 'ℹ';
    toast.innerHTML = `<span style="font-weight: bold;">${icon}</span> <span>${message}</span>`;

    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
}

// Global bootstrap
window.addEventListener('DOMContentLoaded', () => {
  window.app = new AppController();
});
