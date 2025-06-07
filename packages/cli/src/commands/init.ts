import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import type { Command } from "commander";
import { captureError, captureInitEvent } from "../utils/analytics";

export const registerInitCommand = (program: Command): void => {
  program
    .command("init")
    .description("Integrate VoltAgent CLI into a project")
    .action(async () => {
      try {
        console.log(chalk.cyan("Integrating VoltAgent CLI into your project..."));

        // Check for package.json file
        const packageJsonPath = path.join(process.cwd(), "package.json");
        if (!fs.existsSync(packageJsonPath)) {
          console.error(
            chalk.red(
              "Error: package.json file not found. This command must be run inside a Node.js project.",
            ),
          );
          process.exit(1);
        }

        // Read package.json file
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

        // Get existing scripts
        const scripts = packageJson.scripts || {};

        // Detect package manager
        let packageManager = "npm";
        try {
          // Check if pnpm is being used
          if (fs.existsSync(path.join(process.cwd(), "pnpm-lock.yaml"))) {
            packageManager = "pnpm";
          } else if (fs.existsSync(path.join(process.cwd(), "yarn.lock"))) {
            packageManager = "yarn";
          }
        } catch {
          // Default to npm if detection fails
          packageManager = "npm";
        }

        console.log(chalk.blue(`Detected package manager: ${packageManager}`));

        // Add "volt" script to package.json
        let modified = false;
        if (!scripts.volt || scripts.volt !== "volt") {
          scripts.volt = "volt";
          modified = true;
        }

        if (!modified) {
          console.log(chalk.yellow("No changes made. The 'volt' script is already configured."));
        } else {
          // Update package.json file
          packageJson.scripts = scripts;
          fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
          console.log(chalk.green("✓ Added 'volt' script to package.json"));
        }

        // Check if @voltagent/cli is installed locally and install if needed
        let isPackageInstalled = false;
        try {
          // Check if the package exists in node_modules
          fs.accessSync(
            path.join(process.cwd(), "node_modules", "@voltagent", "cli"),
            fs.constants.F_OK,
          );
          isPackageInstalled = true;
        } catch {
          // Package is not installed
          isPackageInstalled = false;
        }

        if (!isPackageInstalled) {
          console.log(chalk.cyan("Installing @voltagent/cli locally..."));
          try {
            const installCommand =
              packageManager === "yarn"
                ? "yarn add @voltagent/cli --dev"
                : packageManager === "pnpm"
                  ? "pnpm add @voltagent/cli --save-dev"
                  : "npm install @voltagent/cli --save-dev";

            execSync(installCommand, { stdio: "inherit" });
            console.log(chalk.green("✓ @voltagent/cli successfully installed!"));
          } catch (error) {
            console.error(
              chalk.red("Failed to install @voltagent/cli:"),
              error instanceof Error ? error.message : String(error),
            );
          }
        }

        // Create .voltagent directory
        const voltagentDir = path.join(process.cwd(), ".voltagent");
        if (!fs.existsSync(voltagentDir)) {
          fs.mkdirSync(voltagentDir);
        }

        console.log(chalk.green("✓ VoltAgent CLI successfully integrated!"));

        console.log("\n", chalk.cyan("To run VoltAgent:"), chalk.green("npm run volt"));

        // Track init event
        captureInitEvent({
          packageManager,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(chalk.red("Error:"), errorMessage);

        // Track error event
        captureError({
          command: "init",
          errorMessage,
        });

        process.exit(1);
      }
    });
};
