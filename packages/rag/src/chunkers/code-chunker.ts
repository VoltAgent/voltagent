import type { Chunk, ChunkMetadataInput, Chunker, Tokenizer } from "../types";
import { type ParserFn, getCodeParser } from "../utils/code-parser-registry";
import { buildMetadata } from "../utils/metadata";
import { buildLineMap, offsetToLineCol } from "../utils/position";
import { defaultTokenizer } from "../utils/tokenizer";
import { RecursiveChunker } from "./recursive-chunker";
import { TokenChunker } from "./token-chunker";

export type CodeChunkerOptions = {
  maxTokens?: number;
  tokenizer?: Tokenizer;
  label?: string;
  parser?: ParserFn;
} & ChunkMetadataInput;

type Segment =
  | {
      type: "code";
      content: string;
      start: number;
      end: number;
      language?: string;
      fenceStart: number;
      fenceEnd: number;
    }
  | { type: "text"; content: string; start: number; end: number };

function splitCodeAndText(text: string): Segment[] {
  const segments: Segment[] = [];
  const codeFence = /```(\w+)?([\s\S]*?)```/g;
  let lastIndex = 0;

  for (let match = codeFence.exec(text); match !== null; match = codeFence.exec(text)) {
    const start = match.index;
    const end = match.index + match[0].length;
    const language = match[1]?.trim() || undefined;
    const body = match[2] ?? "";
    const codeStart = start + match[0].indexOf(body);
    const codeEnd = codeStart + body.length;

    if (start > lastIndex) {
      segments.push({
        type: "text",
        content: text.slice(lastIndex, start),
        start: lastIndex,
        end: start,
      });
    }

    segments.push({
      type: "code",
      content: body,
      start: codeStart,
      end: codeEnd,
      fenceStart: start,
      fenceEnd: end,
      language,
    });

    lastIndex = end;
  }

  if (lastIndex < text.length) {
    segments.push({
      type: "text",
      content: text.slice(lastIndex),
      start: lastIndex,
      end: text.length,
    });
  }

  return segments;
}

export class CodeChunker implements Chunker<CodeChunkerOptions> {
  private readonly tokenizer: Tokenizer;
  private readonly recursiveChunker: RecursiveChunker;
  private readonly tokenChunker: TokenChunker;

  constructor(tokenizer: Tokenizer = defaultTokenizer) {
    this.tokenizer = tokenizer;
    this.recursiveChunker = new RecursiveChunker(tokenizer);
    this.tokenChunker = new TokenChunker(tokenizer);
  }

  chunk(text: string, options?: CodeChunkerOptions): Chunk[] {
    const tokenizer = options?.tokenizer ?? this.tokenizer;
    const maxTokens = Math.max(1, options?.maxTokens ?? 400);
    const label = options?.label ?? "code";

    const segments = splitCodeAndText(text);
    const chunks: Chunk[] = [];
    const lineMap = buildLineMap(text);

    const positionMeta = (start: number, end: number) =>
      ({
        position: {
          start: offsetToLineCol(start, lineMap),
          end: offsetToLineCol(end, lineMap),
        },
      }) as const;
    const fencePositionMeta = (segment: Segment & { type: "code" }) =>
      positionMeta(segment.fenceStart, segment.fenceEnd);

    for (const segment of segments) {
      if (segment.type === "code") {
        const tokenCount = tokenizer.countTokens(segment.content);
        const parser =
          options?.parser ?? (segment.language ? getCodeParser(segment.language) : undefined);
        const astBlocks = parser ? parser(segment.content) : [];

        if (astBlocks.length > 0) {
          astBlocks.forEach((block) => {
            const blockText = segment.content.slice(block.start, block.end);
            const blockTokens = tokenizer.countTokens(blockText);
            if (blockTokens > maxTokens) {
              const tokenChunks = this.tokenChunker.chunk(blockText, {
                maxTokens,
                tokenizer,
                label: `${label}-ast`,
              });
              tokenChunks.forEach((chunk, idx) => {
                chunks.push({
                  ...chunk,
                  id: `${label}-${chunks.length + idx}`,
                  start: segment.start + block.start + chunk.start,
                  end: segment.start + block.start + chunk.end,
                  metadata: buildMetadata({
                    format: "code",
                    sourceType: "code",
                    base: options,
                    path: block.path,
                    extra: {
                      ...(chunk.metadata ?? {}),
                      type: "code",
                      language: segment.language,
                      blockKind: block.kind,
                      blockName: block.name,
                      blockPath: block.path,
                      blockParent: block.path?.slice(0, -1),
                      ...positionMeta(
                        segment.start + block.start + chunk.start,
                        segment.start + block.start + chunk.end,
                      ),
                      fencePosition: fencePositionMeta(segment).position,
                    },
                  }),
                  label,
                });
              });
            } else {
              chunks.push({
                id: `${label}-${chunks.length}`,
                content: blockText,
                start: segment.start + block.start,
                end: segment.start + block.end,
                tokens: blockTokens,
                label,
                metadata: buildMetadata({
                  format: "code",
                  sourceType: "code",
                  base: options,
                  path: block.path,
                  extra: {
                    ...(block as Record<string, unknown>),
                    type: "code",
                    language: segment.language,
                    blockKind: block.kind,
                    blockName: block.name,
                    blockPath: block.path,
                    blockParent: block.path?.slice(0, -1),
                    ...positionMeta(segment.start + block.start, segment.start + block.end),
                    fencePosition: fencePositionMeta(segment).position,
                  },
                }),
              });
            }
          });
        } else if (tokenCount <= maxTokens) {
          chunks.push({
            id: `${label}-${chunks.length}`,
            content: segment.content,
            start: segment.start,
            end: segment.end,
            tokens: tokenCount,
            label,
            metadata: buildMetadata({
              format: "code",
              sourceType: "code",
              base: options,
              extra: {
                type: "code",
                language: segment.language,
                ...positionMeta(segment.start, segment.end),
                fencePosition: fencePositionMeta(segment).position,
              },
            }),
          });
        } else {
          const splitCode = this.tokenChunker.chunk(segment.content, {
            maxTokens,
            tokenizer,
            label: `${label}-block`,
            docId: options?.docId,
            sourceId: options?.sourceId,
            baseMetadata: options?.baseMetadata,
          });
          chunks.push(
            ...splitCode.map((chunk, idx) => ({
              ...chunk,
              id: `${label}-${chunks.length + idx}`,
              metadata: buildMetadata({
                format: "code",
                sourceType: "code",
                base: options,
                extra: {
                  ...(chunk.metadata ?? {}),
                  type: "code",
                  language: segment.language,
                  fencePosition: fencePositionMeta(segment).position,
                },
              }),
            })),
          );
        }
      } else {
        const textChunks = this.recursiveChunker.chunk(segment.content, {
          maxTokens,
          tokenizer,
          label: `${label}-text`,
          docId: options?.docId,
          sourceId: options?.sourceId,
          baseMetadata: options?.baseMetadata,
        });
        chunks.push(
          ...textChunks.map((chunk, idx) => ({
            ...chunk,
            id: `${label}-${chunks.length + idx}`,
            start: segment.start + chunk.start,
            end: segment.start + chunk.end,
            metadata: buildMetadata({
              format: "code",
              sourceType: "text",
              base: options,
              extra: {
                ...(chunk.metadata ?? {}),
                ...positionMeta(segment.start + chunk.start, segment.start + chunk.end),
              },
            }),
          })),
        );
      }
    }

    return chunks;
  }
}
