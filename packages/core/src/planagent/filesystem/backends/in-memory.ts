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
  EditResult,
  FileData,
  FileInfo,
  FilesystemBackend,
  GrepMatch,
  WriteResult,
} from "./backend";

export class InMemoryFilesystemBackend implements FilesystemBackend {
  private files: Record<string, FileData>;

  constructor(files: Record<string, FileData> = {}) {
    this.files = files;
  }

  private getFiles(): Record<string, FileData> {
    return this.files;
  }

  lsInfo(path: string): FileInfo[] {
    const files = this.getFiles();
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
      return `Error: File '${filePath}' not found`;
    }

    return formatReadResponse(fileData, offset, limit);
  }

  readRaw(filePath: string): FileData {
    const files = this.getFiles();
    const fileData = files[filePath];

    if (!fileData) throw new Error(`File '${filePath}' not found`);
    return fileData;
  }

  write(filePath: string, content: string): WriteResult {
    const files = this.getFiles();

    if (filePath in files) {
      return {
        error: `Cannot write to ${filePath} because it already exists. Read and then make an edit, or write to a new path.`,
      };
    }

    const newFileData = createFileData(content);
    return {
      path: filePath,
      filesUpdate: { [filePath]: newFileData },
    };
  }

  edit(filePath: string, oldString: string, newString: string, replaceAll = false): EditResult {
    const files = this.getFiles();
    const fileData = files[filePath];

    if (!fileData) {
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
}
