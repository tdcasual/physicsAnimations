const path = require("path");

const { createApp } = require("./app");

const rootDir = path.join(__dirname, "..");
const app = createApp({ rootDir });

const port = Number.parseInt(process.env.PORT || "4173", 10);
app.listen(port, () => {
  console.log(`[physicsAnimations] listening on http://localhost:${port}`);
});
