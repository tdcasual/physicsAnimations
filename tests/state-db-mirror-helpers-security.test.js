const test = require("node:test");
const assert = require("node:assert/strict");

const {
  parseDynamicItemsFromBuffer,
  parseBuiltinOverridesFromBuffer,
} = require("../server/lib/stateDb/mirrorHelpers");

test("parseDynamicItemsFromBuffer normalizes dangerous category ids", () => {
  const rows = parseDynamicItemsFromBuffer(
    Buffer.from(
      `${JSON.stringify(
        {
          version: 2,
          items: [
            {
              id: "u_1",
              type: "upload",
              categoryId: "__proto__",
              path: "content/uploads/u_1/index.html",
              title: "Unsafe",
            },
            {
              id: "u_2",
              type: "link",
              categoryId: "optics",
              url: "https://example.com",
              title: "Safe",
            },
          ],
        },
        null,
        2,
      )}\n`,
      "utf8",
    ),
  );

  assert.equal(rows.length, 2);
  assert.equal(rows[0].categoryId, "other");
  assert.equal(rows[1].categoryId, "optics");
});

test("parseBuiltinOverridesFromBuffer ignores prototype-pollution map keys", () => {
  const items = JSON.parse(
    '{"__proto__":{"title":"Poison"},"constructor":{"title":"Poison2"},"mechanics/a.html":{"title":"Safe"}}',
  );
  const overrides = parseBuiltinOverridesFromBuffer(
    Buffer.from(`${JSON.stringify({ version: 1, items }, null, 2)}\n`, "utf8"),
  );

  assert.equal(Object.getPrototypeOf(overrides), null);
  assert.deepEqual(Object.keys(overrides), ["mechanics/a.html"]);
  assert.equal(overrides["mechanics/a.html"].title, "Safe");
  assert.equal(overrides.__proto__, undefined);
});
