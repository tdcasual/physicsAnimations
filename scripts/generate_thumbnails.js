const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

const { chromium } = require("playwright-chromium");
const { buildPlaywrightEnv } = require("../server/lib/playwrightEnv");
const { shouldAllowRequestUrl } = require("../server/lib/ssrf");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function shouldRegenerate({ sourcePath, thumbnailPath }) {
  if (!fs.existsSync(thumbnailPath)) return true;
  const srcStat = fs.statSync(sourcePath);
  const thumbStat = fs.statSync(thumbnailPath);
  return srcStat.mtimeMs > thumbStat.mtimeMs;
}

async function main() {
  const rootDir = path.join(__dirname, "..");
  const animationsJsonPath = path.join(rootDir, "animations.json");

  if (!fs.existsSync(animationsJsonPath)) {
    console.error("Missing animations.json, run `npm run update-list` first.");
    process.exit(1);
  }

  const catalog = JSON.parse(fs.readFileSync(animationsJsonPath, "utf8"));
  const tasks = [];

  for (const [categoryId, category] of Object.entries(catalog)) {
    for (const item of category.items || []) {
      const rel = item.file;
      const sourcePath = path.join(rootDir, "animations", rel);
      if (!fs.existsSync(sourcePath)) continue;

      const baseName = path.basename(rel, path.extname(rel));
      const thumbnailPath = path.join(
        rootDir,
        "animations",
        "thumbnails",
        categoryId,
        `${baseName}.png`,
      );

      tasks.push({ categoryId, rel, sourcePath, thumbnailPath });
    }
  }

  ensureDir(path.join(rootDir, "animations", "thumbnails"));

  const browser = await chromium.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    env: buildPlaywrightEnv({ rootDir }),
  });

  let created = 0;
  let skipped = 0;
  let failed = 0;

  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1,
    });
    const hostnameCache = new Map();

    for (const task of tasks) {
      ensureDir(path.dirname(task.thumbnailPath));

      if (!shouldRegenerate({ sourcePath: task.sourcePath, thumbnailPath: task.thumbnailPath })) {
        skipped += 1;
        continue;
      }

      const page = await context.newPage();
      try {
        await page.route("**/*", async (route) => {
          const requestUrl = route.request().url();
          const ok = await shouldAllowRequestUrl(requestUrl, hostnameCache);
          if (!ok) {
            await route.abort();
            return;
          }
          await route.continue();
        });

        await page.goto(pathToFileURL(task.sourcePath).toString(), {
          waitUntil: "networkidle",
          timeout: 30000,
        });
        await page.waitForTimeout(800);
        await page.screenshot({ path: task.thumbnailPath });
        created += 1;
      } catch {
        failed += 1;
      } finally {
        await page.close();
      }
    }

    await context.close();
  } finally {
    await browser.close();
  }

  console.log(`[thumbnails] created=${created} skipped=${skipped} failed=${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
