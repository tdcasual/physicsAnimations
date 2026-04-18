import { test, expect } from "@playwright/test";

test.describe("public pages", () => {
  test("homepage loads without critical console errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Title should be the default SPA title
    await expect(page).toHaveTitle(/科学演示集|演示工坊/);

    // No unexpected console errors (ignore favicon and known warnings)
    const criticalErrors = consoleErrors.filter(
      (text) =>
        !text.includes("favicon.ico") &&
        !text.includes("[Vue Router warn]") &&
        !text.includes("Failed to load resource"),
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test("unknown route redirects to homepage", async ({ page }) => {
    await page.goto("/nonexistent-path");
    await page.waitForLoadState("networkidle");

    // SPA should redirect back to catalog
    await expect(page).toHaveURL(/\/$/);
    await expect(page).toHaveTitle(/科学演示集|演示工坊/);
  });
});
