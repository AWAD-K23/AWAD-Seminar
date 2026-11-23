// From a fresh clone: node scripts/setup-and-measure.js
// Uses only Node built-ins until the project dependencies have been installed.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const npmVersion = '12.2.2';
let npmCli = path.join(root, '.npm-tools', 'node_modules', 'npm', 'bin', 'npm-cli.js');
const cache = path.join(root, '.npm-cache');

// npm.cmd lives beside node_modules/npm on Windows; Unix npm is normally a
// symlink to npm-cli.js. Check the actual CLI version before reusing it.
function findInstalledNpm() {
  const candidates = [process.env.npm_execpath];
  for (const directory of [path.dirname(process.execPath), ...(process.env.PATH || '').split(path.delimiter)]) {
    if (!directory) continue;
    const cleanDirectory = directory.replace(/^"|"$/g, '');
    const candidate = process.platform === 'win32'
      ? path.join(cleanDirectory, 'node_modules', 'npm', 'bin', 'npm-cli.js')
      : path.join(cleanDirectory, 'npm');
    if (fs.existsSync(candidate)) candidates.push(fs.realpathSync(candidate));
  }
  for (const candidate of new Set(candidates.filter(Boolean))) {
    const result = spawnSync(process.execPath, [candidate, '--version'], { encoding: 'utf8' });
    if (result.status === 0 && result.stdout.trim() === npmVersion) return candidate;
  }
  return null;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Command failed (${result.signal || result.status}): ${command} ${args.join(' ')}`);
  }
}

function runNpm(args) {
  run(process.execPath, [npmCli, ...args]);
}

function main() {
  const [major, minor, patch] = process.versions.node.split('.').map(Number);
  const supported = major >= 26 ||
    (major === 24 && minor >= 15) ||
    (major === 22 && (minor > 22 || (minor === 22 && patch >= 2)));
  if (!supported) {
    throw new Error(`Node ${process.versions.node} is not supported by npm ${npmVersion}. Use Node 26 or a compatible Node 22/24 release.`);
  }
  if (root.split(/[\\/]/).some(part => part.startsWith('.'))) {
    throw new Error('Move this clone to a path without dot-prefixed folders, then run this command again.');
  }
  run('tar', ['--version']);

  console.log(`\n[1/5] Finding npm ${npmVersion} (global npm is unchanged)...`);
  const installedNpm = findInstalledNpm();
  const npmManifest = path.join(root, '.npm-tools', 'node_modules', 'npm', 'package.json');
  if (installedNpm) {
    npmCli = installedNpm;
    console.log(`Using installed npm: ${npmCli}`);
  } else if (!fs.existsSync(npmManifest) || JSON.parse(fs.readFileSync(npmManifest, 'utf8')).version !== npmVersion) {
    console.log(`Installing npm ${npmVersion} locally under .npm-tools/...`);
    // Fixed relative arguments avoid shell quoting of user-supplied paths on Windows.
    // npm.cmd needs a shell. All later steps run npm-cli.js directly through Node.
    run(process.platform === 'win32' ? 'npm.cmd' : 'npm', [
      'install', '--prefix', '.npm-tools', '--no-save', '--package-lock=false',
      '--ignore-scripts', '--no-audit', '--no-fund', '--cache', '.npm-cache', `npm@${npmVersion}`,
    ], { shell: process.platform === 'win32' });
  }
  runNpm(['--version']);

  console.log('\n[2/5] Installing project dependencies from the lockfile...');
  runNpm(['ci', '--ignore-scripts', '--no-audit', '--no-fund', '--cache', cache]);

  const env = { ...process.env, npm_execpath: npmCli };
  console.log('\n[3/5] Packing the local helper fixtures...');
  run(process.execPath, [path.join(root, 'mock-registry', 'setup-fixtures.js')], { env });

  console.log('\n[4/5] Downloading and verifying dependency archives...');
  run(process.execPath, [path.join(root, 'mock-registry', 'download-packages.js')], { env });

  console.log('\n[5/5] Running all measurements and esbuild re-approval checks...');
  run(process.execPath, [path.join(root, 'scripts', 'measure.js')], { env });
  console.log('\nComplete. See the summary and raw-output path printed above.');
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`\nSetup and measurement failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { findInstalledNpm };
