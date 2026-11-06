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
[![npm version](https://img.shields.io/npm/v/@voltagent/sandbox-smolmachines.svg)](https://www.npmjs.com/package/@voltagent/sandbox-smolmachines)
[![npm downloads](https://img.shields.io/npm/dm/@voltagent/sandbox-smolmachines.svg)](https://www.npmjs.com/package/@voltagent/sandbox-smolmachines)
[![Discord](https://img.shields.io/discord/1361559153780195478.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2)](https://s.voltagent.dev/discord)

</div>

## @voltagent/sandbox-smolmachines

A [smol machines](https://smolmachines.com/) sandbox provider for VoltAgent's Workspace sandbox feature. `SmolMachinesSandbox` implements VoltAgent's `WorkspaceSandbox` contract, letting agents execute shell commands inside a hardware-isolated microVM on your own machine instead of the host. It needs no account or Docker, because the VM engine ships with the [`smolmachines`](https://www.npmjs.com/package/smolmachines) package for macOS on Apple Silicon, or Linux x64 or arm64 with glibc and KVM.

---

## Install

```bash
npm install @voltagent/sandbox-smolmachines
# or
yarn add @voltagent/sandbox-smolmachines
# or
pnpm add @voltagent/sandbox-smolmachines
```

## Usage

```typescript
import { Agent, Workspace } from "@voltagent/core";
import { SmolMachinesSandbox } from "@voltagent/sandbox-smolmachines";
import { openai } from "@ai-sdk/openai";

const sandbox = new SmolMachinesSandbox({
  config: { image: "python:3.12", network: true },
});

const agent = new Agent({
  name: "my-agent",
  instructions: "A helpful assistant with sandboxed shell access",
  model: openai("gpt-4o-mini"),
  workspace: new Workspace({ sandbox }),
});
```

The machine is created on the first `execute()` or `getSandbox()` call and deleted by `destroy()`, which `Workspace.destroy()` calls. `destroy()` does not wait for running commands: it deletes the machine at once, and a command still running in it rejects with a `connection closed` error. A machine also stops when the process that created it exits.

## Configuration

`SmolMachinesSandboxOptions`:

| Option             | Type                          | Default                   | Description                                                                              |
| ------------------ | ----------------------------- | ------------------------- | ---------------------------------------------------------------------------------------- |
| `config`           | `MachineConfig`               | `{}`                      | Passed to `Machine.create()`: `image`, `resources`, `network`, `mounts`, `name` and more |
| `env`              | `Record<string, string>`      | None                      | Default environment variables merged into every `execute()` call                         |
| `cwd`              | `string`                      | None                      | Default working directory for `execute()`, overridden by per-call `cwd`                  |
| `defaultTimeoutMs` | `number`                      | `60000`                   | Default command timeout, overridden by per-call `timeoutMs`, `0` disables it             |
| `maxOutputBytes`   | `number`                      | `5 * 1024 * 1024` (5 MiB) | Max stdout/stderr bytes kept per stream before truncation                                |
| `machine`          | `SmolMachinesSandboxInstance` | None                      | Existing `Machine` to use instead of creating a new one                                  |

Without `config.image` the machine boots a minimal Linux guest. Outbound network access is off unless `config.network` or an allow list in `config.resources` turns it on. `stdin` is not supported yet and is rejected.

Use `getSandbox()` to access the underlying `Machine` directly, for example `readFile()` and `writeFile()`.

## Documentation

- [VoltAgent Documentation](https://voltagent.dev/docs/)
- [smolmachines SDK](https://www.npmjs.com/package/smolmachines)

## License

Licensed under the MIT License, Copyright © 2026-present VoltAgent.
