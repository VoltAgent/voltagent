import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import { Command } from "commander";
import inquirer from "inquirer";
import ora from "ora";
import { createProject } from "./project-creator";
import type { ProjectOptions } from "./types";
import { captureError, captureProjectCreation } from "./utils/analytics";
import {
  colorTypewriter,
  showLogo,
  showSuccessMessage,
  showWelcomeMessage,
  sleep,
} from "./utils/animation";
import { downloadExample, existsInRepo } from "./utils/github";
import logger from "./utils/logger";

export const runCLI = async (): Promise<void> => {
  const program = new Command();

  // Animate the start
  await showLogo(); // Voltagent logo
  showWelcomeMessage(); // Welcome box
  await colorTypewriter("Let's create your next AI application...");
  await sleep(500); // Short wait

  program
    .name("create-voltagent-app")
    .description("Create a new VoltagentJS application")
    .version("0.1.0")
    .argument("[project-directory]", "Directory to create the project")
    .option("--example <name>", "Example to use from voltagent/voltagent repository")
    .action(async (projectDirectory: string | undefined, cmdOptions: { example?: string }) => {
      logger.blank();

      // If example flag is provided, handle it differently
      if (cmdOptions.example) {
        await handleExampleDownload(cmdOptions.example, projectDirectory);
        return;
      }

      // If project directory not specified, ask for it
      const { projectName } = projectDirectory
        ? { projectName: projectDirectory }
        : await inquirer.prompt<{ projectName: string }>([
            {
              type: "input",
              name: "projectName",
              message: "What is your project named?",
              default: "my-voltagent-app",
            },
          ]);

      // Select package manager
      const { packageManager } = await inquirer.prompt<{
        packageManager: ProjectOptions["packageManager"];
      }>([
        {
          type: "list",
          name: "packageManager",
          message: "Which package manager do you want to use?",
          choices: [
            { name: "npm", value: "npm" },
            { name: "yarn", value: "yarn" },
            { name: "pnpm", value: "pnpm" },
          ],
          default: "npm",
        },
      ]);

      // Select IDE for MCP configuration
      const { ide } = await inquirer.prompt<{
        ide: ProjectOptions["ide"];
      }>([
        {
          type: "list",
          name: "ide",
          message: "Which IDE are you using? (For MCP Docs Server configuration)",
          choices: [
            { name: "Cursor", value: "cursor" },
            { name: "Windsurf", value: "windsurf" },
            { name: "VS Code", value: "vscode" },
            { name: "None / I'll configure later", value: "none" },
          ],
          default: "cursor",
        },
      ]);

      const projectOptions: ProjectOptions = {
        projectName,
        typescript: true, // VoltAgent uses TypeScript by default
        packageManager,
        features: [], // Features aren't used anymore
        ide,
      };

      const targetDir = path.resolve(process.cwd(), projectName);

      // Create the project
      try {
        // Capture project creation event
        captureProjectCreation({
          projectName,
          packageManager,
          typescript: projectOptions.typescript,
          ide: projectOptions.ide,
        });

        await createProject(projectOptions, targetDir);

        // Show success message
        showSuccessMessage(projectName);

        logger.blank();
        logger.info("To start your application:");
        logger.blank();
        logger.info(`  ${chalk.cyan(`cd ${projectName}`)}`);

        if (packageManager === "npm") {
          logger.info(`  ${chalk.cyan("npm install")}`);
          logger.info(`  ${chalk.cyan("npm run dev")}`);
        } else if (packageManager === "yarn") {
          logger.info(`  ${chalk.cyan("yarn")}`);
          logger.info(`  ${chalk.cyan("yarn dev")}`);
        } else if (packageManager === "pnpm") {
          logger.info(`  ${chalk.cyan("pnpm install")}`);
          logger.info(`  ${chalk.cyan("pnpm dev")}`);
        }

        // Show MCP configuration info
        if (ide && ide !== "none") {
          logger.blank();
          logger.info(chalk.bold("🤖 MCP Docs Server:"));
          logger.info(`  ✓ Configured for ${chalk.cyan(ide)}`);
          logger.info(`  📁 Config files in ${chalk.dim(`.${ide.toLowerCase()}/`)}`);
          logger.info("  💡 Ask your AI assistant VoltAgent questions!");
        }

        logger.blank();
        logger.info(chalk.bold("Happy coding! 🚀"));
      } catch (error) {
        // Capture error event
        captureError({
          projectName,
          errorMessage: error instanceof Error ? error.message : String(error),
        });

        logger.error(
          `Failed to create project: ${error instanceof Error ? error.message : String(error)}`,
        );
        process.exit(1);
      }
    });

  program.parse();
};

/**
 * Handle downloading an example from GitHub
 */
const handleExampleDownload = async (example: string, destination?: string): Promise<void> => {
  const projectName = destination || example;
  const targetDir = path.resolve(process.cwd(), projectName);

  try {
    // Create target directory if it doesn't exist
    if (!fs.existsSync(targetDir)) {
      const dirSpinner = ora(`Creating directory ${chalk.cyan(projectName)}`).start();
      try {
        fs.mkdirSync(targetDir, { recursive: true });
        dirSpinner.succeed(`Directory ${chalk.cyan(projectName)} created`);
      } catch {
        dirSpinner.fail(`Failed to create directory ${chalk.cyan(projectName)}`);
        process.exit(1);
      }
    }

    // Check if the example exists in the repo
    const existsSpinner = ora(
      `Checking if example ${chalk.cyan(example)} exists in voltagent repository`,
    ).start();

    const exampleExists = await existsInRepo({
      path: example,
    });

    if (!exampleExists) {
      existsSpinner.fail(`Could not find example ${chalk.cyan(example)} in voltagent repository`);
      logger.info(
        chalk.yellow(
          "Available examples can be found at: https://github.com/voltagent/voltagent/tree/main/examples",
        ),
      );
      process.exit(1);
    }

    existsSpinner.succeed(`Found example ${chalk.cyan(example)} in voltagent repository`);

    // Download and extract example
    const downloadSpinner = ora(
      `Downloading example ${chalk.cyan(example)} from VoltAgent repository`,
    ).start();

    const downloadStatus = await downloadExample({
      targetDir,
      example,
      branch: "main",
    });

    if (downloadStatus === "download-failed") {
      downloadSpinner.fail(`Failed to download example ${chalk.cyan(example)}`);
      process.exit(1);
    }

    if (downloadStatus === "extract-failed") {
      downloadSpinner.fail(`Failed to extract example ${chalk.cyan(example)}`);
      process.exit(1);
    }

    downloadSpinner.succeed(`Successfully downloaded example ${chalk.cyan(example)}`);

    // Track creation from example
    captureProjectCreation({
      projectName,
      fromExample: example,
      typescript: true,
    });

    logger.blank();
    logger.info("To start your application:");
    logger.blank();
    logger.info(`  ${chalk.cyan(`cd ${projectName}`)}`);
    logger.info(`  ${chalk.cyan("npm install")} (or yarn, pnpm)`);
    logger.info(`  ${chalk.cyan("npm run dev")}`);
    logger.blank();
    logger.info(chalk.bold("Happy coding! 🚀"));
  } catch (error) {
    // Capture error event
    captureError({
      projectName,
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    logger.error(
      `Failed to create project from example: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
};
