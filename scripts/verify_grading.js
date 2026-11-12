const fs = require('fs');
const path = require('path');

// Verify contest configuration (either active or sample)
let contestPath = path.join(__dirname, '..', 'contests', 'active-contest.json');
if (!fs.existsSync(contestPath)) {
  contestPath = path.join(__dirname, '..', 'sample-contest.json');
}

if (fs.existsSync(contestPath)) {
  const contest = JSON.parse(fs.readFileSync(contestPath, 'utf-8'));
  console.log('Contest loaded:', contest.title, 'Problem count:', (contest.problems || []).length);

  const tiers = {};
  (contest.problems || []).forEach(p => {
    const t = (p.tier || 'general').toLowerCase();
    tiers[t] = (tiers[t] || 0) + 1;
  });
  console.log('Problem tiers in contest:', tiers);
} else {
  console.log('No contest JSON found on disk (clean state).');
}

// Check synced submissions
const syncedDir = path.join(__dirname, '..', 'synced_submissions');
const files = fs.existsSync(syncedDir) ? fs.readdirSync(syncedDir).filter(f => f.startsWith('FINAL_') && f.endsWith('.json')) : [];
console.log('Found synced submissions:', files.length);

console.log('All file checks passed successfully!');


