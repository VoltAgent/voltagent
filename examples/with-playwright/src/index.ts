import VoltAgent, { Agent, type OperationContext, type AgentHooks } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { resetBrowserState as resetBrowserStateInternal } from "./tools/playwrightToolHandler";
import {
  navigationTool,
  goBackTool,
  goForwardTool,
  refreshPageTool,
  closeBrowserTool,
  clickTool,
  typeTool,
  getTextTool,
  selectOptionTool,
  checkTool,
  uncheckTool,
  hoverTool,
  pressKeyTool,
  waitForElementTool,
  saveToFileTool,
  exportPdfTool,
  extractDataTool,
  expectResponseTool,
  assertResponseTool,
  screenshotTool,
  getUserAgentTool,
  getVisibleTextTool,
  getVisibleHtmlTool,
  listInteractiveElementsTool,
} from "./tools";
import { mistral } from "@ai-sdk/mistral";

// Create a specialized agent for browsing
export const browserAgent = new Agent({
  name: "Browser Agent",
  description: "You are an AI agent specialized in web automation with Playwright.",
  llm: new VercelAIProvider(),
  model: mistral("mistral-large-latest"),

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
});

// Create logger
const logger = createPinoLogger({
  name: "with-playwright",
  level: "info",
});

new VoltAgent({
  agents: {
    agent: browserAgent,
  },
  logger,
});
