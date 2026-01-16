---
"@voltagent/core": minor
---

feat: add eval feedback helper for onResult callbacks and VoltOps feedback client support

Example usage:

```ts
import { Agent, buildScorer } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

const taskTypeScorer = buildScorer({
  id: "task-type",
  label: "Task Type",
})
  .score(async ({ payload }) => {
    const text = String(payload.input ?? payload.output ?? "");
    const label = text.toLowerCase().includes("billing") ? "billing" : "general";
    return {
      score: label === "billing" ? 1 : 0.5,
      metadata: { label },
    };
  })
  .build();

const agent = new Agent({
  name: "support",
  model: openai("gpt-4o-mini"),
  eval: {
    scorers: {
      taskType: {
        scorer: taskTypeScorer,
        onResult: async ({ result, feedback }) => {
          await feedback.save({
            key: "task_type",
            value: result.metadata?.label ?? null,
            score: result.score ?? null,
            feedbackSourceType: "model",
            feedbackSource: { type: "model", metadata: { scorerId: result.scorerId } },
          });
        },
      },
    },
  },
});
```

LLM judge example:

```ts
import { Agent, buildScorer } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const judgeModel = openai("gpt-4o-mini");
const judgeSchema = z.object({
  score: z.number().min(0).max(1),
  label: z.string(),
  reason: z.string().optional(),
});

const satisfactionJudge = buildScorer({
  id: "satisfaction-judge",
  label: "Satisfaction Judge",
})
  .score(async ({ payload }) => {
    const prompt = `Score user satisfaction (0-1) and label it.
User: ${payload.input}
Assistant: ${payload.output}`;
    const judge = new Agent({
      name: "satisfaction-judge",
      model: judgeModel,
      instructions: "Return JSON with score and label.",
    });
    const response = await judge.generateObject(prompt, judgeSchema);
    return {
      score: response.object.score,
      metadata: {
        label: response.object.label,
        reason: response.object.reason ?? null,
      },
    };
  })
  .build();

const agent = new Agent({
  name: "support",
  model: openai("gpt-4o-mini"),
  eval: {
    scorers: {
      satisfaction: {
        scorer: satisfactionJudge,
        onResult: async ({ result, feedback }) => {
          await feedback.save({
            key: "satisfaction",
            value: result.metadata?.label ?? null,
            score: result.score ?? null,
            comment: result.metadata?.reason ?? null,
            feedbackSourceType: "model",
          });
        },
      },
    },
  },
});
```
