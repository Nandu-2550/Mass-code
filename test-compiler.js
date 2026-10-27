const compiler = require('./compiler-engine');

async function test() {
  console.log('Testing GCC Compiler Engine Integration...');
  const gccInfo = await compiler.checkGcc();
  console.log('GCC Info:', gccInfo);

  if (!gccInfo.available) {
    console.error('GCC is not available!');
    process.exit(1);
  }

  // Sample C program calculating sum of numbers from stdin
  const sampleCode = `
#include <stdio.h>

int main() {
    int a, b;
    if (scanf("%d %d", &a, &b) == 2) {
        printf("%d\\n", a + b);
    }
    return 0;
}
  `;

  const testCases = [
    { id: 1, isSample: true, input: '10 20\n', expectedOutput: '30\n' },
    { id: 2, isSample: false, input: '100 -50\n', expectedOutput: '50\n' },
    { id: 3, isSample: false, input: '0 0\n', expectedOutput: '0\n' }
  ];

  console.log('Running test evaluation...');
  const result = await compiler.compileAndEvaluate({
    code: sampleCode,
    language: 'c',
    testCases,
    timeoutMs: 2000,
    maxPoints: 50
  }, (progress) => {
    console.log('Progress:', progress.phase, progress.message);
  });

  console.log('\n--- EVALUATION SUMMARY ---');
  console.log('Success:', result.success);
  console.log(`Passed: ${result.passedCount}/${result.totalCount}`);
  console.log(`Total Score: ${result.totalScore}/${result.maxScore}`);
  console.log(`Execution Time: ${result.totalExecutionTimeMs}ms`);
  console.log('Test Results:', JSON.stringify(result.testResults, null, 2));

  if (result.passedCount === 3 && result.totalScore === 50) {
    console.log('\n>>> COMPILER ENGINE INTEGRATION VERIFIED 100% SUCCEEDED! <<<');
  } else {
    console.error('Test did not pass as expected.');
  }
}

test().catch(console.error);
