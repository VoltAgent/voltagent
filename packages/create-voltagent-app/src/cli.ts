import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import { Command } from "commander";
import inquirer from "inquirer";
import ora from "ora";
import { createProject } from "./project-creator";
import { type AIProvider, AI_PROVIDER_CONFIG, type ProjectOptions, SERVER_CONFIG } from "./types";
import { captureError, captureProjectCreation } from "./utils/analytics";
import {
  colorTypewriter,
  showLogo,
  showSuccessMessage,
  showWelcomeMessage,
  sleep,
} from "./utils/animation";
import { createBaseDependencyInstaller } from "./utils/dependency-installer";
import { promptForApiKey } from "./utils/env-manager";
import { downloadExample, existsInRepo } from "./utils/github";
import logger from "./utils/logger";

export const runCLI = async (): Promise<void> => {
  const program = new Command();

  // Animate the start
  await showLogo(); // Voltagent logo
  showWelcomeMessage(); // Welcome box
  await colorTypewriter("Let's create your next AI application...");
  await sleep(100); // Very short wait

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

      // Check if directory exists when provided as argument
      if (projectDirectory) {
        const targetPath = path.resolve(process.cwd(), projectDirectory);
        if (fs.existsSync(targetPath)) {
          logger.error(
            `Directory "${projectDirectory}" already exists. Please choose a different name.`,
          );
          process.exit(1);
        }
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
              validate: (input: string) => {
                if (!input || input.trim().length === 0) {
                  return "Project name cannot be empty";
                }
                // Check if directory already exists
                const targetPath = path.resolve(process.cwd(), input);
                if (fs.existsSync(targetPath)) {
                  return `Directory "${input}" already exists. Please choose a different name.`;
                }
                return true;
              },
            },
          ]);

      const targetDir = path.resolve(process.cwd(), projectName);

      const { server } = await inquirer.prompt<{
        server: ProjectOptions["server"];
      }>([
        {
          type: "list",
          name: "server",
          message: "Which REST API framework would you like to use to access your agents?",
          choices: [
            { name: `${SERVER_CONFIG.hono.name} (recommended)`, value: "hono" },
            { name: SERVER_CONFIG.elysia.name, value: "elysia" },
          ],
          default: "hono",
        },
      ]);

      // Start installing base dependencies immediately
      const baseDependencyInstaller = await createBaseDependencyInstaller(
        targetDir,
        projectName,
        server || "hono",
      );

      // Wait for base dependencies to finish installing before asking more questions
      await baseDependencyInstaller.waitForCompletion();

      // Select AI provider
      const { aiProvider } = await inquirer.prompt<{ aiProvider: AIProvider }>([
        {
          type: "list",
          name: "aiProvider",
          message: "Which AI provider would you like to use?",
          choices: [
            { name: `OpenAI (${AI_PROVIDER_CONFIG.openai.modelName})`, value: "openai" },
            { name: `Anthropic (${AI_PROVIDER_CONFIG.anthropic.modelName})`, value: "anthropic" },
            { name: `Google (${AI_PROVIDER_CONFIG.google.modelName})`, value: "google" },
            { name: `Groq (${AI_PROVIDER_CONFIG.groq.modelName})`, value: "groq" },
            { name: `Mistral (${AI_PROVIDER_CONFIG.mistral.modelName})`, value: "mistral" },
            { name: `Ollama (${AI_PROVIDER_CONFIG.ollama.modelName} - Local)`, value: "ollama" },
          ],
          default: "openai",
        },
      ]);

      // Prompt for API key if needed
      const apiKey = await promptForApiKey(aiProvider);

      // Select IDE for MCP configuration
      const { ide } = await inquirer.prompt<{
        ide: ProjectOptions["ide"];
      }>([
        {
          type: "list",
          name: "ide",
          message: "Which IDE are you using? (For MCP Docs Server configuration)",
          choices: [
            { name: "None / I'll configure later", value: "none" },
            { name: "Cursor", value: "cursor" },
            { name: "Windsurf", value: "windsurf" },
            { name: "VS Code", value: "vscode" },
          ],
          default: "none",
        },
      ]);

      const projectOptions: ProjectOptions = {
        projectName,
        typescript: true, // VoltAgent uses TypeScript by default
        features: [], // Features aren't used anymore
        ide,
        aiProvider,
        apiKey,
        server: server || "hono",
      };

      // Create the project
      try {
        // Capture project creation event
        captureProjectCreation({
          projectName,
          packageManager: "npm",
          typescript: projectOptions.typescript,
          ide: projectOptions.ide,
          aiProvider: projectOptions.aiProvider,
        });

        await createProject(projectOptions, targetDir);

        // Show success message
        showSuccessMessage(projectName);

        logger.blank();
        logger.info("To start your application:");
        logger.blank();
        logger.info(`  ${chalk.cyan(`cd ${projectName}`)}`);
        logger.info(`  ${chalk.cyan("npm run dev")}`);

        // Show MCP configuration info
        if (ide && ide !== "none") {
          logger.blank();
          logger.info(chalk.bold("🤖 MCP Docs Server:"));
          logger.info(`  ✓ Configured for ${chalk.cyan(ide)}`);
          logger.info(`  📁 Config files in ${chalk.dim(`.${ide.toLowerCase()}/`)}`);
          logger.info("  💡 Ask your AI assistant VoltAgent questions!");
        }

        // Show provider-specific setup info
        if (aiProvider === "ollama") {
          logger.blank();
          logger.info(chalk.bold("🤖 Ollama Setup:"));
          logger.info("  1. Install Ollama from https://ollama.com");
          logger.info(`  2. Run: ${chalk.cyan("ollama pull llama3.2")}`);
          logger.info("  3. Start Ollama before running your app");
        } else if (!apiKey && aiProvider !== "ollama") {
          logger.blank();
          logger.info(chalk.yellow("⚠️  Remember to add your API key:"));
          logger.info(
            `  Add ${chalk.cyan(AI_PROVIDER_CONFIG[aiProvider].envVar)} to your .env file`,
          );
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
    logger.info(`  ${chalk.cyan("npm install")}`);
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
