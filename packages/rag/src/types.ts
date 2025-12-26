export type Chunk = {
  id: string;
  content: string;
  start: number;
  end: number;
  metadata?: Record<string, unknown>;
  tokens?: number;
  label?: string;
  score?: number;
};

export type ChunkMetadataInput = {
  docId?: string;
  sourceId?: string;
  baseMetadata?: Record<string, unknown>;
};

export type Token = {
  value: string;
  start: number;
  end: number;
};

export type Tokenizer = {
  tokenize: (text: string) => Token[];
  countTokens: (text: string) => number;
};

export interface Chunker<TOptions = Record<string, unknown>> {
  chunk: (text: string, options?: TOptions) => Promise<Chunk[]> | Chunk[];
}
