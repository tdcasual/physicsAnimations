const { createError } = require("./errors");

const ADMIN_STATE_KEY = "admin.json";
const stateLocks = new Map();
const NO_SAVE = Symbol("admin_state_no_save");

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

async function loadAdminState({ store }) {
  const raw = await store.readBuffer(ADMIN_STATE_KEY);
  if (!raw) return null;

  let parsed = null;
  try {
    parsed = JSON.parse(raw.toString("utf8"));
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object") return null;
  const username = typeof parsed.username === "string" ? parsed.username : "";
  const passwordHash = typeof parsed.passwordHash === "string" ? parsed.passwordHash : "";
  const updatedAt = typeof parsed.updatedAt === "string" ? parsed.updatedAt : "";
  if (!username || !passwordHash) return null;
  return {
    version: 1,
    username,
    passwordHash,
    updatedAt,
  };
}

async function saveAdminState({ store, state }) {
  if (!state?.username || !state?.passwordHash) {
    throw createError("invalid_admin_state", 500);
  }
  const payload = {
    version: 1,
    username: state.username,
    passwordHash: state.passwordHash,
    updatedAt: state.updatedAt || new Date().toISOString(),
  };
  const json = Buffer.from(`${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await store.writeBuffer(ADMIN_STATE_KEY, json, { contentType: "application/json; charset=utf-8" });
}

async function mutateAdminState({ store }, mutator) {
  return withStateLock(ADMIN_STATE_KEY, async () => {
    const state = (await loadAdminState({ store })) || {};
    const result = await mutator(state);
    if (result && result[NO_SAVE]) return result.value;
    await saveAdminState({ store, state });
    return result;
  });
}

module.exports = {
  loadAdminState,
  saveAdminState,
  mutateAdminState,
  noSave,
};
