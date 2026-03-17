const path = require("node:path");

async function captureViewerScreen(page, outputDir, tag, viewportName, captureFullPage, fixtureId, capturePage) {
  await page.goto(`/viewer/${encodeURIComponent(fixtureId)}`, { waitUntil: "networkidle" });
  await page.locator(".viewer-bar").first().waitFor({ state: "visible", timeout: 10000 });
  await page.locator(".viewer-stage-frame").first().waitFor({ state: "visible", timeout: 10000 });
  await page.locator(".viewer-frame, .viewer-shot").first().waitFor({ state: "visible", timeout: 10000 });
  await capturePage(page, path.join(outputDir, `${tag}-${viewportName}-viewer.png`), {
    fullPage: captureFullPage,
  });
}

async function captureAdminScreens(page, dir, tag, viewportName, captureFullPage, waitForHeading, capturePage) {
  const routes = [
    { slug: "admin-dashboard", pathName: "/admin/dashboard", heading: "概览" },
    { slug: "admin-content", pathName: "/admin/content", heading: "内容管理" },
    { slug: "admin-uploads", pathName: "/admin/uploads", heading: "上传管理" },
    { slug: "admin-library", pathName: "/admin/library", heading: "资源库管理" },
    { slug: "admin-taxonomy", pathName: "/admin/taxonomy", heading: "分类管理" },
    { slug: "admin-account", pathName: "/admin/account", heading: "账号设置" },
  ];

  for (const route of routes) {
    await page.goto(route.pathName, { waitUntil: "networkidle" });
    await waitForHeading(page, route.heading);
    await capturePage(page, path.join(dir, `${tag}-${viewportName}-${route.slug}.png`), {
      fullPage: captureFullPage,
    });
  }

  await page.goto("/admin/system", { waitUntil: "networkidle" });
  await waitForHeading(page, "系统设置向导");
  await capturePage(page, path.join(dir, `${tag}-${viewportName}-admin-system-step1.png`), {
    fullPage: captureFullPage,
  });

  const stepTitles = [
    "2. 连接配置",
    "3. 校验与保存",
    "4. 启用同步",
  ];
  for (const [index, title] of stepTitles.entries()) {
    await page.getByRole("button", { name: title }).click();
    const step = index + 2;
    await page.waitForTimeout(200);
    await capturePage(page, path.join(dir, `${tag}-${viewportName}-admin-system-step${step}.png`), {
      fullPage: captureFullPage,
    });
  }
}

function attachRuntimeObservers(page, viewportName, consoleErrors, pageErrors, isIgnorableConsoleError) {
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    const locationUrl = message.location()?.url || "";
    if (isIgnorableConsoleError(text, locationUrl)) return;
    consoleErrors.push(`[${viewportName}] ${text}${locationUrl ? ` @ ${locationUrl}` : ""}`);
  });

  page.on("pageerror", (error) => {
    pageErrors.push(`[${viewportName}] ${error?.message || String(error)}`);
  });
}

async function captureViewportSuite({
  browser,
  baseUrl,
  outputDir,
  tag,
  viewportName,
  contextOptions,
  username,
  password,
  consoleErrors,
  pageErrors,
  captureFullPage,
  waitForCatalogReadyState,
  loginFromCatalog,
  readSessionToken,
  createTemporaryViewerFixture,
  deleteTemporaryViewerFixture,
  waitForHeading,
  capturePage,
  isIgnorableConsoleError,
}) {
  const context = await browser.newContext({
    baseURL: baseUrl,
    ...contextOptions,
  });
  let temporaryViewerFixtureId = "";
  let authToken = "";

  try {
    const page = await context.newPage();
    attachRuntimeObservers(page, viewportName, consoleErrors, pageErrors, isIgnorableConsoleError);

    await page.goto("/", { waitUntil: "networkidle" });
    await waitForCatalogReadyState(page);
    await capturePage(page, path.join(outputDir, `${tag}-${viewportName}-catalog.png`), {
      fullPage: captureFullPage,
    });

    await page.getByRole("banner").getByRole("button", { name: "登录" }).click();
    await page.getByRole("dialog", { name: "管理员登录" }).waitFor({ state: "visible", timeout: 10000 });
    await capturePage(page, path.join(outputDir, `${tag}-${viewportName}-login-modal.png`), { fullPage: false });

    await page.goto("/login", { waitUntil: "networkidle" });
    await waitForHeading(page, "管理员登录");
    await capturePage(page, path.join(outputDir, `${tag}-${viewportName}-login-page.png`), { fullPage: false });

    await loginFromCatalog(page, username, password);
    authToken = await readSessionToken(page);
    if (!authToken) {
      throw new Error("missing admin session token after login");
    }
    await capturePage(page, path.join(outputDir, `${tag}-${viewportName}-catalog-auth.png`), {
      fullPage: captureFullPage,
    });

    const temporaryViewerFixture = await createTemporaryViewerFixture(context, authToken);
    temporaryViewerFixtureId = temporaryViewerFixture.id;
    await captureViewerScreen(page, outputDir, tag, viewportName, captureFullPage, temporaryViewerFixture.id, capturePage);
    await captureAdminScreens(page, outputDir, tag, viewportName, captureFullPage, waitForHeading, capturePage);
  } finally {
    try {
      if (temporaryViewerFixtureId && authToken) {
        await deleteTemporaryViewerFixture(context, authToken, temporaryViewerFixtureId);
      }
    } finally {
      await context.close();
    }
  }
}

module.exports = {
  captureAdminScreens,
  captureViewportSuite,
  captureViewerScreen,
};
