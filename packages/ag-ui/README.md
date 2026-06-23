<div align="center">
<a href="https://voltagent.dev/">
<img width="1500" height="276" alt="voltagent" src="https://github.com/user-attachments/assets/d9ad69bd-b905-42a3-81af-99a0581348c0" />
</a>

<h3 align="center">
AI Agent Engineering Platform
</h3>

<div align="center">
    <a href="https://voltagent.dev">Home Page</a> |
    <a href="https://voltagent.dev/docs/">Documentation</a> |
    <a href="https://github.com/voltagent/voltagent/tree/main/examples">Examples</a>
</div>
</div>

<br/>

<div align="center">

[![GitHub issues](https://img.shields.io/github/issues/voltagent/voltagent)](https://github.com/voltagent/voltagent/issues)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/voltagent/voltagent)](https://github.com/voltagent/voltagent/pulls)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/@voltagent/ag-ui.svg)](https://www.npmjs.com/package/@voltagent/ag-ui)
[![npm downloads](https://img.shields.io/npm/dm/@voltagent/ag-ui.svg)](https://www.npmjs.com/package/@voltagent/ag-ui)
[![Discord](https://img.shields.io/discord/1361559153780195478.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2)](https://s.voltagent.dev/discord)

</div>

## @voltagent/ag-ui

An [AG-UI](https://github.com/ag-ui-protocol/ag-ui) adapter for VoltAgent. Wrap any VoltAgent `Agent` as an AG-UI `AbstractAgent` that streams VoltAgent events as AG-UI protocol events, and optionally expose it through a [CopilotKit](https://www.copilotkit.ai/) runtime.

---

## Install

```bash
npm install @voltagent/ag-ui @ag-ui/client @ag-ui/core
# or
yarn add @voltagent/ag-ui @ag-ui/client @ag-ui/core
# or
pnpm add @voltagent/ag-ui @ag-ui/client @ag-ui/core
```

Add `@copilotkit/runtime` as well if you plan to use the CopilotKit handlers below.

## Usage

Wrap a VoltAgent agent so it speaks the AG-UI protocol:

```typescript
import { Agent } from "@voltagent/core";
import { createVoltAgentAGUI } from "@voltagent/ag-ui";
import { openai } from "@ai-sdk/openai";

const agent = new Agent({
  name: "my-agent",
  instructions: "A helpful assistant",
  model: openai("gpt-4o-mini"),
});

const aguiAgent = createVoltAgentAGUI({ agent });
```

`createVoltAgentAGUI` accepts:

| Option         | Type                                            | Description                                                                          |
| -------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------ |
| `agent`        | `Agent`                                         | The VoltAgent agent to expose over AG-UI                                             |
| `deriveUserId` | `(input: RunAgentInput) => string \| undefined` | Optional function to derive a `userId` for memory/telemetry from the AG-UI run input |

`aguiAgent.run(input)` returns an `Observable<BaseEvent>` that emits AG-UI lifecycle, message, and tool-call events translated from the agent's `streamText` output.

## CopilotKit Integration

Use `createCopilotKitHandler` to get a framework-agnostic fetch handler for a [CopilotKit runtime](https://www.copilotkit.ai/):

```typescript
import { createCopilotKitHandler, createVoltAgentAGUI } from "@voltagent/ag-ui";
import { agent } from "./agent"; // a VoltAgent instance

const handler = createCopilotKitHandler({
  agents: { assistant: createVoltAgentAGUI({ agent }) },
  endpoint: "/api/copilotkit",
});

export default {
  fetch: handler,
};
```

Or mount it directly on a Hono-style app with `registerCopilotKitRoutes`, picking agents up from the global `AgentRegistry` instead of wiring them by hand:

```typescript
import { registerCopilotKitRoutes } from "@voltagent/ag-ui";

registerCopilotKitRoutes({
  app,
  resourceIds: ["assistant"], // omit to expose every registered agent
  path: "/copilotkit",
});
```

### `CopilotKitHandlerOptions`

| Option           | Type                                                                            | Default                    | Description                                 |
| ---------------- | ------------------------------------------------------------------------------- | -------------------------- | ------------------------------------------- |
| `agents`         | `Record<string, AbstractAgent>`                                                 | —                          | Static map of AG-UI agents                  |
| `loadAgents`     | `() => Promise<Record<string, AbstractAgent>> \| Record<string, AbstractAgent>` | —                          | Lazy loader; overrides `agents` if provided |
| `serviceAdapter` | `CopilotServiceAdapter`                                                         | `ExperimentalEmptyAdapter` | CopilotKit service adapter                  |
| `endpoint`       | `string`                                                                        | `"/copilotkit"`            | Endpoint path used by CopilotKit clients    |

### `RegisterCopilotKitRoutesOptions`

| Option        | Type                                  | Default               | Description                                                                              |
| ------------- | ------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------- |
| `app`         | Hono-style app (`all(path, handler)`) | —                     | App instance to register the route on                                                    |
| `agents`      | `Record<string, Agent>`               | —                     | VoltAgent agents to expose, wrapped lazily with `createVoltAgentAGUI`                    |
| `resourceIds` | `string[]`                            | all registered agents | Filter which agents from the global `AgentRegistry` are exposed (if `agents` is omitted) |
| `path`        | `string`                              | `"/copilotkit"`       | Path to mount the CopilotKit endpoint                                                    |

## Documentation

- [VoltAgent Documentation](https://voltagent.dev/docs/)
- [AG-UI Protocol](https://github.com/ag-ui-protocol/ag-ui)
- [CopilotKit](https://www.copilotkit.ai/)

## License

Licensed under the MIT License, Copyright © 2026-present VoltAgent.
