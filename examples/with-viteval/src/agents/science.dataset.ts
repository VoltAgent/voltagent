import { generateObject } from "ai";
import { defineDataset } from "viteval/dataset";
import { z } from "zod";

export default defineDataset({
  name: "science",
  data: async () => {
    const data = [];

    for (let i = 0; i < 10; i++) {
      const { object } = await generateObject({
        model: "openai/gpt-5",
        system: `
          You are an expert at generating test data for a science agent. You will generate a science question and the expected answer.
          Focus on questions about physics, chemistry, biology, earth sciences, and scientific concepts.
          `,
        prompt: "Generate a science question and the expected answer",
        schema: z.object({
          question: z.string().describe("The science question to answer"),
          answer: z.string().describe("The answer to the science question"),
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
