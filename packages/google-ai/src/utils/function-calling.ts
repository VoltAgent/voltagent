import { FunctionCallingConfigMode } from "@google/genai";
import type { FunctionCall, FunctionDeclaration, FunctionResponse } from "@google/genai";
import type { BaseTool } from "@voltagent/core";
import { z } from "zod";
import type { GoogleTool, GoogleToolConfig } from "../types";
import { type ZodFunction, functionDeclarationFromZodFunction } from "./schema_helper";

/**
 * Creates a default tool configuration
 */
export function createDefaultToolConfig(): GoogleToolConfig {
  return {
    functionCallingConfig: {
      // Let the model decide whether to call a function or not
      mode: FunctionCallingConfigMode.AUTO,
    },
  };
}

/**
 * Converts tools using functionDeclarationFromZodFunction and creates tool configuration for Google's GenAI.
 */
export function prepareToolsForGoogleSDK(
  tools: BaseTool[],
  vertexai = false,
): {
  tools: GoogleTool;
  toolConfig: GoogleToolConfig;
} {
  const functionDeclarations: FunctionDeclaration[] = tools.map((tool) => {
    const paramsSchema = tool.parameters;

    const zodFunctionSchema = z
      .function()
      .args(paramsSchema) // functionDeclarationFromZodFunction expects a single ZodObject or ZodVoid for parameters
      .returns(z.void()) // Assuming tools don't have a defined return schema in this context or it's void
      .describe(tool.description);

    const zodFunctionInput: ZodFunction = {
      name: tool.name,
      zodFunctionSchema: zodFunctionSchema,
    };

    // Utility function to convert ZodFunction to FunctionDeclaration from Google AI SDK
    return functionDeclarationFromZodFunction(vertexai, zodFunctionInput);
  });

  return {
    tools: { functionDeclarations },
    toolConfig: createDefaultToolConfig(),
  };
}

/**
 * Executes a list of function calls requested by the model using the provided tools.
 * Supports parallel execution of tool calls.
 *
 * @param functionCalls - Array of FunctionCall objects from the Gemini API response.
 * @param tools - Array of BaseTool objects available for execution.
 * @returns A Promise that resolves to an array of FunctionResponse objects.
 */
export async function executeFunctionCalls(
  functionCalls: FunctionCall[],
  tools: BaseTool[],
): Promise<FunctionResponse[]> {
  // Create an array of promises for each function call execution
  const executionPromises = functionCalls.map(async (functionCall) => {
    const { name, args } = functionCall;
    const id = functionCall.id || name;

    // Ensure required fields are present
    if (!name) {
      console.error("Function call is missing required 'name' field:", functionCall);
      // Returning a FunctionResponse indicating an error might be complex as 'id' is also needed.
      // Throwing might be better, or logging and skipping. Let's log and construct a minimal error response if possible.
      return {
        id: id || `error-${Date.now()}`, // Generate a placeholder ID if missing
        name: name || "unknown", // Use 'unknown' if name is missing
        response: { error: "Function call is missing required 'name' field." },
      };
    }
    if (!id) {
      console.error("Function call is missing required 'id' field:", functionCall);
      return {
        id: `error-${Date.now()}`, // Generate a placeholder ID
        name: name,
        response: { error: "Function call is missing required 'id' field." },
      };
    }

    const tool = tools.find((t) => t.name === name);
    if (!tool) {
      console.error(`Tool with name "${name}" not found.`);
      return {
        id: id,
        name: name,
        response: { error: `Tool with name "${name}" not found.` },
      };
    }

    // Execute the tool
    try {
      const result = await tool.execute(args || {}); // Pass args or an empty object

      // Format the success response
      return {
        id: id,
        name: name,
        response: { output: result },
      };
    } catch (error) {
      console.error(`[GoogleGenAIProvider] Error executing tool "${name}":`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        id: id,
        name: name,
        response: { error: errorMessage },
      };
    }
  });

  // Wait for all tool executions to complete
  const responses = await Promise.all(executionPromises);

  return responses;
}
