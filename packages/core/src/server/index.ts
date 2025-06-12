import type { IncomingMessage } from "node:http";
import type { Socket } from "node:net";
import { serve } from "@hono/node-server";
import type { WebSocketServer } from "ws";
import app, { createWebSocketServer } from "./api";

// Terminal color codes
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  underscore: "\x1b[4m",
  blink: "\x1b[5m",
  reverse: "\x1b[7m",
  hidden: "\x1b[8m",

  black: "\x1b[30m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",

  bgBlack: "\x1b[40m",
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
  bgMagenta: "\x1b[45m",
  bgCyan: "\x1b[46m",
  bgWhite: "\x1b[47m",
};

// Port and message return type
type PortConfig = {
  port: number;
  messages: Array<string>;
};

// Server return type
type ServerReturn = {
  server: ReturnType<typeof serve>;
  ws: WebSocketServer;
  port: number;
};

// Preferred ports and their messages
const preferredPorts: PortConfig[] = [
  {
    port: 3141,
    messages: [
      "Engine powered by logic. Inspired by π.",
      "Because your logic deserves structure.",
      "Flows don't have to be linear.",
      "Where clarity meets complexity.",
    ],
  },
  {
    port: 4310,
    messages: ["Inspired by 'A.I.O' — because it's All In One. ⚡"],
  },
  {
    port: 1337,
    messages: ["Volt runs on 1337 by default. Because it's not basic."],
  },
  { port: 4242, messages: ["This port is not a coincidence."] },
];

// To make server startup logs visually more attractive
const printServerStartup = (port: number) => {
  const divider = `${colors.cyan}${"═".repeat(50)}${colors.reset}`;

  console.log("\n");
  console.log(divider);
  console.log(
    `${colors.bright}${colors.yellow}  VOLTAGENT SERVER STARTED SUCCESSFULLY${colors.reset}`,
  );
  console.log(divider);
  console.log(
    `${colors.green}  ✓ ${colors.bright}HTTP Server:  ${colors.reset}${colors.white}http://localhost:${port}${colors.reset}`,
  );
  console.log(
    `${colors.green}  ✓ ${colors.bright}Swagger UI:   ${colors.reset}${colors.white}http://localhost:${port}/ui${colors.reset}`,
  );

  // Check if custom endpoints were registered
  const customEndpoints = (global as any).__voltAgentCustomEndpoints;
  if (customEndpoints && customEndpoints.length > 0) {
    console.log();
    console.log(
      `${colors.green}  ✓ ${colors.bright}Custom Endpoints: ${colors.reset}${colors.dim}${customEndpoints.length} registered${colors.reset}`,
    );

    // Group endpoints by method for compact display
    const methodGroups: Record<string, string[]> = {};
    customEndpoints.forEach((endpoint: any) => {
      const method = endpoint.method.toUpperCase();
      if (!methodGroups[method]) {
        methodGroups[method] = [];
      }
      methodGroups[method].push(endpoint.path);
    });

    // Display endpoints in a compact format
    const methodOrder = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];
    methodOrder.forEach((method) => {
      if (methodGroups[method]) {
        methodGroups[method].forEach((path) => {
          console.log(
            `${colors.dim}    ${method.padEnd(6)} ${colors.reset}${colors.white}${path}${colors.reset}`,
          );
        });
      }
    });
  }

  console.log();
  console.log(
    `${colors.bright}${colors.yellow}  ${colors.bright}VoltOps Platform:    ${colors.reset}${colors.white}https://console.voltagent.dev${colors.reset}`,
  );
  console.log(divider);
};

const tryStartServer = (port?: number): Promise<ReturnType<typeof serve>> => {
  return new Promise((resolve, reject) => {
    try {
      // Start the HTTP server
      const server = serve({
        fetch: app.fetch.bind(app),
        port: port,
        hostname: "0.0.0.0",
      });

      // Listen for error event - this will trigger if the port is already in use
      server.once("error", (err: Error) => {
        // Catch EADDRINUSE error or other errors
        reject(err);
      });

      // Resolve the promise when the server connects (typically when the port is available)
      // However, since there is no event-based listening, let's check with a short timeout
      setTimeout(() => {
        // If the server is still running (hasn't thrown an error), this is a successful start
        resolve(server);
      }, 100);
    } catch (error) {
      // For directly thrown errors
      reject(error);
    }
  });
};

// Function to start the server
export const startServer = async (opts: { port?: number }): Promise<ServerReturn> => {
  // Collect all ports in an array - first preferred ports, then fallback ports
  const portsToTry: Array<PortConfig> = [
    ...preferredPorts,
    // Add fallback ports between 4300-4400
    ...Array.from({ length: 101 }, (_, i) => ({
      port: 4300 + i,
      messages: ["This port is not a coincidence."],
    })),
  ];

  // Try each port in sequence
  for (const portConfig of portsToTry) {
    let { port } = opts;
    if (!port) {
      // If no port is provided, use the preferred port
      port = portConfig.port;
    }

    try {
      // Try to start the server and wait until successful
      const server = await tryStartServer(port);

      // Create the WebSocket server
      const ws = createWebSocketServer();

      // Set up the upgrade handler for WebSocket connections
      server.addListener("upgrade", (req: IncomingMessage, socket: Socket, head: Buffer) => {
        // Get the path from URL
        const url = new URL(req.url || "", "http://localhost");
        const path = url.pathname;

        // Check WebSocket requests
        if (path.startsWith("/ws")) {
          ws.handleUpgrade(req, socket, head, (websocket) => {
            ws.emit("connection", websocket, req);
          });
        } else {
          socket.destroy();
        }
      });

      printServerStartup(port);

      return { server, ws, port };
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes("EADDRINUSE") || (error as any).code === "EADDRINUSE")
      ) {
        console.log(
          `${colors.yellow}Port ${port} is already in use, trying next port...${colors.reset}`,
        );
        continue;
      }
      console.error(
        `${colors.red}Unexpected error starting server on port ${port}:${colors.reset}`,
        error,
      );
      throw error;
    }
  }

  throw new Error(
    `${colors.red}Could not find an available port after trying all options${colors.reset}`,
  );
};
