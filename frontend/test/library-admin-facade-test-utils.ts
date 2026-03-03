import fs from "node:fs";
import path from "node:path";

export function readStateFacade(): string {
  return fs.readFileSync(path.resolve(process.cwd(), "src/features/library/useLibraryAdminStateFacade.ts"), "utf8");
}
