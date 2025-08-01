import chalk from "chalk";
import inquirer from "inquirer";
import { type AIProvider, AI_PROVIDER_CONFIG } from "../types";
import logger from "./logger";

export const promptForApiKey = async (provider: AIProvider): Promise<string | undefined> => {
  const config = AI_PROVIDER_CONFIG[provider];

  // Ollama doesn't need an API key
  if (!config.envVar) {
    return undefined;
  }

  logger.blank();
  logger.info(`${chalk.bold(config.name)} requires an API key to function.`);
  logger.info(`Get your API key at: ${chalk.cyan(config.apiKeyUrl)}`);
  logger.blank();

  const { shouldInputKey } = await inquirer.prompt<{ shouldInputKey: boolean }>([
    {
      type: "confirm",
      name: "shouldInputKey",
      message: `Would you like to enter your ${config.name} API key now?`,
      default: true,
    },
  ]);

  if (!shouldInputKey) {
    logger.blank();
    logger.info(chalk.yellow("⚠️  No API key provided"));
    logger.info(
      `Please add ${chalk.cyan(config.envVar)} to your .env file before running the app.`,
    );
    logger.blank();
    return undefined;
  }

  const { apiKey } = await inquirer.prompt<{ apiKey: string }>([
    {
      type: "password",
      name: "apiKey",
      message: `Enter your ${config.name} API key:`,
      mask: "*",
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return "API key cannot be empty";
        }
        return true;
      },
    },
  ]);

  return apiKey;
};

export const generateEnvContent = (provider: AIProvider, apiKey?: string): string => {
  const config = AI_PROVIDER_CONFIG[provider];

  // Base environment variables
  let content = "# Environment variables for your VoltAgent app\n\n";

  // Add provider-specific API key if needed
  if (config.envVar) {
    if (apiKey) {
      content += `${config.envVar}=${apiKey}\n`;
    } else {
      content += `# ${config.envVar}=your-api-key-here\n`;
    }
  }

  // Add Ollama configuration if selected
  if (provider === "ollama") {
    content += "# Ollama configuration\n";
    content += "OLLAMA_HOST=http://localhost:11434\n";
  }

  // Add comments for other common environment variables
  content += "\n# Optional: VoltOps Console API Key for observability\n";
  content += "# VOLTOPS_API_KEY=your-voltops-key\n";

  return content;
};
