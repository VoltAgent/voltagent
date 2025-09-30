import { createTool } from "@voltagent/core";
import { z } from "zod";
import { sessionManager } from "../../stagehand-manager";

export const pageActTool = createTool({
  name: "page_act",
  description: "Take an action on a webpage using natural language instructions",
  parameters: z.object({
    url: z.string().url().optional().describe("URL to navigate to (optional if already on a page)"),
    action: z
      .string()
      .describe("Action to perform (e.g., 'click sign in button', 'type hello in search field')"),
    useVision: z
      .boolean()
      .optional()
      .default(true)
      .describe("Whether to use vision model for action execution"),
  }),
  execute: async ({ url, action }) => {
    try {
      const stagehand = await sessionManager.ensureStagehand();
      const page = stagehand.page;

      // Navigate to the URL if provided
      if (url) {
        console.log(`Navigating to ${url}`);
        await page.goto(url, { waitUntil: "networkidle" });
        console.log(`Successfully navigated to ${url}`);
      }

      console.log(`Performing action: ${action}`);

      // Perform the action using Stagehand's act method
      await page.act(action);

      console.log(`Successfully performed: ${action}`);

      return {
        success: true,
        message: `Successfully performed: ${action}`,
        url: page.url(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Action failed: ${errorMessage}`);
    }
  },
});
