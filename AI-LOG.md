# AI-LOG.md — template

Copy this file into the root of your team repository and keep it up to date.
Every submission in this course includes it.

## How to use it

- One entry per task where an assistant did part of the work, and **one
AI-LOG.md with every project milestone** (`PA#1`–`PA#5`).
- Three honest lines are enough. This is an account, not a transcript.
- Write it as you go. Reconstructing it the night before never reads true.
- Declaring heavy use costs you nothing. A team that declares 80% and can
explain all of it scores higher than a team that declares nothing and freezes
at the oral.

## The five rules, in short

1. AI is allowed and encouraged in every assignment. Only the final exam is
written without it.
2. Declare it here.
3. You own the code. "The AI wrote it" is not a defence.
4. You will be asked. Anything you cannot explain scores zero, even if it runs.
5. No secrets in prompts: no API keys, no real user data, no classmate's work.
6. For the LLM feature inside your own product, say what data leaves your
system and why that is acceptable.

## Entry format

```md
## <YYYY-MM-DD> — <what you were working on>
Tool: <Claude Code / Copilot / Cursor / something else / none>
Asked for: <the task you gave it, in one sentence>
Kept: <what you took as it came>
Changed: <what you rewrote, and why>
Rejected: <what you threw away, and why>
```

`Changed` and `Rejected` are the two lines we read most closely: what the assistant got wrong, and which check caught it. "Nothing went wrong" is a fine entry if it says what you ran.

## A filled example

```md
## 2026-09-24 — feature spec (IA#1)
Tool: Claude Code.
Asked for: a first draft of the acceptance criteria from my Flow section.
Kept: the three-way split arithmetic criterion.
Changed: its criteria said "works correctly" — rewrote each one with concrete
values so it can fail.
Rejected: its refund flow. Refunds are a non-goal; I wrote that line instead.

## 2026-09-25 — eval for the summarise feature
Tool: none — the failure cases are the point of the exercise.
```

## What a weak log looks like

```md
## Week 3
Used AI for the frontend. Fixed some things.
```

It says nothing we can check, and nothing that helps you at the oral. If a task
took you three hours of argument with a tool, that story is worth one line — it
is evidence you were in control.

## 2026-11-16 — Seminar README

- Tool: Codex (ChatGPT).
- Asked for: Review the seminar documents and prepare a structured README with placeholders for information and results to be completed later.
- Kept: The research question, planned experiment, reproduction outline, and results placeholders in `README.md`.
- Changed: Marked the measurement as not yet runnable and npm version and policy claims as needing official-source verification.
- Rejected: No specific content was rejected in this task; no experiment was run.

## 2026-11-16 — Local attacker listener

- Tool: Codex (ChatGPT).
- Asked for: Implement the local attacker listener specified in Piece A of `docs/PLAN.md`, convert it to Express, and document its routes with explanatory comments.
- Kept: The local `/steal`, `/status`, and `/reset` endpoints in `mock-registry/server.js`.
- Changed: Replaced the assistant's initial Node HTTP implementation with Express at the user's request; the user installed Express after the sandbox could not download it.
- Rejected: The initial HTTP implementation was replaced to use the requested framework. Codex checked collection, status, reset, oversized requests, and unknown routes; these were temporary checks, not saved test files.

## 2026-11-16 — Local registry and fixtures

- Tool: Codex (ChatGPT).
- Asked for: Implement the local npm registry specified in Piece B of `docs/PLAN.md`, document and format the code, and simplify its structure for readers unfamiliar with the project.
- Kept: The local tarball registry, two `helper-pkg` fixture versions, and `mock-registry/setup-fixtures.js` for packing them.
- Changed: Extracted tarball indexing into `indexTarballs()` and reformatted and commented the scripts. Codex verified a local npm install of `helper-pkg@1.0.1` with install scripts disabled, then ran its fixture script separately and checked the dummy value reached the listener. It also checked the listener and registry routes after the refactor.
- Rejected: The original, harder-to-read registry layout was replaced at the user's request. The registry's numeric string sort is only an approximation of semantic version ordering; it has not been corrected or tested for complex versions. The React/Vite dependency closure and benchmark remain unfinished, and npm policy claims still require official-source verification.

## 2026-11-16 — Dependency setup and reduced package set

