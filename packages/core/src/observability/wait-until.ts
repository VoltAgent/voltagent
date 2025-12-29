/**
 * Global type definition for VoltAgent observability
 */
type VoltAgentGlobal = typeof globalThis & {
  ___voltagent_wait_until?: (promise: Promise<unknown>) => void;
};

/**
 * Sets the waitUntil function for the current execution context.
 * This is used by the observability pipeline to flush spans without blocking the response
 * in serverless environments (e.g., Cloudflare Workers, Vercel).
 *
 * @param waitUntil - The platform-specific waitUntil function
 *
 * @example
 * // In Next.js App Router
 * import { setWaitUntil } from '@voltagent/core';
 * import { after } from 'next/server'; // or from context
 *
 * export async function POST(req: Request) {
 *   // If using Vercel's waitUntil from context or similar
 *   // setWaitUntil(ctx.waitUntil);
 *
 *   // Or if using Next.js 15+ after()
 *   // setWaitUntil(after);
 *
 *   // ... agent code ...
 * }
 */
export function setWaitUntil(waitUntil: (promise: Promise<unknown>) => void): void {
  const globals = globalThis as VoltAgentGlobal;
  globals.___voltagent_wait_until = waitUntil;
}
