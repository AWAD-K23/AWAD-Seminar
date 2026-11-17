# Manual Log

**Running the measurement** (from the repository root, after online dependency setup, with npm 12.2.2):

```sh
npm run measure
```

The command runs five temporary installs and builds per policy, using separate empty caches, and saves logs and a summary in a new `results/measurement-*` folder. It models the compromised update by installing `helper-pkg@1.0.1`; it does not perform the earlier approval or an actual upgrade. The first functional attempt failed because user and global npm configuration were pointed at the same file; its runs are marked invalid. A subsequent run completed all ten installations and builds with the same recorded dependency identities. Network isolation was not independently tested.

The current fixture simulates scanning and gathering with two one-second delays and logs each stage before sending the dummy value locally. Measurement installs use `--foreground-scripts` so these messages appear in the raw output. Runs made before this change used a different fixture and should not be compared directly.

**Fresh install after registry URL change (2026-11-17):** The previous `node_modules` and lockfile were moved to `.npm-cache/sample-install-backup-20261117/`, since removing the lockfile alone did not replace the installed packages' old resolution data. With the registry running and from `sample-app/`, the fresh install used:

```powershell
node ../.npm-tools/node_modules/npm/bin/npm-cli.js install --registry=http://127.0.0.1:4002 --cache ../.npm-cache/sample-fresh-20261117 --no-audit --no-fund --fetch-retries=0
```

With the pinned policy, npm 12.2.2 blocked `helper-pkg@1.0.1` as expected and did not warn about esbuild. The new lockfile uses `/esbuild/-/esbuild-0.28.2.tgz`; an esbuild transform and production build succeeded. This is a functional check, not a benchmark.

**Selecting the script policy:** Edit `allowScripts` in `sample-app/package.json`. Use `"helper-pkg": true` for the baseline or `"helper-pkg@1.0.0": true` for the pinned policy. Keep `"esbuild@0.28.2": true` in both. Use a fresh install, cache, and lockfile with the current registry URLs, and omit `--ignore-scripts` when testing the policy.

An initial npm 12.2.2 check in temporary projects installed `helper-pkg@1.0.1` from the local registry: the baseline produced one dummy leak, the `1.0.0` pin produced none, and a matching `1.0.1` pin produced one. This was one functional check per policy, not a benchmark; no network isolation or raw measurement logs were captured.

**Uninstalling and reinstalling `helper-pkg`** (with the local registry running, from `sample-app/`):

```powershell
npm uninstall helper-pkg --registry=http://127.0.0.1:4002 --no-audit
npm install "helper-pkg@^1.0.0" --registry=http://127.0.0.1:4002 --no-audit
```

These commands update `package.json` and `package-lock.json`. npm can install `helper-pkg@1.0.1` even when `allowScripts` approves only `helper-pkg@1.0.0`; the policy controls whether the install script runs, not whether the package is installed. With the baseline policy, the simulated script may send the dummy value to the local listener. For a controlled comparison, use fresh installations, caches, and lockfiles.

**Target npm version:** 12.2.2. The smoke test below was performed with npm 11.20.0.

**Generating the React template** (from the repository root, with internet access):

```sh
npm.cmd create vite@latest seminar-vite-template -- --template react --no-interactive --cache .npm-cache
```

This generated `create-vite` 9.3.4's React template in a temporary folder. Its application files were copied to `sample-app/`, and its package configuration was adapted to the pinned local dependencies; the optional lint and type tooling was omitted. The temporary folder was then removed.

**Running the Attacker Listener**

```sh
$ node mock-registry/server.js

Fake attacker listener running at http://127.0.0.1:4001
Local package registry running at http://127.0.0.1:4002
```

**Preparing the local packages** (from the repository root; downloading requires internet):

```sh
node mock-registry/setup-fixtures.js
node mock-registry/download-packages.js
```

On Windows, the downloader verified 33 dependency archives for the reduced package set.

**Sample app smoke test** (with the local registry running, from `sample-app/`):

```sh
npm.cmd install --registry=http://127.0.0.1:4002 --cache ../.npm-cache/sample-test --ignore-scripts --no-audit --no-fund --fetch-retries=0
npm.cmd run build
```

The install command uses these options:

- `--registry=http://127.0.0.1:4002` points npm to the local registry for package metadata.
- `--cache ../.npm-cache/sample-test` uses a separate cache directory for this smoke test; it is not automatically cleared between runs.
- `--ignore-scripts` prevents package lifecycle scripts from running during installation.
- `--no-audit` skips npm's security audit request.
- `--no-fund` suppresses funding messages.
- `--fetch-retries=0` makes npm fail without retrying a failed fetch.

The install and build succeeded. Install scripts were disabled; this did not test approval policies. No request log or network isolation was captured, so the test does not prove all downloads were local.

**Accessing the `/status` endpoint shows the number of secrets collected so far:**

```sh
$ curl http://127.0.0.1:4001/status

{"count":0,"leakedSecrets":[]}
```

**Historical output:** The following `/helper-pkg` response was captured before the registry's tarball URLs were changed to npm-style paths for version-pinned approvals. Hashes and URLs can change when fixtures are repacked.

```sh
$ curl http://127.0.0.1:4002/helper-pkg

{
  "name": "helper-pkg",
  "dist-tags": {
    "latest": "1.0.1"
  },
  "versions": {
    "1.0.0": {
      "name": "helper-pkg",
      "version": "1.0.0",
      "scripts": {
        "postinstall": "node -e \"console.log('helper 1.0.0 setup ok')\""
      },
      "dist": {
        "tarball": "http://127.0.0.1:4002/tarballs/helper-pkg-1.0.0.tgz",
        "shasum": "7b9cc5a633d84912ed6823c41b2e26093d358989",
        "integrity": "sha512-KbhiAnDzeczKifjriGPw1H7Zc1mq4zyAVKvzG0dKWfSf9cr9Sd/GXOtvK2R3UYTZb22i8BAav3U1vtxGLI4pug=="
      }
    },
    "1.0.1": {
      "name": "helper-pkg",
      "version": "1.0.1",
      "scripts": {
        "postinstall": "node simulate-leak.js"
      },
      "dist": {
        "tarball": "http://127.0.0.1:4002/tarballs/helper-pkg-1.0.1.tgz",
        "shasum": "c19c24a767b6b8be37026f88a79611daadd8e461",
        "integrity": "sha512-aY6Hz8dzdiHJW5/6QEK+8e/HUGe3mi+Z0seukw+5XTahqvmSbuIzl5lY6pG5FkzLo0pdtymWT0MsJJdTKyIx1g=="
      }
    }
  }
}
```
