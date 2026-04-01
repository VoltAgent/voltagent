import type { ServerProviderDeps } from "@voltagent/core";
import type { Logger } from "@voltagent/internal";
import { UPDATE_ROUTES, handleCheckUpdates, handleInstallUpdates } from "@voltagent/server-core";
import type { Elysia } from "elysia";
import { t } from "elysia";
import { ErrorSchema, UpdateCheckResponseSchema, UpdateInstallResponseSchema } from "../schemas";

/**
 * Package name parameter schema
 */
const PackageNameParam = t.Object({
  packageName: t.String({ description: "Name of the package to update" }),
});

/**
 * Install updates request schema
 */
const InstallUpdatesRequestSchema = t.Object({
  packageName: t.Optional(t.String({ description: "Optional specific package name to update" })),
});

/**
 * Register update routes with validation and OpenAPI documentation
 */
export function registerUpdateRoutes(app: Elysia, deps: ServerProviderDeps, logger: Logger): void {
  // GET /updates - Check for updates
  app.get(
    UPDATE_ROUTES.checkUpdates.path,
    async () => {
      const response = await handleCheckUpdates(deps, logger);
      if (!response.success) {
        throw new Error("Failed to check updates");
      }
      return response;
    },
    {
      response: {
        200: UpdateCheckResponseSchema,
        500: ErrorSchema,
      },
      detail: {
        summary: "Check for updates",
        description: "Checks for available updates for VoltAgent packages and dependencies",
        tags: ["Updates"],
      },
    },
  );

  // POST /updates - Install updates
  app.post(
    UPDATE_ROUTES.installUpdates.path,
    async ({ body }) => {
      let packageName: string | undefined;

      try {
        const b = body as { packageName?: unknown };
        if (typeof b?.packageName === "string") {
          packageName = b.packageName;
        }
      } catch (error) {
        logger.warn("Failed to parse update install request body", { error });
      }

      const response = await handleInstallUpdates(packageName, deps, logger);
      if (!response.success) {
        throw new Error("Failed to install updates");
      }
      return response;
    },
    {
      body: InstallUpdatesRequestSchema,
      response: {
        200: UpdateInstallResponseSchema,
        500: ErrorSchema,
      },
      detail: {
        summary: "Install updates",
        description:
          "Installs available updates for all packages or a specific package if specified",
        tags: ["Updates"],
      },
    },
  );

  // POST /updates/:packageName - Install single package update
  app.post(
    UPDATE_ROUTES.installSingleUpdate.path,
    async ({ params }) => {
      const response = await handleInstallUpdates(params.packageName, deps, logger);
      if (!response.success) {
        throw new Error("Failed to install package update");
      }
      return response;
    },
    {
      params: PackageNameParam,
      response: {
        200: UpdateInstallResponseSchema,
        500: ErrorSchema,
      },
      detail: {
        summary: "Install specific package update",
        description: "Installs an update for a specific package by name",
        tags: ["Updates"],
      },
    },
  );
}
