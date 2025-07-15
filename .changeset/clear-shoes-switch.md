---
"create-voltagent-app": patch
---

feat: add comprehensive workflow example to new projects

This change enhances the `create-voltagent-app` template by including a new, comprehensive workflow example. The goal is to provide new users with a practical, out-of-the-box demonstration of VoltAgent's core workflow capabilities.

The new template now includes:

- A `comprehensive-workflow` that showcases the combined use of `andThen`, `andAgent`, `andAll`, `andRace`, and `andWhen`.
- A dedicated `workflows` directory (`src/workflows`) to promote a modular project structure.
- The workflow uses a self-contained `sentimentAgent`, separating it from the main project agent to ensure clarity and avoid conflicts.

This provides a much richer starting point for developers, helping them understand and build their own workflows more effectively.
