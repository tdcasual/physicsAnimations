import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("system timeout clear behavior", () => {
  it("does not coerce cleared timeout input into 0", () => {
    const source = read("src/views/admin/system/SystemWizardConnectionStep.vue");
    expect(source).not.toMatch(/Number\(value\s*\|\|\s*0\)/);
  });
});
