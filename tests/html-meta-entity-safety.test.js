const test = require("node:test");
const assert = require("node:assert/strict");

const { extractHtmlTitleAndDescription } = require("../server/lib/htmlMeta");

test("extractHtmlTitleAndDescription ignores out-of-range numeric entities", () => {
  const out = extractHtmlTitleAndDescription(`
    <html>
      <head>
        <title>&#9999999999;</title>
        <meta name="description" content="normal description">
      </head>
    </html>
  `);

  assert.equal(typeof out.title, "string");
  assert.equal(out.title, "");
  assert.equal(out.description, "normal description");
});
