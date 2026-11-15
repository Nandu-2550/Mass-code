const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

async function bundle() {
  const root = path.resolve(__dirname, '..');
  const electronDist = path.join(root, 'node_modules', 'electron', 'dist');
  const unpackedDir = path.join(root, 'dist', 'win-unpacked');
  const resourcesDir = path.join(unpackedDir, 'resources');

  console.log('================================================================');
  console.log('     MASS-CODE (GECM) - PRODUCTION APPLICATION BUNDLER');
  console.log('================================================================\n');

  // Step 1: Ensure unpacked app.asar is packaged
  console.log('[1/4] Packaging app.asar with latest code and assets...');
  require('./repack_unpacked.js');

  if (!fs.existsSync(unpackedDir)) {
    fs.mkdirSync(unpackedDir, { recursive: true });
  }

  // Step 2: Copy Electron binaries into dist/win-unpacked
  console.log('\n[2/4] Assembling standalone Electron runtime in dist/win-unpacked...');
  const entries = fs.readdirSync(electronDist);

  for (const entry of entries) {
    if (entry === 'resources') {
      // Do not overwrite resources directory containing app.asar
      continue;
    }
    const src = path.join(electronDist, entry);
    const stat = fs.statSync(src);

    if (stat.isDirectory()) {
      const dest = path.join(unpackedDir, entry);
      if (!fs.existsSync(dest)) {
        fs.cpSync(src, dest, { recursive: true });
        console.log(`  + Copied directory: ${entry}`);
      } else {
        console.log(`  = Directory exists: ${entry}`);
      }
    } else if (entry === 'electron.exe') {
      const dest = path.join(unpackedDir, 'Mass-Code (GECM).exe');
      if (!fs.existsSync(dest) || fs.statSync(dest).size !== stat.size) {
        try {
          fs.copyFileSync(src, dest);
          console.log(`  + Created executable: Mass-Code (GECM).exe`);
        } catch (e) {
          console.log(`  = In use (skipped overwrite): Mass-Code (GECM).exe`);
        }
      } else {
        console.log(`  = Up-to-date: Mass-Code (GECM).exe`);
      }
    } else {
      const dest = path.join(unpackedDir, entry);
      if (!fs.existsSync(dest) || fs.statSync(dest).size !== stat.size) {
        try {
          fs.copyFileSync(src, dest);
          console.log(`  + Copied binary: ${entry}`);
        } catch (e) {
          console.log(`  = In use (skipped overwrite): ${entry}`);
        }
      } else {
        console.log(`  = Up-to-date: ${entry}`);
      }
    }
  }

  // Step 3: Verify the bundled distribution
  console.log('\n[3/4] Verifying standalone package integrity...');
  const exePath = path.join(unpackedDir, 'Mass-Code (GECM).exe');
  const asarPath = path.join(resourcesDir, 'app.asar');

  if (!fs.existsSync(exePath)) {
    throw new Error('Verification failed: Mass-Code (GECM).exe missing!');
  }
  if (!fs.existsSync(asarPath)) {
    throw new Error('Verification failed: resources/app.asar missing!');
  }

  const exeSize = (fs.statSync(exePath).size / 1024 / 1024).toFixed(2);
  const asarSize = (fs.statSync(asarPath).size / 1024 / 1024).toFixed(2);
  console.log(`  ✓ Mass-Code (GECM).exe: ${exeSize} MB`);
  console.log(`  ✓ resources/app.asar:    ${asarSize} MB`);

  // Step 4: Create a root launcher shortcut / runner in dist
  console.log('\n[4/4] Creating launcher scripts in dist folder...');
  const launcherBat = `@echo off
title Mass-Code (GECM)
cd /d "%~dp0win-unpacked"
start "" "Mass-Code (GECM).exe" %*
`;
  fs.writeFileSync(path.join(root, 'dist', 'Launch-Mass-Code.bat'), launcherBat, 'utf8');
  console.log('  ✓ Created dist/Launch-Mass-Code.bat');

  console.log('\n================================================================');
  console.log('  SUCCESS: APPLICATION BUNDLED SUCCESSFULLY!');
  console.log('================================================================');
  console.log('Standalone application path:');
  console.log(`  ${unpackedDir}\\Mass-Code (GECM).exe\n`);
  console.log('You can run Mass-Code (GECM).exe directly without needing Node.js or any install!');
}

bundle().catch(err => {
  console.error('\n[BUNDLE ERROR]:', err);
  process.exit(1);
});
