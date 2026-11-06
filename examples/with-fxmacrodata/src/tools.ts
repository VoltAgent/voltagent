import { createTool } from "@voltagent/core";
import { z } from "zod";

const FXMACRODATA_BASE_URL = "https://api.fxmacrodata.com/v1";
const FXMACRODATA_REQUEST_TIMEOUT_MS = 20_000;

type FXMacroDataQueryParams = Record<string, number | string | undefined>;

type FXMacroDataResult = {
  data?: unknown;
  error?: string;
  note?: string;
  status?: number;
  success: boolean;
};

const KEYLESS_RELEASES_NOTE =
  "No FXMacroData API key is set: releases are limited to USD from the last 90 days and are delayed by 15 minutes, so a release published in the last 15 minutes is not included. Do not present the newest row as real time; real-time releases need an API key.";

const currencySchema = z.string().regex(/^[A-Za-z]{3}$/, "Use a three-letter ISO currency code.");

/**
 * Lower-cases a currency code for use in a URL path segment.
 */
function code(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * True when a YYYY-MM-DD string is a real calendar date (rejects 2025-02-31).
 */
function isCalendarDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.")
  .refine(isCalendarDate, "Not a valid calendar date.")
  .optional();

const slugSchema = z.string().trim().min(1);

/**
 * Reads FXMACRODATA_API_KEY. The key is optional: the data catalogue answers for every currency
 * without one, as do USD releases from the last 90 days and the USD calendar. Releases and
 * calendars for other currencies, older history and FX rates need one. Returns an error string
 * (never containing the key) for a malformed value.
 */
function readApiKey(): { key?: string; error?: string } {
  const key = process.env.FXMACRODATA_API_KEY?.trim();
  if (!key) {
    return {};
  }
  if (!/^[!-~]+$/.test(key)) {
    return {
      error:
        "FXMACRODATA_API_KEY contains whitespace or non-printable characters; check the value.",
    };
  }
  return { key };
}

/**
 * Removes the API key from text that is returned to the model.
 */
function redact(text: string, key?: string): string {
  return key ? text.split(key).join("[redacted]") : text;
}

/**
 * Returns an error message when a 200 response is not the shape the endpoint documents.
 */
function shapeError(path: string, data: unknown): string | undefined {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return "Unexpected response shape: expected a JSON object.";
  }
  const body = data as Record<string, unknown>;
  if (("detail" in body || "error" in body) && !("data" in body)) {
    return `FXMacroData API error: ${String(body.detail ?? body.error)}`;
  }
  if (path.startsWith("/data_catalogue/")) {
    const entries = Object.values(body);
    const valid =
      entries.length > 0 &&
      entries.every(
        (entry) =>
          typeof entry === "object" &&
          entry !== null &&
          !Array.isArray(entry) &&
          typeof (entry as Record<string, unknown>).name === "string",
      );
    return valid
      ? undefined
      : "Unexpected response shape: expected catalogue entries keyed by indicator slug.";
  }
  if (!Array.isArray(body.data)) {
    return "Unexpected response shape: expected an object with a 'data' list.";
  }
  if (!body.data.every((row) => typeof row === "object" && row !== null && !Array.isArray(row))) {
    return "Unexpected response shape: 'data' rows must be objects.";
  }
  return undefined;
}

/**
 * Calls a read-only FXMacroData REST endpoint and returns a tool-friendly result.
 *
 * Redirects are rejected rather than followed, so the key header is never sent to another
 * host, and the key is removed from any error text.
 */
