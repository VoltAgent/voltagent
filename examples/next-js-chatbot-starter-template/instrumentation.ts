/**
 * Next.js Instrumentation File
 *
 * This file is called once when the Next.js server starts up (in both dev and production).
 * The VoltAgent built-in server should be started in a separate process.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    return;
  }
}
