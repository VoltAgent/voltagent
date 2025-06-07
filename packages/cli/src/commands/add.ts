import chalk from "chalk";
import type { Command } from "commander";
import { captureError } from "../utils/analytics";

export const registerAddCommand = (program: Command) => {
  program
    .command("add <agent-slug>")
    .description("Add a VoltAgent agent from the marketplace to your project.")
    .action(async (agentSlug: string) => {
      try {
        console.log(
          chalk.yellow(
            `\n🚧 The 'add' command is coming soon! This feature will allow you to easily integrate agents like '${agentSlug}' into your project.\n`,
          ),
        );
        console.log(
          chalk.cyan("\nWant to be among the first to try it out and shape its development?\n"),
        );
        console.log(
          chalk.cyan(
            `Join the discussion on GitHub and become an early user: ${chalk.underline(
              "https://github.com/orgs/voltagent/discussions/74/",
            )}\n`,
          ),
        );
        console.log(chalk.gray("\nWe appreciate your interest!\n"));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(chalk.red("\nAn unexpected error occurred:"));
        console.error(errorMessage);

        captureError({
          command: "add",
          errorMessage,
        });

        // Ensure PostHog events are sent before exiting with error
        // Need to import posthogClient if you uncomment tracking above or want error tracking here
        // await posthogClient.shutdown();
        process.exit(1);
      }
    });
};
