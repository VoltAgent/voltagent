import type { Agent } from "@voltagent/core";
import { Output } from "ai";
import type { z } from "zod";

type StructuredObjectOptions = {
  maxOutputTokens?: number;
};

export async function generateStructuredObject<TSchema extends z.ZodType>(
  agent: Agent,
  prompt: string,
  schema: TSchema,
  options?: StructuredObjectOptions,
): Promise<z.infer<TSchema>> {
  const response = await agent.generateText({
    prompt,
    ...(options ?? {}),
    output: Output.object({ schema }),
  });

  return response.output as z.infer<TSchema>;
}
