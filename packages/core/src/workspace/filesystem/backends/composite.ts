import { posix as posixPath } from "node:path";
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

export class CompositeFilesystemBackend implements FilesystemBackend {
  private defaultBackend: FilesystemBackend;
  private routes: Record<string, FilesystemBackend>;
  private sortedRoutes: Array<[string, FilesystemBackend]>;

  constructor(defaultBackend: FilesystemBackend, routes: Record<string, FilesystemBackend>) {
    this.defaultBackend = defaultBackend;
    this.routes = routes;

    this.sortedRoutes = Object.entries(routes).sort((a, b) => b[0].length - a[0].length);
  }

  private getBackendAndKey(key: string): [FilesystemBackend, string] {
    for (const [prefix, backend] of this.sortedRoutes) {
      if (key.startsWith(prefix)) {
        const suffix = key.substring(prefix.length);
        const strippedKey = suffix ? `/${suffix}` : "/";
        return [backend, strippedKey];
      }
    }

    return [this.defaultBackend, key];
  }

  private getMountPrefix(key: string): string | null {
    for (const [prefix] of this.sortedRoutes) {
      if (key.startsWith(prefix)) {
        return prefix;
      }
    }
    return null;
  }

  private remapFilesUpdate(
    filesUpdate: Record<string, FileData | null>,
    mountPrefix: string,
  ): Record<string, FileData | null> {
    const prefix = mountPrefix.endsWith("/") ? mountPrefix.slice(0, -1) : mountPrefix;
    const remapped: Record<string, FileData | null> = {};
    for (const [key, value] of Object.entries(filesUpdate)) {
      const normalizedKey = key.startsWith("/") ? key : `/${key}`;
      const mappedPath = posixPath.normalize(`${prefix}${normalizedKey}`);
      remapped[mappedPath] = value;
    }
    return remapped;
  }

  private remapFilesUpdateResult<
    T extends { filesUpdate?: Record<string, FileData | null> | null },
  >(result: T, mountPrefix: string | null): T {
    if (!mountPrefix || !result.filesUpdate) {
      return result;
    }
    return {
      ...result,
      filesUpdate: this.remapFilesUpdate(result.filesUpdate, mountPrefix),
    };
  }

  async lsInfo(path: string): Promise<FileInfo[]> {
    for (const [routePrefix, backend] of this.sortedRoutes) {
      const normalizedPrefix = routePrefix.endsWith("/") ? routePrefix : `${routePrefix}/`;
      const prefixRoot = normalizedPrefix.slice(0, -1);
      if (path === prefixRoot || path.startsWith(normalizedPrefix)) {
        const suffix = path === prefixRoot ? "" : path.substring(normalizedPrefix.length);
        const searchPath = suffix ? `/${suffix}` : "/";
        const infos = await backend.lsInfo(searchPath);

        return infos.map((info) => ({
          ...info,
          path: routePrefix.slice(0, -1) + info.path,
        }));
      }
    }

    if (path === "/") {
      const results: FileInfo[] = [];
      const defaultInfos = await this.defaultBackend.lsInfo(path);
      results.push(...defaultInfos);

      for (const [routePrefix] of this.sortedRoutes) {
        results.push({
          path: routePrefix,
          is_dir: true,
          size: 0,
          modified_at: "",
        });
      }

      results.sort((a, b) => a.path.localeCompare(b.path));
      return results;
    }

    return await this.defaultBackend.lsInfo(path);
  }

  async read(filePath: string, offset = 0, limit = 2000): Promise<string> {
    const [backend, strippedKey] = this.getBackendAndKey(filePath);
    return await backend.read(strippedKey, offset, limit);
  }

  async readRaw(filePath: string): Promise<FileData> {
    const [backend, strippedKey] = this.getBackendAndKey(filePath);
    return await backend.readRaw(strippedKey);
  }

  async stat(filePath: string): Promise<FileInfo | null> {
    for (const [routePrefix, backend] of this.sortedRoutes) {
      const normalizedPrefix = routePrefix.endsWith("/") ? routePrefix : `${routePrefix}/`;
      if (filePath === routePrefix || filePath === normalizedPrefix) {
        return {
          path: normalizedPrefix,
          is_dir: true,
          size: 0,
          modified_at: "",
        };
      }
      if (filePath.startsWith(normalizedPrefix)) {
        if (!backend.stat) {
          return null;
        }
        const suffix = filePath.substring(routePrefix.length);
        const strippedPath = suffix ? `/${suffix}` : "/";
        const info = await backend.stat(strippedPath);
        if (!info) {
          return null;
        }
        return {
          ...info,
          path: routePrefix.slice(0, -1) + info.path,
        };
      }
    }

    if (!this.defaultBackend.stat) {
      return null;
    }
    return await this.defaultBackend.stat(filePath);
  }

  async exists(filePath: string): Promise<boolean> {
    const [backend, strippedKey] = this.getBackendAndKey(filePath);
    if (backend.exists) {
      return await backend.exists(strippedKey);
    }
    if (backend.stat) {
      const info = await backend.stat(strippedKey);
      return Boolean(info);
    }
    try {
      await backend.readRaw(strippedKey);
      return true;
    } catch {
      return false;
    }
  }

