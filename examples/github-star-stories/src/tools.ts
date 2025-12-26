import { VoltOpsClient, createTool } from "@voltagent/core";
import { z } from "zod";

export const fetchGithubProfileTool = createTool({
  name: "fetch_github_profile",
  description: "Fetch GitHub profile metadata (followers, repos, location, etc.)",
  parameters: z.object({
    username: z.string().describe("GitHub username to inspect"),
  }),
  execute: async ({ username }) => {
    console.log(process.env.GITHUB_TOKEN);
    try {
      const response = await fetch(`https://api.github.com/users/${username}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "Cloudflare-Workers/1.0",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch GitHub profile: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        login: data.login,
        name: data.name ?? data.login,
        bio: data.bio,
        followers: data.followers,
        publicRepos: data.public_repos,
        location: data.location,
        url: data.html_url,
      };
    } catch (error) {
      console.log(error);
    }
  },
});

export const shareDiscordStoryTool = createTool({
  name: "share_discord_story",
  description: "Send the celebration story to Discord via VoltOps Actions.",
  parameters: z.object({
    headline: z.string().describe("Short headline announcing the star"),
    story: z.string().describe("Markdown formatted story"),
  }),
  execute: async ({ headline, story }: { headline: string; story: string }) => {
    const voltOpsClient = new VoltOpsClient({
      publicKey: process.env.VOLTAGENT_PUBLIC_KEY,
      secretKey: process.env.VOLTAGENT_SECRET_KEY,
    });

    await voltOpsClient.actions.discord.sendMessage({
      credential: {
        credentialId: process.env.VOLTAGENT_CREDENTIAL_ID || "",
      },
      channelId: "1438213235114246285",
      guildId: "1361559153780195478",
      content: `${headline}\n\n${story}`,
    });

    return { delivered: true };
  },
});
