import { createTool } from "@voltagent/core";
import { z } from "zod";

/**
 * Calculator Tool
 * Performs basic arithmetic calculations
 */
export const calculatorTool = createTool({
  name: "calculator",
  description:
    "Perform basic arithmetic calculations (addition, subtraction, multiplication, division, exponents, etc.)",
  parameters: z.object({
    expression: z
      .string()
      .describe("Mathematical expression to evaluate (e.g., '2 + 2', '10 * 5', '2 ** 8')"),
  }),
  execute: async ({ expression }) => {
    try {
      // Remove any potentially dangerous characters
      const sanitized = expression.replace(/[^0-9+\-*/().\s**]/g, "");

      // Evaluate the expression safely
      // biome-ignore lint/security/noGlobalEval: This is a controlled evaluation for calculator functionality with sanitized input
      const result = eval(sanitized);

      return {
        expression,
        result,
        success: true,
      };
    } catch {
      return {
        expression,
        error: "Invalid mathematical expression",
        success: false,
      };
    }
  },
});
