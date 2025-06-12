import path from "node:path";
import type { ProjectOptions, TemplateFile } from "../types";

// Determine the correct base path for templates.
// Assumes the templates directory is either:
// 1. At ../../templates relative to src/utils (local dev)
// 2. Copied to ../../templates relative to dist/src/utils (build output)
const TEMPLATES_DIR = path.resolve(__dirname, "..", "templates");

export const getBaseTemplates = (): TemplateFile[] => {
  return [
    {
      sourcePath: path.join(TEMPLATES_DIR, "base/package.json.template"),
      targetPath: "package.json",
      transform: (content: string, options: ProjectOptions) => {
        const pkg = JSON.parse(content);
        pkg.name = options.projectName;

        return JSON.stringify(pkg, null, 2);
      },
    },
    {
      sourcePath: path.join(TEMPLATES_DIR, "base/tsconfig.json.template"),
      targetPath: "tsconfig.json",
    },
    {
      sourcePath: path.join(TEMPLATES_DIR, "base/README.md.template"),
      targetPath: "README.md",
      transform: (content: string, options: ProjectOptions) => {
        return content.replace(/{{projectName}}/g, options.projectName);
      },
    },
    {
      sourcePath: path.join(TEMPLATES_DIR, "base/index.ts.template"),
      targetPath: "src/index.ts",
      transform: (content: string, options: ProjectOptions) => {
        return content.replace(/{{projectName}}/g, options.projectName);
      },
    },
    {
      sourcePath: path.join(TEMPLATES_DIR, "base/.env.template"),
      targetPath: ".env",
    },
  ];
};

// Get all templates
export const getAllTemplates = (): TemplateFile[] => {
  const baseTemplates = getBaseTemplates();
  return baseTemplates;
};
