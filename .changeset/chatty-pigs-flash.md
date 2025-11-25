---
"@voltagent/core": patch
---

fix: eliminate duplicate code in Agent.getSystemMessage method through refactoring - #813

## The Problem

The `getSystemMessage` method in the Agent class contained significant code duplication between two code paths:

- Lines 2896-2929: Handling `promptContent.type === "text"`
- Lines 2933-2967: Handling default string instructions

Both paths contained identical logic for:

1. Adding toolkit instructions
2. Adding markdown formatting instructions
3. Adding retriever context
4. Adding working memory context
5. Adding supervisor instructions for sub-agents

This duplication violated the DRY (Don't Repeat Yourself) principle and made maintenance more difficult, as any changes to instruction enrichment logic would need to be applied in multiple places.

## The Solution

**Refactoring with Helper Method:**

- Created a new private method `enrichInstructions` that consolidates all common instruction enrichment logic
- Updated both code paths to use this centralized helper method
- Eliminated ~35 lines of duplicate code while preserving exact functionality

**New Method Signature:**

```typescript
private async enrichInstructions(
  baseContent: string,
  retrieverContext: string | null,
  workingMemoryContext: string | null,
  oc: OperationContext,
): Promise<string>
```

## Impact

- ✅ **Improved Maintainability:** Single source of truth for instruction enrichment logic
- ✅ **Reduced Complexity:** Cleaner, more readable code with better separation of concerns
- ✅ **Better Testability:** Dedicated unit tests for the `enrichInstructions` method
- ✅ **No Breaking Changes:** Pure refactoring with identical behavior
- ✅ **Comprehensive Testing:** Added 16 new tests covering all enrichment scenarios and edge cases

## Technical Details

The refactored `enrichInstructions` method handles:

- Toolkit instructions injection from registered toolkits
- Markdown formatting directive when enabled
- Retriever context integration for RAG patterns
- Working memory context from conversation history
- Supervisor instructions for multi-agent orchestration

All existing functionality is preserved with improved code organization and test coverage.
