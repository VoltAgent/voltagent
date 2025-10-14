import type { ExperimentDatasetItem } from "@voltagent/evals";

export interface SupportDatasetExtra extends Record<string, unknown> {
  keyword: string;
  summarySource: string;
  summaryExpected: string;
  translationSource: string;
  translationExpected: string;
  translationLanguage: string;
  contextSnippets: string[];
  entitiesExpected: string[];
  entitiesOutput: string[];
  numericBaseline: { expected: number; output: number };
  jsonBaselineExpected: Record<string, unknown>;
  jsonBaselineOutput: Record<string, unknown>;
}

export interface SupportDatasetItem extends ExperimentDatasetItem {
  input: string;
  expected: string;
  extra: SupportDatasetExtra;
}

const referenceQuestion = "How can I enable live eval scorers in VoltAgent?";
const referenceAnswer =
  "You can enable live evaluation in VoltAgent by configuring the Agent.eval field with a list of scorers.";
const referenceSummarySource =
  "VoltAgent ships with a flexible evaluation pipeline. Developers can attach scorers to agents, stream results to VoltOps, and monitor quality in real time.";
const referenceSummary =
  "VoltAgent lets you attach evaluation scorers to agents so you can monitor quality in real time.";
const referenceTranslationSource =
  "Activa las evaluaciones en vivo en VoltAgent configurando la sección eval con los scorers que necesitas.";
const referenceTranslationExpected =
  "Enable live evaluations in VoltAgent by configuring the eval section with the scorers you need.";
const referenceContextSnippets = [
  "Live scorers run asynchronously after each agent operation so latency stays low.",
  "VoltAgent forwards scorer output to VoltOps for dashboards, alerts, and annotations.",
  "You can mix heuristic scorers with LLM-based judges inside the same pipeline.",
];
const referenceEntities = ["VoltAgent", "live evaluation", "VoltOps"];
const referenceEntitiesOutput = [...referenceEntities, "extra-note"];
const referenceJson = { feature: "evals", state: "enabled" };
const referenceJsonOutput = { ...referenceJson };
const numericBaseline = { expected: 3.14, output: 3.14 };

export const SUPPORT_DATASET_NAME = "offline-live-scorers-inline";

export const supportDatasetItems: SupportDatasetItem[] = [
  {
    id: "volt-support-001",
    input: referenceQuestion,
    expected: referenceAnswer,
    extra: {
      keyword: "voltagent",
      summarySource: referenceSummarySource,
      summaryExpected: referenceSummary,
      translationSource: referenceTranslationSource,
      translationExpected: referenceTranslationExpected,
      translationLanguage: "Spanish",
      contextSnippets: referenceContextSnippets,
      entitiesExpected: referenceEntities,
      entitiesOutput: referenceEntitiesOutput,
      numericBaseline,
      jsonBaselineExpected: referenceJson,
      jsonBaselineOutput: referenceJsonOutput,
    },
  },
];
