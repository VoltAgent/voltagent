import { safeStringify } from "@voltagent/internal";
import { useEffect, useState } from "react";
import { jsonInput } from "../lib/api";
import { type JsonSchema, schemaSample } from "../lib/schema";
import { JsonEditor } from "./json-editor";

function JsonField({
  value,
  onChange,
  onValidity,
  label,
}: {
  value: unknown;
  onChange: (value: unknown) => void;
  onValidity: (valid: boolean) => void;
  label: string;
}) {
  const serialized = jsonInput(value);
  const [text, setText] = useState(serialized);
  const [error, setError] = useState(false);
  useEffect(() => {
    setText(serialized);
    setError(false);
  }, [serialized]);
  return (
    <>
      <textarea
        aria-label={label}
        value={text}
        rows={4}
        onChange={(event) => {
          setText(event.target.value);
          try {
            const parsed = JSON.parse(event.target.value);
            onChange(parsed);
            setError(false);
            onValidity(true);
          } catch {
            setError(true);
            onValidity(false);
          }
        }}
      />
      {error && <small className="error">Enter valid JSON</small>}
    </>
  );
}

export function SchemaEditor({
  schema,
  value,
  onChange,
  onValidity,
  label = "Input",
  allowJson = true,
}: {
  schema?: JsonSchema;
  value: string;
  onChange: (value: string) => void;
  onValidity?: (valid: boolean) => void;
  label?: string;
  allowJson?: boolean;
}) {
  const [mode, setMode] = useState<"form" | "json">(schema?.properties ? "form" : "json");
  const [invalid, setInvalid] = useState<string[]>([]);
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    /* Raw JSON remains editable. */
  }
  const object =
    parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : undefined;
  const valid = parsed !== undefined && invalid.length === 0;
  useEffect(() => {
    onValidity?.(valid);
  }, [valid, onValidity]);
  const update = (key: string, next: unknown) =>
    onChange(safeStringify({ ...object, [key]: next }, { indentation: 2 }));
  return (
    <div className="schema-editor">
      <div className="editor-heading">
        <span>{label}</span>
        <div className="segmented">
          <button
            type="button"
            disabled={!schema?.properties}
            className={mode === "form" ? "active" : ""}
            onClick={() => setMode("form")}
          >
            Form
          </button>
          {allowJson && (
            <button
              type="button"
              className={mode === "json" ? "active" : ""}
              onClick={() => {
                setMode("json");
                setInvalid([]);
              }}
            >
              JSON
            </button>
          )}
        </div>
      </div>
      {mode === "json" || !schema?.properties || !object ? (
        <JsonEditor label={`${label} JSON`} schema={schema} value={value} onChange={onChange} />
      ) : (
        Object.entries(schema.properties).map(([key, field]) => {
          const required = schema.required?.includes(key);
          const present = Object.hasOwn(object, key);
          return (
            <div className="field" key={key}>
              <div className="form-field-heading">
                <span>
                  {field.title ?? key}
                  {required ? " *" : ""}
                </span>
                {!required && (
                  <label>
                    <input
                      type="checkbox"
                      aria-label={`Include ${key}`}
                      checked={present}
                      onChange={(event) => {
                        const next = { ...object };
                        if (event.target.checked) next[key] = schemaSample(field);
                        else delete next[key];
                        setInvalid((previous) => previous.filter((item) => item !== key));
                        onChange(safeStringify(next, { indentation: 2 }));
                      }}
                    />{" "}
                    Include
                  </label>
                )}
              </div>
              {(required || present) &&
                (field.enum ? (
                  <select
                    aria-label={key}
                    value={field.enum.findIndex((item) => item === object[key])}
                    onChange={(event) => update(key, field.enum?.[Number(event.target.value)])}
                  >
                    {!field.enum.includes(object[key]) && (
                      <option value={-1}>Custom value · {String(object[key])}</option>
                    )}
                    {field.enum.map((option, index) => (
                      <option key={String(option)} value={index}>
                        {String(option)}
                      </option>
                    ))}
                  </select>
                ) : field.type === "boolean" ? (
                  <select
                    aria-label={key}
                    value={String(object[key] ?? false)}
                    onChange={(event) => update(key, event.target.value === "true")}
                  >
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                ) : field.type === "string" ? (
                  <input
                    aria-label={key}
                    value={String(object[key] ?? "")}
                    onChange={(event) => update(key, event.target.value)}
                  />
                ) : field.type === "number" || field.type === "integer" ? (
                  <input
                    aria-label={key}
                    type="number"
                    step={field.type === "integer" ? 1 : "any"}
                    value={typeof object[key] === "number" ? object[key] : ""}
                    onChange={(event) => {
                      const number = event.target.valueAsNumber;
                      const valid =
                        Number.isFinite(number) &&
                        (field.type !== "integer" || Number.isInteger(number));
                      setInvalid((previous) =>
                        valid
                          ? previous.filter((item) => item !== key)
                          : [...new Set([...previous, key])],
                      );
                      if (valid) update(key, number);
                    }}
                  />
                ) : (
                  <JsonField
                    label={key}
                    value={fieldValue(object[key], field)}
                    onChange={(next) => update(key, next)}
                    onValidity={(valid) =>
                      setInvalid((previous) =>
                        valid
                          ? previous.filter((item) => item !== key)
                          : [...new Set([...previous, key])],
                      )
                    }
                  />
                ))}
              {field.description && <small>{field.description}</small>}
            </div>
          );
        })
      )}
      {parsed === undefined && <small className="error">Enter valid JSON to continue.</small>}
    </div>
  );
}

export function ContextEditor({
  value,
  onChange,
  onValidity,
}: { value: string; onChange: (value: string) => void; onValidity?: (valid: boolean) => void }) {
  const [key, setKey] = useState("");
  const [type, setType] = useState("string");
  let object: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) object = parsed;
  } catch {
    /* Editable in JSON mode. */
  }
  const properties = Object.fromEntries(
    Object.entries(object).map(([name, item]) => [
      name,
      { type: item === null ? "null" : Array.isArray(item) ? "array" : typeof item },
    ]),
  );
  return (
    <>
      <SchemaEditor
        schema={{ type: "object", properties }}
        value={value}
        onChange={onChange}
        label="Context"
        onValidity={onValidity}
      />
      <div className="context-add">
        <input
          aria-label="New context key"
          placeholder="New key"
          value={key}
          onChange={(event) => setKey(event.target.value)}
        />
        <select
          aria-label="Context value type"
          value={type}
          onChange={(event) => setType(event.target.value)}
        >
          {["string", "number", "boolean", "object", "array", "null"].map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <button
          type="button"
          disabled={!key.trim() || Object.hasOwn(object, key.trim())}
          onClick={() => {
            onChange(
              safeStringify(
                { ...object, [key.trim()]: schemaSample({ type }) },
                { indentation: 2 },
              ),
            );
            setKey("");
          }}
        >
          Add
        </button>
      </div>
    </>
  );
}

function fieldValue(value: unknown, schema: JsonSchema) {
  return value === undefined ? schemaSample(schema) : value;
}
