/**
 * ============================================================================
 * CODEVAULT RUNTIME TERMINAL SANDBOX & COMPILER BRIDGE
 * - Monospace green-on-black terminal output formatting
 * - Streaming compilation logs & native GCC subprocess errors
 * - Test case execution rendering, TLE detection, and score calculation
 * ============================================================================
 */

class CompilerTerminalManager {
  constructor() {
    this.terminalOutput = document.getElementById('terminal-output');
    this.statusTitle = document.getElementById('terminal-status-title');
    this.wrapper = document.querySelector('.terminal-sandbox-wrapper');
    this.btnClear = document.getElementById('btn-term-clear');
    this.btnToggleSize = document.getElementById('btn-term-toggle-size');
    this.isExpanded = false;

    this._bindEvents();
    this._listenToIpcProgress();
  }

  _bindEvents() {
    if (this.btnClear) {
      this.btnClear.addEventListener('click', () => this.clear());
    }

    const secondaryClear = document.getElementById('btn-clear-terminal');
    if (secondaryClear) {
      secondaryClear.addEventListener('click', () => this.clear());
    }

    if (this.btnToggleSize) {
      this.btnToggleSize.addEventListener('click', () => {
        this.isExpanded = !this.isExpanded;
        if (this.wrapper) {
          if (this.isExpanded) {
            this.wrapper.style.height = '480px';
            this.btnToggleSize.textContent = 'Collapse';
          } else {
            this.wrapper.style.height = '260px';
            this.btnToggleSize.textContent = 'Expand';
          }
        }
      });
    }
  }

  _listenToIpcProgress() {
    if (window.api && window.api.onCompilerProgress) {
      window.api.onCompilerProgress((progress) => {
        if (progress.phase === 'compiling') {
          this.setStatus('COMPILING SOURCE CODE...');
          this.appendPromptLine(`$ ${progress.message}`);
        } else if (progress.phase === 'compiled') {
          this.appendSuccessLine(`[OK] ${progress.message}`);
        } else if (progress.phase === 'running_test') {
          this.setStatus(`RUNNING TESTS [${progress.index}/${progress.total}]...`);
          this.appendInfoLine(`  -> ${progress.message}`);
        }
      });
    }
  }

  setStatus(statusText) {
    if (this.statusTitle) {
      this.statusTitle.textContent = `TERMINAL RUNTIME SANDBOX // ${statusText.toUpperCase()}`;
    }
  }

  clear() {
    if (this.terminalOutput) {
      this.terminalOutput.innerHTML = '';
      this.appendInfoLine('[SANDBOX CLEARED]: Ready for next execution.');
    }
  }

  appendLine(htmlContent) {
    if (!this.terminalOutput) return;
    const div = document.createElement('div');
    div.innerHTML = htmlContent;
    this.terminalOutput.appendChild(div);
    this.terminalOutput.scrollTop = this.terminalOutput.scrollHeight;
  }

  appendPromptLine(text) {
    this.appendLine(`<span class="term-prompt">&gt;</span> <span class="term-cmd">${this._escape(text)}</span>`);
  }

  appendSuccessLine(text) {
    this.appendLine(`<span class="term-success">${this._escape(text)}</span>`);
  }

  appendErrorLine(text) {
    this.appendLine(`<span class="term-error">${this._escape(text)}</span>`);
  }

  appendWarningLine(text) {
    this.appendLine(`<span class="term-warning">${this._escape(text)}</span>`);
  }

  appendInfoLine(text) {
    this.appendLine(`<span class="term-info">${this._escape(text)}</span>`);
  }

  _escape(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /**
   * Invokes native compilation via IPC and renders full evaluation stream.
   */
  async runEvaluation({ code, language = 'c', testCases = [], timeoutMs = 2500, maxPoints = 100 }) {
    this.setStatus('STARTING RUNTIME EVALUATION...');
    this.appendPromptLine(`$ gcc -O2 temp.${language} -o temp.exe`);

    if (!window.api || !window.api.compileAndEvaluate) {
      this.appendErrorLine('[ERROR]: Native compiler bridge API is unavailable.');
      return { success: false };
    }

    const result = await window.api.compileAndEvaluate({
      code,
      language,
      testCases,
      timeoutMs,
      maxPoints
    });

    if (!result.success && result.phase === 'compilation') {
      this.setStatus('COMPILATION FAILED');
      this.appendErrorLine('\n[BUILD FAILED]: Standard compiler error diagnostics:');
      this.appendErrorLine(result.compilerError);
      return result;
    }

    // Evaluation stream rendering
    this.setStatus('EVALUATION COMPLETE');
    this.appendSuccessLine('\n======================================================');
    this.appendSuccessLine(`TEST EXECUTION SUMMARY: ${result.passedCount}/${result.totalCount} TEST CASES PASSED`);
    this.appendSuccessLine(`TOTAL PROBLEM SCORE: ${result.totalScore} / ${result.maxScore} PTS`);
    this.appendSuccessLine(`TOTAL CPU TIME: ${result.totalExecutionTimeMs} ms`);
    this.appendSuccessLine('======================================================\n');

    for (const tc of result.testResults) {
      const typeLabel = tc.isSample ? '[SAMPLE]' : '[HIDDEN]';
      if (tc.passed) {
        this.appendSuccessLine(`✔ Test Case #${tc.index} ${typeLabel}: PASSED (${tc.executionTimeMs}ms)`);
      } else if (tc.timedOut) {
        this.appendErrorLine(`✖ Test Case #${tc.index} ${typeLabel}: TIME LIMIT EXCEEDED (> ${timeoutMs}ms)`);
      } else if (tc.crashed) {
        this.appendErrorLine(`✖ Test Case #${tc.index} ${typeLabel}: RUNTIME ERROR / SEGMENTATION CRASH (Exit Code: ${tc.exitCode})`);
      } else {
        this.appendErrorLine(`✖ Test Case #${tc.index} ${typeLabel}: FAILED - WRONG ANSWER (${tc.executionTimeMs}ms)`);
      }

      // If sample test case failed, display expected vs actual diff
      if (tc.isSample && !tc.passed) {
        this.appendInfoLine(`    Input:    "${this._escape(tc.input.trim())}"`);
        this.appendInfoLine(`    Expected: "${this._escape(tc.expectedOutput.trim())}"`);
        this.appendInfoLine(`    Actual:   "${this._escape(tc.actualOutput.trim())}"`);
      }
    }

    return result;
  }
}

window.compilerTerminal = new CompilerTerminalManager();
