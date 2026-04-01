import ts from "typescript";

export type CodeBlock = {
  kind: "function" | "class" | "method";
  name?: string;
  start: number;
  end: number;
  /**
   * Hierarchical path of enclosing blocks, e.g., ["MyClass", "methodName"].
   */
  path?: string[];
};

/**
 * Parse JS/TS code and extract high-level blocks (functions/classes/methods).
 * Returns empty array on parse errors.
 */
export function extractCodeBlocks(source: string): CodeBlock[] {
  try {
    const file = ts.createSourceFile(
      "temp.ts",
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const blocks: CodeBlock[] = [];

    const visit = (node: ts.Node, stack: string[] = []) => {
      let currentStack = stack;
      if (
        ts.isFunctionDeclaration(node) ||
        ts.isFunctionExpression(node) ||
        ts.isArrowFunction(node)
      ) {
        const name = (node as ts.FunctionLikeDeclarationBase).name?.getText(file);
        const path = name ? [...stack, name] : [...stack];
        blocks.push({
          kind: "function",
          name,
          start: node.getStart(file),
          end: node.getEnd(),
          path,
        });
        currentStack = path;
      } else if (ts.isClassDeclaration(node)) {
        const name = node.name?.getText(file);
        const path = name ? [...stack, name] : [...stack];
        blocks.push({
          kind: "class",
          name,
          start: node.getStart(file),
          end: node.getEnd(),
          path,
        });
        currentStack = path;
        node.members.forEach((member) => {
          if (ts.isMethodDeclaration(member) || ts.isConstructorDeclaration(member)) {
            const methodName = member.name?.getText(file);
            const methodPath = methodName ? [...path, methodName] : [...path];
            blocks.push({
              kind: "method",
              name: methodName,
              start: member.getStart(file),
              end: member.getEnd(),
              path: methodPath,
            });
          }
        });
      }
      ts.forEachChild(node, (child) => visit(child, currentStack));
    };

    visit(file);

    // Deduplicate and sort
    const unique = new Map<string, CodeBlock>();
    blocks.forEach((b) => unique.set(`${b.start}-${b.end}`, b));
    return Array.from(unique.values()).sort((a, b) => a.start - b.start);
  } catch {
    return [];
  }
}
