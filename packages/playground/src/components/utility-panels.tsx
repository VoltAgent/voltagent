import type { Entity, EntityKind, RunTarget, Trace } from "../lib/api";
import type { TestCase } from "../lib/test-cases";
import type { useTestCases } from "../lib/use-test-cases";
import { ApiUsage } from "./api-usage";
import { MemoryExplorer } from "./memory";
import type { Panel } from "./panel-tabs";
import { TestCases } from "./test-cases";
import { ToolRunner } from "./tools";
import { WorkspaceExplorer } from "./workspace";

export function UtilityPanels({
  panel,
  entity,
  kind,
  running,
  trace,
  apiUrl,
  testCases,
  onPrepare,
  onConversation,
}: {
  panel?: Panel;
  entity: Entity;
  kind: EntityKind;
  running: boolean;
  trace?: Trace;
  apiUrl?: string;
  testCases: ReturnType<typeof useTestCases>;
  onPrepare: (test: TestCase) => void;
  onConversation: (target: RunTarget) => void;
}) {
  switch (panel) {
    case "memory":
      return (
        <MemoryExplorer
          key={entity.id}
          entity={entity}
          running={running}
          onConversation={onConversation}
        />
      );
    case "cases":
      return (
        <TestCases
          entity={entity}
          kind={kind}
          cases={testCases.cases}
          onChange={testCases.setCases}
          editing={testCases.editing}
          onEdit={testCases.setEditing}
          running={running}
          onPrepare={onPrepare}
        />
      );
    case "usage":
      return <ApiUsage entity={entity} kind={kind} apiUrl={apiUrl ?? "http://localhost:3141"} />;
    case "tools":
      return <ToolRunner />;
    case "workspace":
      return <WorkspaceExplorer key={entity.id} entity={entity} trace={trace} />;
    default:
      return null;
  }
}
