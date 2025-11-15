import { Octokit } from "@octokit/rest";
import { createTool } from "@voltagent/core";
import { z } from "zod";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
  userAgent: "volt-github-star-stories",
});

export const fetchGithubProfileTool = createTool({
  name: "fetch_github_profile",
  description:
    "Fetches GitHub profile metadata (followers, repos, bio, location, etc.) for celebration stories.",
  parameters: z.object({
    username: z.string().describe("GitHub username to fetch"),
  }),
  execute: async ({ username }: { username: string }) => {
    const response = await octokit.users.getByUsername({ username });
    const data = response.data;

    return {
      login: data.login,
      name: data.name ?? data.login,
      bio: data.bio,
      followers: data.followers,
      following: data.following,
      publicRepos: data.public_repos,
      publicGists: data.public_gists,
      location: data.location,
      company: data.company,
      blog: data.blog,
      profileUrl: data.html_url,
      avatarUrl: data.avatar_url,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },
});
