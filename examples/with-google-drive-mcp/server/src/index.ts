import { serve } from "@hono/node-server";
import { createTool } from "@voltagent/core";
import { type Context, Hono } from "hono";
import { cors } from "hono/cors";
import { convertJsonSchemaToZod } from "zod-from-json-schema";

import { OpenAIToolSet } from "composio-core";

import type { z } from "zod";
// Import refactored modules
import { getUserConnection, saveUserConnection, setupDatabase } from "./db/index.js";
import {
  getPendingConnection,
  removePendingConnection,
  storePendingConnection,
} from "./db/pendingConnections.js";
import { generateFunnyVoltAgentId } from "./utils.js";
import { agent } from "./voltagent/index.js";

// Initialize Composio toolset
// Ensure COMPOSIO_API_KEY is set in your environment variables
const composioToolset = new OpenAIToolSet();

// --- Route Handlers ---

// Handler for the root route
const handleRoot = (c: Context) => c.text("Hello from VoltAgent!");

// Handler for the login route
const handleLogin = async (c: Context) => {
  const googleIntegrationId = process.env.GOOGLE_INTEGRATION_ID;

  if (!googleIntegrationId) {
    return c.text("GOOGLE_INTEGRATION_ID is not set", 500);
  }

  try {
    // Generate the userId on the server using the funny name generator
    const userId = generateFunnyVoltAgentId();
    console.log(`Generated userId ${userId}, initiating OAuth connection...`);

    const connectionRequest = await composioToolset.connectedAccounts.initiate({
      integrationId: googleIntegrationId,
      entityId: userId, // Use generated ID
      // Redirect back to check-status (WITHOUT userId)
      redirectUri: "http://localhost:3000/check-status", // Use simple string
    });

    if (connectionRequest?.redirectUrl) {
      // Store the single pending request with its generated userId
      storePendingConnection(userId, connectionRequest);
      console.log(
        `Received redirect URL for generated user ${userId}: ${connectionRequest.redirectUrl}`,
      );
      return c.redirect(connectionRequest.redirectUrl, 302);
    }
    console.error("Error: Expected a redirectUrl for OAuth flow but didn't receive one.");
    return c.text("Failed to initiate OAuth flow", 500);
  } catch (error: unknown) {
    console.error("Error initiating connection:", error);
    const message = error instanceof Error ? error.message : String(error);
    return c.text(`Error initiating connection: ${message}`, 500);
  }
};

// Handler for checking connection status
const handleCheckStatus = async (c: Context) => {
  // Retrieve the single pending connection details
  const pendingData = getPendingConnection();

  if (!pendingData) {
    return c.text(
      "No pending connection found or already processed. Please try /login again.",
      400,
    );
  }

  // Get the userId and request object from the stored data
  const { userId, request: connectionRequest } = pendingData;

  console.log(`Checking status for pending connection associated with generated user ${userId}...`);
  try {
    // Poll Composio until the status is ACTIVE
    const activeConnection = await connectionRequest.waitUntilActive(180);

    console.log(
      `Success! Connection is ACTIVE for generated user ${userId}. ID: ${activeConnection.id}`,
    );

    // Save to database using the generated userId
    await saveUserConnection(userId, activeConnection.id);

    // Clean up the single pending request
    removePendingConnection(); // No argument needed now

    // Redirect back to the React app on success, passing the generated userId
    const reactAppUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    return c.redirect(`${reactAppUrl}/?loggedInUser=${userId}`, 302);
  } catch (error: unknown) {
    console.error(`Connection check failed for pending request (user ${userId}):`, error);
    const message = error instanceof Error ? error.message : String(error);
    // Clean up the pending request on failure too
    removePendingConnection(); // No argument needed now
    // Optionally redirect to frontend with error state?
    // For now, just return text error
    return c.text(`Connection check failed: ${message}`, 500);
  }
};

