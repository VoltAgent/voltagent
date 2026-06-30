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
[![npm version](https://img.shields.io/npm/v/@voltagent/sandbox-daytona.svg)](https://www.npmjs.com/package/@voltagent/sandbox-daytona)
[![npm downloads](https://img.shields.io/npm/dm/@voltagent/sandbox-daytona.svg)](https://www.npmjs.com/package/@voltagent/sandbox-daytona)
[![Discord](https://img.shields.io/discord/1361559153780195478.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2)](https://s.voltagent.dev/discord)

</div>

## @voltagent/sandbox-daytona

A [Daytona](https://www.daytona.io/) sandbox provider for VoltAgent's Workspace sandbox feature. `DaytonaSandbox` implements VoltAgent's `WorkspaceSandbox` contract, letting agents execute shell commands inside an isolated Daytona sandbox instead of the local machine.

---

## Install

```bash
npm install @voltagent/sandbox-daytona
# or
yarn add @voltagent/sandbox-daytona
# or
pnpm add @voltagent/sandbox-daytona
```

## Usage

```typescript
import { Agent, Workspace } from "@voltagent/core";
import { DaytonaSandbox } from "@voltagent/sandbox-daytona";
import { openai } from "@ai-sdk/openai";

const sandbox = new DaytonaSandbox({
  apiKey: process.env.DAYTONA_API_KEY,
});

const agent = new Agent({
  name: "my-agent",
  instructions: "A helpful assistant with sandboxed shell access",
  model: openai("gpt-4o-mini"),
  workspace: new Workspace({ sandbox }),
});
```

## Configuration

`DaytonaSandboxOptions`:

| Option                 | Type                      | Default                   | Description                                                                          |
| ---------------------- | ------------------------- | ------------------------- | ------------------------------------------------------------------------------------ |
| `apiKey`               | `string`                  | —                         | Daytona API key                                                                      |
| `apiUrl`               | `string`                  | —                         | Daytona API URL (for self-hosted/custom deployments)                                 |
| `target`               | `string`                  | —                         | Daytona target region/runner                                                         |
| `clientOptions`        | `Record<string, unknown>` | —                         | Extra options passed to the underlying `Daytona` SDK client constructor              |
| `createParams`         | `Record<string, unknown>` | —                         | Params passed to the Daytona SDK's `client.create()` when provisioning a sandbox     |
| `createTimeoutSeconds` | `number`                  | —                         | Timeout (seconds) for sandbox creation                                               |
| `env`                  | `Record<string, string>`  | —                         | Default environment variables merged into every `execute()` call                     |
| `cwd`                  | `string`                  | —                         | Default working directory for `execute()`; per-call `cwd` overrides it               |
| `defaultTimeoutMs`     | `number`                  | `60000`                   | Default command timeout; per-call `timeoutMs` overrides it                           |
| `maxOutputBytes`       | `number`                  | `5 * 1024 * 1024` (5 MiB) | Max stdout/stderr bytes kept per stream before truncation                            |
| `sandbox`              | `DaytonaSandboxInstance`  | —                         | Pre-resolved Daytona SDK sandbox instance to reuse instead of provisioning a new one |

Use `getSandbox()` to access the underlying Daytona SDK sandbox instance directly for Daytona-specific APIs beyond `execute()`.

## Documentation

- [VoltAgent Documentation](https://voltagent.dev/docs/)
- [Daytona Documentation](https://www.daytona.io/docs/)

## License

Licensed under the MIT License, Copyright © 2026-present VoltAgent.
