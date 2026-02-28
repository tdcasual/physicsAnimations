const stateLocks = new Map();
const NO_SAVE = Symbol("state_no_save");

function noSave(value) {
  return { [NO_SAVE]: true, value };
}

async function withStateLock(key, fn) {
  const previous = stateLocks.get(key) || Promise.resolve();
  let release = () => {};
  const current = new Promise((resolve) => {
    release = resolve;
  });
  stateLocks.set(key, current);

  await previous;
  try {
    return await fn();
  } finally {
    release();
    if (stateLocks.get(key) === current) stateLocks.delete(key);
  }
}

async function loadJsonState({ store, key, emptyFactory, parser }) {
  const raw = await store.readBuffer(key);
  if (!raw) return emptyFactory();

  let parsed = null;
  try {
    parsed = JSON.parse(raw.toString("utf8"));
  } catch {
    return emptyFactory();
  }

  return parser(parsed);
}

async function saveJsonState({ store, key, payload }) {
  const json = Buffer.from(`${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await store.writeBuffer(key, json, { contentType: "application/json; charset=utf-8" });
}

function createStateMutator({ key, loadState, saveState }) {
  return async function mutateState({ store }, mutator) {
    return withStateLock(key, async () => {
      const state = await loadState({ store });
      const result = await mutator(state);
      if (result && result[NO_SAVE]) return result.value;
      await saveState({ store, state });
      return result;
    });
  };
}

module.exports = {
  noSave,
  loadJsonState,
  saveJsonState,
  createStateMutator,
};
