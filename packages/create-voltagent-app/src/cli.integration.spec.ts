import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import fsExtra from "fs-extra";
import inquirer from "inquirer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runCLI } from "./cli";
import {
  type AIProvider,
  AI_PROVIDER_CONFIG,
  PACKAGE_MANAGER_CONFIG,
  type PackageManager,
  type ProjectOptions,
  SERVER_CONFIG,
  type ServerProvider,
} from "./types";
import { showSuccessMessage } from "./utils/animation";
import { createBaseDependencyInstaller } from "./utils/dependency-installer";
import { promptForApiKey } from "./utils/env-manager";
import { getDefaultPackageManager, getInstalledPackageManagers } from "./utils/package-manager";

vi.mock("inquirer", () => ({
  default: {
    prompt: vi.fn(),
  },
}));

vi.mock("./utils/analytics", () => ({
  captureError: vi.fn(),
  captureProjectCreation: vi.fn(),
}));

vi.mock("./utils/animation", async () => {
  const actual = await vi.importActual<typeof import("./utils/animation")>("./utils/animation");

  return {
    ...actual,
    colorTypewriter: vi.fn(async () => undefined),
    showLogo: vi.fn(async () => undefined),
    showSuccessMessage: vi.fn(),
    showWelcomeMessage: vi.fn(),
    sleep: vi.fn(async () => undefined),
  };
});

vi.mock("./utils/package-manager", () => ({
  getDefaultPackageManager: vi.fn(),
  getInstalledPackageManagers: vi.fn(),
}));

vi.mock("./utils/env-manager", () => ({
  promptForApiKey: vi.fn(),
}));

vi.mock("./utils/dependency-installer", () => ({
  createBaseDependencyInstaller: vi.fn(),
}));

type Scenario = {
  name: string;
  server: ServerProvider;
  packageManager: PackageManager;
  aiProvider: AIProvider;
  ide: NonNullable<ProjectOptions["ide"]>;
  apiKey?: string;
};

const scenarios: Scenario[] = [
  {
    name: "openai-hono-pnpm-none",
    server: "hono",
    packageManager: "pnpm",
    aiProvider: "openai",
    ide: "none",
    apiKey: "openai-key-1",
  },
  {
    name: "anthropic-elysia-bun-cursor",
    server: "elysia",
    packageManager: "bun",
    aiProvider: "anthropic",
    ide: "cursor",
  },
  {
    name: "google-hono-yarn-windsurf",
    server: "hono",
    packageManager: "yarn",
    aiProvider: "google",
    ide: "windsurf",
  },
  {
    name: "groq-elysia-npm-vscode",
    server: "elysia",
    packageManager: "npm",
    aiProvider: "groq",
    ide: "vscode",
  },
  {
    name: "mistral-hono-pnpm-none",
    server: "hono",
    packageManager: "pnpm",
    aiProvider: "mistral",
    ide: "none",
  },
  {
    name: "ollama-elysia-bun-none",
    server: "elysia",
    packageManager: "bun",
    aiProvider: "ollama",
    ide: "none",
  },
  {
    name: "novita-hono-pnpm-none",
    server: "hono",
    packageManager: "pnpm",
    aiProvider: "novita",
    ide: "none",
    apiKey: "novita-key-1",
  },
];

