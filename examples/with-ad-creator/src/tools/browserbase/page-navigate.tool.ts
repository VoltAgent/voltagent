import { createTool } from "@voltagent/core";
import { z } from "zod";
import { sessionManager } from "../../stagehand-manager";

export const pageNavigateTool = createTool({
  name: "page_navigate",
  description: "Navigate to a specific URL using BrowserBase",
  parameters: z.object({
    url: z.string().url().describe("The URL to navigate to"),
    waitUntil: z
      .enum(["load", "domcontentloaded", "networkidle"])
      .optional()
      .default("networkidle")
      .describe("When to consider navigation complete"),
  }),
  execute: async ({ url, waitUntil }) => {
    try {
      const stagehand = await sessionManager.ensureStagehand();
      const page = stagehand.page;

      console.log(`Navigating to ${url}`);
      await page.goto(url, { waitUntil });

      const title = await page.title();
      const currentUrl = page.url();

      console.log(`Successfully navigated to ${url}`);

      return {
        success: true,
        url: currentUrl,
        title,
        message: `Successfully navigated to ${url}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Navigation failed: ${errorMessage}`);
    }
  },
});
