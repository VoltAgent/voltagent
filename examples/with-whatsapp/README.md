<div align="center">
<a href="https://voltagent.dev/">
<img width="1800" alt="435380213-b6253409-8741-462b-a346-834cd18565a9" src="https://github.com/user-attachments/assets/dc9c4986-3e68-42f8-a450-ecd79b4dbd99" />
</a>

<br/>

</div>

<br/>

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.0-4baaaa.svg)](CODE_OF_CONDUCT.md)
[![npm version](https://img.shields.io/npm/v/@voltagent/core.svg)](https://www.npmjs.com/package/@voltagent/core)
[![npm downloads](https://img.shields.io/npm/dm/@voltagent/core.svg)](https://www.npmjs.com/package/@voltagent/core)
[![Discord](https://img.shields.io/discord/1361559153780195478.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2)](https://s.voltagent.dev/discord)

</div>

## WhatsApp Food Ordering AI Agent Example

Build a food ordering system for WhatsApp with VoltAgent. This example shows you how to create an intelligent chatbot that takes orders, manages menus, and tracks deliveries all through natural WhatsApp conversations.

The main goal is to show how to build and extend this kind of agent. It’s minimal on purpose feel free to fork and build on top.

Basic features:

- Shows restaurant menu from your database
- Takes customer orders in natural language
- Remembers what's in the cart across multiple messages
- Collects delivery information
- Saves orders to your database
- Lets customers check their order status

## Quick Start

You can use the VoltAgent CLI to get the agent example from our repository:

```bash
npm create voltagent-app@latest -- --example with-whatsapp
```

## What You'll Need

**Tech Stack:**

- [VoltAgent](https://voltagent.dev) – Open-source TypeScript framework for AI agents
- [WhatsApp Cloud API](https://developers.facebook.com) – Connect to WhatsApp Business
- [Supabase](https://supabase.com) (free tier OK) – PostgreSQL database for menus and orders
- [OpenAI API key](https://platform.openai.com/api-keys) – Powers the AI agent
- [VoltOps account](https://console.voltagent.dev/login) (free) – Real-time monitoring and debugging

## Installation & Setup

### Step 1: Install Dependencies

```bash
pnpm install
# or: npm install / yarn install
```

### Step 2: Environment Variables

Create a `.env` file:

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

### Step 3: Database Setup

Go to your [Supabase dashboard](https://supabase.com), open the SQL Editor, and run these commands:

**Menu Items Table:**

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

**Orders Table:**

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

**Order Items Table:**

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

**Sample Menu Data:**

```sql
INSERT INTO menu_items (category, name, description, price) VALUES
  ('Pizza', 'Margherita', 'Fresh tomatoes, mozzarella, basil', 12.99),
  ('Pizza', 'Pepperoni', 'Pepperoni, mozzarella, tomato sauce', 14.99),
  ('Burger', 'Classic Burger', 'Beef patty, lettuce, tomato, onion', 10.99),
  ('Burger', 'Cheeseburger', 'Beef patty, cheese, lettuce, tomato', 11.99),
  ('Drinks', 'Coke', 'Coca-Cola 330ml', 2.99),
  ('Drinks', 'Water', 'Mineral water 500ml', 1.99);
```

### Step 4: WhatsApp Setup

Follow [Meta's setup guide](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started):

- Create a Meta developer app
- Get WhatsApp Business access
- Register your webhook URL
- Copy your tokens to `.env`

## Run the Application

```bash
pnpm dev
```

Server starts on `http://localhost:3141`:

```bash
════════════════════════════════════════════
  VOLTAGENT SERVER STARTED SUCCESSFULLY
════════════════════════════════════════════
  ✓ HTTP Server: http://localhost:3141
  VoltOps Platform: https://console.voltagent.dev
════════════════════════════════════════════
```

Your [VoltOps dashboard](https://console.voltagent.dev) opens automatically for monitoring.

## Project Structure

```
examples/with-whatsapp/
├── src/
│   ├── index.ts                    # Main agent configuration and server setup
│   ├── lib/
│   │   └── supabase.ts            # Supabase client initialization
│   ├── tools/
│   │   ├── index.ts               # Tool exports
│   │   ├── list-menu-items.ts     # Fetch menu items from database
│   │   ├── create-order.ts        # Process and save orders
│   │   └── check-order-status.ts  # Track order status
│   ├── types/
│   │   └── whatsapp.ts            # WhatsApp webhook types
│   └── webhooks/
│       └── whatsapp.ts            # WhatsApp webhook handlers
├── package.json
├── tsconfig.json
└── .env.example
```

## How the Bot Works

Simple ordering flow:

1. **Show Menu** → Bot displays items from database
2. **Take Order** → Customer selects items in natural language
3. **Remember Cart** → Working memory keeps track of selections
4. **Get Address** → Bot asks for delivery location
5. **Save Order** → Everything goes into Supabase
6. **Track Status** → Customer can check order anytime

## Code Deep Dive

### VoltAgent Tools Explained

Tools are functions your AI can call. Each tool:

- Has one clear job
- Validates inputs with Zod
- Returns structured data
- Handles errors gracefully

**Three tools power this bot:**

1. **listMenuItems** - Gets menu from database
2. **createOrder** - Saves order to database
3. **checkOrderStatus** - Looks up order info

### Tool #1: List Menu Items

Fetches menu from Supabase with pagination support.

**📄 src/tools/list-menu-items.ts**

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

![List Menu Tool](https://cdn.voltagent.dev/examples/with-whatsapp/list-tool.png)

The AI automatically calls this when customers say "show me the menu" or start ordering.

### Tool #2: Create Order

Takes cart items and saves everything to database.

**📄 src/tools/create-order.ts**

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

![Create Order Tool](https://cdn.voltagent.dev/examples/with-whatsapp/create-order.png)

Called automatically after customer provides delivery address. Creates records in both `orders` and `order_items` tables.

### Tool #3: Check Order Status

Retrieves order history for the current customer.

**📄 src/tools/check-order-status.ts**

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
        .eq("customer_phone", customerPhone);

      if (orderId) {
        query = query.eq("id", orderId);
      }

      query = query.order("created_at", { ascending: false });

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

      // Format and return order details
      // ... (formatting logic omitted for brevity)

      return {
        success: true,
        message: "Order status retrieved successfully",
        orders: orders,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "An error occurred",
        message: "Sorry, we cannot query your order status right now.",
      };
    }
  },
});
```

![Check Order Status Tool](https://cdn.voltagent.dev/examples/with-whatsapp/order-status.png)

Filters by phone number so customers only see their own orders. Answers "where's my order?" type questions.

## Main Application File

### Putting It All Together

Here's how `src/index.ts` wires everything up:

**📄 src/index.ts**

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
  instructions: `You are a WhatsApp ordering AI agent. Your task is to take food orders from customers.

Order Flow:
1. If orders array is empty, show menu
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
          service: "whatsapp-ordering-agent",
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

### Key Components Breakdown

#### Working Memory Schema

Defines what the bot remembers during conversations:

```typescript
const workingMemorySchema = z.object({
  orders: z.array(...).default([]),        // Cart items
  deliveryAddress: z.string().default(""), // Where to deliver
  customerNotes: z.string().default(""),   // Special requests
  orderStatus: z.enum([...]).default("selecting"), // Conversation stage
});
```

State flow: `selecting` → `address_needed` → `completed`

#### Memory Setup

```typescript
const memory = new Memory({
  storage: new LibSQLMemoryAdapter({
    url: "file:./.voltagent/memory.db",
  }),
  workingMemory: {
    enabled: true,
    scope: "conversation", // Isolated per customer
    schema: workingMemorySchema,
  },
});
```

![Memory](https://cdn.voltagent.dev/examples/with-whatsapp/memory.png)

- Local SQLite storage
- Each conversation has its own cart
- Auto-clears after order complete

#### Agent Setup

```typescript
const agent = new Agent({
  name: "with-whatsapp",
  instructions: `You are a WhatsApp ordering AI agent...`,
  model: openai("gpt-4o-mini"), // Fast and cheap
  tools: [listMenuItemsTool, createOrderTool, checkOrderStatusTool],
  memory,
});
```

## Webhook Implementation

### Meta Setup Required

![Meta Setup](https://cdn.voltagent.dev/examples/meta.png)

Get your WhatsApp tokens from [Meta for Developers](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started):

1. Create app
2. Get Business API access
3. Register webhook
4. Copy tokens to `.env`

### Webhook Code

`src/webhooks/whatsapp.ts` handles all WhatsApp communication:

**📄 src/webhooks/whatsapp.ts**

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
      if (message.type !== "text" || !message.text?.body) {
        continue;
      }

      const userPhone = message.from;
      const userMessage = message.text.body;

      console.log(`Received message from ${userPhone}: ${userMessage}`);

      // Generate response using agent
      const response = await agent.generateText(userMessage, {
        userId: userPhone,
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

    return c.json({ status: "processed" }, 200);
  } catch (error) {
    console.error("Error processing WhatsApp webhook:", error);
    return c.json({ status: "error" }, 200);
  }
}
```

**Three functions handle everything:**

1. **`handleWhatsAppVerification`** (GET request)
   - Meta calls this to verify your webhook
   - Checks token match
   - Returns challenge code

2. **`sendWhatsAppMessage`**
   - Sends replies via Meta Graph API
   - Handles auth and formatting
   - Logs failures

3. **`handleWhatsAppMessage`** (POST request)
   - Receives customer messages
   - Passes to agent
   - Sends response back
   - Always returns 200 (prevents Meta retries)

**Security:**

- Token validation
- Type-safe payloads
- No internal error exposure

## Monitor Your Bot

VoltOps dashboard opens automatically:

![Start Server](https://cdn.voltagent.dev/examples/with-whatsapp/1-start-server.png)

**See everything in real-time:**

- Live conversations
- Tool calls
- Memory state
- Performance
- Errors

![Agent Working](https://cdn.voltagent.dev/examples/with-whatsapp/agent-work.png)

Perfect for debugging and understanding AI decisions.

## Real Conversation Examples

### Ordering Food

```
Customer: Hi
Agent: Welcome! 🍕 Would you like to see our menu?

Customer: Yes please
Agent: Here's our menu:

**Pizza**
• Margherita - Fresh tomatoes, mozzarella, basil ($12.99)
• Pepperoni - Pepperoni, mozzarella, tomato sauce ($14.99)

**Burgers**
• Classic Burger - Beef patty, lettuce, tomato, onion ($10.99)
• Cheeseburger - Beef patty, cheese, lettuce, tomato ($11.99)

**Drinks**
• Coke - Coca-Cola 330ml ($2.99)
• Water - Mineral water 500ml ($1.99)

Customer: I'll have 2 pepperoni pizzas and a coke
Agent: Great! I've added:
- 2x Pepperoni Pizza ($29.98)
- 1x Coke ($2.99)

Total: $32.97. Would you like anything else?

Customer: No that's all
Agent: Perfect! Please provide your delivery address.

Customer: 123 Main Street, Apt 4B
Agent: Order #1057 confirmed!
📍 Delivery to: 123 Main Street, Apt 4B
💰 Total: $32.97
⏰ Estimated delivery: 30-45 minutes
```

### Tracking Orders

```
Customer: What's the status of my order?
Agent: Order #1057
Status: On the way 🚗
Total: $32.97
Should arrive in 15-30 minutes!
```

## Ideas for Enhancement

Take this further:

1. **Payments** – Stripe/PayPal integration
2. **Notifications** – Status update messages
3. **Languages** – Multi-language detection
4. **Recommendations** – AI-powered suggestions based on history
5. **Voice** – Accept voice note orders
6. **Dashboard** – Admin panel for restaurants
7. **Analytics** – Track sales and trends
8. **Loyalty** – Points system
9. **Group Orders** – Split bills and shared carts
10. **Staff Alerts** – Notify kitchen of new orders

## Learn More

- [VoltAgent Docs](https://voltagent.dev/docs/) - Full framework documentation
- [More Examples](https://github.com/VoltAgent/voltagent/tree/main/examples) - Other use cases
- [WhatsApp API](https://developers.facebook.com/docs/whatsapp/cloud-api) - Meta's official docs
- [Supabase](https://supabase.com/docs) - Database documentation
- [Working Memory](https://voltagent.dev/docs/agents/memory/working-memory/) - State management guide
