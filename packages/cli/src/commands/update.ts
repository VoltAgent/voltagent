import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import type { Command } from "commander";
import inquirer from "inquirer";
import * as ncuPackage from "npm-check-updates";
import ora from "ora";
import { captureError, captureUpdateEvent } from "../utils/analytics";

// Not directly importing from @voltagent/core due to potential circular dependencies
// instead, we'll implement a simpler version here
type UpdateResult = {
  hasUpdates: boolean;
  updates: Record<string, string>;
  count: number;
  message: string;
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
 * Simple version of checkForUpdates that uses npm-check-updates API
 */
const checkForUpdates = async (
  packagePath?: string,
  options?: { filter?: string },
): Promise<UpdateResult> => {
  try {
    // Find package.json path
    const rootDir = packagePath ? path.dirname(packagePath) : process.cwd();
    const packageJsonPath = packagePath || path.join(rootDir, "package.json");

    // Check if package.json exists
    if (!fs.existsSync(packageJsonPath)) {
      return {
        hasUpdates: false,
        updates: {},
        count: 0,
        message: "Could not find package.json",
      };
    }

    // Use ncu API instead of CLI
    const result = await ncuPackage.default({
      packageFile: packageJsonPath,
      silent: true,
      jsonUpgraded: true,
      filter: options?.filter,
    });

    // Process results
    const updates = result as Record<string, string>;
    const count = Object.keys(updates).length;

    if (count > 0) {
      const updatesList = Object.entries(updates)
        .map(([name, version]) => `  - ${name} → ${version}`)
        .join("\n");

      return {
        hasUpdates: true,
        updates,
        count,
        message: `Found ${count} outdated packages:\n${updatesList}`,
      };
    }
    return {
      hasUpdates: false,
      updates: {},
      count: 0,
      message: "All packages are up to date",
    };
  } catch (error) {
    console.error("Error checking for updates:", error);
    return {
      hasUpdates: false,
      updates: {},
      count: 0,
      message: `Error checking for updates: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};

/**
 * Custom interactive updater using inquirer
 */
const interactiveUpdate = async (
  updates: Record<string, string>,
  packagePath?: string,
  skipInstall = false,
): Promise<void> => {
  // Get package.json
  const rootDir = packagePath ? path.dirname(packagePath) : process.cwd();
  const packageJsonPath = packagePath || path.join(rootDir, "package.json");

  // Prepare choices for inquirer
  const choices = Object.entries(updates).map(([name, version]) => {
    return {
      name: `${chalk.cyan(name)}: ${chalk.gray(getCurrentVersion(name, packageJsonPath))} → ${chalk.green(version)}`,
      value: name,
      short: name,
    };
  });

  // Ask user which packages to update
  const { selectedPackages } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "selectedPackages",
      message: "Select packages to update:",
      choices: choices,
      pageSize: 15,
      default: choices.map((c) => c.value), // Default select all
    },
  ]);

  if (selectedPackages.length === 0) {
    console.log(chalk.yellow("No packages selected for update."));
    return;
  }

  // Create filter for selected packages only
  const selectedFilter = selectedPackages.join(" ");

  console.log(chalk.cyan("\nApplying updates for selected packages..."));

  try {
    // Use ncu API to apply updates for selected packages
    await ncuPackage.default({
      packageFile: packageJsonPath,
      upgrade: true,
      filter: selectedFilter,
    });

    console.log(chalk.green(`✓ Updated ${selectedPackages.length} packages in package.json`));

    // Skip install if requested
    if (skipInstall) {
      const packageManager = detectPackageManager(rootDir);
      const installCommand =
        packageManager === "yarn" ? `${packageManager} install` : `${packageManager} install`;
      console.log(chalk.yellow("\n⚠ Automatic installation skipped"));
      console.log(chalk.cyan(`Run '${installCommand}' to install updated packages`));
      return;
    }

    // Detect package manager and run install
    const packageManager = detectPackageManager(rootDir);
    const installCommand =
      packageManager === "yarn" ? `${packageManager} install` : `${packageManager} install`;

    console.log(chalk.cyan(`\nDetected package manager: ${packageManager}`));
    console.log(chalk.cyan(`Running ${installCommand}...`));

    const spinner = ora("Installing packages...").start();

    try {
      execSync(installCommand, { cwd: rootDir, stdio: "pipe" });
      spinner.succeed(chalk.green("✓ Packages installed successfully"));
    } catch (installError) {
      spinner.fail(chalk.red("Failed to install packages"));
      console.error(chalk.red(`\nPlease run '${installCommand}' manually`));
      throw installError;
    }
  } catch (error) {
    console.error(chalk.red("Error applying updates:"));
    console.error(error instanceof Error ? error.message : String(error));
  }
};

/**
 * Get current version of a package from package.json
 */
const getCurrentVersion = (packageName: string, packageJsonPath: string): string => {
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

    // Check in different dependency sections
    for (const section of [
      "dependencies",
      "devDependencies",
      "peerDependencies",
      "optionalDependencies",
    ]) {
      if (packageJson[section]?.[packageName]) {
        return packageJson[section][packageName];
      }
    }

    return "unknown";
  } catch {
    return "unknown";
  }
};

/**
 * Register the update command to the CLI program
 */
export const registerUpdateCommand = (program: Command): void => {
  program
    .command("update")
    .description("Interactive update for VoltAgent packages")
    .option("--apply", "Apply updates without interactive mode")
    .option("--no-install", "Skip automatic package installation after updating package.json")
    .action(async (options) => {
      try {
        // Initialize spinner
        const spinner = ora("Checking for updates...").start();

        // Check for updates using our utility
        const filter = "@voltagent*";
        const updates = await checkForUpdates(undefined, { filter });

        spinner.stop();

        // Track update check event
        captureUpdateEvent({
          hadUpdates: updates.hasUpdates,
        });

        if (!updates.hasUpdates) {
          console.log(chalk.green("✓ All VoltAgent packages are up to date"));
          return;
        }

        // Show found updates
        console.log(chalk.yellow(`Found ${updates.count} outdated VoltAgent packages:`));
        Object.entries(updates.updates).forEach(([name, version]) => {
          console.log(`  ${chalk.cyan(name)}: ${chalk.gray("→")} ${chalk.green(version)}`);
        });

        // Apply updates directly if --apply flag is used
        if (options.apply) {
          console.log(chalk.cyan("\nApplying updates..."));

          try {
            const rootDir = process.cwd();
            const packageJsonPath = path.join(rootDir, "package.json");

            // Use ncu API to apply updates
            await ncuPackage.default({
              packageFile: packageJsonPath,
              upgrade: true,
              filter: filter,
            });

            console.log(chalk.green("✓ Updates applied to package.json"));

            // Skip install if --no-install flag is used
            if (options.install === false) {
              const packageManager = detectPackageManager(rootDir);
              const installCommand =
                packageManager === "yarn"
                  ? `${packageManager} install`
                  : `${packageManager} install`;
              console.log(chalk.yellow("\n⚠ Automatic installation skipped"));
              console.log(chalk.cyan(`Run '${installCommand}' to install updated packages`));
              return;
            }

            // Detect package manager and run install
            const packageManager = detectPackageManager(rootDir);
            const installCommand =
              packageManager === "yarn" ? `${packageManager} install` : `${packageManager} install`;

            console.log(chalk.cyan(`\nDetected package manager: ${packageManager}`));
            console.log(chalk.cyan(`Running ${installCommand}...`));

            const installSpinner = ora("Installing packages...").start();

            try {
              execSync(installCommand, { cwd: rootDir, stdio: "pipe" });
              installSpinner.succeed(chalk.green("✓ Packages installed successfully"));
            } catch (installError) {
              installSpinner.fail(chalk.red("Failed to install packages"));
              console.error(chalk.red(`\nPlease run '${installCommand}' manually`));
              throw installError;
            }

            return;
          } catch (error) {
            console.error(chalk.red("Error applying updates:"));
            console.error(error instanceof Error ? error.message : String(error));
            return;
          }
        }

        // Use our custom interactive update
        console.log(); // Empty line
        console.log(chalk.cyan("Starting interactive update..."));

        await interactiveUpdate(updates.updates, undefined, options.install === false);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(chalk.red("Error checking for updates:"));
        console.error(errorMessage);

        // Track error event
        captureError({
          command: "update",
          errorMessage,
        });
      }
    });
};
