import type {
  EditResult,
  FileData,
  FileInfo,
  FilesystemBackend,
  GrepMatch,
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

  async lsInfo(path: string): Promise<FileInfo[]> {
    for (const [routePrefix, backend] of this.sortedRoutes) {
      if (path.startsWith(routePrefix.replace(/\/$/, ""))) {
        const suffix = path.substring(routePrefix.length);
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

  async grepRaw(
    pattern: string,
    path = "/",
    glob: string | null = null,
  ): Promise<GrepMatch[] | string> {
    for (const [routePrefix, backend] of this.sortedRoutes) {
      if (path.startsWith(routePrefix.replace(/\/$/, ""))) {
        const searchPath = path.substring(routePrefix.length - 1);
        const raw = await backend.grepRaw(pattern, searchPath || "/", glob);

        if (typeof raw === "string") {
          return raw;
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
      return rawDefault;
    }

    allMatches.push(...rawDefault);

    for (const [routePrefix, backend] of Object.entries(this.routes)) {
      const raw = await backend.grepRaw(pattern, "/", glob);

      if (typeof raw === "string") {
        return raw;
      }

      allMatches.push(
        ...raw.map((match) => ({
          ...match,
          path: routePrefix.slice(0, -1) + match.path,
        })),
      );
    }

    return allMatches;
  }

  async globInfo(pattern: string, path = "/"): Promise<FileInfo[]> {
    const results: FileInfo[] = [];

    for (const [routePrefix, backend] of this.sortedRoutes) {
      if (path.startsWith(routePrefix.replace(/\/$/, ""))) {
        const searchPath = path.substring(routePrefix.length - 1);
        const infos = await backend.globInfo(pattern, searchPath || "/");

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

  async write(filePath: string, content: string): Promise<WriteResult> {
    const [backend, strippedKey] = this.getBackendAndKey(filePath);
    return await backend.write(strippedKey, content);
  }

  async edit(
    filePath: string,
    oldString: string,
    newString: string,
    replaceAll = false,
  ): Promise<EditResult> {
    const [backend, strippedKey] = this.getBackendAndKey(filePath);
    return await backend.edit(strippedKey, oldString, newString, replaceAll);
  }
}
