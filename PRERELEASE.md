# VoltAgent Prerelease Process

This document outlines how to work with prereleases in the VoltAgent monorepo.

## Overview

We use [Changesets](https://github.com/changesets/changesets) to manage prereleases. The `next` branch is used for prerelease versions that will eventually become the next major version.

## Branches

- **`main`**: Stable releases (0.x.x currently)
- **`next`**: Prerelease versions (1.0.0-next.x)

## Working with Prereleases

### 1. Switching to Prerelease Mode

The `next` branch is already in prerelease mode. When you're on this branch:

```bash
# Check if you're in prerelease mode
cat .changeset/pre.json
```

### 2. Adding Changes

When adding new features or fixes to the prerelease:

```bash
# Create a changeset for your changes
pnpm changeset

# Select the packages you've changed
# Choose the type of change (patch/minor/major)
# Add a description of your changes
```

### 3. Versioning Packages

After adding changesets:

```bash
# Version packages with prerelease tags
pnpm changeset version

# This will update:
# - package.json files with new versions (e.g., 1.0.0-next.1)
# - CHANGELOG.md files with your changes
# - .changeset/pre.json with consumed changesets
```

### 4. Publishing Prereleases

```bash
# Build all packages
pnpm build

# Publish to npm with the 'next' tag
pnpm changeset publish --tag next

# Or if you want to do a dry run first
pnpm changeset publish --tag next --no-git-tag --dry-run
```

### 5. Installing Prerelease Versions

Users can install prerelease versions:

```bash
# Install a specific prerelease version
npm install @voltagent/core@next

# Or specify exact version
npm install @voltagent/core@1.0.0-next.0
```

## Workflow Example

```bash
# 1. Switch to next branch
git checkout next
git pull origin next

# 2. Make your changes
# ... edit files ...

# 3. Create a changeset
pnpm changeset

# 4. Commit your changes
git add .
git commit -m "feat: add new feature"

# 5. Version packages
pnpm changeset version

# 6. Commit version updates
git add .
git commit -m "chore: version packages"

# 7. Push to next branch
git push origin next

# 8. Publish prereleases (usually done in CI)
pnpm build
pnpm changeset publish --tag next
```

## Exiting Prerelease Mode

When ready to release the final major version:

```bash
# 1. Exit prerelease mode
pnpm changeset pre exit

# 2. Version packages (this removes the -next.x suffix)
pnpm changeset version

# 3. Publish the final release
pnpm changeset publish
```

## Troubleshooting

### Accidentally published without tag

If you accidentally publish without the `next` tag:

```bash
# Fix the npm tags
npm dist-tag add @voltagent/core@0.1.81 latest
npm dist-tag add @voltagent/core@1.0.0-next.0 next
```

### Check current prerelease state

```bash
# See what versions will be published
pnpm changeset status

# Check prerelease configuration
cat .changeset/pre.json
```

## Questions?

For questions about the prerelease process, please open an issue or reach out to the maintainers.
