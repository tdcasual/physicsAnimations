/**
 * CSS Engineering Guard
 * Prevents regression of cleaned-up patterns.
 */
import { execSync } from "node:child_process";
import process from "node:process";

const cwd = process.cwd();

function grep(pattern, paths, description) {
  try {
    const result = execSync(
      `grep -rn ${pattern} ${paths.map((p) => `"${p}"`).join(" ")} || true`,
      { cwd, encoding: "utf-8" }
    );
    const lines = result.split("\n").filter((line) => line.trim());
    if (lines.length > 0) {
      console.error(`❌ ${description}`);
      lines.forEach((line) => console.error("   " + line));
      return false;
    }
    return true;
  } catch {
    return true;
  }
}

let ok = true;

// 1. No :deep() in scoped styles
ok = grep('":deep("', ["src/"], ":deep() detected in Vue files") && ok;

// 2. overflow-wrap should only live in globals.css
const overflowResult = execSync(
  `grep -rn "overflow-wrap:" src/ --include="*.css" --include="*.vue" || true`,
  { cwd, encoding: "utf-8" }
);
const overflowLines = overflowResult.split("\n").filter((line) => line.trim());
const overflowOffenders = overflowLines.filter(
  (line) => !line.includes("src/styles/globals.css")
);
if (overflowOffenders.length > 0) {
  console.error('❌ overflow-wrap found outside globals.css (use .break-anywhere instead)');
  overflowOffenders.forEach((line) => console.error("   " + line));
  ok = false;
}

// 3. No bare rgb(0 0 0 / ... ) or rgba(0, 0, 0, ...) in styles (use color-mix with variables)
ok =
  grep(
    '"rgb(0 0 0"',
    ["src/"],
    "Hardcoded rgb(0 0 0 / ...) shadow detected (use color-mix with theme variables)"
  ) && ok;

if (ok) {
  console.log("✅ CSS engineering guard passed");
  process.exit(0);
} else {
  process.exit(1);
}
