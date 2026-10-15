import { useQuery } from "@tanstack/react-query";
import { ArrowUp, FileText, Folder, RefreshCw } from "lucide-react";
import { useState } from "react";
import Markdown from "react-markdown";
import { type Entity, type Trace, api, pretty } from "../lib/api";
import { parseRecorded, record } from "../lib/span-insights";
import { formatDuration } from "../lib/trace-presentation";
import { workspaceEventCategory as eventBucket } from "../lib/workspace-events";
import { RecordedValue } from "./recorded-value";

interface WorkspaceInfo {
  id: string;
  name?: string;
  scope?: string;
  capabilities: { filesystem: boolean; skills: boolean; search: boolean; sandbox: boolean };
}
interface FileEntry {
  path: string;
  is_dir: boolean;
  size?: number;
}
interface Skill {
  id: string;
  name: string;
  description?: string;
  active?: boolean;
  tags?: string[];
  instructions?: string;
  references?: string[];
  scripts?: string[];
  assets?: string[];
}
export function WorkspaceExplorer({ entity, trace }: { entity: Entity; trace?: Trace }) {
  const [tab, setTab] = useState("files");
  const [path, setPath] = useState("/");
  const [file, setFile] = useState("");
  const [skillId, setSkillId] = useState("");
  const [skillSearch, setSkillSearch] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);
  const [tag, setTag] = useState("");
  const [bucket, setBucket] = useState("all");
  const base = `/agents/${encodeURIComponent(entity.id)}/workspace`;
  const info = useQuery({
    queryKey: ["workspace", entity.id],
    queryFn: () => api<WorkspaceInfo>(base),
    retry: false,
  });
  const files = useQuery({
    queryKey: ["workspace-files", entity.id, path],
    queryFn: () => api<{ entries: FileEntry[] }>(`${base}/ls?path=${encodeURIComponent(path)}`),
    enabled: Boolean(info.data?.capabilities.filesystem) && tab === "files",
  });
  const content = useQuery({
    queryKey: ["workspace-file", entity.id, file],
    queryFn: () => api<{ content: string }>(`${base}/read?path=${encodeURIComponent(file)}`),
    enabled: Boolean(file && info.data?.capabilities.filesystem) && tab === "files",
  });
  const skills = useQuery({
    queryKey: ["workspace-skills", entity.id],
    queryFn: () => api<{ skills: Skill[] }>(`${base}/skills?refresh=true`),
    enabled: Boolean(info.data?.capabilities.skills) && tab === "skills",
  });
  const skill = useQuery({
    queryKey: ["workspace-skill", entity.id, skillId],
    queryFn: () => api<Skill>(`${base}/skills/${encodeURIComponent(skillId)}`),
    enabled: Boolean(skillId && info.data?.capabilities.skills) && tab === "skills",
  });
  const events =
    trace?.spans.filter((span) =>
      Object.keys(span.attributes).some((key) => key.startsWith("workspace.")),
    ) ?? [];
  const skillTags = [...new Set(skills.data?.skills.flatMap((item) => item.tags ?? []) ?? [])];
  const filteredSkills = skills.data?.skills.filter(
    (item) =>
      (!activeOnly || item.active) &&
      (!tag || item.tags?.includes(tag)) &&
      `${item.name} ${item.description ?? ""} ${item.tags?.join(" ") ?? ""}`
        .toLowerCase()
        .includes(skillSearch.toLowerCase()),
  );
  const error =
    info.error ??
    (tab === "files"
      ? (files.error ?? content.error)
      : tab === "skills"
        ? (skills.error ?? skill.error)
        : undefined);
  return (
    <section className="runner">
      <div className="panel-heading">
        <div>
          <small>AGENT WORKSPACE</small>
          <h2>{info.data?.name ?? "Workspace explorer"}</h2>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="Refresh workspace"
          onClick={() => {
            void info.refetch();
            if (tab === "files") {
              void files.refetch();
              if (file) void content.refetch();
            }
            if (tab === "skills") {
              void skills.refetch();
              if (skillId) void skill.refetch();
            }
          }}
        >
          <RefreshCw size={16} />
        </button>
      </div>
      <div className="tabs">
        {["files", "skills", "events"].map((item) => (
          <button
            type="button"
            key={item}
            className={tab === item ? "active" : ""}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="utility-body">
        {info.data && (
          <p className="notice">
            {info.data.scope ?? "agent"} scope ·{" "}
            {Object.entries(info.data.capabilities)
              .filter(([, enabled]) => enabled)
              .map(([name]) => name)
              .join(" · ")}
          </p>
        )}
        {error && <div className="error-box">{error.message}</div>}
        {info.isPending && <p className="muted">Loading workspace…</p>}
        {tab === "files" &&
          (info.data && !info.data.capabilities.filesystem ? (
            <p className="muted">No filesystem configured for this agent.</p>
          ) : (
            <>
              <form
                className="path-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  setFile("");
                  void files.refetch();
                }}
              >
                <button
                  type="button"
                  aria-label="Parent directory"
                  onClick={() => {
                    setFile("");
                    setPath(path.split("/").slice(0, -1).join("/") || "/");
                  }}
                >
                  <ArrowUp size={14} />
                </button>
                <input
                  aria-label="Workspace path"
                  value={path}
                  onChange={(event) => setPath(event.target.value)}
                />
              </form>
              <div className="file-list">
                {files.data?.entries.map((entry) => (
                  <button
                    type="button"
                    key={entry.path}
                    onClick={() => {
                      if (entry.is_dir) {
                        setPath(entry.path);
                        setFile("");
                      } else setFile(entry.path);
                    }}
                  >
                    {entry.is_dir ? <Folder size={15} /> : <FileText size={15} />}
                    <span>{entry.path.split("/").filter(Boolean).at(-1)}</span>
                    <small>{entry.size === undefined ? "" : `${entry.size} B`}</small>
                  </button>
                ))}
              </div>
              {file && (
                <div className="file-preview">
                  <h3>{file}</h3>
                  {content.isFetching ? (
                    <p className="muted">Loading file…</p>
                  ) : (
                    <pre>{content.data?.content}</pre>
                  )}
                </div>
              )}
            </>
          ))}
        {tab === "skills" && (
          <>
            <label className="field">
              <span>Search skills</span>
              <input value={skillSearch} onChange={(event) => setSkillSearch(event.target.value)} />
            </label>
            <label className="field">
              <span>Tag</span>
              <select value={tag} onChange={(event) => setTag(event.target.value)}>
                <option value="">All tags</option>
                {skillTags.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="check-field">
              <input
                type="checkbox"
                checked={activeOnly}
                onChange={(event) => setActiveOnly(event.target.checked)}
              />
              Active skills only
            </label>
            {filteredSkills?.length === 0 && Boolean(skills.data?.skills.length) && (
              <p className="muted">No skills match these filters.</p>
            )}
            {info.data && !info.data.capabilities.skills && (
              <p className="muted">No skills configured for this agent.</p>
            )}
            {skills.data?.skills.length === 0 && (
              <p className="muted">No skills found in the configured roots.</p>
            )}
            {filteredSkills?.map((item) => (
              <button
                type="button"
                className="skill-item"
                key={item.id}
                onClick={() => setSkillId(item.id)}
              >
                <strong>{item.name}</strong>
                <small>
                  {item.active ? "Active" : "Available"} · {item.description}
                </small>
              </button>
            ))}
            {skill.data && (
              <div className="markdown">
                <h3>{skill.data.name}</h3>
                <Markdown>{skill.data.instructions ?? ""}</Markdown>
                {["references", "scripts", "assets"].map((name) => (
                  <details key={name}>
                    <summary>{name}</summary>
                    <pre>{pretty(skill.data?.[name as "references" | "scripts" | "assets"])}</pre>
                  </details>
                ))}
              </div>
            )}
          </>
        )}
        {tab === "events" && (
          <>
            <p className="muted">
              Recorded operations in this trace. Files and Skills show the current workspace.
            </p>
            <div className="tabs workspace-filters">
              {["all", "filesystem", "search", "sandbox", "skills", "other"].map((item) => (
                <button
                  type="button"
                  key={item}
                  className={bucket === item ? "active" : ""}
                  onClick={() => setBucket(item)}
                >
                  {item}{" "}
                  <small>
                    {item === "all"
                      ? events.length
                      : events.filter((span) => eventBucket(span) === item).length}
                  </small>
                </button>
              ))}
            </div>
            {!events.length && (
              <p className="muted">
                Workspace file, search, sandbox and skill operations from the selected trace appear
                here.
              </p>
            )}
            {events
              .filter((span) => bucket === "all" || eventBucket(span) === bucket)
              .map((span) => (
                <details key={span.spanId}>
                  <summary>
                    {String(span.attributes["workspace.operation"] ?? span.name)} ·{" "}
                    {span.duration === undefined ? "…" : formatDuration(span.duration)}
                  </summary>
                  <div className="ai-section-body">
                    <dl className="insight-fields">
                      {[
                        "workspace.fs.path",
                        "workspace.search.query",
                        "workspace.search.mode",
                        "workspace.search.results",
                        "workspace.sandbox.command",
                        "workspace.sandbox.cwd",
                        "workspace.sandbox.exit_code",
                        "workspace.skills.name",
                      ]
                        .filter((key) => span.attributes[key] !== undefined)
                        .map((key) => (
                          <div key={key}>
                            <dt>{key.split(".").at(-1)}</dt>
                            <dd>{pretty(span.attributes[key])}</dd>
                          </div>
                        ))}
                    </dl>
                    {typeof span.attributes["workspace.fs.path"] === "string" && (
                      <button
                        type="button"
                        onClick={() => {
                          setFile(String(span.attributes["workspace.fs.path"]));
                          setTab("files");
                        }}
                      >
                        Open current file
                      </button>
                    )}
                    {typeof span.attributes["workspace.skills.name"] === "string" && (
                      <button
                        type="button"
                        onClick={() => {
                          setSkillSearch(String(span.attributes["workspace.skills.name"]));
                          setTab("skills");
                        }}
                      >
                        Find skill
                      </button>
                    )}
                    <WorkspaceResults
                      value={
                        span.attributes["voltagent.output"] ??
                        span.attributes.output ??
                        span.attributes["tool.output"]
                      }
                    />
                    <details>
                      <summary>All recorded fields</summary>
                      <RecordedValue value={span.attributes} />
                    </details>
                  </div>
                </details>
              ))}
          </>
        )}
      </div>
    </section>
  );
}

function WorkspaceResults({ value }: { value: unknown }) {
  const parsed = parseRecorded(value);
  const results = Array.isArray(parsed) ? parsed : record(parsed)?.results;
  if (!Array.isArray(results)) return value === undefined ? null : <RecordedValue value={value} />;
  return (
    <div className="workspace-results">
      {results.slice(0, 10).map((item, index) => {
        const result = record(item);
        return (
          <details key={String(result?.path ?? result?.id ?? pretty(item))}>
            <summary>
              {String(result?.path ?? result?.id ?? `Result ${index + 1}`)}
              {result?.score !== undefined ? ` · score ${result.score}` : ""}
            </summary>
            <RecordedValue value={item} />
          </details>
        );
      })}
      {results.length > 10 && (
        <details>
          <summary>All {results.length} results</summary>
          <RecordedValue value={results} />
        </details>
      )}
    </div>
  );
}
