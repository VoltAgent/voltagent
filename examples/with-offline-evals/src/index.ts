import { VoltOpsClient } from "@voltagent/core";
import { runExperiment } from "@voltagent/evals";
import experiment from "./experiments/offline.experiment.js";

async function main() {
  try {
    const result = await runExperiment(experiment, {
      onProgress: ({ completed, total }) => {
        const label = total !== undefined ? `${completed}/${total}` : `${completed}`;
        console.log(`[with-offline-evals] processed ${label} items`);
      },
      voltOpsClient: new VoltOpsClient({}),
    });

    console.log(
      "Summary:",
      {
        success: result.summary.successCount,
        failures: result.summary.failureCount,
        errors: result.summary.errorCount,
        meanScore: result.summary.meanScore,
        passRate: result.summary.passRate,
      },
      result,
    );
  } catch (error) {
    console.error(error);
  }
}

main().catch((error) => {
  console.error("Experiment run failed:", error);
  process.exitCode = 1;
});
