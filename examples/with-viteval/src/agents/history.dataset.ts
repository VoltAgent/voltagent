import { generateObject } from "ai";
import { defineDataset } from "viteval/dataset";
import { z } from "zod";

export default defineDataset({
  name: "history",
  data: async () => {
    const data = [];

    for (let i = 0; i < 10; i++) {
      const { object } = await generateObject({
        model: "openai/gpt-5",
        system: `
          You are an expert at generating test data for a history agent. You will generate a history question and the expected answer.
          Focus on questions about historical events, people, places, time periods, and cultural history.
          `,
        prompt: "Generate a history question and the expected answer",
        schema: z.object({
          question: z.string().describe("The history question to answer"),
          answer: z.string().describe("The answer to the history question"),
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
