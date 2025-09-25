---
id: 3
slug: whatsapp-ai-agent
title: WhatsApp Order Agent
description: Learn how to build an intelligent WhatsApp chatbot for food ordering with VoltAgent.
---

In this example, we'll build an intelligent WhatsApp chatbot using VoltAgent that can handle food orders through natural conversation. We'll create a complete ordering system that interacts with customers via WhatsApp, manages menu items from a database, and processes orders with full conversation context. This demonstrates the power of AI agents in building practical business applications.

You'll create a WhatsApp bot that:

- Displays menu items from a Supabase database
- Takes food orders through natural conversation
- Collects delivery addresses seamlessly
- Tracks order status in real-time
- Maintains conversation context using working memory
- Stores all orders persistently in the database

**Prerequisites**

<Info title="What you'll need">
Before starting, make sure you can log into Supabase, access the Meta developer dashboard for WhatsApp Business API, and have an OpenAI API key ready. With those in place you can move through the setup without blockers.
</Info>

Before starting, ensure you have:

- Node.js 20.19.0 or higher
- A [Supabase account](https://supabase.com) (free tier works)
- WhatsApp Business API access via [Meta for Developers](https://developers.facebook.com)
- An OpenAI API key from [platform.openai.com](https://platform.openai.com/api-keys)

### Setup

#### Get the example code

Use the VoltAgent CLI to get the WhatsApp order bot example from our repository:

```bash
npm create voltagent-app@latest -- --example with-whatsapp-order
cd my-order-bot
```

#### Install additional dependencies

Install the Supabase SDK for database operations:

```bash
npm install @supabase/supabase-js
```

#### Configure environment variables

Create a `.env` file with your API keys:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# WhatsApp Configuration
WHATSAPP_WEBHOOK_TOKEN=your_webhook_verification_token
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
WHATSAPP_PHONE_NUMBER_ID=your_whatsapp_phone_number_id

# VoltOps Platform (Optional but recommended)
VOLTAGENT_PUBLIC_KEY=your_public_key
VOLTAGENT_SECRET_KEY=your_secret_key
```

#### Set up the database

First, you'll need to set up your Supabase database:

1. **Create a Supabase account** at [supabase.com](https://supabase.com)
2. **Create a new project** in your Supabase dashboard
3. Once your project is ready, navigate to the **SQL Editor** from the sidebar
4. Run the following SQL commands to create the necessary tables for your ordering system:

For detailed Supabase setup instructions, see the [official Supabase documentation](https://supabase.com/docs/guides/getting-started).

#### Menu Items Table

```sql
CREATE TABLE public.menu_items (
  id SERIAL PRIMARY KEY,
  category VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_menu_items_category ON public.menu_items(category);
```

#### Orders Table

```sql
CREATE TABLE public.orders (
  id SERIAL PRIMARY KEY,
  customer_phone VARCHAR(20) NOT NULL,
  customer_address TEXT NOT NULL,
  total_amount NUMERIC(10, 2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'preparing',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_status ON public.orders(status);
```

#### Order Items Table

```sql
CREATE TABLE public.order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  price NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_order_items_menu_item_id ON public.order_items(menu_item_id);
```

#### Sample Menu Data

```sql
INSERT INTO menu_items (category, name, description, price) VALUES
  ('Pizza', 'Margherita', 'Fresh tomatoes, mozzarella, basil', 12.99),
  ('Pizza', 'Pepperoni', 'Pepperoni, mozzarella, tomato sauce', 14.99),
  ('Burger', 'Classic Burger', 'Beef patty, lettuce, tomato, onion', 10.99),
  ('Burger', 'Cheeseburger', 'Beef patty, cheese, lettuce, tomato', 11.99),
  ('Drinks', 'Coke', 'Coca-Cola 330ml', 2.99),
  ('Drinks', 'Water', 'Mineral water 500ml', 1.99);
```

#### Create Supabase Client

Create a `lib/supabase.ts` file to initialize the Supabase client:

```typescript
import { createClient } from "@supabase/supabase-js";

// Supabase configuration - you'll need to add these to your .env file
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

This file creates a Supabase client instance that all our tools will use to interact with the database. Make sure your environment variables are properly set in the `.env` file.

#### Start the development server

```bash
npm run dev
```

Once your server starts successfully, you'll see:

```bash
════════════════════════════════════════════
  VOLTAGENT SERVER STARTED SUCCESSFULLY
════════════════════════════════════════════
  ✓ HTTP Server: http://localhost:3141

  VoltOps Platform: https://console.voltagent.dev
════════════════════════════════════════════
[VoltAgent] All packages are up to date
```

The [VoltOps Platform](https://console.voltagent.dev) link opens automatically, allowing you to interact with and debug your WhatsApp bot in real-time.

### Building the Bot

Let's build our WhatsApp order bot step by step. We'll start by understanding the core concepts and then implement each component.

For our WhatsApp order bot, we'll create three essential tools:

1. **List Menu Items** - Fetches available food items from the database
2. **Create Order** - Processes and saves customer orders
3. **Check Order Status** - Retrieves order tracking information

![supabase table](https://cdn.voltagent.dev/examples/supabase.png)

**Understanding VoltAgent Tools:** In VoltAgent, tools are the actions your agent can perform. Think of them as functions that your AI agent can call when needed. Each tool has a single responsibility, validates inputs with Zod, returns structured responses, and surfaces clear errors so runtime behaviour stays predictable.

Let's implement each tool:

### Tool 1: List Menu Items

Our first tool retrieves available menu items from the database:

<details>
<summary>View Tool 1 Code</summary>

```typescript
import { createTool } from "@voltagent/core";
import { z } from "zod";
import { supabase } from "../../lib/supabase";

export const listMenuItemsTool = createTool({
  name: "listMenuItems",
  description: "Lists all menu items from the Supabase database",
  parameters: z.object({
    limit: z.number().optional().default(100).describe("Number of items to fetch"),
    offset: z.number().optional().default(0).describe("Number of items to skip"),
  }),
  execute: async ({ limit, offset }) => {
    try {
      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .range(offset, offset + limit - 1)
        .order("id", { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch menu items: ${error.message}`);
      }

      return {
        success: true,
        data: data || [],
        count: data?.length || 0,
        message: `Successfully fetched ${data?.length || 0} menu items`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
        data: [],
      };
    }
  },
});
```

</details>

**What this tool does:** Fetches menu items from Supabase with optional pagination, returning a structured response that keeps error handling and schema validation in one place so the agent can safely show the menu whenever a conversation starts.

### Tool 2: Create Order

The second tool processes and saves customer orders to the database:

<details>
<summary>View Tool 2 Code</summary>

```typescript
import { createTool } from "@voltagent/core";
import { z } from "zod";
import { supabase } from "../../lib/supabase";

export const createOrderTool = createTool({
  name: "createOrder",
  description: "Creates a new order with the items and delivery address from working memory",
  parameters: z.object({
    items: z
      .array(
        z.object({
          menuItemId: z.number().describe("ID of the menu item"),
          itemName: z.string().describe("Name of the menu item"),
          quantity: z.number().describe("Quantity of the item"),
          price: z.number().describe("Price per item"),
        })
      )
      .describe("List of ordered items"),
    deliveryAddress: z.string().describe("Delivery address for the order"),
    customerNotes: z.string().optional().describe("Optional customer notes for the order"),
  }),
  execute: async ({ items, deliveryAddress, customerNotes }, context) => {
    try {
      // Get customer phone from context userId
      const customerPhone = context?.userId || "unknown";

      // Calculate total amount
      const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

      // Create order in orders table
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          customer_phone: customerPhone,
          customer_address: deliveryAddress,
          total_amount: totalAmount,
          status: "preparing",
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (orderError) {
        throw new Error(`Failed to create order: ${orderError.message}`);
      }

      // Create order items in order_items table
      const orderItems = items.map((item) => ({
        order_id: orderData.id,
        menu_item_id: item.menuItemId,
        quantity: item.quantity,
        price: item.price,
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);

      if (itemsError) {
        // If order items fail, we should ideally rollback the order
        // For now, just log the error
        console.error("Order items could not be created:", itemsError);
        throw new Error(`Failed to save order items: ${itemsError.message}`);
      }

      return {
        success: true,
        orderId: orderData.id,
        message: `Your order has been successfully created! Order number: ${orderData.id}`,
        estimatedDeliveryTime: "30-45 minutes",
        totalAmount: totalAmount,
        customerPhone: customerPhone,
        items: items,
        deliveryAddress: deliveryAddress,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "An error occurred while creating order",
        message: "Sorry, we cannot process your order right now. Please try again later.",
      };
    }
  },
});
```

</details>

**What this tool does:** Takes the items collected in working memory, derives totals, creates the `orders` and `order_items` records, and returns a confirmation message, letting the agent wrap up an order as soon as the customer shares an address.

**Working memory integration:** This tool demonstrates how VoltAgent's working memory maintains conversation context across messages - the bot remembers cart items and delivery details without requiring the customer to repeat information.

### Tool 3: Check Order Status

The third tool allows customers to check the status of their orders:

<details>
<summary>View Tool 3 Code</summary>

```typescript
import { createTool } from "@voltagent/core";
import { z } from "zod";
import { supabase } from "../../lib/supabase";

export const checkOrderStatusTool = createTool({
  name: "checkOrderStatus",
  description: "Checks the status of a customer's order(s) from the database",
  parameters: z.object({
    orderId: z.number().optional().describe("Specific order ID to check"),
  }),
  execute: async ({ orderId }, context) => {
    try {
      // Always get customer phone from context
      const customerPhone = context?.userId;

      if (!customerPhone) {
        return {
          success: false,
          message: "Customer phone number not found. Please login to the system.",
        };
      }

      let query = supabase
        .from("orders")
        .select(
          `
          id,
          customer_phone,
          customer_address,
          total_amount,
          status,
          created_at,
          order_items (
            id,
            menu_item_id,
            quantity,
            price
          )
        `
        )
        .eq("customer_phone", customerPhone); // Always filter by customer phone from context

      // Add additional filter if orderId is provided
      if (orderId) {
        query = query.eq("id", orderId);
      }

      // Order by most recent first
      query = query.order("created_at", { ascending: false });

      // Limit to last 5 orders if not searching for specific order
      if (!orderId) {
        query = query.limit(5);
      }

      const { data: orders, error } = await query;

      if (error) {
        throw new Error(`Failed to query orders: ${error.message}`);
      }

      if (!orders || orders.length === 0) {
        return {
          success: false,
          message: orderId ? `Order #${orderId} not found.` : `You don't have any orders yet.`,
        };
      }

      // Format status messages
      const statusMessages: Record<string, string> = {
        pending: "Pending",
        preparing: "Preparing",
        ready: "Ready",
        on_the_way: "On the Way",
        delivered: "Delivered",
        cancelled: "Cancelled",
      };

      // Format order details
      const formattedOrders = orders.map((order) => ({
        orderNumber: order.id,
        status: statusMessages[order.status] || order.status,
        totalAmount: order.total_amount,
        deliveryAddress: order.customer_address,
        orderDate: new Date(order.created_at).toLocaleString("en-US"),
        itemCount: order.order_items?.length || 0,
      }));

      if (orderId) {
        // Single order query
        const order = formattedOrders[0];
        return {
          success: true,
          message: `Order #${order.orderNumber}\nStatus: ${order.status}\nTotal: $${order.totalAmount}\nDelivery Address: ${order.deliveryAddress}\nOrder Date: ${order.orderDate}`,
          order: order,
        };
      } else {
        // Multiple orders query
        const orderList = formattedOrders
          .map(
            (order, index) =>
              `${index + 1}. Order #${order.orderNumber} - ${order.status} - $${order.totalAmount}`
          )
          .join("\n");

        return {
          success: true,
          message: `Your recent orders:\n${orderList}`,
          orders: formattedOrders,
          totalOrders: formattedOrders.length,
        };
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "An error occurred while querying order status",
        message: "Sorry, we cannot query your order status right now. Please try again later.",
      };
    }
  },
});
```

</details>

**What this tool does:** Pulls recent orders for the current WhatsApp user, optionally filtering by ID, so the agent can answer “Where is my order?” questions with up-to-date status information without exposing anyone else’s data.

### Creating the Complete Application

Now let's build the complete `src/index.ts` file that brings everything together:

<details>
<summary>View Full Application Code</summary>

```typescript
import "dotenv/config";
import { VoltAgent, VoltOpsClient, Agent, Memory } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { openai } from "@ai-sdk/openai";
import { honoServer } from "@voltagent/server-hono";
import { z } from "zod";
import { listMenuItemsTool, createOrderTool, checkOrderStatusTool } from "./tools";
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
      })
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
  model: openai("gpt-4o-mini"),
  tools: [listMenuItemsTool, createOrderTool, checkOrderStatusTool],
  memory,
});

