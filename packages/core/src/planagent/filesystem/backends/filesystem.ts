import { spawn } from "node:child_process";
import * as fsSync from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import fg from "fast-glob";
import micromatch from "micromatch";
import {
  checkEmptyContent,
  formatContentWithLineNumbers,
  performStringReplacement,
} from "../utils";
import type {
  EditResult,
  FileData,
  FileInfo,
  FilesystemBackend as FilesystemBackendProtocol,
  GrepMatch,
  WriteResult,
} from "./backend";

const SUPPORTS_NOFOLLOW = fsSync.constants.O_NOFOLLOW !== undefined;

export class NodeFilesystemBackend implements FilesystemBackendProtocol {
  private cwd: string;
  private virtualMode: boolean;
  private maxFileSizeBytes: number;

  constructor(
    options: {
      rootDir?: string;
      virtualMode?: boolean;
      maxFileSizeMb?: number;
    } = {},
  ) {
    const { rootDir, virtualMode = false, maxFileSizeMb = 10 } = options;
    this.cwd = rootDir ? path.resolve(rootDir) : process.cwd();
    this.virtualMode = virtualMode;
    this.maxFileSizeBytes = maxFileSizeMb * 1024 * 1024;
  }

  private resolvePath(key: string): string {
    if (this.virtualMode) {
      const vpath = key.startsWith("/") ? key : `/${key}`;
      if (vpath.includes("..") || vpath.startsWith("~")) {
        throw new Error("Path traversal not allowed");
      }
      const full = path.resolve(this.cwd, vpath.substring(1));
      const relative = path.relative(this.cwd, full);
      if (relative.startsWith("..") || path.isAbsolute(relative)) {
        throw new Error(`Path: ${full} outside root directory: ${this.cwd}`);
      }
      return full;
    }

    if (path.isAbsolute(key)) {
      return key;
    }
    return path.resolve(this.cwd, key);
  }

  async lsInfo(dirPath: string): Promise<FileInfo[]> {
    try {
      const resolvedPath = this.resolvePath(dirPath);
      const stat = await fs.stat(resolvedPath);

      if (!stat.isDirectory()) {
        return [];
      }

      const entries = await fs.readdir(resolvedPath, { withFileTypes: true });
      const results: FileInfo[] = [];

      const cwdStr = this.cwd.endsWith(path.sep) ? this.cwd : this.cwd + path.sep;

      for (const entry of entries) {
        const fullPath = path.join(resolvedPath, entry.name);

        try {
          const entryStat = await fs.stat(fullPath);
          const isFile = entryStat.isFile();
          const isDir = entryStat.isDirectory();

          if (!this.virtualMode) {
            if (isFile) {
              results.push({
                path: fullPath,
                is_dir: false,
                size: entryStat.size,
                modified_at: entryStat.mtime.toISOString(),
              });
            } else if (isDir) {
              results.push({
                path: fullPath + path.sep,
                is_dir: true,
                size: 0,
                modified_at: entryStat.mtime.toISOString(),
              });
            }
          } else {
            let relativePath: string;
            if (fullPath.startsWith(cwdStr)) {
              relativePath = fullPath.substring(cwdStr.length);
            } else if (fullPath.startsWith(this.cwd)) {
              relativePath = fullPath.substring(this.cwd.length).replace(/^[/\\]/, "");
            } else {
              relativePath = fullPath;
            }

            relativePath = relativePath.split(path.sep).join("/");
            const virtPath = `/${relativePath}`;

            if (isFile) {
              results.push({
                path: virtPath,
                is_dir: false,
                size: entryStat.size,
                modified_at: entryStat.mtime.toISOString(),
              });
            } else if (isDir) {
              results.push({
                path: `${virtPath}/`,
                is_dir: true,
                size: 0,
                modified_at: entryStat.mtime.toISOString(),
              });
            }
          }
        } catch {
          // ignore entry errors
        }
      }

      results.sort((a, b) => a.path.localeCompare(b.path));
      return results;
    } catch {
      return [];
    }
  }

