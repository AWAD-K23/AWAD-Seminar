# Defeating npm Supply-Chain Attacks: Version-Pinned allowScripts in Web Builds

> This document defines the selected title and research question. Its implementation details are the original proposal; the current experiment differs in attack count, package count, command names and upgrade assumptions. See [REPORT.md](../REPORT.md) and [README.md](../README.md) for measured scope and results. Claims below have not all been source-verified.

## 1\. Explanation in simple words

**In simple words:** When you run `npm install`, packages often use `"postinstall"` scripts to run terminal commands on your computer right after downloading. Previously, if you put a package on a "safe list," `npm` trusted that package *forever*—even if a hacker later hijacked it and released a new version. In **npm 12 (2026)**, install scripts are blocked by default, and approvals are **pinned to an exact version** (like `date-helper@1.0.0`). If that package updates to `1.0.1`, `npm` stops its scripts until you review and approve the new version.

**Concrete example:** Imagine your web app uses a helper package called `date-helper@1.0.0`, which you already checked and approved. One day, a hacker steals the package owner's password and pushes `date-helper@1.0.1` containing: `"postinstall": "node steal-secrets.js"`

- **Without version pinning (Baseline):** Because `date-helper` was already on your safe list, `npm` trusts `1.0.1` automatically. `steal-secrets.js` runs in the background, reads `API_KEY=12345` from your `.env` file, and sends it to the hacker.  
- **With npm 12 version-pinned `allowScripts` (Change):** `npm` sees that only `date-helper@1.0.0` was approved—not `1.0.1`—so `steal-secrets.js` is blocked and never runs.  
- **The catch (The cost):** Every time a legitimate tool like `esbuild` (used by Vite) or `sharp` (for image resizing) releases a normal bug-fix update, its setup script is also paused until you run `npm approve-scripts` again.

**What you build for the seminar:** You set up a Vite/React app on your own laptop with a fake password in `.env`, a local mock registry on `localhost`, and a simulated compromised update to an approved package. You run your measurement command at least 5 times with unpinned vs. version-pinned `allowScripts`, recording how many leaks get blocked, how build time changes in milliseconds, and how many re-approvals a developer has to do.

---

## 2\. Explanation in technical words

Most supply-chain attacks in web builds abuse lifecycle scripts (`preinstall`, `postinstall`) that silently execute during package installation. While older flags like `--ignore-scripts` were all-or-nothing, **npm 12 (2026)** turned install scripts off by default and introduced **version-pinned `allowScripts`** (`npm approve-scripts`), which locks script approval to an exact `package@version` rather than trusting all future updates of a package.

- **Title:** `Defeating npm Supply-Chain Attacks: Version-Pinned allowScripts in Web Builds`  
    
- **One-Line Question:** *"In a 25-package React build, what percentage of simulated postinstall supply-chain attacks does npm 12’s version-pinned allowScripts block compared with unpinned allowlists, and how much build time (ms) and re-approvals (count) does it cost?"*  
    
- **Tools You Need:** Node.js, `npm` v12+ (`allowScripts` / `npm approve-scripts`), a standard Vite/React starter app (25 packages including `esbuild`, `sharp`, `husky`), and a lightweight local Node.js mock registry \+ HTTP listener on `localhost` to catch mock `.env` tokens (running strictly on your own machine).  
    
- **Baseline vs. Change:**  
    
  - **Baseline:** Unpinned script allowlisting (`--no-allow-scripts-pin`), where an already-approved package (`helper-pkg@1.0.0`) is updated to a simulated compromised minor version (`helper-pkg@1.0.1`) containing a secret-stealing `postinstall` script.  
  - **Change:** The exact same project, packages, and update scenario, changing **only** the `allowScripts` policy to npm 12's default version-pinned mode (`helper-pkg@1.0.0`).


- **What `npm run measure` Measures (5+ Cold-Cache Runs, Median & Spread):**  
    
  - **Malicious update script block rate (`%` and `count`):** How many of the 3 seeded attack vectors (a compromised update to an approved package, a direct `preinstall`, and a nested transitive `postinstall`) are blocked from sending a dummy `.env` token to your local HTTP listener.  
  - **Silent breakage without an allowlist (`packages`):** How many legitimate packages fail to build (`esbuild`) or silently lose functionality (`sharp`, `husky`) before running `npm approve-scripts`.  
  - **Install \+ production build time (`ms`):** End-to-end wall-clock duration comparing baseline vs. version-pinned `allowScripts`.  
  - **Maintenance & re-approval overhead (`re-approval steps`):** Number of manual `npm approve-scripts` reviews triggered during routine minor/patch dependency updates.
