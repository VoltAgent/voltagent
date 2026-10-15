import { useState } from "react";
import { parseObject, pretty } from "../lib/api";
import type { JsonSchema } from "../lib/schema";
import { SchemaEditor } from "./schema-editor";

const providers: Record<string, JsonSchema> = {
  openai: {
    type: "object",
    properties: {
      reasoningEffort: {
        type: "string",
        enum: ["none", "minimal", "low", "medium", "high", "xhigh"],
        description: "Supported values depend on the selected model.",
      },
      parallelToolCalls: { type: "boolean", default: true },
      store: { type: "boolean", default: false },
      textVerbosity: { type: "string", enum: ["low", "medium", "high"] },
    },
  },
  anthropic: {
    type: "object",
    properties: {
      disableParallelToolUse: { type: "boolean", default: false },
      effort: { type: "string", enum: ["low", "medium", "high", "xhigh", "max"] },
    },
  },
  google: {
    type: "object",
    properties: {
      cachedContent: { type: "string", description: "Name of a cached content resource." },
    },
  },
};

export function ProviderOptions({
  value,
  onChange,
}: { value: string; onChange: (value: string) => void }) {
  const [provider, setProvider] = useState("openai");
  let object: Record<string, unknown> | undefined;
  try {
    object = parseObject(value, "Provider options");
  } catch {
    /* Keep invalid raw input editable. */
  }
  return (
    <details>
      <summary>Provider options</summary>
      <p className="muted">
        Include only the overrides you need. Model support varies; additional options remain
        available in JSON.
      </p>
      <label className="field">
        <span>Provider</span>
        <select value={provider} onChange={(event) => setProvider(event.target.value)}>
          {Object.keys(providers).map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
      </label>
      {object && (
        <SchemaEditor
          key={provider}
          allowJson={false}
          schema={providers[provider]}
          value={pretty(object[provider] ?? {})}
          label={`${provider} options`}
          onChange={(next) => {
            try {
              onChange(pretty({ ...object, [provider]: JSON.parse(next) }));
            } catch {
              /* Full JSON editor below accepts arbitrary drafts. */
            }
          }}
        />
      )}
      <label className="field">
        <span>All provider options · JSON</span>
        <textarea rows={4} value={value} onChange={(event) => onChange(event.target.value)} />
      </label>
    </details>
  );
}
