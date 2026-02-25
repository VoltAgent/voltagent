---
"@voltagent/evals": patch
---

fix: persist offline eval runs when using inline datasets (`dataset.items`)

Offline experiment runs now create and sync run results even when the dataset is provided inline without a managed `datasetVersionId`.

### What changed

- `VoltOpsRunManager` now allows run creation when `dataset.versionId` is missing.
- Append payload generation now normalizes `datasetItemId`:
  - UUID item IDs are sent as `datasetItemId`.
  - Non-UUID item IDs are sent as `null` and still tracked via `datasetItemHash`.

This avoids API failures when inline dataset items use string IDs like `"item-1"`.

### Example

```ts
import { createExperiment, runExperiment } from "@voltagent/evals";

const experiment = createExperiment({
  dataset: {
    name: "inline-smoke",
    items: [
      {
        id: "item-1", // non-UUID is supported
        input: "What is VoltAgent?",
        expected: "An open-source TypeScript framework for AI agents.",
      },
    ],
  },
  runner: async ({ item }) => ({ output: String(item.input) }),
});

const result = await runExperiment(experiment, { voltOpsClient });
console.log(result.runId); // now created and persisted
```
