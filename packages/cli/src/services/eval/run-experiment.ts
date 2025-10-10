import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  EXPERIMENT_DEFINITION_KIND,
  type ExperimentConfig,
  type ExperimentDatasetDescriptor,
  type ExperimentDefinition,
  type ExperimentScore,
  type ExperimentSummary,
  type RunExperimentItemEvent,
  runExperiment,
} from "@voltagent/evals";
import { VoltOpsRestClient } from "@voltagent/sdk";
import type { EvalResultStatus } from "@voltagent/sdk";
import { bundleRequire } from "bundle-require";
import chalk from "chalk";
import ora from "ora";
import type { AuthConfig } from "../../utils/config";

const DEFAULT_TRIGGER_SOURCE = "run-experiment";

export interface RunExperimentCliOptions {
  experimentPath: string;
  datasetOverride?: string;
  experimentNameOverride?: string;
  tagOverride?: string;
  dryRun?: boolean;
  concurrency?: number;
  auth?: AuthConfig;
  cwd?: string;
}

export async function runExperimentCli(options: RunExperimentCliOptions): Promise<void> {
  const spinner = ora("Loading experiment definition").start();

  try {
    const absolutePath = resolveExperimentPath(options.experimentPath, options.cwd);
    const definition = await loadExperimentDefinition(absolutePath);
    const configWithOverrides = applyOverrides(definition.config, {
      datasetName: options.datasetOverride,
      experimentName: options.experimentNameOverride,
      triggerSource: options.tagOverride,
    });

    if (options.tagOverride) {
      process.env.VOLTAGENT_TRIGGER_SOURCE = options.tagOverride;
    }
    if (options.datasetOverride) {
      process.env.VOLTAGENT_DATASET_NAME = options.datasetOverride;
    }
    if (options.dryRun) {
      process.env.VOLTAGENT_DISABLE_REMOTE_SUBMIT = "1";
    }

    const voltOpsClient =
      options.dryRun || !options.auth
        ? undefined
        : new VoltOpsRestClient({
            baseUrl: options.auth.baseUrl,
            publicKey: options.auth.publicKey,
            secretKey: options.auth.secretKey,
          });

    const basics = describeExperimentBasics(configWithOverrides, absolutePath);
    const experimentName = basics.experimentName;
    const datasetName = basics.datasetName;
    let voltOpsExperimentName = basics.voltOpsExperimentName;
    const concurrencyLevel = Math.max(1, Math.trunc(options.concurrency ?? 1) || 1);

    let latestCompleted = 0;
    let totalItems: number | undefined;
    let lastItemDetail: string | null = null;
    let experimentMeta: VoltOpsExperimentInfo | null = null;

    renderRunBanner({
      experimentName,
      datasetName,
      voltOpsExperimentName,
      concurrency: concurrencyLevel,
      dryRun: Boolean(options.dryRun),
      triggerTag:
        options.tagOverride ?? configWithOverrides.voltOps?.triggerSource ?? DEFAULT_TRIGGER_SOURCE,
      datasetLimit: configWithOverrides.dataset?.limit,
      autoCreate: configWithOverrides.experiment?.autoCreate !== false,
    });

    const refreshSpinner = () => {
      spinner.text = buildSpinnerText({
        experimentName,
        datasetName,
        voltOpsExperimentName,
        completed: latestCompleted,
        total: totalItems,
        lastItem: lastItemDetail,
        concurrency: concurrencyLevel,
      });
    };

    refreshSpinner();

    const result = await runExperiment(configWithOverrides, {
      voltOpsClient,
      concurrency: options.concurrency,
      onItem: (event) => {
        if (totalItems === undefined && event.summary.totalCount) {
          totalItems = event.summary.totalCount;
        }
        lastItemDetail = describeLastItem(event, totalItems);
        latestCompleted = event.summary.completedCount;
        refreshSpinner();
      },
      onProgress: ({ completed, total }) => {
        latestCompleted = completed;
        if (total !== undefined) {
          totalItems = total;
        }
        refreshSpinner();
      },
    });

    experimentMeta = extractVoltOpsExperimentMetadata(result.metadata);
    if (experimentMeta?.name) {
      voltOpsExperimentName = experimentMeta.name;
    }

    latestCompleted = result.summary.completedCount;
    totalItems = result.summary.totalCount;
    refreshSpinner();

    spinner.succeed(
      chalk.green(
        `Experiment completed (${result.summary.completedCount}/${result.summary.totalCount} items processed)`,
      ),
    );

    logSummary(result.summary);

    if (experimentMeta) {
      const label = experimentMeta.name ?? experimentMeta.id ?? "unnamed";
      if (experimentMeta.created) {
        console.log(chalk.green(`Created VoltOps experiment ${chalk.cyan(label)}`));
      }

      if (experimentMeta.name && !experimentMeta.id && !experimentMeta.autoCreateAttempted) {
        console.log(
          chalk.yellow(
            `VoltOps experiment "${experimentMeta.name}" was not found. Run results are not linked.`,
          ),
        );
      }

      if (experimentMeta.autoCreateAttempted && !experimentMeta.autoCreateSupported) {
        const reason =
          experimentMeta.autoCreateReason ??
          "VoltOps experiment auto-create is not supported by the current client";
        console.log(chalk.yellow(`VoltOps experiment auto-create unavailable: ${reason}`));
      } else if (experimentMeta.autoCreateAttempted && experimentMeta.autoCreateReason) {
        console.log(
          chalk.yellow(`VoltOps experiment auto-create: ${experimentMeta.autoCreateReason}`),
        );
      }
    } else if (voltOpsClient && configWithOverrides.experiment?.name) {
      console.log(
        chalk.yellow(
          `VoltOps experiment "${configWithOverrides.experiment.name}" was not linked. Provide an experiment id or enable autoCreate.`,
        ),
      );
    }

    if (voltOpsClient && result.runId) {
      const consoleBase = (
        process.env.VOLTAGENT_CONSOLE_URL ?? "https://console.voltagent.dev"
      ).replace(/\/$/, "");
      const runUrl = `${consoleBase}/evals/runs?runId=${result.runId}`;
      console.log("");
      console.log(
        chalk.bgBlue.white.bold(" VoltOps "),
        chalk.blueBright(
          experimentMeta?.name ? `Experiment ${experimentMeta.name} →` : "View run results →",
        ),
        chalk.cyan(runUrl),
      );
    }
  } catch (error) {
    spinner.fail(chalk.red("Experiment run failed"));
    throw error;
  }
}

