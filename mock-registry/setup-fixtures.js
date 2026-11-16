const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const destination = path.join(__dirname, 'tarballs');
fs.mkdirSync(destination, { recursive: true });

// Pack both versions locally so the registry can serve them without a download.
for (const version of ['1.0.0', '1.0.1']) {
  const fixture = path.join(__dirname, 'fixtures', `helper-pkg-${version}`);
  const filename = `helper-pkg-${version}.tgz`;
  const packedFile = path.join(fixture, filename);

  // Windows uses npm.cmd, which requires a shell to launch.
  execFileSync(
    process.platform === 'win32' ? 'npm.cmd' : 'npm',
    ['pack', '--pack-destination', '.'],
    { cwd: fixture, stdio: 'inherit', shell: process.platform === 'win32' }
  );

  // Move the generated archive into the directory indexed by the registry.
  fs.copyFileSync(packedFile, path.join(destination, filename));
  fs.unlinkSync(packedFile);
}
