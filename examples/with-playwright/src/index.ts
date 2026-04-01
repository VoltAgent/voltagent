import VoltAgent, { Agent, Memory, type OperationContext, type AgentHooks } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import {
  assertResponseTool,
  checkTool,
  clickTool,
  closeBrowserTool,
  expectResponseTool,
  exportPdfTool,
  extractDataTool,
  getTextTool,
  getUserAgentTool,
  getVisibleHtmlTool,
  getVisibleTextTool,
  goBackTool,
  goForwardTool,
  hoverTool,
  listInteractiveElementsTool,
  navigationTool,
  pressKeyTool,
  refreshPageTool,
  saveToFileTool,
  screenshotTool,
  selectOptionTool,
  typeTool,
  uncheckTool,
  waitForElementTool,
} from "./tools";
import { resetBrowserState as resetBrowserStateInternal } from "./tools/playwrightToolHandler";

// Create logger
const logger = createPinoLogger({
  name: "with-playwright",
  level: "info",
});

// Create Memory with LibSQL adapter for persistent memory
const memory = new Memory({
  storage: new LibSQLMemoryAdapter({
    url: "file:./.voltagent/memory.db",
  }),
});

// Create a specialized agent for browsing
export const browserAgent = new Agent({
  name: "Browser Agent",
  instructions: "You are an AI agent specialized in web automation with Playwright.",
  model: "mistral/mistral-large-latest",

  hooks: {
    onEnd: async ({ context }) => {
      console.log(`[${context.operationId}] Operation finished. Cleaning up browser state...`);
      // Call the reset function from the handler using the operation context
      await resetBrowserStateInternal(context);
    },
  },
  tools: [
    // Navigation tools
    navigationTool,
    goBackTool,
    goForwardTool,
    refreshPageTool,
    closeBrowserTool,

    //Interaction tools
    clickTool,
    typeTool,
    getTextTool,
    selectOptionTool,
    checkTool,
    uncheckTool,
    hoverTool,
    pressKeyTool,
    waitForElementTool,

    //Output tools
    saveToFileTool,
    exportPdfTool,
    extractDataTool,

    // Response tools
    expectResponseTool,
    assertResponseTool,

    // Screenshot tool
    screenshotTool,

    // User agent tools
    getUserAgentTool,

    // Visibility tools
    getVisibleTextTool,
    getVisibleHtmlTool,
    listInteractiveElementsTool,
  ],
  memory,
});

new VoltAgent({
  agents: {
    agent: browserAgent,
  },
  logger,
  server: honoServer({ port: 3141 }),
});
