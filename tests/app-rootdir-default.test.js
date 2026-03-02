const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");

const { createApp } = require("../server/app");

function makeAuthConfig() {
  return {
    adminUsername: "admin",
    adminPasswordHash: bcrypt.hashSync("secret", 10),
    jwtSecret: "test-secret",
    jwtSecretSource: "env",
    jwtIssuer: "physicsAnimations",
    jwtAudience: "physicsAnimations-web",
    tokenTtlSeconds: 3600,
  };
}

test("createApp falls back to default rootDir when omitted", () => {
  assert.doesNotThrow(() => {
    const app = createApp({ authConfig: makeAuthConfig() });
    assert.equal(typeof app?.use, "function");
  });
});
