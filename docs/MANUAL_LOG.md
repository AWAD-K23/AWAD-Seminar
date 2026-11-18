# Manual Log

Commands are run from the repository root unless another directory is specified.

## Prepare packages

```sh
npm install
node mock-registry/setup-fixtures.js
node mock-registry/download-packages.js
```

Result: On Windows, the downloader verified 33 dependency archives.

## Start the local services

```sh
node mock-registry/server.js
```

```text
Fake attacker listener running at http://127.0.0.1:4001
Local package registry running at http://127.0.0.1:4002
```

Check the listener in another terminal:

```powershell
curl.exe http://127.0.0.1:4001/status
```

```json
{"count":0,"leakedSecrets":[]}
```

## Sample app smoke test

With the local registry running, from `sample-app/`:

```sh
npm.cmd install --registry=http://127.0.0.1:4002 --cache ../.npm-cache/sample-test --ignore-scripts --no-audit --no-fund --fetch-retries=0
npm.cmd run build
```

- `--registry`: use the local registry.
- `--cache`: use a separate cache directory.
- `--ignore-scripts`: disable install scripts for this smoke test.
- `--no-audit`: skip the audit request.
- `--no-fund`: hide funding messages.
- `--fetch-retries=0`: fail without retrying a fetch.

Result: install and build succeeded with npm 11.20.0. This did not test the approval policy or independently verify network isolation.

## Reinstall the helper package

With the local registry running, from `sample-app/`:

```powershell
npm uninstall helper-pkg --registry=http://127.0.0.1:4002 --no-audit
npm install "helper-pkg@^1.0.0" --registry=http://127.0.0.1:4002 --no-audit
```

The package may install as `1.0.1` even when only `1.0.0` is approved; the policy controls its install script.

## Steps 4 and 5: Run the measurement

After preparing the packages, with npm 12.2.2:

```sh
npm run measure
```

The runner creates temporary projects and empty caches. Results below are from [`measurement-Z1UmGj`](../results/measurement-Z1UmGj/summary.json) on Windows with Node 26.12.1 and npm 12.2.2.

| Result | Name-only | Version-pinned |
| --- | --- | --- |
| Valid install and build runs | 5/5 | 5/5 |
| Dummy leaks per run | 1, 1, 1, 1, 1 | 0, 0, 0, 0, 0 |
| Install and build median | 8312.48 ms | 5295.59 ms |
| Install and build range | 7493.17–13168.78 ms | 5157.32–5946.79 ms |

The simulated attack adds two seconds when its script runs. Both policies used the same recorded dependency identities.

## Step 5: Check esbuild re-approval

With the local registry running, edit `allowScripts` in `sample-app/package.json` to simulate an earlier version approval:

```json
"allowScripts": {
  "helper-pkg@1.0.0": true,
  "esbuild@0.28.1": true
}
```

From `sample-app/`, use a fresh installation and a new, empty cache directory:

```powershell
npm install --registry=http://127.0.0.1:4002 --cache ../.npm-cache/step5-pinned --no-audit --no-fund --fetch-retries=0 --foreground-scripts
npm run build
```

For a fresh installation, first remove the existing `sample-app/node_modules` and `sample-app/package-lock.json`. Use a different empty cache directory each time.

Then change the approval to `"esbuild@0.28.2": true` and repeat the fresh install and build with another cache directory. To compare the name-only policy, repeat with `"esbuild": true`.

**Name-only policy:** npm ran the script; no new approval command was needed.

```text
npm notice run esbuild@0.28.2 postinstall
npm notice run node install.js
```

**Version-pinned policy:** npm reported the script as blocked.

```text
npm warn install-scripts   esbuild@0.28.2 (postinstall: node install.js)
```

In the automated measurement, one approval command updated the policy:

```text
Approved esbuild:
  removed-stale esbuild@0.28.1
  added esbuild@0.28.2
```

The build succeeded under both policies, including before approval. The automated test updated the policy using npm's approval command; it did not verify that the blocked script reran. The earlier approval is simulated, not an actual upgrade. The current `sharp` package has no install lifecycle script.

Raw output: [name-only](../results/measurement-Z1UmGj/reapproval-baseline.json) and [version-pinned](../results/measurement-Z1UmGj/reapproval-pinned.json).

## React template

Generated with internet access from the repository root:

```sh
npm.cmd create vite@latest seminar-vite-template -- --template react --no-interactive --cache .npm-cache
```

Result: create-vite 9.3.4 generated the React template, which was adapted for `sample-app/`.
