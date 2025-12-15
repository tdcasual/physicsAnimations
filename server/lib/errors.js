function createError(code, status = 400, details) {
  const err = new Error(code);
  err.status = status;
  if (details !== undefined) err.details = details;
  return err;
}

module.exports = {
  createError,
};

