import { promises as fs } from "node:fs";
import path from "node:path";
import chalk from "chalk";
import type { Command } from "commander";
import inquirer from "inquirer";
import open from "open";
import cloudflareTemplate from "../templates/cloudflare-wrangler.toml";
import netlifyTemplate from "../templates/netlify.toml";
import vercelTemplate from "../templates/vercel.json.template";
import { captureError } from "../utils/analytics";

const SUPPORTED_TARGETS = ["voltops", "cloudflare", "vercel", "netlify"] as const;
type SupportedTarget = (typeof SUPPORTED_TARGETS)[number];

const CLOUDFLARE_WRANGLER_TEMPLATE = cloudflareTemplate;
const VERCEL_CONFIG_TEMPLATE = vercelTemplate;
const NETLIFY_CONFIG_TEMPLATE = netlifyTemplate;

async function ensureFile(pathToFile: string, contents: string) {
  try {
    await fs.access(pathToFile);
    return false;
  } catch {
    await fs.writeFile(pathToFile, contents, { encoding: "utf8" });
    return true;
  }
}

async function handleVoltOpsDeploy() {
  const url = "https://console.voltagent.dev/deployments";

  console.log(chalk.green("\n⚡ VoltOps Deployments"));
  console.log(chalk.white("   Deploy your VoltAgent application to the cloud with VoltOps.\n"));
  console.log(chalk.dim(`   ${url}\n`));

  const { openBrowser } = await inquirer.prompt([
    {
      type: "confirm",
      name: "openBrowser",
      message: "Open VoltOps Deployments in your browser?",
      default: true,
    },
  ]);

  if (openBrowser) {
    await open(url);
    console.log(chalk.green("\n✅ Opened in browser.\n"));
  }
}

async function handleCloudflareDeploy() {
  const targetPath = path.join(process.cwd(), "wrangler.toml");
  const created = await ensureFile(targetPath, CLOUDFLARE_WRANGLER_TEMPLATE);

  if (created) {
    console.log(chalk.green(`\n✅ Created wrangler.toml at ${targetPath}`));
  } else {
    console.log(
      chalk.yellow(`\n⚠️  wrangler.toml already exists at ${targetPath}. No changes were made.`),
    );
  }

  console.log("\nNext steps:");
  console.log('  1. Build your project: "pnpm build"');
  console.log('  2. Authenticate if needed: "pnpm wrangler login"');
  console.log('  3. Deploy: "pnpm wrangler deploy"');
  console.log(
    '\nNote: If you maintain multiple Cloudflare accounts or use KV/D1 bindings/routes, edit "wrangler.toml" to provide those values.',
  );
  console.log(
    "Need help? Wrangler docs: https://developers.cloudflare.com/workers/wrangler/configuration/",
  );
  console.log("Join the VoltAgent Discord: https://s.voltagent.dev/discord\n");
}

async function handleVercelDeploy() {
  const targetPath = path.join(process.cwd(), "vercel.json");
  const created = await ensureFile(targetPath, VERCEL_CONFIG_TEMPLATE);

  if (created) {
    console.log(chalk.green(`\n✅ Created vercel.json at ${targetPath}`));
  } else {
    console.log(
      chalk.yellow(`\n⚠️  vercel.json already exists at ${targetPath}. No changes were made.`),
    );
  }

  console.log("\nNext steps:");
  console.log('  1. Build your project: "pnpm build"');
  console.log(
    '  2. Ensure you have a serverless entry (example: api/voltagent.ts) that exports "voltAgent.serverless().toVercelEdge()".',
  );
  console.log('  3. Authenticate if needed: "pnpm vercel login" (or "vercel login")');
  console.log('  4. Deploy: "pnpm vercel deploy" (or "vercel deploy")');
  console.log(
    "\nNote: Adjust vercel.json routes/functions if you use a different API path or need environment variables.",
  );
  console.log("Need help? Vercel Edge docs: https://vercel.com/docs/functions/edge-functions");
  console.log("Join the VoltAgent Discord: https://s.voltagent.dev/discord\n");
}

async function handleNetlifyDeploy() {
  const targetPath = path.join(process.cwd(), "netlify.toml");
  const created = await ensureFile(targetPath, NETLIFY_CONFIG_TEMPLATE);

  if (created) {
    console.log(chalk.green(`\n✅ Created netlify.toml at ${targetPath}`));
  } else {
    console.log(
      chalk.yellow(`\n⚠️  netlify.toml already exists at ${targetPath}. No changes were made.`),
    );
  }

  console.log("\nNext steps:");
  console.log('  1. Build your project: "pnpm build"');
  console.log(
    '  2. Add a function file (example: netlify/functions/voltagent.ts) that exports "createNetlifyFunctionHandler(getVoltAgent())".',
  );
  console.log('  3. Authenticate if needed: "pnpm netlify login" (or "netlify login")');
  console.log('  4. Deploy: "pnpm netlify deploy --prod" (or "netlify deploy --prod")');
  console.log(
    "\nNote: Update netlify.toml to match your project (custom paths, environment variables, etc.).",
  );
  console.log("Need help? Netlify Functions docs: https://docs.netlify.com/functions/overview/");
  console.log("Join the VoltAgent Discord: https://s.voltagent.dev/discord\n");
}

export const registerDeployCommand = (program: Command) => {
  program
    .command("deploy")
    .description("Prepare deployment configuration for supported serverless runtimes.")
    .option("-t, --target <target>", "Target platform")
    .action(async (options: { target?: string }) => {
      let target = options.target as SupportedTarget | undefined;

      if (!target) {
        const answer = await inquirer.prompt([
          {
            type: "list",
            name: "chosenTarget",
            message: "Select a deployment target",
            choices: SUPPORTED_TARGETS,
            default: "voltops",
          },
        ]);
        target = answer.chosenTarget as SupportedTarget;
      }

      if (!SUPPORTED_TARGETS.includes(target)) {
        console.error(
          chalk.red(
            `\nUnsupported target \"${target}\". Supported targets: ${SUPPORTED_TARGETS.join(", ")}.\n`,
          ),
        );
        return;
      }

      try {
        switch (target) {
          case "voltops":
            await handleVoltOpsDeploy();
            break;
          case "cloudflare":
            await handleCloudflareDeploy();
            break;
          case "vercel":
            await handleVercelDeploy();
            break;
          case "netlify":
            await handleNetlifyDeploy();
            break;
          default:
            console.log(chalk.yellow("\nNo handlers implemented for the selected target yet.\n"));
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(chalk.red("\nAn unexpected error occurred during deploy setup:"));
        console.error(errorMessage);

        captureError({
          command: "deploy",
          errorMessage,
        });

        process.exit(1);
      }
    });
};
