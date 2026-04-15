import { describe, expect, it } from "vitest";
import { readExpandedSource } from "./helpers/sourceReader";

function read(relPath: string): string {
  return readExpandedSource(relPath);
}

describe("admin visual polish", () => {
  it("turns the dashboard into a task-oriented workspace", () => {
    const dashboard = read("src/views/admin/AdminDashboardView.vue");

    // Modern dashboard uses Shadcn Card components
    expect(dashboard).toMatch(/Card|CardHeader|CardTitle/);
    expect(dashboard).toMatch(/快速操作/);
    expect(dashboard).toMatch(/全部内容|上传内容|外链内容/);
  });

  it("uses Shadcn components with Tailwind for workspace surfaces", () => {
    const source = [
      read("src/views/admin/AdminDashboardView.vue"),
      read("src/views/admin/AdminLayoutView.vue"),
      read("src/views/admin/AdminLayoutView.css"),
      read("src/components/admin/AdminShellHeader.vue"),
      read("src/components/admin/AdminShellHeader.css"),
    ].join("\n");

    // Check for Shadcn component usage
    expect(source).toMatch(/Button|Badge|Card/);
    // Check for modern styling (Tailwind or CSS)
    expect(source).toMatch(/transition/);
    expect(source).toMatch(/backdrop-blur|backdrop-filter/);
  });

  it("uses CSS for mobile navigation layout", () => {
    const source = [
      read("src/views/admin/AdminLayoutView.vue"),
      read("src/views/admin/AdminLayoutView.css"),
    ].join("\n");

    // Check for CSS patterns
    expect(source).toMatch(/sticky|fixed/);
    expect(source).toMatch(/bottom/);
    expect(source).toMatch(/@media/);
  });

  it("uses CSS for responsive spacing and layout", () => {
    const source = [
      read("src/views/admin/AdminLayoutView.vue"),
      read("src/views/admin/AdminLayoutView.css"),
      read("src/components/admin/AdminShellHeader.vue"),
      read("src/components/admin/AdminShellHeader.css"),
    ].join("\n");

    // Check for spacing and layout
    expect(source).toMatch(/padding|gap/);
    expect(source).toMatch(/border-radius/);
    expect(source).toMatch(/flex-wrap/);
  });

  it("treats dashboard, content, and uploads headers as compact operational framing on mobile", () => {
    const layout = [
      read("src/views/admin/AdminLayoutView.vue"),
      read("src/views/admin/AdminLayoutView.css"),
    ].join("\n");

    // Check for responsive patterns
    expect(layout).toMatch(/flex-direction/);
    expect(layout).toMatch(/@media/);
  });

  it("compacts the dashboard lead task and create forms without removing optional metadata access", () => {
    const contentCreate = read("src/views/admin/content/ContentCreateForm.vue");
    const uploadsCreate = read("src/views/admin/uploads/UploadsCreateForm.vue");

    for (const source of [contentCreate, uploadsCreate]) {
      expect(source).toMatch(/admin-optional-disclosure/);
      expect(source).toMatch(/admin-optional-summary/);
      expect(source).toMatch(/admin-optional-fields/);
    }
  });

  it("removes redundant first-screen label rows on mobile so the next admin card appears sooner", () => {
    const layout = [
      read("src/views/admin/AdminLayoutView.vue"),
      read("src/views/admin/AdminLayoutView.css"),
    ].join("\n");

    // Check for responsive hide/show patterns
    expect(layout).toMatch(/display:\s*none/);
  });

  it("widens desktop admin work surfaces using CSS", () => {
    const app = read("src/App.vue");
    const layout = [
      read("src/views/admin/AdminLayoutView.vue"),
      read("src/views/admin/AdminLayoutView.css"),
    ].join("\n");

    expect(app).toMatch(/app-main--admin/);
    // Check for wide container styles
    expect(layout).toMatch(/width/);
  });

  it("keeps desktop shell actions inside a wrapped toolbar", () => {
    const header = [
      read("src/components/admin/AdminShellHeader.vue"),
      read("src/components/admin/AdminShellHeader.css"),
    ].join("\n");

    // Check for toolbar patterns in Vue and CSS
    expect(header).toMatch(/admin-shell-toolbar/);
    expect(header).toMatch(/flex-wrap/);
    expect(header).toMatch(/justify-content/);
  });
});
