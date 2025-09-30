import { createTool } from "@voltagent/core";
import { z } from "zod";
import { sessionManager } from "../../stagehand-manager";

export const pageObserveTool = createTool({
  name: "page_observe",
  description: "Observe and find elements on a webpage using natural language",
  parameters: z.object({
    url: z.string().url().optional().describe("URL to navigate to (optional if already on a page)"),
    instruction: z.string().describe("What element to find (e.g., 'find the login button')"),
    useVision: z
      .boolean()
      .optional()
      .default(true)
      .describe("Whether to use vision model for element detection"),
  }),
  execute: async ({ url, instruction }) => {
    try {
      const stagehand = await sessionManager.ensureStagehand();
      const page = stagehand.page;

      // Navigate to the URL if provided
      if (url) {
        console.log(`Navigating to ${url}`);
        await page.goto(url, { waitUntil: "networkidle" });
        console.log(`Successfully navigated to ${url}`);
      }

      console.log(`Observing page for: ${instruction}`);

      // Use Stagehand's observe method to find elements
      const elements = await page.observe(instruction);

      if (!elements || elements.length === 0) {
        return {
          success: false,
          message: `No elements found matching: ${instruction}`,
          elements: [],
        };
      }

      console.log(`Found ${elements.length} element(s) matching the instruction`);

      return {
        success: true,
        message: `Found ${elements.length} element(s)`,
        elements: elements.map((el: any) => ({
          selector: el.selector,
          description: el.description,
          text: el.text,
        })),
        url: page.url(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Observation failed: ${errorMessage}`);
    }
  },
});
