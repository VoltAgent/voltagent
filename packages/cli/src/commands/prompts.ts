import path from "node:path";
import { safeStringify } from "@voltagent/internal/utils";
import AdmZip from "adm-zip";
import chalk from "chalk";
import type { Command } from "commander";
import fsExtra from "fs-extra";
import matter from "gray-matter";
import inquirer from "inquirer";
import ora from "ora";
import { captureError } from "../utils/analytics";
import { resolveAuthConfig } from "../utils/config";

const DEFAULT_OUTPUT_DIR = ".voltagent/prompts";

const normalizePromptNames = (input?: string[] | string): string[] | undefined => {
  if (!input) {
    return undefined;
  }

  const values = Array.isArray(input) ? input : [input];
  const normalized = values.flatMap((value) =>
    value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
  );

  return normalized.length ? Array.from(new Set(normalized)) : undefined;
};

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length);
};

const normalizeLabels = (labels: string[]): string[] =>
  Array.from(
    new Set(labels.map((label) => label.trim()).filter((label) => label && label !== "latest")),
  ).sort();

const normalizeTags = (tags: string[]): string[] =>
  Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean))).sort();

const normalizeLabelList = (labels: unknown): string[] =>
  Array.from(
    new Set(
      normalizeStringArray(labels)
        .map((label) => label.trim())
        .filter(Boolean),
    ),
  ).sort();

const parseVersionValue = (value: unknown): number | undefined => {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed && /^\d+$/.test(trimmed)) {
      return Number(trimmed);
    }
  }
  return undefined;
};

const parseVersionFromFilePath = (filePath: string): number | undefined => {
  const baseName = path.basename(filePath, ".md");
  if (/^\d+$/.test(baseName)) {
    return Number(baseName);
  }
  return undefined;
};

const compactObject = (input: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));

const extractFilename = (contentDisposition: string | null): string | null => {
  if (!contentDisposition) {
    return null;
  }

  const match = /filename="?([^";]+)"?/i.exec(contentDisposition);
  return match?.[1] ?? null;
};

const resolveEntryPath = (baseDir: string, entryName: string): string | null => {
  const normalized = entryName.replace(/^\//, "");
  const resolved = path.resolve(baseDir, normalized);
  const base = path.resolve(baseDir) + path.sep;
  if (!resolved.startsWith(base)) {
    return null;
  }
  return resolved;
};

const collectPromptFiles = async (baseDir: string, promptNames?: string[]): Promise<string[]> => {
  const files = new Set<string>();
  const visit = async (dir: string) => {
    const entries = await fsExtra.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await visit(entryPath);
        continue;
      }
      if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
        files.add(entryPath);
      }
    }
  };

  if (promptNames && promptNames.length > 0) {
    for (const name of promptNames) {
      if (!name) {
        continue;
      }

      const directPath = path.resolve(baseDir, name.endsWith(".md") ? name : `${name}.md`);
      if (fsExtra.existsSync(directPath) && fsExtra.statSync(directPath).isFile()) {
        files.add(directPath);
      }

      const promptName = name.endsWith(".md") ? name.slice(0, -3) : name;
      const baseFile = path.resolve(baseDir, `${promptName}.md`);
      if (fsExtra.existsSync(baseFile) && fsExtra.statSync(baseFile).isFile()) {
        files.add(baseFile);
      }

      const dirPath = path.resolve(baseDir, promptName);
      if (fsExtra.existsSync(dirPath) && fsExtra.statSync(dirPath).isDirectory()) {
        await visit(dirPath);
      }
    }

    return Array.from(files);
  }

  if (fsExtra.existsSync(baseDir)) {
    await visit(baseDir);
  }

  return Array.from(files);
};

type LocalPrompt = {
  name: string;
  type: "text" | "chat";
  content: { text?: string; messages?: unknown[] };
  labels: string[];
  allLabels: string[];
  tags: string[];
  config: Record<string, unknown>;
  description?: string;
  commitMessage?: string;
  version?: number;
  filePath: string;
};

