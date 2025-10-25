import { Agent } from "@voltagent/core";
import { getAIModel } from "../ai/config";
import { defaultTools } from "../tools";
import { sharedMemory } from "./memory";

/**
 * Main Chatbot Agent Configuration
 *
 * This agent uses the AI model configured in environment variables
 * and comes with default tools for common tasks.
 */
export const chatbotAgent = new Agent({
  name: "ChatbotAssistant",
  instructions: `You are a helpful and friendly AI assistant built with VoltAgent. 

Your capabilities include:
- Answering questions and providing information on various topics
- Performing mathematical calculations using the calculator tool
- Getting current date and time information (with timezone support)
- Generating random numbers within specified ranges

Guidelines:
- Be concise, helpful, and friendly in your responses
- Use the available tools when appropriate to provide accurate information
- If you're unsure about something, be honest about it
- Format your responses clearly and professionally`,

  model: getAIModel(),
  tools: defaultTools,
  memory: sharedMemory,
});
