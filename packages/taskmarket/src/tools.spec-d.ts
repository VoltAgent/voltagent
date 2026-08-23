import { Agent } from "@voltagent/core";
import { expectTypeOf } from "vitest";
import { createTaskmarketRequesterToolkit } from "./tools";
import type { TaskmarketCliRunner } from "./types";

declare const runner: TaskmarketCliRunner;

const toolkit = createTaskmarketRequesterToolkit({
  requesterAddress: "0x1111111111111111111111111111111111111111",
  maximumSpendUsdc: "10",
  cliRunner: runner,
});

const agent = new Agent({
  name: "taskmarket-requester",
  instructions: "Delegate only after explicit approval.",
  model: "openai/gpt-4o-mini",
  tools: [toolkit],
});

expectTypeOf(agent).toBeObject();