const parsePromptFile = async (filePath: string): Promise<LocalPrompt> => {
  const raw = await fsExtra.readFile(filePath, "utf8");
  const parsed = matter(raw);
  const data = parsed.data as Record<string, unknown>;
  const body = parsed.content.trim();

  const fallbackName = path.basename(filePath, ".md");
  const name =
    typeof data.name === "string" && data.name.trim().length > 0 ? data.name.trim() : fallbackName;
  const type = data.type === "chat" ? "chat" : "text";
  const allLabels = normalizeLabelList(data.labels);
  const labels = normalizeLabels(allLabels);
  const tags = normalizeTags(normalizeStringArray(data.tags));
  const version = parseVersionValue(data.version) ?? parseVersionFromFilePath(filePath);
  const config =
    data.config && typeof data.config === "object" && !Array.isArray(data.config)
      ? (data.config as Record<string, unknown>)
      : {};
  const description =
    typeof data.description === "string" && data.description.trim().length > 0
      ? data.description.trim()
      : undefined;
  const commitMessage =
    typeof data.commit_message === "string" && data.commit_message.trim().length > 0
      ? data.commit_message.trim()
      : undefined;

  if (type === "chat") {
    let messages: unknown[] = [];
    if (body) {
      try {
        const parsedMessages = JSON.parse(body);
        if (!Array.isArray(parsedMessages)) {
          throw new Error("Chat prompt content must be a JSON array of messages.");
        }
        messages = parsedMessages;
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Invalid JSON";
        throw new Error(`Invalid chat prompt content in ${filePath}: ${reason}`);
      }
    }

    return {
      name,
      type,
      content: { messages },
      labels,
      tags,
      config,
      description,
      commitMessage,
      version,
      allLabels,
      filePath,
    };
  }

  return {
    name,
    type,
    content: { text: body },
    labels,
    tags,
    config,
    description,
    commitMessage,
    version,
    allLabels,
    filePath,
  };
};

type RemotePrompt = {
  name: string;
  type: "text" | "chat";
  prompt: unknown;
  config?: Record<string, unknown>;
  labels?: string[];
  tags?: string[];
  version?: number;
};

const normalizeRemoteContent = (remote: RemotePrompt): string => {
  if (remote.type === "chat") {
    const prompt = remote.prompt as { messages?: unknown[] };
    return safeStringify(prompt?.messages ?? []);
  }

  if (typeof remote.prompt === "string") {
    return remote.prompt.trim();
  }

  if (remote.prompt && typeof remote.prompt === "object" && "text" in (remote.prompt as any)) {
    const candidate = (remote.prompt as { text?: unknown }).text;
    return typeof candidate === "string" ? candidate.trim() : "";
  }

  return "";
};

const normalizeLocalContent = (local: LocalPrompt): string => {
  if (local.type === "chat") {
    return safeStringify(local.content.messages ?? []);
  }
  return typeof local.content.text === "string" ? local.content.text.trim() : "";
};

const extractRemoteMessages = (prompt: unknown): unknown[] => {
  if (Array.isArray(prompt)) {
    return prompt;
  }
  if (prompt && typeof prompt === "object" && "messages" in (prompt as any)) {
    const messages = (prompt as { messages?: unknown }).messages;
    return Array.isArray(messages) ? messages : [];
  }
  return [];
};

const buildMarkdownFromRemotePrompt = (remote: RemotePrompt): string => {
  const frontmatter = compactObject({
    name: remote.name,
    version: remote.version,
    type: remote.type,
    config: remote.config ?? {},
    labels: normalizeLabelList(remote.labels),
    tags: normalizeTags(normalizeStringArray(remote.tags)),
  });

  if (remote.type === "chat") {
    const messages = extractRemoteMessages(remote.prompt);
    return matter.stringify(safeStringify(messages, { indentation: 2 }), frontmatter);
  }

  if (typeof remote.prompt === "string") {
    return matter.stringify(remote.prompt, frontmatter);
  }

  if (remote.prompt && typeof remote.prompt === "object" && "text" in (remote.prompt as any)) {
    const text = (remote.prompt as { text?: unknown }).text;
    return matter.stringify(typeof text === "string" ? text : "", frontmatter);
  }

  return matter.stringify(safeStringify(remote.prompt ?? "", { indentation: 2 }), frontmatter);
};

