import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { type Entity, type RunTarget, api } from "../lib/api";
import { MessageList, RecordedValue } from "./recorded-value";

interface MemoryUser {
  userId: string;
  conversationCount: number;
  lastInteractionAt?: string;
}
interface Conversation {
  id: string;
  userId: string;
  title?: string;
  updatedAt: string;
}
interface Page<T> {
  total: number;
  users?: T[];
  conversations?: T[];
}
interface WorkingMemory {
  content: string | null;
  format: string | null;
  template?: string | null;
}
const PAGE_SIZE = 20;

export function MemoryExplorer({
  entity,
  running,
  onConversation,
}: { entity: Entity; running?: boolean; onConversation: (target: RunTarget) => void }) {
  const [search, setSearch] = useState("");
  const [userOffset, setUserOffset] = useState(0);
  const [offset, setOffset] = useState(0);
  const [user, setUser] = useState("");
  const [conversation, setConversation] = useState<Conversation>();
  const [tab, setTab] = useState("messages");
  const [limit, setLimit] = useState(50);
  const [operation, setOperation] = useState("");
  const base = "/observability/memory";
  const agent = `agentId=${encodeURIComponent(entity.id)}`;
  const identity = `${agent}&userId=${encodeURIComponent(user)}`;
  const users = useQuery({
    queryKey: ["memory-users", entity.id, search, userOffset],
    queryFn: ({ signal }) =>
      api<Page<MemoryUser>>(
        `${base}/users?${agent}&search=${encodeURIComponent(search)}&limit=${PAGE_SIZE}&offset=${userOffset}`,
        undefined,
        signal,
      ),
  });
  const conversations = useQuery({
    queryKey: ["memory-conversations", entity.id, user, offset],
    queryFn: ({ signal }) =>
      api<Page<Conversation>>(
        `${base}/conversations?${identity}&limit=${PAGE_SIZE}&offset=${offset}`,
        undefined,
        signal,
      ),
    enabled: Boolean(user),
  });
  const messages = useQuery({
    queryKey: ["memory-messages", entity.id, user, conversation?.id, limit],
    queryFn: ({ signal }) =>
      api<{ messages: unknown[] }>(
        `${base}/conversations/${encodeURIComponent(conversation?.id ?? "")}/messages?${identity}&limit=${limit}`,
        undefined,
        signal,
      ),
    enabled: Boolean(conversation) && tab === "messages",
  });
  const steps = useQuery({
    queryKey: ["memory-steps", entity.id, user, conversation?.id, operation],
    queryFn: ({ signal }) =>
      api<{
        steps: Array<{
          id: string;
          stepIndex: number;
          type: string;
          subAgentName?: string;
          createdAt: string;
          content?: string;
          arguments?: unknown;
          result?: unknown;
          usage?: unknown;
        }>;
      }>(
        `${base}/conversations/${encodeURIComponent(conversation?.id ?? "")}/steps?${identity}&limit=200${operation ? `&operationId=${encodeURIComponent(operation)}` : ""}`,
        undefined,
        signal,
      ),
    enabled: Boolean(conversation) && tab === "steps",
  });
  const working = useQuery({
    queryKey: ["memory-working", entity.id, user, conversation?.id, tab],
    queryFn: ({ signal }) =>
      api<WorkingMemory>(
        `${base}/working-memory?${identity}&scope=${tab === "user memory" ? "user" : "conversation"}${conversation ? `&conversationId=${encodeURIComponent(conversation.id)}` : ""}`,
        undefined,
        signal,
      ),
    enabled:
      Boolean(user) &&
      (tab === "user memory" || (tab === "working memory" && Boolean(conversation))),
    retry: false,
  });
  const current = tab === "messages" ? messages : tab === "steps" ? steps : working;
  return (
    <section className="runner memory-explorer">
      <div className="panel-heading">
        <div>
          <small>MEMORY</small>
          <h2>{entity.name}</h2>
        </div>
        <button
          type="button"
          onClick={() => {
            void users.refetch();
            if (user) void conversations.refetch();
            if (conversation || tab === "user memory") void current.refetch();
          }}
        >
          Refresh
        </button>
      </div>
      <div className="utility-body">
        <label className="field">
          <span>Find user</span>
          <input
            value={search}
            placeholder="Search user IDs"
            onChange={(event) => {
              setSearch(event.target.value);
              setUserOffset(0);
            }}
          />
        </label>
        {users.error && <p className="error-box">{users.error.message}</p>}
        {users.isPending && <p className="muted">Loading memory users…</p>}
        {users.data?.total === 0 && (
          <p className="muted">
            No stored conversations for this agent. Run it with a user ID and memory enabled.
          </p>
        )}
        <div className="memory-list">
          {users.data?.users?.map((item) => (
            <button
              type="button"
              key={item.userId}
              aria-pressed={user === item.userId}
              onClick={() => {
                setUser(item.userId);
                setOffset(0);
                setConversation(undefined);
              }}
            >
              <strong>{item.userId}</strong>
              <small>{item.conversationCount} conversations</small>
            </button>
          ))}
        </div>
        <Pagination
          offset={userOffset}
          total={users.data?.total ?? 0}
          onChange={setUserOffset}
          label="Users"
        />
        {user && (
          <>
            <h3>Conversations · {user}</h3>
            {conversations.error && <p className="error-box">{conversations.error.message}</p>}
            {conversations.isPending && <p className="muted">Loading conversations…</p>}
            <div className="memory-list">
              {conversations.data?.conversations?.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  aria-pressed={conversation?.id === item.id}
                  onClick={() => {
                    setConversation(item);
                    setOperation("");
                    setTab("messages");
                  }}
                >
                  <strong>{item.title || item.id}</strong>
                  <small>{new Date(item.updatedAt).toLocaleString()}</small>
                </button>
              ))}
            </div>
            <Pagination
              offset={offset}
              total={conversations.data?.total ?? 0}
              onChange={setOffset}
              label="Conversations"
            />
            <div className="tabs">
              {["messages", "steps", "working memory", "user memory"].map((item) => (
                <button
                  type="button"
                  key={item}
                  disabled={item !== "user memory" && !conversation}
                  className={tab === item ? "active" : ""}
                  onClick={() => setTab(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </>
        )}
        {conversation && (
          <div className="memory-selection">
            <code>{conversation.id}</code>
            <button
              type="button"
              disabled={running}
              onClick={() => onConversation({ userId: user, conversationId: conversation.id })}
            >
              Continue in chat
            </button>
          </div>
        )}
        {(conversation || (user && tab === "user memory")) && (
          <>
            {current.isFetching && <p className="muted">Loading {tab}…</p>}
            {current.error && <p className="error-box">{current.error.message}</p>}
            {tab === "messages" && (
              <>
                <label className="field">
                  <span>Recent messages</span>
                  <select value={limit} onChange={(event) => setLimit(Number(event.target.value))}>
                    {[50, 100, 200].map((count) => (
                      <option key={count}>{count}</option>
                    ))}
                  </select>
                </label>
                {messages.data?.messages.length === 0 && (
                  <p className="muted">No messages stored.</p>
                )}
                <MessageList messages={messages.data?.messages ?? []} />
              </>
            )}
            {tab === "steps" && (
              <>
                <label className="field">
                  <span>Operation ID filter</span>
                  <input
                    value={operation}
                    placeholder="All operations"
                    onChange={(event) => setOperation(event.target.value)}
                  />
                </label>
                <p className="muted">Up to 200 recorded steps.</p>
                {steps.data?.steps.length === 0 && (
                  <p className="muted">No steps stored for this selection.</p>
                )}
                {steps.data?.steps.map((step) => (
                  <details className="ai-section" key={step.id}>
                    <summary>
                      Step {step.stepIndex} · {step.type.replaceAll("_", " ")}
                      {step.subAgentName ? ` · ${step.subAgentName}` : ""}
                    </summary>
                    <div className="ai-section-body">
                      <small>{new Date(step.createdAt).toLocaleString()}</small>
                      <RecordedValue value={step.arguments ?? step.result ?? step.content} />
                      {step.usage !== undefined && <RecordedValue value={step.usage} />}
                    </div>
                  </details>
                ))}
              </>
            )}
            {(tab === "working memory" || tab === "user memory") && working.data && (
              <>
                <p className="muted">
                  Current stored {tab} · {working.data.format ?? "No format"}
                </p>
                {working.data.content === null ? (
                  <p className="muted">No working memory stored in this scope.</p>
                ) : (
                  <RecordedValue value={working.data.content} />
                )}
                {working.data.template && (
                  <details>
                    <summary>Template</summary>
                    <RecordedValue value={working.data.template} />
                  </details>
                )}
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function Pagination({
  offset,
  total,
  onChange,
  label,
}: { offset: number; total: number; onChange: (offset: number) => void; label: string }) {
  if (total <= PAGE_SIZE) return null;
  return (
    <div className="pagination" aria-label={`${label} pagination`}>
      <button
        type="button"
        disabled={offset === 0}
        onClick={() => onChange(Math.max(0, offset - PAGE_SIZE))}
      >
        Previous
      </button>
      <small>
        {offset + 1}–{Math.min(total, offset + PAGE_SIZE)} of {total}
      </small>
      <button
        type="button"
        disabled={offset + PAGE_SIZE >= total}
        onClick={() => onChange(offset + PAGE_SIZE)}
      >
        Next
      </button>
    </div>
  );
}
