const test = require("node:test");
const assert = require("node:assert/strict");

const LOGGER_PATH = "../server/lib/logger";
const REQUEST_CONTEXT_PATH = "../server/lib/requestContext";

function loadFreshLogger() {
  delete require.cache[require.resolve(LOGGER_PATH)];
  return require(LOGGER_PATH);
}

function captureConsoleCalls(fn) {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  const calls = { log: [], warn: [], error: [] };

  console.log = (...args) => calls.log.push(args.map(String).join(" "));
  console.warn = (...args) => calls.warn.push(args.map(String).join(" "));
  console.error = (...args) => calls.error.push(args.map(String).join(" "));

  try {
    fn();
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
  }

  return calls;
}

test("logger respects LOG_LEVEL threshold", () => {
  const originalLevel = process.env.LOG_LEVEL;
  process.env.LOG_LEVEL = "warn";

  const logger = loadFreshLogger();
  const calls = captureConsoleCalls(() => {
    logger.info("info_hidden");
    logger.warn("warn_visible");
  });

  if (originalLevel === undefined) delete process.env.LOG_LEVEL;
  else process.env.LOG_LEVEL = originalLevel;

  assert.equal(calls.log.length, 0);
  assert.equal(calls.warn.length, 1);
});

test("logger redacts sensitive fields in metadata", () => {
  const originalLevel = process.env.LOG_LEVEL;
  process.env.LOG_LEVEL = "info";
  const logger = loadFreshLogger();

  const calls = captureConsoleCalls(() => {
    logger.info("auth_event", {
      password: "plain",
      token: "plain-token",
      nested: {
        authorization: "Bearer abc",
      },
      safe: "ok",
    });
  });

  if (originalLevel === undefined) delete process.env.LOG_LEVEL;
  else process.env.LOG_LEVEL = originalLevel;

  assert.equal(calls.log.length, 1);
  const parsed = JSON.parse(calls.log[0]);
  assert.equal(parsed.password, "[REDACTED]");
  assert.equal(parsed.token, "[REDACTED]");
  assert.equal(parsed.nested.authorization, "[REDACTED]");
  assert.equal(parsed.safe, "ok");
});

test("logger includes requestId from async request context", () => {
  const originalLevel = process.env.LOG_LEVEL;
  process.env.LOG_LEVEL = "info";
  const logger = loadFreshLogger();
  const { runWithRequestContext } = require(REQUEST_CONTEXT_PATH);

  const calls = captureConsoleCalls(() => {
    runWithRequestContext({ requestId: "req-test-1" }, () => {
      logger.info("context_event");
    });
  });

  if (originalLevel === undefined) delete process.env.LOG_LEVEL;
  else process.env.LOG_LEVEL = originalLevel;

  assert.equal(calls.log.length, 1);
  const parsed = JSON.parse(calls.log[0]);
  assert.equal(parsed.requestId, "req-test-1");
});

test("logger.error keeps reserved fields immutable when plain object errors are logged", () => {
  const originalLevel = process.env.LOG_LEVEL;
  process.env.LOG_LEVEL = "error";
  const logger = loadFreshLogger();

  const calls = captureConsoleCalls(() => {
    logger.error("request_failed", {
      ts: "evil-ts",
      level: "info",
      msg: "forged-message",
      code: "E_FAIL",
    });
  });

  if (originalLevel === undefined) delete process.env.LOG_LEVEL;
  else process.env.LOG_LEVEL = originalLevel;

  assert.equal(calls.error.length, 1);
  const parsed = JSON.parse(calls.error[0]);
  assert.equal(parsed.msg, "request_failed");
  assert.equal(parsed.level, "error");
  assert.equal(typeof parsed.ts, "string");
  assert.deepEqual(parsed.error, {
    ts: "evil-ts",
    level: "info",
    msg: "forged-message",
    code: "E_FAIL",
  });
});

test("logger ignores reserved metadata keys in normal log calls", () => {
  const originalLevel = process.env.LOG_LEVEL;
  process.env.LOG_LEVEL = "info";
  const logger = loadFreshLogger();

  const calls = captureConsoleCalls(() => {
    logger.info("hello", {
      ts: "evil-ts",
      level: "warn",
      msg: "evil-msg",
      requestId: "evil-request-id",
      safe: "ok",
    });
  });

  if (originalLevel === undefined) delete process.env.LOG_LEVEL;
  else process.env.LOG_LEVEL = originalLevel;

  assert.equal(calls.log.length, 1);
  const parsed = JSON.parse(calls.log[0]);
  assert.equal(parsed.msg, "hello");
  assert.equal(parsed.level, "info");
  assert.equal(parsed.safe, "ok");
  assert.equal(parsed.requestId, undefined);
});
