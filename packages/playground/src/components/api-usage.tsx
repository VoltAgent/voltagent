import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { Entity, EntityKind } from "../lib/api";
import { requestExamples } from "../lib/api-examples";
import { record } from "../lib/span-insights";
import { CopyValue, RecordedValue } from "./recorded-value";

export function ApiUsage({
  entity,
  kind,
  apiUrl,
}: { entity: Entity; kind: EntityKind; apiUrl: string }) {
  const [language, setLanguage] = useState<"curl" | "fetch" | "sdk">("curl");
  const [streaming, setStreaming] = useState(false);
  const [endpoint, setEndpoint] = useState("");
  const examples = requestExamples(entity, kind, apiUrl, streaming);
  const spec = useQuery({
    queryKey: ["openapi"],
    queryFn: async ({ signal }) => {
      const response = await fetch("/api/doc", { signal });
      if (!response.ok) throw new Error(`API schema unavailable (${response.status})`);
      return (await response.json()) as { paths?: Record<string, Record<string, unknown>> };
    },
    retry: false,
  });
  const endpoints = Object.entries(spec.data?.paths ?? {}).filter(
    ([path]) => path.startsWith(`/${kind}s/`) || path === `/${kind}s`,
  );
  const selected = endpoints.find(([path]) => path === endpoint);
  return (
    <section className="runner">
      <div className="panel-heading">
        <div>
          <small>API USAGE</small>
          <h2>{entity.name}</h2>
        </div>
      </div>
      <div className="utility-body">
        <p className="muted">
          Use this {kind} from your application. Examples use its registered ID and an example
          input; credentials and conversation data are not included.
        </p>
        <label className="check-field">
          <input
            type="checkbox"
            checked={streaming}
            onChange={(event) => setStreaming(event.target.checked)}
          />
          Streaming HTTP response
        </label>
        <code className="endpoint-path">POST {examples.path}</code>
        <div className="tabs">
          {(["curl", "fetch", "sdk"] as const).map((item) => (
            <button
              type="button"
              key={item}
              className={language === item ? "active" : ""}
              onClick={() => setLanguage(item)}
            >
              {item === "sdk" ? "Framework SDK" : item}
            </button>
          ))}
        </div>
        <CopyValue value={examples[language]} label="Copy example" />
        <pre className="usage-example">{examples[language]}</pre>
        {language === "sdk" && (
          <p className="muted">
            The framework SDK runs inside your project; it does not call the HTTP server.
          </p>
        )}
        <h3>Registered endpoints</h3>
        {spec.isPending && <p className="muted">Loading API schema…</p>}
        {spec.error && (
          <p className="notice">{spec.error.message}. The examples above remain available.</p>
        )}
        <label className="field">
          <span>Endpoint</span>
          <select value={endpoint} onChange={(event) => setEndpoint(event.target.value)}>
            <option value="">Select endpoint</option>
            {endpoints.map(([path]) => (
              <option key={path} value={path}>
                {path}
              </option>
            ))}
          </select>
        </label>
        {selected &&
          Object.entries(selected[1])
            .filter(([method]) => ["get", "post", "patch", "put", "delete"].includes(method))
            .map(([method, data]) => (
              <details className="ai-section" key={method} open>
                <summary>
                  {method.toUpperCase()} · {String(record(data)?.summary ?? selected[0])}
                </summary>
                <div className="ai-section-body">
                  <RecordedValue value={data} />
                </div>
              </details>
            ))}
      </div>
    </section>
  );
}
