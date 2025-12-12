# @voltagent/ag-ui

## 0.1.0

### Minor Changes

- [#861](https://github.com/VoltAgent/voltagent/pull/861) [`9854d43`](https://github.com/VoltAgent/voltagent/commit/9854d4374c977751f29f73b097164ed33c2290d5) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add AG-UI adapter for CopilotKit integration #295

  New `@voltagent/ag-ui` package enables seamless CopilotKit integration with VoltAgent agents.

  ## Features
  - **VoltAgent AGUI**: AG-UI protocol adapter that wraps VoltAgent agents, streaming events (text chunks, tool calls, state snapshots) in AG-UI format
  - **registerCopilotKitRoutes**: One-liner to mount CopilotKit runtime on any Hono-based VoltAgent server
  - **State persistence**: Automatically syncs AG-UI state to VoltAgent working memory for cross-turn context
  - **Tool mapping**: VoltAgent tools are exposed to CopilotKit clients with full streaming support

  ## Usage

  ```ts
  import { registerCopilotKitRoutes } from "@voltagent/ag-ui";
  import { honoServer } from "@voltagent/server-hono";

  new VoltAgent({
    agents: { myAgent },
    server: honoServer({
      configureApp: (app) => registerCopilotKitRoutes({ app, resourceIds: ["myAgent"] }),
    }),
  });
  ```

  Includes `with-copilotkit` example with Vite React client and VoltAgent server setup.
