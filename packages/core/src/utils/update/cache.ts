import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { safeStringify } from "@voltagent/internal/utils";
import { LoggerProxy } from "../../logger";
import type { PackageUpdateInfo } from "./index";

/**
 * Cache structure for update checks
 */
export interface UpdateCache {
  packageJsonHash: string;
  timestamp: number;
  data: {
    hasUpdates: boolean;
    updates: PackageUpdateInfo[];
    count: number;
    message: string;
  };
}

/**
 * Get environment paths for VoltAgent (based on env-paths pattern)
 * Following platform conventions for cache directories
 */
const getEnvPaths = (name: string) => {
  const homedir = os.homedir();
  const tmpdir = os.tmpdir();
  const { env } = process;

  if (process.platform === "darwin") {
    // macOS
    const library = path.join(homedir, "Library");
    return {
      cache: path.join(library, "Caches", name),
      temp: path.join(tmpdir, name),
    };
  }

  if (process.platform === "win32") {
    // Windows
    const localAppData = env.LOCALAPPDATA || path.join(homedir, "AppData", "Local");
    return {
      cache: path.join(localAppData, name, "Cache"),
      temp: path.join(tmpdir, name),
    };
  }

  // Linux and others (following XDG Base Directory spec)
  const username = path.basename(homedir);
  return {
    cache: path.join(env.XDG_CACHE_HOME || path.join(homedir, ".cache"), name),
    temp: path.join(tmpdir, username, name),
  };
};

/**
 * Get the system cache directory for VoltAgent
 */
const getSystemCacheDir = (): string => {
  const paths = getEnvPaths("voltagent");
  return paths.cache;
};

/**
 * Get the cache file path for the project
 */
export const getCacheFilePath = (projectPath: string): string => {
  // Normalize the path to handle different representations
  const normalizedPath = path.resolve(projectPath);

  // Use SHA-256 for better future-proofing
  const projectHash = crypto
    .createHash("sha256")
    .update(normalizedPath)
    .digest("hex")
    .substring(0, 12); // 12 chars is enough for uniqueness

  const cacheDir = getSystemCacheDir();
  return path.join(cacheDir, `update-check-${projectHash}.json`);
};

/**
 * Ensure the cache directory exists
 */
export const ensureCacheDir = (): void => {
  const cacheDir = getSystemCacheDir();
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
};

/**
 * Calculate MD5 hash of package.json content
 */
export const getPackageJsonHash = (packageJsonPath: string): string => {
  try {
    const content = fs.readFileSync(packageJsonPath, "utf8");
    return crypto.createHash("md5").update(content).digest("hex");
  } catch (error) {
    const logger = new LoggerProxy({ component: "update-cache" });
    logger.error("Error reading package.json for hash", { error });
    return "";
  }
};

/**
 * Read the update cache
 */
export const readUpdateCache = async (projectPath: string): Promise<UpdateCache | null> => {
  try {
    const cacheFilePath = getCacheFilePath(projectPath);

    if (!fs.existsSync(cacheFilePath)) {
      return null;
    }

    const cacheContent = fs.readFileSync(cacheFilePath, "utf8");
    const cache = JSON.parse(cacheContent) as UpdateCache;

    return cache;
  } catch (error) {
    const logger = new LoggerProxy({ component: "update-cache" });
    logger.error("Error reading update cache", { error });
    return null;
  }
};

/**
 * Write the update cache
 */
export const writeUpdateCache = async (projectPath: string, cache: UpdateCache): Promise<void> => {
  try {
    ensureCacheDir();
    const cacheFilePath = getCacheFilePath(projectPath);

    fs.writeFileSync(cacheFilePath, safeStringify(cache, { indentation: 2 }), "utf8");
  } catch (error) {
    const logger = new LoggerProxy({ component: "update-cache" });
    logger.error("Error writing update cache", { error });
  }
};

/**
 * Check if the cache is valid
 */
export const isValidCache = (
  cache: UpdateCache | null,
  packageJsonHash: string,
  maxAge: number = 24 * 60 * 60 * 1000, // 24 hours default
): boolean => {
  if (!cache) {
    return false;
  }

  // Check if package.json has changed
  if (cache.packageJsonHash !== packageJsonHash) {
    return false;
  }

  // Check if cache is too old
  const age = Date.now() - cache.timestamp;
  if (age > maxAge) {
    return false;
  }

  return true;
};

/**
 * Clear the update cache
 */
export const clearUpdateCache = async (projectPath: string): Promise<void> => {
  try {
    const cacheFilePath = getCacheFilePath(projectPath);

    if (fs.existsSync(cacheFilePath)) {
      fs.unlinkSync(cacheFilePath);
    }
  } catch (error) {
    const logger = new LoggerProxy({ component: "update-cache" });
    logger.error("Error clearing update cache", { error });
  }
};
