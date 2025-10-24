---
"@voltagent/cli": patch
---

fix: auto-detect package managers and add automatic installation to `volt update` command

## The Problem

The `volt update` CLI command had several UX issues:

1. Only updated `package.json` without installing packages
2. Required users to manually run installation commands
3. Always suggested `npm install` regardless of the user's actual package manager (pnpm, yarn, or bun)
4. No way to skip automatic installation when needed

This was inconsistent with the HTTP API's `updateSinglePackage` and `updateAllPackages` functions, which properly detect and use the correct package manager.

## The Solution

Enhanced the `volt update` command to match the HTTP API behavior:

**Package Manager Auto-Detection:**

- Automatically detects package manager by checking lock files:
  - `pnpm-lock.yaml` → runs `pnpm install`
  - `yarn.lock` → runs `yarn install`
  - `package-lock.json` → runs `npm install`
  - `bun.lockb` → runs `bun install`

**Automatic Installation:**

- After updating `package.json`, automatically runs the appropriate install command
- Shows detected package manager and installation progress
- Works in both interactive mode and `--apply` mode

**Optional Skip:**

- Added `--no-install` flag to skip automatic installation when needed
- Useful for CI/CD pipelines or when manual control is preferred

## Usage Examples

**Default behavior (auto-install with detected package manager):**

```bash
$ volt update
Found 3 outdated VoltAgent packages:
  @voltagent/core: 1.1.34 → 1.1.35
  @voltagent/server-hono: 0.1.10 → 0.1.11
  @voltagent/cli: 0.0.45 → 0.0.46

✓ Updated 3 packages in package.json

Detected package manager: pnpm
Running pnpm install...
⠹ Installing packages...
✓ Packages installed successfully
```

**Skip automatic installation:**

```bash
$ volt update --no-install
✓ Updated 3 packages in package.json
⚠ Automatic installation skipped
Run 'pnpm install' to install updated packages
```

**Non-interactive mode:**

```bash
$ volt update --apply
✓ Updates applied to package.json
Detected package manager: pnpm
Running pnpm install...
✓ Packages installed successfully
```

## Benefits

- **Better UX**: No manual steps required - updates are fully automatic
- **Package Manager Respect**: Uses your chosen package manager (pnpm/yarn/npm/bun)
- **Consistency**: CLI now matches HTTP API behavior
- **Flexibility**: `--no-install` flag for users who need manual control
- **CI/CD Friendly**: Works seamlessly in automated workflows
