import path from "node:path";
import {
  AI_PROVIDER_CONFIG,
  type ProjectOptions,
  SERVER_CONFIG,
  type TemplateFile,
} from "../types";

// Determine the correct base path for templates.
// In the built version, templates are at ../templates relative to dist/
const TEMPLATES_DIR = path.resolve(__dirname, "..", "templates");

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

        return content
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
