import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const frontendDir = path.join(__dirname, "..");
const packageJsonPath = path.join(frontendDir, "package.json");

describe("frontend major dependency alignment", () => {
  it("uses upgraded major versions for core toolchain and state/router", () => {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    expect(pkg.dependencies?.pinia).toBe("^3.0.4");
    expect(pkg.dependencies?.["vue-router"]).toBe("^5.0.2");
    expect(pkg.devDependencies?.vite).toBe("^7.3.1");
    expect(pkg.devDependencies?.vitest).toBe("^4.0.18");
    expect(pkg.devDependencies?.["@vitejs/plugin-vue"]).toBe("^6.0.4");
    expect(pkg.devDependencies?.jsdom).toBe("^28.0.0");
  });
});
