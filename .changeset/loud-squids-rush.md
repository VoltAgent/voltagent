---
"@voltagent/internal": patch
---

feat: improve dev logger environment detection and add debug method

Enhanced the dev logger to be more intelligent about when to show logs. Previously, the logger only showed logs when `NODE_ENV === "development"`. Now it shows logs unless `NODE_ENV` is explicitly set to `"production"`, `"test"`, or `"ci"`.

**Changes:**

- **Improved Environment Detection**: Dev logger now shows logs when `NODE_ENV` is undefined, empty string, or any value other than "production", "test", or "ci"
- **Better Developer Experience**: Developers who don't set NODE_ENV will now see logs by default, which is more intuitive
- **Added Debug Method**: Included a placeholder `debug` method for future structured logging with Pino
- **Updated Tests**: Comprehensive test coverage for the new logging behavior

**Before:**

- Logs only shown when `NODE_ENV === "development"`
- Empty string or undefined NODE_ENV = no logs ❌

**After:**

- Logs hidden only when `NODE_ENV === "production"`, `NODE_ENV === "test"`, or `NODE_ENV === "ci"`
- Empty string, undefined, or other values = logs shown ✅

This change makes the development experience smoother as most developers don't explicitly set NODE_ENV during local development.
