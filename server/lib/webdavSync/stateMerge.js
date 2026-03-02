const FORBIDDEN_OBJECT_KEYS = new Set(["__proto__", "prototype", "constructor"]);

function toTimeMs(value) {
  if (typeof value !== "string" || !value.trim()) return 0;
  const date = new Date(value);
  const ms = date.getTime();
  if (Number.isNaN(ms)) return 0;
  return ms;
}

function hasValidTime(value) {
  if (typeof value !== "string") return false;
  const normalized = value.trim();
  if (!normalized) return false;
  return Number.isFinite(Date.parse(normalized));
}

function resolveItemTimeMs(item) {
  if (hasValidTime(item?.updatedAt)) return toTimeMs(item.updatedAt);
  if (hasValidTime(item?.createdAt)) return toTimeMs(item.createdAt);
  return 0;
}

function keepNewerItemById(map, item) {
  const id = typeof item?.id === "string" ? item.id : "";
  if (!id) return;
  const current = map.get(id);
  if (!current) {
    map.set(id, item);
    return;
  }
  if (resolveItemTimeMs(item) > resolveItemTimeMs(current)) {
    map.set(id, item);
  }
}

function isSafeMapKey(value) {
  const key = String(value || "");
  if (!key) return false;
  if (FORBIDDEN_OBJECT_KEYS.has(key)) return false;
  return true;
}

function sanitizeObjectMap(rawMap) {
  const source = rawMap && typeof rawMap === "object" ? rawMap : {};
  const out = Object.create(null);
  for (const [id, value] of Object.entries(source)) {
    if (!isSafeMapKey(id)) continue;
    out[id] = value;
  }
  return out;
}

function normalizeItemsState(raw) {
  if (!raw || typeof raw !== "object") return { version: 2, items: [] };
  const items = Array.isArray(raw.items) ? raw.items.filter((it) => it && typeof it === "object") : [];
  return { version: 2, items };
}

function normalizeBuiltinItemsState(raw) {
  if (!raw || typeof raw !== "object") return { version: 1, items: Object.create(null) };
  const items = sanitizeObjectMap(raw.items);
  return { version: 1, items };
}

function normalizeCategoriesState(raw) {
  if (!raw || typeof raw !== "object") return { version: 2, groups: Object.create(null), categories: Object.create(null) };
  const groups = sanitizeObjectMap(raw.groups);
  const categories = sanitizeObjectMap(raw.categories);
  return { version: 2, groups, categories };
}

function normalizeTombstonesState(raw) {
  if (!raw || typeof raw !== "object") return { version: 1, tombstones: Object.create(null) };
  const tombstones = sanitizeObjectMap(raw.tombstones);
  return { version: 1, tombstones };
}

function mergeBuiltinItems(localRaw, remoteRaw) {
  const local = normalizeBuiltinItemsState(localRaw);
  const remote = normalizeBuiltinItemsState(remoteRaw);
  const out = Object.create(null);

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
    const localTime = toTimeMs(localEntry?.updatedAt);
    const remoteTime = toTimeMs(remoteEntry?.updatedAt);
    out[id] = remoteTime > localTime ? remoteEntry : localEntry;
  }

  return { version: 1, items: out };
}

function mergeCategories(localRaw, remoteRaw) {
  const local = normalizeCategoriesState(localRaw);
  const remote = normalizeCategoriesState(remoteRaw);

  function mergeConfigMap(localMap, remoteMap) {
    const out = Object.create(null);
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
      const localTime = toTimeMs(localEntry?.updatedAt);
      const remoteTime = toTimeMs(remoteEntry?.updatedAt);
      out[id] = remoteTime > localTime ? remoteEntry : localEntry;
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

  const mergedTombstones = Object.create(null);
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
    keepNewerItemById(localById, item);
  }
  const remoteById = new Map();
  for (const item of remoteState.items) {
    keepNewerItemById(remoteById, item);
  }

  const ids = new Set([...localById.keys(), ...remoteById.keys(), ...Object.keys(mergedTombstones)]);
  const mergedItems = [];
  const nextTombstones = Object.create(null);
  let deleted = 0;
  const conflicts = [];

  for (const id of ids) {
    const localItem = localById.get(id) || null;
    const remoteItem = remoteById.get(id) || null;
    const tomb = mergedTombstones[id] || null;

    const localTime = resolveItemTimeMs(localItem);
    const remoteTime = resolveItemTimeMs(remoteItem);
    const deletedAt = tomb?.deletedAt;
    const deletedTime = toTimeMs(deletedAt);

    if (hasValidTime(deletedAt) && deletedTime >= localTime && deletedTime >= remoteTime) {
      deleted += 1;
      nextTombstones[id] = { deletedAt: tomb.deletedAt };
      continue;
    }

    let resolved = null;
    if (localItem && remoteItem) {
      const localType = String(localItem.type || "");
      const remoteType = String(remoteItem.type || "");
      if (localType && remoteType && localType !== remoteType) {
        conflicts.push({ id, kind: "type_mismatch", localType, remoteType });
      }
      resolved = remoteTime > localTime ? remoteItem : localItem;
    } else if (localItem) {
      resolved = localItem;
    } else if (remoteItem) {
      resolved = remoteItem;
    }

    if (resolved) mergedItems.push(resolved);
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
