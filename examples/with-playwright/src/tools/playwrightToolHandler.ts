/**
 * @file Playwright Browser Management
 * @description Handles browser lifecycle management, initialization, and cleanup
 *
 * This module provides core browser functionality for VoltAgent Playwright tools:
 * - Maintains global browser state (browser, context, page)
 * - Ensures browser is available when needed with ensureBrowser()
 * - Provides clean browser state reset with resetBrowserState()
 * - Supports different browser types (chromium, firefox, webkit)
 * - Preserves browser state between tool invocations when possible
 */

import type { OperationContext } from "@voltagent/core";
import { type Browser, type Page, chromium, firefox, webkit } from "playwright";

// Define keys for storing browser/page in userContext
const BROWSER_INSTANCE_KEY = Symbol("playwrightBrowserInstance");
const PAGE_INSTANCE_KEY = Symbol("playwrightPageInstance");
const INITIALIZING_KEY = Symbol("playwrightInitializing");

/**
 * Ensures a browser instance is available within the operation's context
 * and returns it along with an active page.
 * Manages initialization lock within the context.
 */
export async function ensureBrowser(
  context: OperationContext,
): Promise<{ browser: Browser; page: Page }> {
  const userCtx = context.userContext;

  // Use context-specific lock
  if (userCtx.get(INITIALIZING_KEY)) {
    console.log("Browser initialization in progress for this context, waiting...");
    while (userCtx.get(INITIALIZING_KEY)) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  let browserInstance = userCtx.get(BROWSER_INSTANCE_KEY) as Browser | undefined;
  let pageInstance = userCtx.get(PAGE_INSTANCE_KEY) as Page | undefined;

  // Check if browser is already initialized *in this context*
  if (!browserInstance || !browserInstance.isConnected()) {
    try {
      userCtx.set(INITIALIZING_KEY, true);
      console.log(`[${context.operationId}] Launching new browser instance for context...`);

      // Launch a new browser
      browserInstance = await chromium.launch({
        headless: process.env.NODE_ENV === "production", // Headless in prod
        slowMo: 50, // Slightly adjusted slowMo
      });

      // Create a new context and page
      const browserContext = await browserInstance.newContext({
        viewport: {
          width: 1280,
          height: 720,
        },
        deviceScaleFactor: 1,
      });
      pageInstance = await browserContext.newPage();

      // Store instances in the *operation-specific* context
      userCtx.set(BROWSER_INSTANCE_KEY, browserInstance);
      userCtx.set(PAGE_INSTANCE_KEY, pageInstance);

      console.log(`[${context.operationId}] Browser launched successfully for context.`);
    } catch (error) {
      console.error(`[${context.operationId}] Failed to initialize browser for context:`, error);
      // Clean up partial state if error occurred during init
      await browserInstance?.close();
      userCtx.delete(BROWSER_INSTANCE_KEY);
      userCtx.delete(PAGE_INSTANCE_KEY);
      throw error;
    } finally {
      userCtx.set(INITIALIZING_KEY, false);
    }
  } else if (!pageInstance || pageInstance.isClosed()) {
    // Browser exists in context, but page doesn't or is closed
    console.log(`[${context.operationId}] Creating new page in existing browser context...`);
    const currentContext = browserInstance.contexts()[0]; // Assume single context per browser for simplicity
    if (!currentContext) {
      // This case shouldn't happen if browser exists but handle defensively
      console.error(`[${context.operationId}] Browser exists but has no context!`);
      throw new Error("Browser context not found");
    }
    pageInstance = await currentContext.newPage();
    userCtx.set(PAGE_INSTANCE_KEY, pageInstance); // Update context with new page
    console.log(`[${context.operationId}] New page created.`);
  }

  // Ensure instances are valid after logic
  if (!browserInstance || !pageInstance) {
    throw new Error("Failed to ensure browser and page instances within context.");
  }

  return { browser: browserInstance, page: pageInstance };
}

/**
 * Function to reset/close browser state for a specific operation context
 */
export async function resetBrowserState(context: OperationContext): Promise<void> {
  const userCtx = context.userContext;
  const browser = userCtx.get(BROWSER_INSTANCE_KEY) as Browser | undefined;

  console.log(`[${context.operationId}] Resetting browser state for context...`);
  if (browser?.isConnected()) {
    try {
      await browser.close();
      console.log(`[${context.operationId}] Browser closed successfully.`);
    } catch (error) {
      console.error(`[${context.operationId}] Error closing browser:`, error);
    }
  }

  console.log(`[${context.operationId}] Browser state reset complete for context.`);
}
