import Markdown from "react-markdown";
import { subagentOutputs } from "../lib/subagent-messages";

export function SubagentOutputs({
  parts,
  streaming = false,
}: { parts: readonly unknown[]; streaming?: boolean }) {
  return subagentOutputs(parts, streaming).map((agent) => (
    <details className="subagent-output" key={agent.id} open>
      <summary>
        {agent.name}
        <small>
          {agent.status === "streaming"
            ? "Generating"
            : agent.status === "stopped"
              ? "Stream ended"
              : agent.status}
        </small>
      </summary>
      {agent.text ? (
        <div className="markdown">
          <Markdown>{agent.text}</Markdown>
        </div>
      ) : (
        <p className="muted">{streaming ? "Waiting for output…" : "No text recorded"}</p>
      )}
      {agent.reasoning && (
        <details className="reasoning">
          <summary>Reasoning</summary>
          <Markdown>{agent.reasoning}</Markdown>
        </details>
      )}
      {agent.error && <p className="error-box">{agent.error}</p>}
    </details>
  ));
}
