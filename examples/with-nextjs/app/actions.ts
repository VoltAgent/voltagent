"use server";

import { agent } from "@/voltagent";

export async function calculateExpression(expression: string) {
  const result = await agent.generateText(
    `Calculate ${expression}. Only respond with the numeric result.`,
  );

  return result.text;
}