  async read(filePath: string, offset = 0, limit = 2000): Promise<string> {
    try {
      const resolvedPath = this.resolvePath(filePath);

      let content: string;

      if (SUPPORTS_NOFOLLOW) {
        const stat = await fs.stat(resolvedPath);
        if (!stat.isFile()) {
          return `Error: File '${filePath}' not found`;
        }
        const fd = await fs.open(
          resolvedPath,
          fsSync.constants.O_RDONLY | fsSync.constants.O_NOFOLLOW,
        );
        try {
          content = await fd.readFile({ encoding: "utf-8" });
        } finally {
          await fd.close();
        }
      } else {
        const stat = await fs.lstat(resolvedPath);
        if (stat.isSymbolicLink()) {
          return `Error: Symlinks are not allowed: ${filePath}`;
        }
        if (!stat.isFile()) {
          return `Error: File '${filePath}' not found`;
        }
        content = await fs.readFile(resolvedPath, "utf-8");
      }

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
    } catch (e: any) {
      return `Error reading file '${filePath}': ${e.message}`;
    }
  }

  async readRaw(filePath: string): Promise<FileData> {
    const resolvedPath = this.resolvePath(filePath);

    let content: string;
    let stat: fsSync.Stats;

    if (SUPPORTS_NOFOLLOW) {
      stat = await fs.stat(resolvedPath);
      if (!stat.isFile()) throw new Error(`File '${filePath}' not found`);
      const fd = await fs.open(
        resolvedPath,
        fsSync.constants.O_RDONLY | fsSync.constants.O_NOFOLLOW,
      );
      try {
        content = await fd.readFile({ encoding: "utf-8" });
      } finally {
        await fd.close();
      }
    } else {
      stat = await fs.lstat(resolvedPath);
      if (stat.isSymbolicLink()) {
        throw new Error(`Symlinks are not allowed: ${filePath}`);
      }
      if (!stat.isFile()) throw new Error(`File '${filePath}' not found`);
      content = await fs.readFile(resolvedPath, "utf-8");
    }

    return {
      content: content.split("\n"),
      created_at: stat.ctime.toISOString(),
      modified_at: stat.mtime.toISOString(),
    };
  }

  async write(filePath: string, content: string): Promise<WriteResult> {
    try {
      const resolvedPath = this.resolvePath(filePath);

      try {
        const stat = await fs.lstat(resolvedPath);
        if (stat.isSymbolicLink()) {
          return {
            error: `Cannot write to ${filePath} because it is a symlink. Symlinks are not allowed.`,
          };
        }
        return {
          error: `Cannot write to ${filePath} because it already exists. Read and then make an edit, or write to a new path.`,
        };
      } catch {
        // File does not exist
      }

      await fs.mkdir(path.dirname(resolvedPath), { recursive: true });

      if (SUPPORTS_NOFOLLOW) {
        const flags =
          fsSync.constants.O_WRONLY |
          fsSync.constants.O_CREAT |
          fsSync.constants.O_TRUNC |
          fsSync.constants.O_NOFOLLOW;

        const fd = await fs.open(resolvedPath, flags, 0o644);
        try {
          await fd.writeFile(content, "utf-8");
        } finally {
          await fd.close();
        }
      } else {
        await fs.writeFile(resolvedPath, content, "utf-8");
      }

      return { path: filePath, filesUpdate: null };
    } catch (e: any) {
      return { error: `Error writing file '${filePath}': ${e.message}` };
    }
  }

