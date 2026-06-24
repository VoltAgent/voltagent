const DEFAULT_RESULT_COUNT = 5;
const MAX_RESULT_COUNT = 10;

export type BochaSearchInput = {
  query: string;
  count?: number;
  freshness?: string;
  includeDomains?: string[];
  excludeDomains?: string[];
};

export type BochaSearchResult = {
  title: string;
  link: string;
  snippet: string;
  source: string;
  publishedDate: string | null;
};

type BochaWebPage = {
  name?: unknown;
  title?: unknown;
  url?: unknown;
  displayUrl?: unknown;
  summary?: unknown;
  snippet?: unknown;
  description?: unknown;
  siteName?: unknown;
  datePublished?: unknown;
  dateLastCrawled?: unknown;
};

export type BochaSearchResponse = {
  data?: {
    webPages?: {
      value?: BochaWebPage[];
    };
  };
  webPages?: {
    value?: BochaWebPage[];
  };
};

export type BochaSearchRequest = {
  query: string;
  freshness: string;
  summary: boolean;
  count: number;
  include?: string;
  exclude?: string;
};

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function domainsToPipeList(domains: string[] | undefined): string | undefined {
  const cleaned = domains?.map((domain) => domain.trim()).filter(Boolean);
  return cleaned && cleaned.length > 0 ? cleaned.join("|") : undefined;
}

export function buildBochaSearchRequest(input: BochaSearchInput): BochaSearchRequest {
  const count = Math.min(input.count ?? DEFAULT_RESULT_COUNT, MAX_RESULT_COUNT);
  const request: BochaSearchRequest = {
    query: input.query,
    freshness: input.freshness ?? "noLimit",
    summary: true,
    count,
  };

  const include = domainsToPipeList(input.includeDomains);
  const exclude = domainsToPipeList(input.excludeDomains);

  if (include) {
    request.include = include;
  }
  if (exclude) {
    request.exclude = exclude;
  }

  return request;
}

export function mapBochaSearchResponse(response: BochaSearchResponse): BochaSearchResult[] {
  const pages = response.data?.webPages?.value ?? response.webPages?.value ?? [];

  return pages.map((page) => ({
    title: stringValue(page.name) ?? stringValue(page.title) ?? "Untitled result",
    link: stringValue(page.url) ?? stringValue(page.displayUrl) ?? "",
    snippet:
      stringValue(page.summary) ??
      stringValue(page.snippet) ??
      stringValue(page.description) ??
      "No snippet available.",
    source: stringValue(page.siteName) ?? "Bocha Web Search",
    publishedDate: stringValue(page.datePublished) ?? stringValue(page.dateLastCrawled) ?? null,
  }));
}
