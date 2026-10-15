import { useQuery } from "@tanstack/react-query";
import { Play, Wrench } from "lucide-react";
import { useState } from "react";
import { type ToolInfo, api, jsonInput, parseObject, pretty } from "../lib/api";
import { type JsonSchema, schemaSample } from "../lib/schema";
import { ContextEditor, SchemaEditor } from "./schema-editor";

type RegisteredTool = ToolInfo & { agents?: Array<{ id: string; name?: string }> };
export function ToolRunner() {
  const tools = useQuery({
    queryKey: ["tools"],
    queryFn: () => api<RegisteredTool[]>("/tools"),
    refetchInterval: 5000,
  });
  const [selected, setSelected] = useState("");
  const tool = tools.data?.find((item) => item.name === selected) ?? tools.data?.[0];
  return (
    <section className="runner">
      <div className="panel-heading">
        <div>
          <small>LOCAL TOOLS</small>
          <h2>Test a tool</h2>
        </div>
        <Wrench size={20} />
      </div>
      <div className="utility-body">
        <label className="field">
          <span>Registered tool</span>
          <select
            aria-label="Registered tool"
            value={tool?.name ?? ""}
            onChange={(event) => setSelected(event.target.value)}
          >
            {tools.data?.map((item) => (
              <option key={item.name} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        {tools.error && <div className="error-box">{tools.error.message}</div>}
        {tools.isPending ? (
          <p className="muted">Loading tools…</p>
        ) : tool ? (
          <ToolTest key={tool.name} tool={tool} />
        ) : (
          <p className="muted">No tools registered.</p>
        )}
      </div>
    </section>
  );
}
function ToolTest({ tool }: { tool: RegisteredTool }) {
  const schema = tool.parameters as JsonSchema | undefined;
  const [input, setInput] = useState(jsonInput(schemaSample(schema)));
  const [context, setContext] = useState("{}");
  const [valid, setValid] = useState(true);
  const [contextValid, setContextValid] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ result: unknown; executionTime: number }>();
  const [error, setError] = useState<string>();
  const run = async () => {
    setBusy(true);
    setError(undefined);
    setResult(undefined);
    try {
      setResult(
        await api(`/tools/${encodeURIComponent(tool.name)}/execute`, {
          input: JSON.parse(input),
          context: parseObject(context, "Context"),
        }),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <p className="muted">{tool.description}</p>
      <p className="notice">
        Runs the registered server tool directly.{" "}
        {tool.agents?.length
          ? `Registered by ${tool.agents.map((agent) => agent.name ?? agent.id).join(", ")}.`
          : ""}
        {(tool.agents?.length ?? 0) > 1
          ? " Shared names use the first registered implementation."
          : ""}
      </p>
      <fieldset disabled={busy} className="plain-fieldset">
        <SchemaEditor schema={schema} value={input} onChange={setInput} onValidity={setValid} />
        <details>
          <summary>Execution context</summary>
          <ContextEditor value={context} onChange={setContext} onValidity={setContextValid} />
        </details>
        <button
          type="button"
          className="primary"
          disabled={!valid || !contextValid || busy}
          onClick={() => void run()}
        >
          <Play size={14} /> {busy ? "Running…" : "Execute tool"}
        </button>
      </fieldset>
      {error && <div className="error-box">{error}</div>}
      {result && (
        <div className="tool-result">
          <h3>
            Result <small>{result.executionTime} ms</small>
          </h3>
          <pre>{pretty(result.result)}</pre>
        </div>
      )}
    </>
  );
}
