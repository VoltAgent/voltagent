---
"@voltagent/server-core": patch
"@voltagent/server-hono": patch
---

fix: add URL path support for single package updates and resolve 404 errors

## The Problem

The update endpoint only accepted package names via request body (`POST /updates` with `{ "packageName": "@voltagent/core" }`), but users expected to be able to specify the package name directly in the URL path (`POST /updates/@voltagent/core`). This caused 404 errors when trying to update individual packages using the more intuitive URL-based approach.

## The Solution

Added a new route `POST /updates/:packageName` that accepts the package name as a URL parameter, providing a more RESTful API design while maintaining backward compatibility with the existing body-based approach.

**New Routes Available:**

- `POST /updates/@voltagent/core` - Update single package (package name in URL path)
- `POST /updates` with body `{ "packageName": "@voltagent/core" }` - Update single package (package name in body)
- `POST /updates` with no body - Update all VoltAgent packages

**Package Manager Detection:**
The system automatically detects your package manager based on lock files:

- `pnpm-lock.yaml` → uses `pnpm add`
- `yarn.lock` → uses `yarn add`
- `package-lock.json` → uses `npm install`
- `bun.lockb` → uses `bun add`

## Usage Example

```typescript
// Update a single package using URL path
fetch("http://localhost:3141/updates/@voltagent/core", {
  method: "POST",
});

// Or using the body parameter (backward compatible)
fetch("http://localhost:3141/updates", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ packageName: "@voltagent/core" }),
});

// Update all packages
fetch("http://localhost:3141/updates", {
  method: "POST",
});
```
