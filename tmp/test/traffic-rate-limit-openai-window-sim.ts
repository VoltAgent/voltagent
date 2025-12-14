// @ts-nocheck
/**
 * Manual test (real network): Simulate OpenAI "window remaining + reset" semantics and watch
 * TrafficController pace + probe behavior via logs.
 *
 * Why "simulate"?
 *  - Real OpenAI headers usually show very large remaining values, so pacing is hard to observe.
 *  - This script still hits the real OpenAI model, but it drives the controller state using
 *    synthetic `x-ratelimit-*` headers to force a small window (e.g. remaining=3, reset=30s).
 *
 * What this demonstrates (matches your Step 1–7):
 *  1) We seed controller with remaining + reset window.
 *  2) We enqueue many requests.
 *  3) Controller subtracts `reserved` from `remaining` to avoid stampedes.
 *  4) When `effectiveRemaining <= 1`, controller waits until `resetAt + probeDelay`.
 *  5) When room exists, controller paces using `nextAllowedAt`.
 *  6) When a request finishes, we release reservation (controller) and apply new headers (this script).
 *  7) After reset, controller sends a probe even when remaining==0; probe "fetches" fresh headers and flow resumes.
 *
 * Prereqs:
 *  - Set `OPENAI_API_KEY`
 *
 * Suggested logging:
 *  - `VOLTAGENT_LOG_LEVEL=trace` (to see traffic controller internals)
 *
 * Run:
 *  - VOLTAGENT_LOG_LEVEL=trace OPENAI_API_KEY=... pnpm ts-node tmp/test/traffic-rate-limit-openai-window-sim.ts
 *
 * Optional env:
 *  - OPENAI_MODEL (default: gpt-4o-mini)
 *  - WINDOW_SECONDS (default: 30)
 *  - REMAINING (default: 3)
 *  - REQUESTS (default: 10)
 *  - MAX_CONCURRENT (default: 50)
 */

import { safeStringify } from "@voltagent/internal";
import { TrafficController } from "../../packages/core/dist/index.js";

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("Missing OPENAI_API_KEY. Example:");
  console.error(
    "  VOLTAGENT_LOG_LEVEL=trace OPENAI_API_KEY=... pnpm ts-node tmp/test/traffic-rate-limit-openai-window-sim.ts",
  );
  process.exit(1);
}

const now = () => new Date().toISOString();

const modelId = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const windowSecondsRaw = Number(process.env.WINDOW_SECONDS ?? "30");
const remainingRaw = Number(process.env.REMAINING ?? "3");
const requestsRaw = Number(process.env.REQUESTS ?? "10");
const maxConcurrentRaw = Number(process.env.MAX_CONCURRENT ?? "50");

const windowSeconds =
  Number.isFinite(windowSecondsRaw) && windowSecondsRaw > 0 ? windowSecondsRaw : 30;
const initialRemaining =
  Number.isFinite(remainingRaw) && remainingRaw > 0 ? Math.floor(remainingRaw) : 3;
const requestCount = Number.isFinite(requestsRaw) && requestsRaw > 0 ? Math.floor(requestsRaw) : 10;
const maxConcurrent =
  Number.isFinite(maxConcurrentRaw) && maxConcurrentRaw > 0 ? Math.floor(maxConcurrentRaw) : 50;

const provider = "openai";
const tenantId = "openai-window-sim";
const windowMs = Math.round(windowSeconds * 1000);

async function callOpenAIResponses(label: string): Promise<{
  status: number;
  headers: Record<string, string | undefined>;
  textPreview: string;
}> {
  const url = "https://api.openai.com/v1/responses";
  const body = safeStringify({
    model: modelId,
    input: `Reply with only: ${label}`,
    max_output_tokens: 16,
  });

  const startedAt = Date.now();
  const res = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body,
  });

  const limit = res.headers.get("x-ratelimit-limit-requests") ?? undefined;
  const remaining = res.headers.get("x-ratelimit-remaining-requests") ?? undefined;
  const reset = res.headers.get("x-ratelimit-reset-requests") ?? undefined;

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `OpenAI error status=${res.status} elapsedMs=${Date.now() - startedAt} body=${text.slice(0, 280)}`,
    );
  }

  const data: any = await res.json();
  const outputText =
    data?.output?.[0]?.content?.find?.((c: any) => c?.type === "output_text")?.text ??
    data?.output_text ??
    data?.output?.[0]?.content?.[0]?.text ??
    "";

  return {
    status: res.status,
    headers: {
      "x-ratelimit-limit-requests": limit,
      "x-ratelimit-remaining-requests": remaining,
      "x-ratelimit-reset-requests": reset,
    },
    textPreview: String(outputText).slice(0, 80),
  };
}

