# Version-Pinned Install Script Allowlisting in Web Builds

**Course:** CSC13114 - Advanced Web Development Seminar  
**Team:** 23120131 - 23120135 - 23120143
**Repository:** [Public repository URL]  
**Status:** Planning; the experiment and instructions below have not yet been implemented or verified.

## Research question

In a React build, what percentage of simulated install-script attacks does version-pinned `allowScripts` block compared with an unpinned allowlist, and what are the costs in install and build time (ms) and re-approvals (count)?

The study will compare an unpinned package approval with an approval tied to an exact version. Both conditions will use the same project, dependency update, machine, and cache procedure. The intended scenarios include a compromised package update, a direct `preinstall`, and a transitive `postinstall`. The exact scope and policy behavior must be verified before measurement.

## Status and prerequisites

- Node.js version: [Version and installation instructions]
- npm version: [Verified version and installation instructions]
- Operating system and other requirements: [Details]
- Local ports and required permissions: [Details]
- Official documentation and release notes: [Links and access dates]

The npm version, commands, defaults, and configuration described in the planning documents still need to be checked against official sources. Do not treat them as verified results.

## Reproduce the study

> **Not yet runnable.** Replace the placeholders with tested commands once the experiment is implemented.

1. Clone and enter the repository:

   ```sh
   git clone [repository-url]
   cd [repository-directory]
   ```

2. Install the prerequisites and prepare the local test data: [Tested steps and commands].
3. Run the measurement from the repository root:

   ```sh
   npm run measure
   ```

4. Find the per-run raw output in `results/` and the summary at [summary location]. [Describe any options, cleanup, and expected output.]

The planned experiment uses a local registry and listener with a dummy secret. Document any initial downloads, network requirements, and generated files here after testing.

### Local attacker listener

After installing the root dependencies with `npm install`, run `node mock-registry/server.js`. The listener binds to `127.0.0.1:4001` and keeps received request bodies in memory until reset or shutdown. Use dummy data only.

- `POST /steal` records the UTF-8 request body and returns `{ "count": 1 }` (with the current count).
- `GET /status` returns `{ "count": 1, "leakedSecrets": ["..."] }`.
- `POST /reset` clears the records and returns `{ "count": 0 }`.

### Local package registry

The same command starts a local registry on `127.0.0.1:4002`. It indexes `.tgz` files in `mock-registry/tarballs/` at startup, using the `tar` executable to read their manifests; restart it after adding packages. Regenerate the two local `helper-pkg` fixtures with `node mock-registry/setup-fixtures.js`. Version 1.0.1 reads `DUMMY_API_KEY` from the installing project's `.env` and sends it only to the local listener.

#### Online dependency setup

Run these commands from the repository root with Node.js, npm, `tar`, and internet access:

```sh
npm install
node mock-registry/setup-fixtures.js
node mock-registry/download-packages.js
node mock-registry/server.js
```

The download script uses the pinned `mock-registry/package-source/package-lock.json`, including transitive dependencies and optional packages compatible with the current operating system and CPU. It checks each archive against the lockfile's SHA-512 integrity value and reuses verified downloads if interrupted. Downloaded archives are ignored by Git; the two small, already tracked fixture archives remain in the repository. Run setup on each target platform before starting the registry, and restart the registry after changing its tarballs.

This setup requires internet access. The planned measurement is intended to use only the local registry after setup, but an offline React build and the measurement command have not yet been implemented or verified. The six pinned direct packages (`react`, `react-dom`, `vite`, `esbuild`, `sharp`, and `husky`) and their dependency tree are a starting set, not yet a validated benchmark workload. The original 25-package plan and its assumptions about install scripts need updating and verification.

## Experiment design

| Element | Planned approach | Details to verify |
| --- | --- | --- |
| Baseline | Unpinned install-script allowlist | [Exact configuration and command] |
| Change | Version-pinned install-script allowlist | [Exact configuration and command] |
| Controlled conditions | Same project, dependencies, machine, update scenarios, and cache procedure | [Versions, hardware, data, and procedure] |
| Repetitions | At least five cold-cache runs per condition | [Actual run count and cache method] |
| Safety | Simulated packages and dummy token on local services | [Addresses and isolation details] |

## Measurements and results

| Metric | Unit | Baseline | Pinned | Raw evidence |
| --- | --- | --- | --- | --- |
| Simulated attacks blocked | count and % | [Result] | [Result] | [Log paths] |
| Install and production build time | ms; median and min–max | [Result] | [Result] | [Log paths] |
| Re-approval overhead | count | [Result] | [Result] | [Log paths] |
| Legitimate functionality affected | packages / observed failures | [Result] | [Result] | [Log paths] |

[Describe how each metric is calculated, including the denominator for attack block rate. Link every reported result to its raw runs.]

## Findings and limitations

- **Finding:** [What changed, by how much, and with what spread]
- **Recommendation:** [When the policy is useful and when it may not be]
- **Limitations:** [Threat scenarios, environment, sample size, and factors that could change the result]

## Repository contents

- [`docs/`](docs/) — topic, rationale, plan, and seminar rubric.
- `results/` — [planned: raw measurement output for every reported run].
- `REPORT.md` — [planned: study report, up to three pages].
- `slides.pdf` — [planned: presentation slides].
- `TALK.md` — [planned: publicly viewable recording link, at most eight minutes].
- [`AI-LOG.md`](AI-LOG.md) — AI assistance and verification log.
- [`SELF_ASSESSMENT_REPORT.md`](SELF_ASSESSMENT_REPORT.md) — rubric self-assessment.

## Sources

[List official sources for each version, date, status, and API claim, with the date accessed. Include citations in `REPORT.md`.]
