// Test script with ES modules
import { InMemoryStorage } from "@voltagent/core";

async function test() {
  const memory = new InMemoryStorage();

  // Check if getUIMessages exists
  console.log("getUIMessages available:", typeof memory.getUIMessages);

  // Try to get messages
  try {
    const messages = await memory.getUIMessages({
      userId: "test-user",
      conversationId: "test-conv",
    });
    console.log("Messages retrieved:", messages);
  } catch (error) {
    console.error("Error:", error);
  }
}

test();
