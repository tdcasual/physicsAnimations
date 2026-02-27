const test = require("node:test");
const assert = require("node:assert/strict");

const { scanUploadedHtmlRisk } = require("../server/lib/uploadSecurity");

test("scanUploadedHtmlRisk reports risky script patterns", () => {
  const html = `
<html>
  <head>
    <meta http-equiv="refresh" content="0;url=https://evil.example">
    <script src="https://cdn.example/a.js"></script>
    <link rel="stylesheet" href="//cdn.example/a.css">
    <base href="https://evil.example/">
  </head>
  <body>
    <script src="./local.js"></script>
    <button onclick="alert(1)">run</button>
    <h1>ok</h1>
  </body>
</html>`;

  const findings = scanUploadedHtmlRisk(html, { source: "index.html" });
  const codes = findings.map((row) => row.code);
  assert.equal(Array.isArray(findings), true);
  assert.ok(codes.includes("script_tag"));
  assert.ok(codes.includes("event_handler"));
  assert.ok(codes.includes("meta_refresh"));
  assert.ok(findings.some((row) => row.source === "index.html"));
});

test("scanUploadedHtmlRisk returns empty findings for simple safe html", () => {
  const html = `<html><head><title>ok</title></head><body><h1>safe</h1></body></html>`;
  const findings = scanUploadedHtmlRisk(html, { source: "safe.html" });
  assert.deepEqual(findings, []);
});
