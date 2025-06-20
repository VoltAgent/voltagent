import chalk from "chalk";
import type { Command } from "commander";
import fs from "node:fs";
import path from "node:path";
import inquirer from "inquirer";
import ora from "ora";
import { captureError } from "../utils/analytics";

type IDEType = "cursor" | "windsurf" | "vscode" | "none";

const isWindows = process.platform === "win32";

function createMCPConfig(ide: IDEType, projectRoot: string): void {
  if (ide === "none") return;

  const configs = {
    cursor: {
      dir: ".cursor",
      file: "mcp.json",
      content: {
        mcpServers: {
          voltagent: {
            command: "npx",
            args: ["-y", "@voltagent/docs-mcp"],
          },
        },
      },
    },
    windsurf: {
      dir: ".windsurf",
      file: "mcp.json",
      content: {
        mcpServers: {
          voltagent: {
            command: "npx",
            args: ["-y", "@voltagent/docs-mcp"],
          },
        },
      },
    },
    vscode: {
      dir: ".vscode",
      file: "mcp.json",
      content: isWindows
        ? {
            servers: {
              voltagent: {
                command: "cmd",
                args: ["/c", "npx", "-y", "@voltagent/docs-mcp"],
                type: "stdio",
              },
            },
          }
        : {
            servers: {
              voltagent: {
                command: "npx",
                args: ["-y", "@voltagent/docs-mcp"],
                type: "stdio",
              },
            },
          },
    },
  };

  const config = configs[ide];
  const configDir = path.join(projectRoot, config.dir);
  const configFile = path.join(configDir, config.file);

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  fs.writeFileSync(configFile, JSON.stringify(config.content, null, 2));
}

function checkExistingConfig(projectRoot: string): {
  hasConfig: boolean;
  configuredIDE?: IDEType;
  configPath?: string;
} {
  const possibleConfigs = [
    { ide: "cursor" as IDEType, path: path.join(projectRoot, ".cursor", "mcp.json") },
    { ide: "windsurf" as IDEType, path: path.join(projectRoot, ".windsurf", "mcp.json") },
    { ide: "vscode" as IDEType, path: path.join(projectRoot, ".vscode", "mcp.json") },
  ];

  for (const config of possibleConfigs) {
    if (fs.existsSync(config.path)) {
      try {
        const content = fs.readFileSync(config.path, "utf-8");
        const parsed = JSON.parse(content);

        const hasVoltAgentDocs =
          parsed.mcpServers?.["voltagent-docs"] || parsed.servers?.["voltagent-docs"];

        if (hasVoltAgentDocs) {
          return {
            hasConfig: true,
            configuredIDE: config.ide,
            configPath: config.path,
          };
        }
      } catch {
        // Continue on JSON parse error
      }
    }
  }

  return { hasConfig: false };
}

async function setupMCP(options: { force?: boolean } = {}) {
  const projectRoot = process.cwd();

  console.log(chalk.cyan("🔧 VoltAgent MCP Docs Server Setup\n"));

  try {
    const existingConfig = checkExistingConfig(projectRoot);

    if (existingConfig.hasConfig && !options.force) {
      console.log(
        chalk.yellow(`⚠️  MCP already seems to be installed (${existingConfig.configuredIDE})`),
      );
      console.log(chalk.gray(`   Location: ${existingConfig.configPath}\n`));

      const shouldContinue = await inquirer.prompt([
        {
          type: "confirm",
          name: "continue",
          message: "Do you want to reinstall the setup?",
          default: false,
        },
      ]);

      if (!shouldContinue.continue) {
        console.log(chalk.gray("Setup cancelled."));
        return;
      }
    }

    const ideChoice = await inquirer.prompt([
      {
        type: "list",
        name: "ide",
        message: "Which IDE are you using?",
        choices: [
          { name: "Cursor", value: "cursor" },
          { name: "Windsurf", value: "windsurf" },
          { name: "VS Code", value: "vscode" },
          { name: "None (manual setup)", value: "none" },
        ],
      },
    ]);

    const ide = ideChoice.ide as IDEType;

    if (ide === "none") {
      console.log(chalk.yellow("\n📖 Manual setup selected."));
      console.log(chalk.gray("You will need to configure the MCP server manually."));
      console.log(
        chalk.blue("For details: https://voltagent.dev/docs/getting-started/mcp-docs-server\n"),
      );
      return;
    }

    const spinner = ora("Creating MCP configuration...").start();

    try {
      createMCPConfig(ide, projectRoot);
      spinner.succeed(chalk.green(`✅ MCP configuration created for ${ide}!`));

      console.log(chalk.cyan("\n📁 Created files:"));
      const configPath = path.join(`.${ide}`, "mcp.json");
      console.log(chalk.gray(`   ${configPath}`));

      console.log(chalk.cyan("\n🚀 Next steps:"));
      console.log(
        chalk.white(
          `   1. Restart ${ide === "cursor" ? "Cursor" : ide === "windsurf" ? "Windsurf" : "VS Code"}`,
        ),
      );
      console.log(chalk.white("   2. Ask your AI assistant questions about VoltAgent"));
      console.log(chalk.gray('      Example: "How do I create an agent in VoltAgent?"'));
    } catch (error) {
      spinner.fail(chalk.red("Failed to create MCP configuration"));
      throw error;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`\n❌ Error: ${errorMessage}`));

    captureError({
      command: "mcp_setup",
      errorMessage,
    });

    process.exit(1);
  }
}

