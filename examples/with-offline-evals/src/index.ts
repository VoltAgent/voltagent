import { runExperiment } from "@voltagent/evals";
import { VoltOpsRestClient } from "@voltagent/sdk";
import experiment from "./experiments/offline.experiment.js";

async function main() {
  try {
    const result = await runExperiment(experiment, {
      onProgress: ({ completed, total }) => {
        const label = total !== undefined ? `${completed}/${total}` : `${completed}`;
        console.log(`[with-offline-evals] processed ${label} items`);
      },
      voltOpsClient: new VoltOpsRestClient({
        publicKey: process.env.VOLTAGENT_PUBLIC_KEY,
        secretKey: process.env.VOLTAGENT_SECRET_KEY,
      }),
    });

    console.log("Summary:", {
      success: result.summary.successCount,
      failures: result.summary.failureCount,
      errors: result.summary.errorCount,
      meanScore: result.summary.meanScore,
      passRate: result.summary.passRate,
    });
  } catch (error) {
    console.error(error);
  }
}

main().catch((error) => {
  console.error("Experiment run failed:", error);
  process.exitCode = 1;
});
