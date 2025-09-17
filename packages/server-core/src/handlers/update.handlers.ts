import type { ServerProviderDeps } from "@voltagent/core";
import { checkForUpdates, updateAllPackages, updateSinglePackage } from "@voltagent/core";
import type { Logger } from "@voltagent/internal";
import type { ApiResponse } from "../types";

/**
 * Handler for checking available updates
 * Returns update information for packages
 */
export async function handleCheckUpdates(
  _deps: ServerProviderDeps,
  logger: Logger,
): Promise<ApiResponse> {
  try {
    const updates = await checkForUpdates();
    return {
      success: true,
      data: updates,
    };
  } catch (error) {
    logger.error("Failed to check for updates", { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Handler for installing updates
 * Installs either a single package or all packages
 */
export async function handleInstallUpdates(
  packageName: string | undefined,
  _deps: ServerProviderDeps,
  logger: Logger,
): Promise<ApiResponse> {
  try {
    if (packageName) {
      await updateSinglePackage(packageName);
    } else {
      await updateAllPackages();
    }

    return {
      success: true,
      data: { message: "Updates installed successfully" },
    };
  } catch (error) {
    logger.error("Failed to install updates", { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
