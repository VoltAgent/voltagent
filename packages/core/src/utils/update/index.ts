import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { devLogger } from "@voltagent/internal/dev";
import {
  readUpdateCache,
  writeUpdateCache,
  isValidCache,
  getPackageJsonHash,
  type UpdateCache,
} from "./cache";

type UpdateOptions = {
  filter?: string;
  useCache?: boolean;
  forceRefresh?: boolean;
};

/**
 * Package update info with semver details
 */
export type PackageUpdateInfo = {
  name: string;
  installed: string;
  latest: string;
  type: "major" | "minor" | "patch" | "latest";
  packageJson: string;
};

/**
 * Supported package managers
 */
type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

/**
 * Detects the package manager being used in the project
 */
const detectPackageManager = (projectPath: string): PackageManager => {
  const lockFiles = {
    "pnpm-lock.yaml": "pnpm",
    "package-lock.json": "npm",
    "yarn.lock": "yarn",
    "bun.lockb": "bun",
  } as const;

  // Check lock files in the project root
  for (const [file, manager] of Object.entries(lockFiles)) {
    if (fs.existsSync(path.join(projectPath, file))) {
      return manager as PackageManager;
    }
  }

  // Default to npm if no lock file found
  return "npm";
};

/**
 * Get the actual installed version of a package (monorepo compatible)
 */
const getInstalledVersion = async (
  packageName: string,
  projectPath: string,
): Promise<string | null> => {
  try {
    // 1. First try direct node_modules access (fastest)
    const directPath = path.join(projectPath, "node_modules", packageName, "package.json");
    if (fs.existsSync(directPath)) {
      const content = fs.readFileSync(directPath, "utf8");
      const pkg = JSON.parse(content);
      return pkg.version;
    }

    // 2. Try require.resolve (works with monorepos and hoisted dependencies)
    try {
      const resolvedPath = require.resolve(`${packageName}/package.json`, {
        paths: [projectPath],
      });
      const content = fs.readFileSync(resolvedPath, "utf8");
      const pkg = JSON.parse(content);
      return pkg.version;
    } catch {
      // Continue to next method
    }

    // 3. Search up the directory tree (for monorepos)
    let currentDir = projectPath;
    while (currentDir !== path.dirname(currentDir)) {
      const modulePath = path.join(currentDir, "node_modules", packageName, "package.json");
      if (fs.existsSync(modulePath)) {
        const content = fs.readFileSync(modulePath, "utf8");
        const pkg = JSON.parse(content);
        return pkg.version;
      }
      currentDir = path.dirname(currentDir);
    }

    return null;
  } catch (error) {
    return null;
  }
};

/**
 * Fetch latest version from npm registry
 */
