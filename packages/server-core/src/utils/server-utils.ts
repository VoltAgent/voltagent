/**
 * Shared server utilities for all server implementations
 */

import type { ServerEndpointSummary, ServerStartupOptions } from "../types/server";

// Terminal color codes for console output
export const colors = {
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

// Preferred ports and their messages
export const preferredPorts = [
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
    messages: ["Inspired by 'A.I.O' - because it's All In One. ⚡"],
  },
  {
    port: 1337,
    messages: ["Volt runs on 1337 by default. Because it's not basic."],
  },
  {
    port: 4242,
    messages: ["This port is not a coincidence."],
  },
];

/**
 * Print server startup message with formatted console output
 */
export function printServerStartup(port: number, options: ServerStartupOptions = {}) {
  const divider = `${colors.cyan}${"═".repeat(50)}${colors.reset}`;
  const isProduction = process.env.NODE_ENV === "production";
  const shouldEnableSwaggerUI = options.enableSwaggerUI ?? !isProduction;

  console.log("\n");
  console.log(divider);
  console.log(
    `${colors.bright}${colors.yellow}  VOLTAGENT SERVER STARTED SUCCESSFULLY${colors.reset}`,
  );
  console.log(divider);
  console.log(
    `${colors.green}  ✓ ${colors.bright}HTTP Server:  ${colors.reset}${colors.white}http://localhost:${port}${colors.reset}`,
  );

  if (shouldEnableSwaggerUI) {
    console.log(
      `${colors.green}  ✓ ${colors.bright}Swagger UI:   ${colors.reset}${colors.white}http://localhost:${port}/ui${colors.reset}`,
    );
  }

  // Check if custom endpoints were registered
  if (options.customEndpoints && options.customEndpoints.length > 0) {
    console.log();
    console.log(
      `${colors.green}  ✓ ${colors.bright}Registered Endpoints: ${colors.reset}${colors.dim}${options.customEndpoints.length} total${colors.reset}`,
    );

    const groupMap = new Map<string, ServerEndpointSummary[]>();
    options.customEndpoints.forEach((endpoint) => {
      const groupLabel = endpoint.group?.trim() || "Custom Endpoints";
      if (!groupMap.has(groupLabel)) {
        groupMap.set(groupLabel, []);
      }
      groupMap.get(groupLabel)?.push(endpoint);
    });

    const methodOrder = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"];

    groupMap.forEach((endpoints, groupLabel) => {
      console.log();
      console.log(`${colors.bright}${colors.white}    ${groupLabel}${colors.reset}`);

      const methodGroups: Record<string, string[]> = {};
      endpoints.forEach((endpoint) => {
        const method = (endpoint.method ?? "").toUpperCase();
        const normalizedMethod = method.length > 0 ? method : "GET";
        if (!methodGroups[normalizedMethod]) {
          methodGroups[normalizedMethod] = [];
        }
        methodGroups[normalizedMethod].push(endpoint.path);
      });

      methodOrder.forEach((method) => {
        if (methodGroups[method]) {
          methodGroups[method].forEach((path) => {
            console.log(
              `${colors.dim}      ${method.padEnd(6)} ${colors.reset}${colors.white}${path}${colors.reset}`,
            );
          });
        }
      });
    });
  }

  console.log();
  console.log(
    `${colors.bright}${colors.yellow}  ${colors.bright}Test your agents with VoltOps Console: ${colors.reset}${colors.white}https://console.voltagent.dev${colors.reset}`,
  );
  console.log(divider);
}

/**
 * Get all ports to try in order
 */
export function getPortsToTry(preferredPort?: number): number[] {
  const ports: number[] = [];

  // Add user-specified port first if provided
  if (preferredPort) {
    ports.push(preferredPort);
  }

  // Add our preferred ports
  ports.push(...preferredPorts.map((p) => p.port));

  // Add fallback ports (4300-4400)
  for (let i = 0; i <= 100; i++) {
    ports.push(4300 + i);
  }

  return ports;
}

// Re-export port manager for convenience
export { portManager } from "./port-manager";
