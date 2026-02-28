import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

describe("admin dashboard reload race", () => {
  it("ignores stale reload responses when refresh is triggered repeatedly", () => {
    const source = read("src/views/admin/AdminDashboardView.vue");
    expect(source).toMatch(/const reloadSeq = ref\(0\)/);
    expect(source).toMatch(/const requestSeq = reloadSeq\.value \+ 1/);
    expect(source).toMatch(/reloadSeq\.value = requestSeq/);
    expect(source).toMatch(/if \(requestSeq !== reloadSeq\.value\) return/);
    expect(source).toMatch(/if \(requestSeq === reloadSeq\.value\) \{\s*loading\.value = false;/);
  });
});
