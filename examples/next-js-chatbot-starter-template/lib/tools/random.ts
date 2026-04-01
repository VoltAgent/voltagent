import { createTool } from "@voltagent/core";
import { z } from "zod";

/**
 * Random Number Tool
 * Generates random numbers within a specified range
 */
export const randomNumberTool = createTool({
  name: "generateRandomNumber",
  description:
    "Generate a random number within a specified range. Can generate single numbers or arrays of random numbers.",
  parameters: z.object({
    min: z.number().describe("Minimum value (inclusive)"),
    max: z.number().describe("Maximum value (inclusive)"),
    count: z
      .number()
      .optional()
      .default(1)
      .describe("Number of random numbers to generate (default: 1)"),
  }),
  execute: async ({ min, max, count = 1 }) => {
    if (min > max) {
      return {
        error: "Minimum value cannot be greater than maximum value",
        success: false,
      };
    }

    if (count < 1 || count > 100) {
      return {
        error: "Count must be between 1 and 100",
        success: false,
      };
    }

    const numbers: number[] = [];
    for (let i = 0; i < count; i++) {
      const random = Math.floor(Math.random() * (max - min + 1)) + min;
      numbers.push(random);
    }

    return {
      numbers,
      count: numbers.length,
      range: { min, max },
      success: true,
    };
  },
});
