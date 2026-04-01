import type { CodeBlock } from "./code-ast";

export type ParserFn = (source: string) => CodeBlock[];

const registry = new Map<string, ParserFn>();
const aliasMap = new Map<string, string>([
  ["js", "javascript"],
  ["ts", "typescript"],
  ["py", "python"],
  ["c++", "cpp"],
  ["c", "c"],
]);

export function registerCodeParser(language: string, parser: ParserFn): void {
  registry.set(language.toLowerCase(), parser);
}

export function getCodeParser(language?: string): ParserFn | undefined {
  if (!language) return undefined;
  const key = language.toLowerCase();
  const direct = registry.get(key);
  if (direct) return direct;
  const resolved = aliasMap.get(key) ?? key;
  return registry.get(resolved);
}

export function registerParserAlias(alias: string, targetLanguage: string): void {
  aliasMap.set(alias.toLowerCase(), targetLanguage.toLowerCase());
}
