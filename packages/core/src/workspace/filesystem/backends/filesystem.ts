import { spawn } from "node:child_process";
import * as fsSync from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import micromatch from "micromatch";
import {
  MAX_GREP_LINE_LENGTH,
  MAX_GREP_MATCHES,
  assessRegexPattern,
  checkEmptyContent,
  formatContentWithLineNumbers,
  performStringReplacement,
} from "../utils";
import type {
  DeleteOptions,
  DeleteResult,
  EditResult,
  FileData,
  FileInfo,
  FilesystemBackend as FilesystemBackendProtocol,
  GrepMatch,
  MkdirResult,
  RmdirResult,
  WriteOptions,
  WriteResult,
} from "./backend";

const SUPPORTS_NOFOLLOW = fsSync.constants.O_NOFOLLOW !== undefined;
type FastGlobFn = typeof import("fast-glob");
let fastGlobPromise: Promise<FastGlobFn> | undefined;

async function loadFastGlob(): Promise<FastGlobFn> {
  if (!fastGlobPromise) {
    fastGlobPromise = import("fast-glob").then((mod) => {
      const resolved =
        (mod as unknown as { default?: FastGlobFn }).default ?? (mod as unknown as FastGlobFn);
      return resolved;
    });
  }
  return fastGlobPromise;
}

export class NodeFilesystemBackend implements FilesystemBackendProtocol {
  private cwd: string;
  private virtualMode: boolean;
  private readonly contained: boolean;
  private maxFileSizeBytes: number;

  constructor(
    options: {
      rootDir?: string;
      virtualMode?: boolean;
      contained?: boolean;
      maxFileSizeMb?: number;
    } = {},
  ) {
    const { rootDir, virtualMode = true, contained = true, maxFileSizeMb = 10 } = options;
    this.cwd = rootDir ? path.resolve(rootDir) : process.cwd();
    this.virtualMode = virtualMode;
    this.contained = contained;
    this.maxFileSizeBytes = maxFileSizeMb * 1024 * 1024;
  }

  private resolvePath(key: string): string {
    const trimmed = key.trim();
    if (!trimmed) {
      throw new Error("Path cannot be empty");
    }

    const normalized = trimmed.replace(/\\/g, "/");
    const cleaned = normalized.replace(/^\/+/, "");
    const normalizedInput = path.normalize(cleaned);

    if (this.virtualMode || this.contained) {
      const full = path.resolve(this.cwd, normalizedInput);
      if (this.contained) {
        const relative = path.relative(this.cwd, full);
        if (relative.startsWith("..") || path.isAbsolute(relative)) {
          throw new Error(`Path: ${full} outside root directory: ${this.cwd}`);
        }
      }
      return full;
    }

    if (path.isAbsolute(normalized)) {
      return path.resolve(normalized);
    }
    return path.resolve(this.cwd, normalized);
  }

  private isEnoentError(error: unknown): boolean {
    if (!error || typeof error !== "object") {
      return false;
    }
    return "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT";
  }

  private async assertPathContained(absolutePath: string): Promise<void> {
    if (!this.contained) {
      return;
    }

    let baseReal: string;
    try {
      baseReal = await fs.realpath(this.cwd);
    } catch (error: unknown) {
      if (this.isEnoentError(error)) {
        throw new Error(`Root directory not found: ${this.cwd}`);
      }
      throw error;
    }

    let targetReal: string | undefined;
    try {
      targetReal = await fs.realpath(absolutePath);
    } catch (error: unknown) {
      if (this.isEnoentError(error)) {
        let parentPath = absolutePath;
        while (true) {
          const nextParent = path.dirname(parentPath);
          if (nextParent === parentPath) {
            throw new Error(`Path: ${absolutePath} outside root directory: ${this.cwd}`);
          }
          parentPath = nextParent;
          try {
            targetReal = await fs.realpath(parentPath);
            break;
          } catch (parentError: unknown) {
            if (!this.isEnoentError(parentError)) {
              throw parentError;
            }
          }
        }
      } else {
        throw error;
      }
    }

    if (!targetReal) {
      throw new Error(`Path: ${absolutePath} outside root directory: ${this.cwd}`);
    }

    if (targetReal !== baseReal && !targetReal.startsWith(`${baseReal}${path.sep}`)) {
      throw new Error(`Path: ${absolutePath} outside root directory: ${this.cwd}`);
    }
  }

