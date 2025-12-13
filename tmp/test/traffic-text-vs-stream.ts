// @ts-nocheck
/**
 * Manual test: Text + stream traffic share the same TrafficController queue.
 *
 * What to look for:
 *  - Stream and text requests should respect the same maxConcurrent + priority rules.
 *
 * Run:
 *  - pnpm ts-node tmp/test/traffic-text-vs-stream.ts
 *  - VERBOSE=1 pnpm ts-node tmp/test/traffic-text-vs-stream.ts
 */

import { ReadableStream } from "node:stream/web";
import { safeStringify } from "@voltagent/internal";
import { Agent, getTrafficController } from "../../packages/core/dist/index.js";

const verbose = process.env.VERBOSE === "1";
if (!verbose) {
  console.debug = () => {};
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const now = () => new Date().toISOString();

const controller = getTrafficController({ maxConcurrent: 1 });

function extractLabel(prompt: any): string {
  if (!Array.isArray(prompt)) {
    return "unknown";
  }

  for (let index = prompt.length - 1; index >= 0; index -= 1) {
    const message = prompt[index];
    if (!message || message.role !== "user" || !Array.isArray(message.content)) {
      continue;
    }

    const textPart = message.content.find((part: any) => part?.type === "text");
    if (textPart?.text) {
      return String(textPart.text);
    }
  }

  return "unknown";
}

async function main() {
  console.log("\n=== Text vs Stream (shared scheduler) ===");
  void controller;

  const provider = "sim";
  const modelId = "shared-queue";

  const model = {
    specificationVersion: "v2",
    provider,
    modelId,
    doGenerate: async (options: any) => {
      const label = extractLabel(options?.prompt);
      console.log(`[${now()}] doGenerate start input=${label}`);
      await sleep(50);
      console.log(`[${now()}] doGenerate end   input=${label}`);
      return {
        content: [{ type: "text", text: `text:${label}` }],
        finishReason: "stop",
        usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
        warnings: [],
        response: { modelId, headers: {} },
      };
    },
    doStream: async (options: any) => {
      const label = extractLabel(options?.prompt);
      console.log(`[${now()}] doStream start input=${label}`);

      // Hold the controller slot for a bit so ordering is visible.
      await sleep(400);

      console.log(`[${now()}] doStream ready input=${label}`);
      const streamId = `text-${label}`;
      const text = `stream:${label}`;

      const stream = new ReadableStream({
        start(streamController) {
          streamController.enqueue({ type: "stream-start", warnings: [] });
          streamController.enqueue({ type: "text-start", id: streamId });
          streamController.enqueue({ type: "text-delta", id: streamId, delta: text });
          streamController.enqueue({ type: "text-end", id: streamId });
          streamController.enqueue({
            type: "finish",
            usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
            finishReason: "stop",
          });
          streamController.close();
        },
      });

      return { stream, response: { headers: {} } };
    },
  };

  const agent = new Agent({
    name: "traffic-text-vs-stream",
    instructions: "echo",
    model,
    temperature: 0,
    maxOutputTokens: 32,
  });

  const streamP1 = agent.streamText("S1", { tenantId: "default", trafficPriority: "P1" });
  const textP0 = agent.generateText("T0", { tenantId: "default", trafficPriority: "P0" });
  const textP1 = agent.generateText("T1", { tenantId: "default", trafficPriority: "P1" });

  const [streamResult, t0, t1] = await Promise.all([streamP1, textP0, textP1]);
  const streamText = await streamResult.text;

  console.log(
    `\n[done] results=${safeStringify({
      streamText,
      textP0: t0.text,
      textP1: t1.text,
    })}`,
  );
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