export async function callFXMacroData(
  path: string,
  params: FXMacroDataQueryParams = {},
): Promise<FXMacroDataResult> {
  const { key: apiKey, error: keyError } = readApiKey();
  if (keyError) {
    return { success: false, error: keyError };
  }

  const url = new URL(`${FXMACRODATA_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const headers: Record<string, string> = { accept: "application/json" };
  if (apiKey) {
    headers["x-api-key"] = apiKey;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FXMACRODATA_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers,
      method: "GET",
      redirect: "error",
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = (await response.text()).slice(0, 500);
      return {
        success: false,
        status: response.status,
        error: redact(
          `FXMacroData API returned HTTP ${response.status}: ${body || response.statusText}`,
          apiKey,
        ),
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return { success: false, status: response.status, error: "FXMacroData returned non-JSON." };
    }

    const problem = shapeError(path, data);
    if (problem) {
      return { success: false, status: response.status, error: redact(problem, apiKey) };
    }

    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : "FXMacroData request failed.";
    return { success: false, error: redact(message, apiKey) };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Builds the note added to keyless release results. It uses the API's own freemium_delay and
 * freemium_window messages when the response carries them, and says how many recent releases
 * were withheld, so the model does not present delayed data as current.
 */
export function keylessReleasesNote(data: unknown): string {
  const body = typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {};
  const field = (name: string): Record<string, unknown> | undefined => {
    const value = body[name];
    return typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : undefined;
  };
  const delay = field("freemium_delay");
  const freemiumWindow = field("freemium_window");
  const parts = [KEYLESS_RELEASES_NOTE];
  for (const message of [delay?.message, freemiumWindow?.message]) {
    if (typeof message === "string" && message.trim()) {
      parts.push(message.trim());
    }
  }
  const withheld = delay?.withheld_count;
  if (typeof withheld === "number" && withheld > 0) {
    parts.push(`${withheld} release(s) published in the last 15 minutes were withheld.`);
  }
  return parts.join(" ");
}

/**
 * Lists the indicator slugs available for a currency.
 */
export const listIndicatorsTool = createTool({
  name: "listIndicators",
  description:
    "List the macroeconomic indicators available for a currency, with names, units and sources. Call this first when you do not know an indicator slug. Works for every currency without an API key.",
  parameters: z.object({
    currency: currencySchema.describe('Three-letter currency code, such as "usd" or "eur".'),
  }),
  execute: async ({ currency }) => callFXMacroData(`/data_catalogue/${code(currency)}`),
});

/**
 * Fetches released values for one indicator, with release timestamps and source links.
 */
export const getIndicatorHistoryTool = createTool({
  name: "getIndicatorHistory",
  description:
    "Fetch released values for one indicator (for example inflation, policy_rate, gdp, unemployment) with the date each value refers to, when it was published, and the official source link. Without an API key only USD releases from the last 90 days are available, each readable 15 minutes after publication, and the result carries a note saying so; real-time releases need an API key.",
  parameters: z.object({
    currency: currencySchema.describe('Three-letter currency code, such as "usd".'),
    indicator: slugSchema.describe(
      'Indicator slug from listIndicators, such as "inflation" or "policy_rate".',
    ),
    startDate: dateSchema.describe("Optional start date, YYYY-MM-DD."),
    endDate: dateSchema.describe("Optional end date, YYYY-MM-DD."),
    limit: z.number().int().min(1).max(100).optional().describe("Maximum rows to return."),
  }),
  execute: async ({ currency, indicator, startDate, endDate, limit = 12 }) => {
    const result = await callFXMacroData(
      `/announcements/${code(currency)}/${encodeURIComponent(indicator.trim().toLowerCase())}`,
      { start_date: startDate, end_date: endDate, limit },
    );
    if (result.success && !readApiKey().key) {
      return { ...result, note: keylessReleasesNote(result.data) };
    }
    return result;
  },
});

/**
 * Fetches the upcoming release calendar for a currency.
 */
export const getReleaseCalendarTool = createTool({
  name: "getReleaseCalendar",
  description:
    "Fetch scheduled economic releases for a currency, with release times in UTC and the publisher's local time. Optionally filter to one indicator. Without an API key only the USD calendar is available.",
  parameters: z.object({
    currency: currencySchema.describe('Three-letter currency code, such as "usd".'),
    indicator: slugSchema.optional().describe('Optional indicator slug, such as "inflation".'),
    startDate: dateSchema.describe("Optional start date, YYYY-MM-DD."),
    endDate: dateSchema.describe("Optional end date, YYYY-MM-DD."),
  }),
  execute: async ({ currency, indicator, startDate, endDate }) =>
    callFXMacroData(`/calendar/${code(currency)}`, {
      indicator: indicator?.trim().toLowerCase(),
      start_date: startDate,
      end_date: endDate,
    }),
});

/**
 * Fetches daily FX rates for a currency pair.
 */
export const getFxRatesTool = createTool({
  name: "getFxRates",
  description:
    "Fetch daily FX rates for a currency pair, such as EUR/USD. Requires an FXMacroData API key.",
  parameters: z.object({
    base: currencySchema.describe('Base currency, such as "eur".'),
    quote: currencySchema.describe('Quote currency, such as "usd".'),
    startDate: dateSchema.describe("Optional start date, YYYY-MM-DD."),
    endDate: dateSchema.describe("Optional end date, YYYY-MM-DD."),
    limit: z.number().int().min(1).max(100).optional().describe("Maximum rows to return."),
  }),
  execute: async ({ base, quote, startDate, endDate, limit = 20 }) =>
    callFXMacroData(`/forex/${code(base)}/${code(quote)}`, {
      start_date: startDate,
      end_date: endDate,
      limit,
    }),
});

export const fxmacrodataTools = [
  listIndicatorsTool,
  getIndicatorHistoryTool,
  getReleaseCalendarTool,
  getFxRatesTool,
];