// Handler for the stream endpoint
const handleStream = async (c: Context) => {
  try {
    const body = await c.req.json();
    const { prompt, userId } = body;

    if (!prompt || !userId) {
      return c.json({ error: "Missing prompt or userId" }, 400);
    }

    // 1. Retrieve connectedAccountId from DB
    const connectedAccountId = await getUserConnection(userId);

    if (!connectedAccountId) {
      return c.json(
        {
          error: `User ${userId} not connected. Please complete the /login flow first.`,
        },
        401,
      );
    }
    console.log(`Using connectedAccountId ${connectedAccountId} for user ${userId}`);

    // 2. Dynamically create tools for this request using the user's connection
    const googleDriveToolsSpec = await composioToolset.getTools({
      apps: ["googledrive"],
    });

    const tools = googleDriveToolsSpec.map((toolSpec) =>
      createTool({
        name: toolSpec.function.name,
        description: toolSpec.function.description || "",
        parameters: convertJsonSchemaToZod(
          toolSpec.function.parameters as any,
        ) as unknown as z.ZodType,
        execute: async (args) => {
          console.log(`Executing tool: ${toolSpec.function.name} for user ${userId}`);
          const result = await composioToolset.executeAction({
            action: toolSpec.function.name,
            params: args,
            connectedAccountId: connectedAccountId, // Use the retrieved ID
          });
          return result;
        },
      }),
    );
    console.log(`Prepared ${tools.length} Google Drive tools for the request.`);

    // 3. Set up SSE streaming with dynamic tools
    const stream = new ReadableStream({
      async start(controller) {
        try {
          console.log(`Starting stream for user ${userId} with prompt: "${prompt}"`);
          const response = await agent.streamText(prompt, {
            userId: userId,
            tools: tools, // Pass dynamically created tools
          });

          let finalContent = "";
          // Handle the text stream
          for await (const chunk of response.textStream) {
            finalContent += chunk;
            const data = {
              text: chunk,
              timestamp: new Date().toISOString(),
              type: "text",
            };
            const sseMessage = `data: ${JSON.stringify(data)}\n\n`;
            controller.enqueue(new TextEncoder().encode(sseMessage));
          }

          // Simplified completion message
          const completionData = {
            finalContent: finalContent,
            timestamp: new Date().toISOString(),
            type: "completion",
          };
          const completionMessage = `data: ${JSON.stringify(completionData)}\n\n`;
          controller.enqueue(new TextEncoder().encode(completionMessage));

          console.log(`Stream finished for user ${userId}`);
          controller.close();
        } catch (streamError) {
          console.error(`Error during stream for user ${userId}:`, streamError);
          const errorData = {
            error: streamError instanceof Error ? streamError.message : "Streaming failed",
            timestamp: new Date().toISOString(),
            type: "error",
          };
          const errorMessage = `data: ${JSON.stringify(errorData)}\n\n`;
          try {
            controller.enqueue(new TextEncoder().encode(errorMessage));
          } catch {}
          controller.close();
        }
      },
    });

    // 4. Return the stream response
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in /stream endpoint:", error);
    return c.json(
      {
        error: error instanceof Error ? error.message : "Failed to process stream request",
      },
      500,
    );
  }
};

// --- Hono Setup for HTTP Endpoints ---
const app = new Hono();

// Enable CORS for all routes
app.use(
  "/*",
  cors({
    origin: ["http://localhost:5173", "http://localhost:3000", "*"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  }),
);

// --- Routes ---

app.get("/", handleRoot);
app.get("/login", handleLogin);
app.get("/check-status", handleCheckStatus);
app.post("/stream", handleStream);

// --- Server Start ---

const port = 3000;

// Setup DB before starting server
setupDatabase()
  .then(() => {
    console.log(`Server is running on port ${port}`);
    serve({
      fetch: app.fetch,
      port: port,
    });
  })
  .catch((err: Error) => {
    console.error("Failed to setup database:", err);
    process.exit(1);
  });
