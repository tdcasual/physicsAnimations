const { spawnSync } = require("child_process");

function runNode(scriptPath) {
  const result = spawnSync(process.execPath, [scriptPath], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);
}

runNode("generate_list.js");
runNode("scripts/generate_thumbnails.js");
runNode("generate_list.js");

