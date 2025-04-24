---
"@voltagent/core": patch
---

fix: Prevent potential error when accessing debug option in LibSQLStorage - #34

- Modified the `debug` method within the `LibSQLStorage` class.
- Changed the access to `this.options.debug` to use optional chaining (`this.options?.debug`).

This change prevents runtime errors that could occur in specific environments, such as Next.js, if the `debug` method is invoked before the `options` object is fully initialized or if `options` becomes unexpectedly `null` or `undefined`. It ensures the debug logging mechanism is more robust.
