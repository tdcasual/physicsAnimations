const path = require("path");

const { createApp } = require("../server/app");

const rootDir = path.join(__dirname, "..");
const app = createApp({ rootDir });

module.exports = app;

