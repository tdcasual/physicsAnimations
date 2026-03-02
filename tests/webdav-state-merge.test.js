const test = require("node:test");
const assert = require("node:assert/strict");

const {
  mergeBuiltinItems,
  mergeCategories,
  mergeItemsAndTombstones,
} = require("../server/lib/webdavSync/stateMerge");

test("mergeItemsAndTombstones prefers newer remote item when ids collide", () => {
  const localItems = {
    version: 2,
    items: [
      {
        id: "u_1",
        type: "upload",
        title: "local",
        createdAt: "2026-02-01T00:00:00.000Z",
        updatedAt: "2026-02-01T00:00:00.000Z",
      },
    ],
  };
  const remoteItems = {
    version: 2,
    items: [
      {
        id: "u_1",
        type: "upload",
        title: "remote",
        createdAt: "2026-02-01T00:00:00.000Z",
        updatedAt: "2026-02-02T00:00:00.000Z",
      },
    ],
  };

  const out = mergeItemsAndTombstones(localItems, remoteItems, null, null);

  assert.equal(out.itemsState.items.length, 1);
  assert.equal(out.itemsState.items[0].title, "remote");
});

test("mergeItemsAndTombstones keeps local item when timestamp ties", () => {
  const localItems = {
    version: 2,
    items: [
      {
        id: "u_1",
        type: "upload",
        title: "local",
        createdAt: "2026-02-01T00:00:00.000Z",
        updatedAt: "2026-02-02T00:00:00.000Z",
      },
    ],
  };
  const remoteItems = {
    version: 2,
    items: [
      {
        id: "u_1",
        type: "upload",
        title: "remote",
        createdAt: "2026-02-01T00:00:00.000Z",
        updatedAt: "2026-02-02T00:00:00.000Z",
      },
    ],
  };

  const out = mergeItemsAndTombstones(localItems, remoteItems, null, null);

  assert.equal(out.itemsState.items.length, 1);
  assert.equal(out.itemsState.items[0].title, "local");
});

test("mergeItemsAndTombstones keeps newest duplicate entry within local state", () => {
  const localItems = {
    version: 2,
    items: [
      {
        id: "u_dup",
        type: "upload",
        title: "newest",
        createdAt: "2026-02-01T00:00:00.000Z",
        updatedAt: "2026-02-03T00:00:00.000Z",
      },
      {
        id: "u_dup",
        type: "upload",
        title: "stale",
        createdAt: "2026-02-01T00:00:00.000Z",
        updatedAt: "2026-02-02T00:00:00.000Z",
      },
    ],
  };

  const out = mergeItemsAndTombstones(localItems, { version: 2, items: [] }, null, null);

  assert.equal(out.itemsState.items.length, 1);
  assert.equal(out.itemsState.items[0].id, "u_dup");
  assert.equal(out.itemsState.items[0].title, "newest");
});

test("mergeBuiltinItems prefers newer remote override when ids collide", () => {
  const local = {
    version: 1,
    items: {
      "mechanics/demo.html": {
        title: "local",
        updatedAt: "2026-02-01T00:00:00.000Z",
      },
    },
  };
  const remote = {
    version: 1,
    items: {
      "mechanics/demo.html": {
        title: "remote",
        updatedAt: "2026-02-02T00:00:00.000Z",
      },
    },
  };

  const out = mergeBuiltinItems(local, remote);

  assert.equal(out.items["mechanics/demo.html"].title, "remote");
});

test("mergeBuiltinItems keeps local override when timestamp ties", () => {
  const local = {
    version: 1,
    items: {
      "mechanics/demo.html": {
        title: "local",
        updatedAt: "2026-02-02T00:00:00.000Z",
      },
    },
  };
  const remote = {
    version: 1,
    items: {
      "mechanics/demo.html": {
        title: "remote",
        updatedAt: "2026-02-02T00:00:00.000Z",
      },
    },
  };

  const out = mergeBuiltinItems(local, remote);

  assert.equal(out.items["mechanics/demo.html"].title, "local");
});

test("mergeCategories prefers newer remote category/group config when ids collide", () => {
  const local = {
    version: 2,
    groups: {
      physics: {
        title: "Local Group",
        updatedAt: "2026-02-01T00:00:00.000Z",
      },
    },
    categories: {
      optics: {
        title: "Local Category",
        updatedAt: "2026-02-01T00:00:00.000Z",
      },
    },
  };
  const remote = {
    version: 2,
    groups: {
      physics: {
        title: "Remote Group",
        updatedAt: "2026-02-02T00:00:00.000Z",
      },
    },
    categories: {
      optics: {
        title: "Remote Category",
        updatedAt: "2026-02-02T00:00:00.000Z",
      },
    },
  };

  const out = mergeCategories(local, remote);

  assert.equal(out.groups.physics.title, "Remote Group");
  assert.equal(out.categories.optics.title, "Remote Category");
});

