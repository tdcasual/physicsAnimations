const test = require("node:test");
const assert = require("node:assert/strict");

test("items model utils expose normalize/safe/map helpers", async () => {
  const {
    normalizeCategoryId,
    safeText,
    toApiItem,
  } = require("../server/services/items/itemModel");

  assert.equal(typeof normalizeCategoryId, "function");
  assert.equal(typeof safeText, "function");
  assert.equal(typeof toApiItem, "function");
});

test("normalizeCategoryId and safeText keep fallback behavior", async () => {
  const {
    normalizeCategoryId,
    safeText,
  } = require("../server/services/items/itemModel");

  assert.equal(normalizeCategoryId(undefined), "other");
  assert.equal(normalizeCategoryId(""), "other");
  assert.equal(normalizeCategoryId(" optics "), "optics");
  assert.equal(safeText("ok"), "ok");
  assert.equal(safeText(123), "");
});

test("toApiItem maps builtin and dynamic items", async () => {
  const { toApiItem } = require("../server/services/items/itemModel");

  const builtin = toApiItem({
    id: "b1",
    type: "builtin",
    categoryId: "other",
    title: "Builtin",
    description: "",
    thumbnail: "",
    order: 0,
    published: true,
    hidden: false,
    deleted: true,
    createdAt: "",
    updatedAt: "",
  });
  assert.equal(builtin.src, "animations/b1");
  assert.equal(builtin.deleted, true);

  const link = toApiItem({
    id: "l1",
    type: "link",
    categoryId: "other",
    title: "Link",
    description: "",
    thumbnail: "",
    order: 0,
    published: true,
    hidden: false,
    url: "https://example.com",
    createdAt: "",
    updatedAt: "",
  });
  assert.equal(link.src, "https://example.com");
  assert.equal(link.deleted, false);

  const upload = toApiItem({
    id: "u1",
    type: "upload",
    categoryId: "other",
    title: "Upload",
    description: "",
    thumbnail: "",
    order: 0,
    published: true,
    hidden: false,
    path: "content/uploads/u1/index.html",
    createdAt: "",
    updatedAt: "",
  });
  assert.equal(upload.src, "content/uploads/u1/index.html");
  assert.equal(upload.deleted, false);
});
