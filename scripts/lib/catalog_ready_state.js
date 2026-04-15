const CATALOG_READY_SELECTORS = [
  'input[type="search"]',
  ".cat-group-tabs",
  ".cat-card",
  'text="没有匹配的作品。"',
  'text="未找到任何作品。"',
  'text="加载目录失败"',
];

async function waitForCatalogReadyState(page, timeoutMs = 10000) {
  const perSelectorTimeout = Math.max(250, Math.floor(timeoutMs / CATALOG_READY_SELECTORS.length));
  const failures = [];

  for (const selector of CATALOG_READY_SELECTORS) {
    try {
      await page.locator(selector).first().waitFor({ state: "visible", timeout: perSelectorTimeout });
      return selector;
    } catch (error) {
      failures.push(`${selector}: ${error?.message || String(error)}`);
    }
  }

  throw new Error(`catalog ready state timeout: ${failures.join(" | ")}`);
}

module.exports = {
  CATALOG_READY_SELECTORS,
  waitForCatalogReadyState,
};