const waitUntil = async (
  predicate: () => boolean,
  options: { timeoutMs?: number; intervalMs?: number } = {},
) => {
  const timeoutMs = options.timeoutMs ?? 15000;
  const intervalMs = options.intervalMs ?? 25;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    if (predicate()) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Timed out after ${timeoutMs}ms while waiting for condition.`);
};

const assertIdeConfig = async (
  projectDir: string,
  ide: NonNullable<ProjectOptions["ide"]>,
): Promise<void> => {
  const cursorPath = path.join(projectDir, ".cursor", "mcp.json");
  const windsurfPath = path.join(projectDir, ".windsurf", "mcp.json");
  const vscodePath = path.join(projectDir, ".vscode", "mcp.json");

  if (ide === "none") {
    expect(fs.existsSync(cursorPath)).toBe(false);
    expect(fs.existsSync(windsurfPath)).toBe(false);
    expect(fs.existsSync(vscodePath)).toBe(false);
    return;
  }

  if (ide === "cursor") {
    const raw = await fsExtra.readFile(cursorPath, "utf8");
    const parsed = JSON.parse(raw) as {
      mcpServers?: Record<string, { command?: string; args?: string[] }>;
    };

    expect(parsed.mcpServers?.voltagent?.command).toBe("npx");
    expect(parsed.mcpServers?.voltagent?.args).toEqual(["-y", "@voltagent/docs-mcp"]);
    expect(fs.existsSync(windsurfPath)).toBe(false);
    expect(fs.existsSync(vscodePath)).toBe(false);
    return;
  }

  if (ide === "windsurf") {
    const raw = await fsExtra.readFile(windsurfPath, "utf8");
    const parsed = JSON.parse(raw) as {
      mcpServers?: Record<string, { command?: string; args?: string[] }>;
    };

    expect(parsed.mcpServers?.voltagent?.command).toBe("npx");
    expect(parsed.mcpServers?.voltagent?.args).toEqual(["-y", "@voltagent/docs-mcp"]);
    expect(fs.existsSync(cursorPath)).toBe(false);
    expect(fs.existsSync(vscodePath)).toBe(false);
    return;
  }

  const raw = await fsExtra.readFile(vscodePath, "utf8");
  const parsed = JSON.parse(raw) as {
    servers?: Record<string, { command?: string; args?: string[]; type?: string }>;
  };

  if (process.platform === "win32") {
    expect(parsed.servers?.voltagent?.command).toBe("cmd");
    expect(parsed.servers?.voltagent?.args).toEqual(["/c", "npx", "-y", "@voltagent/docs-mcp"]);
  } else {
    expect(parsed.servers?.voltagent?.command).toBe("npx");
    expect(parsed.servers?.voltagent?.args).toEqual(["-y", "@voltagent/docs-mcp"]);
  }
  expect(parsed.servers?.voltagent?.type).toBe("stdio");
  expect(fs.existsSync(cursorPath)).toBe(false);
  expect(fs.existsSync(windsurfPath)).toBe(false);
};

describe.sequential("create-voltagent-app CLI option matrix", () => {
  const originalCwd = process.cwd();
  const originalArgv = [...process.argv];
  let tempRoot = "";

  beforeEach(async () => {
    vi.clearAllMocks();
    tempRoot = await fsExtra.mkdtemp(path.join(os.tmpdir(), "voltagent-create-cli-"));
    process.chdir(tempRoot);

    vi.mocked(getInstalledPackageManagers).mockReturnValue(
      Object.keys(PACKAGE_MANAGER_CONFIG) as PackageManager[],
    );
    vi.mocked(getDefaultPackageManager).mockReturnValue("pnpm");

    vi.mocked(createBaseDependencyInstaller).mockImplementation(
      async (targetDir, projectName, server, packageManager) => {
        await fsExtra.ensureDir(targetDir);
        await fsExtra.ensureDir(path.join(targetDir, "src"));
        await fsExtra.ensureDir(path.join(targetDir, "src/workflows"));
        await fsExtra.ensureDir(path.join(targetDir, "src/tools"));
        await fsExtra.ensureDir(path.join(targetDir, ".voltagent"));

        await fsExtra.writeJson(path.join(targetDir, "package.json"), {
          name: projectName,
          version: "0.1.0",
          type: "module",
          dependencies: {
            "@voltagent/core": "^2.0.0",
            "@voltagent/libsql": "^2.0.0",
            [SERVER_CONFIG[server].package]: SERVER_CONFIG[server].packageVersion,
          },
          meta: {
            packageManager,
          },
        });

        return {
          waitForCompletion: async () => undefined,
        };
      },
    );
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    process.argv = [...originalArgv];
    await fsExtra.remove(tempRoot);
  });

  it("creates projects successfully across all selectable options", async () => {
    const serverCoverage = new Set<ServerProvider>();
    const packageManagerCoverage = new Set<PackageManager>();
    const providerCoverage = new Set<AIProvider>();
    const ideCoverage = new Set<NonNullable<ProjectOptions["ide"]>>();

    for (const scenario of scenarios) {
      const projectName = `app-${scenario.name}`;
      process.argv = [originalArgv[0] ?? "node", "create-voltagent-app", projectName];

      let promptCall = 0;
      vi.mocked(inquirer.prompt).mockImplementation(async () => {
        promptCall += 1;
        if (promptCall === 1) {
          return { server: scenario.server };
        }
        if (promptCall === 2) {
          return { packageManager: scenario.packageManager };
        }
        if (promptCall === 3) {
          return { aiProvider: scenario.aiProvider };
        }
        if (promptCall === 4) {
          return { ide: scenario.ide };
        }
        throw new Error(`Unexpected inquirer prompt call #${promptCall} for ${scenario.name}`);
      });

      vi.mocked(promptForApiKey).mockImplementation(async (provider) => {
        expect(provider).toBe(scenario.aiProvider);
        return scenario.apiKey;
      });

      const successCallsBefore = vi.mocked(showSuccessMessage).mock.calls.length;
      await runCLI();
      await waitUntil(
        () => vi.mocked(showSuccessMessage).mock.calls.length === successCallsBefore + 1,
        { timeoutMs: 15000 },
      );

      const projectDir = path.join(tempRoot, projectName);
      expect(fs.existsSync(projectDir)).toBe(true);

      const installCall = vi.mocked(createBaseDependencyInstaller).mock.calls.at(-1) as
        | [string, string, ServerProvider, PackageManager]
        | undefined;
      expect(installCall).toBeDefined();
      expect(installCall?.[2]).toBe(scenario.server);
      expect(installCall?.[3]).toBe(scenario.packageManager);

      const indexContent = await fsExtra.readFile(path.join(projectDir, "src", "index.ts"), "utf8");
      expect(indexContent).toContain(`from "${SERVER_CONFIG[scenario.server].package}"`);
      expect(indexContent).toContain(`server: ${SERVER_CONFIG[scenario.server].factory}()`);
      expect(indexContent).toContain(`model: "${AI_PROVIDER_CONFIG[scenario.aiProvider].model}"`);

      const envContent = await fsExtra.readFile(path.join(projectDir, ".env"), "utf8");
      if (scenario.aiProvider === "ollama") {
        expect(envContent).toContain("OLLAMA_HOST=http://localhost:11434");
      } else {
        const envVar = AI_PROVIDER_CONFIG[scenario.aiProvider].envVar;
        expect(envVar).toBeDefined();
        if (scenario.apiKey) {
          expect(envContent).toContain(`${envVar}=${scenario.apiKey}`);
        } else {
          expect(envContent).toContain(`${envVar}=your-api-key-here`);
        }
      }

      await assertIdeConfig(projectDir, scenario.ide);

      serverCoverage.add(scenario.server);
      packageManagerCoverage.add(scenario.packageManager);
      providerCoverage.add(scenario.aiProvider);
      ideCoverage.add(scenario.ide);
    }

    expect(serverCoverage).toEqual(new Set<ServerProvider>(["hono", "elysia"]));
    expect(packageManagerCoverage).toEqual(new Set<PackageManager>(["pnpm", "bun", "yarn", "npm"]));
    expect(providerCoverage).toEqual(
      new Set<AIProvider>(["openai", "anthropic", "google", "groq", "mistral", "ollama", "novita"]),
    );
    expect(ideCoverage).toEqual(
      new Set<NonNullable<ProjectOptions["ide"]>>(["none", "cursor", "windsurf", "vscode"]),
    );
  }, 60000);
});
