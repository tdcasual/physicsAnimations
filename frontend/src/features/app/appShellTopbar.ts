export function resolveTopbarModeClass(currentPath: string): string {
  if (currentPath.startsWith("/admin") || currentPath === "/login") {
    return "topbar--admin";
  }
  if (currentPath.startsWith("/viewer")) {
    return "topbar--viewer";
  }
  if (currentPath.startsWith("/library")) {
    return "topbar--library";
  }
  return "topbar--catalog";
}

export function resolveTopbarSearchTarget(currentPath: string): string | null {
  return currentPath === "/" ? null : "/";
}
