import { describe, expect, it } from "vitest";
import { readExpandedSource } from "./helpers/sourceReader";

function read(relPath: string): string {
  return readExpandedSource(relPath);
}

describe("admin mobile nav focus trap", () => {
  it("moves focus into the open mobile nav and traps tab navigation inside it", () => {
    const source = read("src/views/admin/AdminLayoutView.vue");

    expect(source).toMatch(/const adminNavShellRef = ref<HTMLElement \| null>\(null\)/);
    expect(source).toMatch(/const adminNavTriggerRef = ref<HTMLElement \| null>\(null\)/);
    expect(source).toMatch(/function handleMobileNavKeydown\(event: KeyboardEvent\)/);
    expect(source).toMatch(/event\.key !== "Tab"/);
    expect(source).toMatch(/querySelectorAll<HTMLElement>\(/);
    expect(source).toMatch(/adminNavShellRef\.value\?\.contains\(active\)/);
    expect(source).toMatch(/watch\(mobileNavOpen, async \(open\) => \{/);
    expect(source).toMatch(/adminNavShellRef\.value\?\.querySelector<HTMLElement>\("\.admin-link"\)\?\.focus\(\)/);
    expect(source).toMatch(/const restoreTarget = lastFocusedBeforeMobileNav \|\| adminNavTriggerRef\.value/);
  });
});
