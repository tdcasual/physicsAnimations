import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("library api maintainability budget", () => {
  it("keeps libraryApi below 340 lines and delegates mappers/payload builders", () => {
    const filePath = path.resolve(process.cwd(), "src/features/library/libraryApi.ts");
    const source = fs.readFileSync(filePath, "utf8");
    const lines = source.split("\n").length;

    expect(lines).toBeLessThan(340);
    expect(source).toMatch(/from\s+"\.\/libraryApiMappers"/);
    expect(source).toMatch(/from\s+"\.\/libraryApiPayloads"/);
  });
});
