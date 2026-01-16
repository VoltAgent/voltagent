import "dotenv/config";
import { Agent, VoltAgent, VoltOpsClient, createTool, createTriggers } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
/* import { honoServer } from "@voltagent/server-hono"; */
import { serverlessHono } from "@voltagent/serverless-hono";
import { fetchGithubProfileTool, shareDiscordStoryTool } from "./tools.js";

const logger = createPinoLogger({
  name: "github-star-stories",
  level: "info",
});

const storytellerAgent = new Agent({
  name: "StarStoryAgent",
  model: "openai/gpt-4o-mini",
  tools: [fetchGithubProfileTool, shareDiscordStoryTool],
  instructions: `You celebrate developers who star our GitHub repository with fun and creative messages!

When the user says "celebrate <username>", do the following:
1. Call fetch_github_profile with that username.
2. Create a fun, creative celebration message (3-4 sentences, <120 words) that:
   - Thanks them for the star with enthusiasm and humor
   - Mentions 1-2 interesting stats from their profile (followers, repos, location, etc.)
   - Uses emojis to make it lively (🌟⭐🎉🚀💫)
   - Has a playful, friendly tone
3. Call share_discord_story with a catchy headline (use emojis!) and the celebration message.

Be creative! You can use puns, jokes, or references based on their username or location. Make each celebration unique and memorable.`,
});

interface GitHubStarPayload {
  action: "created" | "deleted";
  starred_at: string | null;
  sender: { login: string; id: number; avatar_url: string };
  repository: { id: number; name: string; full_name: string };
}

// For Serverless
const voltAgent = new VoltAgent({
  agents: {
    storyteller: storytellerAgent,
  },
  triggers: createTriggers((on) => {
    on.github.star(async ({ payload }) => {
      const star = payload as GitHubStarPayload;
      if (star.action !== "created") return { skip: true, reason: "Unstarred" };
      await storytellerAgent.generateText(`celebrate '${star.sender.login}'`);
    });
  }),
  logger,
  serverless: serverlessHono(),
  // For REST Server
  // server: honoServer(),
});

export default voltAgent.serverless().toCloudflareWorker();