  async edit(
    filePath: string,
    oldString: string,
    newString: string,
    replaceAll = false,
  ): Promise<EditResult> {
    try {
      const resolvedPath = this.resolvePath(filePath);

      let content: string;

      if (SUPPORTS_NOFOLLOW) {
        const stat = await fs.stat(resolvedPath);
        if (!stat.isFile()) {
          return { error: `Error: File '${filePath}' not found` };
        }

        const fd = await fs.open(
          resolvedPath,
          fsSync.constants.O_RDONLY | fsSync.constants.O_NOFOLLOW,
        );
        try {
          content = await fd.readFile({ encoding: "utf-8" });
        } finally {
          await fd.close();
        }
      } else {
        const stat = await fs.lstat(resolvedPath);
        if (stat.isSymbolicLink()) {
          return { error: `Error: Symlinks are not allowed: ${filePath}` };
        }
        if (!stat.isFile()) {
          return { error: `Error: File '${filePath}' not found` };
        }
        content = await fs.readFile(resolvedPath, "utf-8");
      }

      const result = performStringReplacement(content, oldString, newString, replaceAll);

      if (typeof result === "string") {
        return { error: result };
      }

      const [newContent, occurrences] = result;

      if (SUPPORTS_NOFOLLOW) {
        const flags =
          fsSync.constants.O_WRONLY | fsSync.constants.O_TRUNC | fsSync.constants.O_NOFOLLOW;

        const fd = await fs.open(resolvedPath, flags);
        try {
          await fd.writeFile(newContent, "utf-8");
        } finally {
          await fd.close();
        }
      } else {
        await fs.writeFile(resolvedPath, newContent, "utf-8");
      }

      return { path: filePath, filesUpdate: null, occurrences: occurrences };
    } catch (e: any) {
      return { error: `Error editing file '${filePath}': ${e.message}` };
    }
  }

  async grepRaw(
    pattern: string,
    dirPath = "/",
    glob: string | null = null,
  ): Promise<GrepMatch[] | string> {
    try {
      new RegExp(pattern);
    } catch (e: any) {
      return `Invalid regex pattern: ${e.message}`;
    }

    let baseFull: string;
    try {
      baseFull = this.resolvePath(dirPath || ".");
    } catch {
      return [];
    }

    try {
      await fs.stat(baseFull);
    } catch {
      return [];
    }

    let results = await this.ripgrepSearch(pattern, baseFull, glob);
    if (results === null) {
      results = await this.fallbackSearch(pattern, baseFull, glob);
    }

    const matches: GrepMatch[] = [];
    for (const [filePath, items] of Object.entries(results)) {
      for (const [lineNum, lineText] of items) {
        matches.push({ path: filePath, line: lineNum, text: lineText });
      }
    }
    return matches;
  }

  private async ripgrepSearch(
    pattern: string,
    baseFull: string,
    includeGlob: string | null,
  ): Promise<Record<string, Array<[number, string]>> | null> {
    return new Promise((resolve) => {
      const args = ["--json"];
      if (includeGlob) {
        args.push("--glob", includeGlob);
      }
      args.push("--", pattern, baseFull);

      const proc = spawn("rg", args, { timeout: 30000 });
      const results: Record<string, Array<[number, string]>> = {};
      let output = "";

      proc.stdout.on("data", (data) => {
        output += data.toString();
      });

      proc.on("close", (code) => {
        if (code !== 0 && code !== 1) {
          resolve(null);
          return;
        }

        for (const line of output.split("\n")) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.type !== "match") continue;

            const pdata = data.data || {};
            const ftext = pdata.path?.text;
            if (!ftext) continue;

            let virtPath: string | undefined;
            if (this.virtualMode) {
              try {
                const resolved = path.resolve(ftext);
                const relative = path.relative(this.cwd, resolved);
                if (relative.startsWith("..")) continue;
                const normalizedRelative = relative.split(path.sep).join("/");
                virtPath = `/${normalizedRelative}`;
              } catch {
                // ignore path errors
              }
            } else {
              virtPath = ftext;
            }

            if (!virtPath) {
              continue;
            }

            const ln = pdata.line_number;
            const lt = pdata.lines?.text?.replace(/\n$/, "") || "";
            if (ln === undefined) continue;

            if (!results[virtPath]) {
              results[virtPath] = [];
            }
            results[virtPath].push([ln, lt]);
          } catch {
            // ignore parse errors
          }
        }

        resolve(results);
      });

