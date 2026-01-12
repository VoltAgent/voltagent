// @ts-nocheck
/**
 * Manual test: TrafficController maxConcurrent scheduling.
 *
 * What to look for:
 *  - `inFlight` should never exceed `maxConcurrent`.
 *  - Requests should start in bursts up to `maxConcurrent`.
 *
 * Run:
 *  - pnpm ts-node tmp/test/traffic-concurrency.ts
 *  - VERBOSE=1 pnpm ts-node tmp/test/traffic-concurrency.ts  (enable controller debug logs)
 */

import { safeStringify } from "@voltagent/internal";
import { Agent, getTrafficController } from "../../packages/core/dist/index.js";

const verbose = process.env.VERBOSE === "1";
if (!verbose) {
  console.debug = () => {};
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const now = () => new Date().toISOString();

const maxConcurrent = 3;
const controller = getTrafficController({ maxConcurrent });

let inFlight = 0;
let maxObserved = 0;

function makeModel(id: string, durationMs: number) {
  return {
    specificationVersion: "v2",
    provider: "sim",
    modelId: `concurrency-${id}`,
    doGenerate: async () => {
      inFlight += 1;
      maxObserved = Math.max(maxObserved, inFlight);
      console.log(`[${now()}] start ${id} inFlight=${inFlight}`);

      try {
        await sleep(durationMs);
        return {
          content: [{ type: "text", text: `ok:${id}` }],
          finishReason: "stop",
          usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
          warnings: [],
          response: { modelId: `concurrency-${id}`, headers: {} },
        };
      } finally {
        inFlight -= 1;
        console.log(`[${now()}] end   ${id} inFlight=${inFlight}`);
      }
    },
  };
}

async function main() {
  console.log(`\n=== TrafficController concurrency (maxConcurrent=${maxConcurrent}) ===`);
  void controller;

  const agent = new Agent({
    name: "traffic-concurrency",
    instructions: "echo",
    model: makeModel("base", 0),
    temperature: 0,
    maxOutputTokens: 32,
  });

  const ids = ["A", "B", "C", "D", "E"];
  const jobs = ids.map((id) =>
    agent.generateText(id, {
      tenantId: "default",
      trafficPriority: "P1",
      model: makeModel(id, 700),
    }),
  );

  const settled = await Promise.allSettled(jobs);
  console.log(`\n[done] maxObserved=${maxObserved}`);
  console.log(
    `[done] results=${safeStringify(
      settled.map((s) => (s.status === "fulfilled" ? s.value.text : s.reason?.message)),
    )}`,
  );
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
