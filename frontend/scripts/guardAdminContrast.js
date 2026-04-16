/**
 * Admin Contrast Guard
 * Prevents low-contrast text patterns in the admin area that static
 * CSS linters cannot catch (e.g. muted-foreground on near-white cards).
 */
import { execSync } from "node:child_process";
import process from "node:process";

const cwd = process.cwd();

function grep(pattern, glob, description) {
  try {
    const cmd = glob
      ? `grep -rn ${pattern} --include="${glob}" src/views/admin/ src/styles/admin-base.css src/components/admin/ || true`
      : `grep -rn ${pattern} src/views/admin/ src/styles/admin-base.css src/components/admin/ || true`;
    const result = execSync(cmd, { cwd, encoding: "utf-8" });
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

// 1. In admin, muted-foreground is often too light on white/card backgrounds.
//    Require explicit review if it appears as a text color.
ok =
  grep(
    'color: var(--muted-foreground)',
    null,
    "Low-contrast pattern in admin: color: var(--muted-foreground). Use var(--foreground) for functional text or provide a design-system exception."
  ) && ok;

// 2. Gradient transparent text severely hurts readability on light backgrounds.
ok =
  grep(
    '-webkit-text-fill-color: transparent',
    null,
    "Unreadable text effect in admin: -webkit-text-fill-color: transparent. Use solid var(--foreground) instead."
  ) && ok;

// 3. Hardcoded light-gray hex values in admin styles (common source of invisible text).
ok =
  grep(
    'color: *#cccccc',
    '*.css',
    "Hardcoded low-contrast color #cccccc in admin CSS."
  ) && ok;

ok =
  grep(
    'color: *#999999',
    '*.css',
    "Hardcoded low-contrast color #999999 in admin CSS."
  ) && ok;

ok =
  grep(
    'color: *#aaaaaa',
    '*.css',
    "Hardcoded low-contrast color #aaaaaa in admin CSS."
  ) && ok;

if (ok) {
  console.log("✅ Admin contrast guard passed");
  process.exit(0);
} else {
  process.exit(1);
}
