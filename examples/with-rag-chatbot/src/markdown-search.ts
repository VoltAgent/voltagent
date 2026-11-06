import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export type Reference = { source: string; section: string };
export type SearchResult = Reference & { content: string; score: number };

const stopWords = new Set([
  "a",
  "an",
  "and",
  "are",
  "can",
  "do",
  "does",
  "for",
  "how",
  "in",
  "is",
  "of",
  "on",
  "the",
  "to",
  "what",
  "with",
]);

function terms(text: string): Set<string> {
  return new Set(
    (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((word) => !stopWords.has(word)),
  );
}

export function searchMarkdown(directory: string, query: string, limit = 3): SearchResult[] {
  const queryTerms = terms(query);
  if (queryTerms.size === 0) return [];

  const results: SearchResult[] = [];
  for (const filename of readdirSync(directory)
    .filter((name) => name.endsWith(".md"))
    .sort()) {
    const markdown = readFileSync(join(directory, filename), "utf8");
    const sections = markdown.split(/(?=^#{1,6}\s+)/m).filter((section) => section.trim());

    for (const section of sections) {
      const [heading = "", ...body] = section.trim().split("\n");
      const title = heading.replace(/^#{1,6}\s+/, "").trim() || filename;
      const content = body.join("\n").trim();
      if (!content) continue;

      const titleTerms = terms(title);
      const contentTerms = terms(content);
      const score = [...queryTerms].reduce(
        (total, term) => total + (titleTerms.has(term) ? 2 : 0) + (contentTerms.has(term) ? 1 : 0),
        0,
      );
      if (score > 0) {
        results.push({ source: `documents/${filename}`, section: title, content, score });
      }
    }
  }

  return results
    .sort((a, b) => b.score - a.score || a.source.localeCompare(b.source))
    .slice(0, limit);
}
