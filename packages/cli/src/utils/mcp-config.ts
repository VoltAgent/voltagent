import fs from "fs-extra";
import path from "node:path";
import chalk from "chalk";

export type McpServerConfig = {
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
};

export type IDEType = "cursor" | "windsurf" | "vscode" | "none";

/**
 * Generate MCP server configuration for VoltAgent docs
 */
export const generateMcpServerConfig = (): McpServerConfig => {
  return {
    name: "voltagent-docs",
    command: "npx",
    args: ["@voltagent/docs-mcp"],
    env: {},
  };
};

/**
 * Check if current directory is a VoltAgent project
 */
export const isVoltAgentProject = async (): Promise<boolean> => {
  const packageJsonPath = path.join(process.cwd(), "package.json");

  if (!fs.existsSync(packageJsonPath)) {
    return false;
  }

  try {
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf-8"));
    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    return Object.keys(dependencies).some((dep) => dep.includes("@voltagent/"));
  } catch {
    return false;
  }
};

/**
 * Check if MCP docs server is already installed
 */
export const isMcpDocsInstalled = async (): Promise<boolean> => {
  const packageJsonPath = path.join(process.cwd(), "package.json");

  if (!fs.existsSync(packageJsonPath)) {
    return false;
  }

  try {
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf-8"));
    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    return "@voltagent/docs-mcp" in dependencies;
  } catch {
    return false;
  }
};

/**
 * Check which MCP config files already exist
 */
export const getExistingMcpConfigs = async (): Promise<IDEType[]> => {
  const configs: IDEType[] = [];

  if (fs.existsSync(path.join(process.cwd(), ".cursor", "mcp.json"))) {
    configs.push("cursor");
  }
  if (fs.existsSync(path.join(process.cwd(), ".windsurf", "mcp.json"))) {
    configs.push("windsurf");
  }
  if (fs.existsSync(path.join(process.cwd(), ".vscode", "mcp.json"))) {
    configs.push("vscode");
  }

  return configs;
};

/**
 * Create MCP configuration files based on selected IDE
 */
export const configureMcpForIde = async (ide: IDEType): Promise<void> => {
  if (ide === "none") {
    return;
  }

  const mcpConfig = generateMcpServerConfig();

  switch (ide) {
    case "cursor":
      await configureCursor(mcpConfig);
      break;
    case "windsurf":
      await configureWindsurf(mcpConfig);
      break;
    case "vscode":
      await configureVSCode(mcpConfig);
      break;
  }
};

/**
 * Configure MCP for Cursor IDE
 */
const configureCursor = async (mcpConfig: McpServerConfig): Promise<void> => {
  const cursorConfigDir = path.join(process.cwd(), ".cursor");
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
const configureWindsurf = async (mcpConfig: McpServerConfig): Promise<void> => {
  const windsurfConfigDir = path.join(process.cwd(), ".windsurf");
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
const configureVSCode = async (mcpConfig: McpServerConfig): Promise<void> => {
  const vscodeConfigDir = path.join(process.cwd(), ".vscode");
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
            args: ["@voltagent/docs-mcp"],
            type: "stdio",
          },
    },
  };

  await fs.writeFile(vscodeConfigFile, JSON.stringify(vscodeConfig, null, 2));
};

/**
 * Show MCP configuration success message
 */
export const showMcpConfigurationMessage = (ide: IDEType): void => {
  if (ide === "none") return;

  console.log(chalk.green(`✓ MCP Docs Server configured for ${ide}!`));
  console.log(chalk.dim(`  Configuration file created in .${ide.toLowerCase()}/mcp.json`));
};
