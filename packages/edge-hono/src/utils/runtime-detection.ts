import type { EdgeRuntime } from "../types";

export function detectEdgeRuntime(): EdgeRuntime {
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

  // @ts-ignore - Netlify Edge exposes Netlify global
  if (typeof (globalThis as { Netlify?: unknown }).Netlify !== "undefined") {
    return "netlify";
  }

  return "unknown";
}
