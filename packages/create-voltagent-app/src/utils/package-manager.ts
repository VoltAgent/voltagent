import { execSync } from "node:child_process";
import { PACKAGE_MANAGER_CONFIG, type PackageManager } from "../types";

/**
 * Check if a command exists on the system
 * Works cross-platform (Windows and Unix)
 */
const commandExists = (command: string): boolean => {
  try {
    // Use 'where' on Windows, 'which' on Unix-like systems
    const checkCommand = process.platform === "win32" ? "where" : "which";
    execSync(`${checkCommand} ${command}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};

/**
 * Get only the installed package managers
 */
export const getInstalledPackageManagers = (): PackageManager[] => {
  const packageManagers = Object.keys(PACKAGE_MANAGER_CONFIG) as PackageManager[];
  const installedPackageManagers: PackageManager[] = [];

  for (const pm of packageManagers) {
    if (commandExists(PACKAGE_MANAGER_CONFIG[pm].command)) {
      installedPackageManagers.push(pm);
    }
  }

  return installedPackageManagers;
};

/**
 * Get the default package manager (prefer pnpm > bun > yarn > npm)
 */
export const getDefaultPackageManager = (): PackageManager => {
  const installed = getInstalledPackageManagers();
  const packageManagers = Object.keys(PACKAGE_MANAGER_CONFIG) as PackageManager[];

  for (const pm of packageManagers) {
    if (installed.some((name) => name === pm)) {
      return pm;
    }
  }

  // Fallback to npm (should always be available with Node.js)
  return "npm";
};
