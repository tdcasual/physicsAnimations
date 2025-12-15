const { z } = require("zod");
const { createError } = require("./errors");

function formatZodIssues(error) {
  if (!error?.issues) return [];
  return error.issues.map((issue) => ({
    path: Array.isArray(issue.path) ? issue.path.join(".") : "",
    code: issue.code,
    message: issue.message,
  }));
}

function parseWithSchema(schema, value) {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  throw createError("invalid_input", 400, { issues: formatZodIssues(result.error) });
}

const idSchema = z.string().min(1).max(128);

module.exports = {
  parseWithSchema,
  idSchema,
};

