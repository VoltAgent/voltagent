/**
 * Tools Registry
 *
 * Central export point for all agent tools.
 * Add new tools here to make them available to agents.
 */

export { calculatorTool } from "./calculator";
export { dateTimeTool } from "./datetime";
export { randomNumberTool } from "./random";

// Export as a ToolSet for agent configuration. Tool names come from object keys.
import { calculatorTool } from "./calculator";
import { dateTimeTool } from "./datetime";
import { randomNumberTool } from "./random";

export const defaultTools = {
  calculator: calculatorTool,
  getDateTime: dateTimeTool,
  generateRandomNumber: randomNumberTool,
};
