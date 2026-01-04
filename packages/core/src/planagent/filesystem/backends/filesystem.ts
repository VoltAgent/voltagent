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

type NodeRuntimeModules = {
  spawn: typeof import("node:child_process").spawn;
  fsSync: typeof import("node:fs");
  fs: typeof import("node:fs/promises");
  path: typeof import("node:path");
  fg: FastGlob;
  micromatch: Micromatch;
};

type NodeRuntimeState = NodeRuntimeModules & {
  cwd: string;
  supportsNoFollow: boolean;
};

let nodeModulesPromise: Promise<NodeRuntimeModules> | null = null;

type FastGlob = typeof import("fast-glob");
type Micromatch = typeof import("micromatch");

const resolveFastGlob = (moduleValue: unknown): FastGlob => {
  const wrapped = moduleValue as { default?: FastGlob };
  return wrapped.default ?? (moduleValue as FastGlob);
};

const resolveMicromatch = (moduleValue: unknown): Micromatch => {
  const wrapped = moduleValue as { default?: Micromatch };
  return wrapped.default ?? (moduleValue as Micromatch);
};

// Lazy-load Node-only modules so edge bundles don't execute them at startup.
const loadNodeModules = async (): Promise<NodeRuntimeModules> => {
  if (!nodeModulesPromise) {
    nodeModulesPromise = (async () => {
      const [childProcess, fsSync, fs, path, fgModule, micromatchModule] = await Promise.all([
        import("node:child_process"),
        import("node:fs"),
        import("node:fs/promises"),
        import("node:path"),
        import("fast-glob"),
        import("micromatch"),
      ]);
      const fg = resolveFastGlob(fgModule as unknown);
      const micromatch = resolveMicromatch(micromatchModule as unknown);
      return {
        spawn: childProcess.spawn,
        fsSync,
        fs,
        path,
        fg,
        micromatch,
      };
    })();
  }
  return nodeModulesPromise ?? Promise.reject(new Error("Failed to load Node filesystem modules."));
};

export class NodeFilesystemBackend implements FilesystemBackendProtocol {
  private cwd: string | null;
  private rootDir?: string;
  private virtualMode: boolean;
  private maxFileSizeBytes: number;
  private runtimePromise: Promise<NodeRuntimeState> | null = null;

  constructor(
    options: {
      rootDir?: string;
      virtualMode?: boolean;
      maxFileSizeMb?: number;
    } = {},
  ) {
    const { rootDir, virtualMode = false, maxFileSizeMb = 10 } = options;
    this.rootDir = rootDir;
    this.cwd = null;
    this.virtualMode = virtualMode;
    this.maxFileSizeBytes = maxFileSizeMb * 1024 * 1024;
  }

  private async getRuntime(): Promise<NodeRuntimeState> {
    if (!this.runtimePromise) {
      this.runtimePromise = loadNodeModules().then((modules) => {
        if (typeof process === "undefined" || typeof process.cwd !== "function") {
          throw new Error("NodeFilesystemBackend requires a Node.js runtime.");
        }

        if (this.cwd === null) {
          this.cwd = this.rootDir ? modules.path.resolve(this.rootDir) : process.cwd();
        }

        const resolvedCwd = this.cwd ?? process.cwd();

        return {
          ...modules,
          cwd: resolvedCwd,
          supportsNoFollow: modules.fsSync.constants?.O_NOFOLLOW !== undefined,
        };
      });
    }

    return this.runtimePromise;
  }

  private resolvePath(key: string, runtime: NodeRuntimeState): string {
    const { path, cwd } = runtime;
    if (this.virtualMode) {
      const vpath = key.startsWith("/") ? key : `/${key}`;
      if (vpath.includes("..") || vpath.startsWith("~")) {
        throw new Error("Path traversal not allowed");
      }
      const full = path.resolve(cwd, vpath.substring(1));
      const relative = path.relative(cwd, full);
      if (relative.startsWith("..") || path.isAbsolute(relative)) {
        throw new Error(`Path: ${full} outside root directory: ${cwd}`);
      }
      return full;
    }

    if (path.isAbsolute(key)) {
      return key;
    }
    return path.resolve(cwd, key);
  }

  async lsInfo(dirPath: string): Promise<FileInfo[]> {
    try {
      const runtime = await this.getRuntime();
      const { fs, path, cwd } = runtime;
      const resolvedPath = this.resolvePath(dirPath, runtime);
      const stat = await fs.stat(resolvedPath);

      if (!stat.isDirectory()) {
        return [];
      }

      const entries = await fs.readdir(resolvedPath, { withFileTypes: true });
      const results: FileInfo[] = [];

      const cwdStr = cwd.endsWith(path.sep) ? cwd : cwd + path.sep;

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
            } else if (fullPath.startsWith(cwd)) {
              relativePath = fullPath.substring(cwd.length).replace(/^[/\\]/, "");
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
      const runtime = await this.getRuntime();
      const { fs, fsSync } = runtime;
      const resolvedPath = this.resolvePath(filePath, runtime);

      let content: string;

      if (runtime.supportsNoFollow) {
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
    const runtime = await this.getRuntime();
    const { fs, fsSync } = runtime;
    const resolvedPath = this.resolvePath(filePath, runtime);

    let content: string;
    let stat: import("node:fs").Stats;

    if (runtime.supportsNoFollow) {
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
      const runtime = await this.getRuntime();
      const { fs, fsSync, path } = runtime;
      const resolvedPath = this.resolvePath(filePath, runtime);

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

      if (runtime.supportsNoFollow) {
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
      const runtime = await this.getRuntime();
      const { fs, fsSync } = runtime;
      const resolvedPath = this.resolvePath(filePath, runtime);

      let content: string;

      if (runtime.supportsNoFollow) {
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

      if (runtime.supportsNoFollow) {
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
      const runtime = await this.getRuntime();
      baseFull = this.resolvePath(dirPath || ".", runtime);
    } catch {
      return [];
    }

    try {
      const runtime = await this.getRuntime();
      await runtime.fs.stat(baseFull);
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
    const runtime = await this.getRuntime();
    const { spawn, path, cwd } = runtime;
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
                const relative = path.relative(cwd, resolved);
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

    const runtime = await this.getRuntime();
    const { fs, path, fg, micromatch, cwd } = runtime;
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
                const relative = path.relative(cwd, fp);
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

    const runtime = await this.getRuntime();
    const { fs, path, fg, cwd } = runtime;
    const resolvedSearchPath = searchPath === "/" ? cwd : this.resolvePath(searchPath, runtime);

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
            const cwdStr = cwd.endsWith(path.sep) ? cwd : cwd + path.sep;
            let relativePath: string;

            if (normalizedPath.startsWith(cwdStr)) {
              relativePath = normalizedPath.substring(cwdStr.length);
            } else if (normalizedPath.startsWith(cwd)) {
              relativePath = normalizedPath.substring(cwd.length).replace(/^[/\\]/, "");
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
