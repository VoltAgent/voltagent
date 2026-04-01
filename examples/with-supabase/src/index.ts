import { Agent, Memory, VoltAgent } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { SupabaseMemoryAdapter } from "@voltagent/supabase"; // Import SupabaseMemory

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Supabase URL and Key must be provided in the .env file (SUPABASE_URL, SUPABASE_KEY)",
  );
}

// Initialize SupabaseMemory
const memory = new Memory({
  storage: new SupabaseMemoryAdapter({
    supabaseUrl,
    supabaseKey,
  }),
});

const agent = new Agent({
  name: "Asistant",
  instructions: "A helpful assistant that answers questions without using tools",
  model: "openai/gpt-4o-mini",
  memory: memory, // Pass the SupabaseMemory instance
});

// Create logger
const logger = createPinoLogger({
  name: "with-supabase",
  level: "info",
});

new VoltAgent({
  agents: {
    agent,
  },
  logger,
  server: honoServer({ port: 3141 }),
});
