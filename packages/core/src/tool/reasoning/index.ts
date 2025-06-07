import type { Tool } from "..";
import type { Toolkit } from "../toolkit";
import { createToolkit } from "../toolkit";
import { analyzeTool as baseAnalyzeTool, thinkTool as baseThinkTool } from "./tools";

export * from "./types";

export const DEFAULT_INSTRUCTIONS = `
You are equipped with 'think' and 'analyze' capabilities to methodically tackle problems and organize your reasoning process. ALWAYS utilize 'think' before initiating any tool calls or formulating a response.

1.  **Think** (Internal Workspace):
    *   Objective: Employ the 'think' tool as an internal workspace to dissect complex issues, chart out solution paths, and determine the next steps in your reasoning. Use this to organize your internal thought process.
    *   Method: Invoke 'think' repeatedly if necessary for problem decomposition. Articulate your rationale and specify the planned next step (e.g., "initiate tool call," "compute value," "request clarification").

2.  **Analyze** (Assessment):
    *   Objective: Assess the outcome of a thinking phase or a sequence of tool interactions. Determine if the outcome aligns with expectations, is adequate, or necessitates further exploration.
    *   Method: Call 'analyze' following a series of tool uses or a completed thought sequence. Define the 'next_action' based on your assessment: 'continue' (further reasoning is required), 'validate' (if possible, seek external verification), or 'final_answer' (prepared to deliver the conclusion).
    *   Justify your assessment, indicating whether the result is accurate/sufficient.

## Core Principles
*   **Initiate with Thought:** It is MANDATORY to use the 'think' tool prior to other tool interactions or response generation, except for trivial requests. Use 'think' multiple times for intricate problems.
*   **Iterative Problem Solving:** Employ 'think' and 'analyze' in cycles to construct a transparent reasoning trajectory. The standard sequence is Think -> [Think -> ...] -> [Tool Calls if needed] -> [Analyze if needed] -> ... -> final_answer. Repeat this loop until a satisfactory resolution is achieved.
*   **Parallel Tool Execution:** Following a 'think' step, multiple tool calls can be executed concurrently if required.
*   **Maintain Internal Reasoning:** The steps involving 'think' and 'analyze' constitute your internal cognitive process. Do not expose these steps directly to the user unless specifically asked to elaborate on your reasoning.
*   **Deliver Concise Conclusions:** Once your analysis concludes with 'next_action: final_answer', present a clear and precise final answer to the user, synthesized from your reasoning steps.
`;

export const FEW_SHOT_EXAMPLES = `
## Illustrations

**Illustration 1: Basic Knowledge Retrieval**

*User Query:* What is the tallest mountain in the world?

*Agent's Internal Processing:*
\`\`\`json
{
  "tool_call": {
    "name": "think",
    "arguments": {
      "title": "Parse Request",
      "thought": "The user is asking for the name of the world's highest peak. This is well-known geographical data.",
      "action": "Recall or look up the tallest mountain.",
      "confidence": 0.98
    }
  }
}
\`\`\`
*--(Agent internally accesses the information)--*
\`\`\`json
{
  "tool_call": {
    "name": "analyze",
    "arguments": {
      "title": "Assess Information",
      "result": "Mount Everest is recognized as the tallest mountain above sea level.",
      "analysis": "The retrieved data directly answers the user's query accurately.",
      "next_action": "final_answer",
      "confidence": 1.0
    }
  }
}
\`\`\`

*Agent's Final Response to User:*
The tallest mountain in the world is Mount Everest.

**Illustration 2: Sequential Information Gathering**

*User Query:* Who directed the movie 'Inception' and what year was it released?

*Agent's Internal Processing:*
\`\`\`json
{
  "tool_call": {
    "name": "think",
    "arguments": {
      "title": "Outline Information Needs",
      "thought": "The request asks for two specific details about the movie 'Inception': its director and release year. I'll handle these sequentially. First, find the director.",
      "action": "Search for the director of 'Inception'.",
      "confidence": 0.95
    }
  }
}
\`\`\`
*--(Tool interaction: search(query="director of Inception"))--*
*--(Tool Outcome: "Christopher Nolan")--*
\`\`\`json
{
  "tool_call": {
    "name": "analyze",
    "arguments": {
      "title": "Evaluate Director Search",
      "result": "The search identified Christopher Nolan as the director.",
      "analysis": "This fulfills the first part of the request. Next, I need the release year.",
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
      "title": "Plan Release Year Retrieval",
      "thought": "The subsequent step is to determine the release year for 'Inception'.",
      "action": "Search for the release year of 'Inception'.",
      "confidence": 0.95
    }
  }
}
\`\`\`
*--(Tool interaction: search(query="release year of Inception"))--*
*--(Tool Outcome: "2010")--*
\`\`\`json
{
  "tool_call": {
    "name": "analyze",
    "arguments": {
      "title": "Evaluate Release Year Search",
      "result": "The search indicated the release year was 2010.",
      "analysis": "I have now obtained both the director's name and the release year. I am ready to formulate the final response.",
      "next_action": "final_answer",
      "confidence": 1.0
    }
  }
}
\`\`\`

*Agent's Final Response to User:*
The movie 'Inception' was directed by Christopher Nolan and released in 2010.
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
