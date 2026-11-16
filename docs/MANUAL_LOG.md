# Manual Log

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

**Accessing the `/helper-pkg` endpoint shows the tarball for the `helper-pkg` fixture:**

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
