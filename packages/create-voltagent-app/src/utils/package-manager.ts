import { execSync } from "node:child_process";
import type { PackageManager } from "../types";

interface PackageManagerInfo {
  name: PackageManager;
  command: string;
  installCommand: string;
  runCommand: string;
  isInstalled: boolean;
}

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
 * Get information about all package managers
 */
export const getPackageManagers = (): PackageManagerInfo[] => {
  const managers: PackageManagerInfo[] = [
    {
      name: "npm",
      command: "npm",
      installCommand: "npm install",
      runCommand: "npm run",
      isInstalled: false,
    },
    {
      name: "yarn",
      command: "yarn",
      installCommand: "yarn",
      runCommand: "yarn",
      isInstalled: false,
    },
    {
      name: "pnpm",
      command: "pnpm",
      installCommand: "pnpm install",
      runCommand: "pnpm",
      isInstalled: false,
    },
  ];

  // Check which package managers are installed
  for (const manager of managers) {
    manager.isInstalled = commandExists(manager.command);
  }

  return managers;
};

/**
 * Get only the installed package managers
 */
export const getInstalledPackageManagers = (): PackageManagerInfo[] => {
  return getPackageManagers().filter((pm) => pm.isInstalled);
};

/**
 * Get the default package manager (prefer pnpm > yarn > npm)
 */
export const getDefaultPackageManager = (): PackageManager => {
  const installed = getInstalledPackageManagers();

  // Prefer pnpm, then yarn, then npm
  const preferred = ["pnpm", "yarn", "npm"] as const;

  for (const pm of preferred) {
    if (installed.some((i) => i.name === pm)) {
      return pm;
    }
  }

  // Fallback to npm (should always be available with Node.js)
  return "npm";
};
