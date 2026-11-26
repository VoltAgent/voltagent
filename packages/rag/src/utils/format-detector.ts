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

const splitTableRow = (line: string, allowEscapedPipes: boolean): string[] | null => {
  let trimmed = line;
  let hasPipe = false;

  if (trimmed.startsWith("|")) {
    hasPipe = true;
    trimmed = trimmed.slice(1);
  }
  if (trimmed.endsWith("|")) {
    let backslashes = 0;
    if (allowEscapedPipes) {
      for (let k = trimmed.length - 2; k >= 0 && trimmed[k] === "\\"; k--) {
        backslashes++;
      }
    }
    if (backslashes % 2 === 0) {
      hasPipe = true;
      trimmed = trimmed.slice(0, -1);
    }
  }

  const cells: string[] = [];
  let cell = "";
  for (let idx = 0; idx < trimmed.length; idx++) {
    const ch = trimmed[idx];
    if (allowEscapedPipes && ch === "\\" && idx + 1 < trimmed.length) {
      const next = trimmed[idx + 1];
      if (next === "\\" || next === "|") {
        cell += next;
        idx++;
        continue;
      }
    }
    if (ch === "|") {
      hasPipe = true;
      cells.push(cell);
      cell = "";
      continue;
    }
    cell += ch;
  }
  cells.push(cell);

  return hasPipe ? cells : null;
};

export function detectFormat(input: string): DetectedFormat {
  const text = input.trim();
  if (!text) return "text";

  // JSON: quick check + parse
  if (
    (text.startsWith("{") && text.endsWith("}")) ||
    (text.startsWith("[") && text.endsWith("]"))
  ) {
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
  const lines = input.replace(/^\uFEFF/, "").split(/\r?\n/);
  for (let i = 1; i < lines.length; i++) {
    const header = lines[i - 1].replace(/^ {0,3}/, "").trimEnd();
    const delimiter = lines[i].replace(/^ {0,3}/, "").trimEnd();
    if (!header || !delimiter || /^\s/.test(header) || /^\s/.test(delimiter)) {
      continue;
    }
    const headerCells = splitTableRow(header, true);
    const delimiterCells = splitTableRow(delimiter, false);
    if (
      headerCells &&
      delimiterCells &&
      headerCells.length === delimiterCells.length &&
      delimiterCells.every((cell) => /^:?-+:?$/.test(cell.trim()))
    ) {
      return "table";
    }
  }

  // Markdown-ish signals
  if (markdownSignals.some((re) => re.test(text))) {
    return "markdown";
  }

  return "text";
}
