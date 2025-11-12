---
"@voltagent/cli": patch
---

feat: add authentication and tunnel prefix support to VoltAgent CLI

## Authentication Commands

Added `volt login` and `volt logout` commands for managing VoltAgent CLI authentication:

### volt login

- Implements Device Code Flow authentication
- Opens browser to `https://console.voltagent.dev/cli-auth` for authorization
- Stores authentication token in XDG-compliant config location:
  - macOS/Linux: `~/.config/voltcli/config.json`
  - Windows: `%APPDATA%\voltcli\config.json`
- Tokens expire after 365 days
- Enables persistent subdomains for Core/Pro plan users

```bash
pnpm volt login
```

### volt logout

- Removes authentication token from local machine
- Clears stored credentials

```bash
pnpm volt logout
```

## Persistent Tunnel Subdomains

Authenticated Core/Pro users now receive persistent subdomains based on their username:

**Before (unauthenticated or free plan):**

```bash
pnpm volt tunnel 3141
# → https://happy-cat-42.tunnel.voltagent.dev (changes each time)
```

**After (authenticated Core/Pro):**

```bash
pnpm volt tunnel 3141
# → https://john-doe.tunnel.voltagent.dev (same URL every time)
```

## Tunnel Prefix Support

Added `--prefix` flag to organize multiple tunnels with custom subdomain prefixes:

```bash
pnpm volt tunnel 3141 --prefix agent
# → https://agent-john-doe.tunnel.voltagent.dev

pnpm volt tunnel 8080 --prefix api
# → https://api-john-doe.tunnel.voltagent.dev
```

**Prefix validation rules:**

- 1-20 characters
- Alphanumeric and dash only
- Must start with letter or number
- Reserved prefixes: `www`, `mail`, `admin`, `console`, `api-voltagent`

**Error handling:**

- Subdomain collision detection (if already in use by another user)
- Clear error messages with suggestions to try different prefixes

## Config Migration

Config location migrated from `.voltcli` to XDG-compliant paths for better cross-platform support and adherence to OS conventions.

See the [local tunnel documentation](https://voltagent.dev/docs/deployment/local-tunnel) for complete usage examples.
