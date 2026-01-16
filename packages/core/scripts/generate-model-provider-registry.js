/* eslint-disable no-console */
const fs = require("node:fs");
const path = require("node:path");
const { safeStringify } = require("../../internal/dist/utils/index.js");

const API_URL = "https://models.dev/api.json";
const OUTPUT_DIR = path.resolve(__dirname, "../src/registries");
const REGISTRY_PATH = path.join(OUTPUT_DIR, "model-provider-registry.generated.ts");
const TYPES_PATH = path.join(OUTPUT_DIR, "model-provider-types.generated.ts");

const HEADER = `/**
 * THIS FILE IS AUTO-GENERATED - DO NOT EDIT
 * Generated from ${API_URL}
 */
`;

const normalizeProviderId = (id) => id.trim();
const normalizeModelId = (id) => id.trim();

const isDeprecatedModel = (modelInfo) =>
  Boolean(modelInfo && typeof modelInfo === "object" && modelInfo.status === "deprecated");

const formatStringLiteral = (value) =>
  `'${String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;

async function fetchProviders() {
  const response = await fetch(API_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${API_URL}: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function run() {
  const data = await fetchProviders();
  const providers = Object.entries(data)
    .filter(([, info]) => info && typeof info === "object" && info.models)
    .sort(([a], [b]) => a.localeCompare(b));

  const registry = {};
  const providerModels = {};

  for (const [providerId, info] of providers) {
    const normalizedId = normalizeProviderId(info.id || providerId);

    registry[normalizedId] = {
      id: normalizedId,
      name: info.name || providerId,
      npm: info.npm,
      api: info.api,
      env: info.env,
      doc: info.doc,
    };

    const models = Object.entries(info.models)
      .filter(([, modelInfo]) => !isDeprecatedModel(modelInfo))
      .map(([modelId]) => normalizeModelId(modelId))
      .sort();

    providerModels[normalizedId] = models;
  }

  const registryContent = `${HEADER}
export type ModelProviderRegistryEntry = {
  id: string;
  name: string;
  npm: string;
  api?: string;
  env?: string[];
  doc?: string;
};

export const MODEL_PROVIDER_REGISTRY: Record<string, ModelProviderRegistryEntry> = ${safeStringify(
    registry,
    { indentation: 2 },
  )};
`;

  const providerModelLines = Object.entries(providerModels).map(([providerId, models]) => {
    const modelLines = models.map((modelId) => `    ${formatStringLiteral(modelId)},`).join("\n");
    return `  readonly ${formatStringLiteral(providerId)}: readonly [\n${modelLines}\n  ];`;
  });

  const typesContent = `${HEADER}
export type ProviderModelsMap = {
${providerModelLines.join("\n")}
};

export type ProviderId = keyof ProviderModelsMap;

export type ModelRouterModelId =
  | {
      [P in ProviderId]: \`\${P}/\${ProviderModelsMap[P][number]}\`;
    }[ProviderId]
  | (string & {});

export type ModelForProvider<P extends ProviderId> = ProviderModelsMap[P][number];
`;

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(REGISTRY_PATH, registryContent, "utf8");
  fs.writeFileSync(TYPES_PATH, typesContent, "utf8");

  console.info(
    `Generated ${path.relative(process.cwd(), REGISTRY_PATH)} and ${path.relative(
      process.cwd(),
      TYPES_PATH,
    )}`,
  );
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
