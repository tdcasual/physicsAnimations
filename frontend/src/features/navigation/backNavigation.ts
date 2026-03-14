export type BackNavigationMode = "history-back" | "replace-home";

export function resolveBackNavigationMode(historyState: unknown): BackNavigationMode {
  if (!historyState || typeof historyState !== "object") return "replace-home";
  const back = (historyState as Record<string, unknown>).back;
  return typeof back === "string" && back.trim() ? "history-back" : "replace-home";
}