const previewValue = (value: string, maxLength = 160): string => {
  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact) {
    return "(empty)";
  }
  if (compact.length <= maxLength) {
    return compact;
  }
  return `${compact.slice(0, maxLength - 3)}...`;
};

const buildDiffSummary = (local: LocalPrompt, remote: RemotePrompt | null): string[] => {
  if (!remote) {
    return ["status: new prompt (not found remotely)"];
  }

  const diffs: string[] = [];
  if (local.type !== remote.type) {
    diffs.push(`type: ${remote.type} -> ${local.type}`);
  }

  const localLabels = normalizeLabels(local.labels);
  const remoteLabels = normalizeLabels(normalizeStringArray(remote.labels));
  if (safeStringify(localLabels) !== safeStringify(remoteLabels)) {
    diffs.push(
      `labels: ${remoteLabels.join(", ") || "(none)"} -> ${localLabels.join(", ") || "(none)"}`,
    );
  }

  const localTags = normalizeTags(local.tags);
  const remoteTags = normalizeTags(normalizeStringArray(remote.tags));
  if (safeStringify(localTags) !== safeStringify(remoteTags)) {
    diffs.push(`tags: ${remoteTags.join(", ") || "(none)"} -> ${localTags.join(", ") || "(none)"}`);
  }

  const localConfig = local.config ?? {};
  const remoteConfig = remote.config ?? {};
  if (safeStringify(localConfig) !== safeStringify(remoteConfig)) {
    diffs.push(
      `config: ${previewValue(safeStringify(remoteConfig))} -> ${previewValue(
        safeStringify(localConfig),
      )}`,
    );
  }

  const localContent = normalizeLocalContent(local);
  const remoteContent = normalizeRemoteContent(remote);
  if (localContent !== remoteContent) {
    diffs.push(`content: ${previewValue(remoteContent)} -> ${previewValue(localContent)}`);
  }

  return diffs;
};

const fetchRemotePrompt = async (
  baseUrl: string,
  auth: { publicKey: string; secretKey: string },
  name: string,
  options?: { version?: number; label?: string },
): Promise<RemotePrompt | null> => {
  const params = new URLSearchParams();
  if (options?.version !== undefined) {
    params.set("version", options.version.toString());
  }
  if (options?.label) {
    params.set("label", options.label);
  }

  const url = `${baseUrl}/prompts/public/${encodeURIComponent(name)}${
    params.toString() ? `?${params.toString()}` : ""
  }`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "x-public-key": auth.publicKey,
      "x-secret-key": auth.secretKey,
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(
      `Failed to fetch prompt '${name}': ${response.status} ${response.statusText}${
        details ? ` - ${details}` : ""
      }`,
    );
  }

  return (await response.json()) as RemotePrompt;
};

const buildCreatePayload = (local: LocalPrompt) => ({
  type: local.type,
  content: local.content,
  labels: normalizeLabels(local.labels),
  tags: normalizeTags(local.tags),
  config: local.config ?? {},
  description: local.description,
  commit_message: local.commitMessage,
});

type AuthConfig = Awaited<ReturnType<typeof resolveAuthConfig>>;

type PullCommandOptions = {
  out: string;
  names?: string[];
  label?: string;
  promptVersion?: string;
  clean?: boolean;
};

type PushCommandOptions = {
  out: string;
  names?: string[];
  yes?: boolean;
};

