/**
 * Next.js Instrumentation File
 *
 * This file is called once when the Next.js server starts up (in both dev and production).
 * We use it to initialize the VoltAgent singleton, which starts the VoltOps console
 * debugging server on port 3141.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

import type { VoltAgent } from "@voltagent/core";

declare global {
  var voltAgent: VoltAgent | undefined;
}

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Initialize VoltAgent singleton on server startup
    // This ensures the debugging server (port 3141) starts immediately
    const { voltAgent } = await import("./lib/agent");

    console.log("✓ VoltAgent initialized");
    console.log("✓ VoltOps console available at http://localhost:3141");

    // Keep reference to prevent garbage collection
    globalThis.voltAgent = voltAgent;
  }
}
