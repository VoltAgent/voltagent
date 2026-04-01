import type { Chunk, ChunkMetadataInput, Chunker, Tokenizer } from "../types";
import { defaultTokenizer } from "../utils/tokenizer";
import { MarkdownChunker } from "./markdown-chunker";
import { SemanticChunker, type SemanticChunkerOptions } from "./semantic-chunker";

export type SemanticMarkdownChunkerOptions = SemanticChunkerOptions &
  ChunkMetadataInput & {
    label?: string;
  };

export class SemanticMarkdownChunker implements Chunker<SemanticMarkdownChunkerOptions> {
  private readonly tokenizer: Tokenizer;
  private readonly markdownChunker: MarkdownChunker;
  private readonly semanticChunker: SemanticChunker;

  constructor(tokenizer: Tokenizer = defaultTokenizer) {
    this.tokenizer = tokenizer;
    this.markdownChunker = new MarkdownChunker(tokenizer);
    this.semanticChunker = new SemanticChunker(tokenizer);
  }

  async chunk(text: string, options?: SemanticMarkdownChunkerOptions): Promise<Chunk[]> {
    const opts = options ?? ({} as SemanticMarkdownChunkerOptions);
    if (!opts.embedder) {
      throw new Error("SemanticMarkdownChunker requires an embedder");
    }

    const label = opts.label ?? "semantic-markdown";
    const mdChunks = this.markdownChunker.chunk(text, {
      maxTokens: opts.maxTokens,
      tokenizer: opts.tokenizer ?? this.tokenizer,
      label,
      docId: opts.docId,
      sourceId: opts.sourceId,
      baseMetadata: opts.baseMetadata,
    });

    const merged = await this.semanticChunker.chunk(
      mdChunks.map((c) => c.content).join("\n"),
      opts,
    );

    return merged.map((chunk, idx) => ({
      ...chunk,
      id: `${label}-${idx}`,
      metadata: {
        ...chunk.metadata,
        sourceType: "semantic-markdown",
        docId: opts.docId ?? chunk.metadata?.docId,
        sourceId: opts.sourceId ?? chunk.metadata?.sourceId,
      },
    }));
  }
}
