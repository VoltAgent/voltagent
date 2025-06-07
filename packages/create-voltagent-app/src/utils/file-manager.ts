import path from "node:path";
import fs from "fs-extra";
import type { ProjectOptions, TemplateFile } from "../types";

const fileManager = {
  ensureDir: async (dirPath: string): Promise<void> => {
    await fs.ensureDir(dirPath);
  },

  copyFile: async (source: string, target: string): Promise<void> => {
    await fs.copy(source, target);
  },

  writeFile: async (filePath: string, content: string): Promise<void> => {
    await fs.writeFile(filePath, content, "utf8");
  },

  readFile: async (filePath: string): Promise<string> => {
    return fs.readFile(filePath, "utf8");
  },

  processTemplateFile: async (
    templateFile: TemplateFile,
    options: ProjectOptions,
    targetDir: string,
  ): Promise<void> => {
    try {
      const sourceContent = await fileManager.readFile(templateFile.sourcePath);
      const targetPath = path.join(targetDir, templateFile.targetPath);

      await fileManager.ensureDir(path.dirname(targetPath));

      let content = sourceContent;
      if (templateFile.transform) {
        content = templateFile.transform(content, options);
      }

      await fileManager.writeFile(targetPath, content);
    } catch (error) {
      console.error(`Error processing template file ${templateFile.sourcePath}: ${error}`);
      throw error;
    }
  },
};

export default fileManager;
