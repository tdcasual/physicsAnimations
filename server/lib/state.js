const {
  CATEGORIES_STATE_KEY,
  BUILTIN_ITEMS_STATE_KEY,
  ITEM_TOMBSTONES_KEY,
  ITEMS_STATE_KEY,
  TAXONOMY_VERSION,
} = require("./state/constants");
const {
  emptyBuiltinItemsState,
  emptyCategoriesState,
  emptyItemsState,
  emptyItemTombstonesState,
  parseBuiltinItemsState,
  parseCategoriesState,
  parseItemsState,
  parseItemTombstonesState,
} = require("./state/parsers");
const { noSave, loadJsonState, saveJsonState, createStateMutator } = require("./state/storeOps");

async function loadItemsState({ store }) {
  return loadJsonState({
    store,
    key: ITEMS_STATE_KEY,
    emptyFactory: emptyItemsState,
    parser: parseItemsState,
  });
}

async function saveItemsState({ store, state }) {
  return saveJsonState({
    store,
    key: ITEMS_STATE_KEY,
    payload: {
      version: 2,
      items: Array.isArray(state?.items) ? state.items : [],
    },
  });
}

const mutateItemsState = createStateMutator({
  key: ITEMS_STATE_KEY,
  loadState: loadItemsState,
  saveState: saveItemsState,
});

async function loadCategoriesState({ store }) {
  return loadJsonState({
    store,
    key: CATEGORIES_STATE_KEY,
    emptyFactory: emptyCategoriesState,
    parser: parseCategoriesState,
  });
}

async function saveCategoriesState({ store, state }) {
  return saveJsonState({
    store,
    key: CATEGORIES_STATE_KEY,
    payload: {
      version: TAXONOMY_VERSION,
      groups: state?.groups && typeof state.groups === "object" ? state.groups : {},
      categories: state?.categories && typeof state.categories === "object" ? state.categories : {},
    },
  });
}

const mutateCategoriesState = createStateMutator({
  key: CATEGORIES_STATE_KEY,
  loadState: loadCategoriesState,
  saveState: saveCategoriesState,
});

async function loadBuiltinItemsState({ store }) {
  return loadJsonState({
    store,
    key: BUILTIN_ITEMS_STATE_KEY,
    emptyFactory: emptyBuiltinItemsState,
    parser: parseBuiltinItemsState,
  });
}

async function saveBuiltinItemsState({ store, state }) {
  return saveJsonState({
    store,
    key: BUILTIN_ITEMS_STATE_KEY,
    payload: {
      version: 1,
      items: state?.items && typeof state.items === "object" ? state.items : {},
    },
  });
}

const mutateBuiltinItemsState = createStateMutator({
  key: BUILTIN_ITEMS_STATE_KEY,
  loadState: loadBuiltinItemsState,
  saveState: saveBuiltinItemsState,
});

async function loadItemTombstonesState({ store }) {
  return loadJsonState({
    store,
    key: ITEM_TOMBSTONES_KEY,
    emptyFactory: emptyItemTombstonesState,
    parser: parseItemTombstonesState,
  });
}

async function saveItemTombstonesState({ store, state }) {
  return saveJsonState({
    store,
    key: ITEM_TOMBSTONES_KEY,
    payload: {
      version: 1,
      tombstones: state?.tombstones && typeof state.tombstones === "object" ? state.tombstones : {},
    },
  });
}

const mutateItemTombstonesState = createStateMutator({
  key: ITEM_TOMBSTONES_KEY,
  loadState: loadItemTombstonesState,
  saveState: saveItemTombstonesState,
});

module.exports = {
  loadItemsState,
  saveItemsState,
  mutateItemsState,
  loadCategoriesState,
  saveCategoriesState,
  mutateCategoriesState,
  loadBuiltinItemsState,
  saveBuiltinItemsState,
  mutateBuiltinItemsState,
  loadItemTombstonesState,
  saveItemTombstonesState,
  mutateItemTombstonesState,
  noSave,
};
