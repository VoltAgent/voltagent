import type { ServerProviderDeps, WorkflowStateEntry } from "@voltagent/core";
import { describe, expect, it, vi } from "vitest";
import { handleListWorkflowRuns } from "./workflow.handlers";

function createWorkflowState(
  id: string,
  createdAt: string,
  workflowId: string,
): WorkflowStateEntry {
  return {
    id,
    workflowId,
    workflowName: `Workflow ${workflowId}`,
    status: "completed",
    createdAt: new Date(createdAt),
    updatedAt: new Date(createdAt),
  };
}

function buildDeps(
  workflows: Record<
    string,
    {
      runs?: WorkflowStateEntry[];
    }
  >,
): {
  deps: ServerProviderDeps;
  queryWorkflowRunsByWorkflowId: Map<string, ReturnType<typeof vi.fn>>;
} {
  const queryWorkflowRunsByWorkflowId = new Map<string, ReturnType<typeof vi.fn>>();
  const registry = {
    getWorkflow: vi.fn((id: string) => {
      const entry = workflows[id];
      if (!entry) return undefined;
      let queryWorkflowRuns = queryWorkflowRunsByWorkflowId.get(id);
      if (!queryWorkflowRuns) {
        queryWorkflowRuns = vi.fn().mockResolvedValue(entry.runs ?? []);
        queryWorkflowRunsByWorkflowId.set(id, queryWorkflowRuns);
      }
      return {
        workflow: {
          memory: {
            queryWorkflowRuns,
          },
        },
      };
    }),
    getWorkflowDetailForApi: vi.fn(),
    getWorkflowsForApi: vi.fn(),
    getWorkflowCount: vi.fn(),
    getAllWorkflowIds: vi.fn(() => Object.keys(workflows)),
    on: vi.fn(),
    off: vi.fn(),
    activeExecutions: new Map(),
    resumeSuspendedWorkflow: vi.fn(),
  };

  return {
    deps: {
      agentRegistry: {} as any,
      workflowRegistry: registry as any,
    },
    queryWorkflowRunsByWorkflowId,
  };
}

describe("handleListWorkflowRuns", () => {
  const logger = {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    trace: vi.fn(),
    child: vi.fn(() => logger),
  } as any;

  it("returns runs for a specific workflowId", async () => {
    const { deps } = buildDeps({
      "wf-1": {
        runs: [createWorkflowState("exec-1", "2024-01-02T00:00:00Z", "wf-1")],
      },
    });

    const response = await handleListWorkflowRuns("wf-1", {}, deps, logger);

    expect(response.success).toBe(true);
    expect(Array.isArray((response as any).data)).toBe(true);
    expect((response as any).data[0].id).toBe("exec-1");
  });

  it("aggregates runs across workflows when no workflowId is provided", async () => {
    const { deps } = buildDeps({
      "wf-1": {
        runs: [
          createWorkflowState("exec-1", "2024-01-02T00:00:00Z", "wf-1"),
          createWorkflowState("exec-2", "2024-01-01T00:00:00Z", "wf-1"),
        ],
      },
      "wf-2": {
        runs: [createWorkflowState("exec-3", "2024-01-03T00:00:00Z", "wf-2")],
      },
    });

    const response = await handleListWorkflowRuns(undefined, {}, deps, logger);

    expect(response.success).toBe(true);
    const ids = (response as any).data.map((r: any) => r.id);
    expect(ids).toEqual(["exec-3", "exec-1", "exec-2"]); // sorted by createdAt desc
  });

  it("returns 404 when workflow is not found for explicit workflowId", async () => {
    const { deps } = buildDeps({});

    const response = await handleListWorkflowRuns("missing-wf", {}, deps, logger);

    expect(response.success).toBe(false);
    expect((response as any).error).toContain("not found");
  });

  it("forwards userId and metadata filters to memory query", async () => {
    const { deps, queryWorkflowRunsByWorkflowId } = buildDeps({
      "wf-1": {
        runs: [createWorkflowState("exec-1", "2024-01-02T00:00:00Z", "wf-1")],
      },
    });

    const response = await handleListWorkflowRuns(
      "wf-1",
      {
        userId: "user-1",
        status: "success",
        metadata: '{"region":"us-east-1"}',
        "metadata.tenantId": "acme",
      },
      deps,
      logger,
    );

    expect(response.success).toBe(true);

    const queryWorkflowRuns = queryWorkflowRunsByWorkflowId.get("wf-1");
    expect(queryWorkflowRuns).toBeDefined();
    expect(queryWorkflowRuns).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowId: "wf-1",
        status: "completed",
        userId: "user-1",
        metadata: {
          region: "us-east-1",
          tenantId: "acme",
        },
      }),
    );
  });

  it("ignores malformed metadata JSON and continues without metadata filter", async () => {
    const { deps, queryWorkflowRunsByWorkflowId } = buildDeps({
      "wf-1": {
        runs: [createWorkflowState("exec-1", "2024-01-02T00:00:00Z", "wf-1")],
      },
    });
    const previousWarnCalls = logger.warn.mock.calls.length;

    const response = await handleListWorkflowRuns(
      "wf-1",
      {
        metadata: "not-json",
      },
      deps,
      logger,
    );

    expect(response.success).toBe(true);
    expect(logger.warn.mock.calls.length).toBe(previousWarnCalls + 1);
    expect(logger.warn).toHaveBeenCalledWith(
      "Ignoring invalid workflow metadata filter payload",
      expect.objectContaining({
        metadata: "not-json",
      }),
    );

    const queryWorkflowRuns = queryWorkflowRunsByWorkflowId.get("wf-1");
    expect(queryWorkflowRuns).toBeDefined();
    expect(queryWorkflowRuns).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowId: "wf-1",
        metadata: undefined,
      }),
    );
  });
});
