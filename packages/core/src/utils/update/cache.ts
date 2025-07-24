import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { getGlobalLogger } from "../../logger";
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
 * Get the cache file path for the project
 */
export const getCacheFilePath = (projectPath: string): string => {
  return path.join(projectPath, ".voltagent", "cache", "update-check.json");
};

/**
 * Ensure the cache directory exists
 */
export const ensureCacheDir = (projectPath: string): void => {
  const cacheDir = path.join(projectPath, ".voltagent", "cache");
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
    const logger = getGlobalLogger().child({ component: "update-cache" });
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
    const logger = getGlobalLogger().child({ component: "update-cache" });
    logger.error("Error reading update cache", { error });
    return null;
  }
};

/**
 * Write the update cache
 */
export const writeUpdateCache = async (projectPath: string, cache: UpdateCache): Promise<void> => {
  try {
    ensureCacheDir(projectPath);
    const cacheFilePath = getCacheFilePath(projectPath);

    fs.writeFileSync(cacheFilePath, JSON.stringify(cache, null, 2), "utf8");
    const logger = getGlobalLogger().child({ component: "update-cache" });
    logger.debug("Update cache written successfully");
  } catch (error) {
    const logger = getGlobalLogger().child({ component: "update-cache" });
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
    const logger = getGlobalLogger().child({ component: "update-cache" });
    logger.debug("Cache invalidated: package.json has changed");
    return false;
  }

  // Check if cache is too old
  const age = Date.now() - cache.timestamp;
  if (age > maxAge) {
    const logger = getGlobalLogger().child({ component: "update-cache" });
    logger.debug(`Cache invalidated: too old (${Math.round(age / 1000 / 60)} minutes)`);
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
      const logger = getGlobalLogger().child({ component: "update-cache" });
      logger.debug("Update cache cleared");
    }
  } catch (error) {
    const logger = getGlobalLogger().child({ component: "update-cache" });
    logger.error("Error clearing update cache", { error });
  }
};