  private toVirtualPath(fullPath: string, isDir: boolean): string {
    const cwdStr = this.cwd.endsWith(path.sep) ? this.cwd : this.cwd + path.sep;
    let relativePath: string;

    if (fullPath.startsWith(cwdStr)) {
      relativePath = fullPath.substring(cwdStr.length);
    } else if (fullPath.startsWith(this.cwd)) {
      relativePath = fullPath.substring(this.cwd.length).replace(/^[/\\]/, "");
    } else {
      relativePath = fullPath;
    }

    relativePath = relativePath.split(path.sep).join("/");
    const virt = `/${relativePath}`;
    if (!isDir) {
      return virt;
    }
    return virt.endsWith("/") ? virt : `${virt}/`;
  }

  async lsInfo(dirPath: string): Promise<FileInfo[]> {
    try {
      const resolvedPath = this.resolvePath(dirPath);
      await this.assertPathContained(resolvedPath);
      const stat = await fs.lstat(resolvedPath);

      if (stat.isSymbolicLink() || !stat.isDirectory()) {
        return [];
      }

      const entries = await fs.readdir(resolvedPath, { withFileTypes: true });
      const results: FileInfo[] = [];

      const cwdStr = this.cwd.endsWith(path.sep) ? this.cwd : this.cwd + path.sep;

      for (const entry of entries) {
        const fullPath = path.join(resolvedPath, entry.name);

        try {
          await this.assertPathContained(fullPath);
          const entryStat = await fs.lstat(fullPath);
          if (entryStat.isSymbolicLink()) {
            continue;
          }
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
      await this.assertPathContained(resolvedPath);

      let content: string;

      if (SUPPORTS_NOFOLLOW) {
        const stat = await fs.lstat(resolvedPath);
        if (stat.isSymbolicLink()) {
          return `Error: Symlinks are not allowed: ${filePath}`;
        }
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
    await this.assertPathContained(resolvedPath);

    let content: string;
    let stat: fsSync.Stats;

    if (SUPPORTS_NOFOLLOW) {
      stat = await fs.lstat(resolvedPath);
      if (stat.isSymbolicLink()) {
        throw new Error(`Symlinks are not allowed: ${filePath}`);
      }
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

  async stat(filePath: string): Promise<FileInfo | null> {
    try {
      const resolvedPath = this.resolvePath(filePath);
      await this.assertPathContained(resolvedPath);
      const stat = await fs.lstat(resolvedPath);

      if (stat.isSymbolicLink()) {
        throw new Error(`Symlinks are not allowed: ${filePath}`);
      }

      const isDir = stat.isDirectory();
      const pathValue = this.virtualMode
        ? this.toVirtualPath(resolvedPath, isDir)
        : isDir
          ? resolvedPath.endsWith(path.sep)
            ? resolvedPath
            : `${resolvedPath}${path.sep}`
          : resolvedPath;

      return {
        path: pathValue,
        is_dir: isDir,
        size: isDir ? 0 : stat.size,
        modified_at: stat.mtime.toISOString(),
        created_at: stat.ctime.toISOString(),
      };
    } catch {
      return null;
    }
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      const resolvedPath = this.resolvePath(filePath);
      await this.assertPathContained(resolvedPath);
      const stat = await fs.lstat(resolvedPath);
      if (stat.isSymbolicLink()) {
        return false;
      }
      return stat.isFile() || stat.isDirectory();
    } catch {
      return false;
    }
  }

  async write(filePath: string, content: string, options?: WriteOptions): Promise<WriteResult> {
    try {
      const resolvedPath = this.resolvePath(filePath);
      await this.assertPathContained(resolvedPath);
      const overwrite = options?.overwrite ?? false;

      try {
        const stat = await fs.lstat(resolvedPath);
        if (stat.isSymbolicLink()) {
          return {
            error: `Cannot write to ${filePath} because it is a symlink. Symlinks are not allowed.`,
          };
        }
        if (!stat.isFile()) {
          return {
            error: `Cannot write to ${filePath} because it is not a file.`,
          };
        }
        if (!overwrite) {
          return {
            error: `Cannot write to ${filePath} because it already exists. Read and then make an edit, or write to a new path.`,
          };
        }
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
        try {
          const stat = await fs.lstat(resolvedPath);
          if (stat.isSymbolicLink()) {
            return {
              error: `Cannot write to ${filePath} because it is a symlink. Symlinks are not allowed.`,
            };
          }
          if (!stat.isFile()) {
            return {
              error: `Cannot write to ${filePath} because it is not a file.`,
            };
          }
          if (!overwrite) {
            return {
              error: `Cannot write to ${filePath} because it already exists. Read and then make an edit, or write to a new path.`,
            };
          }
        } catch {
          // File does not exist
        }
        await fs.writeFile(resolvedPath, content, "utf-8");
      }

      return { path: filePath, filesUpdate: null };
    } catch (e: any) {
      return { error: `Error writing file '${filePath}': ${e.message}` };
    }
  }

  async mkdir(dirPath: string, recursive = true): Promise<MkdirResult> {
    try {
      const resolvedPath = this.resolvePath(dirPath);
      await this.assertPathContained(resolvedPath);
      try {
        const existing = await fs.lstat(resolvedPath);
        if (existing.isSymbolicLink()) {
          return { error: `Cannot create directory '${dirPath}' because it is a symlink.` };
        }
        if (existing.isDirectory()) {
          const pathValue = this.virtualMode
            ? this.toVirtualPath(resolvedPath, true)
            : resolvedPath.endsWith(path.sep)
              ? resolvedPath
              : `${resolvedPath}${path.sep}`;
          return { path: pathValue };
        }
        return {
          error: `Cannot create directory '${dirPath}' because a file exists at that path.`,
        };
      } catch {
        // does not exist
      }

      await fs.mkdir(resolvedPath, { recursive });
      const pathValue = this.virtualMode
        ? this.toVirtualPath(resolvedPath, true)
        : resolvedPath.endsWith(path.sep)
          ? resolvedPath
          : `${resolvedPath}${path.sep}`;
      return { path: pathValue };
    } catch (error: any) {
      return {
        error: `Error creating directory '${dirPath}': ${error?.message ? String(error.message) : "unknown error"}`,
      };
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
      await this.assertPathContained(resolvedPath);

      let content: string;

      if (SUPPORTS_NOFOLLOW) {
        const stat = await fs.lstat(resolvedPath);
        if (stat.isSymbolicLink()) {
          return { error: `Error: Symlinks are not allowed: ${filePath}` };
        }
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

  async delete(filePath: string, options?: DeleteOptions): Promise<DeleteResult> {
    try {
      const resolvedPath = this.resolvePath(filePath);
      await this.assertPathContained(resolvedPath);
      const stat = await fs.lstat(resolvedPath);

      if (stat.isSymbolicLink()) {
        return { error: `Error: Symlinks are not allowed: ${filePath}` };
      }

      if (stat.isDirectory()) {
        if (!options?.recursive) {
          return { error: `Error: '${filePath}' is a directory` };
        }
        await fs.rm(resolvedPath, { recursive: true, force: false });
        return { path: filePath, filesUpdate: null };
      }

      if (!stat.isFile()) {
        return { error: `Error: File '${filePath}' not found` };
      }

      await fs.unlink(resolvedPath);
      return { path: filePath, filesUpdate: null };
    } catch (e: any) {
      return { error: `Error deleting file '${filePath}': ${e.message}` };
    }
  }

  async rmdir(dirPath: string, recursive = false): Promise<RmdirResult> {
    try {
      const resolvedPath = this.resolvePath(dirPath);
      await this.assertPathContained(resolvedPath);
      const stat = await fs.lstat(resolvedPath);

      if (stat.isSymbolicLink()) {
        return { error: `Error: Symlinks are not allowed: ${dirPath}` };
      }

      if (!stat.isDirectory()) {
        return { error: `Error: Directory '${dirPath}' not found` };
      }

      if (recursive) {
        await fs.rm(resolvedPath, { recursive: true, force: false });
      } else {
        await fs.rmdir(resolvedPath);
      }

      return { path: dirPath };
    } catch (e: any) {
      return { error: `Error removing directory '${dirPath}': ${e.message}` };
    }
  }

  async grepRaw(
    pattern: string,
    dirPath = "/",
    glob: string | null = null,
  ): Promise<GrepMatch[] | string> {
    const safety = assessRegexPattern(pattern);
    const useLiteral = !safety.safe;
    if (!useLiteral) {
      try {
        new RegExp(pattern);
      } catch (e: any) {
        return `Invalid regex pattern: ${e.message}`;
      }
    }

    let baseFull: string;
    try {
      baseFull = this.resolvePath(dirPath || ".");
      await this.assertPathContained(baseFull);
    } catch {
      return [];
    }

    try {
      await fs.lstat(baseFull);
    } catch {
      return [];
    }

    let results = await this.ripgrepSearch(pattern, baseFull, glob, useLiteral);
    if (results === null) {
      results = await this.fallbackSearch(pattern, baseFull, glob, useLiteral);
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
    literal = false,
  ): Promise<Record<string, Array<[number, string]>> | null> {
    return new Promise((resolve) => {
      const args = ["--json"];
      if (literal) {
        args.push("-F");
      }
      if (includeGlob) {
        args.push("--glob", includeGlob);
      }
      args.push("--", pattern, baseFull);

      const proc = spawn("rg", args, { timeout: 30000 });
      const results: Record<string, Array<[number, string]>> = {};
      let buffer = "";
      let matchCount = 0;
      let resolved = false;

      const finish = (value: Record<string, Array<[number, string]>> | null) => {
        if (resolved) {
          return;
        }
        resolved = true;
        resolve(value);
      };

      const handleLine = (line: string) => {
        if (!line.trim()) {
          return;
        }
        try {
          const data = JSON.parse(line);
          if (data.type !== "match") {
            return;
          }

          const pdata = data.data || {};
          const ftext = pdata.path?.text;
          if (!ftext) {
            return;
          }

          let virtPath: string | undefined;
          if (this.virtualMode) {
            try {
              const resolvedPath = path.resolve(ftext);
              const relative = path.relative(this.cwd, resolvedPath);
              if (relative.startsWith("..")) {
                return;
              }
              const normalizedRelative = relative.split(path.sep).join("/");
              virtPath = `/${normalizedRelative}`;
            } catch {
              return;
            }
          } else {
            virtPath = ftext;
          }

          if (!virtPath) {
            return;
          }

          const ln = pdata.line_number;
          const lt = pdata.lines?.text?.replace(/\n$/, "") || "";
          if (ln === undefined) {
            return;
          }

          if (!results[virtPath]) {
            results[virtPath] = [];
          }
          results[virtPath].push([ln, lt]);
          matchCount += 1;
          if (matchCount >= MAX_GREP_MATCHES) {
            try {
              proc.kill();
            } catch {
              // ignore kill failures
            }
            finish(results);
          }
        } catch {
          // ignore parse errors
        }
      };

      proc.stdout.on("data", (data) => {
        if (resolved) {
          return;
        }
        buffer += data.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          handleLine(line);
          if (resolved) {
            return;
          }
        }
      });

      proc.on("close", (code) => {
        if (resolved) {
          return;
        }
        if (code !== 0 && code !== 1) {
          finish(null);
          return;
        }

        if (buffer.trim()) {
          handleLine(buffer);
        }
        finish(results);
      });

      proc.on("error", () => {
        finish(null);
      });
    });
  }

  private async fallbackSearch(
    pattern: string,
    baseFull: string,
    includeGlob: string | null,
    forceLiteral = false,
  ): Promise<Record<string, Array<[number, string]>>> {
    const safety = assessRegexPattern(pattern);
    const useLiteral = forceLiteral || !safety.safe;

    let regex: RegExp | null = null;
    if (!useLiteral) {
      try {
        regex = new RegExp(pattern);
      } catch {
        return {};
      }
    }

    const results: Record<string, Array<[number, string]>> = {};
    const stat = await fs.lstat(baseFull);
    const root = stat.isDirectory() ? baseFull : path.dirname(baseFull);

    const fg = await loadFastGlob();
    const files = await fg("**/*", {
      cwd: root,
      absolute: true,
      onlyFiles: true,
      dot: true,
      followSymbolicLinks: false,
    });

    let matchCount = 0;
    for (const fp of files) {
      try {
        if (includeGlob) {
          const relativePath = path.relative(root, fp);
          const normalizedRelative = relativePath.split(path.sep).join("/");
          if (!micromatch.isMatch(normalizedRelative, includeGlob)) {
            continue;
          }
        }

        const stat = await fs.lstat(fp);
        if (stat.isSymbolicLink()) {
          continue;
        }
        await this.assertPathContained(fp);
        if (stat.size > this.maxFileSizeBytes) {
          continue;
        }

        const content = await fs.readFile(fp, "utf-8");
        const lines = content.split("\n");

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (matchCount >= MAX_GREP_MATCHES) {
            return results;
          }
          const candidate =
            line.length > MAX_GREP_LINE_LENGTH ? line.slice(0, MAX_GREP_LINE_LENGTH) : line;
          let matched = false;
          if (useLiteral) {
            matched = candidate.includes(pattern);
          } else if (regex) {
            try {
              matched = regex.test(candidate);
            } catch {
              matched = false;
            }
          }
          if (matched) {
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
            matchCount++;
            if (matchCount >= MAX_GREP_MATCHES) {
              return results;
            }
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
      await this.assertPathContained(resolvedSearchPath);
      const stat = await fs.lstat(resolvedSearchPath);
      if (stat.isSymbolicLink() || !stat.isDirectory()) {
        return [];
      }
    } catch {
      return [];
    }

    const results: FileInfo[] = [];

    try {
      const fg = await loadFastGlob();
      const matches = await fg(effectivePattern, {
        cwd: resolvedSearchPath,
        absolute: true,
        onlyFiles: true,
        dot: true,
        followSymbolicLinks: false,
      });

      for (const matchedPath of matches) {
        try {
          await this.assertPathContained(matchedPath);
          const stat = await fs.lstat(matchedPath);
          if (stat.isSymbolicLink()) continue;
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
