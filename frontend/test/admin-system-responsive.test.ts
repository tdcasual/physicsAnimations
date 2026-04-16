import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("admin system status readability", () => {
  it("allows long status values to wrap instead of overflowing", () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), "src/views/admin/system/SystemStatusPanel.vue"), "utf8");
    const adminBase = fs.readFileSync(path.resolve(process.cwd(), "src/styles/admin-base.css"), "utf8");
    expect(source).toMatch(/class="break-anywhere"/);
    expect(adminBase).toMatch(/word-break:\s*break-word/);
  });

  it("disables mobile auto-correct/capitalize for webdav credentials", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "src/views/admin/system/SystemWizardConnectionStep.vue"),
      "utf8",
    );
    // Uses PAInput component which has default autocapitalize/autocorrect/spellcheck
    expect(source).toMatch(/PAInput/);
    expect(source).toMatch(/name="webdav_url"/);
    expect(source).toMatch(/name="webdav_username"/);
    expect(source).toMatch(/name="webdav_password"/);
    // Verify PAInput component has the safeguards
    const inputComponent = fs.readFileSync(path.resolve(process.cwd(), "src/components/ui/patterns/PAInput.vue"), "utf8");
    expect(inputComponent).toMatch(/autocapitalize:\s*"none"/);
    expect(inputComponent).toMatch(/autocorrect:\s*"off"/);
    expect(inputComponent).toMatch(/spellcheck:\s*"false"/);
  });
});
