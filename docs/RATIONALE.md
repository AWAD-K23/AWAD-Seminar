# Rationale: Why We Chose "npm 12 Version-Pinned allowScripts"

## 1\. The Real-World Threat: The 2026 Supply-Chain Crisis

In recent years, the frontend ecosystem has faced a massive wave of supply-chain attacks targeting continuous integration (CI) environments and developer laptops. The most common attack vector is the abuse of **dependency lifecycle scripts** (specifically `preinstall` and `postinstall`).

When a developer or a CI runner executes `npm install`, these scripts historically run automatically with full system privileges. Attackers who compromised popular packages (or created typo-squatted clones) used these scripts to silently read `.env` files, harvest GitHub CI tokens, and exfiltrate credentials to remote servers before the build even started.

Recent high-profile 2026 campaigns highlight this ongoing threat:

* **The "GhostAction" & "wfx-loot" Campaigns (Late 2026):** Attackers hijacked maintainer GitHub accounts to inject secret-stealing `postinstall` scripts into legitimate packages, aiming to exfiltrate workflow secrets.  
* **The Axios and TanStack Compromises (Spring 2026):** Malicious versions of widely used libraries were published containing hidden `postinstall` hooks designed to harvest environment variables.

*See official advisories and background on these threat models:*

* [GitHub Security Blog: Supply Chain Security](https://github.blog/security/supply-chain-security/)  
* [GitHub Advisory Database (Filter: npm / Critical)](https://github.com/advisories?query=ecosystem%3Anpm)

## 2\. The 2026 Platform Shift: From All-or-Nothing to Version Pinning

The security community has long recommended using the `--ignore-scripts` flag. However, this legacy solution was "all-or-nothing"—it broke legitimate web build tools that require native binaries, like `esbuild` (used by Vite) or `sharp` (used for images). Developers rarely used it because configuring it was too painful.

This changed fundamentally in **July 2026 with the release of npm 12**.

`npm 12` introduced a major shift in web development security defaults: **install scripts are now disabled by default**. To fix broken builds, npm introduced **version-pinned `allowScripts`** via the `npm approve-scripts` command. Instead of blindly trusting a package forever, approvals are pinned to an exact version (e.g., `esbuild@0.25.0`). If a package pushes a minor update (like `0.25.1`), its scripts are paused until a human reviews and re-approves the change.

*Primary source for this platform change:*

* [npm v12.0.0 Release Notes](https://github.com/npm/cli/releases/tag/v12.0.0)  
* [npm CLI Documentation: npm-install-scripts](https://docs.npmjs.com/cli/v12/commands/npm-install-scripts)

## 3\. Our Seminar Question

To evaluate this new feature, we formulated a precise, measurable benchmark question for our OWN topic registration:

> *"In a 25-package React build, what percentage of simulated postinstall supply-chain attacks does npm 12’s version-pinned allowScripts block compared with unpinned allowlists, and how much build time (ms) and re-approvals (count) does it cost?"*

## 4\. Why This Fits the CSC13114 Rubric Perfectly

We chose this topic over others because it securely targets every requirement in the seminar rubric:

1. **It evaluates something genuinely new (Criterion 1 & 5):** We are not testing the decade-old `--ignore-scripts` flag. We are explicitly measuring the new version-pinned `allowScripts` workflow introduced in npm 12 (July 2026).  
2. **Clear Gain and Clear Cost (Criterion 1 & 3):** The security gain is absolute (% of secret leaks blocked). The cost is heavily relevant to Software Engineering students: build latency (measured in milliseconds) and developer friction (counted in manual re-approval steps).  
3. **100% Offline Reproducibility (Criterion 2):** Because we use a local Node.js mock registry (`localhost`) serving local `.tgz` tarballs, our `npm run measure` command is entirely deterministic. The red team can clone our repo, clear their cache, and reproduce our numbers without worrying about network latency, external API limits, or real malicious code.  
4. **Unique within the Class Vote (Criterion 4):** As of mid-November, the registered topics focus heavily on database performance (C3, C5) and CSS/UI features (D1). A live CI security demo showing an active secret exfiltration being blocked by npm 12 will stand out visually in the class vote.
