import {
  createFileData,
  fileDataToString,
  formatReadResponse,
  globSearchFiles,
  grepMatchesFromFiles,
  performStringReplacement,
  updateFileData,
} from "../utils";
import type {
  DeleteOptions,
  DeleteResult,
  EditResult,
  FileData,
  FileInfo,
  FilesystemBackend,
  GrepMatch,
  MkdirResult,
  RmdirResult,
  WriteOptions,
  WriteResult,
} from "./backend";

export class InMemoryFilesystemBackend implements FilesystemBackend {
  private files: Record<string, FileData>;
  private directories: Set<string>;

  constructor(files: Record<string, FileData> = {}, directories: Set<string> = new Set()) {
    this.files = files;
    this.directories = directories;
  }

  private getFiles(): Record<string, FileData> {
    return this.files;
  }

  private getDirectories(): Set<string> {
    return this.directories;
  }

  private normalizeDirPath(path: string): string {
    const trimmed = path.trim();
    if (!trimmed) {
      return "/";
    }
    const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    return withSlash.endsWith("/") ? withSlash : `${withSlash}/`;
  }

  private hasDirectory(path: string): boolean {
    const dirPath = this.normalizeDirPath(path);
    if (dirPath === "/") {
      return true;
    }

    if (this.directories.has(dirPath)) {
      return true;
    }

    const files = this.getFiles();
    return Object.keys(files).some((filePath) => filePath.startsWith(dirPath));
  }

  lsInfo(path: string): FileInfo[] {
    const files = this.getFiles();
    const directories = this.getDirectories();
    const infos: FileInfo[] = [];
    const subdirs = new Set<string>();

    const normalizedPath = path.endsWith("/") ? path : `${path}/`;

    for (const [filePath, fd] of Object.entries(files)) {
      if (!filePath.startsWith(normalizedPath)) {
        continue;
      }

      const relative = filePath.substring(normalizedPath.length);
      if (relative.includes("/")) {
        const subdirName = relative.split("/")[0];
        subdirs.add(`${normalizedPath}${subdirName}/`);
        continue;
      }

      const size = fd.content.join("\n").length;
      infos.push({
        path: filePath,
        is_dir: false,
        size: size,
        modified_at: fd.modified_at,
      });
    }

    for (const dirPath of directories) {
      if (!dirPath.startsWith(normalizedPath) || dirPath === normalizedPath) {
        continue;
      }

      const relative = dirPath.substring(normalizedPath.length);
      if (!relative) {
        continue;
      }

      if (relative.includes("/")) {
        const subdirName = relative.split("/")[0];
        subdirs.add(`${normalizedPath}${subdirName}/`);
      } else {
        subdirs.add(dirPath);
      }
    }

    for (const subdir of Array.from(subdirs).sort()) {
      infos.push({
        path: subdir,
        is_dir: true,
        size: 0,
        modified_at: "",
      });
    }

    infos.sort((a, b) => a.path.localeCompare(b.path));
    return infos;
  }

  read(filePath: string, offset = 0, limit = 2000): string {
    const files = this.getFiles();
    const fileData = files[filePath];

    if (!fileData) {
      if (this.hasDirectory(filePath)) {
        return `Error: '${filePath}' is a directory`;
      }
      return `Error: File '${filePath}' not found`;
    }

    return formatReadResponse(fileData, offset, limit);
  }

  readRaw(filePath: string): FileData {
    const files = this.getFiles();
    const fileData = files[filePath];

    if (!fileData) {
      if (this.hasDirectory(filePath)) {
        throw new Error(`'${filePath}' is a directory`);
      }
      throw new Error(`File '${filePath}' not found`);
    }
    return fileData;
  }

  stat(filePath: string): FileInfo | null {
    const files = this.getFiles();
    const fileData = files[filePath];

    if (fileData) {
      const size = fileData.content.join("\n").length;
      return {
        path: filePath,
        is_dir: false,
        size,
        modified_at: fileData.modified_at,
        created_at: fileData.created_at,
      };
    }

    if (this.hasDirectory(filePath)) {
      return {
        path: this.normalizeDirPath(filePath),
        is_dir: true,
        size: 0,
        modified_at: "",
      };
    }

    return null;
  }

  exists(filePath: string): boolean {
    const files = this.getFiles();
    return Boolean(files[filePath]) || this.hasDirectory(filePath);
  }

  write(filePath: string, content: string, options?: WriteOptions): WriteResult {
    const files = this.getFiles();
    const overwrite = options?.overwrite ?? false;

    if (this.hasDirectory(filePath) || filePath.endsWith("/")) {
      return {
        error: `Cannot write to ${filePath} because it is a directory.`,
      };
    }

    if (filePath in files && !overwrite) {
      return {
        error: `Cannot write to ${filePath} because it already exists. Read and then make an edit, or write to a new path.`,
      };
    }

    const newFileData =
      filePath in files ? updateFileData(files[filePath], content) : createFileData(content);
    return {
      path: filePath,
      filesUpdate: { [filePath]: newFileData },
    };
  }

