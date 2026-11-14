import VoltAgent, { Agent } from "@voltagent/core";
import { biligWorkPaperPackage, createBiligWorkPaperMcpConfig } from "./mcp.js";

const mcpConfig = createBiligWorkPaperMcpConfig();
const tools = await mcpConfig.getTools();

const agent = new Agent({
  name: "Bilig WorkPaper Agent",
  instructions: [
    "You help users inspect and edit formula-backed WorkPaper files through MCP tools.",
    `The configured server runs ${biligWorkPaperPackage}.`,
    "Before changing a cell, list sheets and read the relevant input and output cells.",
    "After set_cell_contents, verify the dependent result with read_cell or get_cell_display_value.",
    "Do not claim success from a write alone; use recalculated readback and persisted JSON proof.",
  ].join(" "),
  model: "openai/gpt-4o-mini",
  tools,
  markdown: true,
});

new VoltAgent({
  agents: {
    agent,
  },
});