function resolveExperimentPath(filePath: string, cwd?: string): string {
  const base = cwd ?? process.cwd();
  const absolute = path.isAbsolute(filePath) ? filePath : path.resolve(base, filePath);
  if (!fs.existsSync(absolute)) {
    throw new Error(`Experiment file not found at ${absolute}`);
  }
  return absolute;
}

async function loadExperimentDefinition(filePath: string): Promise<ExperimentDefinition> {
  const imported = await loadModule(filePath);

  const candidate =
    (imported as Record<string, unknown>).default ??
    (imported as Record<string, unknown>).experiment ??
    (imported as Record<string, unknown>).definition ??
    imported;

  if (candidate && typeof candidate === "object" && candidate.kind === EXPERIMENT_DEFINITION_KIND) {
    return candidate as ExperimentDefinition;
  }

  throw new Error(
    "Provided module does not export a valid experiment definition. Use `createExperiment(...)`.",
  );
}

async function loadModule(filePath: string): Promise<unknown> {
  if (isTypeScriptModule(filePath)) {
    const { mod } = await bundleRequire({
      filepath: filePath,
      cwd: path.dirname(filePath),
    });
    return mod;
  }

  const moduleUrl = pathToFileURL(filePath).href;
  return await import(moduleUrl);
}

function isTypeScriptModule(filePath: string): boolean {
  if (filePath.endsWith(".d.ts")) {
    return false;
  }

  const extension = path.extname(filePath).toLowerCase();
  return (
    extension === ".ts" || extension === ".tsx" || extension === ".mts" || extension === ".cts"
  );
}

