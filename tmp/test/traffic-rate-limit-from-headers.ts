// @ts-nocheck
/**
 * Manual test: TrafficController dynamic rate limits from OpenAI response headers.
 *
 * This hits the real OpenAI model via Agent + AI SDK, and relies on the
 * `x-ratelimit-*` response headers to seed/update the TrafficController.
 *
 * What to look for:
 *  - Each request prints the observed `x-ratelimit-*` headers (if present).
 *  - Agent should also log: "[Traffic] Applied rate limit from response headers".
 *  - With enough parallel requests, some requests may take longer due to controller throttling.
 *
 * Prereqs:
 *  - Set `OPENAI_API_KEY`
 *
 * Optional env:
 *  - `OPENAI_MODEL` (default: gpt-4o-mini)
 *  - `REQUESTS` (default: 10)
 *  - `MAX_CONCURRENT` (default: 50)
 *  - `TENANT_ID` (default: openai-rate-limit-headers)
 *
 * Run:
 *  - OPENAI_API_KEY=... pnpm ts-node tmp/test/traffic-rate-limit-from-headers.ts
 *  - VERBOSE=1 OPENAI_API_KEY=... REQUESTS=30 pnpm ts-node tmp/test/traffic-rate-limit-from-headers.ts
 */

import { openai } from "@ai-sdk/openai";
import { safeStringify } from "@voltagent/internal";
import { Agent, getTrafficController } from "../../packages/core/dist/index.js";

const verbose = process.env.VERBOSE === "1";
if (!verbose) {
  console.debug = () => {};
}

const now = () => new Date().toISOString();

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("Missing OPENAI_API_KEY. Example:");
  console.error("  OPENAI_API_KEY=... pnpm ts-node tmp/test/traffic-rate-limit-from-headers.ts");
  process.exit(1);
}

const provider = "openai";
const modelId = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const tenantId = process.env.TENANT_ID ?? "openai-rate-limit-headers";
const requestCountRaw = Number(process.env.REQUESTS ?? "10");
const maxConcurrentRaw = Number(process.env.MAX_CONCURRENT ?? "50");
const requestCount = Number.isFinite(requestCountRaw) && requestCountRaw > 0 ? requestCountRaw : 10;
const maxConcurrent =
  Number.isFinite(maxConcurrentRaw) && maxConcurrentRaw > 0 ? maxConcurrentRaw : 50;

const key = `${provider}::${modelId}`;
const controller = getTrafficController({ maxConcurrent });

function getHeader(headers: any, name: string): string | undefined {
  if (!headers) return undefined;
  if (typeof headers.get === "function") {
    const v = headers.get(name);
    return v === null || v === undefined ? undefined : String(v);
  }

  const entries = Object.entries(headers as Record<string, unknown>);
  const target = name.toLowerCase();
  const match = entries.find(([k]) => String(k).toLowerCase() === target);
  if (!match) return undefined;

  const value = match[1];
  if (Array.isArray(value)) {
    const first = value[0];
    return first === null || first === undefined ? undefined : String(first);
  }

  return value === null || value === undefined ? undefined : String(value);
}

async function main() {
  console.log(
    `\n=== OpenAI rate limit headers → TrafficController (${key}, maxConcurrent=${maxConcurrent}, requests=${requestCount}) ===`,
  );
  void controller;

  const agent = new Agent({
    name: "openai-rate-limit-from-headers",
    instructions: "Reply with only the requested token.",
    model: openai(modelId),
    temperature: 0,
    maxOutputTokens: 32,
  });

  console.log("\n[seed] Making one request to capture headers...");
  const seedStartedAt = Date.now();
  const seed = await agent.generateText("Reply with only: seed", {
    tenantId,
    trafficPriority: "P1",
  });
  const seedElapsedMs = Date.now() - seedStartedAt;

  const seedHeaders = seed.response?.headers;
  console.log(`[seed] done in ${seedElapsedMs}ms text=${seed.text}`);
  console.log(
    `[seed] x-ratelimit-*=${safeStringify({
      limit: getHeader(seedHeaders, "x-ratelimit-limit-requests"),
      remaining: getHeader(seedHeaders, "x-ratelimit-remaining-requests"),
      reset: getHeader(seedHeaders, "x-ratelimit-reset-requests"),
    })}`,
  );

  console.log(`\n[burst] Scheduling ${requestCount} parallel requests...`);
  const jobs = Array.from({ length: requestCount }, (_, idx) => {
    const label = `req-${idx + 1}`;
    const enqueuedAt = Date.now();
    console.log(`[${now()}] enqueue ${label}`);

    return agent
      .generateText(`Reply with only: ${label}`, { tenantId, trafficPriority: "P1" })
      .then((result) => {
        const elapsedMs = Date.now() - enqueuedAt;
        const headers = result.response?.headers;
        console.log(
          `[${now()}] done    ${label} in ${elapsedMs}ms text=${result.text} x-ratelimit-remaining=${getHeader(
            headers,
            "x-ratelimit-remaining-requests",
          )}`,
        );
        return {
          label,
          elapsedMs,
          text: result.text,
          headers: {
            limit: getHeader(headers, "x-ratelimit-limit-requests"),
            remaining: getHeader(headers, "x-ratelimit-remaining-requests"),
            reset: getHeader(headers, "x-ratelimit-reset-requests"),
          },
        };
      })
      .catch((error) => {
        const elapsedMs = Date.now() - enqueuedAt;
        console.log(
          `[${now()}] failed  ${label} in ${elapsedMs}ms name=${error?.name ?? "Error"} status=${error?.status ?? error?.statusCode ?? "n/a"} msg=${error?.message}`,
        );
        throw error;
      });
  });

  const settled = await Promise.allSettled(jobs);

  console.log(`\n[done] settled=${safeStringify(settled.map((s) => s.status))}`);
  console.log(
    `[done] tenantUsage(${tenantId})=${safeStringify(controller.getTenantUsage(tenantId))}`,
  );
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
