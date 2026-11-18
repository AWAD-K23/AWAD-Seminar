# Version-Pinned Install Script Allowlisting in Web Builds

**Course:** CSC13114 - Advanced Web Development Seminar  
**Team:** 23120131 - 23120135 - 23120143  
**Status:** Measurement and esbuild re-approval checks are implemented. The report is in progress.

## Research question

How does version-pinned `allowScripts` affect simulated install-script attacks, install and build time, and re-approvals in a React project?

Some npm packages run scripts during installation. This project compares an approval for a package name with an approval for one specific version.

The sample app uses React and Vite. A local registry serves its dependencies, including two versions of a simulated package called `helper-pkg`.

## Setup and measurement

Requirements: Node.js, npm 12.2.2, `tar`, and internet access for the initial setup. The recorded run used Windows x64 and Node 26.12.1.

```sh
git clone https://github.com/longtoZ/AWAD-Seminar.git
cd AWAD-Seminar
npm install
node mock-registry/setup-fixtures.js
node mock-registry/download-packages.js
npm run measure
```

The downloader verifies third-party archives and stores them locally. These archives are not committed; run the setup on each target platform.

The measurement starts its own local services. It uses temporary projects and empty caches, then saves logs and a summary in `results/measurement-*`. For manual commands, see [MANUAL_LOG.md](docs/MANUAL_LOG.md).

During measurement, package URLs in the generated lockfiles are checked against the local registry. Network access has not been independently blocked or traced.

The current workload includes React, React DOM, Vite, the Vite React plugin, esbuild, sharp, husky, and their dependencies.

## Experiment

| | Name-only policy | Version-pinned policy |
| --- | --- | --- |
| Previous helper approval | `helper-pkg` | `helper-pkg@1.0.0` |
| Tested package | `helper-pkg@1.0.1` | `helper-pkg@1.0.1` |
| Repetitions | 5 | 5 |

The helper fixture waits two seconds to simulate collecting a dummy token, then sends it to the local listener. It does not scan the machine. The delay is included in the measured time when the script runs.

A name-only approval lets the new helper version run its install script. With the older version pinned, npm blocks the new version's script. The runner checks the listener to count dummy leaks, and runs a production build after each install.

The runner alternates the two policies. Each run has a fresh project and cache, and the recorded results include npm output, lockfiles, and install-and-build duration.

### Esbuild re-approval

A separate check installs `esbuild@0.28.2` with either a name-only approval or a simulated approval for `0.28.1`. It checks the build and approves the new version in the pinned case.

The check records npm's blocked-script warning and runs the build before approval. It then runs `npm install-scripts approve esbuild` for the pinned policy and checks the build again.

This check uses esbuild because it has an install script. The current `sharp@0.35.5` package does not have one.

## Recorded results

The [recorded run](results/measurement-Z1UmGj/summary.json) used the same dependency identities in all ten helper tests.

| Result | Name-only | Version-pinned |
| --- | --- | --- |
| Valid runs | 5/5 | 5/5 |
| Runs with no dummy leak | 0/5 | 5/5 |
| Install and build median | 8312.48 ms | 5295.59 ms |
| Install and build range | 7493.17–13168.78 ms | 5157.32–5946.79 ms |
| Esbuild approval commands run | 0 | 1 |
| Build before esbuild approval | Passed | Passed |

The leak counts are five repetitions of one simulated attack. See the raw [name-only](results/measurement-Z1UmGj/reapproval-baseline.json) and [version-pinned](results/measurement-Z1UmGj/reapproval-pinned.json) esbuild results.

The baseline tests each sent the dummy token to the listener; npm blocked the helper script in all five pinned tests. The baseline time includes the fixture's two-second delay, so the time difference includes that simulated activity.

For esbuild, npm ran the script under the name-only policy and blocked it under the older pinned approval. One approval command updated the pinned policy. The build succeeded before and after approval.

## Local services

For manual testing, start `node mock-registry/server.js` after preparing the packages. It runs two services:

- **Attacker listener**, at `127.0.0.1:4001`: `POST /steal` records dummy data, `GET /status` shows it, and `POST /reset` clears it.
- **Package registry**, at `127.0.0.1:4002`: serves the local package archives and metadata.

Restart the registry after adding or changing archives. Use only dummy data with the listener.

## Limits

- The tests model previous approvals; they do not perform actual upgrades.
- Other planned attack scenarios and independent network isolation checks remain unfinished.

The report, findings, recommendations, and official-source verification are still in progress.

## Repository contents

- [docs/](docs/) — plan, rubric, and manual command log.
- [mock-registry/](mock-registry/) — local registry, listener, and package fixtures.
- [sample-app/](sample-app/) — Vite React app and dummy test data.
- [scripts/](scripts/) — measurement runner.
- [results/](results/) — raw measurements and summaries.
- [AI-LOG.md](AI-LOG.md) — record of AI assistance.
- [SELF_ASSESSMENT_REPORT.md](SELF_ASSESSMENT_REPORT.md) — rubric self-assessment.
