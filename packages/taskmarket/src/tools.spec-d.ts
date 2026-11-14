import { Agent, type Toolkit } from "@voltagent/core";
import { expectTypeOf } from "vitest";
import type { TaskmarketRequester } from "./requester";
import { createTaskmarketRequesterToolkit } from "./tools";
import type {
  TaskmarketCliRunner,
  TaskmarketCreateResult,
  TaskmarketTaskPreview,
  TaskmarketTaskPreviewInput,
} from "./types";

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

type PreviewInput = Parameters<TaskmarketRequester["previewTask"]>[0];
type PreviewOutput = ReturnType<TaskmarketRequester["previewTask"]>;
type CreateOutput = Awaited<ReturnType<TaskmarketRequester["createTask"]>>;

expectTypeOf<PreviewInput>().toEqualTypeOf<TaskmarketTaskPreviewInput>();
expectTypeOf<PreviewOutput>().toEqualTypeOf<TaskmarketTaskPreview>();
expectTypeOf<CreateOutput>().toEqualTypeOf<TaskmarketCreateResult>();
expectTypeOf(toolkit).toMatchTypeOf<Toolkit>();
expectTypeOf(toolkit.tools).toMatchTypeOf<Toolkit["tools"]>();
expectTypeOf(agent).toMatchTypeOf<Agent>();
