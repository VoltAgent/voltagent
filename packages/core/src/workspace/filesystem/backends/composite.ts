import { posix as posixPath } from "node:path";
import micromatch from "micromatch";
import { validatePath } from "../utils";
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

  private getMountedGlob(
    glob: string,
    searchPrefix: string,
    mountPrefix: string,
  ): string | null | undefined {
    const relativePrefix = mountPrefix.substring(searchPrefix.length);
    if (!/[\\*?\[\]{}()!+@|]/.test(relativePrefix) && glob.startsWith(relativePrefix)) {
      const relativeGlob = glob.substring(relativePrefix.length);
      if (relativeGlob) return relativeGlob;
    }
    if (glob === "**" || (glob.startsWith("**/") && !glob.substring(3).includes("/"))) {
      return glob;
    }
    if (!glob.includes("**") && /^[\w.*?-]+$/.test(glob)) {
      return null;
    }
    return undefined;
  }

  private async grepBackend(
    backend: FilesystemBackend,
    pattern: string,
    searchPath: string,
    options: {
      mountPrefix: string | null;
      searchPrefix: string;
      glob: string | null;
      backendGlob: string | null | undefined;
    },
  ): Promise<GrepMatch[] | string> {
    const { mountPrefix, searchPrefix, glob, backendGlob } = options;
    const prefix = mountPrefix?.slice(0, -1) ?? "";
    const backendScope = prefix + searchPath;
    const hasChildMount = Object.keys(this.routes).some(
      (route) => route !== mountPrefix && route.startsWith(backendScope),
    );
    if (backendGlob !== undefined && !hasChildMount) {
      return backend.grepRaw(pattern, searchPath, backendGlob);
    }

    // Resolve visible files before a backend's grep match limit is applied.
    const infos = await backend.globInfo(backendGlob ?? "**/*", searchPath);
    const files = new Set<string>();
    for (const info of infos) {
      const mappedPath = prefix + info.path;
      if (
        !info.is_dir &&
        mappedPath.startsWith(searchPrefix) &&
        this.getMountPrefix(mappedPath) === mountPrefix &&
        (!glob ||
          micromatch.isMatch(mappedPath.substring(searchPrefix.length), glob, {
            dot: true,
            nobrace: false,
          }))
      ) {
        const relative = info.path.substring(searchPath.length);
        files.add(relative.replace(/([\\*?\[\]{}()!+@|,])/g, "\\$1"));
      }
    }
    if (files.size === 0) {
      const raw = await backend.grepRaw(pattern, searchPath, backendGlob ?? glob);
      return typeof raw === "string" ? raw : [];
    }

    const matches: GrepMatch[] = [];
    const errors: string[] = [];
    let batch: string[] = [];
    let length = 0;
    const flush = async () => {
      const queryGlob = batch.length === 1 ? batch[0] : `{${batch.join(",")}}`;
      const raw = await backend.grepRaw(pattern, searchPath, queryGlob);
      if (typeof raw === "string") errors.push(raw);
      else matches.push(...raw);
      batch = [];
      length = 0;
    };
    for (const file of files) {
      if (batch.length > 0 && (batch.length >= 64 || length + file.length > 8192)) {
        await flush();
      }
      batch.push(file);
      length += file.length + 1;
    }
    if (batch.length > 0) await flush();
    return matches.length > 0 ? matches : (errors[0] ?? []);
  }

  /**
   * Search visible virtual files before applying backend grep limits.
   * Composite glob matching includes dotfiles; direct backend fast paths
   * retain the backend's own dotfile policy.
   */
  async grepRaw(
    pattern: string,
    path = "/",
    glob: string | null = null,
  ): Promise<GrepMatch[] | string> {
    let searchPrefix: string;
    try {
      searchPrefix = validatePath(posixPath.normalize(validatePath(path).replace(/\\/g, "/")));
    } catch {
      return [];
    }
    const errors: string[] = [];
    const allMatches: GrepMatch[] = [];
    let matchedPrefix: string | null = null;
    for (const [routePrefix, backend] of this.sortedRoutes) {
      const prefix = routePrefix.replace(/\/$/, "");
      if (searchPrefix.startsWith(`${prefix}/`)) {
        const searchPath = searchPrefix.substring(prefix.length) || "/";
        const raw = await this.grepBackend(backend, pattern, searchPath, {
          mountPrefix: routePrefix,
          searchPrefix,
          glob,
          backendGlob: glob,
        });

        matchedPrefix = routePrefix;
        if (typeof raw === "string") {
          errors.push(raw);
        } else {
          allMatches.push(
            ...raw
              .map((match) => ({
                ...match,
                path: routePrefix.slice(0, -1) + match.path,
              }))
              .filter((match) => this.getMountPrefix(match.path) === routePrefix),
          );
        }
        break;
      }
    }

    if (matchedPrefix === null) {
      const rawDefault = await this.grepBackend(this.defaultBackend, pattern, searchPrefix, {
        mountPrefix: null,
        searchPrefix,
        glob,
        backendGlob: glob,
      });
      if (typeof rawDefault === "string") {
        errors.push(rawDefault);
      } else {
        allMatches.push(...rawDefault.filter((match) => this.getMountPrefix(match.path) === null));
      }
    }

    for (const [routePrefix, backend] of Object.entries(this.routes)) {
      if (routePrefix === matchedPrefix || !routePrefix.startsWith(searchPrefix)) {
        continue;
      }
      const backendGlob = glob ? this.getMountedGlob(glob, searchPrefix, routePrefix) : null;
      if (glob && backendGlob === null) continue;
      const raw = await this.grepBackend(backend, pattern, "/", {
        mountPrefix: routePrefix,
        searchPrefix,
        glob,
        backendGlob,
      });

      if (typeof raw === "string") {
        errors.push(raw);
        continue;
      }

      allMatches.push(
        ...raw
          .map((match) => ({
            ...match,
            path: routePrefix.slice(0, -1) + match.path,
          }))
          .filter(
            (match) =>
              this.getMountPrefix(match.path) === routePrefix &&
              (!glob ||
                micromatch.isMatch(match.path.substring(searchPrefix.length), glob, {
                  dot: true,
                  nobrace: false,
                })),
          ),
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
    let searchPrefix: string;
    try {
      searchPrefix = validatePath(posixPath.normalize(validatePath(path).replace(/\\/g, "/")));
    } catch {
      return [];
    }
    const results: FileInfo[] = [];
    let matchedPrefix: string | null = null;

    for (const [routePrefix, backend] of this.sortedRoutes) {
      const normalizedPrefix = routePrefix.endsWith("/") ? routePrefix : `${routePrefix}/`;
      if (searchPrefix.startsWith(normalizedPrefix)) {
        const suffix = searchPrefix.substring(normalizedPrefix.length);
        const searchPath = suffix ? `/${suffix}` : "/";
        const infos = await backend.globInfo(pattern, searchPath);

        matchedPrefix = routePrefix;
        results.push(
          ...infos
            .map((info) => ({
              ...info,
              path: routePrefix.slice(0, -1) + info.path,
            }))
            .filter((info) => this.getMountPrefix(info.path) === routePrefix),
        );
        break;
      }
    }

    if (matchedPrefix === null) {
      const defaultInfos = await this.defaultBackend.globInfo(pattern, searchPrefix);
      results.push(...defaultInfos.filter((info) => this.getMountPrefix(info.path) === null));
    }

    for (const [routePrefix, backend] of Object.entries(this.routes)) {
      if (routePrefix === matchedPrefix || !routePrefix.startsWith(searchPrefix)) {
        continue;
      }
      const backendGlob = this.getMountedGlob(pattern, searchPrefix, routePrefix);
      if (backendGlob === null) continue;
      const infos = await backend.globInfo(backendGlob ?? "**/*", "/");
      results.push(
        ...infos
          .map((info) => ({
            ...info,
            path: routePrefix.slice(0, -1) + info.path,
          }))
          .filter(
            (info) =>
              this.getMountPrefix(info.path) === routePrefix &&
              micromatch.isMatch(info.path.substring(searchPrefix.length), pattern, {
                dot: true,
                nobrace: false,
              }),
          ),
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
