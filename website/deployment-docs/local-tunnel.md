---
title: Share Your Local Agent with Tunnels
description: Use the VoltAgent CLI to expose localhost over a secure HTTPS tunnel for demos and remote debugging.
---

Sometimes you need to share a running VoltAgent server from your machine – for example when pairing with a teammate, verifying a webhook integration, or previewing changes on a device that can't access `localhost`. The VoltAgent CLI ships with a lightweight tunnel command that makes this one step.

## 1. Ensure the CLI is installed

If your project does not already depend on `@voltagent/cli`, run the init command once. It adds a `volt` script to `package.json` and installs the CLI using your detected package manager (npm/yarn/pnpm):

```bash title="Install the CLI locally"
npx @voltagent/cli init
```

After the install completes you can invoke the CLI through your package manager, e.g. `pnpm volt …` or `npm run volt`.

## 2. Authentication for persistent subdomains (optional)

VoltAgent offers **persistent subdomains** with Core and Pro plans. To use this feature:

### Login with your VoltAgent account

```bash title="Login to VoltAgent"
pnpm volt login
```

This will:

1. Generate a device code
2. Open your browser to `https://console.voltagent.dev/cli-auth`
3. Prompt you to authorize the CLI
4. Save your authentication token locally:
   - macOS/Linux: `~/.config/voltcli/config.json`
   - Windows: `%APPDATA%\voltcli\config.json`

Once logged in:

- **Core/Pro users**: Get a persistent subdomain based on your name (e.g., `john-doe.tunnel.voltagent.dev`)
- **Free users**: Still get random subdomains

### Logout

```bash title="Logout from VoltAgent"
pnpm volt logout
```

Removes your authentication token from the local machine.

## 3. Open a tunnel

Start your VoltAgent development server (`pnpm dev`, `npm run dev`, etc.) and run the tunnel command.

### Basic usage (random subdomain)

If you're not logged in or on a free plan, you'll get a random subdomain:

```bash title="Open tunnel with random subdomain"
pnpm volt tunnel 3141
```

Example output:

- `https://happy-cat-42.tunnel.voltagent.dev`

### Persistent subdomain (Core/Pro)

If you're logged in with a Core or Pro account, you'll get a persistent subdomain based on your name:

```bash title="Open tunnel with persistent subdomain"
pnpm volt tunnel 3141
```

Example output:

- `https://john-doe.tunnel.voltagent.dev`
- Same URL every time you run the command

### Using prefixes (Core/Pro)

Add a prefix to organize multiple tunnels:

```bash title="Open tunnels with prefixes"
pnpm volt tunnel 3141 --prefix agent
pnpm volt tunnel 8080 --prefix api
```

This gives you:

- `https://web-john-doe.tunnel.voltagent.dev`
- `https://api-john-doe.tunnel.voltagent.dev`

**Prefix rules:**

- 1-20 characters
- Alphanumeric and dash only
- Must start with letter or number
- Reserved: `www`, `mail`, `admin`, `console`, `api-voltagent`

> 💡 You can omit the port (`pnpm volt tunnel`) to use the default `3141`.

The command:

1. Connects to the VoltAgent tunnel relay (`https://tunnel.voltagent.dev`)
2. Forwards requests to `http://localhost:[port]`
3. Prints the public HTTPS URL
4. Keeps the tunnel open until you press `Ctrl+C`

You'll also see a `cli_tunnel_opened` telemetry event in PostHog (unless `VOLTAGENT_TELEMETRY_DISABLED` is set), which helps the team understand CLI adoption.

## One-off usage via `npx`

Need a tunnel without installing dependencies? You can run the CLI ad-hoc:

```bash
npx @voltagent/cli tunnel 3141
```

This downloads the CLI temporarily, opens the tunnel, and tears it down when you exit. Omit the port value to use `3141`.

## Notes & limitations

- Tunnels are intended for development and demos, not production traffic.
- **Free plan**: Random subdomain each time
- **Core/Pro plans**: Persistent subdomain based on your username
- If your subdomain is already in use (by another developer), the CLI will show an error and ask you to try a different prefix
- Authentication tokens expire after 365 days - you'll need to login again
- Config file location:
  - macOS/Linux: `~/.config/voltcli/config.json` (XDG Base Directory compliant)
  - Windows: `%APPDATA%\voltcli\config.json`
- Make sure firewalls or security tools allow outbound HTTPS traffic to `*.tunnel.voltagent.dev`

## Dashboard

View and manage active tunnels in the VoltAgent Console:

**[console.voltagent.dev/tunnels](https://console.voltagent.dev/tunnels)**

The dashboard shows:

- All active tunnels in your organization
- Subdomain, port, and user information
- Real-time updates (refreshes every 10 seconds)
- Direct links to open tunnels

You can also see active tunnels in the navbar dropdown (**Servers → Active Tunnels**).

---

That's it – share the generated URL with teammates or test clients, and close the session with `Ctrl+C` when you're done. For persistent URLs across sessions, upgrade to Core or Pro and use `volt login`.
