import type { ServerlessRuntime } from "../types";

export function detectServerlessRuntime(): ServerlessRuntime {
  // @ts-ignore - Cloudflare Workers expose globalThis.Deno but with specific flags
  if (typeof globalThis.Deno !== "undefined") {
    return "deno";
  }

  // @ts-ignore - Vercel Edge Runtime sets EdgeRuntime global
  if (typeof globalThis.EdgeRuntime !== "undefined") {
    return "vercel";
  }

  // @ts-ignore - Cloudflare Workers include navigator.userAgent
  if (globalThis.navigator?.userAgent?.includes("Cloudflare")) {
    return "cloudflare";
  }

  return "unknown";
}
