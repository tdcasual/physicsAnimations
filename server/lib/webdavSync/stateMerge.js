function toTimeMs(value) {
  if (typeof value !== "string" || !value.trim()) return 0;
  const date = new Date(value);
  const ms = date.getTime();
  if (Number.isNaN(ms)) return 0;
  return ms;
}

function normalizeItemsState(raw) {
  if (!raw || typeof raw !== "object") return { version: 2, items: [] };
  const items = Array.isArray(raw.items) ? raw.items.filter((it) => it && typeof it === "object") : [];
  return { version: 2, items };
}

function normalizeBuiltinItemsState(raw) {
  if (!raw || typeof raw !== "object") return { version: 1, items: {} };
  const items = raw.items && typeof raw.items === "object" ? raw.items : {};
  return { version: 1, items };
}

function normalizeCategoriesState(raw) {
  if (!raw || typeof raw !== "object") return { version: 2, groups: {}, categories: {} };
  const groups = raw.groups && typeof raw.groups === "object" ? raw.groups : {};
  const categories = raw.categories && typeof raw.categories === "object" ? raw.categories : {};
  return { version: 2, groups, categories };
}

function normalizeTombstonesState(raw) {
  if (!raw || typeof raw !== "object") return { version: 1, tombstones: {} };
  const tombstones = raw.tombstones && typeof raw.tombstones === "object" ? raw.tombstones : {};
  return { version: 1, tombstones };
}

function mergeBuiltinItems(localRaw, remoteRaw) {
  const local = normalizeBuiltinItemsState(localRaw);
  const remote = normalizeBuiltinItemsState(remoteRaw);
  const out = {};

  const ids = new Set([...Object.keys(remote.items || {}), ...Object.keys(local.items || {})]);
  for (const id of ids) {
    const localEntry = local.items?.[id] && typeof local.items[id] === "object" ? local.items[id] : null;
    const remoteEntry = remote.items?.[id] && typeof remote.items[id] === "object" ? remote.items[id] : null;

    if (localEntry && !remoteEntry) {
      out[id] = localEntry;
      continue;
    }
    if (!localEntry && remoteEntry) {
      out[id] = remoteEntry;
      continue;
    }
    if (!localEntry && !remoteEntry) continue;
    out[id] = localEntry;
  }

  return { version: 1, items: out };
}

function mergeCategories(localRaw, remoteRaw) {
  const local = normalizeCategoriesState(localRaw);
  const remote = normalizeCategoriesState(remoteRaw);

  function mergeConfigMap(localMap, remoteMap) {
    const out = {};
    const ids = new Set([...Object.keys(remoteMap || {}), ...Object.keys(localMap || {})]);
    for (const id of ids) {
      const localEntry = localMap?.[id] && typeof localMap[id] === "object" ? localMap[id] : null;
      const remoteEntry = remoteMap?.[id] && typeof remoteMap[id] === "object" ? remoteMap[id] : null;

      if (localEntry && !remoteEntry) {
        out[id] = localEntry;
        continue;
      }
      if (!localEntry && remoteEntry) {
        out[id] = remoteEntry;
        continue;
      }
      if (!localEntry && !remoteEntry) continue;
      out[id] = localEntry;
    }
    return out;
  }

  return {
    version: 2,
    groups: mergeConfigMap(local.groups, remote.groups),
    categories: mergeConfigMap(local.categories, remote.categories),
  };
}

function mergeItemsAndTombstones(localItemsRaw, remoteItemsRaw, localTombRaw, remoteTombRaw) {
  const localState = normalizeItemsState(localItemsRaw);
  const remoteState = normalizeItemsState(remoteItemsRaw);
  const localTomb = normalizeTombstonesState(localTombRaw);
  const remoteTomb = normalizeTombstonesState(remoteTombRaw);

  const mergedTombstones = {};
  const tombIds = new Set([...Object.keys(remoteTomb.tombstones || {}), ...Object.keys(localTomb.tombstones || {})]);
  for (const id of tombIds) {
    const localEntry = localTomb.tombstones?.[id] && typeof localTomb.tombstones[id] === "object" ? localTomb.tombstones[id] : null;
    const remoteEntry = remoteTomb.tombstones?.[id] && typeof remoteTomb.tombstones[id] === "object" ? remoteTomb.tombstones[id] : null;
    const localTime = toTimeMs(localEntry?.deletedAt);
    const remoteTime = toTimeMs(remoteEntry?.deletedAt);
    if (localTime > remoteTime) mergedTombstones[id] = { deletedAt: localEntry.deletedAt };
    else if (remoteTime > localTime) mergedTombstones[id] = { deletedAt: remoteEntry.deletedAt };
    else if (localEntry?.deletedAt) mergedTombstones[id] = { deletedAt: localEntry.deletedAt };
    else if (remoteEntry?.deletedAt) mergedTombstones[id] = { deletedAt: remoteEntry.deletedAt };
  }

  const localById = new Map();
  for (const item of localState.items) {
    const id = typeof item.id === "string" ? item.id : "";
    if (id) localById.set(id, item);
  }
  const remoteById = new Map();
  for (const item of remoteState.items) {
    const id = typeof item.id === "string" ? item.id : "";
    if (id) remoteById.set(id, item);
  }

  const ids = new Set([...localById.keys(), ...remoteById.keys(), ...Object.keys(mergedTombstones)]);
  const mergedItems = [];
  const nextTombstones = {};
  let deleted = 0;
  const conflicts = [];

  for (const id of ids) {
    const localItem = localById.get(id) || null;
    const remoteItem = remoteById.get(id) || null;
    const tomb = mergedTombstones[id] || null;

    const localTime = toTimeMs(localItem?.updatedAt) || toTimeMs(localItem?.createdAt);
    const remoteTime = toTimeMs(remoteItem?.updatedAt) || toTimeMs(remoteItem?.createdAt);
    const deletedTime = toTimeMs(tomb?.deletedAt);

    if (deletedTime && deletedTime >= localTime && deletedTime >= remoteTime) {
      deleted += 1;
      nextTombstones[id] = { deletedAt: tomb.deletedAt };
      continue;
    }

    if (localItem && remoteItem) {
      const localType = String(localItem.type || "");
      const remoteType = String(remoteItem.type || "");
      if (localType && remoteType && localType !== remoteType) {
        conflicts.push({ id, kind: "type_mismatch", localType, remoteType });
      }
    }
    if (localItem) {
      mergedItems.push(localItem);
    } else if (remoteItem) {
      mergedItems.push(remoteItem);
    }
  }

  mergedItems.sort((a, b) => {
    const timeDiff = String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
    if (timeDiff) return timeDiff;
    return String(a.id || "").localeCompare(String(b.id || ""));
  });

  return {
    itemsState: { version: 2, items: mergedItems },
    tombstonesState: { version: 1, tombstones: nextTombstones },
    deleted,
    conflicts,
  };
}

module.exports = {
  toTimeMs,
  mergeBuiltinItems,
  mergeCategories,
  mergeItemsAndTombstones,
};
