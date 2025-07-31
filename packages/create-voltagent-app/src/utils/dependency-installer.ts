import { execSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createSpinner } from "./animation";
import fileManager from "./file-manager";
import logger from "./logger";

/**
 * Creates base package.json and starts installing dependencies
 */
export const createBaseDependencyInstaller = async (
  targetDir: string,
  projectName: string,
): Promise<{
  waitForCompletion: () => Promise<void>;
}> => {
  // Create directory structure
  await fileManager.ensureDir(targetDir);
  await fileManager.ensureDir(path.join(targetDir, "src"));
  await fileManager.ensureDir(path.join(targetDir, "src/workflows"));
  await fileManager.ensureDir(path.join(targetDir, "src/tools"));
  await fileManager.ensureDir(path.join(targetDir, ".voltagent"));

  // Create base package.json without AI provider dependencies
  const basePackageJson = {
    name: projectName,
    version: "0.1.0",
    description: "A VoltAgent application",
    type: "module",
    scripts: {
      dev: "tsx watch --env-file=.env ./src",
      build: "tsc",
      start: "node dist/index.js",
      lint: "biome check ./src",
      "lint:fix": "biome check --write ./src",
      typecheck: "tsc --noEmit",
      volt: "volt",
    },
    dependencies: {
      "@voltagent/core": "^0.1.63",
      "@voltagent/vercel-ai": "^0.1.14",
      "@voltagent/cli": "^0.1.9",
      "@voltagent/logger": "^0.1.0",
      dotenv: "^16.4.7",
      zod: "3.24.2",
    },
    devDependencies: {
      "@biomejs/biome": "^1.9.4",
      "@types/node": "^22.10.5",
      tsx: "^4.19.2",
      typescript: "^5.7.3",
    },
    engines: {
      node: ">=20.0.0",
    },
  };

  // Write package.json
  await fileManager.writeFile(
    path.join(targetDir, "package.json"),
    JSON.stringify(basePackageJson, null, 2),
  );

  // Show installing message
  logger.info("Installing base dependencies (this may take a minute)...");
  const spinner = createSpinner("Installing packages");
  spinner.start();

  let installComplete = false;
  let installError: Error | null = null;
  let errorOutput = "";

  // Run npm install in background
  const installPromise = new Promise<void>((resolve, reject) => {
    try {
      // Use spawn for async execution
      const npmInstall = spawn("npm", ["install", "--loglevel=error"], {
        cwd: targetDir,
        stdio: ["ignore", "ignore", "pipe"], // Only capture stderr
        shell: process.platform === "win32", // Only use shell on Windows
      });

      // Capture error output
      npmInstall.stderr?.on("data", (data) => {
        errorOutput += data.toString();
      });

      npmInstall.on("close", (code: number) => {
        spinner.stop();
        if (code === 0) {
          logger.success("Base dependencies installed successfully! 📦");
          installComplete = true;
          resolve();
        } else {
          const error = new Error(`npm install failed with code ${code}`);
          logger.error("Failed to install base dependencies");
          if (errorOutput) {
            console.error(errorOutput);
          }
          installError = error;
          reject(error);
        }
      });

      npmInstall.on("error", (error: Error) => {
        spinner.stop();
        logger.error("Failed to install base dependencies");
        installError = error;
        reject(error);
      });
    } catch (error) {
      spinner.stop();
      logger.error("Failed to install base dependencies");
      installError = error as Error;
      reject(error);
    }
  });

  return {
    waitForCompletion: async () => {
      if (installComplete) {
        return;
      }
      try {
        await installPromise;
      } catch (error) {
        logger.warning("Base dependency installation failed. You can install manually later.");
      }
    },
  };
};

/**
 * Installs provider-specific dependencies
 */
export const installProviderDependency = async (
  targetDir: string,
  providerPackage: string,
  providerVersion: string,
): Promise<void> => {
  const spinner = createSpinner(`Installing ${providerPackage}`);
  spinner.start();

  try {
    execSync(`npm install ${providerPackage}@${providerVersion} --loglevel=error`, {
      cwd: targetDir,
      stdio: ["ignore", "ignore", "pipe"], // Only capture stderr
    });
    spinner.stop();
    logger.success(`Provider dependency ${providerPackage} installed! 🎯`);
  } catch (error) {
    spinner.stop();
    logger.error(`Failed to install ${providerPackage}`);
    // Show error details if available
    if (error instanceof Error && "stderr" in error) {
      console.error((error as any).stderr?.toString());
    }
    logger.warning("You can install the provider package manually later.");
  }
};
