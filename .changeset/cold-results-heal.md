---
"@voltagent/docs-mcp": minor
---

feat(docs-mcp): dynamically discover example files

Refactor the getExampleContent function to dynamically discover all relevant files in an example directory instead of relying on a hardcoded list. This introduces a new discoverExampleFiles helper function that recursively scans for .ts files in src, app, and voltagent directories with depth limits, while retaining backward compatibility. This ensures that documentation examples with complex file structures containing voltagent related code are fully captured and displayed.

Resolves #365