type PullContext = {
  outputDir: string;
  defaultOutputDir: string;
  promptNames?: string[];
  label?: string;
  version?: number;
  hasTargetedSelection: boolean;
};

const buildPullContext = (options: PullCommandOptions): PullContext => {
  const outputDir = path.resolve(process.cwd(), options.out || DEFAULT_OUTPUT_DIR);
  const defaultOutputDir = path.resolve(process.cwd(), DEFAULT_OUTPUT_DIR);
  const promptNames = normalizePromptNames(options.names);
  const label = options.label?.trim() || undefined;
  const version =
    options.promptVersion !== undefined ? Number.parseInt(options.promptVersion, 10) : undefined;

  if (options.promptVersion !== undefined && Number.isNaN(version)) {
    throw new Error("Version must be a number.");
  }

  const hasTargetedSelection = label !== undefined || version !== undefined;
  if (hasTargetedSelection && (!promptNames || promptNames.length === 0)) {
    throw new Error("Use --names with --label or --prompt-version.");
  }

  return {
    outputDir,
    defaultOutputDir,
    promptNames,
    label,
    version,
    hasTargetedSelection,
  };
};

const prepareOutputDir = async (outputDir: string, shouldClean?: boolean) => {
  if (shouldClean) {
    await fsExtra.remove(outputDir);
  }
  await fsExtra.ensureDir(outputDir);
};

const logPullSuccess = (outputDir: string, defaultOutputDir: string, outPath: string) => {
  console.log(chalk.green(`\nSuccess: prompts pulled to ${outputDir}`));

  if (outputDir !== defaultOutputDir) {
    console.log(
      chalk.yellow(`Set VOLTAGENT_PROMPTS_PATH=${outPath} to use this directory at runtime.`),
    );
  }
};

const writeRemotePromptToDisk = async (outputDir: string, remote: RemotePrompt): Promise<void> => {
  const markdown = buildMarkdownFromRemotePrompt(remote);
  const relativePath =
    remote.version !== undefined
      ? path.join(remote.name, `${remote.version}.md`)
      : `${remote.name}.md`;
  const targetPath = resolveEntryPath(outputDir, relativePath);

  if (!targetPath) {
    throw new Error(`Invalid prompt filename returned: ${relativePath}`);
  }

  await fsExtra.ensureDir(path.dirname(targetPath));
  await fsExtra.writeFile(targetPath, markdown, "utf8");
};

const downloadTargetedPrompts = async (options: {
  auth: AuthConfig;
  outputDir: string;
  promptNames: string[];
  label?: string;
  version?: number;
}): Promise<{ downloaded: string[]; missing: string[] }> => {
  const { auth, outputDir, promptNames, label, version } = options;
  const spinner = ora("Downloading prompts...").start();
  const downloaded: string[] = [];
  const missing: string[] = [];

  for (const name of promptNames) {
    const remote = await fetchRemotePrompt(auth.baseUrl, auth, name, {
      label,
      version,
    });

    if (!remote) {
      missing.push(name);
      continue;
    }

    await writeRemotePromptToDisk(outputDir, remote);
    downloaded.push(remote.name);
  }

  if (downloaded.length > 0) {
    spinner.succeed(`Downloaded ${downloaded.length} prompt file(s).`);
  } else {
    spinner.stop();
  }

  return { downloaded, missing };
};

const fetchPromptExport = async (auth: AuthConfig, promptNames?: string[]): Promise<Response> => {
  const params = new URLSearchParams();
  if (promptNames && promptNames.length > 0) {
    params.set("promptNames", promptNames.join(","));
  }

  const url = `${auth.baseUrl}/prompts/public/export/markdown${
    params.toString() ? `?${params.toString()}` : ""
  }`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "x-public-key": auth.publicKey,
      "x-secret-key": auth.secretKey,
    },
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(
      `Failed to export prompts: ${response.status} ${response.statusText}${
        details ? ` - ${details}` : ""
      }`,
    );
  }

  return response;
};

