import micromatch from "micromatch";
import type { FileData, GrepMatch } from "./backends/backend";

export const EMPTY_CONTENT_WARNING = "System reminder: File exists but has empty contents";
export const MAX_LINE_LENGTH = 10000;
export const LINE_NUMBER_WIDTH = 6;
export const TOOL_RESULT_TOKEN_LIMIT = 20000;
export const TRUNCATION_GUIDANCE =
  "... [results truncated, try being more specific with your parameters]";

export function sanitizeToolCallId(toolCallId: string): string {
  return toolCallId.replace(/\./g, "_").replace(/\//g, "_").replace(/\\/g, "_");
}

export function formatContentWithLineNumbers(content: string | string[], startLine = 1): string {
  let lines: string[];
  if (typeof content === "string") {
    lines = content.split("\n");
    if (lines.length > 0 && lines[lines.length - 1] === "") {
      lines = lines.slice(0, -1);
    }
  } else {
    lines = content;
  }

  const resultLines: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + startLine;

    if (line.length <= MAX_LINE_LENGTH) {
      resultLines.push(`${lineNum.toString().padStart(LINE_NUMBER_WIDTH)}\t${line}`);
    } else {
      const numChunks = Math.ceil(line.length / MAX_LINE_LENGTH);
      for (let chunkIdx = 0; chunkIdx < numChunks; chunkIdx++) {
        const start = chunkIdx * MAX_LINE_LENGTH;
        const end = Math.min(start + MAX_LINE_LENGTH, line.length);
        const chunk = line.substring(start, end);
        if (chunkIdx === 0) {
          resultLines.push(`${lineNum.toString().padStart(LINE_NUMBER_WIDTH)}\t${chunk}`);
        } else {
          const continuationMarker = `${lineNum}.${chunkIdx}`;
          resultLines.push(`${continuationMarker.padStart(LINE_NUMBER_WIDTH)}\t${chunk}`);
        }
      }
    }
  }

  return resultLines.join("\n");
}

export function checkEmptyContent(content: string): string | null {
  if (!content || content.trim() === "") {
    return EMPTY_CONTENT_WARNING;
  }
  return null;
}

export function fileDataToString(fileData: FileData): string {
  return fileData.content.join("\n");
}

export function createFileData(content: string, createdAt?: string): FileData {
  const lines = typeof content === "string" ? content.split("\n") : content;
  const now = new Date().toISOString();

  return {
    content: lines,
    created_at: createdAt || now,
    modified_at: now,
  };
}

export function updateFileData(fileData: FileData, content: string): FileData {
  const lines = typeof content === "string" ? content.split("\n") : content;
  const now = new Date().toISOString();

  return {
    content: lines,
    created_at: fileData.created_at,
    modified_at: now,
  };
}

export function formatReadResponse(fileData: FileData, offset: number, limit: number): string {
  const content = fileDataToString(fileData);
  const emptyMsg = checkEmptyContent(content);
  if (emptyMsg) {
    return emptyMsg;
  }

  const lines = content.split("\n");
  const startIdx = offset;
  const endIdx = Math.min(startIdx + limit, lines.length);

  if (startIdx >= lines.length) {
    return `Error: Line offset ${offset} exceeds file length (${lines.length} lines)`;
  }

  const selectedLines = lines.slice(startIdx, endIdx);
  return formatContentWithLineNumbers(selectedLines, startIdx + 1);
}

export function performStringReplacement(
  content: string,
  oldString: string,
  newString: string,
  replaceAll: boolean,
): [string, number] | string {
  const occurrences = content.split(oldString).length - 1;

  if (occurrences === 0) {
    return `Error: String not found in file: '${oldString}'`;
  }

  if (occurrences > 1 && !replaceAll) {
    return `Error: String '${oldString}' appears ${occurrences} times in file. Use replace_all=true to replace all instances, or provide a more specific string with surrounding context.`;
  }

  const newContent = content.split(oldString).join(newString);

  return [newContent, occurrences];
}

