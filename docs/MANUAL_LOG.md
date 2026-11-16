# Manual Log

**Running the Attacker Listener**

```sh
$ node mock-registry/server.js

Fake attacker listener running at http://127.0.0.1:4001
Local package registry running at http://127.0.0.1:4002
```

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