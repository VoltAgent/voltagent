---
"@voltagent/server-hono": patch
---

fix: auth middleware now preserves conversationId and all client options

## The Problem

When using custom auth providers with VoltAgent, the auth middleware was completely replacing the `body.options` object instead of merging with it. This caused critical client-provided options to be lost, including:

- `conversationId` - essential for conversation continuity and hooks
- `temperature`, `maxSteps`, `topP` - LLM configuration parameters
- Any other options sent by the client in the request body

This happened because the middleware created a brand new `options` object containing only auth-related fields (`context.user` and `userId`), completely discarding the original `body.options`.

**Example of the bug:**

```typescript
// Client sends:
{
  input: "Hello",
  options: {
    conversationId: "conv-abc-123",
    temperature: 0.7
  }
}

// After auth middleware (BEFORE FIX):
{
  input: "Hello",
  options: {
    // ❌ conversationId LOST!
    // ❌ temperature LOST!
    context: { user: {...} },
    userId: "user-123"
  }
}

// Result: conversationId missing in onStart hook's context
```

This was especially problematic when:

- Using hooks that depend on `conversationId` (like `onStart`, `onEnd`)
- Configuring LLM parameters from the client side
- Tracking conversations across multiple agent calls

## The Solution

Changed the auth middleware to **merge** auth data into the existing `body.options` instead of replacing it. Now all client options are preserved while auth context is properly added.

**After the fix:**

```typescript
// Client sends:
{
  input: "Hello",
  options: {
    conversationId: "conv-abc-123",
    temperature: 0.7
  }
}

// After auth middleware (AFTER FIX):
{
  input: "Hello",
  options: {
    ...body.options,  // ✅ All original options preserved
    conversationId: "conv-abc-123",  // ✅ Preserved
    temperature: 0.7,  // ✅ Preserved
    context: {
      ...body.options?.context,  // ✅ Existing context merged
      user: {...}  // ✅ Auth user added
    },
    userId: "user-123"  // ✅ Auth userId added
  }
}

// Result: conversationId properly available in hooks!
```

## Technical Changes

**Before (packages/server-hono/src/auth/middleware.ts:82-90):**

```typescript
options: {
  context: {
    ...body.context,
    user,
  },
  userId: user.id || user.sub,
}
// ❌ Creates NEW options object, loses body.options
```

**After:**

```typescript
options: {
  ...body.options,  // ✅ Preserve all existing options
  context: {
    ...body.options?.context,  // ✅ Merge existing context
    ...body.context,
    user,
  },
  userId: user.id || user.sub,
}
// ✅ Merges auth data into existing options
```

## Impact

- ✅ **Fixes missing conversationId in hooks**: `onStart`, `onEnd`, and other hooks now receive the correct `conversationId` from client
- ✅ **Preserves LLM configuration**: Client-side `temperature`, `maxSteps`, `topP`, etc. are no longer lost
- ✅ **Context merging works correctly**: Both custom context and auth user context coexist
- ✅ **Backward compatible**: Existing code continues to work, only fixes the broken behavior
- ✅ **Proper fallback chain**: `userId` uses `user.id` → `user.sub` → `body.options.userId`

## Testing

Added comprehensive test suite (`packages/server-hono/src/auth/middleware.spec.ts`) with 12 test cases covering:

- conversationId preservation
- Multiple options preservation
- Context merging
- userId priority logic
- Empty options handling
- Public routes
- Authentication failures

All tests passing ✅
