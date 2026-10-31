---
"@voltagent/core": patch
---

Keep composite filesystem grep and glob searches within the requested directory instead of selecting sibling-prefix mounts or aggregating unrelated mounts. Canonicalize dot segments, include descendant mounts, and honor mount precedence when merging results. Match descendant-mount globs relative to the requested search scope.

Filter visible matching files before backend grep limits are applied, and translate common descendant globs before querying mounted backends.
