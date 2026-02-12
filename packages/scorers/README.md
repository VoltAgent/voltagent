# @voltagent/scorers

Re-export of the prebuilt scorer utilities used by Viteval. These scorers originate from the Viteval project and are surfaced here so VoltAgent components can depend on them without pulling the full Viteval toolchain.

```ts
import {
  scorers,
  createAnswerCorrectnessScorer,
  createToolCallAccuracyScorerCode,
} from "@voltagent/scorers";
```