      proc.on("error", () => {
        resolve(null);
      });
    });
  }

  private async fallbackSearch(
    pattern: string,
    baseFull: string,
    includeGlob: string | null,
  ): Promise<Record<string, Array<[number, string]>>> {
    let regex: RegExp;
    try {
      regex = new RegExp(pattern);
    } catch {
      return {};
    }

    const results: Record<string, Array<[number, string]>> = {};
    const stat = await fs.stat(baseFull);
    const root = stat.isDirectory() ? baseFull : path.dirname(baseFull);

    const files = await fg("**/*", {
      cwd: root,
      absolute: true,
      onlyFiles: true,
      dot: true,
    });

    for (const fp of files) {
      try {
        if (includeGlob && !micromatch.isMatch(path.basename(fp), includeGlob)) {
          continue;
        }

        const stat = await fs.stat(fp);
        if (stat.size > this.maxFileSizeBytes) {
          continue;
        }

        const content = await fs.readFile(fp, "utf-8");
        const lines = content.split("\n");

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (regex.test(line)) {
            let virtPath: string | undefined;
            if (this.virtualMode) {
              try {
                const relative = path.relative(this.cwd, fp);
                if (relative.startsWith("..")) continue;
                const normalizedRelative = relative.split(path.sep).join("/");
                virtPath = `/${normalizedRelative}`;
              } catch {
                // ignore path errors
              }
            } else {
              virtPath = fp;
            }

            if (!virtPath) {
              continue;
            }

            if (!results[virtPath]) {
              results[virtPath] = [];
            }
            results[virtPath].push([i + 1, line]);
          }
        }
      } catch {
        // ignore file errors
      }
    }

    return results;
  }

  async globInfo(pattern: string, searchPath = "/"): Promise<FileInfo[]> {
    let effectivePattern = pattern;
    if (effectivePattern.startsWith("/")) {
      effectivePattern = effectivePattern.substring(1);
    }

    const resolvedSearchPath = searchPath === "/" ? this.cwd : this.resolvePath(searchPath);

    try {
      const stat = await fs.stat(resolvedSearchPath);
      if (!stat.isDirectory()) {
        return [];
      }
    } catch {
      return [];
    }

    const results: FileInfo[] = [];

    try {
      const matches = await fg(effectivePattern, {
        cwd: resolvedSearchPath,
        absolute: true,
        onlyFiles: true,
        dot: true,
      });

      for (const matchedPath of matches) {
        try {
          const stat = await fs.stat(matchedPath);
          if (!stat.isFile()) continue;

          const normalizedPath = matchedPath.split("/").join(path.sep);

          if (!this.virtualMode) {
            results.push({
              path: normalizedPath,
              is_dir: false,
              size: stat.size,
              modified_at: stat.mtime.toISOString(),
            });
          } else {
            const cwdStr = this.cwd.endsWith(path.sep) ? this.cwd : this.cwd + path.sep;
            let relativePath: string;

            if (normalizedPath.startsWith(cwdStr)) {
              relativePath = normalizedPath.substring(cwdStr.length);
            } else if (normalizedPath.startsWith(this.cwd)) {
              relativePath = normalizedPath.substring(this.cwd.length).replace(/^[/\\]/, "");
            } else {
              relativePath = normalizedPath;
            }

            relativePath = relativePath.split(path.sep).join("/");
            const virt = `/${relativePath}`;
            results.push({
              path: virt,
              is_dir: false,
              size: stat.size,
              modified_at: stat.mtime.toISOString(),
            });
          }
        } catch {
          // ignore file errors
        }
      }
    } catch {
      // ignore
    }

    results.sort((a, b) => a.path.localeCompare(b.path));
    return results;
  }
}
