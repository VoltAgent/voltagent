import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import chalk from "chalk";
import type { Command } from "commander";
import { captureError, captureWhoamiEvent } from "../utils/analytics";

export const registerWhoamiCommand = (program: Command): void => {
  program
    .command("whoami")
    .description("Display system and user information")
    .action(async () => {
      try {
        console.log(chalk.cyan("System and User Information:"));
        console.log(chalk.blue(`Username: ${os.userInfo().username}`));
        console.log(chalk.blue(`Hostname: ${os.hostname()}`));
        console.log(chalk.blue(`Platform: ${os.platform()}`));
        console.log(chalk.blue(`OS: ${os.type()} ${os.release()}`));
        console.log(chalk.blue(`Architecture: ${os.arch()}`));
        console.log(chalk.blue(`Home Directory: ${os.homedir()}`));

        // List installed voltagent packages
        console.log(chalk.cyan("\nInstalled VoltAgent Packages:"));

        let numVoltPackages = 0;
        const packageJsonPath = path.join(process.cwd(), "package.json");
        if (fs.existsSync(packageJsonPath)) {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
          const dependencies = {
            ...packageJson.dependencies,
            ...packageJson.devDependencies,
          };

          const voltagentPackages = Object.entries(dependencies || {})
            .filter(([name]) => name.includes("voltagent"))
            .map(([name, version]) => ({ name, version }));

          numVoltPackages = voltagentPackages.length;

          if (voltagentPackages.length > 0) {
            voltagentPackages.forEach((pkg) => {
              console.log(chalk.blue(`${pkg.name}: ${pkg.version}`));
            });
          } else {
            console.log(chalk.yellow("No VoltAgent packages found in package.json"));
          }
        } else {
          console.log(chalk.yellow("No package.json found in current directory"));
        }

        // Track whoami event
        captureWhoamiEvent({
          numVoltPackages,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(chalk.red("Error:"), errorMessage);

        // Track error event
        captureError({
          command: "whoami",
          errorMessage,
        });

        process.exit(1);
      }
    });
};
