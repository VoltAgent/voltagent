import path from "node:path";
import {
  AI_PROVIDER_CONFIG,
  type ProjectOptions,
  SERVER_CONFIG,
  type TemplateFile,
} from "../types";
import { supportsDockerfile } from "./package-manager";

// Resolve templates for both source execution (src/) and built execution (dist/).
const resolveTemplatesDir = () => {
  const distPath = path.resolve(__dirname, "..", "templates");
  const sourcePath = path.resolve(__dirname, "..", "..", "templates");

  if (process.env.NODE_ENV === "test") {
    // Prefer source templates in tests to avoid requiring a prior build step.
    return sourcePath;
  }

  return distPath;
};

const TEMPLATES_DIR = resolveTemplatesDir();

export const getBaseTemplates = (): TemplateFile[] => {
  return [
    {
      sourcePath: path.join(TEMPLATES_DIR, "base/tsconfig.json.template"),
      targetPath: "tsconfig.json",
    },
    {
      sourcePath: path.join(TEMPLATES_DIR, "base/tsdown.config.ts.template"),
      targetPath: "tsdown.config.ts",
    },
    {
      sourcePath: path.join(TEMPLATES_DIR, "base/README.md.template"),
      targetPath: "README.md",
      transform: (content: string, options: ProjectOptions) => {
        const provider = options.aiProvider || "openai";
        const config = AI_PROVIDER_CONFIG[provider];
        const server = options.server || "hono";
        const serverConfig = SERVER_CONFIG[server];

        // Always use npm commands
        const pm = {
          install: "npm install",
          dev: "npm run dev",
          build: "npm run build",
          start: "npm start",
          command: "npm run",
        };

        // Environment config preview
        let envConfig = "";
        if (config.envVar) {
          envConfig = `${config.envVar}=your-api-key-here`;
        }
        if (provider === "ollama") {
          envConfig = "OLLAMA_HOST=http://localhost:11434";
        }
        envConfig +=
          "\n\n# VoltOps Platform (Optional)\n# Get your keys at https://console.voltagent.dev/tracing-setup\n# VOLTAGENT_PUBLIC_KEY=your-public-key\n# VOLTAGENT_SECRET_KEY=your-secret-key";

        const result = content
          .replace(/{{projectName}}/g, options.projectName)
          .replace(/{{aiProviderName}}/g, config.name)
          .replace(/{{modelName}}/g, config.modelName)
          .replace(/{{serverName}}/g, serverConfig.name)
          .replace(/{{packageManagerInstall}}/g, pm.install)
          .replace(/{{packageManagerDev}}/g, pm.dev)
          .replace(/{{packageManagerBuild}}/g, pm.build)
          .replace(/{{packageManagerStart}}/g, pm.start)
          .replace(/{{packageManagerCommand}}/g, pm.command)
          .replace(/{{envConfig}}/g, envConfig)
          .replace(/{{apiKeyUrl}}/g, config.apiKeyUrl || "");

        if (!supportsDockerfile(options.packageManager, options.packageManagerVersion)) {
          return result
            .replace(/^├── Dockerfile.*\r?\n/m, "")
            .replace(
              /## 🐳 Docker Deployment[\s\S]*?(?=## 🛠️ Development)/,
              `## 🐳 Docker Deployment\n\nThis project uses Yarn ${options.packageManagerVersion}. The starter Dockerfile supports Yarn Classic (1.x) only, so no Dockerfile was generated. Add a Dockerfile that supports your Yarn version and configuration before building an image.\n\n`,
            );
        }
        return result;
      },
    },
    {
      sourcePath: path.join(TEMPLATES_DIR, "base/index.ts.template"),
      targetPath: "src/index.ts",
      transform: (content: string, options: ProjectOptions) => {
        const provider = options.aiProvider || "openai";
        const config = AI_PROVIDER_CONFIG[provider];
        const server = options.server || "hono";
        const serverConfig = SERVER_CONFIG[server];

        // Replace project name
        let result = content.replace(/{{projectName}}/g, options.projectName);

        result = result
          .replace(/{{serverPackage}}/g, serverConfig.package)
          .replace(/{{serverFactory}}/g, serverConfig.factory);

        // Replace model id
        result = result.replace(/{{modelId}}/g, config.model);

        return result;
      },
    },
    {
      sourcePath: path.join(TEMPLATES_DIR, "base/.env.template"),
      targetPath: ".env",
      transform: (content: string, options: ProjectOptions) => {
        const provider = options.aiProvider || "openai";
        const config = AI_PROVIDER_CONFIG[provider];

        let envExample = "";
        if (config.envVar && options.apiKey) {
          envExample = `# ${config.name} API Key\n# Get your key at: ${config.apiKeyUrl}\n${config.envVar}=${options.apiKey}`;
        } else if (config.envVar) {
          envExample = `# ${config.name} API Key\n# Get your key at: ${config.apiKeyUrl}\n${config.envVar}=your-api-key-here`;
        }
        if (provider === "ollama") {
          envExample = `# Ollama Configuration\n# Download from: ${config.apiKeyUrl}\n# Default: http://localhost:11434\nOLLAMA_HOST=http://localhost:11434`;
        }

        return content.replace(/{{envExample}}/g, envExample);
      },
    },
    {
      sourcePath: path.join(TEMPLATES_DIR, "base/workflows/index.ts.template"),
      targetPath: "src/workflows/index.ts",
      transform: (content: string, options: ProjectOptions) => {
        return content.replace(/{{projectName}}/g, options.projectName);
      },
    },
    {
      sourcePath: path.join(TEMPLATES_DIR, "base/tools/weather.ts.template"),
      targetPath: "src/tools/weather.ts",
    },
    {
      sourcePath: path.join(TEMPLATES_DIR, "base/tools/index.ts.template"),
      targetPath: "src/tools/index.ts",
    },
    {
      sourcePath: path.join(TEMPLATES_DIR, "base/Dockerfile.template"),
      targetPath: "Dockerfile",
      transform: (content: string, options: ProjectOptions) => {
        if (!supportsDockerfile(options.packageManager, options.packageManagerVersion)) {
          throw new Error("Docker generation currently supports Yarn Classic (1.x) only.");
        }
        const packageManagers = {
          npm: {
            bunStage: "",
            lockfileCopy: "",
            toolSetup: "",
            installCommand: "npm ci",
            productionInstallCommand: "npm ci --omit=dev",
          },
          yarn: {
            bunStage: "",
            lockfileCopy: "COPY yarn.lock ./",
            toolSetup: "",
            installCommand: "yarn install --frozen-lockfile",
            productionInstallCommand: "yarn install --frozen-lockfile --production",
          },
          pnpm: {
            bunStage: "",
            lockfileCopy: "COPY pnpm-lock.yaml ./",
            toolSetup: `RUN npm install -g pnpm@${options.packageManagerVersion}`,
            installCommand: "pnpm install --frozen-lockfile",
            productionInstallCommand: "pnpm install --frozen-lockfile --prod",
          },
          bun: {
            bunStage: `FROM oven/bun:${options.packageManagerVersion}-alpine AS bun-tool\n\n`,
            lockfileCopy: "COPY bun.lock* ./",
            toolSetup: "COPY --from=bun-tool /usr/local/bin/bun /usr/local/bin/bun",
            installCommand: "bun install --frozen-lockfile",
            productionInstallCommand: "bun install --frozen-lockfile --production",
          },
        } satisfies Record<
          ProjectOptions["packageManager"],
          {
            bunStage: string;
            lockfileCopy: string;
            toolSetup: string;
            installCommand: string;
            productionInstallCommand: string;
          }
        >;
        const selected = packageManagers[options.packageManager];

        return content
          .replace(/{{bunStage}}/g, selected.bunStage)
          .replace(/{{lockfileCopy}}/g, selected.lockfileCopy)
          .replace(/{{toolSetup}}/g, selected.toolSetup)
          .replace(/{{installCommand}}/g, selected.installCommand)
          .replace(/{{productionInstallCommand}}/g, selected.productionInstallCommand);
      },
    },
    {
      sourcePath: path.join(TEMPLATES_DIR, "base/.dockerignore.template"),
      targetPath: ".dockerignore",
    },
  ];
};

// Get all templates
export const getAllTemplates = (): TemplateFile[] => {
  const baseTemplates = getBaseTemplates();
  return baseTemplates;
};
