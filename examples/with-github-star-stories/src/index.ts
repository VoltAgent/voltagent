import "dotenv/config";
import { openai } from "@ai-sdk/openai";
import { Octokit } from "@octokit/rest";
import { Agent, VoltAgent, VoltOpsClient, createTool, createTriggers } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { z } from "zod";

const logger = createPinoLogger({
  name: "github-star-stories",
  level: "info",
});

const voltOpsClient = new VoltOpsClient({
  publicKey: process.env.VOLTAGENT_PUBLIC_KEY,
  secretKey: process.env.VOLTAGENT_SECRET_KEY,
  baseUrl: "http://localhost:3003",
});

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
  userAgent: "volt-github-star-stories",
});

const fetchGithubProfileTool = createTool({
  name: "fetch_github_profile",
  description: "Fetch GitHub profile metadata (followers, repos, location, etc.).",
  parameters: z.object({
    username: z.string().describe("GitHub username to inspect"),
  }),
  execute: async ({ username }: { username: string }) => {
    const response = await octokit.users.getByUsername({ username });
    return {
      login: response.data.login,
      name: response.data.name ?? response.data.login,
      bio: response.data.bio,
      followers: response.data.followers,
      publicRepos: response.data.public_repos,
      location: response.data.location,
      url: response.data.html_url,
    };
  },
});

const shareDiscordStoryTool = createTool({
  name: "share_discord_story",
  description: "Send the celebration story to Discord via VoltOps Actions.",
  parameters: z.object({
    headline: z.string().describe("Short headline announcing the star"),
    story: z.string().describe("Markdown formatted story"),
  }),
  execute: async ({ headline, story }: { headline: string; story: string }) => {
    await voltOpsClient.actions.discord.sendMessage({
      credential: {
        credentialId: "ef8e0a5f-b1fc-45b5-8920-b4df909baea3",
      },
      channelId: "1438213235114246285",
      guildId: "1361559153780195478",
      content: `${headline}\n\n${story}`,
    });

    return { delivered: true };
  },
});

const storytellerAgent = new Agent({
  name: "StarStoryAgent",
  model: openai("gpt-4o-mini"),
  tools: [fetchGithubProfileTool, shareDiscordStoryTool],
  instructions: `You celebrate developers who star our GitHub repository.
When the user says "celebrate <username>", do the following:
1. Call fetch_github_profile with that username.
2. Write a 3-4 sentence Markdown story (<120 words) that thanks them for the star,
   highlights 1-2 stats (followers, repos, location, etc.), and invites them to
   join the VoltAgent Discord: https://s.voltagent.dev/discord.
3. Call share_discord_story with a short headline and the story so it posts to Discord.
Return the same story in your final response.`,
});

new VoltAgent({
  agents: {
    storyteller: storytellerAgent,
  },
  server: honoServer(),
  triggers: createTriggers((on) => {
    on.github.star(async ({ payload, event, trigger, headers }) => {
      console.log({
        payload,
        event,
        trigger,
        headers,
      });
      await storytellerAgent.generateText("selam");
    });

    on.cron.schedule(({ payload }) => {
      console.log({ payload });
    });

    on.airtable.recordCreated(({ payload, event }) => {
      console.log({ payload, event });

      return { status: 422, body: { hede: 2 } };
    });
  }),
  logger,
});
