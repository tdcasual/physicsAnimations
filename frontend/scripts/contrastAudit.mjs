/**
 * Quantitative Contrast Audit for Admin Pages
 *
 * Uses Playwright to load admin pages in both light and dark mode,
 * then injects a script that computes the WCAG contrast ratio of every
 * visible text element against its effective background.
 *
 * Usage:
 *   1. Start dev server: npm run dev
 *   2. node scripts/contrastAudit.mjs
 *
 * Exit codes:
 *   0 = all passed
 *   1 = contrast failures found
 */
import { chromium } from 'playwright';

const BASE_URL = process.env.AUDIT_BASE_URL || 'http://localhost:5173';

const ADMIN_PAGES = [
  { path: '/admin/dashboard', name: 'Dashboard' },
  { path: '/admin/content',   name: 'Content' },
  { path: '/admin/uploads',   name: 'Uploads' },
  { path: '/admin/taxonomy',  name: 'Taxonomy' },
  { path: '/admin/library',   name: 'Library' },
  { path: '/admin/system',    name: 'System' },
  { path: '/admin/account',   name: 'Account' },
];

// Mock APIs so pages render without a backend
async function mockApis(context) {
  await context.route('**/api/**', (route, request) => {
    const url = request.url();
    if (url.includes('/api/auth/me')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: '1', username: 'admin' }),
      });
    }
    if (url.includes('/api/system/storage/validate')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, reachable: true }),
      });
    }
    if (url.includes('/api/system')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          mode: 'local',
          webdav: {},
          storage: { mode: 'local' },
          embedUpdater: { enabled: false, intervalDays: 7 },
        }),
      });
    }
    if (url.includes('/api/library')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ folders: [] }),
      });
    }
    if (url.includes('/api/categories')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ categories: [], groups: [] }),
      });
    }
    if (url.includes('/api/items')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], total: 0 }),
      });
    }
    return route.continue();
  });
}

async function runContrastAudit(page, theme) {
  // Set theme
  await page.evaluate((t) => {
    document.documentElement.setAttribute('data-theme', t);
  }, theme);
  await page.waitForTimeout(300); // allow CSS transition

  return page.evaluate(() => {
    function resolveColorToRgb(colorStr, overRgb) {
      const fallback = overRgb || [255, 255, 255];
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.fillStyle = `rgb(${fallback.join(',')})`;
      ctx.fillRect(0, 0, 1, 1);
      ctx.fillStyle = colorStr;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      return [r, g, b];
    }

    function luminance([r, g, b]) {
      const a = [r, g, b].map((v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    }

    function contrastRatio(c1, c2) {
      const l1 = luminance(c1);
      const l2 = luminance(c2);
      const lighter = Math.max(l1, l2);
      const darker = Math.min(l1, l2);
      return (lighter + 0.05) / (darker + 0.05);
    }

    function getEffectiveBg(el) {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const fallbackBase = isDark ? [26, 26, 26] : [255, 255, 255];

      // Collect background layers from root up to element
      const chain = [];
      let cur = el;
      while (cur && cur !== document.body) {
        const style = getComputedStyle(cur);
        const bg = style.backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
          chain.unshift(bg);
        }
        cur = cur.parentElement;
      }

      const bodyBg = getComputedStyle(document.body).backgroundColor;
      if (bodyBg && bodyBg !== 'rgba(0, 0, 0, 0)' && bodyBg !== 'transparent') {
        chain.unshift(bodyBg);
      } else {
        chain.unshift(`rgb(${fallbackBase.join(',')})`);
      }

      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      chain.forEach((colorStr) => {
        ctx.fillStyle = colorStr;
        ctx.fillRect(0, 0, 1, 1);
      });
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      return [r, g, b];
    }

    const failures = [];
    const elements = document.querySelectorAll('body, body *');

    elements.forEach((el) => {
      // skip non-visible
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return;

      // check if element has its own text node
      const hasText = Array.from(el.childNodes).some(
        (n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim().length > 0
      );
      if (!hasText) return;

      const fontSize = parseFloat(style.fontSize);
      const fontWeight = parseInt(style.fontWeight, 10) || 400;
      const isLarge = fontSize >= 18 || (fontSize >= 14 && fontWeight >= 700);
      const threshold = isLarge ? 3.0 : 4.5;

      const fg = resolveColorToRgb(style.color);
      const bg = getEffectiveBg(el);
      const ratio = contrastRatio(fg, bg);

      if (ratio < threshold) {
        failures.push({
          tag: el.tagName.toLowerCase(),
          class: el.className,
          text: el.textContent.trim().slice(0, 60),
          fontSize: `${fontSize}px`,
          fontWeight,
          ratio: +ratio.toFixed(2),
          threshold,
        });
      }
    });

    return failures;
  });
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });

  await mockApis(context);

  const page = await context.newPage();

  // Unregister service workers to avoid stale cache
  await page.goto(`${BASE_URL}/`);
  await page.evaluate(() => {
    if (!navigator.serviceWorker) return Promise.resolve();
    return navigator.serviceWorker.getRegistrations().then((rs) =>
      Promise.all(rs.map((r) => r.unregister()))
    );
  });

  // Inject auth token
  await page.goto(`${BASE_URL}/login`);
  await page.evaluate(() =>
    sessionStorage.setItem('pa_admin_token', 'audit-token')
  );

  let globalFailed = false;

  for (const adminPage of ADMIN_PAGES) {
    console.log(`\n🔍 ${adminPage.name} (${adminPage.path})`);
    await page.goto(`${BASE_URL}${adminPage.path}`);
    await page.waitForTimeout(1500);

    for (const theme of ['light', 'dark']) {
      const failures = await runContrastAudit(page, theme);
      if (failures.length === 0) {
        console.log(`  ✅ ${theme} mode — all text elements pass WCAG AA`);
      } else {
        globalFailed = true;
        console.log(
          `  ❌ ${theme} mode — ${failures.length} element(s) below threshold:`
        );
        failures.slice(0, 10).forEach((f) => {
          console.log(
            `     • ${f.ratio}:1 < ${f.threshold}:1 | <${f.tag}${f.class ? '.' + f.class.split(' ').join('.') : ''}> "${f.text}" (${f.fontSize}, weight ${f.fontWeight})`
          );
        });
        if (failures.length > 10) {
          console.log(`     ... and ${failures.length - 10} more`);
        }
      }
    }
  }

  await browser.close();

  if (globalFailed) {
    console.log(
      '\n⚠️  Contrast audit completed with failures. Fix low-contrast text before merging.'
    );
    process.exit(1);
  } else {
    console.log('\n🎉 All admin pages pass contrast audit in both light and dark mode.');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
