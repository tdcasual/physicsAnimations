const test = require("node:test");
const assert = require("node:assert/strict");

test("buildCustomEmbedHtml escapes script-breaker payloads in runtime options", async () => {
  const { buildCustomEmbedHtml } = require("../server/services/library/viewerRenderService");

  const payload = "</script><script>window.__xss=1</script>";
  const html = buildCustomEmbedHtml({
    profile: {
      scriptUrl: "/content/library/vendor/custom/embed.js",
      constructorName: "DemoApp",
    },
    assetPublicFileUrl: "/content/library/assets/a1/source/demo.bin",
    title: "Demo",
    embedOptions: {
      payload,
    },
  });

  assert.equal(html.includes(payload), false);
  assert.match(html, /\\u003c\/script\\u003e\\u003cscript\\u003ewindow\.__xss=1\\u003c\/script\\u003e/);
});

test("buildCustomEmbedHtml escapes unsafe html in title", async () => {
  const { buildCustomEmbedHtml } = require("../server/services/library/viewerRenderService");

  const payload = "</title><script>window.__xss_title=1</script><title>";
  const html = buildCustomEmbedHtml({
    profile: {
      scriptUrl: "/content/library/vendor/custom/embed.js",
      constructorName: "DemoApp",
    },
    assetPublicFileUrl: "/content/library/assets/a1/source/demo.bin",
    title: payload,
    embedOptions: {},
  });

  assert.equal(html.includes(payload), false);
  assert.equal(html.includes("<script>window.__xss_title=1</script>"), false);
  assert.match(html, /&lt;\/title&gt;&lt;script&gt;window\.__xss_title=1&lt;\/script&gt;&lt;title&gt;/);
});