interface OverrideOptions {
  datasetName?: string;
  experimentName?: string;
  triggerSource?: string;
}

function applyOverrides(config: ExperimentConfig, overrides: OverrideOptions): ExperimentConfig {
  const voltOps = {
    ...(config.voltOps ?? {}),
    triggerSource: overrides.triggerSource ?? config.voltOps?.triggerSource,
  };

  const dataset = applyDatasetOverride(config.dataset, overrides.datasetName);
  const experiment = applyExperimentOverride(config.experiment, overrides.experimentName);

  return {
    ...config,
    dataset,
    voltOps,
    experiment,
  };
}

function applyDatasetOverride(
  dataset: ExperimentDatasetDescriptor | undefined,
  nameOverride?: string,
): ExperimentDatasetDescriptor | undefined {
  if (!dataset) {
    return undefined;
  }

  if (!nameOverride) {
    return dataset;
  }

  return {
    ...dataset,
    name: nameOverride,
  };
}

function applyExperimentOverride(
  experiment: ExperimentConfig["experiment"] | undefined,
  nameOverride?: string,
): ExperimentConfig["experiment"] | undefined {
  if (!nameOverride) {
    return experiment;
  }

  const trimmedName = nameOverride.trim();
  if (!trimmedName) {
    return experiment;
  }

  if (!experiment) {
    return {
      name: trimmedName,
      autoCreate: true,
    };
  }

  return {
    ...experiment,
    name: trimmedName,
  };
}

interface RunBannerContext {
  experimentName: string;
  datasetName: string | null;
  voltOpsExperimentName: string | null;
  concurrency: number;
  dryRun: boolean;
  triggerTag: string;
  datasetLimit?: number;
  autoCreate: boolean;
}

interface VoltOpsExperimentInfo {
  id: string | null;
  name: string | null;
  created: boolean;
  autoCreateAttempted: boolean;
  autoCreateSupported: boolean;
  autoCreateReason: string | null;
}

function renderRunBanner(context: RunBannerContext): void {
  const rows: Array<[string, string]> = [];

  rows.push(["Experiment", chalk.cyan(context.experimentName)]);

  const datasetLabel = context.datasetName ?? "—";
  const datasetValue = context.datasetName ? chalk.cyan(datasetLabel) : chalk.gray(datasetLabel);
  rows.push(["Dataset", datasetValue]);

  if (context.datasetLimit !== undefined) {
    rows.push([
      "Dataset limit",
      context.datasetLimit > 0 ? String(context.datasetLimit) : chalk.gray("—"),
    ]);
  }

  const voltOpsParts: string[] = [];
  if (context.voltOpsExperimentName) {
    voltOpsParts.push(chalk.cyan(context.voltOpsExperimentName));
  } else {
    voltOpsParts.push(chalk.gray("—"));
  }
  if (context.autoCreate) {
    voltOpsParts.push(chalk.dim("auto-create"));
  }
  rows.push(["VoltOps experiment", voltOpsParts.join(" ")]);

  rows.push(["Concurrency", chalk.cyan(String(context.concurrency))]);

  rows.push([
    "Mode",
    context.dryRun ? chalk.yellow("dry-run (VoltOps disabled)") : chalk.cyan("VoltOps linked"),
  ]);

  if (context.triggerTag) {
    rows.push(["Trigger", chalk.cyan(context.triggerTag)]);
  }

  const labelWidth = rows.reduce((max, [label]) => Math.max(max, label.length), 0);

  console.log("");
  console.log(chalk.bold("Experiment Setup"));
  for (const [label, value] of rows) {
    console.log(`  ${chalk.dim(label.padEnd(labelWidth))}  ${value}`);
  }
  console.log("");
}

