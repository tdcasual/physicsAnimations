const test = require("node:test");
const assert = require("node:assert/strict");

const { getAuthConfig, issueToken } = require("../server/lib/auth");

test("auth config falls back when JWT_TTL_SECONDS is invalid", () => {
  const previous = process.env.JWT_TTL_SECONDS;
  process.env.JWT_TTL_SECONDS = "abc";

  try {
    const authConfig = getAuthConfig({ rootDir: process.cwd() });
    assert.equal(authConfig.tokenTtlSeconds, 28800);

    const token = issueToken({ username: authConfig.adminUsername, authConfig });
    assert.equal(typeof token, "string");
    assert.ok(token.length > 20);
  } finally {
    if (previous === undefined) delete process.env.JWT_TTL_SECONDS;
    else process.env.JWT_TTL_SECONDS = previous;
  }
});

test("auth config falls back when JWT_TTL_SECONDS is non-positive", () => {
  const previous = process.env.JWT_TTL_SECONDS;
  process.env.JWT_TTL_SECONDS = "-1";

  try {
    const authConfig = getAuthConfig({ rootDir: process.cwd() });
    assert.equal(authConfig.tokenTtlSeconds, 28800);
  } finally {
    if (previous === undefined) delete process.env.JWT_TTL_SECONDS;
    else process.env.JWT_TTL_SECONDS = previous;
  }
});

test("auth config ignores suffixed JWT_TTL_SECONDS and falls back", () => {
  const previous = process.env.JWT_TTL_SECONDS;
  process.env.JWT_TTL_SECONDS = "90s";

  try {
    const authConfig = getAuthConfig({ rootDir: process.cwd() });
    assert.equal(authConfig.tokenTtlSeconds, 28800);
  } finally {
    if (previous === undefined) delete process.env.JWT_TTL_SECONDS;
    else process.env.JWT_TTL_SECONDS = previous;
  }
});
