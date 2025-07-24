import { Agent } from "./src/agent/agent";
import { anthropicAI } from "./src/agent/providers/anthropic-ai";
import { createPinoLogger } from "@voltagent/logger";
import { getGlobalLogBuffer } from "./src/logger";

async function testLoggerSync() {
  // Create a custom Pino logger
  const customLogger = createPinoLogger({
    name: "custom-agent",
    level: "debug",
    provider: "pino",
  });

  // Create an agent with the custom logger
  const agent = new Agent({
    id: "test-agent",
    name: "Test Agent",
    instructions: "Test agent with custom logger",
    provider: anthropicAI({ llm: { apiKey: "test-key", model: "claude-3-5-sonnet-20241022" } }),
    logger: customLogger,
  });

  // Log something with the agent
  agent.logger.info("Test log from custom agent logger", { testData: "value" });
  agent.logger.debug("Debug log from custom agent logger", { debugData: "debug-value" });

  // Wait a moment to ensure logs are processed
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Check the global log buffer
  const buffer = getGlobalLogBuffer();
  const logs = buffer.query();

  console.log("\n=== Global Log Buffer Contents ===");
  console.log("Total logs in buffer:", logs.length);

  // Filter logs from our test agent
  const testAgentLogs = logs.filter((log) => log.agentId === "test-agent");
  console.log("\nLogs from test agent:");
  testAgentLogs.forEach((log, index) => {
    console.log(`\n[${index + 1}] ${log.level.toUpperCase()}: ${log.msg}`);
    console.log(
      "  Context:",
      JSON.stringify(
        {
          agentId: log.agentId,
          component: log.component,
          modelName: log.modelName,
          testData: log.testData,
          debugData: log.debugData,
        },
        null,
        2,
      ),
    );
  });
}

testLoggerSync().catch(console.error);
