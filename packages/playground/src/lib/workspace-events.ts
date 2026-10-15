import type { Span } from "./api";

export function workspaceEventCategory(span: Span): string {
  const keys = Object.keys(span.attributes);
  const operation = String(span.attributes["workspace.operation"] ?? "");
  for (const [category, prefix, name] of [
    ["filesystem", "fs", "filesystem"],
    ["search", "search", "search"],
    ["sandbox", "sandbox", "sandbox"],
    ["skills", "skills", "skills"],
  ]) {
    if (
      operation.startsWith(`${name}.`) ||
      keys.some((key) => key.startsWith(`workspace.${prefix}.`))
    )
      return category;
  }
  return "other";
}
