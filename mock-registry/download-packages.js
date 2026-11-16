// Download the locked dependency archives once, before offline measurements.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const lock = require('./package-source/package-lock.json');
const destination = path.join(__dirname, 'tarballs');

fs.mkdirSync(destination, { recursive: true });

// Compare a downloaded archive with the SHA-512 hash in the lockfile.
function validArchive(bytes, integrity) {
  const expected = integrity.split(/\s+/)
    .find(value => value.startsWith('sha512-'));
  const actual = `sha512-${crypto.createHash('sha512').update(bytes).digest('base64')}`;

  return expected === actual;
}

// Check npm's OS or CPU restrictions, including exclusions such as "!linux".
function matchesPlatform(allowed, current) {
  if (!allowed) {
    return true;
  }

  if (allowed.includes(`!${current}`)) {
    return false;
  }

  const included = allowed.filter(value => !value.startsWith('!'));
  return included.length === 0 || included.includes(current);
}

async function main() {
  const archives = new Map();

  // Collect the packages in the lockfile, skipping other platforms' optional binaries.
  for (const [location, info] of Object.entries(lock.packages)) {
    if (!location) {
      continue; // The root project is not a downloadable package.
    }

    const matchesOs = matchesPlatform(info.os, process.platform);
    const matchesCpu = matchesPlatform(info.cpu, process.arch);

    if (info.optional && (!matchesOs || !matchesCpu)) {
      continue;
    }

    const isNpmPackage = info.resolved?.startsWith('https://registry.npmjs.org/');

    if (!isNpmPackage || !info.integrity) {
      throw new Error(`Unsupported or unverified dependency: ${location}`);
    }

    // Include the scope in archive names to distinguish scoped packages.
    const name = location.split('node_modules/').at(-1);
    const filename = `${name.replace(/^@/, '').replaceAll('/', '-')}-${info.version}.tgz`;
    const previous = archives.get(filename);

    if (previous && previous.integrity !== info.integrity) {
      throw new Error(`Archive filename collision: ${filename}`);
    }

    archives.set(filename, info);
  }

  // Reuse verified archives; download and verify only missing or invalid ones.
  for (const [filename, info] of archives) {
    const file = path.join(destination, filename);

    if (fs.existsSync(file) && validArchive(fs.readFileSync(file), info.integrity)) {
      console.log(`Already verified: ${filename}`);
      continue;
    }

    console.log(`Downloading: ${filename}`);
    const response = await fetch(info.resolved);

    if (!response.ok) {
      throw new Error(`Download failed (${response.status}): ${info.resolved}`);
    }

    const bytes = Buffer.from(await response.arrayBuffer());

    if (!validArchive(bytes, info.integrity)) {
      throw new Error(`Integrity check failed: ${filename}`);
    }

    fs.writeFileSync(file, bytes);
  }

  console.log(`Verified ${archives.size} dependency archives.`);
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
