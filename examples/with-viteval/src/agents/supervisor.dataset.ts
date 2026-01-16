import { generateObject } from "ai";
import { defineDataset } from "viteval/dataset";
import { z } from "zod";
import { categories } from "#/lib/categories";

export default defineDataset({
  name: "supervisor",
  data: async () => {
    return await Promise.all(
      categories.map(async ({ name, description }) => {
        const { object } = await generateObject({
          model: "openai/gpt-5",
          system: `
          You are an expert at generating test data. You will generate a question and the expected answer based on the provided category.
          Be succinct in you questions and answers. The question should be a single sentence, and the answer should be a single sentence or less.
          `,
          prompt: `
          Generate a question for this category: 
          
          # Category
          name: ${name}
          description: ${description}
          `,
          schema: z.object({
            question: z.string().describe("The question to answer"),
            answer: z.string().describe("The answer to the question"),
          }),
        });

        return {
          input: object.question,
          expected: object.answer,
          category: name,
        };
      }),
    );
  },
});
