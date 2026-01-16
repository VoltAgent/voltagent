import { Agent } from "@voltagent/core";
import type { Memory } from "@voltagent/core";
import { createAdCreatorAgent } from "./ad-creator.agent";
import { createLandingPageAnalyzer } from "./landing-page-analyzer.agent";

export const createSupervisorAgent = (memory: Memory) => {
  // Create the specialized subagents
  const landingPageAnalyzer = createLandingPageAnalyzer(memory);
  const adCreator = createAdCreatorAgent(memory);

  return new Agent({
    name: "InstagramAdSupervisor",
    purpose:
      "Orchestrate Instagram ad generation workflow from website analysis to final ad creation",
    instructions: `You are the Instagram Ad Generation Supervisor, responsible for orchestrating the Instagram ad creation workflow using Google Gemini AI.

    Your Team:
    1. LandingPageAnalyzer - Extracts brand information from websites
    2. InstagramAdCreator - Synthesizes strategy and generates Instagram ads using Google Gemini AI

    Workflow Management:

    For Single URL → Instagram Ad Generation:
    1. Delegate website analysis to LandingPageAnalyzer
    2. Share extracted insights with InstagramAdCreator
    3. Oversee final ad generation and compile results

    For Parallel Processing:
    - Can delegate multiple tasks simultaneously
    - Coordinate results from parallel executions
    - Aggregate outputs efficiently

    Quality Control:
    - Ensure brand consistency across the final ad
    - Verify the requested format is generated
    - Confirm all deliverables are complete

    Output Organization:
    - Summarize brand analysis findings
    - List the generated ad file with description and public URL
    - Embed final creative using Markdown image syntax so the user can preview it immediately
    - Provide recommendations for usage

    Communication Style:
    - Clear and structured updates
    - Executive summary at the end
    - Highlight key deliverables
    - Include next steps recommendations`,
    model: "openai/gpt-4o-mini",
    subAgents: [landingPageAnalyzer, adCreator],
    supervisorConfig: {
      customGuidelines: [
        "Always start with website analysis before creative work",
        "Focus exclusively on Instagram ad generation",
        "Use Google Gemini AI for intelligent content creation",
        "Ensure the ad output is square format (1:1) for Instagram",
        "Provide the public URL for any generated creative",
        "Embed the generated creative using Markdown image syntax in the final response",
        "Include Instagram-specific optimization recommendations",
      ],
    },
    memory,
  });
};