function describeExperimentBasics(
  config: ExperimentConfig,
  experimentPath: string,
): {
  experimentName: string;
  datasetName: string | null;
  voltOpsExperimentName: string | null;
} {
  const experimentName =
    (typeof config.label === "string" && config.label.trim().length > 0
      ? config.label.trim()
      : config.id?.trim()) || stripExperimentExtension(path.basename(experimentPath));

  return {
    experimentName,
    datasetName: extractDatasetLabel(config.dataset),
    voltOpsExperimentName: extractVoltOpsExperimentName(config),
  };
}

function extractDatasetLabel(descriptor: ExperimentDatasetDescriptor | undefined): string | null {
  if (!descriptor || typeof descriptor !== "object") {
    return null;
  }

  const record = descriptor as Record<string, unknown>;
  const keys = ["label", "name", "id"];
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function extractVoltOpsExperimentName(config: ExperimentConfig): string | null {
  const binding = config.experiment;
  if (!binding) {
    return null;
  }

  if (typeof binding.name === "string" && binding.name.trim().length > 0) {
    return binding.name.trim();
  }

  if (typeof binding.id === "string" && binding.id.trim().length > 0) {
    return binding.id.trim();
  }

  return null;
}

function buildSpinnerText(args: {
  experimentName: string;
  datasetName: string | null;
  voltOpsExperimentName: string | null;
  completed: number;
  total?: number;
  lastItem: string | null;
  concurrency: number;
}): string {
  const headerParts = [args.experimentName];
  if (args.datasetName) {
    headerParts.push(`dataset ${args.datasetName}`);
  }
  if (args.voltOpsExperimentName) {
    headerParts.push(`VoltOps ${args.voltOpsExperimentName}`);
  }
  if (args.concurrency > 1) {
    headerParts.push(`${args.concurrency}× concurrency`);
  }

  const progressSegments: string[] = [];
  const totalLabel =
    args.total !== undefined ? `${args.completed}/${args.total} items` : `${args.completed} items`;
  progressSegments.push(totalLabel);

  if (typeof args.total === "number" && args.total > 0) {
    const ratio = Math.min(1, Math.max(0, args.completed / args.total));
    progressSegments.push(`${Math.round(ratio * 100)}%`);
  }

  let text = `Running ${headerParts.join(" • ")} — ${progressSegments.join(" • ")}`;

  if (args.lastItem) {
    text += ` — last: ${truncateText(args.lastItem, 90)}`;
  }

  return text;
}

function describeLastItem<Item>(
  event: RunExperimentItemEvent<Item, unknown>,
  totalHint?: number,
): string {
  const total = totalHint && totalHint > 0 ? totalHint : event.summary.totalCount || undefined;
  const position = total && total > 0 ? `${event.index + 1}/${total}` : `#${event.index + 1}`;
  const statusSymbol = formatStatusSymbol(event.result.status);
  const label = extractItemLabel(event.item, event.result.itemId);
  const scoreSummary = formatPrimaryScore(event.result.scores);
  const duration = formatDuration(event.result.durationMs ?? event.result.runner.durationMs);
  const meanScore = formatScoreValue(event.summary.meanScore);

  const segments: string[] = [`${statusSymbol} ${position}`, label];
  if (scoreSummary) {
    segments.push(`score ${scoreSummary}`);
  }
  if (event.result.thresholdPassed === false) {
    segments.push("threshold miss");
  }
  if (duration) {
    segments.push(duration);
  }
  if (meanScore) {
    segments.push(`mean ${meanScore}`);
  }

  return segments.join(" • ");
}

function extractItemLabel(item: unknown, fallback: string): string {
  if (item && typeof item === "object") {
    const record = item as Record<string, unknown>;
    const keys = ["label", "name", "title", "id"];
    for (const key of keys) {
      const value = record[key];
      if (typeof value === "string" && value.trim().length > 0) {
        return value.trim();
      }
    }
  }
  return fallback;
}

function formatPrimaryScore(scores: Record<string, ExperimentScore>): string | null {
  for (const score of Object.values(scores)) {
    if (typeof score.score === "number" && Number.isFinite(score.score)) {
      const value = formatScoreValue(score.score);
      const threshold =
        typeof score.threshold === "number" && Number.isFinite(score.threshold)
          ? formatScoreValue(score.threshold)
          : null;
      if (value && threshold) {
        return `${value} (thr ${threshold})`;
      }
      if (value) {
        return value;
      }
    }
  }
  return null;
}

function formatScoreValue(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  if (value >= 0 && value <= 1) {
    return `${Math.round(value * 100)}%`;
  }

  const abs = Math.abs(value);
  if (abs < 10) {
    return value.toFixed(2);
  }
  if (abs < 100) {
    return value.toFixed(1);
  }
  return value.toFixed(0);
}

function formatDuration(durationMs?: number | null): string | null {
  if (durationMs === null || durationMs === undefined || !Number.isFinite(durationMs)) {
    return null;
  }

  if (durationMs >= 1000) {
    const seconds = durationMs / 1000;
    if (seconds >= 10) {
      return `${seconds.toFixed(1)}s`;
    }
    return `${seconds.toFixed(2)}s`;
  }

  return `${Math.max(1, Math.round(durationMs))}ms`;
}

function formatStatusSymbol(status: EvalResultStatus | string): string {
  switch (status) {
    case "passed":
      return "✓";
    case "failed":
      return "✗";
    case "error":
      return "⚠";
    default:
      return "•";
  }
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, Math.max(0, maxLength - 1))}…`;
}

function stripExperimentExtension(value: string): string {
  return value.replace(/\.(?:c|m)?[tj]s$/i, "");
}

function extractVoltOpsExperimentMetadata(
  metadata: Record<string, unknown> | null | undefined,
): VoltOpsExperimentInfo | null {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const voltOps = (metadata as Record<string, unknown>).voltOps;
  if (!voltOps || typeof voltOps !== "object") {
    return null;
  }

  const experiment = (voltOps as Record<string, unknown>).experiment;
  if (!experiment || typeof experiment !== "object") {
    return null;
  }

  const record = experiment as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id : null;
  const name = typeof record.name === "string" ? record.name : null;
  const created = Boolean(record.created);
  const autoCreateAttempted = Boolean(record.autoCreateAttempted);
  const autoCreateSupported = record.autoCreateSupported !== false;
  const autoCreateReason =
    typeof record.autoCreateReason === "string" ? record.autoCreateReason : null;

  if (!id && !name && !autoCreateAttempted) {
    return null;
  }

  return {
    id,
    name,
    created,
    autoCreateAttempted,
    autoCreateSupported,
    autoCreateReason,
  };
}

function logSummary(summary: ExperimentSummary): void {
  const {
    successCount,
    failureCount,
    errorCount,
    completedCount,
    totalCount,
    meanScore,
    passRate,
  } = summary;

  console.log("");
  console.log(chalk.bold("Summary"));
  console.log(`  Completed: ${completedCount}/${totalCount}`);
  console.log(chalk.green(`  Success: ${successCount}`));
  if (failureCount) {
    console.log(chalk.yellow(`  Failures: ${failureCount}`));
  }
  if (errorCount) {
    console.log(chalk.red(`  Errors: ${errorCount}`));
  }
  if (meanScore !== null && meanScore !== undefined) {
    console.log(`  Mean score: ${meanScore.toFixed(3)}`);
  }
  if (passRate !== null && passRate !== undefined) {
    console.log(`  Pass rate: ${(passRate * 100).toFixed(1)}%`);
  }
  console.log("");
}
