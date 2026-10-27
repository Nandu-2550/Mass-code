const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class CompilerEngine {
  constructor() {
    this.tempDir = path.join(__dirname, 'temp');
    this._ensureTempDir();
  }

  _ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Checks whether gcc is available in system PATH.
   */
  async checkGcc() {
    return new Promise((resolve) => {
      exec('gcc --version', (err, stdout, stderr) => {
        if (err) {
          resolve({ available: false, version: null, error: err.message });
        } else {
          const firstLine = stdout.split('\n')[0].trim();
          resolve({ available: true, version: firstLine, raw: stdout });
        }
      });
    });
  }

  /**
   * Compiles and evaluates C/C++ code against an array of test cases.
   *
   * @param {Object} options
   * @param {string} options.code - C source code
   * @param {string} [options.language='c'] - 'c' or 'cpp'
   * @param {Array<{id: string|number, input: string, expectedOutput: string, isSample: boolean}>} options.testCases
   * @param {number} [options.timeoutMs=2500] - Execution timeout per test case in ms
   * @param {number} [options.maxPoints=100] - Total points for this problem
   * @param {Function} [onProgress] - Optional callback for live streaming progress
   */
  async compileAndEvaluate({ code, language = 'c', testCases = [], timeoutMs = 2500, maxPoints = 100 }, onProgress = null) {
    this._ensureTempDir();
    const sessionId = `eval_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const ext = language === 'cpp' ? 'cpp' : 'c';
    const sourcePath = path.join(this.tempDir, `${sessionId}.${ext}`);
    const binaryPath = path.join(this.tempDir, `${sessionId}.exe`);

    // Write source code to disk
    fs.writeFileSync(sourcePath, code, 'utf-8');

    // Step 1: Compilation Phase
    const compilerCmd = language === 'cpp' ? 'g++' : 'gcc';
    const compileArgs = [sourcePath, '-o', binaryPath, '-O2'];

    if (onProgress) {
      onProgress({ phase: 'compiling', message: `Invoking native compiler: ${compilerCmd} ${path.basename(sourcePath)} -o ${path.basename(binaryPath)} -O2` });
    }

    const compileResult = await this._runCompilation(compilerCmd, compileArgs);
    if (!compileResult.success) {
      this._cleanupFiles([sourcePath]);
      return {
        success: false,
        phase: 'compilation',
        compilerError: compileResult.stderr || compileResult.error || 'Compilation failed with unknown error.',
        compilerOutput: compileResult.stdout || '',
        testResults: [],
        totalScore: 0,
        maxScore: maxPoints,
        passedCount: 0,
        totalCount: testCases.length
      };
    }

    if (onProgress) {
      onProgress({ phase: 'compiled', message: 'Build successful. Initializing test evaluation stream...' });
    }

    // Windows file-system sync grace period to ensure binary handle is released by linker
    await new Promise(r => setTimeout(r, 100));

    // Step 2: Evaluation Stream Phase
    const testResults = [];
    let passedCount = 0;
    let totalExecTimeMs = 0;

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      if (onProgress) {
        onProgress({
          phase: 'running_test',
          index: i + 1,
          total: testCases.length,
          isSample: !!tc.isSample,
          message: `Evaluating Test Case #${i + 1}${tc.isSample ? ' (Sample)' : ' (Hidden)'}...`
        });
      }

      const evalResult = await this._runBinaryWithStdin(binaryPath, tc.input || '', timeoutMs);
      totalExecTimeMs += evalResult.executionTimeMs;

      // Normalization of output for accurate competitive grading
      const normalizedActual = this._normalizeString(evalResult.stdout);
      const normalizedExpected = this._normalizeString(tc.expectedOutput || '');
      const isPassed = !evalResult.timedOut && !evalResult.crashed && normalizedActual === normalizedExpected;

      if (isPassed) {
        passedCount++;
      }

      testResults.push({
        index: i + 1,
        id: tc.id || `tc_${i + 1}`,
        isSample: !!tc.isSample,
        passed: isPassed,
        timedOut: evalResult.timedOut,
        crashed: evalResult.crashed,
        exitCode: evalResult.exitCode,
        executionTimeMs: evalResult.executionTimeMs,
        // For sample test cases, provide full visual diff. For hidden test cases, obscure actual output
        input: tc.isSample ? tc.input : '[HIDDEN PARAMETERS]',
        expectedOutput: tc.isSample ? tc.expectedOutput : '[HIDDEN]',
        actualOutput: tc.isSample ? evalResult.stdout : (isPassed ? '[CORRECT]' : '[INCORRECT MATCH]'),
        stderr: evalResult.stderr || ''
      });
    }

    // Clean up compiled binary and source file
    this._cleanupFiles([sourcePath, binaryPath]);

    const earnedScore = testCases.length > 0
      ? Math.round((passedCount / testCases.length) * maxPoints * 100) / 100
      : 0;

    return {
      success: true,
      phase: 'evaluated',
      compilerOutput: compileResult.stdout || 'Compilation succeeded with 0 warnings.',
      testResults,
      totalScore: earnedScore,
      maxScore: maxPoints,
      passedCount,
      totalCount: testCases.length,
      totalExecutionTimeMs: Math.round(totalExecTimeMs * 100) / 100
    };
  }

  _runCompilation(cmd, args) {
    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';

      const proc = spawn(cmd, args, { windowsHide: true });

      proc.stdout.on('data', (d) => { stdout += d.toString(); });
      proc.stderr.on('data', (d) => { stderr += d.toString(); });

      proc.on('close', (code) => {
        resolve({
          success: code === 0,
          code,
          stdout,
          stderr
        });
      });

      proc.on('error', (err) => {
        resolve({
          success: false,
          error: err.message,
          stdout,
          stderr
        });
      });
    });
  }

  _runBinaryWithStdin(binaryPath, inputData, timeoutMs) {
    return new Promise(async (resolve) => {
      const startTime = process.hrtime();
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let killed = false;

      let proc = null;
      let spawnAttempts = 0;
      const maxSpawnAttempts = 4;

      while (spawnAttempts < maxSpawnAttempts) {
        spawnAttempts++;
        try {
          proc = spawn(binaryPath, [], {
            cwd: path.dirname(binaryPath),
            windowsHide: true
          });
          break;
        } catch (spawnErr) {
          if (spawnAttempts >= maxSpawnAttempts) {
            return resolve({
              exitCode: -1,
              stdout: '',
              stderr: `Process spawn failure: ${spawnErr.message}`,
              timedOut: false,
              crashed: true,
              executionTimeMs: 0
            });
          }
          await new Promise(r => setTimeout(r, 80));
        }
      }

      if (!proc) {
        return resolve({
          exitCode: -1,
          stdout: '',
          stderr: 'Unable to spawn process.',
          timedOut: false,
          crashed: true,
          executionTimeMs: 0
        });
      }

      const timer = setTimeout(() => {
        timedOut = true;
        killed = true;
        try {
          proc.kill('SIGKILL');
        } catch (_) {}
      }, timeoutMs);

      proc.stdout.on('data', (d) => { stdout += d.toString(); });
      proc.stderr.on('data', (d) => { stderr += d.toString(); });

      proc.on('close', (code) => {
        clearTimeout(timer);
        const diff = process.hrtime(startTime);
        const executionTimeMs = (diff[0] * 1e3) + (diff[1] / 1e6);

        resolve({
          exitCode: code,
          stdout,
          stderr,
          timedOut,
          crashed: code !== 0 && !timedOut,
          executionTimeMs: Math.round(executionTimeMs * 10) / 10
        });
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
        resolve({
          exitCode: -1,
          stdout,
          stderr: err.message,
          timedOut: false,
          crashed: true,
          executionTimeMs: 0
        });
      });

      // Write stdin and close stream
      try {
        if (inputData) {
          proc.stdin.write(inputData);
        }
        proc.stdin.end();
      } catch (err) {
        stderr += `\n[STDIN ERROR]: ${err.message}`;
      }
    });
  }

  _normalizeString(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .map(line => line.trimEnd())
      .join('\n')
      .trim();
  }

  _cleanupFiles(fileList) {
    for (const f of fileList) {
      try {
        if (fs.existsSync(f)) {
          fs.unlinkSync(f);
        }
      } catch (_) {
        // Ignored if file locked temporarily by OS; OS will release in temp
      }
    }
  }
}

module.exports = new CompilerEngine();
