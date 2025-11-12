import chalk from "chalk";
import type { Command } from "commander";
import localtunnel from "localtunnel";
import ora from "ora";
import { captureError, captureTunnelEvent } from "../utils/analytics";
import {
  deleteVoltOpsToken,
  getTunnelPrefix,
  readVoltOpsConfig,
  readVoltOpsToken,
} from "../utils/config";

const API_BASE_URL = "https://api.voltagent.dev";
const TUNNEL_HOST = "https://tunnel.voltagent.dev";

interface SubdomainResponse {
  subdomain: string | null;
  hasPaidPlan: boolean;
  planName: string;
}

function validatePrefix(prefix: string): boolean {
  // Alphanumeric and dash, 1-20 characters, must start with letter or number
  const regex = /^[a-z0-9][a-z0-9-]{0,19}$/;

  if (!regex.test(prefix)) {
    return false;
  }

  // Reserved prefixes
  const reserved = ["www", "mail", "admin", "console", "api-voltagent"];
  if (reserved.includes(prefix)) {
    return false;
  }

  return true;
}

export const registerTunnelCommand = (program: Command) => {
  program
    .command("tunnel")
    .description("Expose your local VoltAgent server through the VoltAgent tunnel service")
    .argument("[port]", "Local port to expose", "3141")
    .option("-p, --prefix <prefix>", "Subdomain prefix (e.g. agent, web, api)")
    .action(async (portArg?: string, options?: { prefix?: string }) => {
      const portValue = portArg ?? "3141";
      const port = Number.parseInt(portValue, 10);

      if (Number.isNaN(port) || port <= 0) {
        console.error(chalk.red("\nInvalid port provided. Please specify a valid port number.\n"));
        process.exit(1);
      }

      // Validate prefix if provided
      if (options?.prefix) {
        if (!validatePrefix(options.prefix)) {
          console.error(chalk.red("\n✗ Invalid prefix"));
          console.error(
            chalk.gray(
              "Prefix must be 1-20 characters, lowercase letters, numbers, and dashes only.",
            ),
          );
          console.error(chalk.gray("Examples: agent, web, api, my-app\n"));
          process.exit(1);
        }
      }

      try {
        // Check for login token
        const token = readVoltOpsToken();

        if (!token) {
          // Not logged in - use random subdomain
          console.log(chalk.yellow("\n⚠ Not logged in"));
          console.log(chalk.gray("Login to get a persistent subdomain for Core/Pro plans"));
          console.log(chalk.cyan("→ Run: volt login\n"));

          const spinner = ora("Opening tunnel...").start();

          const tunnel = await localtunnel({
            port,
            host: TUNNEL_HOST,
          });

          spinner.succeed("Tunnel opened");
          console.log(chalk.cyan(`\n✓ Tunnel ready at ${chalk.bold(tunnel.url)}\n`));
          captureTunnelEvent({
            authenticated: false,
            has_paid_plan: false,
            plan_name: "free",
            has_prefix: false,
          });
          console.log(chalk.gray("Press Ctrl+C to close the tunnel"));
          console.log(
            chalk.gray(`Forwarding ${chalk.cyan(tunnel.url)} → http://localhost:${port}\n`),
          );

          await setupTunnelShutdown(tunnel);
          return;
        }

        // Logged in - check subdomain
        const config = readVoltOpsConfig();
        const spinner = ora("Checking subscription...").start();

        try {
          const response = await fetch(`${API_BASE_URL}/auth/cli/subdomain`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });

          if (response.status === 401) {
            // Token expired
            spinner.fail("Token expired");
            console.log(chalk.yellow("\nYour login token has expired. Please login again."));
            console.log(chalk.cyan("→ Run: volt login\n"));
            deleteVoltOpsToken();
            process.exit(1);
          }

          if (!response.ok) {
            throw new Error(`Failed to check subscription: ${response.statusText}`);
          }

          const subdomainData: SubdomainResponse = await response.json();
          spinner.succeed("Subscription checked");

          if (!subdomainData.subdomain || !subdomainData.hasPaidPlan) {
            // Free plan - use random subdomain
            console.log(chalk.yellow("\n⚠ Free plan - using random subdomain"));
            console.log(chalk.gray("Upgrade to Core/Pro for persistent subdomain"));
            console.log(chalk.cyan("→ Visit: https://console.voltagent.dev\n"));

            const tunnelSpinner = ora("Opening tunnel...").start();

            const tunnel = await localtunnel({
              port,
              host: TUNNEL_HOST,
            });

            tunnelSpinner.succeed("Tunnel opened");
            console.log(chalk.cyan(`\n✓ Tunnel ready at ${chalk.bold(tunnel.url)}\n`));
            captureTunnelEvent({
              authenticated: true,
              has_paid_plan: false,
              plan_name: "free",
              has_prefix: false,
            });
            console.log(chalk.gray("Press Ctrl+C to close the tunnel"));
            console.log(
              chalk.gray(`Forwarding ${chalk.cyan(tunnel.url)} → http://localhost:${port}\n`),
            );

            await setupTunnelShutdown(tunnel);
            return;
          }

          // Core/Pro plan - use persistent subdomain
          const prefix = options?.prefix || getTunnelPrefix() || null;
          const fullSubdomain = prefix
            ? `${prefix}-${subdomainData.subdomain}`
            : subdomainData.subdomain;

          console.log(
            chalk.green(
              `\n✓ ${subdomainData.planName.charAt(0).toUpperCase() + subdomainData.planName.slice(1)} plan detected`,
            ),
          );
          if (config) {
            console.log(chalk.gray(`Logged in as: ${config.user.email}`));
          }
          console.log();

          const tunnelSpinner = ora("Opening persistent tunnel...").start();

          const tunnel = await localtunnel({
            port,
            host: TUNNEL_HOST,
            subdomain: fullSubdomain,
          });

          // Check if we got the requested subdomain
          const actualUrl = new URL(tunnel.url);
          const actualSubdomain = actualUrl.hostname.split(".")[0];

          if (actualSubdomain !== fullSubdomain) {
            tunnelSpinner.fail("Subdomain not available");
            console.log(chalk.red(`\n✗ Subdomain "${fullSubdomain}" is already in use`));
            console.log(chalk.yellow("\nTry a different prefix or wait a moment and try again\n"));
            tunnel.close();
            process.exit(1);
          }

          tunnelSpinner.succeed("Persistent tunnel opened");
          console.log(chalk.green(`\n✓ Tunnel ready at ${chalk.bold(tunnel.url)}\n`));

          if (prefix) {
            console.log(chalk.gray(`  Prefix: ${prefix}`));
          }
          console.log(chalk.gray(`  Subdomain: ${fullSubdomain}`));
          console.log(chalk.gray("  This URL will remain the same across sessions\n"));

          captureTunnelEvent({
            authenticated: true,
            has_paid_plan: subdomainData.hasPaidPlan,
            plan_name: subdomainData.planName,
            has_prefix: !!prefix,
          });

          // Register tunnel with API
          try {
            await registerTunnel(token, {
              subdomain: fullSubdomain,
              port,
              prefix: prefix || null,
            });
          } catch (_error) {
            console.log(chalk.yellow("⚠ Failed to register tunnel with API"));
          }

          console.log(chalk.gray("Press Ctrl+C to close the tunnel"));
          console.log(
            chalk.gray(`Forwarding ${chalk.cyan(tunnel.url)} → http://localhost:${port}\n`),
          );

          // Start heartbeat
          const heartbeatInterval = startHeartbeat(token, fullSubdomain);

          await setupTunnelShutdown(tunnel, token, fullSubdomain, heartbeatInterval);
        } catch (error) {
          spinner.fail("Failed to check subscription");
          throw error;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(chalk.red("\n✗ Failed to establish tunnel"));
        console.error(chalk.red(`${errorMessage}\n`));

        captureError({
          command: "tunnel",
          errorMessage,
        });

        process.exit(1);
      }
    });
};

