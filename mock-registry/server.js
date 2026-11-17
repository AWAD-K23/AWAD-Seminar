const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

// Each server instance keeps its own in-memory records for a measurement run.
function createAttackerListener() {
  const leakedSecrets = [];

  const app = express();

  // Record a simulated leak as a raw UTF-8 request body.
  app.post(
    '/steal',
    express.text({ type: () => true, limit: '64kb' }),
    (req, res) => {
      leakedSecrets.push(req.body || '');
      res.json({ count: leakedSecrets.length });
    }
  );

  // Report the number and contents of leaks received since the last reset.
  app.get('/status', (req, res) => {
    res.json({ count: leakedSecrets.length, leakedSecrets });
  });

  // Clear the in-memory records before the next measurement run.
  app.post('/reset', (req, res) => {
    leakedSecrets.length = 0;
    res.json({ count: 0 });
  });

  // Return a consistent JSON response for unknown routes.
  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Keep the response format consistent when a request exceeds the size limit.
  app.use((err, req, res, next) => {
    if (err.type === 'entity.too.large') {
      return res.status(413).json({ error: 'Request body too large' });
    }
    next(err);
  });

  return app;
}

// Read each archive once and prepare the metadata npm needs to install it.
function indexTarballs(tarballDir, origin) {
  const packages = new Map();
  const files = new Map();
  const packageTarballs = new Map();
  const tarballs = fs.readdirSync(tarballDir)
    .filter(name => name.endsWith('.tgz'))
    .sort();

  for (const filename of tarballs) {
    const file = path.join(tarballDir, filename);

    // npm tarballs contain their manifest at package/package.json.
    const manifestText = execFileSync(
      'tar',
      ['-xOzf', file, 'package/package.json'],
      { encoding: 'utf8' }
    );
    const manifest = JSON.parse(manifestText);
    const bytes = fs.readFileSync(file);
    const versions = packages.get(manifest.name) || {};

    if (versions[manifest.version]) {
      throw new Error(`Duplicate package: ${manifest.name}@${manifest.version}`);
    }

    // npm derives the trusted package identity from a registry-style URL.
    const archiveName = `${manifest.name.split('/').at(-1)}-${manifest.version}.tgz`;
    const archivePath = `/${manifest.name}/-/${archiveName}`;
    versions[manifest.version] = {
      ...manifest,
      dist: {
        tarball: `${origin}${archivePath}`,
        shasum: crypto.createHash('sha1').update(bytes).digest('hex'),
        integrity: `sha512-${crypto.createHash('sha512').update(bytes).digest('base64')}`,
      },
    };
    packages.set(manifest.name, versions);
    files.set(filename, file);
    packageTarballs.set(archivePath, file);
  }

  return { packages, files, packageTarballs };
}

// Create a small npm registry backed by the indexed local archives.
function createRegistry({
  tarballDir = path.join(__dirname, 'tarballs'),
  origin = 'http://127.0.0.1:4002',
} = {}) {
  const app = express();
  const { packages, files, packageTarballs } = indexTarballs(tarballDir, origin);

  // Serve canonical registry URLs so npm can verify pinned identities.
  app.get(/^\/(.+)\/-\/(.+\.tgz)$/, (req, res) => {
    const file = packageTarballs.get(req.path);
    if (!file) {
      return res.status(404).json({ error: 'Tarball not found' });
    }
    res.sendFile(path.resolve(file));
  });

  // Serve only tarballs indexed at startup, never arbitrary filesystem paths.
  app.get('/tarballs/:filename', (req, res) => {
    const file = files.get(req.params.filename);
    if (!file) {
      return res.status(404).json({ error: 'Tarball not found' });
    }
    res.sendFile(path.resolve(file));
  });

  // Return the package document npm uses to resolve versions and tarballs.
  app.get(/^\/(.+)$/, (req, res) => {
    let name;
    // Scoped package names can contain an encoded slash.
    try {
      name = decodeURIComponent(req.params[0]);
    } catch {
      return res.status(400).json({ error: 'Invalid package name' });
    }

    const versions = packages.get(name);
    if (!versions) {
      return res.status(404).json({ error: 'Package not found' });
    }

    // Prefer a stable version for the latest tag when one is available.
    const ordered = Object.keys(versions).sort((a, b) => (
      a.localeCompare(b, 'en', { numeric: true })
    ));
    const stable = ordered.filter(version => !version.includes('-'));
    const latest = (stable.length ? stable : ordered).at(-1);

    res.json({ name, 'dist-tags': { latest }, versions });
  });

  return app;
}

// Importing this module does not start either server, which allows isolated tests.
if (require.main === module) {
  createAttackerListener().listen(4001, '127.0.0.1', () => {
    console.log('Fake attacker listener running at http://127.0.0.1:4001');
  });
  createRegistry().listen(4002, '127.0.0.1', () => {
    console.log('Local package registry running at http://127.0.0.1:4002');
  });
}

module.exports = { createAttackerListener, createRegistry };
