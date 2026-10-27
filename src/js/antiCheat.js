/**
 * ============================================================================
 * CODEVAULT ANTI-CHEAT PRIMITIVES
 * - Window blur & focus event interception
 * - Global shortcut capture and cancellation
 * - Violation strike accounting & security audit trail
 * - Fullscreen lockdown & supervisor PIN authentication
 * ============================================================================
 */

class AntiCheatManager {
  constructor() {
    this.isActive = false;
    this.violationCount = 0;
    this.maxStrikes = 3;
    this.auditLog = [];
    this.supervisorPin = 'ADMIN123';
    this.onStrikeCallback = null;
    this.onLockdownCallback = null;

    this._initElements();
    this._bindEvents();
  }

  _initElements() {
    this.violationModal = document.getElementById('modal-violation-warning');
    this.violationTimestamp = document.getElementById('violation-timestamp');
    this.violationCurrentStrike = document.getElementById('violation-current-strike');
    this.btnAcknowledgeViolation = document.getElementById('btn-acknowledge-violation');

    this.lockdownScreen = document.getElementById('lockdown-screen');
    this.lockdownPinInput = document.getElementById('lockdown-pin-input');
    this.btnUnlockWorkspace = document.getElementById('btn-unlock-workspace');
    this.lockdownErrorMsg = document.getElementById('lockdown-error-msg');

    this.strikeBadge = document.getElementById('nav-strike-badge');
    this.strikeCountNav = document.getElementById('nav-strike-count');
    this.metricStrikeCount = document.getElementById('metric-strike-count');
  }

  _bindEvents() {
    // Window blur (focus lost) detection from DOM
    window.addEventListener('blur', () => {
      this._handleBlurIncident('DOM Window Blur');
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this._handleBlurIncident('DOM Visibility Hidden');
      }
    });

    // Electron IPC Window Blur listener
    if (window.api && window.api.onWindowBlur) {
      window.api.onWindowBlur((data) => {
        this._handleBlurIncident('Electron Window Blur', data ? data.timestamp : null);
      });
    }

    // Acknowledge violation warning modal
    if (this.btnAcknowledgeViolation) {
      this.btnAcknowledgeViolation.addEventListener('click', () => {
        this.violationModal.classList.remove('active');
        // Regain focus
        window.focus();
      });
    }

    // Unlock workspace with supervisor PIN
    if (this.btnUnlockWorkspace) {
      this.btnUnlockWorkspace.addEventListener('click', () => {
        this._attemptUnlock();
      });
      this.lockdownPinInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this._attemptUnlock();
      });
    }

    // Global keyboard shortcuts prevention
    window.addEventListener('keydown', (e) => {
      const key = (e.key || '').toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      const alt = e.altKey;

      if (key === 'f12' || (ctrl && e.shiftKey && (key === 'i' || key === 'j' || key === 'c'))) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (ctrl && (key === 'r' || key === 'f5')) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (alt && key === 'tab') {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);
  }

  activate() {
    this.isActive = true;
    this.violationCount = 0;
    this.auditLog = [];
    this._updateStrikeDisplays();
    if (this.strikeBadge) this.strikeBadge.style.display = 'flex';

    if (window.api && window.api.setLockdownMode) {
      window.api.setLockdownMode({ enable: true, kiosk: false });
    }
  }

  deactivate() {
    this.isActive = false;
    if (this.violationModal) this.violationModal.classList.remove('active');
    if (this.lockdownScreen) this.lockdownScreen.classList.remove('active');
    if (this.strikeBadge) this.strikeBadge.style.display = 'none';

    if (window.api && window.api.setLockdownMode) {
      window.api.setLockdownMode({ enable: false });
    }
  }

  _handleBlurIncident(source, timestamp = null) {
    if (!this.isActive) return;

    const timeStr = timestamp || new Date().toISOString();
    this.violationCount++;

    const logEntry = {
      incident: 'WINDOW_BLUR',
      source,
      timestamp: timeStr,
      strike: this.violationCount
    };
    this.auditLog.push(logEntry);

    this._updateStrikeDisplays();

    if (this.onStrikeCallback) {
      this.onStrikeCallback(this.violationCount, logEntry);
    }

    // Show violation modal or trigger full lockdown
    if (this.violationCount >= this.maxStrikes) {
      this._triggerPermanentLockdown();
    } else {
      if (this.violationTimestamp) this.violationTimestamp.textContent = new Date().toLocaleTimeString();
      if (this.violationCurrentStrike) this.violationCurrentStrike.textContent = this.violationCount;
      if (this.violationModal) this.violationModal.classList.add('active');
    }
  }

  _triggerPermanentLockdown() {
    if (this.violationModal) this.violationModal.classList.remove('active');
    if (this.lockdownScreen) this.lockdownScreen.classList.add('active');
    if (this.lockdownPinInput) {
      this.lockdownPinInput.value = '';
      this.lockdownPinInput.focus();
    }
    if (this.lockdownErrorMsg) this.lockdownErrorMsg.style.display = 'none';

    if (this.onLockdownCallback) {
      this.onLockdownCallback();
    }

    if (window.api && window.api.setLockdownMode) {
      window.api.setLockdownMode({ enable: true, kiosk: true });
    }
  }

  _attemptUnlock() {
    const entered = this.lockdownPinInput.value.trim();
    if (entered === this.supervisorPin) {
      this.lockdownScreen.classList.remove('active');
      this.violationCount = 0; // reset strikes on supervisor override
      this._updateStrikeDisplays();
      this.auditLog.push({
        incident: 'SUPERVISOR_OVERRIDE_UNLOCK',
        timestamp: new Date().toISOString()
      });

      if (window.api && window.api.setLockdownMode) {
        window.api.setLockdownMode({ enable: true, kiosk: false });
      }
      window.focus();
    } else {
      if (this.lockdownErrorMsg) this.lockdownErrorMsg.style.display = 'block';
    }
  }

  _updateStrikeDisplays() {
    if (this.strikeCountNav) {
      this.strikeCountNav.textContent = `${this.violationCount}/${this.maxStrikes}`;
    }
    if (this.metricStrikeCount) {
      this.metricStrikeCount.textContent = `${this.violationCount} / ${this.maxStrikes}`;
    }
    if (this.strikeBadge) {
      if (this.violationCount > 0) {
        this.strikeBadge.classList.remove('clean');
      } else {
        this.strikeBadge.classList.add('clean');
      }
    }
  }

  verifySupervisorPin(pin) {
    return pin.trim() === this.supervisorPin;
  }

  getAuditData() {
    return {
      violationCount: this.violationCount,
      maxStrikes: this.maxStrikes,
      auditLog: [...this.auditLog]
    };
  }
}

window.antiCheatManager = new AntiCheatManager();
