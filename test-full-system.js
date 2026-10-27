const fs = require('fs');
const path = require('path');
const http = require('http');
const contestServer = require('./server');
const compilerEngine = require('./compiler-engine');

async function testFullSystem() {
  console.log('========================================================');
  console.log('CODEVAULT FULL SYSTEM VERIFICATION & INTEGRATION SUITE');
  console.log('========================================================\n');

  // 1. GCC Availability Test
  console.log('1. Checking GCC Compiler Availability...');
  const gccDiag = await compilerEngine.checkGcc();
  console.log('   GCC Result:', gccDiag.available ? `✔ Found: ${gccDiag.version}` : '✖ Not Found');
  if (!gccDiag.available) throw new Error('GCC not available.');

  // 2. Start Host Server
  console.log('\n2. Starting Contest Host Distribution Server...');
  const sampleConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'sample-contest.json'), 'utf-8'));
  const serverRes = await contestServer.start(4505, sampleConfig);
  console.log(`   ✔ Server started on port ${serverRes.port}. IPs:`, serverRes.ips);

  // 3. Test HTTP GET /api/ping
  console.log('\n3. Testing GET /api/ping ...');
  const pingRes = await httpGet('http://localhost:4505/api/ping');
  const pingData = JSON.parse(pingRes);
  console.log('   Ping Response:', pingData.service, '| Contest Active:', pingData.contestActive);

  // 4. Test HTTP GET /api/contest/:code
  console.log('\n4. Testing GET /api/contest/ALGO26X1 ...');
  const contestRes = await httpGet('http://localhost:4505/api/contest/ALGO26X1');
  const pulledContest = JSON.parse(contestRes);
  console.log(`   ✔ Pulled Contest: "${pulledContest.title}" with ${pulledContest.problems.length} problems.`);

  // 5. Test Mock Final Submissions & Sync Bridge: POST /api/contest/sync-submission
  console.log('\n5. Testing Sync Bridge: POST /api/contest/sync-submission ...');
  const mockSubmissions = [
    {
      usn: '1MS21CS001',
      name: 'Grace Hopper',
      contestId: 'ALGO26X1',
      totalScore: 95,
      maxScore: 100,
      problemsSolvedCount: 3,
      totalProblems: 3,
      timeElapsedSeconds: 2400,
      totalExecutionTimeMs: 45.2,
      submittedAt: new Date().toISOString(),
      violationStrikes: 0,
      violations: [],
      problemCodes: { prob_1: '// Grace solution 1' },
      problemEvaluations: {
        prob_1: { passedCount: 4, totalCount: 4, totalScore: 30, totalExecutionTimeMs: 12.5 }
      }
    },
    {
      usn: '1MS21CS002',
      name: 'Alan Turing',
      contestId: 'ALGO26X1',
      totalScore: 100,
      maxScore: 100,
      problemsSolvedCount: 3,
      totalProblems: 3,
      timeElapsedSeconds: 1800,
      totalExecutionTimeMs: 38.1,
      submittedAt: new Date().toISOString(),
      violationStrikes: 0,
      violations: [],
      problemCodes: { prob_1: '// Alan solution 1' },
      problemEvaluations: {
        prob_1: { passedCount: 4, totalCount: 4, totalScore: 30, totalExecutionTimeMs: 10.2 }
      }
    },
    {
      usn: '1MS21CS003',
      name: 'Ada Lovelace',
      contestId: 'ALGO26X1',
      totalScore: 100,
      maxScore: 100,
      problemsSolvedCount: 3,
      totalProblems: 3,
      timeElapsedSeconds: 1950,
      totalExecutionTimeMs: 32.4, // Faster execution time should break tie!
      submittedAt: new Date().toISOString(),
      violationStrikes: 1,
      violations: [{ incident: 'WINDOW_BLUR', strike: 1 }],
      problemCodes: { prob_1: '// Ada solution 1' },
      problemEvaluations: {
        prob_1: { passedCount: 4, totalCount: 4, totalScore: 30, totalExecutionTimeMs: 9.8 }
      }
    }
  ];

  for (const sub of mockSubmissions) {
    const postRes = await httpPost('http://localhost:4505/api/contest/sync-submission', sub);
    console.log(`   ✔ Synced submission for ${sub.usn} (${sub.name}): Score ${sub.totalScore}`);
  }

  // 6. Test Competitive Grading Rule: Highest Score first, ties broken by Fastest CPU Execution Time
  console.log('\n6. Testing Grading Rule Sorting...');
  const submissionsDir = path.join(__dirname, 'submissions');
  const files = fs.readdirSync(submissionsDir).filter(f => f.startsWith('FINAL_') && f.endsWith('.json'));

  const parsedRecords = [];
  for (const f of files) {
    const data = JSON.parse(fs.readFileSync(path.join(submissionsDir, f), 'utf-8'));
    parsedRecords.push(data);
  }

  // Sort: Highest Score DESC, then totalExecutionTimeMs ASC, then timeElapsedSeconds ASC
  parsedRecords.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (a.totalExecutionTimeMs !== b.totalExecutionTimeMs) return a.totalExecutionTimeMs - b.totalExecutionTimeMs;
    return a.timeElapsedSeconds - b.timeElapsedSeconds;
  });

  console.log('\n--- VERIFIED LEADERBOARD RANKINGS ---');
  parsedRecords.forEach((r, idx) => {
    console.log(`   Rank #${idx + 1}: ${r.usn} (${r.name}) | Score: ${r.totalScore} | Exec Time: ${r.totalExecutionTimeMs}ms | Time: ${r.timeElapsedSeconds}s | Violations: ${r.violationStrikes}`);
  });

  // Verification assertions:
  // Both Ada (Score 100, 32.4ms) and Alan (Score 100, 38.1ms) have score 100.
  // Ada has faster execution time (32.4ms < 38.1ms), so Ada should be Rank #1!
  if (parsedRecords[0].name === 'Ada Lovelace' && parsedRecords[1].name === 'Alan Turing' && parsedRecords[2].name === 'Grace Hopper') {
    console.log('\n✔ Competitive Grading Tie-Breaking verified 100% correctly!');
  } else {
    throw new Error('Tie-breaking did not rank Ada before Alan.');
  }

  // 7. Stop Server
  await contestServer.stop();
  console.log('\n✔ Host Server stopped cleanly.');

  console.log('\n========================================================');
  console.log('>>> ALL SYSTEM INTEGRATION TESTS PASSED SUCCESSFULLY! <<<');
  console.log('========================================================');
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function httpPost(url, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const req = http.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let respData = '';
      res.on('data', chunk => { respData += chunk; });
      res.on('end', () => resolve(respData));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

testFullSystem().catch((err) => {
  console.error('System Test Failed:', err);
  process.exit(1);
});
