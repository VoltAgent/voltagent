import { Settings2 } from "lucide-react";
import { useEffect, useState } from "react";
import { type Entity, parseObject } from "../lib/api";
import { ProviderOptions } from "./provider-options";
import { ContextEditor } from "./schema-editor";

export interface CallSettings {
  userId: string;
  conversationId: string;
  model: string;
  instructions: string;
  temperature: string;
  maxSteps: string;
  maxOutputTokens: string;
  context: string;
  providerOptions: string;
  resumableStream: string;
}
export function initialSettings(): CallSettings {
  return {
    userId: "playground",
    conversationId: crypto.randomUUID(),
    model: "",
    instructions: "",
    temperature: "",
    maxSteps: "",
    maxOutputTokens: "",
    context: "{}",
    providerOptions: "{}",
    resumableStream: "off",
  };
}
export function callOptions(settings: CallSettings) {
  const temperature = settings.temperature ? Number(settings.temperature) : undefined;
  const maxOutputTokens = settings.maxOutputTokens ? Number(settings.maxOutputTokens) : undefined;
  if (maxOutputTokens !== undefined && (!Number.isInteger(maxOutputTokens) || maxOutputTokens < 1))
    throw new Error("Max output tokens must be a positive integer");
  const maxSteps = settings.maxSteps ? Number(settings.maxSteps) : undefined;
  if (temperature !== undefined && !Number.isFinite(temperature))
    throw new Error("Temperature must be a number");
  if (maxSteps !== undefined && (!Number.isInteger(maxSteps) || maxSteps < 1))
    throw new Error("Max steps must be a positive integer");
  return {
    ...(settings.model ? { model: settings.model } : {}),
    ...(settings.instructions ? { instructions: settings.instructions } : {}),
    ...(temperature === undefined ? {} : { temperature }),
    ...(maxOutputTokens === undefined ? {} : { maxOutputTokens }),
    ...(maxSteps === undefined ? {} : { maxSteps }),
    providerOptions: parseObject(settings.providerOptions, "Provider options"),
    voltagent: {
      userId: settings.userId || undefined,
      conversationId: settings.conversationId || undefined,
      resumableStream: settings.resumableStream === "on",
      context: parseObject(settings.context, "Context"),
    },
  };
}

export function Settings({
  settings,
  onChange,
  workflow = false,
  isolated = false,
  disabled = false,
  onValidity,
  entity,
  openRequest = 0,
}: {
  entity?: Entity;
  openRequest?: number;
  settings: CallSettings;
  onChange: (settings: CallSettings) => void;
  workflow?: boolean;
  isolated?: boolean;
  disabled?: boolean;
  onValidity?: (valid: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (openRequest > 0) setOpen(true);
  }, [openRequest]);
  const field = (name: keyof CallSettings, label: string, multiline = false, placeholder = "") => (
    <label className="field" key={name}>
      <span>{label}</span>
      {multiline ? (
        <textarea
          rows={3}
          value={settings[name]}
          placeholder={placeholder}
          onChange={(event) => onChange({ ...settings, [name]: event.target.value })}
        />
      ) : (
        <input
          value={settings[name]}
          placeholder={placeholder}
          onChange={(event) => onChange({ ...settings, [name]: event.target.value })}
        />
      )}
    </label>
  );
  return (
    <div className="settings">
      <button type="button" className="settings-toggle" onClick={() => setOpen(!open)}>
        <Settings2 size={14} />
        Run settings <span>{open ? "−" : "+"}</span>
      </button>
      <fieldset className="settings-fields" hidden={!open} disabled={disabled}>
        <p>
          Overrides apply to the next request. Empty fields use the agent’s configured defaults.
          Preferences stay in this browser.
        </p>
        {!workflow && (
          <p className="notice">
            Model: {settings.model || entity?.model || "agent default"}
            {settings.model ? " (override)" : " (agent configuration)"}. Max steps:{" "}
            {settings.maxSteps || "agent default"}. Actual per-call values are available under Run
            actions → Recorded effective settings after a run.
          </p>
        )}
        {!isolated && <IdentityFields settings={settings} onChange={onChange} />}
        {!workflow && (
          <>
            {field("model", "Model override", false, "Use agent model")}
            {field("instructions", "Instructions override", true, "Use agent instructions")}
            <div className="field-row">
              {field("temperature", "Temperature", false, "Agent default")}
              {field("maxSteps", "Max steps", false, "Agent default")}
            </div>
            {field("maxOutputTokens", "Max output tokens", false, "Agent default")}
            <ProviderOptions
              value={settings.providerOptions}
              onChange={(providerOptions) => onChange({ ...settings, providerOptions })}
            />
          </>
        )}
        <ContextEditor
          value={settings.context}
          onValidity={onValidity}
          onChange={(context) => onChange({ ...settings, context })}
        />
        {!workflow && (
          <label className="check-field">
            <input
              type="checkbox"
              checked={settings.resumableStream === "on"}
              onChange={(event) =>
                onChange({ ...settings, resumableStream: event.target.checked ? "on" : "off" })
              }
            />
            Reconnect streams (requires server adapter)
          </label>
        )}
      </fieldset>
    </div>
  );
}

function IdentityFields({
  settings,
  onChange,
}: { settings: CallSettings; onChange: (settings: CallSettings) => void }) {
  const [userId, setUserId] = useState(settings.userId);
  const [conversationId, setConversationId] = useState(settings.conversationId);
  useEffect(() => {
    setUserId(settings.userId);
    setConversationId(settings.conversationId);
  }, [settings.userId, settings.conversationId]);
  const changed = userId !== settings.userId || conversationId !== settings.conversationId;
  return (
    <>
      <label className="field">
        <span>User ID</span>
        <input value={userId} onChange={(event) => setUserId(event.target.value)} />
      </label>
      <label className="field">
        <span>Conversation ID</span>
        <input value={conversationId} onChange={(event) => setConversationId(event.target.value)} />
      </label>
      {changed && (
        <button type="button" onClick={() => onChange({ ...settings, userId, conversationId })}>
          Apply conversation IDs
        </button>
      )}
    </>
  );
}