const writeZipExport = async (outputDir: string, buffer: Buffer): Promise<number> => {
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();
  let fileCount = 0;

  for (const entry of entries) {
    if (entry.isDirectory) {
      continue;
    }

    if (
      entry.entryName.includes("__MACOSX") ||
      entry.entryName.split("/").pop()?.startsWith("._")
    ) {
      continue;
    }

    const resolvedPath = resolveEntryPath(outputDir, entry.entryName);
    if (!resolvedPath) {
      continue;
    }

    await fsExtra.ensureDir(path.dirname(resolvedPath));
    await fsExtra.writeFile(resolvedPath, entry.getData());
    fileCount++;
  }

  return fileCount;
};

const writeTextExport = async (
  outputDir: string,
  content: string,
  filename: string,
): Promise<void> => {
  const targetPath = resolveEntryPath(outputDir, filename);
  if (!targetPath) {
    throw new Error(`Invalid prompt filename returned: ${filename}`);
  }

  await fsExtra.ensureDir(path.dirname(targetPath));
  await fsExtra.writeFile(targetPath, content, "utf8");
};

const downloadPromptExport = async (options: {
  auth: AuthConfig;
  outputDir: string;
  promptNames?: string[];
}): Promise<{ filename?: string; fileCount?: number }> => {
  const { auth, outputDir, promptNames } = options;
  const spinner = ora("Downloading prompts...").start();
  const response = await fetchPromptExport(auth, promptNames);

  const contentType = response.headers.get("content-type") ?? "";
  const contentDisposition = response.headers.get("content-disposition");

  if (contentType.includes("application/zip")) {
    const buffer = Buffer.from(await response.arrayBuffer());
    const fileCount = await writeZipExport(outputDir, buffer);
    spinner.succeed(`Downloaded ${fileCount} prompt file(s).`);
    return { fileCount };
  }

  const content = await response.text();
  const filename =
    extractFilename(contentDisposition) ||
    (promptNames?.length === 1 ? `${promptNames[0]}.md` : "prompts.md");

  await writeTextExport(outputDir, content, filename);
  spinner.succeed(`Downloaded ${filename}.`);

  return { filename };
};

const listMissingPromptNames = (baseDir: string, promptNames: string[]): string[] =>
  promptNames.filter((name) => {
    const directPath = path.resolve(baseDir, name.endsWith(".md") ? name : `${name}.md`);
    if (fsExtra.existsSync(directPath)) {
      return false;
    }

    const promptName = name.endsWith(".md") ? name.slice(0, -3) : name;
    const baseFile = path.resolve(baseDir, `${promptName}.md`);
    if (fsExtra.existsSync(baseFile)) {
      return false;
    }

    const dirPath = path.resolve(baseDir, promptName);
    return !fsExtra.existsSync(dirPath);
  });

const parsePromptFilesWithErrors = async (
  files: string[],
): Promise<{ localPrompts: LocalPrompt[]; parseErrors: string[] }> => {
  const localPrompts: LocalPrompt[] = [];
  const parseErrors: string[] = [];

  for (const file of files) {
    try {
      localPrompts.push(await parsePromptFile(file));
    } catch (error) {
      parseErrors.push(error instanceof Error ? error.message : String(error));
    }
  }

  return { localPrompts, parseErrors };
};

const groupPromptsByName = (prompts: LocalPrompt[]): Map<string, LocalPrompt[]> => {
  const grouped = new Map<string, LocalPrompt[]>();
  for (const prompt of prompts) {
    const existing = grouped.get(prompt.name);
    if (existing) {
      existing.push(prompt);
    } else {
      grouped.set(prompt.name, [prompt]);
    }
  }
  return grouped;
};

const getVersionValue = (prompt: LocalPrompt): number =>
  typeof prompt.version === "number" ? prompt.version : -1;

