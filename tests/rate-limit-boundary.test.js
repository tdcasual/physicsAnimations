const test = require("node:test");
const assert = require("node:assert/strict");

const { rateLimit } = require("../server/middleware/rateLimit");

function createMockResponse() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    setHeader(name, value) {
      this.headers[String(name).toLowerCase()] = String(value);
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

test("rateLimit resets counter when request timestamp reaches reset boundary", () => {
  const middleware = rateLimit({
    key: `boundary_${Date.now()}`,
    windowMs: 1000,
    max: 1,
  });

  const req = { ip: "127.0.0.1", socket: {} };
  const originalNow = Date.now;
  let nowCalls = 0;
  Date.now = () => {
    nowCalls += 1;
    return nowCalls === 1 ? 1000 : 2000;
  };

  try {
    const firstRes = createMockResponse();
    let firstNextCalled = false;
    middleware(req, firstRes, () => {
      firstNextCalled = true;
    });
    assert.equal(firstNextCalled, true);
    assert.equal(firstRes.statusCode, 200);

    const secondRes = createMockResponse();
    let secondNextCalled = false;
    middleware(req, secondRes, () => {
      secondNextCalled = true;
    });
    assert.equal(secondNextCalled, true);
    assert.equal(secondRes.statusCode, 200);
  } finally {
    Date.now = originalNow;
  }
});
