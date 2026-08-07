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
[![npm version](https://img.shields.io/npm/v/@voltagent/sandbox-tenki.svg)](https://www.npmjs.com/package/@voltagent/sandbox-tenki)
[![npm downloads](https://img.shields.io/npm/dm/@voltagent/sandbox-tenki.svg)](https://www.npmjs.com/package/@voltagent/sandbox-tenki)
[![Discord](https://img.shields.io/discord/1361559153780195478.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2)](https://s.voltagent.dev/discord)

</div>

## @voltagent/sandbox-tenki

A [Tenki](https://tenki.cloud/) sandbox provider for VoltAgent's Workspace sandbox feature. `TenkiSandbox` implements VoltAgent's `WorkspaceSandbox` contract, letting agents execute shell commands inside a disposable Tenki Linux microVM instead of the local machine.

---

## Install

```bash
npm install @voltagent/sandbox-tenki
# or
yarn add @voltagent/sandbox-tenki
# or
pnpm add @voltagent/sandbox-tenki
```

## Usage

```typescript
import { Agent, Workspace } from "@voltagent/core";
import { TenkiSandbox } from "@voltagent/sandbox-tenki";
import { openai } from "@ai-sdk/openai";

const sandbox = new TenkiSandbox({
  apiKey: process.env.TENKI_API_KEY,
});

const agent = new Agent({
  name: "my-agent",
  instructions: "A helpful assistant with sandboxed shell access",
  model: openai("gpt-4o-mini"),
  workspace: new Workspace({ sandbox }),
});
```

The API key defaults to the `TENKI_API_KEY` (or `TENKI_AUTH_TOKEN`) environment variable when `apiKey` is omitted. Tenki keys are prefixed `tk_`. Ordinary workspace API keys infer their workspace scope server-side, so they do not need a `workspaceId`. When using trusted service credentials that can access multiple workspaces, pass `workspaceId` to select one explicitly:

```typescript
const sandbox = new TenkiSandbox({
  apiKey: process.env.TENKI_SERVICE_API_KEY,
  workspaceId: process.env.TENKI_WORKSPACE_ID,
});
```

## Configuration

`TenkiSandboxOptions`:

| Option              | Type                     | Default                   | Description                                                                           |
| ------------------- | ------------------------ | ------------------------- | ------------------------------------------------------------------------------------- |
| `apiKey`            | `string`                 | `TENKI_API_KEY` env       | Tenki API key (forwarded to the SDK as `authToken`)                                   |
| `authToken`         | `string`                 | —                         | Alias for `apiKey`; `apiKey` wins when both are set                                   |
| `baseUrl`           | `string`                 | —                         | Override the Tenki API base URL                                                       |
| `workspaceId`       | `string`                 | —                         | Explicit workspace scope for trusted service credentials; omit for workspace API keys |
| `name`              | `string`                 | —                         | Human-readable session name                                                           |
| `cpuCores`          | `number`                 | —                         | vCPUs to allocate to the microVM                                                      |
| `memoryMb`          | `number`                 | —                         | Memory (MiB) to allocate to the microVM                                               |
| `env`               | `Record<string, string>` | —                         | Default env vars merged into every `execute()` call (and passed at session create)    |
| `cwd`               | `string`                 | —                         | Default working directory; per-call `cwd` overrides it                                |
| `allowInbound`      | `boolean`                | `true`                    | Allow inbound connections (required for preview URLs)                                 |
| `allowOutbound`     | `boolean`                | `true`                    | Allow outbound network egress                                                         |
| `sshAuthorizedKeys` | `string[]`               | —                         | SSH public keys authorized at session creation                                        |
| `image`             | `string`                 | —                         | Container image to boot the microVM from                                              |
| `snapshotId`        | `string`                 | —                         | Snapshot to restore the microVM from                                                  |
| `defaultTimeoutMs`  | `number`                 | `60000`                   | Default command timeout; per-call `timeoutMs` overrides it. `0` disables it           |
| `maxOutputBytes`    | `number`                 | `5 * 1024 * 1024` (5 MiB) | Max stdout/stderr bytes kept per stream before truncation                             |
| `createOptions`     | `CreateOptions`          | —                         | Extra options forwarded verbatim to the SDK's `createAndWait`                         |
| `session`           | `Session`                | —                         | Pre-resolved Tenki session to reuse instead of creating a new one                     |

The session is created lazily on the first `execute()` / `getSandbox()` call via the SDK's `createAndWait`. Use `getSandbox()` to access the underlying Tenki SDK session directly for Tenki-specific APIs (filesystem, port exposure, SSH, etc.).

Tenki sessions are billed resources — call `sandbox.destroy()` (or `workspace.destroy()`) to close the microVM when you are done. `stop()` pauses it.

### Exec failures

Tenki reports a fork/exec/wait failure as a _completed_ run carrying an `errno` (`ENOENT`, `EACCES`, `EMFILE`, …) rather than as an error, and the process itself never writes anything — so an exit code alone cannot tell "command not found" from "ran and failed silently". `WorkspaceSandboxResult` has no field for that errno, so the adapter appends it to `stderr` as a single line:

```text
tenki: exec failed: ENOENT (errno 2), reason=exec_failed
```

The guest agent's `reason` is also appended on its own when a run ends abnormally (non-zero exit or a signal) for a reason the result's `exitCode` / `signal` do not already explain, e.g. `tenki: run ended: reason=oom_killed`. A successful command never gets a diagnostic line, and the line is adapter metadata, so it is not counted against `maxOutputBytes`.

## Preview URLs and SSH

`createTenkiToolkit` returns an optional [Toolkit](https://voltagent.dev/docs/agents/tools/) with two extra tools that reach past the `execute_command` seam. Add it to the same agent that uses the workspace:

```typescript
import { Agent, Workspace } from "@voltagent/core";
import { TenkiSandbox, createTenkiToolkit } from "@voltagent/sandbox-tenki";
import { openai } from "@ai-sdk/openai";

const sandbox = new TenkiSandbox({ apiKey: process.env.TENKI_API_KEY });

const agent = new Agent({
  name: "my-agent",
  instructions: "A helpful assistant with sandboxed shell access",
  model: openai("gpt-4o-mini"),
  workspace: new Workspace({ sandbox }),
  tools: [createTenkiToolkit(sandbox)],
});
```

- `expose_preview_url` — expose a port inside the microVM and return a public preview URL (requires `allowInbound`, the default).
- `authorize_ssh_key` — authorize an SSH public key on the microVM.

For advanced programmatic use, raw interactive SSH is available via `getSandbox().ssh()`, which returns a duplex byte stream (`read`/`write`/`close`) rather than a natural single agent tool:

```typescript
const session = await sandbox.getSandbox();
const ssh = await session.ssh();
await ssh.write(new TextEncoder().encode("uname -a\n"));
const chunk = await ssh.read();
ssh.close();
```

## Documentation

- [VoltAgent Documentation](https://voltagent.dev/docs/)
- [Tenki Sandbox SDK](https://tenki.cloud/docs/sandbox/sdk)

## License

Licensed under the MIT License, Copyright © 2026-present VoltAgent.
