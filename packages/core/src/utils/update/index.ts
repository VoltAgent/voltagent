import fs from "node:fs";
import path from "node:path";
import { devLogger } from "@voltagent/internal/dev";
import * as ncuPackage from "npm-check-updates";

type UpdateOptions = {
  filter?: string;
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
 * Checks for dependency updates using npm-check-updates
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

    // Run npm-check-updates without upgrading
    const result = (await ncuPackage.run({
      packageFile: packageJsonPath,
      upgrade: false, // Just check, don't update
      filter: `${filterPattern}*`, // Filter by pattern or default to @voltagent packages
      jsonUpgraded: true, // Return upgradable packages in JSON format
      silent: true, // Suppress console output
    })) as Record<string, string>;

    // Convert result to array of package info
    const updates: PackageUpdateInfo[] = [];

    // First, add all matching packages with their installed versions
    for (const [name, packageInfo] of Object.entries(allPackages)) {
      const installed = packageInfo.version.replace(/^[^0-9]*/, "");

      // Check if this package has an update
      const latest = result?.[name];

      if (latest) {
        // Has update - determine type
        const type = determineUpdateType(installed, latest);

        updates.push({
          name,
          installed,
          latest,
          type,
          packageJson: packageInfo.section,
        });
      } else {
        // No update - add with same version and "none" type
        updates.push({
          name,
          installed,
          latest: installed,
          type: "latest",
          packageJson: packageInfo.section,
        });
      }
    }

    const updatesCount = updates.filter((pkg) => pkg.type !== "latest").length;

    if (updatesCount > 0) {
      // Generate message for packages with updates
      const updatesList = updates
        .filter((pkg) => pkg.type !== "latest")
        .map((pkg) => `  - ${pkg.name}: ${pkg.installed} → ${pkg.latest} (${pkg.type})`)
        .join("\n");

      const message = `Found ${updatesCount} outdated packages:\n${updatesList}`;

      return {
        hasUpdates: true,
        updates,
        count: updatesCount,
        message,
      };
    }

    return {
      hasUpdates: false,
      updates,
      count: 0,
      message: "All packages are up to date",
    };
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
 * Update all packages that have available updates using npm-check-updates
 * @param packagePath Optional path to package.json, uses current directory if not provided
 * @returns Result of the update operation
 */
export const updateAllPackages = async (
  packagePath?: string,
): Promise<{
  success: boolean;
  message: string;
  updatedPackages?: string[];
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
    const packageJsonPath = packagePath || path.join(rootDir, "package.json");

    // 3. Prepare the package list for security
    const packagesToUpdate = updateCheckResult.updates.map((pkg) => pkg.name);

    devLogger.info(`Updating ${packagesToUpdate.length} packages in ${rootDir}`);

    // Use npm-check-updates API to perform the update
    // Use the filter parameter to only update our packages
    const filterString = packagesToUpdate.join(" ");

    const ncuResult = await ncuPackage.run({
      packageFile: packageJsonPath,
      upgrade: true, // Actually upgrade the packages
      filter: filterString, // Only update packages matching the filter
      silent: false, // Show output
      jsonUpgraded: true, // Return upgraded packages in JSON format
    });

    // ncuResult contains an object of the updated packages
    const updatedPackages = Object.keys(ncuResult || {});

    if (updatedPackages.length === 0) {
      return {
        success: true,
        message: "No packages were updated",
        updatedPackages: [],
      };
    }

    return {
      success: true,
      message: `Successfully updated ${updatedPackages.length} packages`,
      updatedPackages,
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
 * Update a single package to its latest version using npm-check-updates
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
    // Check valid characters for NPM package names
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
    const packageJsonPath = packagePath || path.join(rootDir, "package.json");

    devLogger.info(`Updating package ${packageName} in ${rootDir}`);

    // Use npm-check-updates API to update only the specified package
    const ncuResult = await ncuPackage.run({
      packageFile: packageJsonPath,
      upgrade: true, // Actually upgrade the packages
      filter: packageName, // Only update the specified package
      silent: false, // Show output
      jsonUpgraded: true, // Return upgraded packages in JSON format
    });

    // ncuResult contains an object of the updated packages
    const updatedPackages = Object.keys(ncuResult || {});

    if (updatedPackages.length === 0) {
      return {
        success: true,
        message: `Package ${packageName} is already at the latest version`,
        packageName,
      };
    }

    return {
      success: true,
      message: `Successfully updated ${packageName} to the latest version`,
      packageName,
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
