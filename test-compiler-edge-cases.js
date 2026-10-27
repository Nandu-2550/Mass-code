const compiler = require('./compiler-engine');

async function testEdgeCases() {
  console.log('Testing Edge Cases: Infinite loop (TLE) and Syntax Error...');

  // 1. Syntax Error
  const syntaxErrorCode = `
#include <stdio.h>
int main() {
    this_is_an_invalid_c_statement;
    return 0;
}
  `;
  const syntaxResult = await compiler.compileAndEvaluate({
    code: syntaxErrorCode,
    language: 'c',
    testCases: [{ id: 1, input: '', expectedOutput: '' }]
  });
  console.log('Syntax Error handled gracefully:', !syntaxResult.success && syntaxResult.phase === 'compilation');

  // 2. TLE
  const infiniteLoopCode = `
#include <stdio.h>
int main() {
    while(1) {
        // infinite loop
    }
    return 0;
}
  `;
  const tleResult = await compiler.compileAndEvaluate({
    code: infiniteLoopCode,
    language: 'c',
    testCases: [{ id: 1, isSample: true, input: '', expectedOutput: 'hello' }],
    timeoutMs: 1500
  });
  console.log('TLE handled gracefully:', tleResult.testResults[0].timedOut === true);

  if (!syntaxResult.success && tleResult.testResults[0].timedOut) {
    console.log('>>> EDGE CASES VERIFIED SUCCESSFULLY! <<<');
  }
}

testEdgeCases().catch(console.error);
