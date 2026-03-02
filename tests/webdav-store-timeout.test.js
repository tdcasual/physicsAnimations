const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");

const { createWebdavStore } = require("../server/lib/contentStore/webdavStore");

async function withServer(handler, run) {
  const server = http.createServer(handler);
  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    await run(baseUrl);
  } finally {
    await new Promise((resolve) => {
      server.close(resolve);
    });
  }
}

test("webdav store falls back to safe default timeout when timeoutMs is invalid", async () => {
  await withServer(
    (_req, res) => {
      setTimeout(() => {
        res.writeHead(200, { "content-type": "application/octet-stream" });
        res.end("ok");
      }, 25);
    },
    async (baseUrl) => {
      const store = createWebdavStore({
        url: baseUrl,
        basePath: "physicsAnimations",
        timeoutMs: "abc",
      });

      const data = await store.readBuffer("probe.txt");
      assert.equal(data.toString("utf8"), "ok");
    },
  );
});

test("webdav store treats suffixed timeout strings as invalid and falls back to default", async () => {
  await withServer(
    (_req, res) => {
      setTimeout(() => {
        res.writeHead(200, { "content-type": "application/octet-stream" });
        res.end("ok");
      }, 1200);
    },
    async (baseUrl) => {
      const store = createWebdavStore({
        url: baseUrl,
        basePath: "physicsAnimations",
        timeoutMs: "15s",
      });

      const data = await store.readBuffer("probe.txt");
      assert.equal(data.toString("utf8"), "ok");
    },
  );
});

test("webdav store explicit empty credentials override env credentials", async () => {
  const prevUser = process.env.WEBDAV_USERNAME;
  const prevPass = process.env.WEBDAV_PASSWORD;
  process.env.WEBDAV_USERNAME = "env-user";
  process.env.WEBDAV_PASSWORD = "env-pass";

  try {
    await withServer(
      (req, res) => {
        const auth = req.headers.authorization || "";
        if (auth) {
          res.writeHead(401, { "content-type": "text/plain" });
          res.end("unexpected_auth");
          return;
        }
        res.writeHead(200, { "content-type": "application/octet-stream" });
        res.end("ok");
      },
      async (baseUrl) => {
        const store = createWebdavStore({
          url: baseUrl,
          basePath: "physicsAnimations",
          username: "",
          password: "",
          timeoutMs: 3000,
        });

        const data = await store.readBuffer("probe.txt");
        assert.equal(data.toString("utf8"), "ok");
      },
    );
  } finally {
    if (prevUser === undefined) delete process.env.WEBDAV_USERNAME;
    else process.env.WEBDAV_USERNAME = prevUser;
    if (prevPass === undefined) delete process.env.WEBDAV_PASSWORD;
    else process.env.WEBDAV_PASSWORD = prevPass;
  }
});

test("webdav store sends basic auth header when username is provided with empty password", async () => {
  await withServer(
    (req, res) => {
      const auth = req.headers.authorization || "";
      if (!auth) {
        res.writeHead(401, { "content-type": "text/plain" });
        res.end("missing_auth");
        return;
      }
      if (auth !== "Basic c29sby11c2VyOg==") {
        res.writeHead(401, { "content-type": "text/plain" });
        res.end("unexpected_auth");
        return;
      }
      res.writeHead(200, { "content-type": "application/octet-stream" });
      res.end("ok");
    },
    async (baseUrl) => {
      const store = createWebdavStore({
        url: baseUrl,
        basePath: "physicsAnimations",
        username: "solo-user",
        password: "",
        timeoutMs: 3000,
      });

      const data = await store.readBuffer("probe.txt");
      assert.equal(data.toString("utf8"), "ok");
    },
  );
});

test("webdav store rejects percent-encoded parent traversal segments in storage key", async () => {
  await withServer(
    (_req, res) => {
      res.writeHead(200, { "content-type": "application/octet-stream" });
      res.end("ok");
    },
    async (baseUrl) => {
      const store = createWebdavStore({
        url: baseUrl,
        basePath: "physicsAnimations",
        timeoutMs: 3000,
      });

      await assert.rejects(
        () => store.readBuffer("%2e%2e/escape.txt"),
        (err) => err?.message === "invalid_storage_key",
      );
    },
  );
});

test("webdav store rejects storage keys containing query or fragment markers", async () => {
  await withServer(
    (_req, res) => {
      res.writeHead(200, { "content-type": "application/octet-stream" });
      res.end("ok");
    },
    async (baseUrl) => {
      const store = createWebdavStore({
        url: baseUrl,
        basePath: "physicsAnimations",
        timeoutMs: 3000,
      });

      await assert.rejects(
        () => store.readBuffer("uploads/demo?x=1.html"),
        (err) => err?.message === "invalid_storage_key",
      );
      await assert.rejects(
        () => store.readBuffer("uploads/demo#part.html"),
        (err) => err?.message === "invalid_storage_key",
      );
    },
  );
});
