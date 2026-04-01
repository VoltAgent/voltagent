# GitHub Star Stories (VoltOps + Octokit Tools)

A minimal VoltAgent example (based on the `base` starter) that exposes a single agent.
Give it commands like `celebrate octocat` and it will:

1. Call an Octokit-powered tool to fetch the user’s profile
2. Write a short thank-you story (120 words max)
3. Send that story to Discord through VoltOps Actions

## Run locally

```bash
cd examples/with-github-star-stories
cp .env.example .env
pnpm install
pnpm dev
```

Once the server is running, you can hit the VoltAgent generate endpoint:

```bash
curl -X POST http://localhost:3141/api/agent/generateText \
  -H "Content-Type: application/json" \
  -d '{
    "agent": "storyteller",
    "input": "celebrate octocat"
  }'
```

The agent responds with the Markdown story and (if VoltOps credentials are set) the same text is pushed to Discord.

## Environment

| Variable                                        | Description                                                                                  |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `VOLTAGENT_PUBLIC_KEY` / `VOLTAGENT_SECRET_KEY` | VoltOps API keys (needed for Discord actions + observability)                                |
| `VOLTOPS_DISCORD_CREDENTIAL_ID`                 | Credential ID from your Discord action binding (stored credential path)                      |
| `VOLTOPS_DISCORD_CATALOG_ID`                    | Optional catalog/binding ID for stored credentials                                           |
| `DISCORD_BOT_TOKEN` / `DISCORD_WEBHOOK_URL`     | Inline credential option – provide a bot token or webhook URL instead of a stored credential |
| `DISCORD_CHANNEL_ID` / `DISCORD_GUILD_ID`       | Target Discord channel + guild (defaults to the binding’s config when omitted)               |
| `GITHUB_TOKEN`                                  | Personal access token with basic read access                                                 |
| `GITHUB_TARGET_REPO` / `GITHUB_TARGET_REPO_URL` | Repo name/URL to reference in stories                                                        |

## Wiring to VoltOps triggers

To celebrate real GitHub stars:

1. Add the GitHub “Repository Starred” trigger in VoltOps
2. When the trigger fires, queue a VoltOps action or workflow that calls this agent with `celebrate <username>`
3. The toolchain ensures Discord gets the story automatically

That’s it—no extra routes or boilerplate required.
