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
    console.log(chalk.green("Run 'npm install' to install updated packages"));
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
            // Use ncu API to apply updates
            await ncuPackage.default({
              packageFile: path.join(process.cwd(), "package.json"),
              upgrade: true,
              filter: filter,
            });

            console.log(chalk.green("✓ Updates applied to package.json"));
            console.log(chalk.green("Run 'npm install' to install updated packages"));
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

        await interactiveUpdate(updates.updates);
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
