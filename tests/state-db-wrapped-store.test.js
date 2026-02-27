const test = require("node:test");
const assert = require("node:assert/strict");

const { createStateDbWrappedStore } = require("../server/lib/stateDb/wrappedStore");

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
