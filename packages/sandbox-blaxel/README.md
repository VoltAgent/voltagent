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
[![npm version](https://img.shields.io/npm/v/@voltagent/sandbox-blaxel.svg)](https://www.npmjs.com/package/@voltagent/sandbox-blaxel)
[![npm downloads](https://img.shields.io/npm/dm/@voltagent/sandbox-blaxel.svg)](https://www.npmjs.com/package/@voltagent/sandbox-blaxel)
[![Discord](https://img.shields.io/discord/1361559153780195478.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2)](https://s.voltagent.dev/discord)

</div>

## @voltagent/sandbox-blaxel

A [Blaxel](https://www.blaxel.ai/) sandbox provider for VoltAgent's [Workspace](https://voltagent.dev/docs/) sandbox feature. `BlaxelSandbox` implements VoltAgent's `WorkspaceSandbox` contract, letting agents execute shell commands inside an isolated Blaxel sandbox instead of the local machine.

---

## Install

```bash
npm install @voltagent/sandbox-blaxel
# or
yarn add @voltagent/sandbox-blaxel
# or
pnpm add @voltagent/sandbox-blaxel
```

## Usage

```typescript
import { Agent, Workspace } from "@voltagent/core";
import { BlaxelSandbox } from "@voltagent/sandbox-blaxel";
import { openai } from "@ai-sdk/openai";

const sandbox = new BlaxelSandbox({
  apiKey: process.env.BL_API_KEY,
  workspace: process.env.BL_WORKSPACE,
});

const agent = new Agent({
  name: "my-agent",
  instructions: "A helpful assistant with sandboxed shell access",
  model: openai("gpt-4o-mini"),
  workspace: new Workspace({ sandbox }),
});
```

## Configuration

`BlaxelSandboxOptions`:

| Option      | Type                    | Description                                                                                      |
| ----------- | ----------------------- | ------------------------------------------------------------------------------------------------ |
| `apiKey`    | `string`                | Blaxel API key. Written to `process.env.BL_API_KEY` (the only auth path the Blaxel SDK supports) |
| `workspace` | `string`                | Blaxel workspace ID. Written to `process.env.BL_WORKSPACE`                                       |
| `config`    | `BlaxelSandboxConfig`   | Sandbox provisioning options plus VoltAgent `execute()` defaults (see below)                     |
| `sandbox`   | `BlaxelSandboxInstance` | Pre-resolved Blaxel SDK sandbox instance to reuse instead of provisioning a new one              |

`BlaxelSandboxConfig` (extends Blaxel's `SandboxCreateConfiguration`) adds:

| Option             | Type     | Default                   | Description                                                                      |
| ------------------ | -------- | ------------------------- | -------------------------------------------------------------------------------- |
| `cwd`              | `string` | —                         | Default working directory for `execute()`; per-call `cwd` overrides it           |
| `defaultTimeoutMs` | `number` | `60000`                   | Default command timeout; per-call `timeoutMs` overrides it; `0` disables it      |
| `maxOutputBytes`   | `number` | `5 * 1024 * 1024` (5 MiB) | Max stdout/stderr bytes kept per stream before truncation; `0` skips log fetches |
| `pollIntervalMs`   | `number` | `250`                     | Polling interval for waiting on command completion                               |

> **Auth note:** credentials resolve through a module-level singleton in the Blaxel SDK — constructing multiple `BlaxelSandbox` instances with different credentials in the same process will last-write-win. See the [Blaxel sandbox authentication docs](https://docs.blaxel.ai/Sandboxes/Overview#learn-more-about-authentication-on-blaxel).

## Documentation

- [VoltAgent Documentation](https://voltagent.dev/docs/)
- [Blaxel Documentation](https://docs.blaxel.ai/)

## License

Licensed under the MIT License, Copyright © 2026-present VoltAgent.
