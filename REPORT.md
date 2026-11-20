https://github.com/longtoZ/AWAD-Seminar

# Defeating npm Supply-Chain Attacks: Version-Pinned allowScripts in Web Builds

## Research question

*"In a 25-package React build, what percentage of simulated postinstall supply-chain attacks does npm 12’s version-pinned allowScripts block compared with unpinned allowlists, and how much build time (ms) and re-approvals (count) does it cost?"*

**Scope of the evidence:** The selected question describes a 25-package build and simulated attacks. The implemented workload does not establish that exact package count and tests one attack repeated five times. It models prior approvals rather than performing real upgrades; consequently, the findings answer only that narrower case.

**Headline:** In both recorded measurement sets, the name-only policy allowed a dummy-token leak in **5/5 runs**; the version-pinned policy allowed **0/5**. This is one simulated attack repeated, not five different attacks.

## Setup and comparison

| Item | Configuration |
| --- | --- |
| Recorded environment | Windows x64; Node v26.12.1; npm 12.2.2 |
| Application | React/Vite sample app with esbuild, sharp, husky and their dependencies; see `sample-app/package.json` |
| Data and services | Local package registry, simulated `helper-pkg` fixture, dummy token and local listener |
| Repetitions | Five runs per policy, alternating name-only and pinned runs |
| Cache | A new temporary project and empty npm cache for every run |
| Measurement | Wall-clock time for `npm install` followed by the production build; listener count after installation |
| Reproduction | Follow `README.md`, then run `npm run measure`; raw JSON is written under `results/` |

| Policy | Prior approval modeled in `allowScripts` | Package installed | Expected decision for helper script |
| --- | --- | --- | --- |
| Baseline | `helper-pkg` (name-only) | `helper-pkg@1.0.1` | Approved by name |
| Change | `helper-pkg@1.0.0` (version-pinned) | `helper-pkg@1.0.1` | Not covered by the old pin |

- The two conditions hold the machine, application, helper version, dependency identities, esbuild approval, local services and fresh-cache procedure fixed. The helper approval is the intended difference.
- The prior approval is written directly into each temporary manifest. This models the policy state after an update; it does **not** install the old helper version or perform an actual upgrade.
- The helper's postinstall fixture waits two seconds to simulate collection, then sends a dummy value to the listener. It does not collect real secrets or scan the machine.
- A valid run requires a successful install and build, the expected helper version, and lockfile resolved URLs pointing to the local registry. The summary also checks that dependency identities match across runs. These checks do not independently prove outbound network isolation.

## Results

The primary [summary](results/measurement-Z1UmGj/summary.json) and individual `baseline-run-*.json` and `pinned-run-*.json` files contain the underlying outputs. Ranges are minimum–maximum across five runs.

| Metric | Name-only | Version-pinned |
| --- | ---: | ---: |
| Valid runs | 5/5 | 5/5 |
| Runs with a dummy-token leak | 5/5 | 0/5 |
| Install and build, median | 8,312.48 ms | 5,295.59 ms |
| Install and build, range | 7,493.17–13,168.78 ms | 5,157.32–5,946.79 ms |

- In this fixture, the name-only approval let the new helper script send the dummy token; the previous version pin did not cover that script.
- The name-only timing includes the fixture's two-second simulated activity. The difference therefore describes the whole scenario; it does **not** isolate policy overhead or establish that pinning normally makes builds faster.

### Repeat measurement

A [later run](results/measurement-oJk235/summary.json) in the existing workspace used the same reported Node and npm versions and reproduced the leak counts. It was not a fresh-clone test.

| Metric | Name-only | Version-pinned |
| --- | ---: | ---: |
| Runs with a dummy-token leak | 5/5 | 0/5 |
| Install and build, median | 9,951.40 ms | 6,976.20 ms |
| Install and build, range | 8,983.53–14,051.08 ms | 6,696.84–8,078.00 ms |

The timing ranges differed from the first set. The cause was not measured; host load and execution environment may affect elapsed time.

### Fresh-clone reproduction

- The public repository was cloned on the same Windows machine. Dependencies and fixture archives were prepared using the README steps, with an existing npm 12.2.2 executable instead of installing npm globally.
- The [fresh-clone logs](results/measurement-AgO6hZ/summary.json) record 5/5 valid runs per policy, the same 5/5 versus 0/5 leak counts, and the same 0 versus 1 approval-command outcomes.
- Name-only install-and-build time: median 7,753.24 ms, range 7,537.33–8,258.35 ms. Pinned: median 5,396.30 ms, range 4,904.10–5,985.05 ms. Both medians fall within the original ranges; the pinned range extends beyond the original range.
- The first attempt used a dot-prefixed clone directory and failed because the local registry did not serve archives from that path. Moving the clone to a normal directory allowed the same measurement to complete. This is a same-machine check, not an independent machine test.

### Esbuild re-approval check

This separate check used one run per policy. It modeled an existing name-only approval or an approval for `esbuild@0.28.1`, then installed `esbuild@0.28.2`.

| Observation | Name-only | Old-version pin |
| --- | --- | --- |
| Approval commands performed | 0 | 1 |
| Build before approval | Passed | Passed |
| Build after approval | Not performed | Passed |

- The pinned case listed the new esbuild script as pending. `npm install-scripts approve esbuild` updated the approval to the installed version.
- The build succeeded before approval, so this check does not show build failure or interruption.
- Evidence: [name-only log](results/measurement-Z1UmGj/reapproval-baseline.json) and [pinned log](results/measurement-Z1UmGj/reapproval-pinned.json). One check per policy is a workflow demonstration, not an estimate of typical update frequency or review time.

## Recommendation and limits

- **When to use it:** Consider version-pinned approvals when the team can review changed dependency scripts. The old pin prevented automatic execution of the changed helper version in this test.
- **Cost and when not to use it:** Updated scripts can need another approval. Teams that cannot review frequent dependency updates should account for pending scripts and potential workflow interruptions before adopting this policy. The test does not measure human review time.
- **Security boundary:** Approval is a review decision, not proof that a script is safe. The result covers one synthetic helper attack, not all supply-chain attacks.
- **Generalisability:** One workload and Windows machine were tested. Other packages, operating systems, hardware and host load may change behavior and timing. The two recorded timing sets already show variability beyond the original ranges.
- **Unmeasured:** Actual upgrades, other attack vectors, production workloads and independent outbound-network isolation. Lockfile URL checks alone do not establish network isolation.

## Sources

Official sources accessed **2026-11-20**:

- [npm install-scripts documentation](https://docs.npmjs.com/cli/v12/commands/npm-install-scripts/) — approval commands, pinned and name-only entries, and pending scripts.
- [npm install documentation](https://docs.npmjs.com/cli/v12/commands/npm-install/) — install-script policy and overrides.
- [npm 12.2.2 release notes](https://github.com/npm/cli/releases/tag/v12.2.2) — the tested npm release.

Tool and package versions in the setup are observations from the saved logs and project manifests, not claims about current releases.
