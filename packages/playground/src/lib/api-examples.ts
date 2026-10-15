import { safeStringify } from "@voltagent/internal";
import type { Entity, EntityKind } from "./api";
import { schemaSample } from "./schema";

export function requestExamples(
  entity: Entity,
  kind: EntityKind,
  apiUrl: string,
  streaming: boolean,
) {
  const input =
    kind === "agent" ? "Hello!" : schemaSample(entity.inputSchema ?? { type: "object" });
  const path = `/${kind}s/${encodeURIComponent(entity.id)}/${kind === "agent" ? (streaming ? "stream" : "text") : streaming ? "stream" : "execute"}`;
  const body = safeStringify({ input }, { indentation: 2 });
  const url = `${apiUrl.replace(/\/$/, "")}${path}`;
  const quote = (value: string) => `'${value.replaceAll("'", `'"'"'`)}'`;
  return {
    path,
    curl: `curl${streaming ? " --no-buffer" : ""} ${quote(url)} \\\n  -H 'Content-Type: application/json' \\\n  --data ${quote(body)}`,
    fetch: `import { safeStringify } from "@voltagent/internal";\n\nconst response = await fetch(${safeStringify(url)}, {\n  method: "POST",\n  headers: { "Content-Type": "application/json" },\n  body: safeStringify(${body}),\n});\nif (!response.ok) throw new Error(await response.text());\n${streaming ? "// Raw SSE events. Consume the body as a stream.\nconst reader = response.body!.getReader();\nconst decoder = new TextDecoder();\nwhile (true) {\n  const { value, done } = await reader.read();\n  if (done) break;\n  console.log(decoder.decode(value, { stream: true }));\n}" : "const result = await response.json();\nconsole.log(result.data);"}`,
    sdk:
      kind === "agent"
        ? `// Use your configured Agent instance (${entity.id}).\nconst result = await agent.${streaming ? "streamText" : "generateText"}(${safeStringify(input)});\n${streaming ? "for await (const text of result.textStream) {\n  process.stdout.write(text);\n}" : "console.log(result.text);"}`
        : `// Use your configured workflow instance (${entity.id}).\nconst result = await workflow.run({ input: ${safeStringify(input, { indentation: 2 })} });\nconsole.log(result);`,
  };
}
