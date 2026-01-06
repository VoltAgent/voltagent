// @ts-nocheck
/**
 * Manual test: TrafficController + AI SDK with real OpenAI calls.
 *
 * What this exercises:
 *  - Priority scheduling (P0/P1/P2) with `maxConcurrent=1`
 *  - Rate limit header ingestion via `updateRateLimitFromHeaders()` (if headers are present)
 *  - Tenant usage aggregation via `extractUsage` + `getTenantUsage()`
 *
 * Prereqs:
 *  - Set `OPENAI_API_KEY`
 *
 * Run:
 *  - OPENAI_API_KEY=... pnpm ts-node tmp/test/traffic-priority-openai-real.ts
 *  - VERBOSE=1 OPENAI_API_KEY=... pnpm ts-node tmp/test/traffic-priority-openai-real.ts
 *
 * Notes:
 *  - This will make real network calls and may incur cost.
 */

import { openai } from "@ai-sdk/openai";
import { safeStringify } from "@voltagent/internal";
import { Agent, getTrafficController } from "../../packages/core/dist/index.js";

const verbose = process.env.VERBOSE === "1";
if (!verbose) {
  console.debug = () => {};
}

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("Missing OPENAI_API_KEY. Example:");
  console.error("  OPENAI_API_KEY=... pnpm ts-node tmp/test/traffic-priority-openai-real.ts");
  process.exit(1);
}

const _now = () => new Date().toISOString();
const preview = (value: unknown, max = 140) => {
  if (typeof value !== "string") return String(value ?? "");
  return value.length > max ? `${value.slice(0, max)}…` : value;
};

const tenantId = process.env.TENANT_ID ?? "openai-real";
const defaultModelId = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

const controller = getTrafficController({ maxConcurrent: 1 });

function getHeader(headers: any, name: string): string | undefined {
  if (!headers) return undefined;
  if (typeof headers.get === "function") {
    const v = headers.get(name);
    return v === null || v === undefined ? undefined : String(v);
  }
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
  if (!key) return undefined;
  const v = headers[key];
  return v === null || v === undefined ? undefined : String(Array.isArray(v) ? v[0] : v);
}

async function main() {
  console.log(
    `\n=== OpenAI real: priority scheduling (tenantId=${tenantId}, model=${defaultModelId}) ===`,
  );
  void controller;

  const agent = new Agent({
    name: "openai-real-traffic",
    instructions: "Reply exactly with the requested token.",
    model: openai(defaultModelId),
    temperature: 0,
    maxOutputTokens: 32,
  });

  // Enqueue in reverse priority order; controller should still execute P0 first.
  const p2 = agent.generateText("Reply with only: P2", { tenantId, trafficPriority: "P2" });
  const p1 = agent.generateText("Reply with only: P1", { tenantId, trafficPriority: "P1" });
  const p0 = agent.generateText("Reply with only: P0", { tenantId, trafficPriority: "P0" });

  const settled = await Promise.allSettled([p0, p1, p2]);
  for (const result of settled) {
    if (result.status !== "fulfilled") {
      console.log(`[result] rejected=${result.reason?.message ?? String(result.reason)}`);
      continue;
    }

    const headers = result.value.response?.headers;
    const limit = getHeader(headers, "x-ratelimit-limit-requests");
    const remaining = getHeader(headers, "x-ratelimit-remaining-requests");
    const reset = getHeader(headers, "x-ratelimit-reset-requests");

    console.log(
      `[result] text=${preview(result.value.text)} finishReason=${result.value.finishReason} usage=${safeStringify(result.value.usage)}`,
    );
    console.log(
      `[result] ratelimitHeaders=${safeStringify({
        limit,
        remaining,
        reset,
      })}`,
    );
  }

  console.log(
    `\n[done] settled=${safeStringify(
      settled.map((s) => (s.status === "fulfilled" ? preview(s.value.text) : s.reason?.message)),
    )}`,
  );

  console.log(
    `[done] tenantUsage(${tenantId})=${safeStringify(controller.getTenantUsage(tenantId))}`,
  );
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
