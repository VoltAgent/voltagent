import { safeStringify } from "@voltagent/internal";
import type { LanguageModel } from "ai";
import {
  MODEL_PROVIDER_REGISTRY,
  type ModelProviderRegistryEntry,
} from "./model-provider-registry.generated";

export type LanguageModelFactory = (modelId: string) => LanguageModel;

export type ModelProvider = {
  languageModel: LanguageModelFactory;
};

export type ModelProviderEntry = ModelProvider | LanguageModelFactory;
export type ModelProviderLoader = () => Promise<ModelProviderEntry>;

type ProviderEnvMatch = {
  name: string;
  value: string;
};

type ProviderAdapter = (
  config: ModelProviderRegistryEntry,
  moduleExports: Record<string, unknown>,
) => ModelProviderEntry;

const MODELS_DEV_API_URL = "https://models.dev/api.json";
const DEFAULT_AUTO_REFRESH_INTERVAL_MS = 30 * 60 * 1000;
const CACHE_DIR_NAME = ".voltagent";
const CACHE_REGISTRY_DIR = "model-registry";
const CACHE_REGISTRY_FILENAME = "provider-registry.json";
const CACHE_TYPES_FILENAME = "model-provider-types.generated.d.ts";

const normalizeProviderId = (id: string): string => id.trim().toLowerCase();

const normalizeOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const normalizeEnvList = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const cleaned = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return cleaned.length > 0 ? cleaned : undefined;
};

const normalizeEnvForCompare = (env?: string[]): string[] => {
  if (!env || env.length === 0) {
    return [];
  }
  return [...env]
    .map((item) => item.trim())
    .filter(Boolean)
    .sort();
};

const areRegistryEntriesEqual = (
  a: ModelProviderRegistryEntry,
  b: ModelProviderRegistryEntry,
): boolean => {
  if (a.id !== b.id || a.name !== b.name || a.npm !== b.npm) {
    return false;
  }
  if ((a.api ?? "") !== (b.api ?? "") || (a.doc ?? "") !== (b.doc ?? "")) {
    return false;
  }
  const envA = normalizeEnvForCompare(a.env);
  const envB = normalizeEnvForCompare(b.env);
  if (envA.length !== envB.length) {
    return false;
  }
  return envA.every((value, index) => value === envB[index]);
};

type RegistrySnapshot = {
  updatedAt: string;
  providers: Record<string, ModelProviderRegistryEntry>;
  models: Record<string, string[]>;
};

const TYPES_HEADER = `/**
 * THIS FILE IS AUTO-GENERATED - DO NOT EDIT
 * Source: ${MODELS_DEV_API_URL}
 */
`;

const formatStringLiteral = (value: string): string =>
  `'${String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;

const normalizeModelId = (id: string): string => id.trim();

const isDeprecatedModel = (modelInfo: unknown): boolean =>
  Boolean(
    modelInfo &&
      typeof modelInfo === "object" &&
      "status" in modelInfo &&
      (modelInfo as { status?: unknown }).status === "deprecated",
  );

const buildTypesContent = (providerModels: Record<string, string[]>): string => {
  const providerLines = Object.entries(providerModels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([providerId, models]) => {
      const sorted = [...models].sort();
      const modelLines = sorted.map((modelId) => `    ${formatStringLiteral(modelId)},`);
      return `  readonly ${formatStringLiteral(providerId)}: readonly [\n${modelLines.join("\n")}\n  ];`;
    });

  return `${TYPES_HEADER}
export type ProviderModelsMap = {
${providerLines.join("\n")}
};

export type ProviderId = keyof ProviderModelsMap;

export type ModelRouterModelId =
  | {
      [P in ProviderId]: \`\${P}/\${ProviderModelsMap[P][number]}\`;
    }[ProviderId]
  | (string & {});

export type ModelForProvider<P extends ProviderId> = ProviderModelsMap[P][number];
`;
};

const EXTRA_PROVIDER_REGISTRY: ModelProviderRegistryEntry[] = [
  {
    id: "ollama",
    name: "Ollama",
    npm: "ollama-ai-provider-v2",
    doc: "https://ollama.com",
  },
];

const STATIC_PROVIDER_REGISTRY = [
  ...Object.values(MODEL_PROVIDER_REGISTRY),
  ...EXTRA_PROVIDER_REGISTRY,
];

