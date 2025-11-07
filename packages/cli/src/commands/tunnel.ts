import chalk from "chalk";
import type { Command } from "commander";
import localtunnel from "localtunnel";
import ora from "ora";
import { captureError, captureTunnelEvent } from "../utils/analytics";

export const registerTunnelCommand = (program: Command) => {
  program
    .command("tunnel")
    .description("Expose your local VoltAgent server through the VoltAgent tunnel service.")
    .argument("[port]", "Local port to expose", "3141")
    .action(async (portArg?: string) => {
      const portValue = portArg ?? "3141";
      const port = Number.parseInt(portValue, 10);

      if (Number.isNaN(port) || port <= 0) {
        console.error(chalk.red("\nInvalid port provided. Please specify a valid port number.\n"));
        process.exit(1);
      }

      const spinner = ora("Opening tunnel...").start();
      try {
        const tunnel = await localtunnel({
          port,
          host: "https://tunnel.voltagent.dev",
        });
        const url = tunnel.url;

        spinner.succeed(`Tunnel ready at ${chalk.cyan(url)}`);
        captureTunnelEvent();
        console.log();
        console.log(chalk.gray("Press Ctrl+C to close the tunnel when you are finished."));
        console.log(
          chalk.gray(`Forwarding requests from ${chalk.cyan(url)} to http://localhost:${port}`),
        );
        console.log();

        let closing = false;
        const shutdown = async (signal?: NodeJS.Signals) => {
          if (closing) {
            return;
          }
          closing = true;
          console.log(
            chalk.gray(signal ? `\nReceived ${signal}, closing tunnel...` : "\nClosing tunnel..."),
          );
          try {
            tunnel.close();
          } catch {
            // Ignore errors on shutdown
          }
          process.exit(0);
        };

        process.on("SIGINT", shutdown);
        process.on("SIGTERM", shutdown);

        // Keep the process alive until the tunnel is closed.
        await new Promise(() => {
          // Intentionally unresolved promise
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        spinner.fail("Failed to establish tunnel.");
        console.error(chalk.red(errorMessage));

        captureError({
          command: "tunnel",
          errorMessage,
        });

        process.exit(1);
      }
    });
};
