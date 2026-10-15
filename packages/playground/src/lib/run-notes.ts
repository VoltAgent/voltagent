import { type Trace, pretty } from "./api";
import { spanIO } from "./span-details";
import { parseRecorded, record } from "./span-insights";
import { traceRoot } from "./trace-presentation";

export type RunNote = { name: string; pinned: boolean };
export type RunNotes = Record<string, RunNote>;

export function runOutcomePreview(trace: Trace): string | undefined {
  const root = traceRoot(trace);
  if (!root) return;
  const output = parseRecorded(spanIO(root).output);
  if (output === undefined || output === null) return;
  const object = record(output);
  const value = object?.decision ?? object?.summary ?? object?.text ?? object?.result ?? output;
  const text = pretty(value).replace(/\s+/g, " ").trim();
  if (!text || text === "{}" || text === "[]") return;
  return text.length > 90 ? `${text.slice(0, 89)}…` : text;
}
