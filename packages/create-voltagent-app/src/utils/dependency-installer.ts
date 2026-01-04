import { execSync, spawn } from "node:child_process";
import path from "node:path";
import { SERVER_CONFIG, type ServerProvider } from "../types";
import { createSpinner } from "./animation";
import fileManager from "./file-manager";
import logger from "./logger";

/**
 * Creates base package.json and starts installing dependencies
 */
export const createBaseDependencyInstaller = async (
  targetDir: string,
  projectName: string,
  server: ServerProvider,
): Promise<{
  waitForCompletion: () => Promise<void>;
}> => {
  // Create directory structure
  await fileManager.ensureDir(targetDir);
  await fileManager.ensureDir(path.join(targetDir, "src"));
  await fileManager.ensureDir(path.join(targetDir, "src/workflows"));
  await fileManager.ensureDir(path.join(targetDir, "src/tools"));
  await fileManager.ensureDir(path.join(targetDir, ".voltagent"));

  const serverConfig = SERVER_CONFIG[server];

  const baseDependencies: Record<string, string> = {
    "@voltagent/core": "^2.0.0",
    "@voltagent/libsql": "^2.0.0",
    ai: "^5.0.12",
    "@voltagent/cli": "^0.1.10",
    "@voltagent/logger": "^2.0.0",
    dotenv: "^16.4.7",
    zod: "^3.25.76",
  };

  baseDependencies[serverConfig.package] = serverConfig.packageVersion;

  // Create base package.json without AI provider dependencies
  const basePackageJson = {
    name: projectName,
    version: "0.1.0",
    description: "A VoltAgent application",
    type: "module",
    scripts: {
      dev: "tsx watch --env-file=.env ./src",
      build: "tsdown",
      start: "node dist/index.js",
      lint: "biome check ./src",
      "lint:fix": "biome check --write ./src",
      typecheck: "tsc --noEmit",
      volt: "volt",
    },
    dependencies: baseDependencies,
    devDependencies: {
      "@biomejs/biome": "^1.9.4",
      "@types/node": "^22.10.5",
      tsdown: "^0.15.2",
      tsx: "^4.19.2",
      typescript: "^5.7.3",
    },
    engines: {
      node: ">=20.19.0",
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
  let _installError: Error | null = null;
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
          _installError = error;
          reject(error);
        }
      });

      npmInstall.on("error", (error: Error) => {
        spinner.stop();
        logger.error("Failed to install base dependencies");
        _installError = error;
        reject(error);
      });
    } catch (error) {
      spinner.stop();
      logger.error("Failed to install base dependencies");
      _installError = error as Error;
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
      } catch (_error) {
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
  extraPackages: readonly string[] = [],
): Promise<void> => {
  const displayName = [`${providerPackage}@${providerVersion}`, ...extraPackages].join(", ");
  const spinner = createSpinner(`Installing ${displayName}`);
  spinner.start();

  try {
    const toInstall = [`${providerPackage}@${providerVersion}`, ...extraPackages].join(" ");

    execSync(`npm install ${toInstall} --loglevel=error`, {
      cwd: targetDir,
      stdio: ["ignore", "ignore", "pipe"], // Only capture stderr
    });
    spinner.stop();
    logger.success(`Installed: ${displayName} 🎯`);
  } catch (error) {
    spinner.stop();
    logger.error(`Failed to install ${displayName}`);
    // Show error details if available
    if (error instanceof Error && "stderr" in error) {
      console.error((error as any).stderr?.toString());
    }
    logger.warning("You can install the provider packages manually later.");
  }
};
