import { openai } from "@ai-sdk/openai";
import VoltAgent, { Agent } from "@voltagent/core";

/**
 * This example demonstrates multi-agent coordination using agent.toTool()
 *
 * We create three specialized agents:
 * 1. Writer Agent - Writes blog post content
 * 2. Editor Agent - Edits and improves content
 * 3. Publisher Agent - Coordinates the other agents
 *
 * The Publisher agent uses Writer and Editor as tools, enabling
 * a multi-agent workflow where one agent delegates to others.
 */

// Create a writer agent that writes blog posts
const writerAgent = new Agent({
  id: "writer",
  name: "Blog Writer",
  purpose: "Writes engaging blog post content on any topic",
  instructions: `You are a skilled blog writer who creates engaging, informative content.
    When given a topic, write a comprehensive blog post with:
    - An attention-grabbing introduction
    - Well-structured body paragraphs
    - A strong conclusion
    Keep it around 400-500 words.`,
  model: openai("gpt-4o-mini"),
  temperature: 0.7,
});

// Create an editor agent that improves and polishes content
const editorAgent = new Agent({
  id: "editor",
  name: "Content Editor",
  purpose: "Edits and improves blog post content for clarity and engagement",
  instructions: `You are an expert content editor who improves blog posts.
    When given content, enhance it by:
    - Improving clarity and flow
    - Adding compelling transitions
    - Ensuring proper grammar and punctuation
    - Making the content more engaging
    Return ONLY the edited content, no explanations.`,
  model: openai("gpt-4o-mini"),
  temperature: 0.5,
});

// Create a publisher agent that coordinates the workflow
const publisherAgent = new Agent({
  id: "publisher",
  name: "Publishing Coordinator",
  instructions: `You are a publishing coordinator who manages the blog creation workflow.

    When asked to create a blog post:
    1. First, call the writer_tool with the topic to get the initial draft
    2. Then, call the editor_tool with the draft to get the polished version
    3. Return the final polished blog post

    Always use both tools in sequence. Be concise in your coordination.`,
  model: openai("gpt-4o-mini"),
  // Convert specialized agents to tools that the publisher can use
  tools: [writerAgent.toTool(), editorAgent.toTool()],
  maxSteps: 10, // Allow enough steps for tool calls
});

new VoltAgent({
  agents: { publisherAgent, editorAgent, writerAgent },
});