const fetchLatestVersion = async (packageName: string): Promise<string | null> => {
  try {
    const response = await fetch(`https://registry.npmjs.org/${packageName}/latest`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.version;
  } catch {
    return null;
  }
};

/**
 * Determine the type of update (major, minor, patch) based on semver
 */
const determineUpdateType = (
  currentVersion: string,
  latestVersion: string,
): "major" | "minor" | "patch" | "latest" => {
  if (currentVersion === latestVersion) return "latest";

  const current = currentVersion
    .replace(/[^\d.]/g, "")
    .split(".")
    .map(Number);
  const latest = latestVersion
    .replace(/[^\d.]/g, "")
    .split(".")
    .map(Number);

  if (latest[0] > current[0]) return "major";
  if (latest[1] > current[1]) return "minor";
  return "patch";
};

/**
 * Checks for dependency updates using native package manager commands
 * @returns Object containing update information
 */
export const checkForUpdates = async (
  packagePath?: string,
  options?: UpdateOptions,
): Promise<{
  hasUpdates: boolean;
  updates: PackageUpdateInfo[];
  count: number;
  message: string;
}> => {
  try {
    // Find root package.json
    const rootDir = packagePath ? path.dirname(packagePath) : path.resolve(process.cwd());
    const packageJsonPath = packagePath || path.join(rootDir, "package.json");

    // Check cache if enabled and not forced refresh
    if (options?.useCache && !options?.forceRefresh) {
      const packageJsonHash = getPackageJsonHash(packageJsonPath);
      const cache = await readUpdateCache(rootDir);

      if (cache && isValidCache(cache, packageJsonHash, 60 * 60 * 1000)) {
        // 1 hour cache
        devLogger.debug("Using cached update check results");
        return cache.data;
      }
    }

    // Load package.json to get current versions
    let packageJson: {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    try {
      const packageJsonContent = fs.readFileSync(packageJsonPath, "utf-8");
      packageJson = JSON.parse(packageJsonContent);
    } catch (err) {
      return {
        hasUpdates: false,
        updates: [],
        count: 0,
        message: `Could not read package.json: ${err instanceof Error ? err.message : String(err)}`,
      };
    }

    const filterPattern = options?.filter || "@voltagent";

    // Get all packages matching the filter pattern
    const allPackages: Record<string, { version: string; section: string }> = {};

    // Get packages from dependencies
    if (packageJson.dependencies) {
      for (const [name, version] of Object.entries(packageJson.dependencies)) {
        if (name.includes(filterPattern)) {
          allPackages[name] = { version, section: "dependencies" };
        }
      }
    }

    // Get packages from devDependencies
    if (packageJson.devDependencies) {
      for (const [name, version] of Object.entries(packageJson.devDependencies)) {
        if (name.includes(filterPattern)) {
          allPackages[name] = { version, section: "devDependencies" };
        }
      }
    }

    // For @voltagent packages, use lightweight approach
    const updates: PackageUpdateInfo[] = [];

    // Process all matching packages in parallel
    const updatePromises = Object.entries(allPackages).map(async ([name, packageInfo]) => {
      // Get installed and latest versions in parallel
      const [installedVersion, latestVersion] = await Promise.all([
        getInstalledVersion(name, rootDir),
        fetchLatestVersion(name),
      ]);

      const currentVersion = installedVersion || packageInfo.version.replace(/^[^0-9]*/, "");

      if (latestVersion && latestVersion !== currentVersion) {
        const type = determineUpdateType(currentVersion, latestVersion);
        return {
          name,
          installed: currentVersion,
          latest: latestVersion,
          type,
          packageJson: packageInfo.section,
        };
      } else {
        return {
          name,
          installed: currentVersion,
          latest: currentVersion,
          type: "latest" as const,
          packageJson: packageInfo.section,
        };
      }
    });

    const results = await Promise.all(updatePromises);
    updates.push(...results);

    const updatesCount = updates.filter((pkg) => pkg.type !== "latest").length;

    if (updatesCount > 0) {
      // Generate message for packages with updates
      const updatesList = updates
        .filter((pkg) => pkg.type !== "latest")
        .map((pkg) => `  - ${pkg.name}: ${pkg.installed} → ${pkg.latest} (${pkg.type})`)
        .join("\n");

      const message = `Found ${updatesCount} outdated packages:\n${updatesList}`;

      const result = {
        hasUpdates: true,
        updates,
        count: updatesCount,
        message,
      };

      // Write to cache if cache is enabled
      if (options?.useCache) {
        const packageJsonHash = getPackageJsonHash(packageJsonPath);
        const cacheData: UpdateCache = {
          packageJsonHash,
          timestamp: Date.now(),
          data: result,
        };
        await writeUpdateCache(rootDir, cacheData);
      }

      return result;
    }

    const result = {
      hasUpdates: false,
      updates,
      count: 0,
      message: "All packages are up to date",
    };

    // Write to cache if cache is enabled
    if (options?.useCache) {
      const packageJsonHash = getPackageJsonHash(packageJsonPath);
      const cacheData: UpdateCache = {
        packageJsonHash,
        timestamp: Date.now(),
        data: result,
      };
      await writeUpdateCache(rootDir, cacheData);
    }

    return result;
  } catch (error) {
    devLogger.error("Error checking for updates:", error);
    return {
      hasUpdates: false,
      updates: [],
      count: 0,
      message: `Error checking for updates: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};

/**
 * Update all packages that have available updates using native package manager
 * @param packagePath Optional path to package.json, uses current directory if not provided
 * @returns Result of the update operation
 */
export const updateAllPackages = async (
  packagePath?: string,
): Promise<{
  success: boolean;
  message: string;
  updatedPackages?: string[];
  requiresRestart?: boolean;
}> => {
  try {
    // 1. First check for packages that need updating
    const updateCheckResult = await checkForUpdates(packagePath);

    if (!updateCheckResult.hasUpdates) {
      return {
        success: true,
        message: "No packages need updating",
      };
    }

    // 2. Find the directory of the packages to be updated
    const rootDir = packagePath ? path.dirname(packagePath) : process.cwd();
    const packageManager = detectPackageManager(rootDir);

    // 3. Prepare the package list for updating
    const packagesToUpdate = updateCheckResult.updates
      .filter((pkg) => pkg.type !== "latest")
      .map((pkg) => `${pkg.name}@latest`);

    devLogger.info(`Updating ${packagesToUpdate.length} packages in ${rootDir}`);

    // 4. Run the update command based on package manager
    // Note: We use install/add commands instead of update to handle major version changes
    let command: string;
    switch (packageManager) {
      case "pnpm":
        // pnpm add will update to latest, respecting workspace protocol in monorepos
        command = `pnpm add ${packagesToUpdate.join(" ")}`;
        break;
      case "npm":
        // npm install will update to latest version
        command = `npm install ${packagesToUpdate.join(" ")}`;
        break;
      case "yarn":
        // yarn add will update to latest version
        command = `yarn add ${packagesToUpdate.join(" ")}`;
        break;
      case "bun":
        // bun add will update to latest version
        command = `bun add ${packagesToUpdate.join(" ")}`;
        break;
      default:
        return {
          success: false,
          message: `Unsupported package manager: ${packageManager}`,
        };
    }

    execSync(command, { cwd: rootDir, stdio: "inherit" });

    return {
      success: true,
      message: `Successfully updated ${packagesToUpdate.length} packages`,
      updatedPackages: packagesToUpdate.map((pkg) => pkg.split("@")[0]),
      requiresRestart: true,
    };
  } catch (error) {
    devLogger.error("Error updating packages:", error);
    return {
      success: false,
      message: `Failed to update packages: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};

/**
 * Update a single package to its latest version using native package manager
 * @param packageName Name of the package to update
 * @param packagePath Optional path to package.json, uses current directory if not provided
 * @returns Result of the update operation
 */
export const updateSinglePackage = async (
  packageName: string,
  packagePath?: string,
): Promise<{
  success: boolean;
  message: string;
  packageName: string;
  requiresRestart?: boolean;
}> => {
  try {
    // Check for empty package name
    if (!packageName || packageName.trim() === "") {
      return {
        success: false,
        message: "Package name cannot be empty",
        packageName: "",
      };
    }

    // Command injection protection - only allow valid NPM package names
    const isValidPackageName = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(
      packageName,
    );
    if (!isValidPackageName) {
      return {
        success: false,
        message: `Invalid package name: ${packageName}`,
        packageName,
      };
    }

    // Find the package directory
    const rootDir = packagePath ? path.dirname(packagePath) : process.cwd();
    const packageManager = detectPackageManager(rootDir);

    devLogger.info(`Updating package ${packageName} in ${rootDir} using ${packageManager}`);

    // Run the update command based on package manager
    // Note: We use install/add commands instead of update to handle major version changes
    let command: string;
    switch (packageManager) {
      case "pnpm":
        // pnpm add will update to latest, respecting workspace protocol in monorepos
        command = `pnpm add ${packageName}@latest`;
        break;
      case "npm":
        // npm install will update to latest version
        command = `npm install ${packageName}@latest`;
        break;
      case "yarn":
        // yarn add will update to latest version
        command = `yarn add ${packageName}@latest`;
        break;
      case "bun":
        // bun add will update to latest version
        command = `bun add ${packageName}@latest`;
        break;
      default:
        return {
          success: false,
          message: `Unsupported package manager: ${packageManager}`,
          packageName,
        };
    }

    execSync(command, { cwd: rootDir, stdio: "inherit" });

    return {
      success: true,
      message: `Successfully updated ${packageName} to the latest version`,
      packageName,
      requiresRestart: true,
    };
  } catch (error) {
    devLogger.error(`Error updating package ${packageName}:`, error);
    return {
      success: false,
      message: `Failed to update ${packageName}: ${error instanceof Error ? error.message : String(error)}`,
      packageName,
    };
  }
};
