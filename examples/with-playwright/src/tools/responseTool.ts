/**
 * @file Browser Response Tools
 * @description Tools for handling and asserting network responses
 */

import { type ToolExecuteOptions, createTool } from "@voltagent/core";
import type { ToolExecutionContext } from "@voltagent/core";
import { z } from "zod";
import { safeBrowserOperation } from "./browserBaseTools";

/**
 * Tool for setting up response wait operations
 */
export const expectResponseTool = createTool({
  name: "expectResponse",
  description: "Waits for a network response matching a URL pattern.",
  parameters: z.object({
    urlPattern: z
      .string()
      .describe("A glob pattern, regex, or predicate function to match the response URL."),
    timeout: z
      .number()
      .positive()
      .optional()
      .default(30000)
      .describe("Maximum time in milliseconds to wait for the response."),
    // status: z.number().optional().describe("Expected status code of the response."), // Predicate function is more flexible
  }),
  execute: async (args, options?: ToolExecuteOptions) => {
    const context = options as ToolExecutionContext;
    if (!context?.operationContext?.userContext) {
      throw new Error("ToolExecutionContext is missing or invalid.");
    }
    return safeBrowserOperation(context, async (page) => {
      try {
        const response = await page.waitForResponse(args.urlPattern, {
          timeout: args.timeout,
        });
        // Optional: Check status if needed, though waitForResponse doesn't directly filter by it.
        // if (args.status && response.status() !== args.status) {
        //   throw new Error(`Expected status ${args.status} but received ${response.status()} for ${response.url()}`);
        // }
        return {
          result: `Response received from URL matching pattern: ${args.urlPattern}. Status: ${response.status()}`,
          status: response.status(),
          url: response.url(),
        };
      } catch (error: any) {
        if (error.name === "TimeoutError") {
          return {
            result: `Timeout: No response received matching pattern ${args.urlPattern} within ${args.timeout}ms.`,
          };
        }
        throw error; // Re-throw other errors
      }
    });
  },
});

/**
 * Tool for asserting and validating responses
 */
export const assertResponseTool = createTool({
  name: "assertResponse",
  description:
    "Asserts properties of the last received network response (or a specific one by URL).",
  parameters: z.object({
    expectedStatus: z.number().optional().describe("Expected HTTP status code."),
    expectedBodyContains: z
      .string()
      .optional()
      .describe("Substring expected to be present in the response body."),
    urlPattern: z
      .string()
      .optional()
      .describe("Optional URL pattern to identify a specific response if needed."),
    timeout: z
      .number()
      .positive()
      .optional()
      .default(5000)
      .describe("Timeout if waiting for a specific response."),
  }),
  execute: async (args, options?: ToolExecuteOptions) => {
    const context = options as ToolExecutionContext;
    if (!context?.operationContext?.userContext) {
      throw new Error("ToolExecutionContext is missing or invalid.");
    }
    return safeBrowserOperation(context, async (page) => {
      let targetResponse: any = null; // Consider using Playwright's Response type

      if (args.urlPattern) {
        // Wait for a specific response if pattern provided
        try {
          targetResponse = await page.waitForResponse(args.urlPattern, { timeout: args.timeout });
        } catch (error: any) {
          if (error.name === "TimeoutError") {
            return {
              result: `Timeout: No response received matching ${args.urlPattern} for assertion.`,
            };
          }
          throw error;
        }
      } else {
        // How to reliably get the "last" response needs a better mechanism.
        // Playwright doesn't directly expose a "last response" easily.
        // This might require listening to response events and storing them in context.
        // For now, this part is non-functional.
        console.warn("assertResponse without urlPattern is not reliably implemented.");
        return {
          result:
            "Assertion failed: Cannot reliably determine the last response without a URL pattern.",
        };
      }

      let assertionsPassed = true;
      const failureMessages: string[] = [];

      // Assert Status Code
      if (args.expectedStatus !== undefined) {
        if (targetResponse.status() !== args.expectedStatus) {
          assertionsPassed = false;
          failureMessages.push(
            `Expected status ${args.expectedStatus}, but got ${targetResponse.status()}.`,
          );
        }
      }

      // Assert Body Content
      if (args.expectedBodyContains !== undefined) {
        try {
          const body = await targetResponse.text();
          if (!body.includes(args.expectedBodyContains)) {
            assertionsPassed = false;
            failureMessages.push(`Response body did not contain "${args.expectedBodyContains}".`);
          }
        } catch (error) {
          assertionsPassed = false;
          failureMessages.push(
            `Failed to read response body: ${error instanceof Error ? error.message : error}`,
          );
        }
      }

      return {
        result: assertionsPassed
          ? "All assertions passed."
          : `Assertions failed: ${failureMessages.join(" ")}`,
        passed: assertionsPassed,
        failures: failureMessages,
      };
    });
  },
});

/**
 * Export all response tools as a group
 */
export const responseTools = {
  expectResponseTool,
  assertResponseTool,
};
