import chalk from "chalk";
import type { Command } from "commander";
import { captureError, captureLogoutEvent } from "../utils/analytics";
import { deleteVoltOpsToken, getVoltOpsConfigPath, readVoltOpsConfig } from "../utils/config";

export const registerLogoutCommand = (program: Command) => {
  program
    .command("logout")
    .description("Logout from VoltAgent")
    .action(async () => {
      try {
        const config = readVoltOpsConfig();

        if (!config) {
          console.log(chalk.yellow("\nYou are not logged in.\n"));
          return;
        }

        deleteVoltOpsToken();

        // Track logout event
        captureLogoutEvent();

        console.log(chalk.green("\n✓ Successfully logged out"));
        console.log(chalk.gray(`Email: ${config.user.email}`));
        console.log(chalk.gray(`Config removed from: ${getVoltOpsConfigPath()}\n`));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(chalk.red("\n✗ Logout failed"));
        console.error(chalk.red(`${errorMessage}\n`));

        captureError({
          command: "logout",
          errorMessage,
        });

        process.exit(1);
      }
    });
};
