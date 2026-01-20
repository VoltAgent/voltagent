---
"@voltagent/evals": patch
---

feat: allow `runExperiment` to accept a `VoltOpsClient` directly by adapting it for dataset resolution when needed.

```ts
import { VoltOpsClient } from "@voltagent/sdk";
import { runExperiment } from "@voltagent/evals";
import experiment from "./experiments/support-nightly.experiment";

const voltOpsClient = new VoltOpsClient({
  publicKey: process.env.VOLTAGENT_PUBLIC_KEY,
  secretKey: process.env.VOLTAGENT_SECRET_KEY,
});

const result = await runExperiment(experiment, {
  voltOpsClient,
  concurrency: 4,
});
```
