---
"@voltagent/core": patch
---

Refactor ToolManager into hierarchical architecture with BaseToolManager and ToolkitManager

Introduces new class hierarchy for improved tool management:

- **BaseToolManager**: Abstract base class with core tool management functionality
- **ToolManager**: Main manager supporting standalone tools, provider tools, and toolkits
- **ToolkitManager**: Specialized manager for toolkit-scoped tools (no nested toolkits)

Features:

- Enhanced type-safe tool categorization with type guards
- Conflict detection for toolkit tools
- Reorganized tool preparation process - moved `prepareToolsForExecution` logic from agent into ToolManager, simplifying agent code

Public API remains compatible.
