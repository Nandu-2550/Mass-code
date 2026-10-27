/**
 * ============================================================================
 * CODEVAULT MONOSPACE CODE EDITOR
 * - Line numbers gutter synchronization
 * - 4-space tab indentation & auto-closing brackets
 * - Strict clipboard lockdown: Ctrl+C, Ctrl+V, right-click, and drag/drop blocking
 * ============================================================================
 */

class CodeEditor {
  constructor() {
    this.textarea = document.getElementById('code-editor-textarea');
    this.lineNumbers = document.getElementById('editor-line-numbers');
    this.warningToast = document.getElementById('clipboard-warning-toast');
    this.changeListeners = [];
    this.clipboardWarningTimeout = null;

    this._bindEvents();
    this.updateLineNumbers();
  }

  _bindEvents() {
    if (!this.textarea) return;

    // Line number updates and auto-indent handling
    this.textarea.addEventListener('input', () => {
      this.updateLineNumbers();
      this._notifyChange();
    });

    // Synchronize scroll between textarea and line gutter
    this.textarea.addEventListener('scroll', () => {
      if (this.lineNumbers) {
        this.lineNumbers.scrollTop = this.textarea.scrollTop;
      }
    });

    // Keyboard handlers: Tab interception, bracket auto-completion, clipboard shortcut blocking
    this.textarea.addEventListener('keydown', (e) => {
      const key = e.key;
      const ctrl = e.ctrlKey || e.metaKey;

      // STRICT CLIPBOARD INTERCEPTION: Block Ctrl+C, Ctrl+V, Ctrl+X
      if (ctrl && (key === 'c' || key === 'v' || key === 'x' || key === 'C' || key === 'V' || key === 'X')) {
        e.preventDefault();
        e.stopPropagation();
        this.showClipboardBlockedWarning('KEYBOARD CLIPBOARD SHORTCUT BLOCKED');
        return;
      }

      // Block Shift+Insert (Paste) and Ctrl+Insert (Copy)
      if ((e.shiftKey && key === 'Insert') || (ctrl && key === 'Insert')) {
        e.preventDefault();
        e.stopPropagation();
        this.showClipboardBlockedWarning('INSERT CLIPBOARD ACTION BLOCKED');
        return;
      }

      // TAB Interception: Insert 4 spaces instead of losing focus
      if (key === 'Tab') {
        e.preventDefault();
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        const value = this.textarea.value;

        if (e.shiftKey) {
          // Unindent (Shift+Tab)
          // Simple unindent: remove up to 4 spaces before cursor
          if (start > 0 && value.substring(start - 4, start) === '    ') {
            this.textarea.value = value.substring(0, start - 4) + value.substring(end);
            this.textarea.selectionStart = this.textarea.selectionEnd = start - 4;
          }
        } else {
          // Indent 4 spaces
          this.textarea.value = value.substring(0, start) + '    ' + value.substring(end);
          this.textarea.selectionStart = this.textarea.selectionEnd = start + 4;
        }

        this.updateLineNumbers();
        this._notifyChange();
        return;
      }

      // Enter key: Auto-indentation based on previous line
      if (key === 'Enter') {
        const start = this.textarea.selectionStart;
        const value = this.textarea.value;
        const lines = value.substring(0, start).split('\n');
        const currentLine = lines[lines.length - 1];
        const match = currentLine.match(/^(\s+)/);
        const indent = match ? match[1] : '';

        // If line ends with '{', increase indent
        let extraIndent = '';
        if (currentLine.trim().endsWith('{')) {
          extraIndent = '    ';
        }

        e.preventDefault();
        const insertion = '\n' + indent + extraIndent;
        this.textarea.value = value.substring(0, start) + insertion + value.substring(this.textarea.selectionEnd);
        this.textarea.selectionStart = this.textarea.selectionEnd = start + insertion.length;

        this.updateLineNumbers();
        this._notifyChange();
        return;
      }

      // Auto-closing pairs: (), [], {}, "", ''
      const pairs = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'" };
      if (pairs[key]) {
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        const value = this.textarea.value;

        // If something is selected, wrap it
        if (start !== end) {
          e.preventDefault();
          const selectedText = value.substring(start, end);
          this.textarea.value = value.substring(0, start) + key + selectedText + pairs[key] + value.substring(end);
          this.textarea.selectionStart = start + 1;
          this.textarea.selectionEnd = end + 1;
          this._notifyChange();
        }
      }
    });

    // STRICT DOM CLIPBOARD EVENT LISTENERS
    ['copy', 'cut', 'paste', 'beforecopy', 'beforecut', 'beforepaste'].forEach(evt => {
      this.textarea.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.showClipboardBlockedWarning(`CLIPBOARD ${evt.toUpperCase()} INTERCEPTED & BLOCKED`);
        return false;
      });
    });

    // Disable Right-Click Context Menu on Editor
    this.textarea.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.showClipboardBlockedWarning('CONTEXT MENU DISABLED');
      return false;
    });

    // Disable Drag and Drop into Editor
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
      this.textarea.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (evt === 'drop') {
          this.showClipboardBlockedWarning('DRAG & DROP IMPORT BLOCKED');
        }
        return false;
      });
    });
  }

  showClipboardBlockedWarning(msg = 'CLIPBOARD ACTION BLOCKED') {
    if (!this.warningToast) return;
    this.warningToast.textContent = `⚠ ${msg}`;
    this.warningToast.style.display = 'flex';

    if (this.clipboardWarningTimeout) {
      clearTimeout(this.clipboardWarningTimeout);
    }
    this.clipboardWarningTimeout = setTimeout(() => {
      if (this.warningToast) this.warningToast.style.display = 'none';
    }, 2200);
  }

  updateLineNumbers() {
    if (!this.textarea || !this.lineNumbers) return;
    const lines = this.textarea.value.split('\n');
    const count = Math.max(lines.length, 1);
    let nums = '';
    for (let i = 1; i <= count; i++) {
      nums += i + '\n';
    }
    this.lineNumbers.textContent = nums;
  }

  getCode() {
    return this.textarea ? this.textarea.value : '';
  }

  setCode(code) {
    if (this.textarea) {
      this.textarea.value = code || '';
      this.updateLineNumbers();
      this._notifyChange();
    }
  }

  onChange(callback) {
    this.changeListeners.push(callback);
  }

  _notifyChange() {
    const code = this.getCode();
    for (const cb of this.changeListeners) {
      cb(code);
    }
  }
}

window.codeEditor = new CodeEditor();