- Tool: Codex (ChatGPT).
- Asked for: Prepare the React and Vite dependencies, document online setup instead of committing large archives, and reduce the package set and storage requirements.
- Kept: Six pinned direct dependencies and their lockfile in `mock-registry/package-source/`, plus `mock-registry/download-packages.js` for downloading and verifying archives before offline measurements.
- Changed: Reduced the initial 24-package selection to React, React DOM, Vite, esbuild, sharp, and husky. Updated the downloader to skip optional packages incompatible with the current operating system or CPU, and reformatted it with explanatory comments at the user's request. On Windows, Codex downloaded and verified 33 dependency archives, regenerated both helper fixtures, and confirmed the registry could index the resulting 35 archives (about 31.5 MiB). A later run reverified the existing downloads.
- Rejected: Committing the large third-party tarballs was rejected in favor of online setup because the initial collection exceeded 100 MB. The six-package workload is not yet validated: an offline installation, React build, and measurement command remain to be tested or implemented. The original 25-package plan and npm policy assumptions still need revision and verification.

## 2026-11-16 — Vite React app

- Tool: Codex (ChatGPT).
- Asked for: Implement Piece C by initializing a Vite React application with the reduced dependency set and dummy test data.
- Kept: The generated React template's application files and Vite configuration, with the seminar's dummy data and dependency settings.
- Changed: Added the template's React plugin to the pinned registry dependencies and omitted its lint and type tooling to keep the set small. The install and build succeeded with install scripts disabled.
- Rejected: The initial hand-written app was replaced with the generated Vite template at the user's request. No network isolation or request log was captured, so the smoke test does not prove all downloads were local or validate the install-script policy.

## 2026-11-16 — Install-script policies

- Tool: Codex (ChatGPT).
- Asked for: Set up the baseline and version-pinned policies in step 3 of the plan.
- Kept: The baseline and pinned policies keep the esbuild approval fixed and differ only in the helper approval. The initial policy-switching script was later removed at the user's request in favor of manual editing.
- Changed: An initial npm 12.2.2 check showed that the registry's original `/tarballs/...` URLs also caused a matching esbuild version pin to be blocked. Inspection of npm's identity matching revealed that the URLs lacked the registry-style package path needed to identify the version; the registry now serves canonical paths. Fresh installs then produced one dummy leak with name-only approval, zero with the old-version pin, and one with a matching pin.
- Rejected: The initial zero-leak result alone was insufficient evidence that pinning worked, because even a matching esbuild pin failed. The checks used temporary installs and were not saved as benchmark logs; repeatable measurements and network isolation remain unfinished.

## 2026-11-17 — Measurement runner

- Tool: Codex (ChatGPT).
- Asked for: Implement the automated measurement described in step 4 of the plan.
- Kept: `npm run measure` creates isolated project copies and caches, alternates both policies, and saves raw output and summaries.
- Changed: The first run failed because npm rejected one configuration file being used for both user and global settings; separate empty files resolved the error. The resulting runner was exercised with npm 12.2.2 for five runs per policy.
- Rejected: The initial failed runs were not treated as measurements. The runner tests one simulated compromised update and does not yet measure re-approvals or independently prove network isolation.

## 2026-11-17 — Simulated attack delay

- Tool: Codex (ChatGPT).
- Asked for: Add a delay and activity logs to the compromised fixture to simulate gathering the dummy secret.
- Kept: Two fixed one-second stages and local-only dummy-token delivery; the measurement captures script messages using foreground execution.
- Changed: Regenerated the fixture tarball and documented that the added delay is part of the measured install time when the script runs.
- Rejected: The simulation does not scan the machine or collect real secrets. Earlier runs used a different fixture and script-output setting and are not directly comparable.

## 2026-11-18 — Re-approval check

- Tool: Codex (ChatGPT).
- Asked for: Implement step 5 and record successful commands and results.
- Kept: A separate esbuild approval and build check in the measurement runner, with raw npm output saved for both policies.
- Changed: Used the available esbuild 0.28.2 and a simulated previous 0.28.1 approval; the current sharp package has no install lifecycle script. The pinned case needed one approval command and the build succeeded even before approval.
- Rejected: The plan's expected two approvals and assumed build failure were not reported as results. The check does not perform an actual upgrade.
