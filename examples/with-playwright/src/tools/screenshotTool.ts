/**
 * @file Browser Screenshot Tools
 * @description VoltAgent tools for capturing screenshots in browser
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { createTool } from "@voltagent/core";
import type { OperationContext } from "@voltagent/core";
import { z } from "zod";
import { safeBrowserOperation } from "./browserBaseTools";

/**
 * Tool for capturing a screenshot of the current page
 */
export const screenshotTool = createTool({
  name: "takeScreenshot",
  description: "Takes a screenshot of the current page.",
  parameters: z.object({
    filename: z
      .string()
      .optional()
      .describe(
        "Optional path to save the screenshot file. If not provided, returns base64 string.",
      ),
    fullPage: z
      .boolean()
      .optional()
      .default(false)
      .describe("Take screenshot of the full scrollable page."),
    quality: z
      .number()
      .min(0)
      .max(100)
      .optional()
      .describe("JPEG quality (0-100). Only for JPEG format."),
    type: z.enum(["png", "jpeg"]).optional().default("png").describe("Image format."),
    timeout: z
      .number()
      .positive()
      .optional()
      .default(30000)
      .describe("Maximum time in milliseconds for the screenshot operation."),
  }),
  execute: async (args, oc?: OperationContext) => {
    if (!oc?.context) {
      throw new Error("OperationContext is missing or invalid.");
    }
    return safeBrowserOperation(oc, async (page) => {
      const screenshotOptions: Parameters<typeof page.screenshot>[0] = {
        fullPage: args.fullPage,
        quality: args.quality,
        type: args.type,
        timeout: args.timeout,
      };

      if (args.filename) {
        const dir = path.dirname(args.filename);
        try {
          await fs.access(dir);
        } catch (error: any) {
          if (error.code === "ENOENT") {
            await fs.mkdir(dir, { recursive: true });
          } else {
            throw error;
          }
        }
        screenshotOptions.path = args.filename;
        await page.screenshot(screenshotOptions);
        return { result: `Screenshot saved to ${args.filename}` };
      }
      const buffer = await page.screenshot(screenshotOptions);
      return {
        result: "Screenshot taken successfully.",
        base64Image: buffer.toString("base64"),
      };
    });
  },
});

/**
 * Export all screenshot tools as a group
 */
export const screenshotTools = {
  screenshotTool,
};
