import { z } from "zod";
import type { Agent } from "../agent";
import { createStep, createWorkflow } from "./proposal";

const workflow = createWorkflow({
  id: "1",
  name: "My Workflow",
  parameters: z.object({}),
  result: z.object({}),
});

const w = workflow
  .andThen(createStep(agent1))
  .andThen(createStep(agent2))
  .when((input) => someCondition(input), createStep(agent3))
  .parallel([createStep(agent4), createStep(agent5)])
  .andThen(createStep(agent6))
  .andThen(createStep(agent7));

if (process.env.NODE_ENV === "development") {
  w.andThen(createStep(agent8)).andThen(createStep(agent9)).andThen(createStep(agent10));
}

w.commit();

const runner = w.run({});

// Streaming:

const stream = runner.stream();

for await (const message of stream) {
  console.log(message);
}

// Generating:

const result = await runner.generate();
