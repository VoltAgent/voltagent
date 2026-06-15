import { describe, expect, it } from "vitest";
import { buildBochaSearchRequest, mapBochaSearchResponse } from "./bocha";

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
});
