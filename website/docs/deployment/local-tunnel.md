---
title: Share Your Local Agent with Tunnels
description: Use the VoltAgent CLI to expose localhost over a secure HTTPS tunnel for demos and remote debugging.
---

Sometimes you need to share a running VoltAgent server from your machine – for example when pairing with a teammate, verifying a webhook integration, or previewing changes on a device that can’t access `localhost`. The VoltAgent CLI ships with a lightweight tunnel command that makes this one step.

## 1. Ensure the CLI is installed

If your project does not already depend on `@voltagent/cli`, run the init command once. It adds a `volt` script to `package.json` and installs the CLI using your detected package manager (npm/yarn/pnpm):

```bash title="Install the CLI locally"
npx @voltagent/cli init
```

After the install completes you can invoke the CLI through your package manager, e.g. `pnpm volt …` or `npm run volt`.

## 2. Open a tunnel

Start your VoltAgent development server (`pnpm dev`, `npm run dev`, etc.) and then run:

```bash title="Expose localhost:3141"
pnpm volt tunnel 3141
```

The command:

1. Connects to the VoltAgent tunnel relay (`https://tunnel.voltagent.dev`)
2. Forwards requests to `http://localhost:3141`
3. Prints the public HTTPS URL (for example `https://your-tunnel-address.tunnel.voltagent.dev`)
4. Keeps the tunnel open until you press `Ctrl+C`

> 💡 You can omit the port (`pnpm volt tunnel`) to use the default `3141`.

You’ll also see a `cli_tunnel_opened` telemetry event in PostHog (unless `VOLTAGENT_TELEMETRY_DISABLED` is set), which helps the team understand CLI adoption.

## One-off usage via `npx`

Need a tunnel without installing dependencies? You can run the CLI ad-hoc:

```bash
npx @voltagent/cli tunnel 3141
```

This downloads the CLI temporarily, opens the tunnel, and tears it down when you exit. Omit the port value to use `3141`.

## Notes & limitations

- Tunnels are intended for development and demos, not production traffic.
- The service allocates a random subdomain each time. Reserved/custom domains are not yet supported.
- Make sure firewalls or security tools allow outbound HTTPS traffic to `*.tunnel.voltagent.dev`.

That’s it – share the generated URL with teammates or test clients, and close the session with `Ctrl+C` when you’re done.
