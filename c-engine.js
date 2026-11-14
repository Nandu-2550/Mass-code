/**
 * c-engine.js - Universal In-Process C/C++ Execution Engine
 *
 * Runs ANSI C / C++ code completely within Node.js / Electron using JSCPP.
 * Bypasses Windows Device Guard / Smart App Control / WDAC policy blocks (Exit Code 4551)
 * because no native un-whitelisted PE binary (.exe) is spawned on disk.
 */

const JSCPP = require('JSCPP');

function normalizeSource(code) {
  if (typeof code !== 'string') return '';
  let src = code;

  // Auto-prepend standard headers if omitted by student
  let headers = '';
  if (!src.includes('<stdio.h>') && (src.includes('printf') || src.includes('scanf') || src.includes('puts') || src.includes('gets'))) {
    headers += '#include <stdio.h>\n';
  }
  if (!src.includes('<stdlib.h>') && (src.includes('malloc') || src.includes('free') || src.includes('abs(') || src.includes('exit('))) {
    headers += '#include <stdlib.h>\n';
  }
  if (!src.includes('<math.h>') && (src.includes('sqrt') || src.includes('pow') || src.includes('ceil') || src.includes('floor'))) {
    headers += '#include <math.h>\n';
  }
  if (!src.includes('<string.h>') && (src.includes('strlen') || src.includes('strcpy') || src.includes('strcmp') || src.includes('strcat'))) {
    headers += '#include <string.h>\n';
  }
  if (headers) {
    src = headers + src;
  }

  // Replace `int main(void)` or `void main(void)` with `int main()`
  src = src.replace(/(?:int|void)\s+main\s*\(\s*void\s*\)/g, 'int main()');
  // Strip Windows-specific non-standard headers that would fail in pure C parser
  src = src.replace(/#include\s*<conio\.h>/g, '// #include <conio.h>');
  src = src.replace(/#include\s*<windows\.h>/g, '// #include <windows.h>');
  return src;
}

/**
 * Execute C source code against an input string with timeout protection
 * @param {string} code - C source code
 * @param {string} input - Stdin input string
 * @param {number} timeoutMs - Timeout in milliseconds (default: 3000ms)
 * @returns {Promise<{ exitCode: number, stdout: string, stderr: string, timedOut: boolean, durationMs: number }>}
 */
async function executeC(code, input = '', timeoutMs = 3000) {
  return new Promise((resolve) => {
    const startTime = process.hrtime();
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const normalizedCode = normalizeSource(code);

    const config = {
      stdio: {
        write: (str) => {
          stdout += str;
        }
      },
      maxTimeout: timeoutMs
    };

    try {
      const exitCode = JSCPP.run(normalizedCode, input || '', config);
      const diff = process.hrtime(startTime);
      const durationMs = Math.round((diff[0] * 1e3 + diff[1] / 1e6) * 10) / 10;
      resolve({
        exitCode: exitCode !== undefined ? exitCode : 0,
        stdout,
        stderr: '',
        timedOut: false,
        durationMs
      });
    } catch (err) {
      const diff = process.hrtime(startTime);
      const durationMs = Math.round((diff[0] * 1e3 + diff[1] / 1e6) * 10) / 10;
      const msg = err && err.message ? err.message : String(err);
      if (msg.includes('Timeout') || msg.includes('timeout')) {
        timedOut = true;
      }
      resolve({
        exitCode: timedOut ? -1 : 1,
        stdout,
        stderr: msg,
        timedOut,
        durationMs
      });
    }
  });
}

module.exports = {
  executeC,
  normalizeSource
};