async function main() {
  console.log(
    `\n=== OpenAI real + synthetic window rate limit (provider=${provider}, model=${modelId}) ===`,
  );
  console.log(
    `[config] maxConcurrent=${maxConcurrent} windowSeconds=${windowSeconds} initialRemaining=${initialRemaining} requests=${requestCount}`,
  );
  console.log(
    "[hint] Set VOLTAGENT_LOG_LEVEL=trace to see TrafficController internals (reserved/effectiveRemaining/nextAllowedAt).",
  );

  const controller = new TrafficController({ maxConcurrent });

  // --- Step 1: seed "remaining + reset window" into controller ---
  let windowResetAt = Date.now() + windowMs;
  let remainingInWindow = initialRemaining;

  const applySyntheticHeaders = (source: string) => {
    const resetMs = Math.max(1, windowResetAt - Date.now());
    const applied = controller.updateRateLimitFromHeaders(
      { provider, model: modelId, tenantId },
      {
        "x-ratelimit-limit-requests": String(initialRemaining),
        "x-ratelimit-remaining-requests": String(Math.max(0, remainingInWindow)),
        "x-ratelimit-reset-requests": `${resetMs}ms`,
      },
    );
    console.log(
      `[${now()}] [synthetic] source=${source} remaining=${remainingInWindow} resetInMs=${resetMs} applied=${safeStringify(
        applied && {
          key: applied.key,
          state: {
            remaining: applied.state.remaining,
            reserved: applied.state.reserved,
            resetAt: applied.state.resetAt,
            nextAllowedAt: applied.state.nextAllowedAt,
          },
        },
      )}`,
    );
  };

  applySyntheticHeaders("seed");

  console.log("\n[seed] Making one real request to confirm connectivity + show real headers...");
  const seed = await callOpenAIResponses("seed");
  console.log(
    `[${now()}] [seed] ok status=${seed.status} text=${seed.textPreview} realHeaders=${safeStringify(
      seed.headers,
    )}`,
  );

  console.log(`\n[burst] Enqueueing ${requestCount} controller-managed requests...`);

  const jobs = Array.from({ length: requestCount }, (_, index) => {
    const label = `req-${index + 1}`;
    const enqueuedAt = Date.now();
    console.log(`[${now()}] [enqueue] ${label}`);

    return controller
      .handleText({
        tenantId,
        metadata: {
          tenantId,
          provider,
          model: modelId,
          priority: "P1",
          agentName: "openai-window-sim",
          agentId: label,
        },
        execute: async () => {
          const startedAt = Date.now();
          console.log(`[${now()}] [execute-start] ${label}`);

          const result = await callOpenAIResponses(label);

          console.log(
            `[${now()}] [execute-end]   ${label} elapsedMs=${Date.now() - startedAt} realHeaders=${safeStringify(
              result.headers,
            )}`,
          );

          // --- Step 6: decrement remaining + apply new "headers" ---
          const nowMs = Date.now();
          if (nowMs >= windowResetAt) {
            // --- Step 7: reset happened; probe request fetched "fresh" headers for the next window ---
            console.log(
              `[${now()}] [reset] window elapsed; starting new synthetic window (windowSeconds=${windowSeconds})`,
            );
            windowResetAt = nowMs + windowMs;
            remainingInWindow = initialRemaining;
          }

          remainingInWindow = Math.max(0, remainingInWindow - 1);
          applySyntheticHeaders("response");

          return result;
        },
      })
      .then((r) => {
        const totalElapsedMs = Date.now() - enqueuedAt;
        console.log(
          `[${now()}] [done] ${label} totalElapsedMs=${totalElapsedMs} text=${r.textPreview}`,
        );
        return { label, totalElapsedMs, status: "fulfilled" as const };
      })
      .catch((error: any) => {
        const totalElapsedMs = Date.now() - enqueuedAt;
        console.log(
          `[${now()}] [fail] ${label} totalElapsedMs=${totalElapsedMs} name=${error?.name ?? "Error"} msg=${
            error?.message ?? String(error)
          }`,
        );
        return { label, totalElapsedMs, status: "rejected" as const };
      });
  });

  const settled = await Promise.all(jobs);
  console.log(`\n[done] settled=${safeStringify(settled.map((s) => s.status))}`);
  console.log(
    `[done] tenantUsage(${tenantId})=${safeStringify(controller.getTenantUsage(tenantId))}`,
  );
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
