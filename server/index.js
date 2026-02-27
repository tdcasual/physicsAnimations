const path = require("path");

const { createApp } = require("./app");
const logger = require("./lib/logger");

const rootDir = path.join(__dirname, "..");
const app = createApp({ rootDir });

const port = Number.parseInt(process.env.PORT || "4173", 10);
app.listen(port, () => {
  logger.info("server_listening", {
    url: `http://localhost:${port}`,
    port,
  });
});
