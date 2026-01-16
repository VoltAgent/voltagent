import { generateObject } from "ai";
import { defineDataset } from "viteval/dataset";
import { z } from "zod";

export default defineDataset({
  name: "math",
  data: async () => {
    const data = [];

    for (let i = 0; i < 10; i++) {
      const { object } = await generateObject({
        model: "openai/gpt-5",
        system: `
          You are an expert at generating test data for a math agent. You will generate a math problem and the expected answer.
          Generate problems that can be solved with basic arithmetic operations (addition, subtraction, multiplication, division).
          `,
        prompt:
          "Generate a math problem that can be solved with basic arithmetic operations and the expected answer",
        schema: z.object({
          question: z.string().describe("The question to answer"),
          answer: z.string().describe("The answer to the question"),
        }),
      });
      data.push({
        input: object.question,
        expected: object.answer,
      });
    }

    return data;
  },
});
