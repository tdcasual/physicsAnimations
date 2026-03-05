const test = require("node:test");
const assert = require("node:assert/strict");

const { parseHtmlRefs, parseHtmlMediaRefs, parseHtmlInlineStyleRefs } = require("../server/services/library/core/parsers/htmlRefs");
const { parseJsRefs } = require("../server/services/library/core/parsers/jsRefs");
const { parseCssRefs } = require("../server/services/library/core/parsers/cssRefs");
const { normalizeSyncOptions } = require("../server/services/library/core/syncOptions");

test("html parsers collect script/link/media refs and inline style refs", () => {
  const html = `
    <!doctype html>
    <html>
      <head>
        <script src="./assets/main.js"></script>
        <link rel="stylesheet" href="./assets/main.css" />
        <style>.hero{background:url("./assets/bg(1).png")}</style>
      </head>
      <body style="background:url(./assets/body.png)">
        <img src="./assets/logo.png" srcset="./assets/logo@1x.png 1x, ./assets/logo@2x.png 2x" />
        <video poster="./assets/poster.jpg"><source src="./assets/demo.mp4" /></video>
      </body>
    </html>
  `;

  assert.deepEqual(parseHtmlRefs(html), ["./assets/main.js", "./assets/main.css"]);
  assert.deepEqual(parseHtmlMediaRefs(html), [
    "./assets/logo.png",
    "./assets/logo@1x.png",
    "./assets/logo@2x.png",
    "./assets/poster.jpg",
    "./assets/demo.mp4",
  ]);
  assert.deepEqual(parseHtmlInlineStyleRefs(html), ["./assets/bg(1).png", "./assets/body.png"]);
});

test("js parser resolves static imports and dynamic import options form", () => {
  const code = `
    import "./dep-a.js";
    const dep = import("./dep-b.js", { with: { type: "json" } });
    const worker = new URL("./worker.js", import.meta.url);
  `;

  assert.deepEqual(parseJsRefs(code).sort(), ["./dep-a.js", "./dep-b.js", "./worker.js"]);
});

test("css parser resolves url/import refs and de-duplicates output", () => {
  const css = `
    @import "./theme/base.css";
    @import url("./theme/base.css");
    .hero{background:url("./assets/bg(1).png")}
    .icon{mask:url(./assets/icon.svg)}
  `;

  assert.deepEqual(parseCssRefs(css).sort(), ["./assets/bg(1).png", "./assets/icon.svg", "./theme/base.css"]);
});

test("normalizeSyncOptions enforces numeric ranges and boolean fallback", () => {
  const fallback = {
    maxFiles: 120,
    maxTotalBytes: 25 * 1024 * 1024,
    maxFileBytes: 8 * 1024 * 1024,
    timeoutMs: 12000,
    concurrency: 4,
    keepReleases: 3,
    retryMaxAttempts: 3,
    retryBaseDelayMs: 80,
    strictSelfCheck: true,
  };

  const out = normalizeSyncOptions(
    {
      maxFiles: 10,
      maxTotalBytes: "oops",
      maxFileBytes: 2048,
      timeoutMs: 9,
      concurrency: 2,
      keepReleases: 1,
      retryMaxAttempts: 99,
      retryBaseDelayMs: 16,
      strictSelfCheck: "off",
    },
    fallback,
  );

  assert.equal(out.maxFiles, 10);
  assert.equal(out.maxTotalBytes, fallback.maxTotalBytes);
  assert.equal(out.maxFileBytes, 2048);
  assert.equal(out.timeoutMs, fallback.timeoutMs);
  assert.equal(out.concurrency, 2);
  assert.equal(out.keepReleases, 1);
  assert.equal(out.retryMaxAttempts, fallback.retryMaxAttempts);
  assert.equal(out.retryBaseDelayMs, 16);
  assert.equal(out.strictSelfCheck, false);
});
