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

test("normalizeStateDbMode rejects legacy alias values", () => {
  for (const value of ["false", "disabled", "0", "legacy"]) {
    assert.throws(() => normalizeStateDbMode(value), /invalid_state_db_mode/, `value=${value} must fail fast`);
  }
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

test("createStateDbStore rejects legacy STATE_DB_MODE aliases from env", () => {
  const previous = process.env.STATE_DB_MODE;
  process.env.STATE_DB_MODE = "disabled";

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
