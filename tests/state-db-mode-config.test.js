const test = require("node:test");
const assert = require("node:assert/strict");

const { normalizeStateDbMode } = require("../server/lib/stateDb/mirrorHelpers");
const { createStateDbStore } = require("../server/lib/stateDb/storeFactory");

function createStoreStub() {
  return {
    async readBuffer() {
      return null;
    },
    async writeBuffer() {},
    async deletePath() {},
    async createReadStream() {
      return null;
    },
  };
}

test("normalizeStateDbMode rejects unsupported non-empty value", () => {
  assert.throws(() => normalizeStateDbMode("sqlite_mirror"), /invalid_state_db_mode/);
});

test("createStateDbStore throws when STATE_DB_MODE from env is invalid", () => {
  const previous = process.env.STATE_DB_MODE;
  process.env.STATE_DB_MODE = "sqlite_mirror";

  try {
    assert.throws(
      () =>
        createStateDbStore({
          rootDir: process.cwd(),
          store: createStoreStub(),
          mode: undefined,
        }),
      /invalid_state_db_mode/,
    );
  } finally {
    if (previous === undefined) delete process.env.STATE_DB_MODE;
    else process.env.STATE_DB_MODE = previous;
  }
});
