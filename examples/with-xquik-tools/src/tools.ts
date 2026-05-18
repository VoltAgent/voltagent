import { createTool } from "@voltagent/core";
import { z } from "zod";

const XQUIK_API_CONTRACT = "2026-04-29";
const DEFAULT_XQUIK_BASE_URL = "https://xquik.com/api/v1";
const XQUIK_REQUEST_TIMEOUT_MS = 20_000;

type XquikQueryParams = Record<string, boolean | number | string | undefined>;

type XquikResult = {
  data?: unknown;
  error?: string;
  status?: number;
  success: boolean;
};

const queryTypeSchema = z.enum(["Latest", "Top"]);

function getXquikBaseUrl(): string {
  return (process.env.XQUIK_BASE_URL ?? DEFAULT_XQUIK_BASE_URL).replace(/\/+$/, "");
}

function encodeXIdentifier(value: string): string {
  const identifier = value.trim().replace(/^@+/, "");
  if (!identifier) {
    throw new Error("A username or user ID is required.");
  }
  return encodeURIComponent(identifier);
}

function appendQueryParams(url: URL, params: XquikQueryParams): void {
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") {
      continue;
    }

    url.searchParams.set(key, typeof value === "boolean" ? String(value) : String(value));
  }
}

async function callXquik(path: string, params: XquikQueryParams = {}): Promise<XquikResult> {
  const apiKey = process.env.XQUIK_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      error: "XQUIK_API_KEY is not set. Add it to .env before calling live Xquik tools.",
    };
  }

  const url = new URL(`${getXquikBaseUrl()}${path}`);
  appendQueryParams(url, params);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), XQUIK_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        "x-api-key": apiKey,
        "xquik-api-contract": XQUIK_API_CONTRACT,
      },
      method: "GET",
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = (await response.text()).slice(0, 500);
      return {
        success: false,
        status: response.status,
        error: `Xquik API returned HTTP ${response.status}: ${body || response.statusText}`,
      };
    }

    return {
      success: true,
      data: await response.json(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Xquik request failed.",
    };
  } finally {
    clearTimeout(timeout);
  }
}

export const searchXPostsTool = createTool({
  name: "searchXPosts",
  description:
    "Search recent public X/Twitter posts with X query operators, chronological or engagement-ranked sorting, and pagination.",
  parameters: z.object({
    query: z
      .string()
      .min(1)
      .describe('Search query, such as "agent frameworks", "from:voltagent_dev", or "#AI".'),
    queryType: queryTypeSchema.optional().describe('Sort order. Use "Latest" or "Top".'),
    limit: z.number().int().min(1).max(50).optional().describe("Maximum posts to return."),
    cursor: z.string().optional().describe("Pagination cursor from a previous response."),
    sinceTime: z.string().optional().describe("ISO 8601 timestamp to search after."),
    untilTime: z.string().optional().describe("ISO 8601 timestamp to search before."),
  }),
  execute: async ({ query, queryType = "Latest", limit = 10, cursor, sinceTime, untilTime }) =>
    callXquik("/x/tweets/search", {
      q: query,
      queryType,
      limit,
      cursor,
      sinceTime,
      untilTime,
    }),
});

export const getXPostTool = createTool({
  name: "getXPost",
  description:
    "Look up a public X/Twitter post by ID and return its text, author, metrics, and media.",
  parameters: z.object({
    postId: z.string().min(1).describe("Numeric X/Twitter post ID."),
  }),
  execute: async ({ postId }) => callXquik(`/x/tweets/${encodeURIComponent(postId.trim())}`),
});

export const getXUserTool = createTool({
  name: "getXUser",
  description: "Look up a public X/Twitter user profile by username or user ID.",
  parameters: z.object({
    user: z.string().min(1).describe("X username without @, or a numeric X user ID."),
  }),
  execute: async ({ user }) => callXquik(`/x/users/${encodeXIdentifier(user)}`),
});

export const getXUserPostsTool = createTool({
  name: "getXUserPosts",
  description: "Fetch recent public posts from an X/Twitter user by username or user ID.",
  parameters: z.object({
    user: z.string().min(1).describe("X username without @, or a numeric X user ID."),
    cursor: z.string().optional().describe("Pagination cursor from a previous response."),
    includeReplies: z.boolean().optional().describe("Include replies in the returned posts."),
    includeParentTweet: z.boolean().optional().describe("Include parent posts for replies."),
  }),
  execute: async ({ user, cursor, includeReplies = false, includeParentTweet = false }) =>
    callXquik(`/x/users/${encodeXIdentifier(user)}/tweets`, {
      cursor,
      includeReplies,
      includeParentTweet,
    }),
});

export const getXTrendsTool = createTool({
  name: "getXTrends",
  description: "Fetch public X/Twitter trending topics by WOEID region.",
  parameters: z.object({
    woeid: z.number().int().min(1).optional().describe("WOEID region. Use 1 for worldwide."),
    count: z.number().int().min(1).max(50).optional().describe("Number of trends to return."),
  }),
  execute: async ({ woeid = 1, count = 10 }) => callXquik("/x/trends", { woeid, count }),
});

export const xquikTools = [
  searchXPostsTool,
  getXPostTool,
  getXUserTool,
  getXUserPostsTool,
  getXTrendsTool,
];
