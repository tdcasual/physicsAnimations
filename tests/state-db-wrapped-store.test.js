const test = require("node:test");
const assert = require("node:assert/strict");
const { Readable } = require("node:stream");

const { createStateDbWrappedStore } = require("../server/lib/stateDb/wrappedStore");

async function streamToString(stream) {
  if (!stream) return "";
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function createWrappedStore({
  baseStore,
  mirror,
  getDynamicIndexedReady = () => false,
  setDynamicIndexedReady = () => {},
  getBuiltinIndexedReady = () => false,
  setBuiltinIndexedReady = () => {},
  setBuiltinOverridesDirty = () => {},
} = {}) {
  return createStateDbWrappedStore({
    store: baseStore,
    info: { circuitOpen: false },
    stateDbQuery: {},
    mirrorOps: {
      isStateBlobKey: (key) => key === "items.json" || key === "builtin_items.json",
      normalizeKey: (key) => key,
      isUsable: () => true,
      runMirrorOperation: (_operation, fn) => fn(),
      mirror,
      rootDir: process.cwd(),
      BUILTIN_ITEMS_STATE_KEY: "builtin_items.json",
      getAnimationsSignature: () => "",
      getDynamicIndexedReady,
      setDynamicIndexedReady,
      getBuiltinIndexedReady,
      setBuiltinIndexedReady,
      setBuiltinOverridesDirty,
      setBuiltinAnimationsSignature: () => {},
    },
  });
}

test("wrapped store proxies non-state blobs directly", async () => {
  const base = {
    mode: "local",
    readOnly: false,
    async readBuffer(key) {
      return Buffer.from(String(key));
    },
    async writeBuffer() {},
    async deletePath() {},
    async createReadStream() {
      return null;
    },
  };

  const wrapped = createStateDbWrappedStore({
    store: base,
    info: { circuitOpen: false },
    stateDbQuery: {},
    mirrorOps: {
      isStateBlobKey: () => false,
      normalizeKey: (key) => key,
      isUsable: () => true,
      runMirrorOperation: (_operation, fn) => fn(),
      mirror: { readBuffer: () => null },
      rootDir: process.cwd(),
      BUILTIN_ITEMS_STATE_KEY: "builtin_items.json",
      getAnimationsSignature: () => "",
      getDynamicIndexedReady: () => false,
      setDynamicIndexedReady: () => {},
      getBuiltinIndexedReady: () => false,
      setBuiltinIndexedReady: () => {},
      getBuiltinOverridesDirty: () => false,
      setBuiltinOverridesDirty: () => {},
      setBuiltinAnimationsSignature: () => {},
    },
  });

  const buf = await wrapped.readBuffer("uploads/a.txt");
  assert.equal(buf.toString("utf8"), "uploads/a.txt");
});

test("wrapped store marks dynamic index dirty when mirror write fails on items.json write", async () => {
  const dynamicReadyUpdates = [];

  const baseStore = {
    mode: "local",
    readOnly: false,
    async readBuffer() {
      return null;
    },
    async writeBuffer() {},
    async deletePath() {},
    async createReadStream() {
      return null;
    },
  };

  const wrapped = createWrappedStore({
    baseStore,
    mirror: {
      readBuffer: () => null,
      writeBuffer: () => {
        throw new Error("mirror_write_failed");
      },
      syncDynamicItemsFromBuffer: () => {},
      syncBuiltinItems: () => {},
      deletePath: () => {},
      clearDynamicItems: () => {},
    },
    getDynamicIndexedReady: () => true,
    setDynamicIndexedReady: (value) => {
      dynamicReadyUpdates.push(Boolean(value));
    },
  });

  await wrapped.writeBuffer("items.json", Buffer.from('{"version":2,"items":[]}'));

  assert.deepEqual(dynamicReadyUpdates, [false]);
});

test("wrapped store marks dynamic index dirty when mirror write-through fails on items.json read", async () => {
  const dynamicReadyUpdates = [];
  const raw = Buffer.from('{"version":2,"items":[{"id":"x"}]}');

  const baseStore = {
    mode: "local",
    readOnly: false,
    async readBuffer() {
      return raw;
    },
    async writeBuffer() {},
    async deletePath() {},
    async createReadStream() {
      return null;
    },
  };

  const wrapped = createWrappedStore({
    baseStore,
    mirror: {
      readBuffer: () => null,
      writeBuffer: () => {
        throw new Error("mirror_write_failed");
      },
      syncDynamicItemsFromBuffer: () => {},
      syncBuiltinItems: () => {},
      deletePath: () => {},
      clearDynamicItems: () => {},
    },
    getDynamicIndexedReady: () => true,
    setDynamicIndexedReady: (value) => {
      dynamicReadyUpdates.push(Boolean(value));
    },
  });

  const out = await wrapped.readBuffer("items.json");

  assert.equal(out, raw);
  assert.deepEqual(dynamicReadyUpdates, [false]);
});

test("wrapped store prefers source state blob over stale mirror cache after write-through failure", async () => {
  const stale = Buffer.from('{"version":2,"items":[{"id":"stale"}]}\n', "utf8");
  const fresh = Buffer.from('{"version":2,"items":[{"id":"fresh"}]}\n', "utf8");
  let source = stale;

  const baseStore = {
    mode: "local",
    readOnly: false,
    async readBuffer() {
      return source;
    },
    async writeBuffer(_key, buffer) {
      source = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || "");
    },
    async deletePath() {},
    async createReadStream() {
      return null;
    },
  };

  const wrapped = createWrappedStore({
    baseStore,
    mirror: {
      readBuffer: () => stale,
      writeBuffer: () => {
        throw new Error("mirror_write_failed");
      },
      syncDynamicItemsFromBuffer: () => {},
      syncBuiltinItems: () => {},
      deletePath: () => {},
      clearDynamicItems: () => {},
    },
    getDynamicIndexedReady: () => true,
    setDynamicIndexedReady: () => {},
  });

  await wrapped.writeBuffer("items.json", fresh);
  const out = await wrapped.readBuffer("items.json");
  assert.equal(out.toString("utf8"), fresh.toString("utf8"));
});

test("wrapped store createReadStream should prefer source state blob over stale mirror cache", async () => {
  const stale = Buffer.from('{"version":2,"items":[{"id":"stale"}]}\n', "utf8");
  const fresh = Buffer.from('{"version":2,"items":[{"id":"fresh"}]}\n', "utf8");

  const baseStore = {
    mode: "local",
    readOnly: false,
    async readBuffer() {
      return fresh;
    },
    async writeBuffer() {},
    async deletePath() {},
    async createReadStream() {
      return Readable.from([fresh]);
    },
  };

  const wrapped = createWrappedStore({
    baseStore,
    mirror: {
      readBuffer: () => stale,
      writeBuffer: () => {},
      syncDynamicItemsFromBuffer: () => {},
      syncBuiltinItems: () => {},
      deletePath: () => {},
      clearDynamicItems: () => {},
    },
    getDynamicIndexedReady: () => true,
    setDynamicIndexedReady: () => {},
  });

  const stream = await wrapped.createReadStream("items.json");
  const body = await streamToString(stream);
  assert.equal(body, fresh.toString("utf8"));
});
