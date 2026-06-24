import { afterEach, describe, expect, it, vi } from "vitest";
import { buildBochaSearchRequest, mapBochaSearchResponse } from "./bocha";
import { bochaSearchTool } from "./tools";

const originalApiKey = process.env.BOCHA_SEARCH_API_KEY;
const originalApiUrl = process.env.BOCHA_SEARCH_API_URL;

afterEach(() => {
  if (originalApiKey === undefined) {
    Reflect.deleteProperty(process.env, "BOCHA_SEARCH_API_KEY");
  } else {
    process.env.BOCHA_SEARCH_API_KEY = originalApiKey;
  }

  if (originalApiUrl === undefined) {
    Reflect.deleteProperty(process.env, "BOCHA_SEARCH_API_URL");
  } else {
    process.env.BOCHA_SEARCH_API_URL = originalApiUrl;
  }

  vi.restoreAllMocks();
});

describe("Bocha search tool helpers", () => {
  it("builds a conservative Bocha search request", () => {
    expect(
      buildBochaSearchRequest({
        query: "latest agent framework news",
        count: 20,
        freshness: "oneWeek",
        includeDomains: ["github.com", "voltagent.dev"],
        excludeDomains: ["example.com"],
      }),
    ).toEqual({
      query: "latest agent framework news",
      freshness: "oneWeek",
      summary: true,
      count: 10,
      include: "github.com|voltagent.dev",
      exclude: "example.com",
    });
  });

  it("maps Bocha web page results into source-linked search results", () => {
    const mapped = mapBochaSearchResponse({
      data: {
        webPages: {
          value: [
            {
              name: "VoltAgent",
              url: "https://voltagent.dev/",
              summary: "Open-source TypeScript agent framework.",
              siteName: "VoltAgent",
              datePublished: "2026-06-01",
            },
            {
              title: "Fallback title field",
              displayUrl: "https://example.com/result",
              snippet: "Snippet fallback.",
            },
          ],
        },
      },
    });

    expect(mapped).toEqual([
      {
        title: "VoltAgent",
        link: "https://voltagent.dev/",
        snippet: "Open-source TypeScript agent framework.",
        source: "VoltAgent",
        publishedDate: "2026-06-01",
      },
      {
        title: "Fallback title field",
        link: "https://example.com/result",
        snippet: "Snippet fallback.",
        source: "Bocha Web Search",
        publishedDate: null,
      },
    ]);
  });

  it("uses the Bocha web search endpoint by default", async () => {
    process.env.BOCHA_SEARCH_API_KEY = "test-key";
    Reflect.deleteProperty(process.env, "BOCHA_SEARCH_API_URL");

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            webPages: {
              value: [
                {
                  name: "Bocha result",
                  url: "https://example.com/result",
                  summary: "Result summary.",
                },
              ],
            },
          },
        }),
        { status: 200 },
      ),
    );

    expect(bochaSearchTool.execute).toBeDefined();
    await bochaSearchTool.execute?.({ query: "agent search", count: 1 });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.bochaai.com/v1/web-search",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });
});