new VoltAgent({
  agents: {
    agent,
  },

  server: honoServer({
    configureApp: (app) => {
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
```

</details>

Now let's break down this code and understand each section:

### Working Memory Schema

Define the conversation state structure using Zod:

```typescript
// Define working memory schema with Zod
const workingMemorySchema = z.object({
  orders: z
    .array(
      z.object({
        menuItemId: z.number(),
        itemName: z.string(),
        quantity: z.number(),
        price: z.number(),
      })
    )
    .default([]),
  deliveryAddress: z.string().default(""),
  customerNotes: z.string().default(""),
  orderStatus: z.enum(["selecting", "address_needed", "completed"]).default("selecting"),
});
```

This schema tracks the customer's cart items, delivery address, optional notes, and current order status so the bot always knows how to keep the conversation moving.

**Type safety with Zod:** Zod provides runtime type validation ensuring inputs are checked, outputs stay consistent, TypeScript maintains autocomplete, and any mistakes surface with clear error messages.

### Memory Configuration

Set up persistent memory with conversation-scoped working memory:

```typescript
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
```

**Understanding VoltAgent Memory:**

VoltAgent provides two types of memory systems:

- **Long-term memory** - Persists across all conversations, storing message history and context permanently in a database
- **Working memory** - Temporary, session-specific storage that maintains state during an active conversation

Working memory is perfect for:

- Shopping carts and order items
- Form inputs and multi-step workflows
- Conversation state and user preferences
- Any temporary data that shouldn't persist forever

The `scope: "conversation"` setting ensures each WhatsApp user gets their own isolated working memory instance, keeping their cart separate from other customers.

📚 For detailed information about memory management, see the [Working Memory Guide](https://voltagent.dev/docs/agents/memory/working-memory/).

### Agent Creation

Create the intelligent agent with instructions and tools:

```typescript
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
  model: openai("gpt-4o-mini"),
  tools: [listMenuItemsTool, createOrderTool, checkOrderStatusTool],
  memory,
});
```

**Agent configuration includes:** The agent is named, given its ordering instructions, pointed at the GPT-4o-mini model, wired to the three tools, and connected to shared memory so each chat stays stateful.

#### VoltAgent Server Configuration

Initialize VoltAgent with custom webhook handlers:

```typescript
new VoltAgent({
  agents: {
    agent,
  },

  server: honoServer({
    configureApp: (app) => {
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
```

**Server endpoints:** The service exposes `/webhook/whatsapp` for the Meta verification handshake, accepts incoming messages on the same route via POST, and offers `/health` so you can keep an eye on uptime.

**VoltOps integration** provides real-time traces, performance and cost telemetry, debugging tools, and replayable conversation history without bolting on extra infrastructure.

### WhatsApp Webhook Integration

<Info title="Connect your Meta app">
Work through the [WhatsApp Cloud API onboarding guide](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started) to create a Meta app, provision a WhatsApp Business account, and register your webhook URL. The verification token, access token, and phone number ID you generate there drop straight into `.env` as `WHATSAPP_WEBHOOK_TOKEN`, `WHATSAPP_ACCESS_TOKEN`, and `WHATSAPP_PHONE_NUMBER_ID`, which the webhook handlers expect.
</Info>

![](https://cdn.voltagent.dev/examples/meta.png)

Now let's create the complete WhatsApp webhook handlers in `src/webhooks/whatsapp.ts`:

<details>
<summary>View WhatsApp Webhook Code</summary>

```typescript
import { Context } from "hono";
import { Agent } from "@voltagent/core";
import { WhatsAppWebhookBody } from "../types/whatsapp";

// Send message back to WhatsApp
async function sendWhatsAppMessage(
  to: string,
  message: string,
  phoneNumberId: string,
  accessToken: string
): Promise<boolean> {
  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: "text",
        text: {
          preview_url: false,
          body: message,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("WhatsApp API Error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to send WhatsApp message:", error);
    return false;
  }
}

// Handle WhatsApp verification
export async function handleWhatsAppVerification(c: Context) {
  const mode = c.req.query("hub.mode");
  const token = c.req.query("hub.verify_token");
  const challenge = c.req.query("hub.challenge");

  const verifyToken = process.env.WHATSAPP_WEBHOOK_TOKEN;

  if (mode && token) {
    if (mode === "subscribe" && token === verifyToken) {
      console.log("WhatsApp webhook verified successfully");
      return c.text(challenge || "", 200);
    } else {
      return c.text("Forbidden", 403);
    }
  }

  return c.text("Bad Request", 400);
}

// Handle incoming WhatsApp messages
export async function handleWhatsAppMessage(c: Context, agent: Agent) {
  try {
    const body = await c.req.json<WhatsAppWebhookBody>();

    // Extract message details
    const entry = body.entry?.[0];
    if (!entry) {
      return c.json({ status: "no_entry" }, 200);
    }

    const changes = entry.changes?.[0];
    if (!changes?.value?.messages) {
      return c.json({ status: "no_messages" }, 200);
    }

    const phoneNumberId = changes.value.metadata.phone_number_id;
    const messages = changes.value.messages;
    const contacts = changes.value.contacts;

    // Process each message
    for (const message of messages) {
      // Only process text messages
      if (message.type !== "text" || !message.text?.body) {
        continue;
      }

      const userPhone = message.from;
      const userMessage = message.text.body;
      const userName = contacts?.find((c) => c.wa_id === userPhone)?.profile?.name || "Customer";

      console.log(`Received message from ${userPhone}: ${userMessage}`);

      // Generate response using agent
      const response = await agent.generateText(userMessage, {
        userId: userPhone, // Use phone number as userId for context
        conversationId: `whatsapp_${userPhone}`,
      });

      // Send response back to WhatsApp
      if (response.text) {
        const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
        if (!accessToken) {
          console.error("WhatsApp access token not configured");
          continue;
        }

        await sendWhatsAppMessage(userPhone, response.text, phoneNumberId, accessToken);
      }
    }

    // WhatsApp expects 200 OK response
    return c.json({ status: "processed" }, 200);
  } catch (error) {
    console.error("Error processing WhatsApp webhook:", error);
    // Still return 200 to prevent WhatsApp from retrying
    return c.json({ status: "error" }, 200);
  }
}
```

</details>

#### Function Breakdown

**1. `sendWhatsAppMessage`** wraps the Meta Graph API call, adds the required auth headers, and logs any failures so you know whether WhatsApp actually accepted the reply.

**2. `handleWhatsAppVerification`** checks Meta's `hub.mode` and `hub.verify_token`, returning the expected challenge string when everything matches so the webhook can be registered successfully. This verification step is part of WhatsApp's multi-layer security: verify tokens prove ownership of the callback URL, HTTPS keeps traffic encrypted, and responses stay generic so internal errors never leak.

**3. `handleWhatsAppMessage`** reads the webhook payload, forwards text messages into the agent with the right context, and posts responses back while still returning 200 to stop Meta from retrying.

**Key Security Features:** Together these handlers validate the verify token, keep responses at 200 to avoid retry storms, lean on typed payloads for safety, and log unexpected errors without taking the service offline.

#### Configuring VoltAgent with Custom Server

Finally, let's set up VoltAgent with our custom server configuration:

```typescript
// Initialize VoltAgent with custom server
new VoltAgent({
  agents: { agent },
  server: honoServer({
    configureApp: (app) => {
      app.get("/webhook/whatsapp", handleWhatsAppVerification);
      app.post("/webhook/whatsapp", (c) => handleWhatsAppMessage(c, agent));
      app.get("/health", (c) => c.json({ status: "healthy" }));
    },
  }),
  logger,
  voltOpsClient: new VoltOpsClient({
    publicKey: process.env.VOLTAGENT_PUBLIC_KEY || "",
    secretKey: process.env.VOLTAGENT_SECRET_KEY || "",
  }),
});
```

**Server Configuration:** The production setup exposes `/webhook/whatsapp` for both the verification handshake and incoming messages, leaves `/health` available for load balancers, and sticks with VoltOps for real-time monitoring and debugging.

### Running the Bot

Once deployed, your bot handles natural conversations. Here are example interactions:

#### Example Conversation 1: First-time Order

```
Customer: Hi
Bot: Welcome to our restaurant! 🍕 I'm here to help you order delicious food. Would you like to see our menu?

Customer: Yes please
Bot: Here's our menu:

**Pizza**
• Margherita - Fresh tomatoes, mozzarella, basil ($12.99)
• Pepperoni - Pepperoni, mozzarella, tomato sauce ($14.99)

**Burgers**
• Classic Burger - Beef patty, lettuce, tomato, onion ($10.99)
• Cheeseburger - Beef patty, cheese, lettuce, tomato ($11.99)

**Drinks**
• Coke - Coca-Cola 330ml ($2.99)
• Water - Mineral water 500ml ($1.99)

What would you like to order?

Customer: I'll have 2 pepperoni pizzas and a coke
Bot: Great choice! I've added:
- 2x Pepperoni Pizza ($29.98)
- 1x Coke ($2.99)

Your current total is $32.97. Would you like anything else?

Customer: No that's all
Bot: Perfect! Please provide your delivery address.

Customer: 123 Main Street, Apt 4B
Bot: Thank you! Order #1057 confirmed!
📍 Delivery to: 123 Main Street, Apt 4B
💰 Total: $32.97
⏰ Estimated delivery: 30-45 minutes

We'll notify you when your order is on the way!
```

#### Example Conversation 2: Checking Order Status

```
Customer: What's the status of my order?
Bot: Let me check your recent orders...

I found your order #1057:
- Status: On the way 🚗
- Total: $32.97
- Ordered: 15 minutes ago

Your order should arrive in about 15-30 minutes!
```

#### Next Steps

Now that you have a working WhatsApp order bot, consider these enhancements:

1. **Add payment integration**: Connect Stripe or PayPal for online payments
2. **Implement order tracking**: Real-time status updates via WhatsApp
3. **Multi-language support**: Detect and respond in customer's language
4. **Menu recommendations**: Use order history for personalized suggestions
5. **Voice note support**: Process audio messages for accessibility
6. **Admin dashboard**: Web interface for menu and order management
7. **Analytics**: Track popular items and peak ordering times
8. **Loyalty program**: Points and rewards for repeat customers
9. **Group ordering**: Handle multiple people ordering together
10. **Restaurant notifications**: Alert restaurant staff of new orders
