import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { LoggerProxy } from "../logger";
import { createSimpleTemplateEngine } from "./template-engine";
import type { ChatMessage, PromptContent, PromptHelper, PromptReference } from "./types";

const DEFAULT_PROMPTS_DIR = path.join(".voltagent", "prompts");
const PROMPTS_PATH_ENV = "VOLTAGENT_PROMPTS_PATH";
const PROMPTS_DIR_ENV = "VOLTAGENT_PROMPTS_DIR";

export class LocalPromptNotFoundError extends Error {
  readonly code = "LOCAL_PROMPT_NOT_FOUND";

  constructor(message: string) {
    super(message);
    this.name = "LocalPromptNotFoundError";
  }
}

export const isLocalPromptNotFoundError = (error: unknown): error is LocalPromptNotFoundError =>
  error instanceof LocalPromptNotFoundError ||
  (error instanceof Error && error.name === "LocalPromptNotFoundError");

const resolveDirectory = (candidate: string): string | null => {
  const resolved = path.resolve(process.cwd(), candidate);
  if (!fs.existsSync(resolved)) {
    return null;
  }
  const stat = fs.statSync(resolved);
  return stat.isDirectory() ? resolved : null;
};

export const resolveLocalPromptsPath = (candidatePath?: string): string | null => {
  if (candidatePath) {
    return resolveDirectory(candidatePath);
  }

  const envPath = process.env[PROMPTS_PATH_ENV] || process.env[PROMPTS_DIR_ENV];
  if (envPath) {
    return resolveDirectory(envPath);
  }

  return resolveDirectory(DEFAULT_PROMPTS_DIR);
};

type LocalPromptHelper = {
  helper: PromptHelper;
  basePath: string;
};

type PromptMetadata = NonNullable<PromptContent["metadata"]>;

type ParsedPromptFile = {
  filePath: string;
  promptType: "text" | "chat";
  metadata: PromptMetadata;
  content: string;
};

const normalizePromptName = (promptName: string): string =>
  promptName.endsWith(".md") ? promptName.slice(0, -3) : promptName;

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

const normalizeStringArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const items = value.filter(
    (entry): entry is string => typeof entry === "string" && entry.length > 0,
  );
  return items.length ? items : undefined;
};

const buildPromptMetadata = (data: Record<string, unknown>, promptName: string) => {
  const metadata: PromptMetadata = {
    name: typeof data.name === "string" ? data.name : promptName,
    version: parseVersionValue(data.version),
    labels: normalizeStringArray(data.labels),
    tags: normalizeStringArray(data.tags),
    source: "local-file",
    config:
      data.config && typeof data.config === "object" && !Array.isArray(data.config)
        ? (data.config as PromptMetadata["config"])
        : undefined,
  };

  return metadata;
};

const parseVersionFromFileName = (filePath: string): number | undefined => {
  const baseName = path.basename(filePath, ".md");
  if (/^\d+$/.test(baseName)) {
    return Number(baseName);
  }
  return undefined;
};

const resolveCandidatePaths = async (
  basePath: string,
  promptName: string,
): Promise<{ baseFilePath: string; candidatePaths: string[] }> => {
  const normalizedName = normalizePromptName(promptName);
  const base = path.resolve(basePath) + path.sep;
  const baseFilePath = path.resolve(basePath, `${normalizedName}.md`);
  const candidatePaths: string[] = [];

  if (!baseFilePath.startsWith(base)) {
    throw new LocalPromptNotFoundError(`Prompt path escapes base directory: ${promptName}`);
  }

  if (fs.existsSync(baseFilePath) && fs.statSync(baseFilePath).isFile()) {
    candidatePaths.push(baseFilePath);
  }

  const dirPath = path.resolve(basePath, normalizedName);
  if (!dirPath.startsWith(base)) {
    throw new LocalPromptNotFoundError(`Prompt path escapes base directory: ${promptName}`);
  }

  if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".md")) {
        continue;
      }
      candidatePaths.push(path.join(dirPath, entry.name));
    }
  }

  return { baseFilePath, candidatePaths };
};

const parsePromptFile = async (filePath: string, promptName: string): Promise<ParsedPromptFile> => {
  const fileContent = await fs.promises.readFile(filePath, "utf8");
  const parsed = matter(fileContent);
  const data = parsed.data as Record<string, unknown>;
  const promptType = data.type === "chat" ? "chat" : "text";
  const metadata = buildPromptMetadata(data, promptName);

  if (metadata.version === undefined) {
    metadata.version = parseVersionFromFileName(filePath);
  }

  return {
    filePath,
    promptType,
    metadata,
    content: parsed.content.trim(),
  };
};

