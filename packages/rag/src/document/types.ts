export type Link = {
  nodeId: string;
  type: "document" | "section" | "chunk";
  metadata?: Record<string, unknown>;
};

export type DocNode = {
  id: string;
  text: string;
  metadata?: Record<string, unknown>;
  links?: Link[];
};

export type ExtractOptions = {
  summary?: boolean;
  title?: boolean;
  keywords?: boolean;
  questions?: boolean;
};

export type ChunkStrategy =
  | "markdown"
  | "html"
  | "json"
  | "latex"
  | "recursive"
  | "sentence"
  | "token"
  | "table"
  | "code"
  | "auto";
