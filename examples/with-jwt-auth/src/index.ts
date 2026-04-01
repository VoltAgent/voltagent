import { Agent, VoltAgent } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer, jwtAuth } from "@voltagent/server-hono";
import jwt from "jsonwebtoken";

// Create logger
const logger = createPinoLogger({
  name: "with-jwt-auth",
  level: "info",
});

// JWT Secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

// Create an agent that uses auth context
const agent = new Agent({
  name: "agent",
  instructions: "You are a helpful assistant that knows who is talking to you.",
  model: "openai/gpt-4o-mini",
  // Hooks to access user context
  hooks: {
    onStart: async ({ context }) => {
      // Access user from context
      const user = context.context.get("user") as
        | { id: string; email: string; name?: string; role?: string }
        | undefined;

      if (user) {
        logger.info(`User ${user.email} (ID: ${user.id}) is calling agent`);

        // You can implement role-based access control here
        if (user.role === "admin") {
          logger.info("Admin user detected - full access granted");
        }
      }
    },
  },
});

// Create VoltAgent with JWT authentication
new VoltAgent({
  agents: {
    agent,
  },
  logger,
  server: honoServer({
    port: 3141,

    // Configure JWT authentication
    auth: jwtAuth({
      secret: JWT_SECRET,

      // Map JWT payload to user object
      mapUser: (payload) => ({
        id: payload.sub,
        email: payload.email,
        name: payload.name || payload.email?.split("@")[0],
        role: payload.role || "user",
        // Include any other claims you need
        permissions: payload.permissions || [],
      }),

      // Additional public routes (optional)
      // By default, only execution endpoints require auth
      publicRoutes: ["/health", "/metrics"],

      // JWT verification options (optional)
      verifyOptions: {
        algorithms: ["HS256"],
        // audience: 'your-app',
        // issuer: 'your-auth-server',
      },
    }),
  }),
});

// Helper function to create a test JWT token
export function createTestToken(user: {
  id: string;
  email: string;
  name?: string;
  role?: string;
  permissions?: string[];
}): string {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role || "user",
      permissions: user.permissions || [],
    },
    JWT_SECRET,
    {
      algorithm: "HS256",
      expiresIn: "24h",
    },
  );
}

// Example tokens for testing
console.log("\n🔑 Example JWT tokens for testing:\n");

const adminToken = createTestToken({
  id: "1",
  email: "admin@example.com",
  name: "Admin User",
  role: "admin",
  permissions: ["read", "write", "delete"],
});

const userToken = createTestToken({
  id: "2",
  email: "user@example.com",
  name: "Regular User",
  role: "user",
  permissions: ["read"],
});

console.log("Admin token:", adminToken);
console.log("\nUser token:", userToken);

console.log("\n📝 Example requests:\n");
console.log("# With authentication (works):");
console.log(`curl -X POST http://localhost:3141/agents/agent/text \\
  -H "Authorization: Bearer ${userToken}" \\
  -H "Content-Type: application/json" \\
  -d '{"messages":[{"parts":[{"type":"text","text":"Who am I"}],"role":"user"}]}'`);

console.log("\n# Without authentication (fails):");
console.log(`curl -X POST http://localhost:3141/agents/agent/text \\
  -H "Content-Type: application/json" \\
  -d '{"messages":[{"parts":[{"type":"text","text":"Who am I?"}],"role":"user"}]}'`);

console.log("\n# Public endpoint (works without auth):");
console.log("curl http://localhost:3141/agents");
