import Parser from "tree-sitter";
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

export function createTreeSitterParser(language: Parser.Language | unknown): ParserFn {
  const parser = new Parser();
  parser.setLanguage(language as Parser.Language);

  const getNodeName = (node: any): string | undefined => {
    const direct =
      node.childForFieldName("name")?.text ??
      node.childForFieldName("property")?.text ??
      node.childForFieldName("property_identifier")?.text ??
      node.childForFieldName("identifier")?.text;
    if (direct) return direct;
    const firstNamed = node.namedChildren?.[0]?.text;
    return firstNamed;
  };

  return (source: string) => {
    const tree = parser.parse(source);
    const blocks: CodeBlock[] = [];
    const visit = (node: any, stack: string[] = []) => {
      if (!node) return;
      const type = node.type as string;
      const name = getNodeName(node);
      const path = name ? [...stack, name] : [...stack];
      const nextStack = path;
      if (
        type === "function_declaration" ||
        type === "generator_function" ||
        type === "arrow_function"
      ) {
        blocks.push({
          kind: "function",
          name,
          start: node.startIndex,
          end: node.endIndex,
          path,
        });
      } else if (type === "class_declaration") {
        blocks.push({
          kind: "class",
          name,
          start: node.startIndex,
          end: node.endIndex,
          path,
        });
      } else if (type === "method_definition") {
        const methodName = getNodeName(node);
        const methodPath = methodName ? [...stack, methodName] : [...stack];
        blocks.push({
          kind: "method",
          name: methodName,
          start: node.startIndex,
          end: node.endIndex,
          path: methodPath,
        });
      }
      for (const child of node.children ?? []) {
        visit(child, nextStack);
      }
    };
    visit(tree.rootNode);
    return blocks;
  };
}