const selectPromptFile = (
  candidates: ParsedPromptFile[],
  reference: PromptReference,
  promptName: string,
  baseFilePath: string,
): ParsedPromptFile => {
  const getVersionValue = (metadata: PromptMetadata): number =>
    typeof metadata.version === "number" ? metadata.version : -1;

  const selectHighestVersion = (items: ParsedPromptFile[]): ParsedPromptFile =>
    items.reduce((best, current) =>
      getVersionValue(current.metadata) > getVersionValue(best.metadata) ? current : best,
    );

  const matchesLabel = (metadata: PromptMetadata, label: string): boolean =>
    Boolean(metadata.labels?.includes(label));

  const label = reference.label;

  if (reference.version !== undefined) {
    let matching = candidates.filter(
      (candidate) => candidate.metadata.version === reference.version,
    );
    if (label) {
      matching = matching.filter((candidate) => matchesLabel(candidate.metadata, label));
    }
    if (matching.length === 0) {
      throw new LocalPromptNotFoundError(
        `Local prompt version ${reference.version} not found for ${promptName}`,
      );
    }
    return selectHighestVersion(matching);
  }

  if (label) {
    let matching = candidates.filter((candidate) => matchesLabel(candidate.metadata, label));
    if (matching.length === 0 && label === "latest") {
      matching = candidates;
    }
    if (matching.length === 0) {
      throw new LocalPromptNotFoundError(
        `Local prompt label '${label}' not found for ${promptName}`,
      );
    }
    return selectHighestVersion(matching);
  }

  const latestCandidates = candidates.filter((candidate) =>
    matchesLabel(candidate.metadata, "latest"),
  );
  let selected =
    latestCandidates.length > 0
      ? selectHighestVersion(latestCandidates)
      : selectHighestVersion(candidates);

  if (getVersionValue(selected.metadata) < 0) {
    const baseCandidate = candidates.find((candidate) => candidate.filePath === baseFilePath);
    if (baseCandidate) {
      selected = baseCandidate;
    }
  }

  return selected;
};

const applyTemplateToPrompt = (
  content: PromptContent,
  variables?: Record<string, any>,
): PromptContent => {
  if (!variables || Object.keys(variables).length === 0) {
    return content;
  }

  const templateEngine = createSimpleTemplateEngine();
  const processTemplate = (value: string): string => templateEngine.process(value, variables);
  const processMessageContent = (value: any): any =>
    typeof value === "string" ? processTemplate(value) : value;

  if (content.type === "text") {
    return {
      type: "text",
      text: processTemplate(content.text || ""),
      metadata: content.metadata,
    };
  }

  if (content.type === "chat" && content.messages) {
    return {
      type: "chat",
      messages: content.messages.map((message: ChatMessage) => ({
        ...message,
        content: processMessageContent(message.content),
      })),
      metadata: content.metadata,
    };
  }

  throw new Error("Invalid prompt content structure");
};

export const createLocalPromptHelper = (options?: {
  basePath?: string;
}): LocalPromptHelper | null => {
  const basePath = resolveLocalPromptsPath(options?.basePath);
  if (!basePath) {
    return null;
  }

  const logger = new LoggerProxy({ component: "local-prompt-helper" });

  const helper: PromptHelper = {
    getPrompt: async (reference: PromptReference): Promise<PromptContent> => {
      try {
        const normalizedName = normalizePromptName(reference.promptName);
        const { baseFilePath, candidatePaths } = await resolveCandidatePaths(
          basePath,
          normalizedName,
        );

        if (candidatePaths.length === 0) {
          throw new LocalPromptNotFoundError(`Local prompt not found: ${reference.promptName}`);
        }

        const candidates: ParsedPromptFile[] = [];
        for (const filePath of candidatePaths) {
          const parsedFile = await parsePromptFile(filePath, normalizedName);
          if (parsedFile.metadata.name && parsedFile.metadata.name !== normalizedName) {
            continue;
          }
          candidates.push(parsedFile);
        }

        if (candidates.length === 0) {
          throw new LocalPromptNotFoundError(`Local prompt not found: ${reference.promptName}`);
        }

        const selected = selectPromptFile(candidates, reference, normalizedName, baseFilePath);
        const metadata = selected.metadata;
        const promptType = selected.promptType;

        let promptContent: PromptContent;

        if (promptType === "chat") {
          const body = selected.content;
          const messages = body ? (JSON.parse(body) as ChatMessage[]) : [];
          promptContent = {
            type: "chat",
            messages,
            metadata,
          };
        } else {
          promptContent = {
            type: "text",
            text: selected.content,
            metadata,
          };
        }

        return applyTemplateToPrompt(promptContent, reference.variables);
      } catch (error) {
        if (isLocalPromptNotFoundError(error)) {
          throw error;
        }
        logger.error("Failed to load local prompt", { error });
        throw error instanceof Error ? error : new Error(String(error));
      }
    },
  };

  return { helper, basePath };
};
