import chalk from "chalk";
import type { Command } from "commander";
import open from "open";
import ora from "ora";
import { captureError, captureLoginEvent } from "../utils/analytics";
import { getVoltOpsConfigPath, readVoltOpsConfig, writeVoltOpsToken } from "../utils/config";

const API_BASE_URL = "https://api.voltagent.dev";

interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

interface TokenResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  isAdmin?: boolean;
}

export const registerLoginCommand = (program: Command) => {
  program
    .command("login")
    .description("Login to VoltAgent to get persistent tunnel subdomains")
    .action(async () => {
      try {
        // Check if already logged in
        const existingConfig = readVoltOpsConfig();
        if (existingConfig) {
          console.log(chalk.yellow("\nYou are already logged in."));
          console.log(chalk.gray(`Email: ${existingConfig.user.email}`));
          console.log(chalk.gray(`Name: ${existingConfig.user.name}`));
          console.log(chalk.gray("\nTo login with a different account, run: volt logout\n"));
          return;
        }

        console.log(chalk.cyan("\n🔐 VoltAgent Login\n"));

        // Step 1: Request device code
        const spinner = ora("Requesting authorization...").start();

        const deviceCodeResponse = await fetch(`${API_BASE_URL}/auth/cli/device-code`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!deviceCodeResponse.ok) {
          throw new Error(`Failed to get device code: ${deviceCodeResponse.statusText}`);
        }

        const deviceCode: DeviceCodeResponse = await deviceCodeResponse.json();
        spinner.succeed("Authorization requested");

        // Step 2: Open browser
        const verificationUrl = `${deviceCode.verification_uri}?code=${deviceCode.user_code}`;

        console.log(chalk.cyan("\n📱 Please authorize this device in your browser"));
        console.log(chalk.gray(`URL: ${verificationUrl}`));
        console.log(chalk.yellow(`\nUser Code: ${chalk.bold(deviceCode.user_code)}\n`));

        try {
          await open(verificationUrl);
          console.log(chalk.gray("Browser opened automatically\n"));
        } catch (_error) {
          console.log(
            chalk.yellow("Could not open browser automatically. Please open the URL manually.\n"),
          );
        }

        // Step 3: Poll for authorization
        const pollSpinner = ora("Waiting for authorization...").start();

        const startTime = Date.now();
        const expiresAt = startTime + deviceCode.expires_in * 1000;
        let authorized = false;
        let accessToken = "";

        while (Date.now() < expiresAt && !authorized) {
          await new Promise((resolve) => setTimeout(resolve, deviceCode.interval * 1000));

          try {
            const tokenResponse = await fetch(`${API_BASE_URL}/auth/cli/token`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                device_code: deviceCode.device_code,
              }),
            });

            const tokenData: TokenResponse = await tokenResponse.json();

            if (tokenData.error === "authorization_pending") {
              // Still waiting
              continue;
            }

            if (tokenData.error === "expired_token") {
              pollSpinner.fail("Authorization expired");
              console.log(chalk.red("\nThe authorization code has expired. Please try again.\n"));
              return;
            }

            if (tokenData.error) {
              throw new Error(tokenData.error_description || tokenData.error);
            }

            if (tokenData.access_token) {
              accessToken = tokenData.access_token;
              authorized = true;
              break;
            }
          } catch (_error) {
            // Network error, continue polling
          }
        }

        if (!authorized) {
          pollSpinner.fail("Authorization timeout");
          console.log(chalk.red("\nAuthorization timed out. Please try again.\n"));
          return;
        }

        pollSpinner.succeed("Authorization successful");

        // Step 4: Get user profile
        const profileSpinner = ora("Fetching user profile...").start();

        const profileResponse = await fetch(`${API_BASE_URL}/auth/profile`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });

        if (!profileResponse.ok) {
          throw new Error("Failed to fetch user profile");
        }

        const userProfile: UserProfile = await profileResponse.json();
        profileSpinner.succeed("Profile fetched");

        // Step 5: Save token
        writeVoltOpsToken(accessToken, {
          email: userProfile.email,
          name: userProfile.name,
        });

        // Track successful login
        captureLoginEvent({ success: true });

        console.log(chalk.green("\n✓ Successfully logged in!"));
        console.log(chalk.gray(`Email: ${userProfile.email}`));
        console.log(chalk.gray(`Name: ${userProfile.name}`));
        console.log(chalk.gray(`Config saved to: ${getVoltOpsConfigPath()}`));
        console.log(
          chalk.cyan("\nYou can now use persistent tunnel subdomains with Core/Pro plans.\n"),
        );
        console.log(chalk.gray("Run: volt tunnel <port> to start a tunnel\n"));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(chalk.red("\n✗ Login failed"));
        console.error(chalk.red(`${errorMessage}\n`));

        // Track failed login
        captureLoginEvent({ success: false, error: errorMessage });

        captureError({
          command: "login",
          errorMessage,
        });

        process.exit(1);
      }
    });
};
