declare module "@copilotkit/runtime" {
  import type { AbstractAgent } from "@ag-ui/client";

  export type CopilotServiceAdapter = unknown;

  export class ExperimentalEmptyAdapter implements CopilotServiceAdapter {
    constructor(...args: unknown[]);
  }

  export class CopilotRuntime {
    constructor(options: { agents: Record<string, AbstractAgent> });
  }

  export function copilotRuntimeNextJSAppRouterEndpoint(options: {
    runtime: CopilotRuntime;
    serviceAdapter: CopilotServiceAdapter;
    endpoint?: string;
  }): {
    handleRequest: (req: Request) => Promise<Response>;
  };
}
