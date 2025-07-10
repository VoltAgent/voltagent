/**
 * A fake search client for the search tool.
 */
export class SearchClient {
  async search(query: string) {
    return [
      {
        title: `Information about "${query}"`,
        snippet: `This is the first search result about "${query}". It contains some relevant information that might be useful.`,
        url: "https://example.com/result1",
      },
      {
        title: `More details on "${query}"`,
        snippet: `Another search result with additional details about "${query}". This source discusses related topics and provides deeper insights.`,
        url: "https://example.org/result2",
      },
      {
        title: `"${query}" explained`,
        snippet: `An explanation of "${query}" with examples and illustrations to help understand the concept better.`,
        url: "https://knowledge.com/result3",
      },
    ];
  }
}
