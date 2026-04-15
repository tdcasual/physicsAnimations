function resolveUrl(baseUrl, pathName) {
  if (!baseUrl) return pathName;
  return new URL(pathName, baseUrl).toString();
}

async function revealTopbarAuthActions(page) {
  const banner = page.getByRole("banner");
  const inlineLoginButton = banner.locator(".topbar-inline-actions").getByRole("button", { name: "登录" });
  if (await inlineLoginButton.isVisible().catch(() => false)) {
    return inlineLoginButton;
  }

  const moreTrigger = page.locator(".topbar-more-trigger").first();
  await moreTrigger.waitFor({ state: "visible", timeout: 10000 });
  if ((await moreTrigger.getAttribute("aria-expanded").catch(() => null)) !== "true") {
    await moreTrigger.click();
  }
  await page.locator(".topbar-more-panel.is-open").waitFor({ state: "visible", timeout: 10000 });
  const panelLoginButton = banner.locator(".topbar-more-panel").getByRole("button", { name: "登录" });
  await panelLoginButton.waitFor({ state: "visible", timeout: 10000 });
  return panelLoginButton;
}

async function loginFromCatalog(page, username, password, baseUrl = "") {
  await page.goto(resolveUrl(baseUrl, "/"), { waitUntil: "networkidle" });
  const loginButton = await revealTopbarAuthActions(page);
  await loginButton.click();

  const dialog = page.getByRole("dialog", { name: "管理员登录" });
  await dialog.waitFor({ state: "visible", timeout: 10000 });
  await dialog.getByRole("textbox", { name: "用户名" }).fill(username);
  await dialog.getByRole("textbox", { name: "密码" }).fill(password);
  await dialog.getByRole("button", { name: "登录" }).click();

  await Promise.any([
    page.waitForURL((url) => url.pathname.startsWith("/admin"), { timeout: 10000 }),
    page.getByRole("link", { name: "管理" }).waitFor({ state: "visible", timeout: 10000 }),
    page.getByRole("button", { name: "退出" }).waitFor({ state: "visible", timeout: 10000 }),
  ]);
}

async function ensureAdminDashboard(page, baseUrl = "") {
  if (new URL(page.url()).pathname === "/admin/dashboard") return;

  const adminLink = page.getByRole("link", { name: "管理" });
  if (await adminLink.isVisible().catch(() => false)) {
    await adminLink.click();
  } else {
    await page.goto(resolveUrl(baseUrl, "/admin/dashboard"), { waitUntil: "networkidle" });
  }

  await page.waitForURL(/\/admin\/dashboard$/, { timeout: 10000 });
}

async function readSessionToken(page) {
  return page.evaluate(() => sessionStorage.getItem("pa_admin_token") || "");
}

module.exports = {
  ensureAdminDashboard,
  loginFromCatalog,
  readSessionToken,
  revealTopbarAuthActions,
};
