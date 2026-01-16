import { generateObject } from "ai";
import { defineDataset } from "viteval/dataset";
import { z } from "zod";

export default defineDataset({
  name: "geography",
  data: async () => {
    const data = [];

    for (let i = 0; i < 10; i++) {
      const { object } = await generateObject({
        model: "openai/gpt-5",
        system: `
          You are an expert at generating test data for a geography agent. You will generate a geography question and the expected answer.
          Focus on questions about countries, cities, landmarks, geographical features, climate, and cultural geography.
          `,
        prompt: "Generate a geography question and the expected answer",
        schema: z.object({
          question: z.string().describe("The geography question to answer"),
          answer: z.string().describe("The answer to the geography question"),
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
