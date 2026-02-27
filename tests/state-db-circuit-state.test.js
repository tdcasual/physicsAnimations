const test = require("node:test");
const assert = require("node:assert/strict");

const { createStateDbCircuitState } = require("../server/lib/stateDb/circuitState");

test("circuit opens after max errors and records metadata", () => {
  const info = {
    circuitOpen: false,
    healthy: true,
    degraded: false,
    maxErrors: 2,
    errorCount: 0,
    consecutiveErrors: 0,
    lastError: "",
    lastErrorAt: "",
    lastSuccessAt: "",
  };

  const state = createStateDbCircuitState({
    info,
    now: () => "2026-02-27T00:00:00.000Z",
  });

  state.markFailure("op1", new Error("x1"));
  assert.equal(info.circuitOpen, false);
  assert.equal(info.degraded, true);
  assert.equal(info.errorCount, 1);
  assert.equal(info.lastError, "op1: x1");

  state.markFailure("op2", new Error("x2"));
  assert.equal(info.circuitOpen, true);
  assert.equal(info.healthy, false);
  assert.equal(info.degraded, false);
  assert.equal(info.errorCount, 2);
  assert.equal(info.lastError, "op2: x2");
  assert.equal(info.lastErrorAt, "2026-02-27T00:00:00.000Z");
});

test("markSuccess resets consecutive error fields when circuit is still closed", () => {
  const info = {
    circuitOpen: false,
    healthy: false,
    degraded: true,
    maxErrors: 3,
    errorCount: 2,
    consecutiveErrors: 2,
    lastError: "x",
    lastErrorAt: "2026-02-27T00:00:00.000Z",
    lastSuccessAt: "",
  };

  const state = createStateDbCircuitState({
    info,
    now: () => "2026-02-27T00:00:05.000Z",
  });

  state.markSuccess();
  assert.equal(info.consecutiveErrors, 0);
  assert.equal(info.healthy, true);
  assert.equal(info.degraded, false);
  assert.equal(info.lastSuccessAt, "2026-02-27T00:00:05.000Z");
});