const selectLatestPrompt = (prompts: LocalPrompt[]): LocalPrompt => {
  const latestLabelled = prompts.filter((prompt) => prompt.allLabels.includes("latest"));
  const candidates = latestLabelled.length > 0 ? latestLabelled : prompts;
  return candidates.reduce((best, current) =>
    getVersionValue(current) > getVersionValue(best) ? current : best,
  );
};

const selectPromptsForPush = (
  groupedPrompts: Map<string, LocalPrompt[]>,
): {
  selectedPrompts: LocalPrompt[];
  skipped: Array<{ name: string; count: number; version: string }>;
} => {
  const selectedPrompts: LocalPrompt[] = [];
  const skipped: Array<{ name: string; count: number; version: string }> = [];

  for (const [name, prompts] of groupedPrompts) {
    if (prompts.length === 1) {
      selectedPrompts.push(prompts[0]);
      continue;
    }

    const selected = selectLatestPrompt(prompts);
    const skippedEntries = prompts.filter((prompt) => prompt.filePath !== selected.filePath);
    selectedPrompts.push(selected);

    if (skippedEntries.length > 0) {
      const selectedVersion = selected.version !== undefined ? `v${selected.version}` : "latest";
      skipped.push({ name, count: skippedEntries.length, version: selectedVersion });
    }
  }

  return { selectedPrompts, skipped };
};

const buildDiffResults = async (
  auth: AuthConfig,
  selectedPrompts: LocalPrompt[],
): Promise<
  Array<{
    local: LocalPrompt;
    remote: RemotePrompt | null;
    diffs: string[];
  }>
> => {
  const diffResults: Array<{
    local: LocalPrompt;
    remote: RemotePrompt | null;
    diffs: string[];
  }> = [];

  const spinner = ora("Comparing local prompts with remote...").start();
  for (const prompt of selectedPrompts) {
    const remote = await fetchRemotePrompt(auth.baseUrl, auth, prompt.name);
    const diffs = buildDiffSummary(prompt, remote);
    if (diffs.length > 0) {
      diffResults.push({ local: prompt, remote, diffs });
    }
  }
  spinner.stop();

  return diffResults;
};

const renderDiffResults = (diffResults: Array<{ local: LocalPrompt; diffs: string[] }>): void => {
  for (const entry of diffResults) {
    console.log(chalk.yellow(`\n${entry.local.name}`));
    entry.diffs.forEach((diff) => console.log(chalk.gray(`- ${diff}`)));
  }
};

const confirmPromptPush = async (count: number, yes?: boolean): Promise<boolean> => {
  if (yes) {
    return true;
  }
  const result = await inquirer.prompt<{ confirm: boolean }>([
    {
      type: "confirm",
      name: "confirm",
      message: `Push ${count} prompt(s) to VoltAgent?`,
      default: false,
    },
  ]);
  return result.confirm;
};

