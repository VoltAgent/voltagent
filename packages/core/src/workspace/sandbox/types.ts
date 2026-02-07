export type WorkspaceSandboxExecuteOptions = {
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  timeoutMs?: number;
  maxOutputBytes?: number;
  stdin?: string;
  signal?: AbortSignal;
  onStdout?: (chunk: string) => void;
  onStderr?: (chunk: string) => void;
};

export type WorkspaceSandboxStatus = "idle" | "ready" | "destroyed" | "error";

export type WorkspaceSandboxResult = {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal?: string;
  durationMs: number;
  timedOut: boolean;
  aborted: boolean;
  stdoutTruncated: boolean;
  stderrTruncated: boolean;
};

export interface WorkspaceSandbox {
  name: string;
  status?: WorkspaceSandboxStatus;
  start?: () => Promise<void> | void;
  stop?: () => Promise<void> | void;
  destroy?: () => Promise<void> | void;
  getInfo?: () => Record<string, unknown>;
  getInstructions?: () => string | null;
  execute(options: WorkspaceSandboxExecuteOptions): Promise<WorkspaceSandboxResult>;
}
