const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');
const net = require('node:net');
const { performance } = require('node:perf_hooks');
const { createRegistry, createAttackerListener } = require('../mock-registry/server');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'sample-app');
const npmCli = process.env.npm_execpath;
const repetitions = 5;

// Capture both streams and the exit code so failed runs remain auditable.
function runNpm(args, cwd, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [npmCli, ...args], { cwd, env });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', data => { stdout += data; });
    child.stderr.on('data', data => { stderr += data; });
    child.once('error', reject);
    child.once('close', (code, signal) => resolve({ args, code, signal, stdout, stderr }));
  });
}

function listen(app, port) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, '127.0.0.1');
    server.once('listening', () => resolve(server));
    server.once('error', reject);
  });
}

async function requestListener(listenerUrl, route, method = 'GET') {
  const response = await fetch(`${listenerUrl}${route}`, { method });
  if (!response.ok) throw new Error(`Listener ${route}: HTTP ${response.status}`);
  return response.json();
}

// Ask the OS for a free local port for the registry's package URLs.
function availablePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const port = probe.address().port;
      probe.close(() => resolve(port));
    });
  });
}

// Copy the application, never its previous install, lockfile, or build output.
function prepareProject(directory, mode) {
  fs.mkdirSync(directory, { recursive: true });
  for (const entry of ['src', 'public', 'index.html', 'vite.config.js']) {
    fs.cpSync(path.join(source, entry), path.join(directory, entry), { recursive: true });
  }

  const app = JSON.parse(fs.readFileSync(path.join(source, 'package.json'), 'utf8'));
  app.dependencies['helper-pkg'] = '1.0.1';
  app.allowScripts = {
    [mode === 'baseline' ? 'helper-pkg' : 'helper-pkg@1.0.0']: true,
    'esbuild@0.28.2': true,
  };
  fs.writeFileSync(path.join(directory, 'package.json'), `${JSON.stringify(app, null, 2)}\n`);
  fs.writeFileSync(path.join(directory, '.env'), 'DUMMY_API_KEY=SECRET_TOKEN_12345\n');
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

async function main() {
  if (!npmCli) throw new Error('Run this command with npm run measure.');
  const npmVersion = execFileSync(process.execPath, [npmCli, '--version'], { encoding: 'utf8' }).trim();
  if (npmVersion !== '12.2.2') throw new Error(`Expected npm 12.2.2; found ${npmVersion}.`);

  const workRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'seminar-measure-'));
  const resultsRoot = path.join(root, 'results');
  fs.mkdirSync(resultsRoot, { recursive: true });
  const resultsDir = fs.mkdtempSync(path.join(resultsRoot, 'measurement-'));
  const userConfig = path.join(workRoot, 'user.npmrc');
  const globalConfig = path.join(workRoot, 'global.npmrc');
  fs.writeFileSync(userConfig, '');
  fs.writeFileSync(globalConfig, '');

  // Ignore machine-level npm settings that could override the experiment.
  const env = Object.fromEntries(Object.entries(process.env)
    .filter(([key]) => !key.toLowerCase().startsWith('npm_config_')));
  env.npm_config_userconfig = userConfig;
  env.npm_config_globalconfig = globalConfig;
  env.npm_config_audit = 'false';
  env.npm_config_fund = 'false';

  let registry;
  let listener;
  const runs = [];

  try {
    const registryPort = await availablePort();
    const registryUrl = `http://127.0.0.1:${registryPort}`;
    registry = await listen(createRegistry({ origin: registryUrl }), registryPort);
    listener = await listen(createAttackerListener(), 0);
    const listenerPort = listener.address().port;
    const listenerUrl = `http://127.0.0.1:${listenerPort}`;
    env.MOCK_LISTENER_PORT = String(listenerPort);

    // Alternate the two policies to reduce time-order bias.
    for (let index = 1; index <= repetitions; index++) {
      for (const mode of ['baseline', 'pinned']) {
        const directory = path.join(workRoot, `${mode}-${index}`);
        const cache = path.join(workRoot, `cache-${mode}-${index}`);
        const output = path.join(resultsDir, `${mode}-run-${index}.json`);
        const record = { mode, run: index, npmVersion, nodeVersion: process.version };

        try {
          prepareProject(directory, mode);
          await requestListener(listenerUrl, '/reset', 'POST');
          const start = performance.now();
          record.install = await runNpm([
            'install', `--registry=${registryUrl}`, `--cache=${cache}`,
            '--no-audit', '--no-fund', '--fetch-retries=0', '--foreground-scripts',
          ], directory, env);

          if (record.install.code === 0) {
            record.build = await runNpm(['run', 'build'], directory, env);
          }
          record.durationMs = Math.round((performance.now() - start) * 100) / 100;
          record.listener = await requestListener(listenerUrl, '/status');
          record.secretsLeaked = record.listener.count;
          record.buildSucceeded = record.build?.code === 0 &&
            fs.existsSync(path.join(directory, 'dist', 'index.html'));
          record.blockedWarningLines = (record.install.stderr.match(/npm warn install-scripts/g) || []).length;

          const lockPath = path.join(directory, 'package-lock.json');
          if (fs.existsSync(lockPath)) {
            record.lockfile = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
          }
          const helper = record.lockfile?.packages?.['node_modules/helper-pkg'];
          const external = Object.values(record.lockfile?.packages || {}).filter(pkg => {
            if (!pkg.resolved) return false;
            try {
              const url = new URL(pkg.resolved);
              return url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.port !== String(registryPort);
            } catch {
              return true;
            }
          });

          record.valid = record.install.code === 0 && record.buildSucceeded &&
            helper?.version === '1.0.1' && external.length === 0;
          if (!record.valid) record.error = 'Install, build, helper version, or resolved URL check failed.';
        } catch (error) {
          record.valid = false;
          record.error = error.message;
        }

        runs.push(record);
        fs.writeFileSync(output, `${JSON.stringify(record, null, 2)}\n`);
        console.log(`${mode} run ${index}: ${record.valid ? `${record.durationMs} ms, ${record.secretsLeaked} leaks` : `INVALID: ${record.error}`}`);
      }
    }

    // Compare lockfile dependency identities, excluding the root policy itself.
    const dependencySets = runs.filter(run => run.lockfile).map(run => JSON.stringify(
      Object.entries(run.lockfile.packages).filter(([name]) => name).map(([name, pkg]) => [name, pkg.version, pkg.resolved]).sort()
    ));
    const sameDependencies = dependencySets.length === runs.length && new Set(dependencySets).size === 1;
    const summary = { npmVersion, nodeVersion: process.version, platform: process.platform, arch: process.arch, sameDependencies, modes: {} };

    for (const mode of ['baseline', 'pinned']) {
      const selected = runs.filter(run => run.mode === mode && run.valid);
      const times = selected.map(run => run.durationMs);
      summary.modes[mode] = {
        validRuns: selected.length,
        totalRuns: repetitions,
        leaks: selected.map(run => run.secretsLeaked),
        durationMs: times.length ? { median: median(times), min: Math.min(...times), max: Math.max(...times) } : null,
      };
    }

    fs.writeFileSync(path.join(resultsDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
    console.log(JSON.stringify(summary, null, 2));
    console.log(`Raw output: ${resultsDir}`);
    if (!sameDependencies || runs.some(run => !run.valid)) process.exitCode = 1;
  } finally {
    if (listener) await new Promise(resolve => listener.close(resolve));
    if (registry) await new Promise(resolve => registry.close(resolve));
    fs.rmSync(workRoot, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error(`Measurement failed: ${error.message}`);
  process.exitCode = 1;
});
