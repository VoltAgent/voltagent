import path from "node:path";
import { AI_PROVIDER_CONFIG, type ProjectOptions, type TemplateFile } from "../types";
import { generateEnvContent } from "./env-manager";

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
      sourcePath: path.join(TEMPLATES_DIR, "base/README.md.template"),
      targetPath: "README.md",
      transform: (content: string, options: ProjectOptions) => {
        const provider = options.aiProvider || "openai";
        const config = AI_PROVIDER_CONFIG[provider];

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

        // Replace project name
        let result = content.replace(/{{projectName}}/g, options.projectName);

        // Replace import statement
        result = result.replace('import { openai } from "@ai-sdk/openai";', config.import);

        // Add extra code after imports if needed (for Ollama)
        if ("extraCode" in config && config.extraCode) {
          // Find the position after all imports
          const importRegex = /^import\s+.+from\s+["'].+["'];?\s*$/gm;
          let lastImportIndex = -1;
          let match: RegExpExecArray | null;

          match = importRegex.exec(result);
          while (match !== null) {
            lastImportIndex = match.index + match[0].length;
            match = importRegex.exec(result);
          }

          if (lastImportIndex !== -1) {
            result =
              result.slice(0, lastImportIndex) + config.extraCode + result.slice(lastImportIndex);
          }
        }

        // Replace model instantiation
        result = result.replace('openai("gpt-4o-mini")', config.model);

        return result;
      },
    },
    {
      sourcePath: path.join(TEMPLATES_DIR, "base/.env.template"),
      targetPath: ".env",
      transform: (_content: string, options: ProjectOptions) => {
        return generateEnvContent(options.aiProvider || "openai", options.apiKey);
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
    {
      sourcePath: path.join(TEMPLATES_DIR, "base/.env.example.template"),
      targetPath: ".env.example",
      transform: (content: string, options: ProjectOptions) => {
        const provider = options.aiProvider || "openai";
        const config = AI_PROVIDER_CONFIG[provider];

        let envExample = "";
        if (config.envVar) {
          envExample = `# ${config.name} API Key\n# Get your key at: ${config.apiKeyUrl}\n${config.envVar}=your-api-key-here`;
        }
        if (provider === "ollama") {
          envExample = `# Ollama Configuration\n# Download from: ${config.apiKeyUrl}\n# Default: http://localhost:11434\nOLLAMA_HOST=http://localhost:11434`;
        }

        return content.replace(/{{envExample}}/g, envExample);
      },
    },
  ];
};

// Get all templates
export const getAllTemplates = (): TemplateFile[] => {
  const baseTemplates = getBaseTemplates();
  return baseTemplates;
};
