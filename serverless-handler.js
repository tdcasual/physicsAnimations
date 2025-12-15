const path = require("path");
const serverless = require("serverless-http");

const { createApp } = require("./server/app");

const rootDir = path.join(__dirname);
const app = createApp({ rootDir });

module.exports.handler = serverless(app);

