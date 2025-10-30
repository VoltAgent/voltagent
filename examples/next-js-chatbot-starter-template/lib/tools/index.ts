/**
 * Tools Registry
 *
 * Central export point for all agent tools.
 * Add new tools here to make them available to agents.
 */

export { calculatorTool } from "./calculator";
export { dateTimeTool } from "./datetime";
export { randomNumberTool } from "./random";

// Export as array for easy agent configuration
import { calculatorTool } from "./calculator";
import { dateTimeTool } from "./datetime";
import { randomNumberTool } from "./random";

export const defaultTools = [calculatorTool, dateTimeTool, randomNumberTool];
