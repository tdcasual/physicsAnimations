import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("admin system status readability", () => {
  it("allows long status values to wrap instead of overflowing", () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), "src/views/admin/system/SystemStatusPanel.vue"), "utf8");
    expect(source).toMatch(/overflow-wrap:\s*anywhere/);
    expect(source).toMatch(/word-break:\s*break-word/);
  });

  it("disables mobile auto-correct/capitalize for webdav credentials", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "src/views/admin/system/SystemWizardConnectionStep.vue"),
      "utf8",
    );
    expect(source).toMatch(/name="webdav_url"[\s\S]*autocapitalize="none"/);
    expect(source).toMatch(/name="webdav_url"[\s\S]*autocorrect="off"/);
    expect(source).toMatch(/name="webdav_username"[\s\S]*autocapitalize="none"/);
    expect(source).toMatch(/name="webdav_password"[\s\S]*autocapitalize="none"/);
  });
});
