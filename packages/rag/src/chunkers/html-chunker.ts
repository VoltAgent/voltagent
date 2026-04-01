import type { Chunk, ChunkMetadataInput, Chunker, Tokenizer } from "../types";
import { buildMetadata } from "../utils/metadata";
import { defaultTokenizer } from "../utils/tokenizer";
import { RecursiveChunker } from "./recursive-chunker";

export type HtmlChunkerOptions = {
  maxTokens?: number;
  tokenizer?: Tokenizer;
  label?: string;
} & ChunkMetadataInput;

function normalizeHtml(html: string): string {
  // Replace block-level tags with newlines to preserve rough structure
  const blockTags = [
    "p",
    "div",
    "section",
    "article",
    "header",
    "footer",
    "main",
    "nav",
    "ul",
    "ol",
    "li",
    "table",
    "tr",
    "td",
    "th",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "br",
  ];
  const blockRegex = new RegExp(`</?(${blockTags.join("|")})[^>]*>`, "gi");
  const entityMap: Record<string, string> = {
    "&nbsp;": " ",
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
  };

  let text = html.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "");
  text = text.replace(blockRegex, "\n");
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<[^>]+>/g, "");
  // Decode common named entities
  Object.entries(entityMap).forEach(([k, v]) => {
    text = text.replace(new RegExp(k, "g"), v);
  });
  // Decode numeric entities
  text = text.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
  text = text.replace(/&#x([0-9a-fA-F]+);/g, (_, code) =>
    String.fromCharCode(Number.parseInt(code, 16)),
  );
  text = text.replace(/\s+\n/g, "\n").replace(/\n\s+/g, "\n");
  return text.trim();
}

export class HtmlChunker implements Chunker<HtmlChunkerOptions> {
  private readonly tokenizer: Tokenizer;
  private readonly recursiveChunker: RecursiveChunker;

  constructor(tokenizer: Tokenizer = defaultTokenizer) {
    this.tokenizer = tokenizer;
    this.recursiveChunker = new RecursiveChunker(tokenizer);
  }

  chunk(html: string, options?: HtmlChunkerOptions): Chunk[] {
    const tokenizer = options?.tokenizer ?? this.tokenizer;
    const maxTokens = Math.max(1, options?.maxTokens ?? 300);
    const label = options?.label ?? "html";

    const cleaned = normalizeHtml(html);
    if (!cleaned) return [];

    return this.recursiveChunker
      .chunk(cleaned, {
        maxTokens,
        tokenizer,
        label,
        docId: options?.docId,
        sourceId: options?.sourceId,
        baseMetadata: options?.baseMetadata,
      })
      .map((chunk, idx) => ({
        ...chunk,
        id: `${label}-${idx}`,
        metadata: buildMetadata({
          format: "html",
          sourceType: "html",
          base: options,
          extra: chunk.metadata as Record<string, unknown>,
        }),
      }));
  }
}
