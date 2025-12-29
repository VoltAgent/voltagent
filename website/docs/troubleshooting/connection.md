---
title: Connection Issues
description: Troubleshooting local connection issues with VoltAgent Console
---

# Troubleshooting Connection Issues

If you see a "Connection Failed" or "Local Connection Blocked" error in the VoltAgent Console, it means the web interface cannot communicate with your local VoltAgent server.

This usually happens for one of two reasons:

1.  **Browser Security:** Your browser is blocking the connection to `localhost` (common in Chrome/Brave/Edge).
2.  **Server Not Running:** Your VoltAgent project is not running.

## Scenario 1: Browser Blocking (CORS/Mixed Content)

Modern browsers (Chrome, Brave, Edge, Safari) often block connections from a secure website (`https://console.voltagent.dev`) to an insecure local server (`http://localhost:3141`). This is a security feature called "Mixed Content Blocking".

### Solution A: Allow Insecure Content (Recommended)

You can tell your browser to allow this specific connection. This is safe for localhost development.

#### Chrome / Edge / Brave

1.  Look at the **address bar** at the top of your browser.
2.  Click the **Lock icon** 🔒 or **"Not Secure"** warning.
3.  Click **Site Settings**.
4.  Find **Insecure Content** in the list.
5.  Change it from "Block" (default) to **"Allow"**.
6.  Reload the page.

#### Safari

1.  Safari is stricter and may not allow this easily.
2.  We recommend using **Solution B (Volt Tunnel)** for Safari users.

### Solution B: Use Volt Tunnel

If you cannot or do not want to change browser settings, you can use the built-in tunnel. This creates a secure HTTPS link to your local machine.

1.  Stop your current server (Ctrl+C).
2.  Run the tunnel command:

    ```bash
    pnpm volt tunnel 3141
    ```

    _(Or `npm run volt tunnel 3141` / `yarn volt tunnel 3141`)_

3.  The console will automatically detect the secure URL and connect.

## Scenario 2: Server Not Running

If the WebSocket connection fails entirely, your VoltAgent server might be stopped.

1.  Open your terminal.
2.  Navigate to your project folder.
3.  Run the development server:

    **Using npm:**

    ```bash
    npm run dev
    ```

    **Using pnpm:**

    ```bash
    pnpm dev
    ```

    **Using yarn:**

    ```bash
    yarn dev
    ```

4.  Wait for the "Server ready" message and reload the console.

## Still having issues?

If none of the above works:

- Check if port **3141** is being used by another application.
- Try opening `http://localhost:3141/health` in your browser to see if the API is responsive.
- Join our [Discord Community](http://s.voltagent.dev/discord) for support.
