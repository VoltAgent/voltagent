---
"@voltagent/ag-ui": minor
---

feat: add AG-UI adapter for CopilotKit integration #295

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
