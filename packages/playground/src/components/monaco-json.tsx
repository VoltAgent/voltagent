import Editor, { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import "monaco-editor/esm/vs/language/json/monaco.contribution";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import JsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import { useEffect, useId } from "react";

// Bundle workers locally. No CDN or source payload leaves the playground.
self.MonacoEnvironment = {
  getWorker: (_id, label) => (label === "json" ? new JsonWorker() : new EditorWorker()),
};
loader.config({ monaco });
const schemas = new Map<string, object>();
function updateSchemas() {
  monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
    validate: true,
    schemas: [...schemas].map(([uri, schema]) => ({
      uri: `${uri}.schema`,
      fileMatch: [uri],
      schema,
    })),
  });
}

export default function MonacoJson({
  value,
  onChange,
  label,
  schema,
}: { value: string; onChange: (value: string) => void; label: string; schema?: object }) {
  const id = useId();
  const path = `inmemory://playground/${encodeURIComponent(id)}.json`;
  useEffect(() => {
    if (schema) schemas.set(path, schema);
    else schemas.delete(path);
    updateSchemas();
    return () => {
      schemas.delete(path);
      updateSchemas();
    };
  }, [path, schema]);
  return (
    <Editor
      height="240px"
      path={path}
      language="json"
      theme="vs-dark"
      value={value}
      onChange={(next) => onChange(next ?? "")}
      options={{
        ariaLabel: label,
        minimap: { enabled: false },
        fontSize: 12,
        wordWrap: "on",
        scrollBeyondLastLine: false,
        automaticLayout: true,
        formatOnPaste: true,
        formatOnType: true,
        tabSize: 2,
        padding: { top: 10 },
        folding: true,
      }}
    />
  );
}