export function truncateIfTooLong(result: string[] | string): string[] | string {
  if (Array.isArray(result)) {
    const totalChars = result.reduce((sum, item) => sum + item.length, 0);
    if (totalChars > TOOL_RESULT_TOKEN_LIMIT * 4) {
      const truncateAt = Math.floor((result.length * TOOL_RESULT_TOKEN_LIMIT * 4) / totalChars);
      return [...result.slice(0, truncateAt), TRUNCATION_GUIDANCE];
    }
    return result;
  }

  if (result.length > TOOL_RESULT_TOKEN_LIMIT * 4) {
    return `${result.substring(0, TOOL_RESULT_TOKEN_LIMIT * 4)}\n${TRUNCATION_GUIDANCE}`;
  }
  return result;
}

export function validatePath(path: string | null | undefined): string {
  const pathStr = path || "/";
  if (!pathStr || pathStr.trim() === "") {
    throw new Error("Path cannot be empty");
  }

  let normalized = pathStr.startsWith("/") ? pathStr : `/${pathStr}`;

  if (!normalized.endsWith("/")) {
    normalized += "/";
  }

  return normalized;
}

function basename(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/");
  const parts = normalized.split("/");
  return parts[parts.length - 1] || "";
}

export function globSearchFiles(
  files: Record<string, FileData>,
  pattern: string,
  path = "/",
): string {
  let normalizedPath: string;
  try {
    normalizedPath = validatePath(path);
  } catch {
    return "No files found";
  }

  const filtered = Object.fromEntries(
    Object.entries(files).filter(([fp]) => fp.startsWith(normalizedPath)),
  );

  const matches: Array<[string, string]> = [];
  for (const [filePath, fileData] of Object.entries(filtered)) {
    let relative = filePath.substring(normalizedPath.length);
    if (relative.startsWith("/")) {
      relative = relative.substring(1);
    }
    if (!relative) {
      relative = basename(filePath);
    }

    if (
      micromatch.isMatch(relative, pattern, {
        dot: true,
        nobrace: false,
      })
    ) {
      matches.push([filePath, fileData.modified_at]);
    }
  }

  matches.sort((a, b) => b[1].localeCompare(a[1]));

  if (matches.length === 0) {
    return "No files found";
  }

  return matches.map(([fp]) => fp).join("\n");
}

export function grepMatchesFromFiles(
  files: Record<string, FileData>,
  pattern: string,
  path: string | null = null,
  glob: string | null = null,
): GrepMatch[] | string {
  let regex: RegExp;
  try {
    regex = new RegExp(pattern);
  } catch (e: any) {
    return `Invalid regex pattern: ${e.message}`;
  }

  let normalizedPath: string;
  try {
    normalizedPath = validatePath(path);
  } catch {
    return [];
  }

  let filtered = Object.fromEntries(
    Object.entries(files).filter(([fp]) => fp.startsWith(normalizedPath)),
  );

  if (glob) {
    filtered = Object.fromEntries(
      Object.entries(filtered).filter(([fp]) =>
        micromatch.isMatch(basename(fp), glob, { dot: true, nobrace: false }),
      ),
    );
  }

  const matches: GrepMatch[] = [];
  for (const [filePath, fileData] of Object.entries(filtered)) {
    for (let i = 0; i < fileData.content.length; i++) {
      const line = fileData.content[i];
      const lineNum = i + 1;
      if (regex.test(line)) {
        matches.push({ path: filePath, line: lineNum, text: line });
      }
    }
  }

  return matches;
}

export function formatGrepMatches(
  matches: GrepMatch[],
  outputMode: "files_with_matches" | "content" | "count",
): string {
  if (matches.length === 0) {
    return "No matches found";
  }

  const grouped: Record<string, Array<[number, string]>> = {};
  for (const match of matches) {
    if (!grouped[match.path]) {
      grouped[match.path] = [];
    }
    grouped[match.path].push([match.line, match.text]);
  }

  if (outputMode === "files_with_matches") {
    return Object.keys(grouped).sort().join("\n");
  }

  if (outputMode === "count") {
    const lines: string[] = [];
    for (const filePath of Object.keys(grouped).sort()) {
      lines.push(`${filePath}: ${grouped[filePath].length}`);
    }
    return lines.join("\n");
  }

  const lines: string[] = [];
  for (const filePath of Object.keys(grouped).sort()) {
    lines.push(`${filePath}:`);
    for (const [lineNum, line] of grouped[filePath]) {
      lines.push(`  ${lineNum}: ${line}`);
    }
  }
  return lines.join("\n");
}