  async grepRaw(
    pattern: string,
    path = "/",
    glob: string | null = null,
  ): Promise<GrepMatch[] | string> {
    const errors: string[] = [];
    for (const [routePrefix, backend] of this.sortedRoutes) {
      const prefix = routePrefix.replace(/\/$/, "");
      if (path.startsWith(prefix)) {
        const searchPath = path.substring(prefix.length) || "/";
        const raw = await backend.grepRaw(pattern, searchPath, glob);

        if (typeof raw === "string") {
          errors.push(raw);
          continue;
        }

        return raw.map((match) => ({
          ...match,
          path: routePrefix.slice(0, -1) + match.path,
        }));
      }
    }

    const allMatches: GrepMatch[] = [];
    const rawDefault = await this.defaultBackend.grepRaw(pattern, path, glob);

    if (typeof rawDefault === "string") {
      errors.push(rawDefault);
    } else {
      allMatches.push(...rawDefault);
    }

    for (const [routePrefix, backend] of Object.entries(this.routes)) {
      const raw = await backend.grepRaw(pattern, "/", glob);

      if (typeof raw === "string") {
        errors.push(raw);
        continue;
      }

      allMatches.push(
        ...raw.map((match) => ({
          ...match,
          path: routePrefix.slice(0, -1) + match.path,
        })),
      );
    }

    if (allMatches.length > 0) {
      return allMatches;
    }
    if (errors.length > 0) {
      return errors[0];
    }
    return allMatches;
  }

  async globInfo(pattern: string, path = "/"): Promise<FileInfo[]> {
    const results: FileInfo[] = [];

    for (const [routePrefix, backend] of this.sortedRoutes) {
      const normalizedPrefix = routePrefix.endsWith("/") ? routePrefix : `${routePrefix}/`;
      const prefixRoot = normalizedPrefix.slice(0, -1);
      if (path === prefixRoot || path.startsWith(normalizedPrefix)) {
        const suffix = path === prefixRoot ? "" : path.substring(normalizedPrefix.length);
        const searchPath = suffix ? `/${suffix}` : "/";
        const infos = await backend.globInfo(pattern, searchPath);

        return infos.map((info) => ({
          ...info,
          path: routePrefix.slice(0, -1) + info.path,
        }));
      }
    }

    const defaultInfos = await this.defaultBackend.globInfo(pattern, path);
    results.push(...defaultInfos);

    for (const [routePrefix, backend] of Object.entries(this.routes)) {
      const infos = await backend.globInfo(pattern, "/");
      results.push(
        ...infos.map((info) => ({
          ...info,
          path: routePrefix.slice(0, -1) + info.path,
        })),
      );
    }

    results.sort((a, b) => a.path.localeCompare(b.path));
    return results;
  }

  async write(filePath: string, content: string, options?: WriteOptions): Promise<WriteResult> {
    const [backend, strippedKey] = this.getBackendAndKey(filePath);
    const result = await backend.write(strippedKey, content, options);
    const matchedPrefix = this.getMountPrefix(filePath);
    const remapped = this.remapFilesUpdateResult(result, matchedPrefix);
    if (!remapped.path || !matchedPrefix || backend === this.defaultBackend) {
      return remapped;
    }
    return {
      ...remapped,
      path: matchedPrefix.slice(0, -1) + remapped.path,
    };
  }

  async edit(
    filePath: string,
    oldString: string,
    newString: string,
    replaceAll = false,
  ): Promise<EditResult> {
    const [backend, strippedKey] = this.getBackendAndKey(filePath);
    const result = await backend.edit(strippedKey, oldString, newString, replaceAll);
    const matchedPrefix = this.getMountPrefix(filePath);
    const remapped = this.remapFilesUpdateResult(result, matchedPrefix);
    if (!remapped.path || !matchedPrefix || backend === this.defaultBackend) {
      return remapped;
    }
    return {
      ...remapped,
      path: matchedPrefix.slice(0, -1) + remapped.path,
    };
  }

  async delete(filePath: string, options?: DeleteOptions): Promise<DeleteResult> {
    const [backend, strippedKey] = this.getBackendAndKey(filePath);
    if (!backend.delete) {
      return { error: "Delete operation is not supported by this filesystem backend." };
    }
    const result = await backend.delete(strippedKey, options);
    const matchedPrefix = this.getMountPrefix(filePath);
    const remapped = this.remapFilesUpdateResult(result, matchedPrefix);
    if (!remapped.path || !matchedPrefix || backend === this.defaultBackend) {
      return remapped;
    }
    return {
      ...remapped,
      path: matchedPrefix.slice(0, -1) + remapped.path,
    };
  }

  async mkdir(path: string, recursive = true): Promise<MkdirResult> {
    const matchedPrefix = this.getMountPrefix(path);

    const [backend, strippedKey] = this.getBackendAndKey(path);
    if (!backend.mkdir) {
      return { error: "Mkdir operation is not supported by this filesystem backend." };
    }
    const result = await backend.mkdir(strippedKey, recursive);
    if (result.error || !result.path) {
      return result;
    }
    if (!matchedPrefix || backend === this.defaultBackend) {
      return result;
    }

    return {
      ...result,
      path: matchedPrefix.slice(0, -1) + result.path,
    };
  }

  async rmdir(path: string, recursive = false): Promise<RmdirResult> {
    let matchedPrefix: string | undefined;
    for (const [routePrefix] of this.sortedRoutes) {
      if (path.startsWith(routePrefix)) {
        matchedPrefix = routePrefix;
        break;
      }
    }

    const [backend, strippedKey] = this.getBackendAndKey(path);
    if (!backend.rmdir) {
      return { error: "Rmdir operation is not supported by this filesystem backend." };
    }
    const result = await backend.rmdir(strippedKey, recursive);
    if (result.error) {
      return result;
    }
    if (!matchedPrefix || backend === this.defaultBackend) {
      return result;
    }

    const remapped = this.remapFilesUpdateResult(result, matchedPrefix);
    if (!remapped.path) {
      return remapped;
    }

    return {
      ...remapped,
      path: matchedPrefix.slice(0, -1) + remapped.path,
    };
  }
}
