import { Component, type ReactNode, Suspense, lazy, useState } from "react";
import { jsonInput } from "../lib/api";

const Monaco = lazy(() => import("./monaco-json"));

class EditorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function JsonEditor({
  value,
  onChange,
  label,
  schema,
}: { value: string; onChange: (value: string) => void; label: string; schema?: object }) {
  const [plain, setPlain] = useState(false);
  const [error, setError] = useState<string>();
  const textarea = (
    <textarea
      aria-label={label}
      className="json-input"
      rows={9}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
  return (
    <div className="json-editor">
      <div className="json-editor-tools">
        <button
          type="button"
          onClick={() => {
            try {
              onChange(jsonInput(JSON.parse(value)));
              setError(undefined);
            } catch {
              setError("Fix JSON syntax before formatting.");
            }
          }}
        >
          Format JSON
        </button>
        <button type="button" onClick={() => setPlain(!plain)}>
          {plain ? "Code editor" : "Plain text"}
        </button>
      </div>
      {plain ? (
        textarea
      ) : (
        <EditorBoundary fallback={textarea}>
          <Suspense fallback={textarea}>
            <Monaco value={value} onChange={onChange} label={label} schema={schema} />
          </Suspense>
        </EditorBoundary>
      )}
      {error && <small className="error">{error}</small>}
    </div>
  );
}
