/**
 * Lightweight format detector for auto strategy selection.
 * Returns one of: markdown, html, json, latex, code, table, text.
 */
export type DetectedFormat = "markdown" | "html" | "json" | "latex" | "code" | "table" | "text";

const htmlTag =
  /<(html|body|head|div|span|p|h[1-6]|section|article|main|nav|table|ul|ol|li)[^>]*>/i;
const markdownSignals = [
  /^#{1,6}\s+/m,
  /^(\*|-|\+|\d+\.)\s+/m,
  /^>\s/m,
  /```[\s\S]*?```/m,
  /\[.+?\]\(.+?\)/m,
];

export function detectFormat(input: string): DetectedFormat {
  const text = input.trim();
  if (!text) return "text";

  // JSON: quick check + parse
  if ((text.startsWith("{") || text.startsWith("[")) && text.endsWith("}")) {
    try {
      JSON.parse(text);
      return "json";
    } catch {
      // fall through
    }
  }

  // HTML: doctype or tag presence
  if (/<!doctype html>/i.test(text) || htmlTag.test(text)) {
    return "html";
  }

  // LaTeX markers
  if (/\\(section|subsection|subsubsection|begin\{document\})/.test(text)) {
    return "latex";
  }

  // Code fence
  if (/```/.test(text)) {
    return "code";
  }

  // Table pipe syntax
  if (/\n\|.+\|\n/.test(text) && /\|\s*-{2,}\s*\|/.test(text)) {
    return "table";
  }

  // Markdown-ish signals
  if (markdownSignals.some((re) => re.test(text))) {
    return "markdown";
  }

  return "text";
}
