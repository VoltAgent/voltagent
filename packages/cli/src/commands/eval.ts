import fs from "node:fs";
import path from "node:path";
import { type EvalDatasetDetail, VoltOpsRestClient } from "@voltagent/sdk";
import chalk from "chalk";
import type { Command } from "commander";
import inquirer from "inquirer";
import ora from "ora";
import { fetchDatasetFromVoltOps } from "../services/eval/dataset-fetch";
import {
  datasetsEqual,
  readDatasetFile,
  readDatasetFileFromPath,
  resolveDatasetFilePath,
  writeDatasetFile,
} from "../services/eval/dataset-loader";
import { pushDatasetToVoltOps } from "../services/eval/dataset-push";
import { runExperimentCli } from "../services/eval/run-experiment";
import { resolveAuthConfig } from "../utils/config";

const ensureFileExists = (filePath: string): void => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Dataset file not found at ${filePath}`);
  }
};

const parsePositiveInteger = (value: string): number => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error("Value must be a positive integer.");
  }
  return parsed;
};

const buildAlternateFilePath = (basePath: string): string => {
  const { dir, name, ext } = path.parse(basePath);
  let index = 0;
  const extension = ext || ".json";
  let candidate = path.join(dir, `${name}-remote${extension}`);
  while (fs.existsSync(candidate)) {
    index += 1;
    candidate = path.join(dir, `${name}-remote-${index}${extension}`);
  }
  return candidate;
};

const promptDatasetDetail = async (sdk: VoltOpsRestClient): Promise<EvalDatasetDetail> => {
  const spinner = ora("Loading datasets from VoltOps").start();
  try {
    const datasets = await sdk.listDatasets();
    spinner.stop();

    if (!datasets.length) {
      throw new Error("No datasets found in VoltOps project. Create a dataset before pulling.");
    }

    const choices = datasets
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((dataset) => ({
        name: `${dataset.name} (${dataset.versionCount} version${dataset.versionCount === 1 ? "" : "s"})`,
        value: dataset.id,
        short: dataset.name,
      }));

    const answers = await inquirer.prompt<{ datasetId: string }>([
      {
        type: "list",
        name: "datasetId",
        message: "Select a dataset to pull",
        choices,
      },
    ]);

    const detailSpinner = ora("Loading dataset detail").start();
    try {
      const detail = await sdk.getDataset(answers.datasetId);
      detailSpinner.stop();
      if (!detail) {
        throw new Error(`Dataset with id ${answers.datasetId} could not be retrieved.`);
      }
      return detail;
    } catch (error) {
      detailSpinner.fail("Failed to load dataset detail");
      throw error;
    }
  } catch (error) {
    spinner.fail("Failed to load dataset list");
    throw error;
  }
};

const resolveDatasetDetail = async (
  sdk: VoltOpsRestClient,
  criteria: { datasetId?: string; datasetName?: string },
): Promise<EvalDatasetDetail> => {
  if (criteria.datasetId) {
    const spinner = ora(`Loading dataset ${criteria.datasetId}`).start();
    try {
      const detail = await sdk.getDataset(criteria.datasetId);
      spinner.stop();
      if (!detail) {
        throw new Error(`Dataset with id ${criteria.datasetId} not found.`);
      }
      return detail;
    } catch (error) {
      spinner.fail(`Failed to load dataset ${criteria.datasetId}`);
      throw error;
    }
  }

  if (criteria.datasetName) {
    const spinner = ora(`Loading dataset ${criteria.datasetName}`).start();
    try {
      const detail = await sdk.getDatasetByName(criteria.datasetName);
      spinner.stop();
      if (!detail) {
        throw new Error(`Dataset named "${criteria.datasetName}" not found.`);
      }
      return detail;
    } catch (error) {
      spinner.fail(`Failed to load dataset ${criteria.datasetName}`);
      throw error;
    }
  }

  return await promptDatasetDetail(sdk);
};

const selectVersionId = async (detail: EvalDatasetDetail): Promise<string> => {
  const versions = (detail.versions ?? []).slice();
  if (versions.length === 0) {
    throw new Error(`Dataset ${detail.name} has no versions available to pull.`);
  }

  versions.sort((a, b) => {
    if (typeof b.version === "number" && typeof a.version === "number") {
      return b.version - a.version;
    }
    return new Date(b.createdAt).valueOf() - new Date(a.createdAt).valueOf();
  });

  if (versions.length === 1) {
    return versions[0].id;
  }

  const choices = versions.map((version) => {
    const label = version.description ? ` — ${version.description}` : "";
    const versionLabel =
      typeof version.version === "number" ? `v${version.version}` : version.id.slice(0, 8);
    return {
      name: `${versionLabel} • ${version.itemCount} items${label}`,
      value: version.id,
      short: versionLabel,
    };
  });

  const answers = await inquirer.prompt<{ versionId: string }>([
    {
      type: "list",
      name: "versionId",
      message: `Select a version to pull for ${detail.name}`,
      choices,
      default: choices[0]?.value,
    },
  ]);

  return answers.versionId;
};

export const registerEvalCommand = (program: Command): void => {
  const evalCommand = program
    .command("eval")
    .description("Dataset management and evaluation helpers");

  const datasetCommand = evalCommand.command("dataset").description("Dataset related helpers");

  datasetCommand
    .command("push")
    .description("Push a local dataset JSON file to VoltOps")
    .requiredOption("--name <datasetName>", "Dataset name to sync")
    .option("--file <datasetFile>", "Path to dataset JSON file")
    .action(async (options: { name?: string; file?: string }) => {
      const datasetName = options.name ?? process.env.VOLTAGENT_DATASET_NAME;

      if (!datasetName) {
        throw new Error(
          "Dataset name is required. Provide --name or set VOLTAGENT_DATASET_NAME in your environment.",
        );
      }

      const spinner = ora("Preparing dataset payload").start();
      try {
        const auth = await resolveAuthConfig({ promptIfMissing: true });

        const datasetPath = resolveDatasetFilePath(datasetName, {
          filePath: options.file,
        });
        ensureFileExists(datasetPath);

        const dataset = await readDatasetFile(datasetName, {
          filePath: options.file,
        });

        spinner.text = "Pushing dataset to VoltOps";
        const result = await pushDatasetToVoltOps({
          datasetName,
          dataset,
          auth,
        });

        spinner.succeed(
          chalk.green(
            `Dataset synced: ${datasetName} (datasetId=${result.datasetId}, versionId=${result.datasetVersionId}, items=${result.itemCount})`,
          ),
        );

        const consoleBase = (
          process.env.VOLTAGENT_CONSOLE_URL ?? "https://console.voltagent.dev"
        ).replace(/\/$/, "");
        const datasetUrl = `${consoleBase}/evals/datasets/${result.datasetId}`;
        console.log(chalk.cyan(`View dataset in VoltOps Console → ${datasetUrl}`));
      } catch (error) {
        spinner.fail("Dataset push failed");
        throw error;
      }
    });

  datasetCommand
    .command("pull")
    .description("Download a dataset version from VoltOps into .voltagent/datasets")
    .option("--name <datasetName>", "Dataset name to pull (defaults to VOLTAGENT_DATASET_NAME)")
    .option("--id <datasetId>", "Dataset ID to pull (overrides --name)")
    .option("--version <versionId>", "Dataset version ID (defaults to latest)")
    .option("--output <filePath>", "Custom output file path")
    .option("--overwrite", "Overwrite existing file if present", false)
    .option("--page-size <size>", "Number of items to fetch per request", parsePositiveInteger)
    .action(
      async (options: {
        name?: string;
        id?: string;
        version?: string;
        output?: string;
        overwrite?: boolean;
        pageSize?: number;
      }) => {
        const auth = await resolveAuthConfig({ promptIfMissing: true });
        const sdk = new VoltOpsRestClient(auth);

        const datasetDetail = await resolveDatasetDetail(sdk, {
          datasetId: options.id,
          datasetName: options.name,
        });

        let versionId = options.version ?? undefined;

        if (versionId) {
          const versionExists = (datasetDetail.versions ?? []).some(
            (version) => version.id === versionId,
          );
          if (!versionExists) {
            throw new Error(`Version ${versionId} not found in dataset ${datasetDetail.name}.`);
          }
        } else {
          versionId = await selectVersionId(datasetDetail);
        }

        const spinner = ora("Fetching dataset metadata").start();
        try {
          let totalItems: number | null = null;

          const result = await fetchDatasetFromVoltOps({
            auth,
            datasetId: datasetDetail.id,
            datasetName: datasetDetail.name,
            versionId,
            pageSize: options.pageSize,
            onProgress: (fetched, total) => {
              totalItems = total;
              if (total) {
                spinner.text = `Downloading dataset items (${fetched}/${total})`;
              } else {
                spinner.text = `Downloading dataset items (${fetched})`;
              }
            },
          });

          if (totalItems === null) {
            totalItems = result.itemCount;
          }

          spinner.stop();

          const basePath = options.output
            ? path.isAbsolute(options.output)
              ? options.output
              : path.resolve(process.cwd(), options.output)
            : resolveDatasetFilePath(result.datasetName);

          let targetPath = basePath;
          let overwritten = false;

          if (fs.existsSync(targetPath)) {
            const existingDataset = await readDatasetFileFromPath(targetPath);
            if (datasetsEqual(existingDataset, result.datasetFile)) {
              console.log(
                chalk.gray(`Dataset ${result.datasetName} is already up to date at ${targetPath}.`),
              );
              const consoleBase = (
                process.env.VOLTAGENT_CONSOLE_URL ?? "https://console.voltagent.dev"
              ).replace(/\/$/, "");
              const datasetUrl = `${consoleBase}/evals/datasets/${result.datasetId}`;
              console.log(
                chalk.cyan(
                  `VoltOps dataset remains unchanged → ${datasetUrl} (version ${result.versionId}, items ${result.itemCount})`,
                ),
              );
              return;
            }

            if (options.overwrite) {
              overwritten = true;
            } else {
              const alternativePath = buildAlternateFilePath(targetPath);
              const { action } = await inquirer.prompt<{ action: "overwrite" | "new" | "cancel" }>([
                {
                  type: "list",
                  name: "action",
                  message: `Local file ${targetPath} already exists. Choose how to proceed:`,
                  choices: [
                    { name: "Overwrite existing file", value: "overwrite" },
                    {
                      name: `Save as new file (${alternativePath})`,
                      value: "new",
                    },
                    { name: "Cancel", value: "cancel" },
                  ],
                },
              ]);

              if (action === "cancel") {
                console.log(chalk.yellow("Dataset pull cancelled."));
                return;
              }

              if (action === "overwrite") {
                overwritten = true;
              } else {
                const { newPath } = await inquirer.prompt<{ newPath: string }>([
                  {
                    type: "input",
                    name: "newPath",
                    message: "Save dataset as",
                    default: alternativePath,
                    validate: (input: string) => {
                      if (!input.trim()) {
                        return "File path cannot be empty.";
                      }
                      const absolute = path.isAbsolute(input)
                        ? input
                        : path.resolve(process.cwd(), input);
                      if (fs.existsSync(absolute)) {
                        return "File already exists. Choose a different path or enable --overwrite.";
                      }
                      return true;
                    },
                  },
                ]);

                targetPath = path.isAbsolute(newPath)
                  ? newPath
                  : path.resolve(process.cwd(), newPath);
              }
            }
          }

          const writeSpinner = ora(
            totalItems
              ? `Writing ${totalItems} items to ${targetPath}`
              : `Writing dataset to ${targetPath}`,
          ).start();

          try {
            await writeDatasetFile(targetPath, result.datasetFile);
            writeSpinner.succeed(
              chalk.green(
                `Dataset pulled: ${result.datasetName} (version ${result.versionId}) → ${targetPath}${overwritten ? " (overwritten)" : ""}`,
              ),
            );
          } catch (writeError) {
            writeSpinner.fail("Failed to write dataset file");
            throw writeError;
          }

          const consoleBase = (
            process.env.VOLTAGENT_CONSOLE_URL ?? "https://console.voltagent.dev"
          ).replace(/\/$/, "");
          const datasetUrl = `${consoleBase}/evals/datasets/${result.datasetId}`;
          console.log(
            chalk.cyan(
              `View dataset in VoltOps Console → ${datasetUrl} (version ${result.versionId}, items ${result.itemCount})`,
            ),
          );
        } catch (error) {
          if (spinner.isSpinning) {
            spinner.fail("Dataset pull failed");
          } else {
            ora().fail("Dataset pull failed");
          }
          throw error;
        }
      },
    );

  evalCommand
    .command("run")
    .description("Execute an experiment definition with VoltAgent integration")
    .requiredOption(
      "--experiment <path>",
      "Path to the experiment module (exported via createExperiment)",
    )
    .option("--dataset <name>", "Dataset name override applied at runtime")
    .option("--experiment-name <name>", "VoltOps experiment name override applied at runtime")
    .option("--tag <trigger>", "VoltOps trigger source tag override", "cli-experiment")
    .option("--concurrency <count>", "Maximum concurrent items", parsePositiveInteger)
    .option("--dry-run", "Skip VoltOps submission (local scoring only)", false)
    .action(
      async (options: {
        experiment: string;
        dataset?: string;
        experimentName?: string;
        tag?: string;
        concurrency?: number;
        dryRun?: boolean;
      }) => {
        const experimentPath = path.isAbsolute(options.experiment)
          ? options.experiment
          : path.resolve(process.cwd(), options.experiment);

        if (!fs.existsSync(experimentPath)) {
          throw new Error(`Experiment file not found at ${experimentPath}`);
        }

        const auth = options.dryRun
          ? undefined
          : await resolveAuthConfig({ promptIfMissing: true });

        await runExperimentCli({
          experimentPath,
          datasetOverride: options.dataset,
          experimentNameOverride: options.experimentName,
          tagOverride: options.tag,
          concurrency: options.concurrency,
          dryRun: options.dryRun,
          auth,
          cwd: process.cwd(),
        });
      },
    );
};
