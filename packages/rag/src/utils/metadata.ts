import type { ChunkMetadataInput } from "../types";

type BuildMetadataParams = {
  format: string;
  sourceType: string;
  base?: ChunkMetadataInput;
  path?: string[];
  extra?: Record<string, unknown>;
};

/**
 * Normalizes metadata across chunkers by adding common identifiers.
 * - format: logical formatter (markdown, code, json, html, text, etc.)
 * - sourceType: fine-grained chunk origin (e.g., sentence, token, code)
 * - path: hierarchical location if available (heading path, code path, json path, etc.)
 * - base: docId/sourceId/baseMetadata propagated from callers (core fields are not overridden by baseMetadata)
 * - extra: chunker-specific details (blockKind, tokenStart, etc.)
 */
export function buildMetadata(params: BuildMetadataParams): Record<string, unknown> {
  const meta: Record<string, unknown> = {
    format: params.format,
    sourceType: params.sourceType,
  };

  if (params.path && params.path.length > 0) {
    meta.path = params.path;
  }

  if (params.base?.docId && meta.docId === undefined) meta.docId = params.base.docId;
  if (params.base?.sourceId && meta.sourceId === undefined) meta.sourceId = params.base.sourceId;

  // baseMetadata can add custom fields but should not override core identifiers
  Object.entries(params.base?.baseMetadata ?? {}).forEach(([key, value]) => {
    if (meta[key] === undefined) {
      meta[key] = value;
    }
  });

  Object.assign(meta, params.extra ?? {});

  return meta;
}
