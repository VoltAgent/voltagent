import { Check, Copy } from "lucide-react";
import { type ReactNode, useState } from "react";
import Markdown from "react-markdown";
import { pretty } from "../lib/api";
import { recordedAudioUrl, safeMediaUrl } from "../lib/recorded-media";
import { parseRecorded, record } from "../lib/span-insights";
import { SubagentOutputs } from "./subagent-output";

export function CopyValue({
  value,
  label = "Copy",
  iconOnly = false,
}: { value: unknown; label?: string; iconOnly?: boolean }) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");
  return (
    <button
      type="button"
      className="copy-value nodrag"
      aria-label={state === "copied" ? `${label}: copied` : label}
      title={state === "copied" ? "Copied" : state === "error" ? "Copy failed" : label}
      onClick={async (event) => {
        event.stopPropagation();
        try {
          await navigator.clipboard.writeText(pretty(value));
          setState("copied");
        } catch {
          setState("error");
        }
      }}
    >
      {state === "copied" ? <Check size={12} /> : <Copy size={12} />}
      {(!iconOnly || state === "error") &&
        (state === "copied" ? "Copied" : state === "error" ? "Copy failed" : label)}
    </button>
  );
}

export function DetailSection({
  title,
  value,
  children,
  open = false,
}: {
  title: string;
  value?: unknown;
  children: ReactNode;
  open?: boolean;
}) {
  return (
    <details className="ai-section" open={open}>
      <summary>{title}</summary>
      <div className="ai-section-body">
        {value !== undefined && <CopyValue value={value} label={`Copy ${title}`} iconOnly />}
        {children}
      </div>
    </details>
  );
}

function isSmallPayload(value: unknown): boolean {
  let remaining = 24;
  let characters = 4000;
  const visit = (item: unknown, depth: number): boolean => {
    if (--remaining < 0 || depth > 3) return false;
    if (typeof item === "string") characters -= item.length;
    if (characters < 0) return false;
    return (
      item === null ||
      typeof item !== "object" ||
      Object.values(item).every((child) => visit(child, depth + 1))
    );
  };
  return visit(value, 0);
}

