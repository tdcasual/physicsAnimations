import fs from "node:fs";
import path from "node:path";

function readFile(filePath: string): string {
  return fs.readFileSync(filePath, "utf8");
}

function resolveCssImports(source: string, filePath: string, seen: Set<string>): string {
  return source.replace(/@import\s+["']([^"']+)["'];/g, (_full, relPath: string) => {
    // Skip bare imports like "tailwindcss" - only resolve relative or absolute paths
    if (!relPath.startsWith(".") && !relPath.startsWith("/")) {
      return _full;
    }
    const nextPath = path.resolve(path.dirname(filePath), relPath);
    return `\n${readExpandedSource(nextPath, seen)}\n`;
  });
}

function resolveVueStyleSrc(source: string, filePath: string, seen: Set<string>): string {
  const styleSources = Array.from(source.matchAll(/<style[^>]*\ssrc=["']([^"']+)["'][^>]*><\/style>/g));
  if (styleSources.length === 0) return source;
  const expanded = styleSources
    .map((match) => readExpandedSource(path.resolve(path.dirname(filePath), match[1]), seen))
    .join("\n");
  return `${source}\n${expanded}`;
}

export function readExpandedSource(relativePath: string, seen = new Set<string>()): string {
  const absolutePath = path.isAbsolute(relativePath)
    ? relativePath
    : path.resolve(process.cwd(), relativePath);
  if (seen.has(absolutePath)) return "";
  seen.add(absolutePath);

  const source = readFile(absolutePath);
  if (absolutePath.endsWith(".css")) {
    return resolveCssImports(source, absolutePath, seen);
  }
  if (absolutePath.endsWith(".vue")) {
    return resolveVueStyleSrc(source, absolutePath, seen);
  }
  return source;
}