interface RegisterTunnelData {
  subdomain: string;
  port: number;
  prefix: string | null;
}

async function registerTunnel(token: string, data: RegisterTunnelData): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/tunnels/register`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to register tunnel: ${response.statusText}`);
  }
}

function startHeartbeat(token: string, subdomain: string): NodeJS.Timeout {
  return setInterval(async () => {
    try {
      await fetch(`${API_BASE_URL}/tunnels/heartbeat`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ subdomain }),
      });
    } catch {
      // Ignore heartbeat errors
    }
  }, 30000); // 30 seconds
}

async function disconnectTunnel(token: string, subdomain: string): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/tunnels/${subdomain}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
  } catch {
    // Ignore disconnect errors
  }
}

async function setupTunnelShutdown(
  tunnel: any,
  token?: string,
  subdomain?: string,
  heartbeatInterval?: NodeJS.Timeout,
): Promise<never> {
  let closing = false;

  const shutdown = async (signal?: NodeJS.Signals) => {
    if (closing) {
      return;
    }
    closing = true;

    console.log(
      chalk.gray(signal ? `\nReceived ${signal}, closing tunnel...` : "\nClosing tunnel..."),
    );

    // Clear heartbeat
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }

    // Disconnect from API
    if (token && subdomain) {
      await disconnectTunnel(token, subdomain);
    }

    try {
      tunnel.close();
    } catch {
      // Ignore errors on shutdown
    }

    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // Keep the process alive until the tunnel is closed
  await new Promise(() => {
    // Intentionally unresolved promise
  });

  // TypeScript needs this for type safety (never reached)
  process.exit(0);
}
