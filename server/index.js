const path = require("path");

const { createApp } = require("./app");
const logger = require("./lib/logger");

function parsePort(value, fallback = 4173) {
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;
  if (!/^\d+$/.test(raw)) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 65535) return fallback;
  return parsed;
}

function startServer({ rootDir = path.join(__dirname, ".."), portInput = process.env.PORT } = {}) {
  const app = createApp({ rootDir });
  const port = parsePort(portInput, 4173);
  return app.listen(port, () => {
    logger.info("server_listening", {
      url: `http://localhost:${port}`,
      port,
    });
  });
}

if (require.main === module) {
  startServer();
}

module.exports = {
  parsePort,
  startServer,
};