const STATIC_PROVIDER_MAP = new Map(
  STATIC_PROVIDER_REGISTRY.map((entry) => [normalizeProviderId(entry.id), entry]),
);

declare global {
  // eslint-disable-next-line no-var
  var ___voltagent_model_provider_registry: ModelProviderRegistry | undefined;
}

const envKeyForProvider = (providerId: string): string =>
  providerId.trim().toUpperCase().replace(/-/g, "_");

const getEnvValue = (name: string): string | undefined => {
  const raw = process.env[name];
  if (typeof raw !== "string") {
    return undefined;
  }
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const resolveEnvValue = (names: string[]): ProviderEnvMatch | undefined => {
  for (const name of names) {
    const value = getEnvValue(name);
    if (value) {
      return { name, value };
    }
  }
  return undefined;
};

const resolveEnvByPattern = (
  names: string[] | undefined,
  pattern: RegExp,
): ProviderEnvMatch | undefined => {
  if (!names) {
    return undefined;
  }
  return resolveEnvValue(names.filter((name) => pattern.test(name)));
};

const resolveBaseUrl = (config: ModelProviderRegistryEntry): string | undefined => {
  const envNames = config.env ?? [];
  const override = resolveEnvValue(
    envNames.filter((name) => /ENDPOINT|BASE_URL|BASEURL/i.test(name)),
  )?.value;
  if (override) {
    return override;
  }

  const conventional = getEnvValue(`${envKeyForProvider(config.id)}_BASE_URL`);
  if (conventional) {
    return conventional;
  }

  return config.api;
};

const formatEnvList = (envNames: string[]): string =>
  envNames.map((name) => `process.env.${name}`).join(" or ");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const buildRegistryEntryFromModelsDev = (
  providerId: string,
  info: Record<string, unknown>,
): ModelProviderRegistryEntry | undefined => {
  const npm = normalizeOptionalString(info.npm);
  if (!npm) {
    return undefined;
  }

  const resolvedId = normalizeProviderId(normalizeOptionalString(info.id) ?? providerId);
  if (!resolvedId) {
    return undefined;
  }

  return {
    id: resolvedId,
    name: normalizeOptionalString(info.name) ?? providerId,
    npm,
    api: normalizeOptionalString(info.api),
    env: normalizeEnvList(info.env),
    doc: normalizeOptionalString(info.doc),
  };
};

const fetchModelsDevRegistry = async (): Promise<{
  entries: ModelProviderRegistryEntry[];
  providerModels: Record<string, string[]>;
}> => {
  if (typeof fetch !== "function") {
    throw new Error("Global fetch is not available for provider auto-refresh.");
  }

  const response = await fetch(MODELS_DEV_API_URL);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${MODELS_DEV_API_URL}: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as unknown;
  if (!isRecord(data)) {
    throw new Error("Unexpected provider registry response from models.dev.");
  }

  const entries: ModelProviderRegistryEntry[] = [];
  const providerModels: Record<string, string[]> = {};

  const providers = Object.entries(data)
    .filter(([, value]) => isRecord(value) && "models" in value)
    .sort(([a], [b]) => a.localeCompare(b));

  for (const [providerId, value] of providers) {
    if (!isRecord(value)) {
      continue;
    }
    const entry = buildRegistryEntryFromModelsDev(providerId, value);
    if (!entry) {
      continue;
    }

    const modelsValue = value.models;
    const modelsObject = isRecord(modelsValue) ? modelsValue : {};
    const models = Object.entries(modelsObject)
      .filter(([, modelInfo]) => !isDeprecatedModel(modelInfo))
      .map(([modelId]) => normalizeModelId(modelId))
      .filter((modelId) => modelId.length > 0)
      .sort();

    const normalizedId = normalizeProviderId(entry.id);
    providerModels[normalizedId] = models;
    entries.push(entry);
  }

  return { entries, providerModels };
};

type NodeRuntime = {
  fs: typeof import("node:fs/promises");
  path: typeof import("node:path");
  os: typeof import("node:os");
  createRequire: typeof import("node:module").createRequire;
};

let nodeRuntimePromise: Promise<NodeRuntime | null> | null = null;

const loadNodeRuntime = async (): Promise<NodeRuntime | null> => {
  if (!nodeRuntimePromise) {
    nodeRuntimePromise = (async () => {
      try {
        const [fs, path, os, moduleApi] = await Promise.all([
          import("node:fs/promises"),
          import("node:path"),
          import("node:os"),
          import("node:module"),
        ]);
        return {
          fs,
          path,
          os,
          createRequire: moduleApi.createRequire,
        };
      } catch {
        return null;
      }
    })();
  }
  return nodeRuntimePromise;
};

const getCachePaths = (nodeRuntime: NodeRuntime) => {
  const baseDir = nodeRuntime.path.join(
    nodeRuntime.os.homedir(),
    CACHE_DIR_NAME,
    CACHE_REGISTRY_DIR,
  );
  return {
    baseDir,
    registryPath: nodeRuntime.path.join(baseDir, CACHE_REGISTRY_FILENAME),
    typesPath: nodeRuntime.path.join(baseDir, CACHE_TYPES_FILENAME),
  };
};

const resolvePackageRoot = (nodeRuntime: NodeRuntime): string | undefined => {
  try {
    const markerPath = nodeRuntime.path.join(process.cwd(), "voltagent.runtime.js");
    const requireFn = nodeRuntime.createRequire(markerPath);
    const packageJsonPath = requireFn.resolve("@voltagent/core/package.json");
    return nodeRuntime.path.dirname(packageJsonPath);
  } catch {
    return undefined;
  }
};

const buildRegistrySnapshot = (
  entries: ModelProviderRegistryEntry[],
  providerModels: Record<string, string[]>,
  updatedAt: Date,
): RegistrySnapshot => {
  const providers: Record<string, ModelProviderRegistryEntry> = {};
  const models: Record<string, string[]> = {};
  const providerIds = new Set<string>();

  for (const entry of entries) {
    const providerId = normalizeProviderId(entry.id);
    providerIds.add(providerId);
    providers[providerId] = entry;
  }

  for (const [providerId, modelsList] of Object.entries(providerModels)) {
    const normalizedId = normalizeProviderId(providerId);
    if (!providerIds.has(normalizedId)) {
      continue;
    }
    const normalizedModels = Array.from(
      new Set(modelsList.map((modelId) => modelId.trim()).filter((modelId) => modelId.length > 0)),
    ).sort();
    models[normalizedId] = normalizedModels;
  }

  return {
    updatedAt: updatedAt.toISOString(),
    providers,
    models,
  };
};

const parseRegistrySnapshot = (raw: unknown): RegistrySnapshot | null => {
  if (!isRecord(raw)) {
    return null;
  }

  const updatedAt = normalizeOptionalString(raw.updatedAt) ?? new Date(0).toISOString();
  const providersRaw = isRecord(raw.providers) ? raw.providers : null;
  if (!providersRaw) {
    return null;
  }

  const providers: Record<string, ModelProviderRegistryEntry> = {};
  for (const [providerId, value] of Object.entries(providersRaw)) {
    if (!isRecord(value)) {
      continue;
    }
    const entry = buildRegistryEntryFromModelsDev(providerId, value);
    if (!entry) {
      continue;
    }
    providers[normalizeProviderId(entry.id)] = entry;
  }

  if (!Object.keys(providers).length) {
    return null;
  }

  const modelsRaw = isRecord(raw.models) ? raw.models : {};
  const models: Record<string, string[]> = {};

  for (const [providerId, value] of Object.entries(modelsRaw)) {
    if (!Array.isArray(value)) {
      continue;
    }
    const normalizedId = normalizeProviderId(providerId);
    if (!(normalizedId in providers)) {
      continue;
    }
    const normalizedModels = Array.from(
      new Set(
        value
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter((item) => item.length > 0),
      ),
    ).sort();
    if (normalizedModels.length > 0) {
      models[normalizedId] = normalizedModels;
    }
  }

  return {
    updatedAt,
    providers,
    models,
  };
};

const readRegistrySnapshotFromDisk = async (): Promise<RegistrySnapshot | null> => {
  const nodeRuntime = await loadNodeRuntime();
  if (!nodeRuntime) {
    return null;
  }

  const { fs } = nodeRuntime;
  const { registryPath } = getCachePaths(nodeRuntime);

  try {
    const raw = await fs.readFile(registryPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return parseRegistrySnapshot(parsed);
  } catch {
    return null;
  }
};

const writeRegistrySnapshotToDisk = async (snapshot: RegistrySnapshot): Promise<void> => {
  const nodeRuntime = await loadNodeRuntime();
  if (!nodeRuntime) {
    return;
  }

  const { fs, path } = nodeRuntime;
  const cachePaths = getCachePaths(nodeRuntime);

  try {
    await fs.mkdir(cachePaths.baseDir, { recursive: true });
    const registryJson = safeStringify(snapshot, { indentation: 2 });
    const typesContent = buildTypesContent(snapshot.models);

    await fs.writeFile(cachePaths.registryPath, registryJson, "utf8");
    await fs.writeFile(cachePaths.typesPath, typesContent, "utf8");

    const packageRoot = resolvePackageRoot(nodeRuntime);
    if (packageRoot) {
      const distDir = path.join(packageRoot, "dist", "registries");
      await fs.mkdir(distDir, { recursive: true });
      await fs.writeFile(path.join(distDir, CACHE_REGISTRY_FILENAME), registryJson, "utf8");
      await fs.writeFile(path.join(distDir, CACHE_TYPES_FILENAME), typesContent, "utf8");
    }
  } catch {
    // Best-effort only: ignore cache write failures.
  }
};

const apiKeyEnvNames = (config: ModelProviderRegistryEntry): string[] => {
  const envNames = config.env ?? [];
  const keyNames = envNames.filter((name) => /KEY|TOKEN|SECRET/i.test(name));
  return keyNames.length ? keyNames : envNames;
};

const requireApiKey = (config: ModelProviderRegistryEntry): ProviderEnvMatch => {
  const envNames = apiKeyEnvNames(config);
  const match = resolveEnvValue(envNames);
  if (!match) {
    throw new Error(`Missing API key for "${config.id}". Set ${formatEnvList(envNames)}.`);
  }
  return match;
};

const isModelProvider = (value: unknown): value is ModelProvider =>
  Boolean(
    value &&
      typeof value === "object" &&
      "languageModel" in value &&
      typeof (value as ModelProvider).languageModel === "function",
  );

const isLanguageModelFactory = (value: unknown): value is LanguageModelFactory =>
  typeof value === "function";

const resolveProviderExport = (
  moduleExports: Record<string, unknown>,
  exportName: string,
): ModelProviderEntry | undefined => {
  const named = moduleExports[exportName];
  if (isLanguageModelFactory(named) || isModelProvider(named)) {
    return named;
  }
  const fallback = (moduleExports as { default?: unknown }).default;
  if (isLanguageModelFactory(fallback) || isModelProvider(fallback)) {
    return fallback;
  }
  return undefined;
};

const getModuleFunction = (
  moduleExports: Record<string, unknown>,
  exportName: string,
): ((options?: Record<string, unknown>) => unknown) | undefined => {
  const candidate = moduleExports[exportName];
  return typeof candidate === "function"
    ? (candidate as (options?: Record<string, unknown>) => unknown)
    : undefined;
};

const buildApiKeyProvider =
  (createExport: string, providerExport: string): ProviderAdapter =>
  (config, moduleExports) => {
    const apiKeyMatch = requireApiKey(config);

    const createFn = getModuleFunction(moduleExports, createExport);
    const created = createFn ? createFn({ apiKey: apiKeyMatch.value }) : undefined;
    const provider =
      (isLanguageModelFactory(created) || isModelProvider(created) ? created : undefined) ??
      resolveProviderExport(moduleExports, providerExport);

    if (!provider) {
      throw new Error(`Unable to resolve provider export for "${config.id}" from "${config.npm}".`);
    }

    return provider;
  };

const buildOpenAICompatibleProvider: ProviderAdapter = (config, moduleExports) => {
  const createFn = getModuleFunction(moduleExports, "createOpenAICompatible");
  if (!createFn) {
    throw new Error(`Missing createOpenAICompatible export in "${config.npm}" for "${config.id}".`);
  }

  const apiKeyMatch = requireApiKey(config);
  const baseURL = resolveBaseUrl(config);
  if (!baseURL) {
    throw new Error(`Missing base URL for "${config.id}". Set ${formatEnvList(config.env ?? [])}.`);
  }

  const provider = createFn({
    name: config.id,
    baseURL,
    apiKey: apiKeyMatch.value,
    supportsStructuredOutputs: true,
  });

  return provider as ModelProviderEntry;
};

const buildAzureProvider: ProviderAdapter = (config, moduleExports) => {
  const createFn = getModuleFunction(moduleExports, "createAzure");
  const providerExport = resolveProviderExport(moduleExports, "azure");

  if (!createFn && !providerExport) {
    throw new Error(`Missing Azure provider export in "${config.npm}".`);
  }

  const apiKeyMatch = requireApiKey(config);
  const resourceName = resolveEnvByPattern(config.env, /RESOURCE_NAME/i)?.value;
  const baseURL = resolveBaseUrl(config);

  if (!resourceName && !baseURL) {
    throw new Error(
      `Missing Azure resource name for "${config.id}". Set ${formatEnvList(config.env ?? [])}.`,
    );
  }

  return (createFn?.({
    apiKey: apiKeyMatch.value,
    resourceName,
    baseURL: resourceName ? undefined : baseURL,
  }) ?? providerExport) as ModelProviderEntry;
};

const buildAmazonBedrockProvider: ProviderAdapter = (config, moduleExports) => {
  const createFn = getModuleFunction(moduleExports, "createAmazonBedrock");
  const providerExport = resolveProviderExport(moduleExports, "bedrock");

  if (!createFn && !providerExport) {
    throw new Error(`Missing Amazon Bedrock provider export in "${config.npm}".`);
  }

  return (createFn?.({
    region: getEnvValue("AWS_REGION"),
    accessKeyId: getEnvValue("AWS_ACCESS_KEY_ID"),
    secretAccessKey: getEnvValue("AWS_SECRET_ACCESS_KEY"),
    sessionToken: getEnvValue("AWS_SESSION_TOKEN"),
  }) ?? providerExport) as ModelProviderEntry;
};

const buildGoogleVertexProvider: ProviderAdapter = (config, moduleExports) => {
  const createFn = getModuleFunction(moduleExports, "createVertex");
  const providerExport = resolveProviderExport(moduleExports, "vertex");

  if (!createFn && !providerExport) {
    throw new Error(`Missing Google Vertex provider export in "${config.npm}".`);
  }

  return (createFn?.({
    project: resolveEnvByPattern(config.env, /PROJECT/i)?.value,
    location: resolveEnvByPattern(config.env, /LOCATION/i)?.value,
    apiKey: getEnvValue("GOOGLE_VERTEX_API_KEY"),
  }) ?? providerExport) as ModelProviderEntry;
};

const buildGatewayProvider: ProviderAdapter = (config, moduleExports) => {
  const createFn =
    getModuleFunction(moduleExports, "createGatewayProvider") ??
    getModuleFunction(moduleExports, "createGateway");
  const providerExport = resolveProviderExport(moduleExports, "gateway");

  if (!createFn && !providerExport) {
    throw new Error(`Missing Gateway provider export in "${config.npm}".`);
  }

  const apiKeyMatch = requireApiKey(config);
  const baseURL = resolveBaseUrl(config);

  return (createFn?.({ apiKey: apiKeyMatch.value, baseURL }) ??
    providerExport) as ModelProviderEntry;
};

const buildVercelProvider: ProviderAdapter = (config, moduleExports) => {
  const createFn = getModuleFunction(moduleExports, "createVercel");
  const providerExport = resolveProviderExport(moduleExports, "vercel");

  if (!createFn && !providerExport) {
    throw new Error(`Missing Vercel provider export in "${config.npm}".`);
  }

  const apiKeyMatch = requireApiKey(config);
  const baseURL = resolveBaseUrl(config);

  return (createFn?.({ apiKey: apiKeyMatch.value, baseURL }) ??
    providerExport) as ModelProviderEntry;
};

const buildWorkersAIProvider: ProviderAdapter = (config, moduleExports) => {
  const createFn = getModuleFunction(moduleExports, "createWorkersAI");
  if (!createFn) {
    throw new Error(`Missing createWorkersAI export in "${config.npm}".`);
  }

  const accountId = resolveEnvByPattern(config.env, /ACCOUNT_ID/i)?.value;
  const apiKeyMatch = requireApiKey(config);

  if (!accountId) {
    throw new Error(
      `Missing account ID for "${config.id}". Set ${formatEnvList(config.env ?? [])}.`,
    );
  }

  return createFn({ accountId, apiKey: apiKeyMatch.value }) as ModelProviderEntry;
};

const buildSapProvider: ProviderAdapter = (config, moduleExports) => {
  const createFn = getModuleFunction(moduleExports, "createSAPAIProvider");
  const providerExport = resolveProviderExport(moduleExports, "sapai");

  if (!createFn && !providerExport) {
    throw new Error(`Missing SAP AI provider export in "${config.npm}".`);
  }

  return (createFn?.() ?? providerExport) as ModelProviderEntry;
};

const buildOllamaProvider: ProviderAdapter = (config, moduleExports) => {
  const createFn = getModuleFunction(moduleExports, "createOllama");
  const providerExport = resolveProviderExport(moduleExports, "ollama");

  if (!createFn && !providerExport) {
    throw new Error(`Missing Ollama provider export in "${config.npm}".`);
  }

  return (createFn?.() ?? providerExport) as ModelProviderEntry;
};

const PACKAGE_ADAPTERS: Record<string, ProviderAdapter> = {
  "@ai-sdk/openai-compatible": buildOpenAICompatibleProvider,
  "@ai-sdk/openai": buildApiKeyProvider("createOpenAI", "openai"),
  "@ai-sdk/anthropic": buildApiKeyProvider("createAnthropic", "anthropic"),
  "@ai-sdk/google": buildApiKeyProvider("createGoogleGenerativeAI", "google"),
  "@ai-sdk/groq": buildApiKeyProvider("createGroq", "groq"),
  "@ai-sdk/mistral": buildApiKeyProvider("createMistral", "mistral"),
  "@ai-sdk/xai": buildApiKeyProvider("createXai", "xai"),
  "@ai-sdk/perplexity": buildApiKeyProvider("createPerplexity", "perplexity"),
  "@ai-sdk/cohere": buildApiKeyProvider("createCohere", "cohere"),
  "@ai-sdk/deepinfra": buildApiKeyProvider("createDeepInfra", "deepinfra"),
  "@ai-sdk/togetherai": buildApiKeyProvider("createTogetherAI", "togetherai"),
  "@ai-sdk/cerebras": buildApiKeyProvider("createCerebras", "cerebras"),
  "@aihubmix/ai-sdk-provider": buildApiKeyProvider("createAihubmix", "aihubmix"),
  "@gitlab/gitlab-ai-provider": buildApiKeyProvider("createGitLab", "gitlab"),
  "@ai-sdk/azure": buildAzureProvider,
  "@ai-sdk/amazon-bedrock": buildAmazonBedrockProvider,
  "@ai-sdk/google-vertex": buildGoogleVertexProvider,
  "@ai-sdk/gateway": buildGatewayProvider,
  "@ai-sdk/vercel": buildVercelProvider,
  "@mymediset/sap-ai-provider": buildSapProvider,
  "workers-ai-provider": buildWorkersAIProvider,
  "ollama-ai-provider-v2": buildOllamaProvider,
};

const splitModelId = (value: string): { providerId: string; modelId: string } => {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Model id is required.");
  }

  const slashIndex = trimmed.indexOf("/");
  if (slashIndex !== -1) {
    const providerId = trimmed.slice(0, slashIndex).trim();
    const modelId = trimmed.slice(slashIndex + 1).trim();
    if (!providerId || !modelId) {
      throw new Error(`Invalid model id "${value}". Use "provider/model".`);
    }
    return { providerId: normalizeProviderId(providerId), modelId };
  }

  const colonIndex = trimmed.indexOf(":");
  if (colonIndex !== -1) {
    const providerId = trimmed.slice(0, colonIndex).trim();
    const modelId = trimmed.slice(colonIndex + 1).trim();
    if (!providerId || !modelId) {
      throw new Error(`Invalid model id "${value}". Use "provider/model".`);
    }
    return { providerId: normalizeProviderId(providerId), modelId };
  }

  throw new Error(`Invalid model id "${value}". Use "provider/model".`);
};

export class ModelProviderRegistry {
  private providers = new Map<string, LanguageModelFactory>();
  private loaders = new Map<string, ModelProviderLoader>();
  private loading = new Map<string, Promise<LanguageModelFactory>>();
  private dynamicRegistry = new Map<string, ModelProviderRegistryEntry>();
  private refreshInterval: ReturnType<typeof setInterval> | null = null;
  private lastRefreshTime: Date | null = null;
  private isRefreshing = false;
  private cacheLoadPromise: Promise<void> | null = null;
  private autoRefreshStarting = false;

  private constructor() {
    this.registerBuiltinProviders();
    void this.ensureCacheLoaded();
  }

  public static getInstance(): ModelProviderRegistry {
    if (!globalThis.___voltagent_model_provider_registry) {
      globalThis.___voltagent_model_provider_registry = new ModelProviderRegistry();
    }
    return globalThis.___voltagent_model_provider_registry;
  }

  private createProviderLoader(config: ModelProviderRegistryEntry): ModelProviderLoader {
    const providerId = normalizeProviderId(config.id);
    return async () => {
      try {
        const moduleExports = (await import(config.npm)) as Record<string, unknown>;
        const adapter = PACKAGE_ADAPTERS[config.npm];
        if (!adapter) {
          const fallback = resolveProviderExport(
            moduleExports,
            config.id.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()),
          );
          if (!fallback) {
            throw new Error(`Missing provider export in "${config.npm}".`);
          }
          return fallback;
        }
        return adapter(config, moduleExports);
      } catch (error) {
        const message = String(error);
        throw new Error(
          `Failed to load provider "${providerId}" from "${config.npm}". Install the package and try again. ${message}`,
        );
      }
    };
  }

  private registerProviderConfig(config: ModelProviderRegistryEntry): void {
    const providerId = normalizeProviderId(config.id);
    if (this.providers.has(providerId) || this.loaders.has(providerId)) {
      return;
    }
    this.registerProviderLoader(providerId, this.createProviderLoader(config));
  }

  private registerBuiltinProviders(): void {
    for (const config of STATIC_PROVIDER_REGISTRY) {
      this.registerProviderConfig(config);
    }
  }

  private getRegistryEntry(providerId: string): ModelProviderRegistryEntry | undefined {
    const normalizedId = normalizeProviderId(providerId);
    return this.dynamicRegistry.get(normalizedId) ?? STATIC_PROVIDER_MAP.get(normalizedId);
  }

  private ensureCacheLoaded(): Promise<void> {
    if (getEnvValue("NODE_ENV") === "production") {
      return Promise.resolve();
    }
    if (!this.cacheLoadPromise) {
      this.cacheLoadPromise = this.loadCachedSnapshot().catch((error) => {
        console.warn("[ModelProviderRegistry] Failed to load cached registry:", error);
      });
    }
    return this.cacheLoadPromise;
  }

  private async loadCachedSnapshot(): Promise<void> {
    const snapshot = await readRegistrySnapshotFromDisk();
    if (!snapshot) {
      return;
    }

    for (const entry of Object.values(snapshot.providers)) {
      const providerId = normalizeProviderId(entry.id);
      this.dynamicRegistry.set(providerId, entry);
      this.registerProviderConfig(entry);
    }

    const parsedDate = new Date(snapshot.updatedAt);
    if (!Number.isNaN(parsedDate.getTime())) {
      this.lastRefreshTime = parsedDate;
    }
  }

  public getLastRefreshTime(): Date | null {
    return this.lastRefreshTime;
  }

  public async refreshRegistry(force = false): Promise<void> {
    if (this.isRefreshing && !force) {
      return;
    }

    this.isRefreshing = true;
    try {
      const { entries, providerModels } = await fetchModelsDevRegistry();
      for (const entry of entries) {
        const providerId = normalizeProviderId(entry.id);
        const existing = this.getRegistryEntry(providerId);
        if (!existing) {
          this.dynamicRegistry.set(providerId, entry);
          this.registerProviderConfig(entry);
          continue;
        }

        if (!areRegistryEntriesEqual(existing, entry)) {
          this.dynamicRegistry.set(providerId, entry);
          this.registerProviderConfig(entry);
        }
      }

      const refreshTime = new Date();
      this.lastRefreshTime = refreshTime;
      const snapshot = buildRegistrySnapshot(entries, providerModels, refreshTime);
      await writeRegistrySnapshotToDisk(snapshot);
    } finally {
      this.isRefreshing = false;
    }
  }

  public startAutoRefresh(intervalMs = DEFAULT_AUTO_REFRESH_INTERVAL_MS): void {
    if (this.refreshInterval || this.autoRefreshStarting) {
      return;
    }

    if (typeof fetch !== "function") {
      console.warn("[ModelProviderRegistry] Auto-refresh disabled (fetch unavailable).");
      return;
    }

    const resolvedIntervalMs =
      Number.isFinite(intervalMs) && intervalMs > 0 ? intervalMs : DEFAULT_AUTO_REFRESH_INTERVAL_MS;

    this.autoRefreshStarting = true;

    const start = async () => {
      await this.ensureCacheLoaded();

      const now = Date.now();
      const lastRefresh = this.lastRefreshTime;
      const shouldRefresh = !lastRefresh || now - lastRefresh.getTime() > resolvedIntervalMs;

      if (shouldRefresh) {
        this.refreshRegistry().catch((error) => {
          console.warn("[ModelProviderRegistry] Auto-refresh failed:", error);
        });
      }

      this.refreshInterval = setInterval(() => {
        this.refreshRegistry().catch((error) => {
          console.warn("[ModelProviderRegistry] Auto-refresh failed:", error);
        });
      }, resolvedIntervalMs);

      if (this.refreshInterval.unref) {
        this.refreshInterval.unref();
      }
      this.autoRefreshStarting = false;
    };

    start().catch((error) => {
      this.autoRefreshStarting = false;
      console.warn("[ModelProviderRegistry] Auto-refresh failed to start:", error);
    });
  }

  public stopAutoRefresh(): void {
    if (!this.refreshInterval) {
      return;
    }
    clearInterval(this.refreshInterval);
    this.refreshInterval = null;
    this.autoRefreshStarting = false;
  }

  public registerProvider(providerId: string, provider: ModelProviderEntry): void {
    const normalizedId = normalizeProviderId(providerId);
    this.providers.set(normalizedId, this.normalizeProvider(provider, normalizedId));
  }

  public registerProviderLoader(providerId: string, loader: ModelProviderLoader): void {
    const normalizedId = normalizeProviderId(providerId);
    this.loaders.set(normalizedId, loader);
  }

  public unregisterProvider(providerId: string): void {
    const normalizedId = normalizeProviderId(providerId);
    this.providers.delete(normalizedId);
  }

  public listProviders(): string[] {
    const providers = new Set<string>([...this.providers.keys(), ...this.loaders.keys()]);
    return [...providers].sort();
  }

  public async resolveLanguageModel(modelId: string): Promise<LanguageModel> {
    const { providerId, modelId: resolvedModelId } = splitModelId(modelId);
    const provider = await this.getProvider(providerId);
    if (!provider) {
      const available = this.listProviders();
      const availableMessage = available.length
        ? `Available providers: ${available.join(", ")}.`
        : "No providers are registered.";
      throw new Error(`No provider registered for "${providerId}". ${availableMessage}`);
    }
    return provider(resolvedModelId);
  }

  private async getProvider(providerId: string): Promise<LanguageModelFactory | undefined> {
    const normalizedId = normalizeProviderId(providerId);
    const existing = this.providers.get(normalizedId);
    if (existing) {
      return existing;
    }

    const loader = this.loaders.get(normalizedId);
    if (!loader) {
      return undefined;
    }

    const pending = this.loading.get(normalizedId);
    if (pending) {
      return pending;
    }

    const loadPromise = loader()
      .then((provider) => {
        const normalizedProvider = this.normalizeProvider(provider, normalizedId);
        this.providers.set(normalizedId, normalizedProvider);
        return normalizedProvider;
      })
      .finally(() => {
        this.loading.delete(normalizedId);
      });

    this.loading.set(normalizedId, loadPromise);
    return loadPromise;
  }

  private normalizeProvider(
    provider: ModelProviderEntry,
    providerId: string,
  ): LanguageModelFactory {
    if (isLanguageModelFactory(provider)) {
      return provider;
    }
    if (isModelProvider(provider)) {
      return provider.languageModel.bind(provider);
    }
    throw new Error(
      `Invalid provider registration for "${providerId}". Expected a languageModel factory.`,
    );
  }
}

const isNonProduction = getEnvValue("NODE_ENV") !== "production";

if (isNonProduction) {
  ModelProviderRegistry.getInstance().startAutoRefresh(DEFAULT_AUTO_REFRESH_INTERVAL_MS);
}
