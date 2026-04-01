import "dotenv/config";
import { Agent, Memory, VoltAgent, VoltOpsClient } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { z } from "zod";
import { checkOrderStatusTool, createOrderTool, listMenuItemsTool } from "./tools";
import { handleWhatsAppMessage, handleWhatsAppVerification } from "./webhooks/whatsapp";

// Create a logger instance
const logger = createPinoLogger({
  name: "with-whatsapp",
  level: "info",
});

// Define working memory schema with Zod
const workingMemorySchema = z.object({
  orders: z
    .array(
      z.object({
        menuItemId: z.number(),
        itemName: z.string(),
        quantity: z.number(),
        price: z.number(),
      }),
    )
    .default([]),
  deliveryAddress: z.string().default(""),
  customerNotes: z.string().default(""),
  orderStatus: z.enum(["selecting", "address_needed", "completed"]).default("selecting"),
});

// Configure persistent memory with working memory enabled
const memory = new Memory({
  storage: new LibSQLMemoryAdapter({
    url: "file:./.voltagent/memory.db",
    logger: logger.child({ component: "libsql" }),
  }),
  workingMemory: {
    enabled: true,
    scope: "conversation", // Store per conversation
    schema: workingMemorySchema,
  },
});

const agent = new Agent({
  name: "with-whatsapp",
  instructions: `You are a WhatsApp ordering bot. Your task is to take food orders from customers.

Order Flow:
   - If orders array is empty, show menu
   - Ask customer to select items

2. When customer orders:
   - Get selected item details from menu
   - Keep orderStatus as "selecting"
   - Ask if they want anything else

3. When customer doesn't want more items:
   - Change orderStatus to "address_needed"
   - Ask for delivery address
   - Update deliveryAddress field when received
   - Change orderStatus to "completed"
   - Execute createOrder tool (with orders and deliveryAddress)
   - Confirm order and clear working memory

Always be friendly and helpful. Start with "Welcome!" greeting.`,
  model: "openai/gpt-4o-mini",
  tools: [listMenuItemsTool, createOrderTool, checkOrderStatusTool],
  memory,
});

new VoltAgent({
  agents: {
    agent,
  },

  server: honoServer({
    configureApp: (app) => {
      // Import webhook handlers

      // WhatsApp webhook verification (GET)
      app.get("/webhook/whatsapp", async (c) => {
        return handleWhatsAppVerification(c);
      });

      // WhatsApp webhook message handler (POST)
      app.post("/webhook/whatsapp", async (c) => {
        return handleWhatsAppMessage(c, agent);
      });

      // Health check endpoint
      app.get("/health", (c) => {
        return c.json({
          status: "healthy",
          service: "whatsapp-ordering-bot",
          timestamp: new Date().toISOString(),
        });
      });
    },
  }),
  logger,
  voltOpsClient: new VoltOpsClient({
    publicKey: process.env.VOLTAGENT_PUBLIC_KEY || "",
    secretKey: process.env.VOLTAGENT_SECRET_KEY || "",
  }),
});