async function testMCP() {
  console.log(chalk.cyan("🧪 Testing VoltAgent MCP Connection\n"));

  const projectRoot = process.cwd();
  const existingConfig = checkExistingConfig(projectRoot);

  if (!existingConfig.hasConfig) {
    console.log(chalk.red("❌ MCP configuration not found."));
    console.log(chalk.gray("Please run 'volt mcp setup' first.\n"));
    return;
  }

  console.log(chalk.green(`✅ MCP configuration found (${existingConfig.configuredIDE})`));
  console.log(chalk.gray(`   Location: ${existingConfig.configPath}`));

  console.log(chalk.cyan("\n📋 Test suggestions:"));
  console.log(chalk.white("   You can ask your AI assistant these questions:"));
  console.log(chalk.gray('   • "How do I create an agent in VoltAgent?"'));
  console.log(chalk.gray('   • "Is there a VoltAgent example with Next.js?"'));
  console.log(chalk.gray('   • "How do I use voice features?"'));
  console.log(chalk.gray('   • "What are the latest updates?"'));

  console.log(chalk.cyan("\n🔧 Having issues?"));
  console.log(
    chalk.white(
      `   1. Restart ${existingConfig.configuredIDE === "cursor" ? "Cursor" : existingConfig.configuredIDE === "windsurf" ? "Windsurf" : "VS Code"}`,
    ),
  );
  console.log(chalk.white("   2. Check MCP settings"));
  console.log(
    chalk.blue("   3. For help: https://voltagent.dev/docs/getting-started/mcp-docs-server"),
  );
}

async function statusMCP() {
  console.log(chalk.cyan("📊 VoltAgent MCP Status\n"));

  const projectRoot = process.cwd();
  const existingConfig = checkExistingConfig(projectRoot);

  if (!existingConfig.hasConfig) {
    console.log(chalk.red("❌ MCP configuration not found"));
    console.log(chalk.gray("MCP appears to not be installed yet.\n"));
    console.log(chalk.blue("To install: volt mcp setup"));
    return;
  }

  console.log(chalk.green("✅ MCP configuration active"));
  console.log(chalk.gray(`   IDE: ${existingConfig.configuredIDE}`));
  console.log(chalk.gray(`   File: ${existingConfig.configPath}`));

  if (existingConfig.configPath) {
    try {
      const content = fs.readFileSync(existingConfig.configPath, "utf-8");
      const config = JSON.parse(content);

      console.log(chalk.cyan("\n📋 Configuration details:"));
      console.log(chalk.gray(JSON.stringify(config, null, 2)));
    } catch {
      console.log(chalk.yellow("⚠️  Configuration file could not be read"));
    }
  }
}

async function removeMCP() {
  console.log(chalk.cyan("🗑️  VoltAgent MCP Removal\n"));

  const projectRoot = process.cwd();
  const existingConfig = checkExistingConfig(projectRoot);

  if (!existingConfig.hasConfig) {
    console.log(chalk.yellow("⚠️  MCP configuration not found"));
    console.log(chalk.gray("It may have already been removed.\n"));
    return;
  }

  console.log(chalk.yellow(`MCP configuration found (${existingConfig.configuredIDE})`));
  console.log(chalk.gray(`Location: ${existingConfig.configPath}`));

  const shouldRemove = await inquirer.prompt([
    {
      type: "confirm",
      name: "remove",
      message: "Are you sure you want to remove the MCP configuration?",
      default: false,
    },
  ]);

  if (!shouldRemove.remove) {
    console.log(chalk.gray("Operation cancelled."));
    return;
  }

  if (existingConfig.configPath) {
    try {
      fs.unlinkSync(existingConfig.configPath);
      console.log(chalk.green("✅ MCP configuration removed"));
    } catch (error) {
      console.log(chalk.red("❌ Failed to remove MCP configuration"));
      console.error(error);
    }
  }
}

export function registerMCPCommand(program: Command): void {
  const mcpCommand = program.command("mcp").description("VoltAgent MCP Docs Server management");

  mcpCommand
    .command("setup")
    .description("MCP Docs Server setup")
    .option("-f, --force", "Overwrite existing configuration")
    .action(async (options) => {
      await setupMCP(options);
    });

  mcpCommand
    .command("test")
    .description("Test MCP connection")
    .action(async () => {
      await testMCP();
    });

  mcpCommand
    .command("status")
    .description("Show MCP status")
    .action(async () => {
      await statusMCP();
    });

  mcpCommand
    .command("remove")
    .description("Remove MCP configuration")
    .action(async () => {
      await removeMCP();
    });

  mcpCommand.action(async () => {
    await setupMCP();
  });
}
