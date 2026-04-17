/**
 * Admin Contrast Guard
 * Prevents low-contrast text patterns in the admin area that static
 * CSS linters cannot catch (e.g. muted-foreground on near-white cards).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const cwd = process.cwd();
const TARGET_DIRS = ["src/views/admin", "src/styles/admin-base.css", "src/components/admin"];
const CSS_GLOB = /\.css$/;

function* walkFiles(basePaths) {
  for (const rel of basePaths) {
    const full = path.resolve(cwd, rel);
    try {
      const st = statSync(full);
      if (st.isFile()) {
        yield full;
        continue;
      }
      if (!st.isDirectory()) continue;
      const queue = [full];
      while (queue.length) {
        const dir = queue.shift();
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          const entryPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            queue.push(entryPath);
          } else if (entry.isFile()) {
            yield entryPath;
          }
        }
      }
    } catch {
      // ignore missing paths
    }
  }
}

function checkPattern(pattern, filterCss, description) {
  const regex = new RegExp(pattern);
  const hits = [];
  for (const filePath of walkFiles(TARGET_DIRS)) {
    if (filterCss && !CSS_GLOB.test(filePath)) continue;
    let content;
    try {
      content = readFileSync(filePath, "utf-8");
    } catch {
      continue;
    }
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (regex.test(lines[i])) {
        const rel = path.relative(cwd, filePath);
        hits.push(`${rel}:${i + 1}:  ${lines[i].trim()}`);
      }
    }
  }
  if (hits.length > 0) {
    console.error(`❌ ${description}`);
    hits.forEach((line) => console.error("   " + line));
    return false;
  }
  return true;
}

let ok = true;

// 1. In admin, muted-foreground is often too light on white/card backgrounds.
ok =
  checkPattern(
    /color:\s*var\(--muted-foreground\)/,
    false,
    'Low-contrast pattern in admin: color: var(--muted-foreground). Use var(--foreground) for functional text or provide a design-system exception.'
  ) && ok;

// 2. Gradient transparent text severely hurts readability on light backgrounds.
ok =
  checkPattern(
    /-webkit-text-fill-color:\s*transparent/,
    false,
    'Unreadable text effect in admin: -webkit-text-fill-color: transparent. Use solid var(--foreground) instead.'
  ) && ok;

// 3. Hardcoded light-gray hex values in admin styles (common source of invisible text).
ok = checkPattern(/color:\s*#cccccc/i, true, 'Hardcoded low-contrast color #cccccc in admin CSS.') && ok;
ok = checkPattern(/color:\s*#999999/i, true, 'Hardcoded low-contrast color #999999 in admin CSS.') && ok;
ok = checkPattern(/color:\s*#aaaaaa/i, true, 'Hardcoded low-contrast color #aaaaaa in admin CSS.') && ok;

if (ok) {
  console.log("✅ Admin contrast guard passed");
  process.exit(0);
} else {
  process.exit(1);
}