  edit(filePath: string, oldString: string, newString: string, replaceAll = false): EditResult {
    const files = this.getFiles();
    const fileData = files[filePath];

    if (!fileData) {
      if (this.hasDirectory(filePath)) {
        return { error: `Error: '${filePath}' is a directory` };
      }
      return { error: `Error: File '${filePath}' not found` };
    }

    const content = fileDataToString(fileData);
    const result = performStringReplacement(content, oldString, newString, replaceAll);

    if (typeof result === "string") {
      return { error: result };
    }

    const [newContent, occurrences] = result;
    const newFileData = updateFileData(fileData, newContent);
    return {
      path: filePath,
      filesUpdate: { [filePath]: newFileData },
      occurrences: occurrences,
    };
  }

  delete(filePath: string, options?: DeleteOptions): DeleteResult {
    const files = this.getFiles();
    const recursive = options?.recursive ?? false;

    if (!(filePath in files)) {
      if (this.hasDirectory(filePath)) {
        if (!recursive) {
          return { error: `Error: '${filePath}' is a directory` };
        }

        const dirPath = this.normalizeDirPath(filePath);
        const updates: Record<string, FileData | null> = {};
        for (const key of Object.keys(files)) {
          if (key.startsWith(dirPath)) {
            updates[key] = null;
          }
        }
        for (const dir of Array.from(this.directories)) {
          if (dir.startsWith(dirPath)) {
            this.directories.delete(dir);
          }
        }

        return {
          path: dirPath,
          filesUpdate: updates,
        };
      }
      return { error: `Error: File '${filePath}' not found` };
    }

    return {
      path: filePath,
      filesUpdate: { [filePath]: null },
    };
  }

  grepRaw(pattern: string, path = "/", glob: string | null = null): GrepMatch[] | string {
    const files = this.getFiles();
    return grepMatchesFromFiles(files, pattern, path, glob);
  }

  globInfo(pattern: string, path = "/"): FileInfo[] {
    const files = this.getFiles();
    const result = globSearchFiles(files, pattern, path);

    if (result === "No files found") {
      return [];
    }

    const paths = result.split("\n");
    const infos: FileInfo[] = [];
    for (const filePath of paths) {
      const fd = files[filePath];
      const size = fd ? fd.content.join("\n").length : 0;
      infos.push({
        path: filePath,
        is_dir: false,
        size: size,
        modified_at: fd?.modified_at || "",
      });
    }
    return infos;
  }

  mkdir(path: string, recursive = true): MkdirResult {
    const files = this.getFiles();
    const dirPath = this.normalizeDirPath(path);

    if (dirPath === "/") {
      return { path: dirPath };
    }

    const fileCollision = files[dirPath.slice(0, -1)];
    if (fileCollision) {
      return { error: `Cannot create directory ${dirPath} because a file exists at that path.` };
    }

    if (this.hasDirectory(dirPath)) {
      return { path: dirPath };
    }

    if (!recursive) {
      const trimmed = dirPath.slice(0, -1);
      const lastSlash = trimmed.lastIndexOf("/");
      const parent = lastSlash <= 0 ? "/" : `${trimmed.slice(0, lastSlash)}/`;
      if (!this.hasDirectory(parent)) {
        return {
          error: `Parent directory '${parent}' does not exist. Use recursive=true to create it.`,
        };
      }
    }

    this.directories.add(dirPath);
    return { path: dirPath };
  }

  rmdir(path: string, recursive = false): RmdirResult {
    const dirPath = this.normalizeDirPath(path);

    if (dirPath === "/") {
      return { error: "Cannot remove root directory '/'." };
    }

    if (!this.hasDirectory(dirPath)) {
      return { error: `Directory '${dirPath}' not found.` };
    }

    const files = this.getFiles();
    const hasChildren = Object.keys(files).some((filePath) => filePath.startsWith(dirPath));
    const hasSubdirs = Array.from(this.directories).some(
      (child) => child !== dirPath && child.startsWith(dirPath),
    );

    if ((hasChildren || hasSubdirs) && !recursive) {
      return {
        error: `Directory '${dirPath}' is not empty. Use recursive=true to remove it.`,
      };
    }

    const updates: Record<string, FileData | null> = {};
    if (recursive) {
      for (const key of Object.keys(files)) {
        if (key.startsWith(dirPath)) {
          updates[key] = null;
        }
      }
      for (const dir of Array.from(this.directories)) {
        if (dir.startsWith(dirPath)) {
          this.directories.delete(dir);
        }
      }
    } else {
      this.directories.delete(dirPath);
    }

    return { path: dirPath, filesUpdate: Object.keys(updates).length > 0 ? updates : null };
  }
}
