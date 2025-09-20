# @voltagent/a2a-server

Agent-to-Agent (A2A) server implementation for VoltAgent. This package exposes VoltAgent agents over the A2A JSON-RPC protocol so that other agents, IDEs, or orchestration frameworks can interact with them through well-defined endpoints.

> 🚧 **Status:** Experimental. The API may change before the first stable release.

## Installation

```bash
pnpm add @voltagent/a2a-server
```

## Quick start

```ts
import { A2AServer } from "@voltagent/a2a-server";

export const a2aServer = new A2AServer({
  name: "my-agents",
  version: "1.0.0",
});

// Later, wire the server into VoltAgent so it can access agent registries
```

Full documentation will arrive once the implementation stabilises.
