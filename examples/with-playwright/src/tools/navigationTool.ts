/**
 * @file Browser Navigation Tools
 * @description VoltAgent tools for browser navigation operations
 *
 * This module provides tools for:
 * - URL navigation (navigate)
 * - Browser history navigation (back, forward)
 * - Page refreshing
 * - Browser closing
 *
 * Each tool is created using VoltAgent's createTool() function with:
 * - Zod validation schemas for parameters
 * - Safe browser operation handling
 * - Consistent error reporting
 */

import { type ToolExecuteOptions, createTool } from "@voltagent/core";
import type { ToolExecutionContext } from "@voltagent/core";
import { z } from "zod";
import { safeBrowserOperation } from "./browserBaseTools";
import { resetBrowserState as resetBrowserStateInternal } from "./playwrightToolHandler";

/**
 * Tool for navigating to URLs
 */
export const navigationTool = createTool({
  name: "navigate",
  description: "Navigate to a URL in the browser",
  parameters: z.object({
    url: z
      .string()
      .url({ message: "Please provide a valid URL" })
      .describe("The URL to navigate to"),
    timeout: z.number().positive().optional().default(60000).describe("Timeout in milliseconds"),
    waitUntil: z
      .enum(["load", "domcontentloaded", "networkidle", "commit"])
      .optional()
      .default("load")
      .describe("Navigation wait condition"),
  }),
  execute: async (args, options) => {
    const context = options;
    if (!context?.operationContext?.userContext) {
      throw new Error("ToolExecutionContext is missing or invalid.");
    }

    return safeBrowserOperation(context, async (page) => {
      const response = await page.goto(args.url, {
        timeout: args.timeout,
        waitUntil: args.waitUntil,
      });

      return {
        result: `Navigated to ${args.url}. Status: ${response?.status()}`,
      };
    });
  },
});

/**
 * Tool for navigating back in browser history
 */
export const goBackTool = createTool({
  name: "goBack",
  description: "Navigate back in browser history",
  parameters: z.object({}),
  execute: async (_args, options?: ToolExecuteOptions) => {
    const context = options;
    if (!context?.operationContext?.userContext) {
      throw new Error("ToolExecutionContext is missing or invalid.");
    }
    return safeBrowserOperation(context, async (page) => {
      await page.goBack();
      return { result: "Navigated back in browser history" };
    });
  },
});

/**
 * Tool for navigating forward in browser history
 */
export const goForwardTool = createTool({
  name: "goForward",
  description: "Navigate forward in browser history",
  parameters: z.object({}),
  execute: async (_args, options?: ToolExecuteOptions) => {
    const context = options;
    if (!context?.operationContext?.userContext) {
      throw new Error("ToolExecutionContext is missing or invalid.");
    }
    return safeBrowserOperation(context, async (page) => {
      await page.goForward();
      return { result: "Navigated forward in browser history" };
    });
  },
});

/**
 * Tool for refreshing the current page
 */
export const refreshPageTool = createTool({
  name: "refreshPage",
  description: "Refresh the current page",
  parameters: z.object({}),
  execute: async (_args, options?: ToolExecuteOptions) => {
    const context = options;
    if (!context?.operationContext?.userContext) {
      throw new Error("ToolExecutionContext is missing or invalid.");
    }
    return safeBrowserOperation(context, async (page) => {
      await page.reload();
      return { result: "Page refreshed successfully" };
    });
  },
});

/**
 * Tool for closing the browser
 */
export const closeBrowserTool = createTool({
  name: "closeBrowser",
  description: "Close the current browser instance",
  parameters: z.object({}),
  execute: async (_args, options?: ToolExecuteOptions) => {
    const context = options;
    if (!context?.operationContext) {
      console.warn("Attempting to close browser with missing operationContext.");
      return { result: "Browser context missing, nothing to close." };
    }
    await resetBrowserStateInternal(context.operationContext);
    return { result: "Browser closed." };
  },
});
