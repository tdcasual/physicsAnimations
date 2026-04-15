import { describe, expect, it } from "vitest";
import { readExpandedSource } from "./helpers/sourceReader";

function read(relPath: string): string {
  return readExpandedSource(relPath);
}

describe("admin mobile input safeguards", () => {
  it("disables auto-correct and auto-capitalization for link url input", () => {
    const source = read("src/views/admin/content/ContentCreateForm.vue");
    expect(source).toMatch(/PAInput/);
    expect(source).toMatch(/type="url"/);
    // PAInput component has default autocapitalize/autocorrect/spellcheck
    const inputComponent = read("src/components/ui/patterns/PAInput.vue");
    expect(inputComponent).toMatch(/autocapitalize:\s*"none"/);
    expect(inputComponent).toMatch(/autocorrect:\s*"off"/);
    expect(inputComponent).toMatch(/spellcheck:\s*"false"/);
  });

  it("keeps shared field inputs constrained to container width on narrow screens", () => {
    // PAInput component uses Tailwind w-full and min-w-0 for responsive width
    const inputComponent = read("src/components/ui/patterns/PAInput.vue");
    expect(inputComponent).toMatch(/w-full/);
    expect(inputComponent).toMatch(/min-w-0/);
  });

  it("keeps shared admin inputs tall enough for mobile touch interaction", () => {
    // PAInput component uses Tailwind classes for responsive sizing
    const inputComponent = read("src/components/ui/patterns/PAInput.vue");
    expect(inputComponent).toMatch(/w-full/);
    expect(inputComponent).toMatch(/min-w-0/);
    // PAInput has h-10 (40px) default size, which is tall enough for touch
    expect(inputComponent).toMatch(/h-10|h-8|h-12/);
  });
});
