import { isIP } from "node:net";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { createTool } from "@voltagent/core";
import { safeStringify } from "@voltagent/internal";
import { z } from "zod";

export const BAIZHI_ENDPOINT = "https://agent-toolkit.app.baizhi.cloud/mcp";
export const TOOL_NAMES = ["websearch_search", "web_scrape", "web_extract"] as const;
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_TOOL_CALLS = 6;

// These are the server's wire names, not marketing aliases. Discovery must confirm them.
const domain = z
  .string()
  .trim()
  .refine(
    (value) =>
      isIP(value) !== 0 ||
      /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(value),
    "Use a bare domain or IP without a scheme, path, query or fragment.",
  );
const searchParameters = z.object({
  query: z.string().trim().min(1),
  count: z.number().int().min(1).max(5).default(3),
  filter: z
    .object({
      domains: z.array(domain).optional(),
      exclude_domains: z.array(domain).optional(),
    })
    .optional(),
  time_range: z.enum(["day", "week", "month", "year"]).default("month"),
});
const webUrl = z
  .string()
  .url()
  .refine((value) => {
    try {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
    } catch {
      return false;
    }
  }, "Use an HTTP(S) URL without credentials.");
const scrapeParameters = z.object({ url: webUrl });
const extractParameters = z
  .object({
    url: webUrl,
    fields: z.record(z.enum(["string", "number", "boolean", "array"])).optional(),
    instruction: z.string().trim().min(1).optional(),
  })
  .refine((value) => (value.fields && Object.keys(value.fields).length > 0) || value.instruction, {
    message: "Provide fields or an extraction instruction.",
  });

export function redact(text: string, secrets: string[]): string {
  return secrets.reduce((result, secret) => {
    if (!secret) return result;
    // Tool results are JSON text, so also handle escaped quotes/backslashes in a key.
    const escaped = safeStringify(secret).slice(1, -1);
    return result.split(escaped).join("[REDACTED]").split(secret).join("[REDACTED]");
  }, text);
}

/** One connection and one shared tool-call budget for a single research question. */
export async function openResearchSession(
  apiKey: string,
  signal: AbortSignal,
  // Tests use an in-memory server; the CLI always uses the fixed HTTPS endpoint below.
  transport?: Transport,
) {
  if (!apiKey.trim() || /[\r\n]/.test(apiKey)) {
    throw new Error("Set a valid BAIZHI_API_KEY before starting research.");
  }
  signal.throwIfAborted();
  const client = new Client({ name: "voltagent-baizhi-research", version: "0.1.0" });
  let closed = false;
  let toolCalls = 0;
  const close = async () => {
    if (closed) return;
    closed = true;
    await client.close();
  };

  try {
    await client.connect(
      transport ??
        new StreamableHTTPClientTransport(new URL(BAIZHI_ENDPOINT), {
          // The SDK can also open a GET stream; enforce redirects for every request.
          fetch: (url, init) => fetch(url, { ...init, redirect: "error" }),
          requestInit: {
            headers: { Authorization: `Bearer ${apiKey}` },
          },
        }),
      { signal, timeout: REQUEST_TIMEOUT_MS },
    );
    const discovered = new Set<string>();
    let cursor: string | undefined;
    for (let page = 0; page < 10; page++) {
      const result = await client.listTools(cursor ? { cursor } : {}, {
        signal,
        timeout: REQUEST_TIMEOUT_MS,
      });
      for (const tool of result.tools) discovered.add(tool.name);
      cursor = result.nextCursor;
      if (!cursor) break;
    }
    if (cursor || TOOL_NAMES.some((name) => !discovered.has(name))) {
      throw new Error("Required research tools are unavailable.");
    }
  } catch {
    await close().catch(() => undefined);
    // Remote errors can echo request headers; never forward their messages or causes.
    throw new Error(
      "Could not discover the research tools. Check credentials, access and connectivity.",
    );
  }

  const call = async (
    name: (typeof TOOL_NAMES)[number],
    args: Record<string, unknown>,
    operationSignal?: AbortSignal,
  ) => {
    const requestSignal = operationSignal ? AbortSignal.any([signal, operationSignal]) : signal;
    if (closed || requestSignal.aborted)
      throw new Error("Research was cancelled or the session ended.");
    if (toolCalls >= MAX_TOOL_CALLS) throw new Error("Research reached its six-call tool budget.");
    // Count attempts, including failures: an unsuccessful request may still consume credits.
    toolCalls++;
    try {
      const result = await client.callTool({ name, arguments: args }, undefined, {
        signal: requestSignal,
        timeout: REQUEST_TIMEOUT_MS,
      });
      if (result.isError) throw new Error("Remote tool failed.");
      return redact(safeStringify(result), [apiKey]);
    } catch {
      throw new Error(
        "Research tool failed or was cancelled. Check access, credits and connectivity.",
      );
    }
  };

  return {
    close,
    tools: [
      createTool({
        name: "websearch_search",
        description:
          "Find up to five public sources. Put site restrictions in filter.domains, not query.",
        parameters: searchParameters,
        execute: (args, options) =>
          call(
            "websearch_search",
            {
              ...searchParameters.parse(args),
              need_summary: false,
            },
            options?.toolContext?.abortSignal,
          ),
      }),
      createTool({
        name: "web_scrape",
        description:
          "Read one public page as Markdown to verify a claim. Does not request a download.",
        parameters: scrapeParameters,
        execute: (args, options) =>
          call(
            "web_scrape",
            {
              ...scrapeParameters.parse(args),
              download: false,
              return_format: "markdown",
            },
            options?.toolContext?.abortSignal,
          ),
      }),
      createTool({
        name: "web_extract",
        description:
          "Extract comparison fields from one public source using fields or instruction.",
        parameters: extractParameters,
        execute: (args, options) =>
          call(
            "web_extract",
            {
              ...extractParameters.parse(args),
              download: false,
            },
            options?.toolContext?.abortSignal,
          ),
      }),
    ] as const,
  };
}