test("mergeCategories keeps local config when timestamps tie", () => {
  const local = {
    version: 2,
    groups: {
      physics: {
        title: "Local Group",
        updatedAt: "2026-02-02T00:00:00.000Z",
      },
    },
    categories: {
      optics: {
        title: "Local Category",
        updatedAt: "2026-02-02T00:00:00.000Z",
      },
    },
  };
  const remote = {
    version: 2,
    groups: {
      physics: {
        title: "Remote Group",
        updatedAt: "2026-02-02T00:00:00.000Z",
      },
    },
    categories: {
      optics: {
        title: "Remote Category",
        updatedAt: "2026-02-02T00:00:00.000Z",
      },
    },
  };

  const out = mergeCategories(local, remote);

  assert.equal(out.groups.physics.title, "Local Group");
  assert.equal(out.categories.optics.title, "Local Category");
});

test("mergeBuiltinItems ignores prototype-pollution map keys from remote state", () => {
  const remoteItems = JSON.parse(
    '{"__proto__":{"title":"Poison","updatedAt":"2026-02-02T00:00:00.000Z"},"mechanics/demo.html":{"title":"Safe","updatedAt":"2026-02-03T00:00:00.000Z"}}',
  );

  const out = mergeBuiltinItems(
    { version: 1, items: {} },
    { version: 1, items: remoteItems },
  );

  assert.equal(Object.getPrototypeOf(out.items), null);
  assert.equal(out.items.__proto__, undefined);
  assert.deepEqual(Object.keys(out.items), ["mechanics/demo.html"]);
  assert.equal(out.items["mechanics/demo.html"].title, "Safe");
});

test("mergeCategories ignores dangerous group/category keys from remote state", () => {
  const remoteGroups = JSON.parse(
    '{"__proto__":{"title":"Poison","updatedAt":"2026-02-02T00:00:00.000Z"},"physics":{"title":"Remote Group","updatedAt":"2026-02-02T00:00:00.000Z"}}',
  );
  const remoteCategories = JSON.parse(
    '{"constructor":{"title":"Poison","updatedAt":"2026-02-02T00:00:00.000Z"},"optics":{"title":"Remote Category","updatedAt":"2026-02-02T00:00:00.000Z"}}',
  );

  const out = mergeCategories(
    { version: 2, groups: {}, categories: {} },
    { version: 2, groups: remoteGroups, categories: remoteCategories },
  );

  assert.equal(Object.getPrototypeOf(out.groups), null);
  assert.equal(Object.getPrototypeOf(out.categories), null);
  assert.equal(out.groups.__proto__, undefined);
  assert.equal(out.categories.constructor, undefined);
  assert.equal(out.groups.physics.title, "Remote Group");
  assert.equal(out.categories.optics.title, "Remote Category");
});

test("mergeItemsAndTombstones keeps epoch tombstones effective and does not resurrect deleted items", () => {
  const localItems = {
    version: 2,
    items: [
      {
        id: "u_epoch",
        type: "upload",
        title: "epoch",
        createdAt: "1970-01-01T00:00:00.000Z",
        updatedAt: "1970-01-01T00:00:00.000Z",
      },
    ],
  };

  const localTombstones = {
    version: 1,
    tombstones: {
      u_epoch: { deletedAt: "1970-01-01T00:00:00.000Z" },
    },
  };

  const out = mergeItemsAndTombstones(localItems, { version: 2, items: [] }, localTombstones, null);

  assert.equal(out.itemsState.items.some((item) => item.id === "u_epoch"), false);
  assert.equal(Boolean(out.tombstonesState.tombstones?.u_epoch), true);
});

test("mergeItemsAndTombstones treats epoch updatedAt as valid instead of falling back to createdAt", () => {
  const localItems = {
    version: 2,
    items: [
      {
        id: "u_time",
        type: "upload",
        title: "local",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "1970-01-01T00:00:00.000Z",
      },
    ],
  };
  const remoteItems = {
    version: 2,
    items: [
      {
        id: "u_time",
        type: "upload",
        title: "remote",
        createdAt: "1971-01-01T00:00:00.000Z",
        updatedAt: "1971-01-01T00:00:00.000Z",
      },
    ],
  };

  const out = mergeItemsAndTombstones(localItems, remoteItems, null, null);

  assert.equal(out.itemsState.items.length, 1);
  assert.equal(out.itemsState.items[0].title, "remote");
});
