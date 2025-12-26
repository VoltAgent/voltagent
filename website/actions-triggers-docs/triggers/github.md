---
title: GitHub Trigger
---

import GitHubEventTypes from "@site/src/components/blog-widgets/GitHubEventTypes";

The GitHub trigger responds to webhook events from your repositories in real-time. When events like pushes, pull requests, issues, or releases occur, VoltOps executes your configured agents or workflows.

For trigger setup and usage instructions, see the [Usage Guide](https://voltagent.dev/automations-docs/triggers/overviewusage/).

**Use Cases**:

- Run code review agents when pull requests are opened
- Automate issue triage and labeling
- Trigger deployments on release events
- Monitor security advisories and vulnerabilities
- Sync repository changes across systems

## Setting Credential

To set up GitHub authentication, you need to create a credential. This is configured in **Step 1 (Connection)** when creating a trigger.

1. Navigate to the [VoltOps Triggers page](https://console.voltagent.dev/triggers)
2. Select GitHub as the provider
3. In the **Connection** step, either select an existing credential or create a new one
4. Choose between Personal Access Token or OAuth 2.0 and follow the instructions below.

<video controls loop muted playsInline style={{width: '100%', height: 'auto'}}>

  <source src="https://cdn.voltagent.dev/console/trigger/github/github-credentials.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

<br/>
<br/>

### Personal Access Token

**Create your token:**

1. Visit [github.com/settings/tokens](https://github.com/settings/tokens)
2. Click **Generate new token** → **New personal access token (classic)**
3. Create a personal access token with `repo` and `admin:repo_hook` scopes

**Configure in VoltOps Console:**

1. Enter your **Personal Access Token** so VoltOps can create and verify repository webhooks
2. VoltOps generates and stores the webhook secret. No additional configuration is required
3. Configure optional fields:
   - **GitHub Server**: Update if using GitHub Enterprise (e.g., `https://github.example.com/api/v3`). Default: `https://api.github.com`
   - **Repository Owner**: Optional default repository owner
   - **Account Label**: Optional label for organization or user

### OAuth 2.0

OAuth 2.0 supports token rotation and revocable access.

**Setup steps:**

1. Copy the **OAuth Redirect URL** displayed in the console (e.g., `https://api.voltagent.dev/triggers/oauth/callback/github`)
2. Navigate to [GitHub Settings → Developer settings → OAuth Apps](https://github.com/settings/developers) and create a new OAuth App
3. Provide a name and homepage URL for your OAuth App
4. Paste the OAuth Redirect URL as the **Authorization callback URL** in GitHub
5. Generate a **Client ID** and **Client Secret** in GitHub, then enter them in VoltOps Console
6. Configure optional fields:
   - **GitHub Server**: Update if using GitHub Enterprise (e.g., `https://github.example.com/api/v3`). Default: `https://api.github.com`
   - **Account Label**: Optional label for organization or user
   - **Repository Owner**: Optional default repository owner
7. Click **Authorize with GitHub** to complete the authorization flow

**Required OAuth Scopes:**

VoltOps requests the following scopes during authorization:

- `repo` - Access repositories
- `admin:repo_hook` - Manage webhooks
- `user` - Access user profile
- `read:user` - Read user profile data

:::note[OAuth Redirect URL]
The redirect URL is provided by VoltOps Console and routes the OAuth callback to the correct endpoint. You must copy this URL exactly as shown in the console, including the protocol (https://) and path.
:::

:::tip[When to Use OAuth]
Use OAuth 2.0 for team environments, production deployments, or credential rotation requirements. Personal Access Tokens are simpler for individual development.
:::

## Trigger Configuration

After configuring credentials, you need to specify which repository and events to monitor.

<video controls loop muted playsInline style={{width: '100%', height: 'auto'}}>

  <source src="https://cdn.voltagent.dev/console/trigger/github/configuration.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>

<br/>
<br/>

Select the credential you created and configure the repository settings:

### Owner

Enter the GitHub repository owner (username or organization name).

### Repository

Enter the repository name within the owner's account.

:::tip
VoltOps listens for events from this repository and configures the GitHub webhook automatically.
:::

### Branch Filter (Optional)

Restrict **push events** to a specific branch. Leave blank to allow all branches.

:::note
The branch filter only applies to **push events**. Other events (pull requests, issues, releases, etc.) are not affected by this filter.
:::

## Event Types

GitHub triggers support all GitHub webhook events. VoltOps configures the webhook when you create a trigger. No manual webhook setup is required.

When creating a trigger in VoltOps Console, you can select which events to listen for. The trigger will only execute when the selected events occur.

GitHub webhook events include:

<GitHubEventTypes />

## Add Target to Activate Binding

After configuring your GitHub trigger, you need to add a target (agent or workflow) to activate the binding. For detailed instructions on:

- Adding targets to activate bindings
- Mapping trigger data to agent inputs
- Testing triggers with sample payloads
- Deploying and monitoring triggers

See the [Add Target to Activate Binding section](https://voltagent.dev/automations-docs/triggers/overviewusage/#step-3-add-target-to-activate-binding). These steps are the same for all trigger providers.

## GitHub Enterprise Support

VoltOps supports GitHub Enterprise Server deployments. When creating your credential, configure the **GitHub server** field to point to your GitHub Enterprise API endpoint.

GitHub Enterprise API endpoints typically follow the format `https://[hostname]/api/v3`. The default is `https://api.github.com` for GitHub.com.

## Payload Structure

VoltOps wraps GitHub webhook payloads in a standardized format. The payload structure includes metadata about the event and the complete GitHub webhook data.

### Wrapper Format

All GitHub events delivered by VoltOps follow this structure:

```json
{
  "event": "push", // The GitHub event type (push, pull_request, issues, etc.)
  "deliveryId": "e7edfcf0-bfa8-11f0-81d5-e3c9c0d87c3c", // Unique identifier for this webhook delivery
  "repository": {
    // Simplified repository information
    "id": 123456,
    "name": "repo-name",
    "fullName": "owner/repo-name",
    "owner": "owner-name",
    "private": false,
    "htmlUrl": "https://github.com/owner/repo-name"
  },
  "payload": {
    // Complete GitHub webhook payload
    // GitHub webhook payload here
  }
}
```

For complete examples of push, pull request, and issue events, see the GitHub webhook documentation.
