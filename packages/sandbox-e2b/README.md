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
[![npm version](https://img.shields.io/npm/v/@voltagent/sandbox-e2b.svg)](https://www.npmjs.com/package/@voltagent/sandbox-e2b)
[![npm downloads](https://img.shields.io/npm/dm/@voltagent/sandbox-e2b.svg)](https://www.npmjs.com/package/@voltagent/sandbox-e2b)
[![Discord](https://img.shields.io/discord/1361559153780195478.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2)](https://s.voltagent.dev/discord)

</div>

## @voltagent/sandbox-e2b

An [E2B](https://e2b.dev/) sandbox provider for VoltAgent's Workspace sandbox feature. `E2BSandbox` implements VoltAgent's `WorkspaceSandbox` contract, letting agents execute shell commands inside an isolated E2B sandbox instead of the local machine.

---

## Install

```bash
npm install @voltagent/sandbox-e2b
# or
yarn add @voltagent/sandbox-e2b
# or
pnpm add @voltagent/sandbox-e2b
```

## Usage

```typescript
import { Agent, Workspace } from "@voltagent/core";
import { E2BSandbox } from "@voltagent/sandbox-e2b";
import { openai } from "@ai-sdk/openai";

const sandbox = new E2BSandbox({
  apiKey: process.env.E2B_API_KEY,
});

const agent = new Agent({
  name: "my-agent",
  instructions: "A helpful assistant with sandboxed shell access",
  model: openai("gpt-4o-mini"),
  workspace: new Workspace({ sandbox }),
});
```

## Configuration

`E2BSandboxOptions`:

| Option             | Type                      | Default                   | Description                                                                                 |
| ------------------ | ------------------------- | ------------------------- | ------------------------------------------------------------------------------------------- |
| `apiKey`           | `string`                  | —                         | E2B API key                                                                                 |
| `template`         | `string`                  | —                         | E2B sandbox template to create from                                                         |
| `sandboxId`        | `string`                  | —                         | Connect to an existing sandbox by ID instead of creating a new one                          |
| `createOptions`    | `Record<string, unknown>` | —                         | Extra options passed to the E2B SDK's `Sandbox.create()`                                    |
| `connectOptions`   | `Record<string, unknown>` | —                         | Extra options passed to the E2B SDK's `Sandbox.connect()` (used with `sandboxId`)           |
| `env`              | `Record<string, string>`  | —                         | Default environment variables merged into every `execute()` call                            |
| `cwd`              | `string`                  | —                         | Default working directory for `execute()`; per-call `cwd` overrides it                      |
| `user`             | `string`                  | —                         | User to run commands as                                                                     |
| `requestTimeoutMs` | `number`                  | —                         | Timeout for individual E2B SDK requests (e.g. kill, sendStdin)                              |
| `defaultTimeoutMs` | `number`                  | `60000`                   | Default command timeout; per-call `timeoutMs` overrides it                                  |
| `maxOutputBytes`   | `number`                  | `5 * 1024 * 1024` (5 MiB) | Max stdout/stderr bytes kept per stream before truncation                                   |
| `sandbox`          | `E2BSandboxInstance`      | —                         | Pre-resolved E2B SDK sandbox instance to reuse instead of provisioning/connecting a new one |

Use `getSandbox()` to access the underlying E2B SDK sandbox instance directly for E2B-specific APIs beyond `execute()`.

## Documentation

- [VoltAgent Documentation](https://voltagent.dev/docs/)
- [E2B Documentation](https://e2b.dev/docs)

## License

Licensed under the MIT License, Copyright © 2026-present VoltAgent.
