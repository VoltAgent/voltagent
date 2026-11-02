import type { Chunk, ChunkMetadataInput, Chunker, Tokenizer } from "../types";
import { buildMetadata } from "../utils/metadata";
import { buildLineMap, positionForRange } from "../utils/position";
import { defaultTokenizer } from "../utils/tokenizer";
import { RecursiveChunker } from "./recursive-chunker";

export type LatexChunkerOptions = {
  maxTokens?: number;
  tokenizer?: Tokenizer;
  label?: string;
} & ChunkMetadataInput;

type LatexSection = {
  heading: string | null;
  content: string;
  start: number;
  kind: "section" | "subsection" | "subsubsection" | "none";
};

/**
 * Split section commands from their trimmed bodies, retaining each body's
 * start offset in the original input and its preceding heading metadata.
 */
function splitLatex(text: string): LatexSection[] {
  const regex = /\\(section|subsection|subsubsection)\*?\{([^}]*)\}/g;
  const sections: LatexSection[] = [];
  let lastIndex = 0;
  let currentHeading: string | null = null;
  let currentKind: LatexSection["kind"] = "none";
  for (let match = regex.exec(text); match !== null; match = regex.exec(text)) {
    const start = match.index;
    const content = text.slice(lastIndex, start).trim();
    if (content) {
      sections.push({
        heading: currentHeading,
        content,
        start: lastIndex + text.slice(lastIndex, start).indexOf(content),
        kind: currentKind,
      });
    }
    currentHeading = match[2]?.trim() ?? null;
    currentKind = (match[1] as LatexSection["kind"]) ?? "none";
    lastIndex = regex.lastIndex;
  }

  const tail = text.slice(lastIndex).trim();
  if (tail) {
    sections.push({
      heading: currentHeading,
      content: tail,
      start: lastIndex + text.slice(lastIndex).indexOf(tail),
      kind: currentKind,
    });
  }

  return sections.filter((s) => s.content.length > 0 || s.heading);
}

export class LatexChunker implements Chunker<LatexChunkerOptions> {
  private readonly tokenizer: Tokenizer;
  private readonly recursiveChunker: RecursiveChunker;

  constructor(tokenizer: Tokenizer = defaultTokenizer) {
    this.tokenizer = tokenizer;
    this.recursiveChunker = new RecursiveChunker(tokenizer);
  }

  /**
   * Recursively chunk LaTeX section bodies, excluding section commands.
   * Child ranges and position metadata are rebased to the supplied document;
   * token-fallback range accuracy still depends on the selected tokenizer.
   *
   * @param text Original LaTeX document, including any preamble.
   * @param options Token budget, tokenizer and document metadata overrides.
   * @returns Body chunks with section headings and original-document offsets.
   */
  chunk(text: string, options?: LatexChunkerOptions): Chunk[] {
    const tokenizer = options?.tokenizer ?? this.tokenizer;
    const maxTokens = Math.max(1, options?.maxTokens ?? 300);
    const label = options?.label ?? "latex";
    const lineMap = buildLineMap(text);

    const sections = splitLatex(text);
    const chunks: Chunk[] = [];

    sections.forEach((section, idx) => {
      const body = section.content || "";
      const sectionChunks = this.recursiveChunker.chunk(body, {
        maxTokens,
        tokenizer,
        label: `${label}-section`,
        docId: options?.docId,
        sourceId: options?.sourceId,
        baseMetadata: options?.baseMetadata,
      });
      sectionChunks.forEach((chunk, cidx) => {
        const start = section.start + chunk.start;
        const end = section.start + chunk.end;
        chunks.push({
          ...chunk,
          id: `${label}-${idx}-${cidx}`,
          start,
          end,
          metadata: buildMetadata({
            format: "latex",
            sourceType: "latex",
            base: options,
            path: section.heading ? [section.heading] : undefined,
            extra: {
              ...chunk.metadata,
              ...positionForRange(start, end, lineMap),
              heading: section.heading,
              sectionType: section.kind,
            },
          }),
          label,
        });
      });
    });

    return chunks;
  }
}
