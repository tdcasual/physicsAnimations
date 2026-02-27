function shouldSuppressSqliteWarning(warning, args) {
  const message = typeof warning === "string" ? warning : warning?.message;
  const warningName =
    (typeof warning === "object" && warning?.name) ||
    (typeof args?.[0] === "string" ? args[0] : "");

  return (
    warningName === "ExperimentalWarning" &&
    String(message || "").includes("SQLite is an experimental feature")
  );
}

function withSuppressedSqliteWarning(fn) {
  const originalEmitWarning = process.emitWarning;
  process.emitWarning = function patchedEmitWarning(warning, ...args) {
    if (shouldSuppressSqliteWarning(warning, args)) return;
    return originalEmitWarning.call(process, warning, ...args);
  };

  try {
    return fn();
  } finally {
    process.emitWarning = originalEmitWarning;
  }
}

function loadNodeSqlite() {
  try {
    return withSuppressedSqliteWarning(() => require("node:sqlite"));
  } catch {
    return null;
  }
}

module.exports = {
  loadNodeSqlite,
};
