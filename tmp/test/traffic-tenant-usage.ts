// @ts-nocheck
/**
 * Manual test: Tenant usage aggregation (via Agent → TrafficController).
 *
 * What to look for:
 *  - `getTenantUsage(tenantId)` should increase after each agent call.
 *
 * Run:
 *  - pnpm ts-node tmp/test/traffic-tenant-usage.ts
 */

import { safeStringify } from "@voltagent/internal";
import { Agent, getTrafficController } from "../../packages/core/dist/index.js";

const verbose = process.env.VERBOSE === "1";
if (!verbose) {
  console.debug = () => {};
}

function makeModel(modelId: string) {
  return {
    specificationVersion: "v2",
    provider: "usage-provider",
    modelId,
    doGenerate: async () => {
      return {
        content: [{ type: "text", text: `ok:${modelId}` }],
        finishReason: "stop",
        usage: { inputTokens: 2, outputTokens: 3, totalTokens: 5 },
        warnings: [],
        response: { modelId, headers: {} },
      };
    },
  };
}

const controller = getTrafficController({ maxConcurrent: 10 });

async function run(label: string, tenantId: string) {
  const model = makeModel("tenant-usage-model");
  const agent = new Agent({
    name: `TenantUsageAgent-${label}`,
    instructions: "echo",
    model,
    temperature: 0,
    maxOutputTokens: 32,
  });

  console.log(`\n=== ${label} tenantId=${tenantId} ===`);
  const result = await agent.generateText(`hello:${label}`, { tenantId });
  console.log(`[${label}] text=${result.text}`);

  const usage = controller.getTenantUsage(tenantId);
  console.log(`[${label}] controller.getTenantUsage(${tenantId})=${safeStringify(usage)}`);
}

async function main() {
  await run("A1", "tenant-a");
  await run("A2", "tenant-a");
  await run("B1", "tenant-b");

  console.log("\n=== Final usage snapshot ===");
  console.log(`tenant-a=${safeStringify(controller.getTenantUsage("tenant-a"))}`);
  console.log(`tenant-b=${safeStringify(controller.getTenantUsage("tenant-b"))}`);
  console.log(`default=${safeStringify(controller.getTenantUsage("default"))}`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
