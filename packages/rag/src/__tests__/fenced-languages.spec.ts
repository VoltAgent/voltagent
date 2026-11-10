import { describe, expect, it } from "vitest";
import { CodeChunker, MarkdownChunker, getCodeParser, registerCodeParser } from "../index";

const code = "int value = 1;";

describe.each([
  { name: "CodeChunker", chunker: new CodeChunker(), expectedContent: `\n${code}\n` },
  { name: "MarkdownChunker", chunker: new MarkdownChunker(), expectedContent: code },
])("$name fenced languages", ({ chunker, expectedContent }) => {
  it.each(["c++", "c#", "shell-session"])("preserves the %s language label", (language) => {
    const text = [`\`\`\`${language}`, code, "```"].join("\n");
    const chunks = chunker.chunk(text, { maxTokens: 100 });

    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.metadata?.language).toBe(language);
    expect(chunks[0]?.metadata?.sourceType).toBe("code");
    expect(chunks[0]?.content).toBe(expectedContent);
  });

  it.each(["js", ""])("preserves existing behavior for language '%s'", (language) => {
    const text = [`\`\`\`${language}`, code, "```"].join("\n");
    const chunks = chunker.chunk(text, { maxTokens: 100 });

    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.metadata?.language).toBe(language || undefined);
    expect(chunks[0]?.metadata?.sourceType).toBe("code");
    expect(chunks[0]?.content).toBe(expectedContent);
  });
});

it("routes a C++ fence through the documented cpp parser alias", () => {
  let receivedSource: string | undefined;
  const parser = (source: string) => {
    receivedSource = source;
    return [];
  };
  registerCodeParser("cpp", parser);
  expect(getCodeParser("c++")).toBe(parser);

  const text = ["```c++", code, "```"].join("\n");
  new CodeChunker().chunk(text, { maxTokens: 100 });

  expect(receivedSource).toBe(`\n${code}\n`);
});
