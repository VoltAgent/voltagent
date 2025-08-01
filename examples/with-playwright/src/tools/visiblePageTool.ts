/**
 * @file Browser Visible Page Tools
 * @description Tools for working with visible elements on the page
 */

import { type ToolExecuteOptions, createTool } from "@voltagent/core";
import type { ToolExecutionContext } from "@voltagent/core";
import { z } from "zod";
import { safeBrowserOperation } from "./browserBaseTools";

/**
 * Tool for getting all visible text on a page
 */
export const getVisibleTextTool = createTool({
  name: "getVisibleText",
  description: "Extracts all visible text content from the current page body.",
  parameters: z.object({}),
  execute: async (_args, options?: ToolExecuteOptions) => {
    const context = options as ToolExecutionContext;
    if (!context?.operationContext?.userContext) {
      throw new Error("ToolExecutionContext is missing or invalid.");
    }
    return safeBrowserOperation(context, async (page) => {
      const visibleText = await page.evaluate(() => document.body.innerText);
      return {
        result: "Extracted visible text from the page.",
        text: visibleText,
      };
    });
  },
});

/**
 * Tool for getting the visible HTML content of the current page
 */
export const getVisibleHtmlTool = createTool({
  name: "getVisibleHtml",
  description: "Gets the HTML structure of the page body.",
  parameters: z.object({}),
  execute: async (_args, options?: ToolExecuteOptions) => {
    const context = options as ToolExecutionContext;
    if (!context?.operationContext?.userContext) {
      throw new Error("ToolExecutionContext is missing or invalid.");
    }
    return safeBrowserOperation(context, async (page) => {
      const pageHtml = await page.content();
      return {
        result: "Retrieved HTML structure.",
        rawHtml: pageHtml,
      };
    });
  },
});

/**
 * Tool for listing visible interactive elements
 */
export const listInteractiveElementsTool = createTool({
  name: "listInteractiveElements",
  description: "Lists interactive elements like buttons, links, and inputs visible on the page.",
  parameters: z.object({}),
  execute: async (_args, options?: ToolExecuteOptions) => {
    const context = options as ToolExecutionContext;
    if (!context?.operationContext?.userContext) {
      throw new Error("ToolExecutionContext is missing or invalid.");
    }
    return safeBrowserOperation(context, async (page) => {
      const interactiveElements = await page.evaluate(() => {
        const selectors =
          "a[href], button, input, select, textarea, [role='button'], [role='link']";
        const elements = Array.from(document.querySelectorAll(selectors));
        // Simplify elements for the response
        return elements.map((el) => ({
          tag: el.tagName.toLowerCase(),
          text: el.textContent?.trim().slice(0, 100),
          attributes: Object.fromEntries(
            Array.from(el.attributes).map((attr) => [attr.name, attr.value]),
          ),
        }));
      });
      return {
        result: `Found ${interactiveElements.length} interactive elements.`,
        elements: interactiveElements,
      };
    });
  },
});

/**
 * Get User Agent Tool (Moved from userAgentTool.ts)
 */
export const getUserAgentTool = createTool({
  name: "getUserAgent",
  description: "Gets the current user agent string of the browser.",
  parameters: z.object({}),
  execute: async (_args, options?: ToolExecuteOptions) => {
    const context = options as ToolExecutionContext;
    if (!context?.operationContext?.userContext) {
      throw new Error("ToolExecutionContext is missing or invalid.");
    }
    return safeBrowserOperation(context, async (page) => {
      const userAgent = await page.evaluate(() => navigator.userAgent);
      return {
        result: `Current user agent: ${userAgent}`,
        userAgent: userAgent,
      };
    });
  },
});

/**
 * Export all visible page tools as a group
 */
export const visiblePageTools = {
  getVisibleTextTool,
  getVisibleHtmlTool,
  listInteractiveElementsTool,
  getUserAgentTool,
};