const pushDiffResults = async (
  auth: AuthConfig,
  diffResults: Array<{ local: LocalPrompt }>,
): Promise<void> => {
  const pushSpinner = ora("Pushing prompts...").start();
  for (const entry of diffResults) {
    const payload = buildCreatePayload(entry.local);
    const url = `${auth.baseUrl}/prompts/public/${encodeURIComponent(entry.local.name)}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "x-public-key": auth.publicKey,
        "x-secret-key": auth.secretKey,
        "Content-Type": "application/json",
      },
      body: safeStringify(payload),
    });

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      throw new Error(
        `Failed to push prompt '${entry.local.name}': ${response.status} ${response.statusText}${
          details ? ` - ${details}` : ""
        }`,
      );
    }
  }
  pushSpinner.succeed(`Pushed ${diffResults.length} prompt(s).`);
};

export const registerPromptsCommand = (program: Command): void => {
  const prompts = program.command("prompts").description("Manage VoltAgent prompts");

  prompts
    .command("pull")
    .description("Pull prompts from VoltAgent to local markdown files")
    .option("-o, --out <path>", "Output directory", DEFAULT_OUTPUT_DIR)
    .option("-n, --names <names...>", "Prompt names to pull (comma-separated or repeatable)")
    .option("-l, --label <label>", "Prompt label to pull (requires --names)")
    .option("--prompt-version <version>", "Prompt version to pull (requires --names)")
    .option("--clean", "Remove existing prompt files before pulling", false)
    .action(async (options: PullCommandOptions) => {
      try {
        const auth = await resolveAuthConfig({ promptIfMissing: true });
        const context = buildPullContext(options);

        await prepareOutputDir(context.outputDir, options.clean);

        if (context.hasTargetedSelection && context.promptNames) {
          const { missing } = await downloadTargetedPrompts({
            auth,
            outputDir: context.outputDir,
            promptNames: context.promptNames,
            label: context.label,
            version: context.version,
          });

          if (missing.length > 0) {
            console.log(chalk.yellow(`Missing prompts: ${missing.join(", ")}`));
          }

          logPullSuccess(context.outputDir, context.defaultOutputDir, options.out);
          return;
        }

        await downloadPromptExport({
          auth,
          outputDir: context.outputDir,
          promptNames: context.promptNames,
        });

        logPullSuccess(context.outputDir, context.defaultOutputDir, options.out);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(chalk.red("\nPrompt pull failed"));
        console.error(chalk.red(errorMessage));

        captureError({
          command: "prompts pull",
          errorMessage,
        });

        process.exit(1);
      }
    });

  prompts
    .command("push")
    .description("Push local prompt changes to VoltAgent")
    .option("-o, --out <path>", "Input directory", DEFAULT_OUTPUT_DIR)
    .option("-n, --names <names...>", "Prompt names to push (comma-separated or repeatable)")
    .option("-y, --yes", "Skip confirmation prompts", false)
    .action(async (options: PushCommandOptions) => {
      try {
        const auth = await resolveAuthConfig({ promptIfMissing: true });
        const baseDir = path.resolve(process.cwd(), options.out || DEFAULT_OUTPUT_DIR);
        const promptNames = normalizePromptNames(options.names);

        if (!fsExtra.existsSync(baseDir)) {
          console.log(chalk.yellow(`Prompt directory not found: ${baseDir}`));
          return;
        }

        if (promptNames && promptNames.length > 0) {
          const missing = listMissingPromptNames(baseDir, promptNames);
          if (missing.length > 0) {
            console.log(chalk.yellow(`Missing local prompt files: ${missing.join(", ")}`));
          }
        }

        const files = await collectPromptFiles(baseDir, promptNames);

        if (files.length === 0) {
          console.log(chalk.yellow("No prompt files found to push."));
          return;
        }

        const { localPrompts, parseErrors } = await parsePromptFilesWithErrors(files);

        if (parseErrors.length > 0) {
          console.error(chalk.red("Failed to parse prompt files:"));
          parseErrors.forEach((message) => console.error(chalk.red(`- ${message}`)));
          process.exit(1);
        }

        const groupedPrompts = groupPromptsByName(localPrompts);
        const { selectedPrompts, skipped } = selectPromptsForPush(groupedPrompts);

        for (const entry of skipped) {
          console.log(
            chalk.yellow(
              `Multiple local versions found for '${entry.name}'. Pushing ${entry.version}; skipping ${entry.count} file(s).`,
            ),
          );
        }

        const diffResults = await buildDiffResults(auth, selectedPrompts);

        if (diffResults.length === 0) {
          console.log(chalk.green("No differences detected. Nothing to push."));
          return;
        }

        renderDiffResults(diffResults);

        const shouldPush = await confirmPromptPush(diffResults.length, options.yes);
        if (!shouldPush) {
          console.log(chalk.yellow("Push canceled."));
          return;
        }

        await pushDiffResults(auth, diffResults);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(chalk.red("\nPrompt push failed"));
        console.error(chalk.red(errorMessage));

        captureError({
          command: "prompts push",
          errorMessage,
        });

        process.exit(1);
      }
    });
};
