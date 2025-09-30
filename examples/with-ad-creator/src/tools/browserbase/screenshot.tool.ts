import * as fs from "node:fs/promises";
import * as path from "node:path";
import { createTool } from "@voltagent/core";
import { z } from "zod";
import { sessionManager } from "../../stagehand-manager";

export const screenshotTool = createTool({
  name: "take_screenshot",
  description: "Take a screenshot of the current page or a specific element",
  parameters: z.object({
    url: z.string().url().optional().describe("URL to navigate to (optional if already on a page)"),
    fullPage: z.boolean().optional().default(false).describe("Whether to capture the full page"),
    selector: z.string().optional().describe("CSS selector for specific element to capture"),
    filename: z.string().optional().describe("Custom filename for the screenshot"),
  }),
  execute: async ({ url, fullPage, selector, filename }, context) => {
    try {
      const stagehand = await sessionManager.ensureStagehand();
      const page = stagehand.page;

      // Navigate to the URL if provided
      if (url) {
        console.log(`Navigating to ${url}`);
        await page.goto(url, { waitUntil: "networkidle" });
        console.log(`Successfully navigated to ${url}`);
      }

      // Ensure output directory exists
      const outputDir = path.join(process.cwd(), "output", "screenshots");
      await fs.mkdir(outputDir, { recursive: true });

      // Generate filename
      const timestamp = Date.now();
      const finalFilename = filename || `screenshot_${timestamp}.png`;
      const filepath = path.join(outputDir, finalFilename);

      let screenshot: Buffer;

      if (selector) {
        // Screenshot specific element
        console.log(`Taking screenshot of element: ${selector}`);
        const element = await page.$(selector);
        if (!element) {
          throw new Error(`Element with selector "${selector}" not found`);
        }
        screenshot = await element.screenshot();
      } else {
        // Screenshot full page or viewport
        console.log(`Taking ${fullPage ? "full page" : "viewport"} screenshot`);
        screenshot = await page.screenshot({ fullPage });
      }

      // Save screenshot
      await fs.writeFile(filepath, screenshot);

      console.log(`Screenshot saved to: ${filepath}`);

      // Persist the filepath so downstream tools can reuse the latest screenshot
      context?.context.set("screenshotPath", filepath);
      context?.context.set("screenshotFilename", finalFilename);

      return {
        success: true,
        filepath,
        filename: finalFilename,
        url: page.url(),
        fullPage,
        selector,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Screenshot failed: ${errorMessage}`);
    }
  },
});
