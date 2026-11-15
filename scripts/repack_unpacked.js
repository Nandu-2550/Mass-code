const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

async function updateUnpackedAsar() {
  const sourceRoot = path.resolve(__dirname, '..');
  const destAsar = path.join(sourceRoot, 'dist', 'win-unpacked', 'resources', 'app.asar');
  const tempStage = path.join(os.tmpdir(), `temp_stage_asar_${Date.now()}`);
  const asarBin = path.join(sourceRoot, 'node_modules', '.bin', 'asar.cmd');

  if (!fs.existsSync(path.dirname(destAsar))) {
    console.log('win-unpacked resources directory not found yet:', destAsar);
    return;
  }

  if (fs.existsSync(tempStage)) {
    fs.rmSync(tempStage, { recursive: true, force: true });
  }
  fs.mkdirSync(tempStage, { recursive: true });

  const filesToCopy = [
    'main.js',
    'preload.js',
    'renderer.js',
    'c-engine.js',
    'pdf-polyfill.js',
    'index.html',
    'styles.css',
    'package.json'
  ];

  for (const f of filesToCopy) {
    const src = path.join(sourceRoot, f);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(tempStage, f));
      console.log('Copied:', f);
    }
  }

  // Copy contests directory if exists
  const contestsSrc = path.join(sourceRoot, 'contests');
  if (fs.existsSync(contestsSrc)) {
    fs.cpSync(contestsSrc, path.join(tempStage, 'contests'), { recursive: true });
    console.log('Copied contests directory');
  }

  // Copy assets directory if exists
  const assetsSrc = path.join(sourceRoot, 'assets');
  if (fs.existsSync(assetsSrc)) {
    fs.cpSync(assetsSrc, path.join(tempStage, 'assets'), { recursive: true });
    console.log('Copied assets directory');
  }

  // Copy runtime node_modules needed in app.asar for offline PDF parsing and in-process C runtime
  const runtimeModules = ['pdf-parse', 'pdfjs-dist', 'JSCPP', 'lodash', 'pegjs-util', 'printf'];
  const stageNodeModules = path.join(tempStage, 'node_modules');
  fs.mkdirSync(stageNodeModules, { recursive: true });
  for (const mod of runtimeModules) {
    const modSrc = path.join(sourceRoot, 'node_modules', mod);
    if (fs.existsSync(modSrc)) {
      fs.cpSync(modSrc, path.join(stageNodeModules, mod), { recursive: true });
      console.log('Copied node_module:', mod);
    }
  }

  console.log('Packing asar from:', tempStage, 'into:', destAsar);
  execFileSync(asarBin, ['pack', tempStage, destAsar], { stdio: 'inherit', shell: true, windowsHide: true });
  console.log('Successfully updated app.asar!');

  fs.rmSync(tempStage, { recursive: true, force: true });
  console.log('Done.');
}

updateUnpackedAsar().catch(err => {
  console.error('Failed to update asar:', err);
  process.exit(1);
});

