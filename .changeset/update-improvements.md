---
"@voltagent/core": patch
---

feat: replace `npm-check-updates` with native package manager support

This update replaces the `npm-check-updates` dependency with a native implementation that properly detects installed package versions and supports all major package managers (`npm`, `pnpm`, `yarn`, `bun`).

### Key improvements:

- **Native package manager support**: Automatically detects and uses npm, pnpm, yarn, or bun based on lock files
- **Accurate version detection**: Shows actual installed versions instead of package.json semver ranges (e.g., shows 1.0.63 instead of ^1.0.0)
- **Monorepo compatibility**: Smart version detection that works with hoisted dependencies and workspace protocols
- **Non-blocking startup**: Update checks run in background without slowing down application startup (70-80% faster)
- **Intelligent caching**: 1-hour cache with package.json hash validation to reduce redundant checks
- **Major version updates**: Fixed update commands to use add/install instead of update to handle breaking changes
- **Restart notifications**: Added requiresRestart flag to API responses for better UX

### Technical details:

- Removed execSync calls in favor of direct file system operations
- Parallel HTTP requests to npm registry for better performance
- Multiple fallback methods for version detection (direct access → require.resolve → tree search)
- Background processing with Promise.resolve().then() for true async behavior

This change significantly improves the developer experience with faster startup times and more accurate dependency information.
