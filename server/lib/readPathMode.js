function parseReadPathMode(raw) {
  const value = String(raw ?? "").trim().toLowerCase();
  if (!value) return "sql_only";
  if (value === "sql_only") return value;

  const err = new Error("invalid_read_path_mode");
  err.code = "INVALID_READ_PATH_MODE";
  throw err;
}

module.exports = {
  parseReadPathMode,
};