function TreeEntry({
  name,
  value,
  depth = 0,
  expandSmall = false,
}: { name: string; value: unknown; depth?: number; expandSmall?: boolean }) {
  const parsed = parseRecorded(value);
  const entries = parsed !== null && typeof parsed === "object" ? Object.entries(parsed) : [];
  const [expanded, setExpanded] = useState(depth < 1 || (expandSmall && depth < 3));
  const [limit, setLimit] = useState(50);
  if (!entries.length || depth >= 24)
    return (
      <div className="json-leaf">
        <span>{name}</span>
        <code>{parsed === "" ? '""' : pretty(parsed)}</code>
      </div>
    );
  return (
    <div className="json-branch">
      <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
        <span>{expanded ? "▾" : "▸"}</span> {name}{" "}
        <small>{Array.isArray(parsed) ? `[${entries.length}]` : `{${entries.length}}`}</small>
      </button>
      {expanded && (
        <div className="json-children">
          {entries.slice(0, limit).map(([key, item]) => (
            <TreeEntry
              key={key}
              name={key}
              value={item}
              depth={depth + 1}
              expandSmall={expandSmall}
            />
          ))}
          {limit < entries.length && (
            <button type="button" onClick={() => setLimit(limit + 50)}>
              Show next {Math.min(50, entries.length - limit)} fields
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function JsonTree({
  value,
  expandSmall = false,
}: { value: unknown; expandSmall?: boolean }) {
  return (
    <div className="json-tree">
      <TreeEntry
        name="value"
        value={parseRecorded(value)}
        expandSmall={expandSmall && isSmallPayload(parseRecorded(value))}
      />
    </div>
  );
}

function AudioValue({ data }: { data: Record<string, unknown> }) {
  const format = String(data.format ?? "mpeg");
  const source = recordedAudioUrl(data);
  return (
    <div className="recorded-audio">
      <small>
        Audio · {format}
        {typeof data.bytes === "number" ? ` · ${data.bytes.toLocaleString()} bytes` : ""}
      </small>
      {source ? (
        <audio controls preload="none" src={source}>
          <track kind="captions" />
          Audio playback is unavailable.
        </audio>
      ) : (
        <p className="muted">
          {data.truncated
            ? "Audio omitted from this trace."
            : "No playable audio URL or encoded audio was recorded."}
        </p>
      )}
      <details>
        <summary>Audio metadata</summary>
        <JsonTree value={data} />
      </details>
    </div>
  );
}

/** AI SDK tool-result envelopes wrap their value; raw messages remain copyable. */
export function toolResultValue(value: unknown): unknown {
  const output = record(value);
  return output && ["json", "text"].includes(String(output.type)) && output.value !== undefined
    ? output.value
    : value;
}

export function MessagePart({ value }: { value: unknown }) {
  const part = record(value);
  if (!part) return <RecordedValue value={value} />;
  const type = String(part.type ?? "");
  if (type === "data-subagent-stream") return null;
  if (type === "text")
    return (
      <div className="markdown">
        <Markdown>{String(part.text ?? "")}</Markdown>
      </div>
    );
  if (type === "reasoning")
    return (
      <details className="recorded-reasoning">
        <summary>Reasoning</summary>
        <div className="markdown">
          <Markdown>{String(part.text ?? "")}</Markdown>
        </div>
      </details>
    );
  if (type === "step-start") return <div className="recorded-step">Next model step</div>;
  if (type === "audio") return <AudioValue data={part} />;
  if (type === "file" || type === "image") {
    const url = safeMediaUrl(part.url ?? part.image ?? part.data);
    const name = String(part.filename ?? part.mediaType ?? "Attachment");
    return (
      <div className="recorded-file">
        {url && (type === "image" || String(part.mediaType).startsWith("image/")) ? (
          <img src={url} alt={name} loading="lazy" />
        ) : null}
        {url ? (
          <a href={url} target="_blank" rel="noreferrer">
            {name} ↗
          </a>
        ) : (
          <JsonTree value={part} />
        )}
      </div>
    );
  }
  if (type.startsWith("tool-") || type === "dynamic-tool") {
    const name = part.toolName ?? type.replace(/^tool-/, "");
    return (
      <details className="recorded-tool" open>
        <summary>
          {String(name)} <span>{String(part.state ?? type)}</span>
        </summary>
        {part.input !== undefined && (
          <div>
            <small>Input</small>
            <RecordedValue value={part.input} expandSmall />
          </div>
        )}
        {part.output !== undefined && (
          <div>
            <small>Output</small>
            <RecordedValue
              value={type === "tool-result" ? toolResultValue(part.output) : part.output}
              expandSmall
            />
          </div>
        )}
        {part.errorText !== undefined && <p className="error">{String(part.errorText)}</p>}
        {part.toolCallId !== undefined && (
          <details className="recorded-tool-identity">
            <summary>Call ID</summary>
            <code className="recorded-call-id">{String(part.toolCallId)}</code>
          </details>
        )}
      </details>
    );
  }
  return <JsonTree value={part} />;
}

export function MessageList({
  messages,
  showIndex = true,
}: { messages: unknown[]; showIndex?: boolean }) {
  const [limit, setLimit] = useState(25);
  return (
    <div className="recorded-messages">
      {messages.slice(0, limit).map((value, index) => {
        const message = record(value);
        const content = message?.parts ?? message?.content;
        return (
          <article
            className={`recorded-message ${message?.role === "user" ? "user" : ""}`}
            key={String(message?.id ?? index)}
          >
            <header>
              <strong>{String(message?.role ?? "Message")}</strong>
              {showIndex && <span>#{index + 1}</span>}
              <CopyValue value={value} label="Copy message" />
            </header>
            {Array.isArray(content) ? (
              content.map((part, partIndex) => (
                <MessagePart
                  key={`${String(record(part)?.toolCallId ?? record(part)?.type)}-${partIndex}`}
                  value={part}
                />
              ))
            ) : (
              <RecordedValue value={content ?? value} messages={false} />
            )}
            {Array.isArray(content) && <SubagentOutputs parts={content} />}
          </article>
        );
      })}
      {limit < messages.length && (
        <button type="button" onClick={() => setLimit(limit + 25)}>
          Show more messages ({messages.length - limit} remaining)
        </button>
      )}
    </div>
  );
}

export function RecordedValue({
  value,
  messages = true,
  expandSmall = false,
}: { value: unknown; messages?: boolean; expandSmall?: boolean }) {
  const parsed = parseRecorded(value);
  if (parsed === undefined) return <p className="muted">Not recorded</p>;
  if (
    messages &&
    Array.isArray(parsed) &&
    parsed.length > 0 &&
    parsed.every((item) => typeof record(item)?.role === "string")
  )
    return <MessageList messages={parsed} />;
  const object = record(parsed);
  if (
    messages &&
    typeof object?.role === "string" &&
    (object.parts !== undefined || object.content !== undefined)
  )
    return <MessageList messages={[object]} />;
  if (object?.type === "audio") return <AudioValue data={object} />;
  if (typeof parsed === "string")
    return parsed ? (
      <div className="markdown">
        <Markdown>{parsed}</Markdown>
      </div>
    ) : (
      <code>Empty string</code>
    );
  return <JsonTree value={parsed} expandSmall={expandSmall} />;
}
