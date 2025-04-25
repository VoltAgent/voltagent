import type { Tool } from "..";
import { thinkTool as baseThinkTool, analyzeTool as baseAnalyzeTool } from "./tools";
import type { Toolkit } from "../toolkit";
import { createToolkit } from "../toolkit";

export * from "./types";

export const DEFAULT_INSTRUCTIONS = `
You have access to the 'think' and 'analyze' tools to work through problems step-by-step and structure your thought process. You should ALWAYS 'think' before making tool calls or generating a response.

1.  **Think** (scratchpad):
    *   Purpose: Use the 'think' tool as a scratchpad to break down complex problems, outline steps, and decide on immediate actions within your reasoning flow. Use this to structure your internal monologue.
    *   Usage: Call 'think' multiple times if needed to break down the problem. Explain your reasoning and specify the intended action (e.g., "make a tool call", "perform calculation", "ask clarifying question").

2.  **Analyze** (evaluation):
    *   Purpose: Evaluate the result of a think step or a set of tool calls. Assess if the result is expected, sufficient, or requires further investigation.
    *   Usage: Call 'analyze' AFTER a set of tool calls or a thought process. Determine the 'next_action' based on your analysis: 'continue' (more reasoning needed), 'validate' (seek external confirmation/validation if possible), or 'final_answer' (ready to conclude).
    *   Explain your reasoning highlighting whether the result is correct/sufficient.

## IMPORTANT GUIDELINES
*   **Always Think First:** You MUST use the 'think' tool before making other tool calls or generating a response, unless the request is extremely simple. Use 'think' multiple times to break down complex problems.
*   **Iterate to Solve:** Use the 'think' and 'analyze' tools iteratively to build a clear reasoning path. The typical flow is Think -> [Think -> ...] -> [Tool Calls if needed] -> [Analyze if needed] -> ... -> final_answer. Repeat this cycle until you reach a satisfactory conclusion.
*   **Make multiple tool calls in parallel:** After a 'think' step, you can make multiple tool calls in parallel if needed.
*   **Keep Thoughts Internal:** The reasoning steps (thoughts and analyses) are for your internal process only. Do not share them directly with the user unless asked to explain your reasoning.
*   **Conclude Clearly:** When your analysis determines the 'next_action' is 'final_answer', provide a concise and accurate final answer to the user based on your reasoning steps.
`;

export const FEW_SHOT_EXAMPLES = `
## Examples

**Example 1: Simple Fact Retrieval**

*User Request:* How many continents are there on Earth?

*Agent's Internal Process:*
\`\`\`json
{
  "tool_call": {
    "name": "think",
    "arguments": {
      "title": "Understand Request",
      "thought": "The user wants to know the standard number of continents on Earth. This is a common piece of knowledge.",
      "action": "Recall or verify the number of continents.",
      "confidence": 0.95
    }
  }
}
\`\`\`
*--(Agent internally recalls the fact)--*
\`\`\`json
{
  "tool_call": {
    "name": "analyze",
    "arguments": {
      "title": "Evaluate Fact",
      "result": "Standard geographical models list 7 continents: Africa, Antarctica, Asia, Australia, Europe, North America, South America.",
      "analysis": "The recalled information directly answers the user's question accurately.",
      "next_action": "final_answer",
      "confidence": 1.0
    }
  }
}
\`\`\`

*Agent's Final Answer to User:*
There are 7 continents on Earth: Africa, Antarctica, Asia, Australia, Europe, North America, and South America.

**Example 2: Multi-Step Information Gathering**

*User Request:* What is the capital of France and its current population?

*Agent's Internal Process:*
\`\`\`json
{
  "tool_call": {
    "name": "think",
    "arguments": {
      "title": "Plan Information Retrieval",
      "thought": "The user needs two pieces of information: the capital of France and its current population. I should break this down. First, find the capital.",
      "action": "Search for the capital of France.",
      "confidence": 0.95
    }
  }
}
\`\`\`
*--(Tool call: search(query="capital of France"))--*
*--(Tool Result: "Paris")--*
\`\`\`json
{
  "tool_call": {
    "name": "analyze",
    "arguments": {
      "title": "Analyze Capital Search Result",
      "result": "The search result indicates Paris is the capital of France.",
      "analysis": "This provides the first piece of requested information. Now I need to find the population of Paris.",
      "next_action": "continue",
      "confidence": 1.0
    }
  }
}
\`\`\`
\`\`\`json
{
  "tool_call": {
    "name": "think",
    "arguments": {
      "title": "Plan Population Retrieval",
      "thought": "The next step is to find the current population of Paris.",
      "action": "Search for the population of Paris.",
      "confidence": 0.95
    }
  }
}
\`\`\`
*--(Tool call: search(query="population of Paris current"))--*
*--(Tool Result: "Approximately 2.1 million (city proper, estimate for early 2024)")--*
\`\`\`json
{
  "tool_call": {
    "name": "analyze",
    "arguments": {
      "title": "Analyze Population Search Result",
      "result": "The search provided an estimated population figure for Paris.",
      "analysis": "I now have both the capital and its estimated population. I can provide the final answer.",
      "next_action": "final_answer",
      "confidence": 0.9
    }
  }
}
\`\`\`

*Agent's Final Answer to User:*
The capital of France is Paris. Its estimated population (city proper) is approximately 2.1 million as of early 2024.
`;

export type CreateReasoningToolsOptions = {
  addInstructions?: boolean;
  think?: boolean;
  analyze?: boolean;
  addFewShot?: boolean;
  fewShotExamples?: string;
};

/**
 * Factory function to create a Toolkit containing reasoning tools and instructions.
 */
export const createReasoningTools = (options: CreateReasoningToolsOptions = {}): Toolkit => {
  const {
    addInstructions = true,
    think = true,
    analyze = true,
    addFewShot = true,
    fewShotExamples,
  } = options;

  const enabledTools: Tool<any>[] = [];
  let generatedInstructions: string | undefined = undefined;

  if (addInstructions) {
    generatedInstructions = `<reasoning_instructions>\n${DEFAULT_INSTRUCTIONS}`;
    if (addFewShot) {
      generatedInstructions += `\n${fewShotExamples ?? FEW_SHOT_EXAMPLES}`;
    }
    generatedInstructions += "\n</reasoning_instructions>";
  }

  if (think) {
    enabledTools.push({ ...baseThinkTool });
  }
  if (analyze) {
    enabledTools.push({ ...baseAnalyzeTool });
  }

  const reasoningToolkit = createToolkit({
    name: "reasoning_tools",
    tools: enabledTools,
    instructions: generatedInstructions,
    addInstructions: addInstructions,
  });

  return reasoningToolkit;
};
