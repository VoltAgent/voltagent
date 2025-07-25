---
"@voltagent/core": patch
---

fix: dynamic toolkit resolution and VoltOps UI visibility

Fixed an issue where dynamic tools and toolkits weren't being displayed in VoltOps UI when resolved during agent execution. The fix includes:

**Key Changes:**

- **Dynamic Tool Resolution**: Modified `prepareToolsForGeneration` to properly accept and process both `BaseTool` and `Toolkit` types
- **VoltOps UI Integration**: Dynamic tools now appear in the Console UI by updating history metadata when tools are resolved
- **Data Persistence**: Tools persist across page refreshes by storing them in history entry metadata

**Technical Details:**

- `prepareToolsForGeneration` now accepts `(BaseTool | Toolkit)[]` instead of just `BaseTool[]`
- Uses temporary ToolManager with `addItems()` to handle both tools and toolkits consistently
- Updates history entry metadata with complete agent snapshot when dynamic tools are resolved
- Removed WebSocket-based TOOLS_UPDATE events in favor of metadata-based approach

This ensures that dynamic tools like `createReasoningTools()` and other toolkits work seamlessly when provided through the `dynamicTools` parameter.
