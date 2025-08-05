import path from "node:path";
import chalk from "chalk";
import fs from "fs-extra";
import type { ProjectOptions } from "../types";

export type McpServerConfig = {
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
};

/**
 * Generate MCP server configuration for VoltAgent docs
 */
export const generateMcpServerConfig = (): McpServerConfig => {
  return {
    name: "voltagent",
    command: "npx",
    args: ["-y", "@voltagent/docs-mcp"],
    env: {},
  };
};

/**
 * Create MCP configuration files based on selected IDE
 */
export const configureMcpForIde = async (
  targetDir: string,
  options: ProjectOptions,
): Promise<void> => {
  if (!options.ide || options.ide === "none") {
    return;
  }

  const mcpConfig = generateMcpServerConfig();

  switch (options.ide) {
    case "cursor":
      await configureCursor(targetDir, mcpConfig);
      break;
    case "windsurf":
      await configureWindsurf(targetDir, mcpConfig);
      break;
    case "vscode":
      await configureVSCode(targetDir, mcpConfig);
      break;
  }
};

/**
 * Configure MCP for Cursor IDE
 */
const configureCursor = async (targetDir: string, mcpConfig: McpServerConfig): Promise<void> => {
  const cursorConfigDir = path.join(targetDir, ".cursor");
  const cursorConfigFile = path.join(cursorConfigDir, "mcp.json");

  await fs.ensureDir(cursorConfigDir);

  const cursorConfig = {
    mcpServers: {
      [mcpConfig.name]: {
        command: mcpConfig.command,
        args: mcpConfig.args,
        env: mcpConfig.env,
      },
    },
  };

  await fs.writeFile(cursorConfigFile, JSON.stringify(cursorConfig, null, 2));
};

/**
 * Configure MCP for Windsurf IDE
 */
const configureWindsurf = async (targetDir: string, mcpConfig: McpServerConfig): Promise<void> => {
  const windsurfConfigDir = path.join(targetDir, ".windsurf");
  const windsurfConfigFile = path.join(windsurfConfigDir, "mcp.json");

  await fs.ensureDir(windsurfConfigDir);

  const windsurfConfig = {
    mcpServers: {
      [mcpConfig.name]: {
        command: mcpConfig.command,
        args: mcpConfig.args,
        env: mcpConfig.env,
      },
    },
  };

  await fs.writeFile(windsurfConfigFile, JSON.stringify(windsurfConfig, null, 2));
};

/**
 * Configure MCP for VS Code
 */
const configureVSCode = async (targetDir: string, mcpConfig: McpServerConfig): Promise<void> => {
  const vscodeConfigDir = path.join(targetDir, ".vscode");
  const vscodeConfigFile = path.join(vscodeConfigDir, "mcp.json");

  await fs.ensureDir(vscodeConfigDir);

  // VS Code uses different config format and Windows needs cmd wrapper
  const isWindows = process.platform === "win32";

  const vscodeConfig = {
    servers: {
      [mcpConfig.name]: isWindows
        ? {
            command: "cmd",
            args: ["/c", "npx", "-y", "@voltagent/docs-mcp"],
            type: "stdio",
          }
        : {
            command: "npx",
            args: ["-y", "@voltagent/docs-mcp"],
            type: "stdio",
          },
    },
  };

  await fs.writeFile(vscodeConfigFile, JSON.stringify(vscodeConfig, null, 2));
};

/**
 * Show MCP configuration success message
 */
export const showMcpConfigurationMessage = (ide: string): void => {
  console.log(chalk.green(`✓ MCP Docs Server configured for ${ide}!`));
  console.log(chalk.dim(`  Configuration file created in .${ide.toLowerCase()}/mcp.json`));
};
