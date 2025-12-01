import type { BuilderPrepareContext, BuilderScoreContext } from "@voltagent/core";

type TenantAwareContext = BuilderScoreContext<Record<string, unknown>, Record<string, unknown>> &
  BuilderPrepareContext<Record<string, unknown>, Record<string, unknown>>;

export function extractTenantId(
  context:
    | BuilderScoreContext<Record<string, unknown>, Record<string, unknown>>
    | BuilderPrepareContext<Record<string, unknown>, Record<string, unknown>>
    | TenantAwareContext,
): string | undefined {
  const candidate = (context.payload as { tenantId?: unknown })?.tenantId;
  return typeof candidate === "string" ? candidate : undefined;
}
