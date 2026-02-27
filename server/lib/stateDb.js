const { createStateDbStore } = require("./stateDb/storeFactory");
const { normalizeStateDbMode } = require("./stateDb/sqliteMirror");

module.exports = {
  createStateDbStore,
  normalizeStateDbMode,
};
