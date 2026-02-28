const test = require("node:test");
const { execFileSync } = require("node:child_process");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

test("security guard script passes for runtime source trees", () => {
  execFileSync(process.execPath, ["scripts/check_security_guards.js"], {
    cwd: projectRoot,
    stdio: "pipe",
  });
});
