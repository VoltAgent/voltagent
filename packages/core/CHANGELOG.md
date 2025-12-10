# @voltagent/core

## 1.2.18

### Patch Changes

- [`9e215c6`](https://github.com/VoltAgent/voltagent/commit/9e215c69bce4e4fd3d96adb12b4ba98e3a5fcdb4) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: schema serialization for workflows and tools when projects use Zod 4.

  ## The Problem

  Zod 4 changed its internal `_def` shape (e.g., `type` instead of `typeName`, `shape` as an object, `element` for arrays). Our lightweight `zodSchemaToJsonUI` only understood the Zod 3 layout, so Zod 4 workflows/tools exposed `inputSchema`/`resultSchema` as `{ type: "unknown" }` in `/workflows/{id}` and tool metadata.

  ## The Solution

  Teach `zodSchemaToJsonUI` both v3 and v4 shapes: look at `_def.type` as well as `_def.typeName`, handle v4 object `shape`, array `element`, enum entries, optional/default unwrap, and record value types. Default values are picked up whether they’re stored as a function (v3) or a raw value (v4).

  ## Impact

  API consumers and UIs now see real input/result/output schemas for Zod 4-authored workflows and tools instead of `{ type: "unknown" }`, restoring schema-driven rendering and validation.

- [`7e40045`](https://github.com/VoltAgent/voltagent/commit/7e40045656d6868eb5ca337aad5c6a20532dad17) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add Gmail actions to VoltOps SDK client
  - Added `actions.gmail.sendEmail`, `replyToEmail`, `searchEmail`, `getEmail`, `getThread`
  - Supports inline or stored credentials (OAuth refresh token or service account)

  Usage:

  ```ts
  import { VoltOpsClient } from "@voltagent/core";

  const voltops = new VoltOpsClient({
    publicKey: "<public-key>",
    secretKey: "<secret-key>",
  });

  await voltops.actions.gmail.sendEmail({
    credential: { credentialId: "<gmail-credential-id>" },
    to: ["teammate@example.com"],
    cc: ["manager@example.com"],
    subject: "Status update",
    bodyType: "text",
    body: "All systems operational.",
    attachments: [
      {
        filename: "notes.txt",
        content: "YmFzZTY0LWNvbnRlbnQ=",
        contentType: "text/plain",
      },
    ],
  });
  ```

## 1.2.17

### Patch Changes

- [#845](https://github.com/VoltAgent/voltagent/pull/845) [`5432f13`](https://github.com/VoltAgent/voltagent/commit/5432f13bddebd869522ebffbedd9843b4476f08b) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: workflow execution listing - #844

  Added a unified way to list workflow runs so teams can audit executions across every storage backend and surface them via the API and console.

  ## What changed
  - `queryWorkflowRuns` now exists on all memory adapters (in-memory, libsql, Postgres, Supabase, voltagent-memory) with filters for `workflowId`, `status`, `from`, `to`, `limit`, and `offset`.
  - Server routes are consolidated under `/workflows/executions` (no path param needed); `GET /workflows/:id` also returns the workflow result schema for typed clients. Handler naming is standardized to `listWorkflowRuns`.
  - VoltOps Console observability panel lists the new endpoint; REST docs updated with query params and sample responses. New unit tests cover handlers and every storage adapter.

  ## Quick fetch

  ```ts
  await fetch(
    "http://localhost:3141/workflows/executions?workflowId=expense-approval&status=completed&from=2024-01-01&to=2024-01-31&limit=20&offset=0"
  );
  ```

## 1.2.16

### Patch Changes

- [#839](https://github.com/VoltAgent/voltagent/pull/839) [`93e5a8e`](https://github.com/VoltAgent/voltagent/commit/93e5a8ed03d2335d845436752b476881c24931ba) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: expose resultSchema in workflow API response

  Previously, when calling the workflow API endpoint (e.g., `GET /workflows/{id}`), the response included `inputSchema`, `suspendSchema`, and `resumeSchema`, but was missing `resultSchema` (the output schema).

  Now, workflows properly expose their result schema alongside other schemas:

  ```json
  {
    "inputSchema": {
      "type": "object",
      "properties": { "name": { "type": "string" } },
      "required": ["name"]
    },
    "resultSchema": {
      "type": "object",
      "properties": { "greeting": { "type": "string" } },
      "required": ["greeting"]
    },
    "suspendSchema": { "type": "unknown" },
    "resumeSchema": { "type": "unknown" }
  }
  ```

  This allows API consumers to understand the expected output format of a workflow, enabling better client-side validation and documentation generation.

## 1.2.15

### Patch Changes

- [#833](https://github.com/VoltAgent/voltagent/pull/833) [`010aa0a`](https://github.com/VoltAgent/voltagent/commit/010aa0a29a5561201689ecfee4738f0cc40798ce) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: supervisor now prefers each sub-agent’s `purpose` over full `instructions` when listing specialized agents, keeping prompts concise and preventing accidental directive leakage; added test coverage, docs, and example updates to encourage setting a short purpose per sub-agent.

## 1.2.14

### Patch Changes

- [#830](https://github.com/VoltAgent/voltagent/pull/830) [`972889f`](https://github.com/VoltAgent/voltagent/commit/972889f68a0973f80cd981c3322043c11df5f223) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: tool error handling to return structured, JSON-safe payloads instead of crashing on circular axios errors. #829

## 1.2.13

### Patch Changes

- [#825](https://github.com/VoltAgent/voltagent/pull/825) [`fd1428b`](https://github.com/VoltAgent/voltagent/commit/fd1428b73abfcac29c238e0cee5229ff227cb72b) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: remove redundant "You are ${this.name}" prefix from system prompt construction - #813

  The system prompt construction in `Agent` class was redundantly prepending "You are ${this.name}" even when the user provided their own system prompt. This change removes the prefix, allowing the user's instructions to be used exactly as provided.

## 1.2.12

### Patch Changes

- [`28661fc`](https://github.com/VoltAgent/voltagent/commit/28661fc24f945b0e52c12703a5a09a033317d8fa) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: enable persistence for live evaluations

## 1.2.11

### Patch Changes

- [#817](https://github.com/VoltAgent/voltagent/pull/817) [`decfda5`](https://github.com/VoltAgent/voltagent/commit/decfda5898128ef9097cd1dc456ca563ee49def1) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: pass complete OperationContext to retrievers when used as object instances

  ## The Problem

  When a retriever was assigned directly to an agent as an object instance (e.g., `retriever: myRetriever`), it wasn't receiving the `userId` and `conversationId` from the OperationContext. This prevented user-specific and conversation-aware retrieval when retrievers were used in this way, even though these fields were correctly passed when retrievers were used as tools.

  ## The Solution

  Updated the `getRetrieverContext` method in the Agent class to pass the complete OperationContext to retrievers, ensuring consistency between tool-based and object-based retriever usage.

  ## What Changed

  ```typescript
  // Before - only partial context was passed
  return await this.retriever.retrieve(retrieverInput, {
    context: oc.context,
    logger: retrieverLogger,
  });

  // After - complete OperationContext is passed
  return await this.retriever.retrieve(retrieverInput, {
    ...oc,
    logger: retrieverLogger,
  });
  ```

  ## Impact
  - **Consistent behavior:** Retrievers now receive `userId` and `conversationId` regardless of how they're configured
  - **User-specific retrieval:** Enables filtering results by user in multi-tenant scenarios
  - **Conversation awareness:** Retrievers can now access conversation context when used as object instances
  - **No breaking changes:** This is a backward-compatible fix that adds missing context fields

- [#820](https://github.com/VoltAgent/voltagent/pull/820) [`c5e0c89`](https://github.com/VoltAgent/voltagent/commit/c5e0c89554d85c895e3d6cbfc83ad47bd53a1b9f) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: expose createdAt in memory.getMessages

  ## What Changed

  The `createdAt` timestamp is now exposed in the `metadata` object of messages retrieved via `memory.getMessages()`. This ensures that the creation time of messages is accessible across all storage adapters (`InMemory`, `Supabase`, `LibSQL`, `PostgreSQL`).

  ## Usage

  You can now access the `createdAt` timestamp from the message metadata:

  ```typescript
  const messages = await memory.getMessages(userId, conversationId);

  messages.forEach((message) => {
    console.log(`Message ID: ${message.id}`);
    console.log(`Created At: ${message.metadata?.createdAt}`);
  });
  ```

  This change aligns the behavior of all storage adapters and ensures consistent access to message timestamps.

- [`53ff6bf`](https://github.com/VoltAgent/voltagent/commit/53ff6bfcae59e0f72dc4de6f8550241392e25864) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: voltops actions serverless fetch usage

## 1.2.10

### Patch Changes

- [#815](https://github.com/VoltAgent/voltagent/pull/815) [`148f550`](https://github.com/VoltAgent/voltagent/commit/148f550ceafa412534fd2d1c4cfb44c8255636ab) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: eliminate duplicate code in Agent.getSystemMessage method through refactoring - #813

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

## 1.2.9

### Patch Changes

- [#812](https://github.com/VoltAgent/voltagent/pull/812) [`0f64363`](https://github.com/VoltAgent/voltagent/commit/0f64363a2b577e025fae41276cc0d85ef7fc0644) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: comprehensive authentication system with JWT, Console Access, and WebSocket support

  ## The Problem

  VoltAgent's authentication system had several critical gaps that made it difficult to secure production deployments:
  1. **No Authentication Support:** The framework lacked built-in authentication, forcing developers to implement their own security
  2. **WebSocket Security:** WebSocket connections for observability had no authentication, exposing sensitive telemetry data
  3. **Browser Limitations:** Browsers cannot send custom headers during WebSocket handshake, making authentication impossible
  4. **Development vs Production:** No clear separation between development convenience and production security
  5. **Console Access:** No secure way for the VoltAgent Console to access observability endpoints in production

  ## The Solution

  **JWT Authentication (`@voltagent/server-core`, `@voltagent/server-hono`):**
  - Added pluggable `jwtAuth` provider with configurable secret and options
  - Implemented `mapUser` function to transform JWT payloads into user objects
  - Created flexible route protection with `defaultPrivate` mode (opt-out vs opt-in)
  - Added `publicRoutes` configuration for fine-grained control

  **WebSocket Authentication:**
  - Implemented query parameter authentication for browser WebSocket connections
  - Added dual authentication support (headers for servers, query params for browsers)
  - Created WebSocket-specific authentication helpers for observability endpoints
  - Preserved user context throughout WebSocket connection lifecycle

  **Console Access System:**
  - Introduced `VOLTAGENT_CONSOLE_ACCESS_KEY` environment variable for production Console access
  - Added `x-console-access-key` header support for HTTP requests
  - Implemented query parameter `?key=` for WebSocket connections
  - Created `hasConsoleAccess()` utility for unified access checking

  **Development Experience:**
  - Enhanced `x-voltagent-dev` header to work with both HTTP and WebSocket
  - Added `isDevRequest()` helper that requires both header AND non-production environment
  - Implemented query parameter `?dev=true` for browser WebSocket connections
  - Maintained zero-config development mode while ensuring production security

  **Route Matching Improvements:**
  - Added wildcard support with `/observability/*` pattern for all observability endpoints
  - Implemented double-star pattern `/api/**` for path and all children
  - Enhanced `pathMatches()` function with proper segment matching
  - Protected all observability, workflow control, and system update endpoints by default

  ## Impact
  - ✅ **Production Ready:** Complete authentication system for securing VoltAgent deployments
  - ✅ **WebSocket Security:** Browser-compatible authentication for real-time observability
  - ✅ **Console Integration:** Secure access for VoltAgent Console in production environments
  - ✅ **Developer Friendly:** Zero-config development with automatic authentication bypass
  - ✅ **Flexible Security:** Choose between opt-in (default) or opt-out authentication modes
  - ✅ **User Context:** Automatic user injection into agent and workflow execution context

  ## Technical Details

  **Protected Routes (Default):**

  ```typescript
  // Agent/Workflow Execution
  POST /agents/:id/text
  POST /agents/:id/stream
  POST /workflows/:id/run

  // All Observability Endpoints
  /observability/*  // Traces, logs, memory - all methods

  // Workflow Control
  POST /workflows/:id/executions/:executionId/suspend
  POST /workflows/:id/executions/:executionId/resume

  // System Updates
  GET /updates
  POST /updates/:packageName
  ```

  **Authentication Modes:**

  ```typescript
  // Opt-in mode (default) - Only execution endpoints protected
  auth: jwtAuth({
    secret: process.env.JWT_SECRET,
  });

  // Opt-out mode - Everything protected except specified routes
  auth: jwtAuth({
    secret: process.env.JWT_SECRET,
    defaultPrivate: true,
    publicRoutes: ["GET /health", "POST /webhooks/*"],
  });
  ```

  **WebSocket Authentication Flow:**

  ```typescript
  // Browser WebSocket with query params
  new WebSocket("ws://localhost:3000/ws/observability?key=console-key");
  new WebSocket("ws://localhost:3000/ws/observability?dev=true");

  // Server WebSocket with headers
  ws.connect({
    headers: {
      "x-console-access-key": "console-key",
      "x-voltagent-dev": "true",
    },
  });
  ```

  ## Migration Notes

  **For Existing Users:**
  1. **No Breaking Changes:** Authentication is optional. Existing deployments continue to work without configuration.
  2. **To Enable Authentication:**

     ```typescript
     import { jwtAuth } from "@voltagent/server-hono";

     new VoltAgent({
       server: honoServer({
         auth: jwtAuth({
           secret: process.env.JWT_SECRET,
         }),
       }),
     });
     ```

  3. **For Production Console:**

     ```bash
     # .env
     VOLTAGENT_CONSOLE_ACCESS_KEY=your-secure-key
     NODE_ENV=production
     ```

  4. **Generate Secrets:**

     ```bash
     # JWT Secret
     openssl rand -hex 32

     # Console Access Key
     openssl rand -hex 32
     ```

  5. **Test Token Generation:**
     ```javascript
     // generate-token.js
     import jwt from "jsonwebtoken";
     const token = jwt.sign({ id: "user-1", email: "test@example.com" }, process.env.JWT_SECRET, {
       expiresIn: "24h",
     });
     console.log(token);
     ```

  ## Documentation

  Comprehensive authentication documentation has been added to `/website/docs/api/authentication.md` covering:
  - Getting started with three authentication options
  - Common use cases with code examples
  - Advanced configuration with `mapUser` function
  - Console and observability authentication
  - Security best practices
  - Troubleshooting guide

## 1.2.8

### Patch Changes

- [#810](https://github.com/VoltAgent/voltagent/pull/810) [`efcfe52`](https://github.com/VoltAgent/voltagent/commit/efcfe52dbe2c095057ce08a5e053d1defafd4e62) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: ensure reliable trace export and context propagation in serverless environments

  ## The Problem

  Trigger-initiated agent executions in serverless environments (Cloudflare Workers, Vercel Edge Functions) were experiencing inconsistent trace exports and missing parent-child span relationships. This manifested as:
  1. Agent traces not appearing in observability tools despite successful execution
  2. Trigger and agent spans appearing as separate, disconnected traces instead of a single coherent trace tree
  3. Spans being lost due to serverless functions terminating before export completion

  ## The Solution

  **Serverless Trace Export (`@voltagent/serverless-hono`):**
  - Implemented reliable span flushing using Cloudflare's `waitUntil` API to ensure spans are exported before function termination
  - Switched from `SimpleSpanProcessor` to `BatchSpanProcessor` with serverless-optimized configuration (immediate export, small batch sizes)
  - Added automatic flush on trigger completion with graceful fallback to `forceFlush` when `waitUntil` is unavailable

  **Context Propagation (`@voltagent/core`):**
  - Integrated official `@opentelemetry/context-async-hooks` package to replace custom context manager implementation
  - Ensured `AsyncHooksContextManager` is registered in both Node.js and serverless environments for consistent async context tracking
  - Fixed `resolveParentSpan` logic to correctly identify scorer spans while avoiding framework-generated ambient spans
  - Exported `propagation` and `ROOT_CONTEXT` from `@opentelemetry/api` for HTTP header-based trace context injection/extraction

  **Node.js Reliability:**
  - Updated `NodeVoltAgentObservability.flushOnFinish()` to call `forceFlush()` instead of being a no-op, ensuring spans are exported in short-lived processes

  ## Impact
  - ✅ Serverless traces are now reliably exported and visible in observability tools
  - ✅ Trigger and agent spans form a single, coherent trace tree with proper parent-child relationships
  - ✅ Consistent tracing behavior across Node.js and serverless runtimes
  - ✅ No more missing or orphaned spans in Cloudflare Workers, Vercel Edge Functions, or similar platforms

  ## Technical Details
  - Uses `BatchSpanProcessor` with `maxExportBatchSize: 32` and `scheduledDelayMillis: 100` for serverless
  - Leverages `globalThis.___voltagent_wait_until` for non-blocking span export in Cloudflare Workers
  - Implements `AsyncHooksContextManager` for robust async context tracking across `Promise` chains and `async/await`
  - Maintains backward compatibility with existing Node.js deployments

  ## Migration Notes

  No breaking changes. Existing deployments will automatically benefit from improved trace reliability. Ensure your `wrangler.toml` includes `nodejs_compat` flag for Cloudflare Workers:

  ```toml
  compatibility_flags = ["nodejs_compat"]
  ```

## 1.2.7

### Patch Changes

- [#806](https://github.com/VoltAgent/voltagent/pull/806) [`b56e5a0`](https://github.com/VoltAgent/voltagent/commit/b56e5a087378c7ba5ce4a2c1756a0fe3dfb738b5) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: pass complete ToolExecuteOptions to retriever.retrieve() method

  ## The Problem

  Previously, `createRetrieverTool` only passed `context` and `logger` from `ToolExecuteOptions` to the retriever's `retrieve()` method. This prevented retrievers from accessing important operation metadata like:
  - `userId` - for user-specific filtering
  - `conversationId` - for conversation-aware retrieval
  - `operationId` - for tracking
  - Other `OperationContext` fields

  This limitation meant retrievers could only provide public knowledge and couldn't implement:
  - Multi-tenant retrieval with user-specific namespaces
  - Private knowledge bases per user
  - User-filtered database queries
  - Context-aware retrieval strategies

  ## The Solution

  **Core Changes:**
  - Updated `RetrieveOptions` interface to extend `Partial<OperationContext>`, providing access to all operation metadata
  - Modified `createRetrieverTool` to pass the complete `options` object to `retriever.retrieve()` instead of just `{ context, logger }`
  - Maintained full backward compatibility - all existing retrievers continue to work without changes

  **What's Now Available in retrieve() method:**

  ```typescript
  class UserSpecificRetriever extends BaseRetriever {
    async retrieve(input, options) {
      // Access operation context
      const { userId, conversationId, logger } = options;

      // User-specific filtering
      const results = await db.query("SELECT * FROM documents WHERE user_id = $1", [userId]);

      return results;
    }
  }
  ```

  ## Impact
  - **Multi-tenant Support:** Retrievers can now filter by user using different namespaces, indexes, or database filters
  - **Private Knowledge:** Support for user-specific knowledge bases and personalized retrieval
  - **Better Context:** Access to conversation and operation metadata for smarter retrieval
  - **Backward Compatible:** Existing retrievers work without any code changes

  ## Usage Examples

  ### User-Specific Vector Search

  ```typescript
  class MultiTenantRetriever extends BaseRetriever {
    async retrieve(input, options) {
      const query = typeof input === "string" ? input : input[input.length - 1].content;
      const { userId } = options;

      // Use user-specific namespace in Pinecone
      const results = await this.pinecone.query({
        vector: await this.embed(query),
        namespace: `user-${userId}`,
        topK: 5,
      });

      return results.matches.map((m) => m.metadata.text).join("\n\n");
    }
  }

  // Use with userId
  const response = await agent.generateText("Find my documents", {
    userId: "user-123",
  });
  ```

  ### Conversation-Aware Retrieval

  ```typescript
  class ConversationRetriever extends BaseRetriever {
    async retrieve(input, options) {
      const { conversationId, userId } = options;

      // Retrieve documents relevant to this conversation
      const results = await db.query(
        "SELECT * FROM documents WHERE user_id = $1 AND conversation_id = $2",
        [userId, conversationId]
      );

      return results.map((r) => r.content).join("\n\n");
    }
  }
  ```

  ## Migration Guide

  No migration needed! Existing retrievers automatically receive the full `options` object and can access new fields when ready:

  ```typescript
  // Before (still works)
  async retrieve(input, options) {
    const { context, logger } = options;
    // ...
  }

  // After (now possible)
  async retrieve(input, options) {
    const { context, logger, userId, conversationId } = options;
    // Can now use userId and conversationId
  }
  ```

## 1.2.6

### Patch Changes

- [#801](https://github.com/VoltAgent/voltagent/pull/801) [`a26ddd8`](https://github.com/VoltAgent/voltagent/commit/a26ddd826692485278033c22ac9828cb51cdd749) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add triggers DSL improvements and event payload simplification
  - Introduce the new `createTriggers` DSL and expose trigger events via sensible provider names (e.g. `on.airtable.recordCreated`) rather than raw catalog IDs.
  - Add trigger span metadata propagation so VoltAgent agents receive trigger context automatically without manual mapping.
  - Simplify action dispatch payloads: `payload` now contains only the event’s raw data while trigger context lives in the `event`/`metadata` blocks, reducing boilerplate in handlers.

  ```ts
  import { VoltAgent, createTriggers } from "@voltagent/core";

  new VoltAgent({
    // ...
    triggers: createTriggers((on) => {
      on.airtable.recordCreated(({ payload, event }) => {
        console.log("New Airtable row", payload, event.metadata);
      });

      on.gmail.newEmail(({ payload }) => {
        console.log("New Gmail message", payload);
      });
    }),
  });
  ```

- [#801](https://github.com/VoltAgent/voltagent/pull/801) [`a26ddd8`](https://github.com/VoltAgent/voltagent/commit/a26ddd826692485278033c22ac9828cb51cdd749) Thanks [@omeraplak](https://github.com/omeraplak)! - Add full Discord action coverage to `VoltOpsActionsClient`, including typed helpers for messaging, reactions, channels, and guild roles. **All VoltOps Actions now require the inline `credential` payload**—pass `{ id: "cred_xyz" }` to reuse a saved credential or provide provider-specific secrets on the fly. Each provider now has explicit credential typing (Airtable ⇒ `{ apiKey }`, Slack ⇒ `{ botToken }`, Discord ⇒ `{ botToken } | { webhookUrl }`), so editors autocomplete only the valid fields. The SDK propagates these types so apps can invoke VoltOps Actions without managing separate credential IDs.

## 1.2.5

### Patch Changes

- [#798](https://github.com/VoltAgent/voltagent/pull/798) [`3168cc3`](https://github.com/VoltAgent/voltagent/commit/3168cc3bc241b74434bb35c2f6f80240beeac64c) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: enhanced message-helpers to support both MessageContent and UIMessage using TypeScript overloads - #796

  ## The Problem

  When working with messages in VoltAgent, there were two different message formats:
  1. **MessageContent** - The `content` property from AI SDK's `ModelMessage` (string or array of content parts)
  2. **UIMessage** - The newer format returned by memory operations and AI SDK's UI utilities (object with `id`, `role`, and `parts` array)

  The existing `message-helpers` utilities only supported MessageContent, making it cumbersome to extract information from UIMessage objects retrieved from memory or other sources. Users had to manually navigate the UIMessage structure or convert between formats.

  ## The Solution

  All message helper functions now accept **both MessageContent and UIMessage** using TypeScript function overloads. This provides a seamless experience regardless of which message format you're working with.

  **Enhanced Functions:**
  - `extractText()` - Extract text from MessageContent or UIMessage
  - `extractTextParts()` - Get text parts from either format
  - `extractImageParts()` - Get image parts from either format
  - `extractFileParts()` - Get file parts from either format
  - `hasTextPart()` - Check for text parts in either format
  - `hasImagePart()` - Check for image parts in either format
  - `hasFilePart()` - Check for file parts in either format
  - `getContentLength()` - Get content length from either format

  ## Usage Example

  ```typescript
  import { extractText, hasImagePart } from "@voltagent/core";

  // Works with MessageContent (existing usage - no changes needed!)
  const content = [{ type: "text", text: "Hello world" }];
  extractText(content); // "Hello world"

  // Now also works with UIMessage directly!
  const messages = await memory.getMessages(userId, conversationId);
  const firstMessage = messages[0];

  // Extract text directly from UIMessage
  const text = extractText(firstMessage); // "Hello world"

  // Check for images in UIMessage
  if (hasImagePart(firstMessage)) {
    const images = extractImageParts(firstMessage);
    // Process images...
  }

  // TypeScript inference works perfectly for both!
  ```

  ## Benefits
  1. **Zero Breaking Changes** - All existing code continues to work exactly as before
  2. **Cleaner API** - Single function name for both formats instead of `extractText()` vs `extractTextFromUIMessage()`
  3. **Type Safety** - Full TypeScript type inference and autocomplete for both formats
  4. **Memory Integration** - Works seamlessly with messages retrieved from `memory.getMessages()`
  5. **Intuitive** - "Extract text" is just `extractText()` regardless of message format

  ## Migration

  **No migration needed!** Your existing code using MessageContent continues to work. You can now also pass UIMessage objects directly to these functions when working with memory or other sources that return UIMessage format.

  ```typescript
  // Before: Had to manually navigate UIMessage structure
  const message = messages[0];
  const text = message.parts
    .filter((p) => p.type === "text")
    .map((p) => p.text)
    .join("");

  // After: Use the same helper function!
  const text = extractText(message);
  ```

  ## Technical Details
  - Uses TypeScript function overloads for clean API surface
  - Type guard (`isUIMessage`) automatically detects format
  - Returns appropriate types based on input (e.g., `TextUIPart[]` for UIMessage, generic array for MessageContent)
  - Fully tested with 50 comprehensive test cases covering both formats

## 1.2.4

### Patch Changes

- [#794](https://github.com/VoltAgent/voltagent/pull/794) [`39704ad`](https://github.com/VoltAgent/voltagent/commit/39704ad30069fe940577006146c23d0218e16968) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: remove ambient parent spans in serverless environments to ensure proper trace completion

  ## The Problem

  When deploying VoltAgent to serverless platforms like Vercel/Next.js, Netlify Functions, or Cloudflare Workers, traces would remain in "pending" status in VoltOps even though:
  - All spans were successfully exported to the backend
  - The agent execution completed successfully
  - The finish reason was captured correctly

  **Root Cause**: VoltAgent was using `context.active()` when creating root spans, which inherited ambient spans from the hosting framework (e.g., Next.js instrumentation, Vercel telemetry). This caused agent root spans to appear as child spans with framework-generated parent span IDs, preventing the backend from recognizing them as trace roots.

  Example of the issue:

  ```typescript
  // Backend received:
  {
    name: 'Supervisor',
    parentSpanId: '8423d7ed5539b430', // ❌ Next.js ambient span
    isRootSpan: false,                // ❌ Not detected as root
    agentState: 'completed',
  }
  // Result: Trace stayed "pending" forever
  ```

  ## The Solution

  Updated `trace-context.ts` to use `trace.deleteSpan(context.active())` instead of `context.active()` when no explicit parent span exists. This removes ambient spans from the context, ensuring agent root spans are truly root.

  **Before**:

  ```typescript
  const parentContext = parentSpan ? trace.setSpan(context.active(), parentSpan) : context.active(); // ❌ Includes ambient spans
  ```

  **After**:

  ```typescript
  const parentContext = parentSpan
    ? trace.setSpan(context.active(), parentSpan)
    : trace.deleteSpan(context.active()); // ✅ Clean context
  ```

  This follows OpenTelemetry's official pattern from `@opentelemetry/sdk-trace-base`:

  ```typescript
  if (options.root) {
    context = api.trace.deleteSpan(context);
  }
  ```

  ## Impact
  - ✅ **Serverless environments**: Traces now properly complete in VoltOps on Vercel, Netlify, Cloudflare Workers
  - ✅ **Framework compatibility**: Works correctly alongside Next.js, Express, and other instrumented frameworks
  - ✅ **Proper trace hierarchy**: Agent root spans are no longer children of ambient framework spans
  - ✅ **No breaking changes**: Only affects root span context creation, existing functionality preserved
  - ✅ **Observability improvements**: Backend can now correctly identify root spans and mark traces as "completed"

  ## Verification

  After the fix, backend logs show:

  ```typescript
  {
    name: 'Supervisor',
    parentSpanId: undefined,          // ✅ No ambient parent
    isRootSpan: true,                 // ✅ Correctly detected
    agentState: 'completed',
  }
  // Result: Trace marked as "completed" ✅
  ```

  ## Usage

  No code changes required - this fix is automatic for all VoltAgent applications deployed to serverless environments.

  **Note**: If you previously added workarounds like `after()` with `forceFlush()` in Next.js routes, those are no longer necessary for trace completion (though they may still be useful for ensuring spans are exported before function termination on some platforms).

## 1.2.3

### Patch Changes

- [#787](https://github.com/VoltAgent/voltagent/pull/787) [`5e81d65`](https://github.com/VoltAgent/voltagent/commit/5e81d6568ba3bee26083ca2a8e5d31f158e36fc0) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add full conversation step persistence across the stack:
  - Core now exposes managed-memory step APIs, and the VoltAgent managed memory adapter persists/retrieves steps through VoltOps.
  - LibSQL, PostgreSQL, Supabase, and server handlers provision the new `_steps` table, wire up DTOs/routes, and surface the data in Observability/Steps UI (including managed-memory backends).

  fixes: #613

## 1.2.2

### Patch Changes

- [#785](https://github.com/VoltAgent/voltagent/pull/785) [`f4b9524`](https://github.com/VoltAgent/voltagent/commit/f4b9524ea24b7dfc7e863547d5ee01e876524eba) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: the `/agents/:id/text` response to always include tool calling data. Previously we only bubbled up the last step's `toolCalls`/`toolResults`, so multi-step providers (like `ollama-ai-provider-v2`) returned empty arrays even though the tool actually ran. We now aggregate tool activity across every step before returning the result, restoring parity with GPT-style providers and matching the AI SDK output.

- [#783](https://github.com/VoltAgent/voltagent/pull/783) [`46597cf`](https://github.com/VoltAgent/voltagent/commit/46597cf5a6ff8ff1ff5b8a61ab45c4195049f550) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: unwrap provider-executed tool outputs when persisting conversation history so Anthropic’s `server_tool_use` IDs stay unique on replay

- [#786](https://github.com/VoltAgent/voltagent/pull/786) [`f262b51`](https://github.com/VoltAgent/voltagent/commit/f262b51f0a65923d6dfac4f410b37f54a7f81cd2) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: ensure sub-agent metadata is persisted alongside supervisor history so supervisor conversations know which sub-agent produced each tool event and memory record. You can now filter historical events the same way you handle live streams:

  ```ts
  const memoryMessages = await memory.getMessages(userId, conversationId);

  const formatterSteps = memoryMessages.filter(
    (message) => message.metadata?.subAgentId === "Formatter"
  );

  for (const message of formatterSteps) {
    console.log(`[${message.metadata?.subAgentName}]`, message.parts);
  }
  ```

  The same metadata also exists on live `fullStream` chunks, so you can keep the streaming UI and the historical memory explorer in sync.

## 1.2.1

### Patch Changes

- [`65e3317`](https://github.com/VoltAgent/voltagent/commit/65e331786645a124f16f06d08dfa55a675959bc8) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add tags support for tools

## 1.2.0

### Minor Changes

- [#761](https://github.com/VoltAgent/voltagent/pull/761) [`0d13b73`](https://github.com/VoltAgent/voltagent/commit/0d13b73db5e6d1d144229bda9657abb776fafab4) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add `onHandoffComplete` hook for early termination in supervisor/subagent workflows

  ## The Problem

  When using the supervisor/subagent pattern, subagents **always** return to the supervisor for processing, even when they generate final outputs (like JSON structures or reports) that need no additional handling. This causes unnecessary token consumption.

  **Current flow**:

  ```
  Supervisor → SubAgent (generates 2K token JSON) → Supervisor (processes JSON) → User
                                                      ↑ Wastes ~2K tokens
  ```

  **Example impact**:
  - Current: ~2,650 tokens per request
  - With bail: ~560 tokens per request
  - Savings: **79%** (~2,000 tokens / ~$0.020 per request)

  ## The Solution

  Added `onHandoffComplete` hook that allows supervisors to intercept subagent results and optionally **bail** (skip supervisor processing) when the subagent produces final output.

  **New flow**:

  ```
  Supervisor → SubAgent → bail() → User ✅
  ```

  ## API

  The hook receives a `bail()` function that can be called to terminate early:

  ```typescript
  const supervisor = new Agent({
    name: "Workout Supervisor",
    subAgents: [exerciseAgent, workoutBuilder],
    hooks: {
      onHandoffComplete: async ({ agent, result, bail, context }) => {
        // Workout Builder produces final JSON - no processing needed
        if (agent.name === "Workout Builder") {
          context.logger?.info("Final output received, bailing");
          bail(); // Skip supervisor, return directly to user
          return;
        }

        // Large result - bail to save tokens
        if (result.length > 2000) {
          context.logger?.warn("Large result, bailing to save tokens");
          bail();
          return;
        }

        // Transform and bail
        if (agent.name === "Report Generator") {
          const transformed = `# Final Report\n\n${result}\n\n---\nGenerated at: ${new Date().toISOString()}`;
          bail(transformed); // Bail with transformed result
          return;
        }

        // Default: continue to supervisor for processing
      },
    },
  });
  ```

  ## Hook Arguments

  ```typescript
  interface OnHandoffCompleteHookArgs {
    agent: Agent; // Target agent (subagent)
    sourceAgent: Agent; // Source agent (supervisor)
    result: string; // Subagent's output
    messages: UIMessage[]; // Full conversation messages
    usage?: UsageInfo; // Token usage info
    context: OperationContext; // Operation context
    bail: (transformedResult?: string) => void; // Call to bail
  }
  ```

  ## Features
  - ✅ **Clean API**: No return value needed, just call `bail()`
  - ✅ **True early termination**: Supervisor execution stops immediately, no LLM calls wasted
  - ✅ **Conditional bail**: Decide based on agent, result content, size, etc.
  - ✅ **Optional transformation**: `bail(newResult)` to transform before bailing
  - ✅ **Observability**: Automatic logging and OpenTelemetry events with visual indicators
  - ✅ **Backward compatible**: Existing code works without changes
  - ✅ **Error handling**: Hook errors logged, flow continues normally

  ## How Bail Works (Implementation Details)

  When `bail()` is called in the `onHandoffComplete` hook:

  **1. Hook Level** (`packages/core/src/agent/subagent/index.ts`):
  - Sets `bailed: true` flag in handoff return value
  - Adds OpenTelemetry span attributes to both supervisor and subagent spans
  - Logs the bail event with metadata

  **2. Tool Level** (`delegate_task` tool):
  - Includes `bailed: true` in tool result structure
  - Adds note: "One or more subagents produced final output. No further processing needed."

  **3. Step Handler Level** (`createStepHandler` in `agent.ts`):
  - Detects bail during step execution when tool results arrive
  - Creates `BailError` and aborts execution via `abortController.abort(bailError)`
  - Stores bailed result in `systemContext` for retrieval
  - **Works for both `generateText` and `streamText`**

  **4. Catch Block Level** (method-specific handling):
  - **generateText**: Catches `BailError`, retrieves bailed result from `systemContext`, applies guardrails, calls hooks, returns as successful generation
  - **streamText**: `onError` catches `BailError` gracefully (not logged as error), `onFinish` retrieves and uses bailed result

  This unified abort-based implementation ensures true early termination for all generation methods.

  ### Stream Support (NEW)

  **For `streamText` supervisors:**

  When a subagent bails during streaming, the supervisor stream is immediately aborted using a `BailError`:
  1. **Detection during streaming** (`createStepHandler`):
     - Tool results are checked in `onStepFinish` handler
     - If `bailed: true` found, `BailError` is created and stream is aborted via `abortController.abort(bailError)`
     - Bailed result stored in `systemContext` for retrieval in `onFinish`
  2. **Graceful error handling** (`streamText` onError):
     - `BailError` is detected and handled gracefully (not logged as error)
     - Error hooks are NOT called for bail
     - Stream abort is treated as successful early termination
  3. **Final result** (`streamText` onFinish):
     - Bailed result retrieved from `systemContext`
     - Output guardrails applied to bailed result
     - `onEnd` hook called with bailed result

  **Benefits for streaming:**
  - ✅ Stream stops immediately when bail detected (no wasted supervisor chunks)
  - ✅ No unnecessary LLM calls after bail
  - ✅ Works with `fullStreamEventForwarding` - subagent chunks already forwarded
  - ✅ Clean abort semantic with `BailError` class
  - ✅ Graceful handling - not treated as error

  **Supported methods:**
  - ✅ `generateText` - Aborts execution during step handler, catches `BailError` and returns bailed result
  - ✅ `streamText` - Aborts stream during step handler, handles `BailError` in `onError` and `onFinish`
  - ❌ `generateObject` - No tool support, bail not applicable
  - ❌ `streamObject` - No tool support, bail not applicable

  **Key difference from initial implementation:**
  - ❌ **OLD**: Post-execution check in `generateText` (after AI SDK completes) - redundant
  - ✅ **NEW**: Unified abort mechanism in `createStepHandler` - works for both methods, stops execution immediately

  ## Use Cases

  Perfect for scenarios where specialized subagents generate final outputs:
  1. **JSON/Structured data generators**: Workout builders, report generators
  2. **Large content producers**: Document creators, data exports
  3. **Token optimization**: Skip processing for expensive results
  4. **Business logic**: Conditional routing based on result characteristics

  ## Observability

  When bail occurs, both logging and OpenTelemetry tracking provide full visibility:

  **Logging:**
  - Log event: `Supervisor bailed after handoff`
  - Includes: supervisor name, subagent name, result length, transformation status

  **OpenTelemetry:**
  - Span event: `supervisor.handoff.bailed` (for timeline events)
  - Span attributes added to **both supervisor and subagent spans**:
    - `bailed`: `true`
    - `bail.supervisor`: supervisor agent name (on subagent span)
    - `bail.subagent`: subagent name (on supervisor span)
    - `bail.transformed`: `true` if result was transformed

  **Console Visualization:**
  Bailed subagents are visually distinct in the observability react-flow view:
  - Purple border with shadow (`border-purple-500 shadow-purple-600/50`)
  - "⚡ BAILED" badge in the header (shows "⚡ BAILED (T)" if transformed)
  - Tooltip showing which supervisor initiated the bail
  - Node opacity remains at 1.0 (fully visible)
  - Status badge shows "BAILED" with purple styling instead of error
  - Details panel shows "Early Termination" info section with supervisor info

  ## Type Safety Improvements

  Also improved type safety by replacing `usage?: any` with proper `UsageInfo` type:

  ```typescript
  export type UsageInfo = {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cachedInputTokens?: number;
    reasoningTokens?: number;
  };
  ```

  This provides:
  - ✅ Better autocomplete in IDEs
  - ✅ Compile-time type checking
  - ✅ Clear documentation of available fields

  ## Breaking Changes

  None - this is a purely additive feature. The `UsageInfo` type structure is fully compatible with existing code.

### Patch Changes

- [#754](https://github.com/VoltAgent/voltagent/pull/754) [`c80d18f`](https://github.com/VoltAgent/voltagent/commit/c80d18f344ee37c16f52495edb88c72f74701610) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: encapsulate tool-specific metadata in toolContext + prevent AI SDK context collision

  ## Changes

  ### 1. Tool Context Encapsulation

  Tool-specific metadata now organized under optional `toolContext` field for better separation and future-proofing.

  **Migration:**

  ```typescript
  // Before
  execute: async ({ location }, options) => {
    // Fields were flat (planned, not released)
  };

  // After
  execute: async ({ location }, options) => {
    const { name, callId, messages, abortSignal } = options?.toolContext || {};

    // Session context remains flat
    const userId = options?.userId;
    const logger = options?.logger;
    const context = options?.context;
  };
  ```

  ### 2. AI SDK Context Field Protection

  Explicitly exclude `context` from being spread into AI SDK calls to prevent future naming collisions if AI SDK renames `experimental_context` → `context`.

  ## Benefits
  - ✅ Better organization - tool metadata in one place
  - ✅ Clearer separation - session context vs tool context
  - ✅ Future-proof - easy to add new tool metadata fields
  - ✅ Namespace safety - no collision with OperationContext or AI SDK fields
  - ✅ Backward compatible - `toolContext` is optional for external callers (MCP servers)
  - ✅ Protected from AI SDK breaking changes

- [#754](https://github.com/VoltAgent/voltagent/pull/754) [`c80d18f`](https://github.com/VoltAgent/voltagent/commit/c80d18f344ee37c16f52495edb88c72f74701610) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add multi-modal tool results support with toModelOutput - #722

  Tools can now return images, media, and rich content to AI models using the `toModelOutput` function.

  ## The Problem

  AI agents couldn't receive visual information from tools - everything had to be text or JSON. This limited use cases like:
  - Computer use agents that need to see screenshots
  - Image analysis workflows
  - Visual debugging tools
  - Any tool that produces media output

  ## The Solution

  Added `toModelOutput?: (output) => ToolResultOutput` to tool options. This function transforms your tool's output into a format the AI model can understand, including images and media.

  ```typescript
  import { createTool } from "@voltagent/core";
  import fs from "fs";

  const screenshotTool = createTool({
    name: "take_screenshot",
    description: "Takes a screenshot of the screen",
    parameters: z.object({
      region: z.string().optional().describe("Region to capture"),
    }),
    execute: async ({ region }) => {
      const imageData = fs.readFileSync("./screenshot.png").toString("base64");
      return {
        type: "image",
        data: imageData,
        timestamp: new Date().toISOString(),
      };
    },
    toModelOutput: (result) => ({
      type: "content",
      value: [
        { type: "text", text: `Screenshot captured at ${result.timestamp}` },
        { type: "media", data: result.data, mediaType: "image/png" },
      ],
    }),
  });
  ```

  ## Return Formats

  The `toModelOutput` function can return multiple formats:

  **Text output:**

  ```typescript
  toModelOutput: (result) => ({
    type: "text",
    value: result.summary,
  });
  ```

  **JSON output:**

  ```typescript
  toModelOutput: (result) => ({
    type: "json",
    value: { status: "success", data: result },
  });
  ```

  **Multi-modal content (text + media):**

  ```typescript
  toModelOutput: (result) => ({
    type: "content",
    value: [
      { type: "text", text: "Analysis complete" },
      { type: "media", data: result.imageBase64, mediaType: "image/png" },
    ],
  });
  ```

  **Error handling:**

  ```typescript
  toModelOutput: (result) => ({
    type: "error-text",
    value: result.errorMessage,
  });
  ```

  ## Impact
  - **Visual AI Workflows**: Build computer use agents that can see and interact with UIs
  - **Image Generation**: Tools can return generated images directly to the model
  - **Debugging**: Return screenshots and visual debugging information
  - **Rich Responses**: Combine text explanations with visual evidence

  ## Usage with Anthropic

  ```typescript
  const agent = createAgent({
    name: "visual-assistant",
    tools: [screenshotTool],
    model: anthropic("claude-3-5-sonnet-20241022"),
  });

  const result = await agent.generateText({
    prompt: "Take a screenshot and describe what you see",
  });
  // Agent receives both text and image, can analyze the screenshot
  ```

  See [AI SDK documentation](https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling#multi-modal-tool-results) for more details on multi-modal tool results.

- [#754](https://github.com/VoltAgent/voltagent/pull/754) [`c80d18f`](https://github.com/VoltAgent/voltagent/commit/c80d18f344ee37c16f52495edb88c72f74701610) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add providerOptions support to tools for provider-specific features - #759

  Tools can now accept `providerOptions` to enable provider-specific features like Anthropic's cache control. This aligns VoltAgent tools with the AI SDK's tool API.

  ## The Problem

  Users wanted to use provider-specific features like Anthropic's prompt caching to reduce costs and latency, but VoltAgent's `createTool()` didn't support the `providerOptions` field that AI SDK tools have.

  ## The Solution

  **What Changed:**
  - Added `providerOptions?: ProviderOptions` field to `ToolOptions` type
  - VoltAgent tools now accept and pass through provider options to the AI SDK
  - Supports all provider-specific features: cache control, reasoning settings, etc.

  **What Gets Enabled:**

  ```typescript
  import { createTool } from "@voltagent/core";
  import { z } from "zod";

  const cityAttractionsTool = createTool({
    name: "get_city_attractions",
    description: "Get tourist attractions for a city",
    parameters: z.object({
      city: z.string().describe("The city name"),
    }),
    providerOptions: {
      anthropic: {
        cacheControl: { type: "ephemeral" },
      },
    },
    execute: async ({ city }) => {
      return await fetchAttractions(city);
    },
  });
  ```

  ## Impact
  - **Cost Optimization:** Anthropic cache control reduces API costs for repeated tool calls
  - **Future-Proof:** Any new provider features work automatically
  - **Type-Safe:** Uses official AI SDK `ProviderOptions` type
  - **Zero Breaking Changes:** Optional field, fully backward compatible

  ## Usage

  Use with any provider that supports provider-specific options:

  ```typescript
  const agent = new Agent({
    name: "Travel Assistant",
    model: anthropic("claude-3-5-sonnet"),
    tools: [cityAttractionsTool], // Tool with cacheControl enabled
  });

  await agent.generateText("What are the top attractions in Paris?");
  // Tool definition cached by Anthropic for improved performance
  ```

  Learn more: [Anthropic Cache Control](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic#cache-control)

## 1.1.39

### Patch Changes

- [#757](https://github.com/VoltAgent/voltagent/pull/757) [`a0509c4`](https://github.com/VoltAgent/voltagent/commit/a0509c493b85619c7eafb2eebd2257c348868133) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: evals & guardrails observability issue

## 1.1.38

### Patch Changes

- [#744](https://github.com/VoltAgent/voltagent/pull/744) [`e9e467a`](https://github.com/VoltAgent/voltagent/commit/e9e467a433a0fe0ba14f56554fc65fccce1cb888) Thanks [@marinoska](https://github.com/marinoska)! - Refactor ToolManager into hierarchical architecture with BaseToolManager and ToolkitManager

  Introduces new class hierarchy for improved tool management:
  - **BaseToolManager**: Abstract base class with core tool management functionality
  - **ToolManager**: Main manager supporting standalone tools, provider tools, and toolkits
  - **ToolkitManager**: Specialized manager for toolkit-scoped tools (no nested toolkits)

  Features:
  - Enhanced type-safe tool categorization with type guards
  - Conflict detection for toolkit tools
  - Reorganized tool preparation process - moved `prepareToolsForExecution` logic from agent into ToolManager, simplifying agent code

  Public API remains compatible.

- [#752](https://github.com/VoltAgent/voltagent/pull/752) [`002ebad`](https://github.com/VoltAgent/voltagent/commit/002ebad1e95a82998c1693b3998b683d5bb04bb2) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: forward AI SDK tool call metadata (including `toolCallId`) to server-side tool executions - #746

  Tool wrappers now receive the full options object from the AI SDK, so custom tools and hook listeners can access `toolCallId`, abort signals, and other metadata. We also propagate the real call id to OpenTelemetry spans. Existing tools keep working (the extra argument is optional), but they can now inspect the third `options` parameter if they need richer context.

## 1.1.37

### Patch Changes

- [#740](https://github.com/VoltAgent/voltagent/pull/740) [`bac1f49`](https://github.com/VoltAgent/voltagent/commit/bac1f4992e3841b940c5d5bce4474c63257dbe63) Thanks [@marinoska](https://github.com/marinoska)! - Stable fix for the providerMetadata openai entries normalization bug: https://github.com/VoltAgent/voltagent/issues/718

- [#738](https://github.com/VoltAgent/voltagent/pull/738) [`d3ed347`](https://github.com/VoltAgent/voltagent/commit/d3ed347e064cb36e04ed1ea98d9305b63fd968ec) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: persist workflow execution timeline events to prevent data loss after completion - #647

  ## The Problem

  When workflows executed, their timeline events (step-start, step-complete, workflow-complete, etc.) were only visible during streaming. Once the workflow completed, the WebSocket state update would replace the execution object without the events field, causing the timeline UI to reset and lose all execution history. Users couldn't see what happened in completed or suspended workflows.

  **Symptoms:**
  - Timeline showed events during execution
  - Timeline cleared/reset when workflow completed
  - No execution history for completed workflows
  - Events were lost after browser refresh

  ## The Solution

  **Backend (Framework)**:
  - Added `events`, `output`, and `cancellation` fields to `WorkflowStateEntry` interface
  - Modified workflow execution to collect all stream events in memory during execution
  - Persist collected events to workflow state when workflow completes, suspends, fails, or is cancelled
  - Updated all storage adapters to support the new fields:
    - **LibSQL**: Added schema columns + automatic migration method (`addWorkflowStateColumns`)
    - **Supabase**: Added schema columns + migration detection + ALTER TABLE migration SQL
    - **Postgres**: Added schema columns + INSERT/UPDATE queries
    - **In-Memory**: Automatically supported via TypeScript interface

  **Frontend (Console)**:
  - Updated `WorkflowPlaygroundProvider` to include events when converting `WorkflowStateEntry` → `WorkflowHistoryEntry`
  - Implemented smart merge strategy for WebSocket updates: Use backend persisted events when workflow finishes, keep streaming events during execution
  - Events are now preserved across page refreshes and always visible in timeline UI

  ## What Gets Persisted

  ```typescript
  // In WorkflowStateEntry (stored in Memory V2):
  {
    "events": [
      {
        "id": "evt_123",
        "type": "workflow-start",
        "name": "Workflow Started",
        "startTime": "2025-01-24T10:00:00Z",
        "status": "running",
        "input": { "userId": "123" }
      },
      {
        "id": "evt_124",
        "type": "step-complete",
        "name": "Step: fetch-user",
        "startTime": "2025-01-24T10:00:01Z",
        "endTime": "2025-01-24T10:00:02Z",
        "status": "success",
        "output": { "user": { "name": "John" } }
      }
    ],
    "output": { "result": "success" },
    "cancellation": {
      "cancelledAt": "2025-01-24T10:00:05Z",
      "reason": "User requested cancellation"
    }
  }
  ```

  ## Migration Guide

  ### LibSQL Users

  No action required - migrations run automatically on next initialization.

  ### Supabase Users

  When you upgrade and initialize the adapter, you'll see migration SQL in the console. Run it in your Supabase SQL Editor:

  ```sql
  -- Add workflow event persistence columns
  ALTER TABLE voltagent_workflow_states
  ADD COLUMN IF NOT EXISTS events JSONB;

  ALTER TABLE voltagent_workflow_states
  ADD COLUMN IF NOT EXISTS output JSONB;

  ALTER TABLE voltagent_workflow_states
  ADD COLUMN IF NOT EXISTS cancellation JSONB;
  ```

  ### Postgres Users

  No action required - migrations run automatically on next initialization.

  ### In-Memory Users

  No action required - automatically supported.

  ### VoltAgent Managed Memory Users

  No action required - migrations run automatically on first request per managed memory database after API deployment. The API has been updated to:
  - Include new columns in ManagedMemoryProvisioner CREATE TABLE statements (new databases)
  - Run automatic column addition migration for existing databases (lazy migration on first request)
  - Update PostgreSQL memory adapter to persist and retrieve events, output, and cancellation fields

  **Zero-downtime deployment:** Existing managed memory databases will be migrated lazily when first accessed after the API update.

  ## Impact
  - ✅ Workflow execution timeline is now persistent and survives completion
  - ✅ Full execution history visible for completed, suspended, and failed workflows
  - ✅ Events, output, and cancellation metadata preserved in database
  - ✅ Console UI timeline works consistently across all workflow states
  - ✅ All storage backends (LibSQL, Supabase, Postgres, In-Memory) behave consistently
  - ✅ No data loss on workflow completion or page refresh

- [#743](https://github.com/VoltAgent/voltagent/pull/743) [`55e3555`](https://github.com/VoltAgent/voltagent/commit/55e3555ab912a37e2028270f707824b9c88a8cb2) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add OperationContext support to Memory adapters for dynamic runtime behavior

  ## The Problem

  Memory adapters (InMemory, PostgreSQL, custom) had fixed configuration at instantiation time. Users couldn't:
  1. Pass different memory limits per `generateText()` call (e.g., 10 messages for quick responses, 100 for summaries)
  2. Access agent execution context (logger, tracing, abort signals) within memory operations
  3. Implement context-aware memory behavior without modifying adapter configuration

  ## The Solution

  **Framework (VoltAgent Core):**
  - Added optional `context?: OperationContext` parameter to all `StorageAdapter` methods
  - Memory adapters now receive full agent execution context including:
    - `context.context` - User-provided key-value map for dynamic parameters
    - `context.logger` - Contextual logger for debugging
    - `context.traceContext` - OpenTelemetry tracing integration
    - `context.abortController` - Cancellation support
    - `userId`, `conversationId`, and other operation metadata

  **Type Safety:**
  - Replaced `any` types with proper `OperationContext` type
  - No circular dependencies (type-only imports)
  - Full IDE autocomplete support

  ## Usage Example

  ### Dynamic Memory Limits

  ```typescript
  import { Agent, Memory, InMemoryStorageAdapter } from "@voltagent/core";
  import type { OperationContext } from "@voltagent/core/agent";

  class DynamicMemoryAdapter extends InMemoryStorageAdapter {
    async getMessages(
      userId: string,
      conversationId: string,
      options?: GetMessagesOptions,
      context?: OperationContext
    ): Promise<UIMessage[]> {
      // Extract dynamic limit from context
      const dynamicLimit = context?.context.get("memoryLimit") as number;
      return super.getMessages(
        userId,
        conversationId,
        {
          ...options,
          limit: dynamicLimit || options?.limit || 10,
        },
        context
      );
    }
  }

  const agent = new Agent({
    memory: new Memory({ storage: new DynamicMemoryAdapter() }),
  });

  // Short context for quick queries
  await agent.generateText("Quick question", {
    context: new Map([["memoryLimit", 5]]),
  });

  // Long context for detailed analysis
  await agent.generateText("Summarize everything", {
    context: new Map([["memoryLimit", 100]]),
  });
  ```

  ### Access Logger and Tracing

  ```typescript
  class ObservableMemoryAdapter extends InMemoryStorageAdapter {
    async getMessages(...args, context?: OperationContext) {
      context?.logger.debug("Fetching messages", {
        traceId: context.traceContext.getTraceId(),
        userId: args[0],
      });
      return super.getMessages(...args, context);
    }
  }
  ```

  ## Impact
  - ✅ **Dynamic behavior per request** without changing adapter configuration
  - ✅ **Full observability** - Access to logger, tracing, and operation metadata
  - ✅ **Type-safe** - Proper TypeScript types with IDE autocomplete
  - ✅ **Backward compatible** - Context parameter is optional
  - ✅ **Extensible** - Custom adapters can implement context-aware logic

  ## Breaking Changes

  None - the `context` parameter is optional on all methods.

## 1.1.36

### Patch Changes

- [#736](https://github.com/VoltAgent/voltagent/pull/736) [`348bda0`](https://github.com/VoltAgent/voltagent/commit/348bda0f0fffdcbd75c8a6aa2c2d8bd15195cd22) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: respect configured log levels for console output while sending all logs to OpenTelemetry - #646

  ## The Problem

  When users configured a custom logger with a specific log level (e.g., `level: "error"`), DEBUG and INFO logs were still appearing in console output, cluttering the development environment. This happened because:
  1. `LoggerProxy` was forwarding all log calls to the underlying logger without checking the configured level
  2. Multiple components (agents, workflows, retrievers, memory adapters, observability) were logging at DEBUG level unconditionally
  3. OpenTelemetry logs were also being filtered by the same level, preventing observability platforms from receiving all logs

  ## The Solution

  **Framework Changes:**
  - Updated `LoggerProxy` to check configured log level before forwarding to console/stdout
  - Added `shouldLog(level)` method that inspects the underlying logger's level (supports both Pino and ConsoleLogger)
  - Separated console output filtering from OpenTelemetry emission:
    - **Console/stdout**: Respects configured level (error level → only shows error/fatal)
    - **OpenTelemetry**: Always receives all logs (debug, info, warn, error, fatal)

  **What Gets Fixed:**

  ```typescript
  const logger = createPinoLogger({ level: "error" });

  logger.debug("Agent created");
  // Console: ❌ Hidden (keeps dev environment clean)
  // OpenTelemetry: ✅ Sent (full observability)

  logger.error("Generation failed");
  // Console: ✅ Shown (important errors visible)
  // OpenTelemetry: ✅ Sent (full observability)
  ```

  ## Impact
  - **Cleaner Development**: Console output now respects configured log levels
  - **Full Observability**: OpenTelemetry platforms receive all logs regardless of console level
  - **Better Debugging**: Debug/trace logs available in observability tools even in production
  - **No Breaking Changes**: Existing code works as-is with improved behavior

  ## Usage

  No code changes needed - the fix applies automatically:

  ```typescript
  // Create logger with error level
  const logger = createPinoLogger({
    level: "error",
    name: "my-app",
  });

  // Use it with VoltAgent
  new VoltAgent({
    agents: { myAgent },
    logger, // Console will be clean, OpenTelemetry gets everything
  });
  ```

  ## Migration Notes

  If you were working around this issue by:
  - Filtering console output manually
  - Using different loggers for different components
  - Avoiding debug logs altogether

  You can now remove those workarounds and use a single logger with your preferred console level while maintaining full observability.

## 1.1.35

### Patch Changes

- [#730](https://github.com/VoltAgent/voltagent/pull/730) [`1244b3e`](https://github.com/VoltAgent/voltagent/commit/1244b3eef1c1d1feea8e7a3934556782200a760e) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add finish reason and max steps observability to agent execution traces - #721

  ## The Problem

  When agents hit the maximum steps limit (via `maxSteps` or `stopWhen` conditions), execution would terminate abruptly without clear indication in observability traces. This created confusion as:
  1. The AI SDK's `finishReason` (e.g., `stop`, `tool-calls`, `length`, `error`) was not being captured in OpenTelemetry spans
  2. MaxSteps termination looked like a normal completion with `finishReason: "tool-calls"`
  3. Users couldn't easily debug why their agent stopped executing

  ## The Solution

  **Framework (VoltAgent Core):**
  - Added `setFinishReason(finishReason: string)` method to `AgentTraceContext` to capture AI SDK finish reasons in OpenTelemetry spans as `ai.response.finish_reason` attribute
  - Added `setStopConditionMet(stepCount: number, maxSteps: number)` method to track when maxSteps limit is reached
  - Updated `agent.generateText()` and `agent.streamText()` to automatically record:
    - `ai.response.finish_reason` - The AI SDK finish reason (`stop`, `tool-calls`, `length`, `error`, etc.)
    - `voltagent.stopped_by_max_steps` - Boolean flag when maxSteps is reached
    - `voltagent.step_count` - Actual number of steps executed
    - `voltagent.max_steps` - The maxSteps limit that was configured

  **What Gets Captured:**

  ```typescript
  // In OpenTelemetry spans:
  {
    "ai.response.finish_reason": "tool-calls",
    "voltagent.stopped_by_max_steps": true,
    "voltagent.step_count": 10,
    "voltagent.max_steps": 10
  }
  ```

  ## Impact
  - **Better Debugging:** Users can now clearly see why their agent execution terminated
  - **Observability:** All AI SDK finish reasons are now visible in traces
  - **MaxSteps Detection:** Explicit tracking when agents hit step limits
  - **Console UI Ready:** These attributes power warning UI in VoltOps Console to alert users when maxSteps is reached

  ## Usage

  No code changes needed - this is automatically tracked for all agent executions:

  ```typescript
  const agent = new Agent({
    name: "my-agent",
    maxSteps: 5, // Will be tracked in spans
  });

  await agent.generateText("Hello");
  // Span will include ai.response.finish_reason and maxSteps metadata
  ```

## 1.1.34

### Patch Changes

- [#727](https://github.com/VoltAgent/voltagent/pull/727) [`59da0b5`](https://github.com/VoltAgent/voltagent/commit/59da0b587cd72ff6065fa7fde9fcaecf0a92d830) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add agent.toTool() for converting agents into tools

  Agents can now be converted to tools using the `.toTool()` method, enabling multi-agent coordination where one agent uses other specialized agents as tools. This is useful when the LLM should dynamically decide which agents to call based on the request.

  ## Usage Example

  ```typescript
  import { Agent } from "@voltagent/core";
  import { openai } from "@ai-sdk/openai";

  // Create specialized agents
  const writerAgent = new Agent({
    id: "writer",
    purpose: "Writes blog posts",
    model: openai("gpt-4o-mini"),
  });

  const editorAgent = new Agent({
    id: "editor",
    purpose: "Edits content",
    model: openai("gpt-4o-mini"),
  });

  // Coordinator uses them as tools
  const coordinator = new Agent({
    tools: [writerAgent.toTool(), editorAgent.toTool()],
    model: openai("gpt-4o-mini"),
  });

  // LLM decides which agents to call
  await coordinator.generateText("Create a blog post about AI");
  ```

  ## Key Features
  - **Dynamic agent selection**: LLM intelligently chooses which agents to invoke
  - **Composable agents**: Reuse agents as building blocks across multiple coordinators
  - **Type-safe**: Full TypeScript support with automatic type inference
  - **Context preservation**: Automatically passes through userId, conversationId, and operation context
  - **Customizable**: Optional custom name, description, and parameter schema

  ## Customization

  ```typescript
  const customTool = agent.toTool({
    name: "professional_writer",
    description: "Writes professional blog posts",
    parametersSchema: z.object({
      topic: z.string(),
      style: z.enum(["formal", "casual"]),
    }),
  });
  ```

  ## When to Use
  - **Use `agent.toTool()`** when the LLM should decide which agents to call (e.g., customer support routing)
  - **Use Workflows** for deterministic, code-defined pipelines (e.g., always: Step A → Step B → Step C)
  - **Use Sub-agents** for fixed sets of collaborating agents

  See the [documentation](https://docs.voltagent.ai/agents) and [`examples/with-agent-tool`](https://github.com/VoltAgent/voltagent/tree/main/examples/with-agent-tool) for more details.

## 1.1.33

### Patch Changes

- [#724](https://github.com/VoltAgent/voltagent/pull/724) [`efe4be6`](https://github.com/VoltAgent/voltagent/commit/efe4be634f52aaef00d6b188a9146b1ad00b5968) Thanks [@marinoska](https://github.com/marinoska)! - Temporary fix for providerMetadata bug: https://github.com/vercel/ai/pull/9756

## 1.1.32

### Patch Changes

- [#719](https://github.com/VoltAgent/voltagent/pull/719) [`3a1d214`](https://github.com/VoltAgent/voltagent/commit/3a1d214790cf49c5020eac3e9155a6daab2ff1db) Thanks [@marinoska](https://github.com/marinoska)! - Strip providerMetadata from text parts before calling convertToModelMessages to prevent invalid providerOptions in the resulting ModelMessage[].

## 1.1.31

### Patch Changes

- [#711](https://github.com/VoltAgent/voltagent/pull/711) [`461ecec`](https://github.com/VoltAgent/voltagent/commit/461ecec60aa90b56a413713070b6e9f43efbd74b) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: sanitize stored assistant/tool messages so GPT-5 conversations no longer crash with "missing reasoning item" errors when replaying memory history

  fixes:
  - #706

## 1.1.30

### Patch Changes

- [#693](https://github.com/VoltAgent/voltagent/pull/693) [`f9aa8b8`](https://github.com/VoltAgent/voltagent/commit/f9aa8b8980a9efa53b6a83e6ba2a6db765a4fd0e) Thanks [@marinoska](https://github.com/marinoska)! - - Added support for provider-defined tools (e.g. `openai.tools.webSearch()`)
  - Update tool normalization to pass through provider tool metadata untouched.
  - Added support for provider-defined tools both as standalone tool and within a toolkit.
  - Upgraded dependency: `ai` → `^5.0.76`
- Updated dependencies [[`f9aa8b8`](https://github.com/VoltAgent/voltagent/commit/f9aa8b8980a9efa53b6a83e6ba2a6db765a4fd0e)]:
  - @voltagent/internal@0.0.12

## 1.1.29

### Patch Changes

- [`d5170ce`](https://github.com/VoltAgent/voltagent/commit/d5170ced80fbc9fd2de03bb7eaff1cb31424d618) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add runtime payload support for evals

## 1.1.28

### Patch Changes

- [#688](https://github.com/VoltAgent/voltagent/pull/688) [`5b9484f`](https://github.com/VoltAgent/voltagent/commit/5b9484f1c6643fd8a8d2547be640ccd296ef2266) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add guardrails - #677

  ## Guardrails overview
  - streamText/generateText now run guardrails through a dedicated pipeline
    - streaming handlers can redact or drop chunks in-flight
    - final handlers see the original and sanitized text + provider metadata
  - guardrail spans inherit the guardrail name so VoltOps shows human-readable labels
  - helper factories: createSensitiveNumberGuardrail, createEmailRedactorGuardrail, createPhoneNumberGuardrail, createProfanityGuardrail, createMaxLengthGuardrail, createDefaultPIIGuardrails, createDefaultSafetyGuardrails

  ### Usage

  ```ts
  import { Agent } from "@voltagent/core";
  import { openai } from "@ai-sdk/openai";
  import { createSensitiveNumberGuardrail, createDefaultSafetyGuardrails } from "@voltagent/core";

  const agent = new Agent({
    name: "Guarded Assistant",
    instructions: "Answer without leaking PII.",
    model: openai("gpt-4o-mini"),
    outputGuardrails: [
      createSensitiveNumberGuardrail(),
      createDefaultSafetyGuardrails({ maxLength: { maxCharacters: 400 } }),
    ],
  });

  const response = await agent.streamText("Customer card 4242 4242 1234 5678");
  console.log(await response.text); // Sanitized output with digits redacted + length capped
  ```

## 1.1.27

### Patch Changes

- [#674](https://github.com/VoltAgent/voltagent/pull/674) [`5aa84b5`](https://github.com/VoltAgent/voltagent/commit/5aa84b5bcf57d19bbe33cc791f0892c96bb3944b) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add live evals

- [#674](https://github.com/VoltAgent/voltagent/pull/674) [`5aa84b5`](https://github.com/VoltAgent/voltagent/commit/5aa84b5bcf57d19bbe33cc791f0892c96bb3944b) Thanks [@omeraplak](https://github.com/omeraplak)! - ## What Changed

  Removed automatic message pruning functionality from all storage adapters (PostgreSQL, Supabase, LibSQL, and InMemory). Previously, messages were automatically deleted when the count exceeded `storageLimit` (default: 100 messages per conversation).

  ## Why This Change

  Users reported unexpected data loss when their conversation history exceeded the storage limit. Many users expect their conversation history to be preserved indefinitely rather than automatically deleted. This change gives users full control over their data retention policies.

  ## Migration Guide

  ### Before

  ```ts
  const memory = new Memory({
    storage: new PostgreSQLMemoryAdapter({
      connection: process.env.DATABASE_URL,
      storageLimit: 200, // Messages auto-deleted after 200
    }),
  });
  ```

  ### After

  ```ts
  const memory = new Memory({
    storage: new PostgreSQLMemoryAdapter({
      connection: process.env.DATABASE_URL,
      // No storageLimit - all messages preserved
    }),
  });
  ```

  ### If You Need Message Cleanup

  Implement your own cleanup logic using the `clearMessages()` method:

  ```ts
  // Clear all messages for a conversation
  await memory.clearMessages(userId, conversationId);

  // Clear all messages for a user
  await memory.clearMessages(userId);
  ```

  ## Affected Packages
  - `@voltagent/core` - Removed `storageLimit` from types
  - `@voltagent/postgres` - Removed from PostgreSQL adapter
  - `@voltagent/supabase` - Removed from Supabase adapter
  - `@voltagent/libsql` - Removed from LibSQL adapter

  ## Impact
  - ✅ No more unexpected data loss
  - ✅ Users have full control over message retention
  - ⚠️ Databases may grow larger over time (consider implementing manual cleanup)
  - ⚠️ Breaking change: `storageLimit` parameter no longer accepted

## 1.1.26

### Patch Changes

- [#654](https://github.com/VoltAgent/voltagent/pull/654) [`78b9727`](https://github.com/VoltAgent/voltagent/commit/78b9727e85a31fd8eaa9c333de373d982f58b04f) Thanks [@VISHWAJ33T](https://github.com/VISHWAJ33T)! - feat(workflow): Improve typing for state parameter in steps.

- [#669](https://github.com/VoltAgent/voltagent/pull/669) [`6d00793`](https://github.com/VoltAgent/voltagent/commit/6d007938d31c6d928185153834661c50227af326) Thanks [@marinoska](https://github.com/marinoska)! - Fix duplicate tool registration during agent preparation.

- [#663](https://github.com/VoltAgent/voltagent/pull/663) [`7fef3a7`](https://github.com/VoltAgent/voltagent/commit/7fef3a7ea1b3f7f8c780a528d3c3abce312f3be9) Thanks [@VISHWAJ33T](https://github.com/VISHWAJ33T)! - feat(workflow): add support for dynamic schemas in agent steps

- [#659](https://github.com/VoltAgent/voltagent/pull/659) [`c4d13f2`](https://github.com/VoltAgent/voltagent/commit/c4d13f2be129013eed6392990863ae85cdbd8855) Thanks [@marinoska](https://github.com/marinoska)! - Add first-class support for client-side tool calls and Vercel AI hooks integration.

  This enables tools to run in the browser (no execute function) while the model remains on the server. Tool calls are surfaced to the client via Vercel AI hooks (useChat/useAssistant), executed with access to browser APIs, and their results are sent back to the model using addToolResult with the original toolCallId.

  Highlights:
  - Define a client-side tool by omitting the execute function.
  - Automatic interception of tool calls on the client via onToolCall in useChat/useAssistant.
  - Report outputs and errors back to the model via addToolResult(toolCallId, payload), preserving conversation state.
  - Example added/updated: examples/with-client-side-tools (Next.js + Vercel AI).

  Docs:
  - README: Clarifies client-side tool support and where it fits in the stack.
  - website/docs/agents/tools.md: New/updated “Client-Side Tools” section, end-to-end flow with useChat/useAssistant, addToolResult usage, and error handling.

## 1.1.25

### Patch Changes

- [#648](https://github.com/VoltAgent/voltagent/pull/648) [`882480d`](https://github.com/VoltAgent/voltagent/commit/882480debb10575d16e9752b9fead136fe6a7050) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add input and output to OperationContext for improved observability

  ## What Changed

  Added `input` and `output` fields to `OperationContext`, making them accessible throughout the agent's execution lifecycle.

  ## New Fields in OperationContext

  ```typescript
  export type OperationContext = {
    // ... existing fields

    /** Input provided to the agent operation (string, UIMessages, or BaseMessages) */
    input?: string | UIMessage[] | BaseMessage[];

    /** Output generated by the agent operation (text or object) */
    output?: string | object;
  };
  ```

  ## Usage in Tools and Hooks

  ```typescript
  // Access input and output in tools
  const myTool = createTool({
    name: "exampleTool",
    parameters: z.object({}),
    async execute(args, context) {
      // Access the original input
      console.log("Original input:", context.input);

      return { status: "ok" };
    },
  });

  // Access in hooks
  const agent = new Agent({
    hooks: {
      onEnd: async ({ context }) => {
        // Both input and output are available
        console.log("Input:", context.input);
        console.log("Output:", context.output);
      },
    },
  });
  ```

  ## Why This Matters
  - **Better Debugging**: Tools and hooks can now see both the original input and final output
  - **Enhanced Observability**: Full context available for logging and monitoring
  - **Consistent with Tracing**: Aligns with how AgentTraceContext already handles input/output for OpenTelemetry
  - **No Breaking Changes**: Existing code continues to work; these are new optional fields

## 1.1.24

### Patch Changes

- [#641](https://github.com/VoltAgent/voltagent/pull/641) [`4c42bf7`](https://github.com/VoltAgent/voltagent/commit/4c42bf72834d3cd45ff5246ef65d7b08470d6a8e) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: introduce managed memory - ready-made cloud storage for VoltAgent

  ## What Changed for You

  VoltAgent now offers a managed memory solution that eliminates the need to run your own database infrastructure. The new `@voltagent/voltagent-memory` package provides a `ManagedMemoryAdapter` that connects to VoltOps Managed Memory service, perfect for pilots, demos, and production workloads.

  ## New Package: @voltagent/voltagent-memory

  ### Automatic Setup (Recommended)

  Get your credentials from [console.voltagent.dev/memory/managed-memory](https://console.voltagent.dev/memory/managed-memory) and set environment variables:

  ```bash
  # .env
  VOLTAGENT_PUBLIC_KEY=pk_...
  VOLTAGENT_SECRET_KEY=sk_...
  ```

  ```typescript
  import { Agent, Memory } from "@voltagent/core";
  import { ManagedMemoryAdapter } from "@voltagent/voltagent-memory";
  import { openai } from "@ai-sdk/openai";

  // Adapter automatically uses VoltOps credentials from environment
  const agent = new Agent({
    name: "Assistant",
    instructions: "You are a helpful assistant",
    model: openai("gpt-4o-mini"),
    memory: new Memory({
      storage: new ManagedMemoryAdapter({
        databaseName: "production-memory",
      }),
    }),
  });

  // Use like any other agent - memory is automatically persisted
  const result = await agent.generateText("Hello!", {
    userId: "user-123",
    conversationId: "conv-456",
  });
  ```

  ### Manual Setup

  Pass a `VoltOpsClient` instance explicitly:

  ```typescript
  import { Agent, Memory, VoltOpsClient } from "@voltagent/core";
  import { ManagedMemoryAdapter } from "@voltagent/voltagent-memory";
  import { openai } from "@ai-sdk/openai";

  const voltOpsClient = new VoltOpsClient({
    publicKey: process.env.VOLTAGENT_PUBLIC_KEY!,
    secretKey: process.env.VOLTAGENT_SECRET_KEY!,
  });

  const agent = new Agent({
    name: "Assistant",
    instructions: "You are a helpful assistant",
    model: openai("gpt-4o-mini"),
    memory: new Memory({
      storage: new ManagedMemoryAdapter({
        databaseName: "production-memory",
        voltOpsClient, // explicit client
      }),
    }),
  });
  ```

  ### Vector Storage (Optional)

  Enable semantic search with `ManagedMemoryVectorAdapter`:

  ```typescript
  import { ManagedMemoryAdapter, ManagedMemoryVectorAdapter } from "@voltagent/voltagent-memory";
  import { AiSdkEmbeddingAdapter, Memory } from "@voltagent/core";
  import { openai } from "@ai-sdk/openai";

  const memory = new Memory({
    storage: new ManagedMemoryAdapter({
      databaseName: "production-memory",
    }),
    embedding: new AiSdkEmbeddingAdapter(openai.embedding("text-embedding-3-small")),
    vector: new ManagedMemoryVectorAdapter({
      databaseName: "production-memory",
    }),
  });
  ```

  ## Key Features
  - **Zero Infrastructure**: No need to provision or manage databases
  - **Quick Setup**: Create a managed memory database in under 3 minutes from VoltOps Console
  - **Framework Parity**: Works identically to local Postgres, LibSQL, or Supabase adapters
  - **Production Ready**: Managed infrastructure with reliability guardrails
  - **Multi-Region**: Available in US (Virginia) and EU (Germany)

  ## Getting Started
  1. **Install the package**:

  ```bash
  npm install @voltagent/voltagent-memory
  # or
  pnpm add @voltagent/voltagent-memory
  ```

  2. **Create a managed database**:
     - Navigate to [console.voltagent.dev/memory/managed-memory](https://console.voltagent.dev/memory/managed-memory)
     - Click **Create Database**
     - Enter a name and select region (US or EU)
     - Copy your VoltOps API keys from Settings
  3. **Configure environment variables**:

  ```bash
  VOLTAGENT_PUBLIC_KEY=pk_...
  VOLTAGENT_SECRET_KEY=sk_...
  ```

  4. **Use the adapter**:

  ```typescript
  import { ManagedMemoryAdapter } from "@voltagent/voltagent-memory";
  import { Memory } from "@voltagent/core";

  const memory = new Memory({
    storage: new ManagedMemoryAdapter({
      databaseName: "your-database-name",
    }),
  });
  ```

  ## Why This Matters
  - **Faster Prototyping**: Launch pilots without database setup
  - **Reduced Complexity**: No infrastructure management overhead
  - **Consistent Experience**: Same StorageAdapter interface across all memory providers
  - **Scalable Path**: Start with managed memory, migrate to self-hosted when needed
  - **Multi-Region Support**: Deploy close to your users in US or EU

  ## Migration Notes

  Existing agents using local storage adapters (InMemory, LibSQL, Postgres, Supabase) continue to work unchanged. Managed memory is an optional addition that provides a cloud-hosted alternative for teams who prefer not to manage their own database infrastructure.

- [#637](https://github.com/VoltAgent/voltagent/pull/637) [`b7ee693`](https://github.com/VoltAgent/voltagent/commit/b7ee6936280b5d09b893db6500ad58b4ac80eaf2) Thanks [@marinoska](https://github.com/marinoska)! - - Introduced tests and documentation for the `ToolDeniedError`.
  - Added a feature to terminate the process flow when the `onToolStart` hook triggers a `ToolDeniedError`.
  - Enhanced error handling mechanisms to ensure proper flow termination in specific error scenarios.

## 1.1.23

### Patch Changes

- [#632](https://github.com/VoltAgent/voltagent/pull/632) [`9bd1cf5`](https://github.com/VoltAgent/voltagent/commit/9bd1cf5ab0b0ff54f2bc301a40a486b36d76c3f4) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: ensure agents expose their default in-memory storage so observability APIs can read it
  fix: keep tool call inputs intact when persisted so VoltOps observability shows them instead of empty payloads

## 1.1.22

### Patch Changes

- [#629](https://github.com/VoltAgent/voltagent/pull/629) [`3e64b9c`](https://github.com/VoltAgent/voltagent/commit/3e64b9ce58d0e91bc272f491be2c1932a005ef48) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add memory observability

## 1.1.21

### Patch Changes

- [#625](https://github.com/VoltAgent/voltagent/pull/625) [`ec76c47`](https://github.com/VoltAgent/voltagent/commit/ec76c47a9533fd4bcf9ffd22153e3d99248f00fa) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add `onPrepareModelMessages` hook
  - ensure `onPrepareMessages` now receives the sanitized UI payload while exposing `rawMessages` for audit or metadata recovery without sending it to the LLM.
  - introduce `onPrepareModelMessages` so developers can tweak the final provider-facing message array (e.g. add guardrails, adapt to provider quirks) after conversion.

  ```ts
  const hooks = createHooks({
    onPrepareMessages: ({ messages, rawMessages }) => ({
      messages: messages.map((msg) =>
        messageHelpers.addTimestampToMessage(msg, new Date().toISOString())
      ),
      rawMessages, // still available for logging/analytics
    }),
    onPrepareModelMessages: ({ modelMessages }) => ({
      modelMessages: modelMessages.map((message, idx) =>
        idx === modelMessages.length - 1 && message.role === "assistant"
          ? {
              ...message,
              content: [
                ...message.content,
                { type: "text", text: "Please keep the summary under 200 words." },
              ],
            }
          : message
      ),
    }),
  });
  ```

- [#625](https://github.com/VoltAgent/voltagent/pull/625) [`ec76c47`](https://github.com/VoltAgent/voltagent/commit/ec76c47a9533fd4bcf9ffd22153e3d99248f00fa) Thanks [@omeraplak](https://github.com/omeraplak)! - - preserve Anthropic-compatible providerOptions on system messages - #593

  ```ts
  const agent = new Agent({
    name: "Cacheable System",
    model: anthropic("claude-3-7-sonnet-20250219"),
    instructions: {
      type: "chat",
      messages: [
        {
          role: "system",
          content: "remember to use cached context",
          providerOptions: {
            anthropic: { cacheControl: { type: "ephemeral", ttl: "5m" } },
          },
        },
      ],
    },
  });

  await agent.generateText("ping"); // providerOptions now flow through unchanged
  ```

- [#623](https://github.com/VoltAgent/voltagent/pull/623) [`0d91d90`](https://github.com/VoltAgent/voltagent/commit/0d91d9081381a6c259188209cd708293271e5e3e) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: allow constructing `VoltAgent` without passing an `agents` map so workflows-only setups boot without boilerplate.

## 1.1.20

### Patch Changes

- [#621](https://github.com/VoltAgent/voltagent/pull/621) [`f4fa7e2`](https://github.com/VoltAgent/voltagent/commit/f4fa7e297fec2f602c9a24a0c77e645aa971f2b9) Thanks [@omeraplak](https://github.com/omeraplak)! - ## @voltagent/core
  - Folded the serverless runtime entry point into the main build – importing `@voltagent/core` now auto-detects the runtime and provisions either the Node or serverless observability pipeline.
  - Rebuilt serverless observability on top of `BasicTracerProvider`, fetch-based OTLP exporters, and an execution-context `waitUntil` hook. Exports run with exponential backoff, never block the response, and automatically reuse VoltOps credentials (or fall back to the in-memory span/log store) so VoltOps Console transparently swaps to HTTP polling when WebSockets are unavailable.
  - Hardened the runtime utilities for Workers/Functions: added universal `randomUUID`, base64, and event-emitter helpers, and taught the default logger to emit OpenTelemetry logs without relying on Node globals. This removes the last Node-only dependencies from the serverless bundle.

  ```ts
  import { Agent, VoltAgent } from "@voltagent/core";
  import { serverlessHono } from "@voltagent/serverless-hono";
  import { openai } from "@ai-sdk/openai";

  import { weatherTool } from "./tools";

  const assistant = new Agent({
    name: "serverless-assistant",
    instructions: "You are a helpful assistant.",
    model: openai("gpt-4o-mini"),
  });

  const voltAgent = new VoltAgent({
    agents: { assistant },
    serverless: serverlessHono(),
  });

  export default voltAgent.serverless().toCloudflareWorker();
  ```

  ## @voltagent/serverless-hono
  - Renamed the edge provider to **serverless** and upgraded it to power any fetch-based runtime (Cloudflare Workers, Vercel Edge Functions, Deno Deploy, Netlify Functions).
  - Wrapped the Cloudflare adapter in a first-class `HonoServerlessProvider` that installs a scoped `waitUntil` bridge, reuses the shared routing layer, and exposes a `/ws` health stub so VoltOps Console can cleanly fall back to polling.
  - Dropped the manual environment merge – Workers should now enable the `nodejs_compat_populate_process_env` flag (documented in the new deployment guide) instead of calling `mergeProcessEnv` themselves.

  ## @voltagent/server-core
  - Reworked the observability handlers around the shared storage API, including a new `POST /setup-observability` helper that writes VoltOps keys into `.env` and expanded trace/log queries that match the serverless storage contract.

  ## @voltagent/cli
  - Added `volt deploy --target <cloudflare|vercel|netlify>` to scaffold the right config files. The Cloudflare template now ships with the required compatibility flags (`nodejs_compat`, `nodejs_compat_populate_process_env`, `no_handle_cross_request_promise_resolution`) so new projects run on Workers without extra tweaking.

- [#620](https://github.com/VoltAgent/voltagent/pull/620) [`415cc82`](https://github.com/VoltAgent/voltagent/commit/415cc822938e5cc1e925438ad21e88f4295984c1) Thanks [@marinoska](https://github.com/marinoska)! - Workflows can be streamed directly into `useChat` by converting raw events
  (`workflow-start`, `workflow-complete`, etc.) into `data-*` UI messages via
  `toUIMessageStreamResponse`.

  Related to #589

## 1.1.19

### Patch Changes

- [#617](https://github.com/VoltAgent/voltagent/pull/617) [`02a78af`](https://github.com/VoltAgent/voltagent/commit/02a78afed1870fe00968a60f44db912df7fbabe6) Thanks [@omeraplak](https://github.com/omeraplak)! - - preserve raw UI messages in storage, sanitize only before LLM invocation

## 1.1.18

### Patch Changes

- [`8a99f4f`](https://github.com/VoltAgent/voltagent/commit/8a99f4fb9365da3b80a0d4e5b6df4bd50ac19288) Thanks [@omeraplak](https://github.com/omeraplak)! - - refine message normalization and persistence pipeline
  - rely on AI SDK reasoning metadata directly
  - drop synthetic tool-result injection and trust AI SDK stream output

- [`bbd6c17`](https://github.com/VoltAgent/voltagent/commit/bbd6c176b2bed532a4f03b5f8f7011806aa746c2) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: reasoning parts - #614

## 1.1.17

### Patch Changes

- [`78b2298`](https://github.com/VoltAgent/voltagent/commit/78b2298c561e86bbef61f783b0fee83667c25d8a) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: `tool_use` ids were found without `tool_result` blocks immediately after

## 1.1.16

### Patch Changes

- [#609](https://github.com/VoltAgent/voltagent/pull/609) [`942663f`](https://github.com/VoltAgent/voltagent/commit/942663f74dca0df70cdac323102acb18c050fa65) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add workflow cancellation support, including cancellation metadata, default controller updates, and a new API endpoint for cancelling executions - #608

  ## Usage Example

  ```ts
  import { createSuspendController } from "@voltagent/core";

  const controller = createSuspendController();
  const stream = workflow.stream(input, { suspendController: controller });

  // Cancel from application code
  controller.cancel("User stopped the workflow");

  // Or via HTTP
  await fetch(`/api/workflows/${workflowId}/executions/${executionId}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason: "User stopped the workflow" }),
  });
  ```

## 1.1.15

### Patch Changes

- [#602](https://github.com/VoltAgent/voltagent/pull/602) [`14932b6`](https://github.com/VoltAgent/voltagent/commit/14932b69cce36abefcea2200e912bc2614216e1f) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: only process VoltAgent spans by default and expose spanFilters config

## 1.1.14

### Patch Changes

- [#598](https://github.com/VoltAgent/voltagent/pull/598) [`783d334`](https://github.com/VoltAgent/voltagent/commit/783d334a1d9252eb227ef2e1d69d3e939765a13f) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: resolve workflow stream text-delta empty output and improve type safety

  ## The Problem

  When forwarding agent.streamText() results to workflow streams via writer.pipeFrom(), text-delta events had empty output fields. This was caused by incorrect field mapping - the code was accessing `part.textDelta` but AI SDK v5 uses `part.text` for text-delta events.

  ## The Solution

  Fixed field mappings to match AI SDK v5 conventions:
  - text-delta: `textDelta` → `text`
  - tool-call: `args` → `input`
  - tool-result: `result` → `output`
  - finish: `usage` → `totalUsage`

  Also improved type safety by:
  - Using `VoltAgentTextStreamPart` type instead of `any` for fullStream parameter
  - Proper type guards with `in` operator to check field existence
  - Eliminated need for `as any` casts

  ## Impact
  - Fixes "output field is undefined" for text-delta events in workflow streams
  - Provides proper TypeScript type checking for stream parts
  - Ensures compatibility with AI SDK v5 field conventions
  - Better IDE support and compile-time error detection

- [#600](https://github.com/VoltAgent/voltagent/pull/600) [`31ded11`](https://github.com/VoltAgent/voltagent/commit/31ded113253dd73c28a797f185b2ea0595160cf7) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: add missing export `MCPConfiguration`

## 1.1.13

### Patch Changes

- [#596](https://github.com/VoltAgent/voltagent/pull/596) [`355836b`](https://github.com/VoltAgent/voltagent/commit/355836b39a6d1ba36c5cfac82008cab3281703e7) Thanks [@omeraplak](https://github.com/omeraplak)! - - add `@voltagent/a2a-server`, a JSON-RPC Agent-to-Agent (A2A) server that lets external agents call your VoltAgent instance over HTTP/SSE
  - teach `@voltagent/core`, `@voltagent/server-core`, and `@voltagent/server-hono` to auto-register configured A2A servers so adding `{ a2aServers: { ... } }` on `VoltAgent` and opting into `honoServer` instantly exposes discovery and RPC endpoints
  - forward request context (`userId`, `sessionId`, metadata) into agent invocations and provide task management hooks, plus allow filtering/augmenting exposed agents by default
  - document the setup in `website/docs/agents/a2a/a2a-server.md` and refresh `examples/with-a2a-server` with basic usage and task-store customization
  - A2A endpoints are now described in Swagger/OpenAPI and listed in the startup banner whenever an A2A server is registered, making discovery of `/.well-known/...` and `/a2a/:serverId` routes trivial.

  **Getting started**

  ```ts
  import { Agent, VoltAgent } from "@voltagent/core";
  import { A2AServer } from "@voltagent/a2a-server";
  import { honoServer } from "@voltagent/server-hono";

  const assistant = new Agent({
    name: "SupportAgent",
    purpose: "Handle support questions from partner agents.",
    model: myModel,
  });

  const a2aServer = new A2AServer({
    name: "support-agent",
    version: "0.1.0",
  });

  export const voltAgent = new VoltAgent({
    agents: { assistant },
    a2aServers: { a2aServer },
    server: honoServer({ port: 3141 }),
  });
  ```

- [#596](https://github.com/VoltAgent/voltagent/pull/596) [`355836b`](https://github.com/VoltAgent/voltagent/commit/355836b39a6d1ba36c5cfac82008cab3281703e7) Thanks [@omeraplak](https://github.com/omeraplak)! - ## ✨ New: first-class Model Context Protocol support

  We shipped a complete MCP integration stack:
  - `@voltagent/mcp-server` exposes VoltAgent registries (agents, workflows, tools) over stdio/HTTP/SSE transports.
  - `@voltagent/server-core` and `@voltagent/server-hono` gained ready-made route handlers so HTTP servers can proxy MCP traffic with a few lines of glue code.
  - `@voltagent/core` exports the shared types that the MCP layers rely on.

  ### Quick start

  ```ts title="src/mcp/server.ts"
  import { MCPServer } from "@voltagent/mcp-server";
  import { Agent, createTool } from "@voltagent/core";
  import { openai } from "@ai-sdk/openai";
  import { z } from "zod";

  const status = createTool({
    name: "status",
    description: "Return the current time",
    parameters: z.object({}),
    async execute() {
      return { status: "ok", time: new Date().toISOString() };
    },
  });

  const assistant = new Agent({
    name: "Support Agent",
    instructions: "Route customer tickets to the correct queue.",
    model: openai("gpt-4o-mini"),
    tools: [status],
  });

  export const mcpServer = new MCPServer({
    name: "voltagent-example",
    version: "0.1.0",
    description: "Expose VoltAgent over MCP",
    agents: { support: assistant },
    tools: { status },
    filterTools: ({ items }) => items.filter((tool) => tool.name !== "debug"),
  });
  ```

  With the server registered on your VoltAgent instance (and the Hono MCP routes enabled), the same agents, workflows, and tools become discoverable from VoltOps Console or any MCP-compatible IDE.

- [#596](https://github.com/VoltAgent/voltagent/pull/596) [`355836b`](https://github.com/VoltAgent/voltagent/commit/355836b39a6d1ba36c5cfac82008cab3281703e7) Thanks [@omeraplak](https://github.com/omeraplak)! - - Ship `@voltagent/mcp-server`, a transport-agnostic MCP provider that surfaces VoltAgent agents, workflows, tools, prompts, and resources over stdio, SSE, and HTTP.
  - Wire MCP registration through `@voltagent/core`, `@voltagent/server-core`, and `@voltagent/server-hono` so a single `VoltAgent` constructor opt-in (optionally with `honoServer`) exposes stdio mode immediately and HTTP/SSE endpoints when desired.
  - Filter child sub-agents automatically and lift an agent's `purpose` (fallback to `instructions`) into the MCP tool description for cleaner IDE listings out of the box.
  - Document the workflow in `website/docs/agents/mcp/mcp-server.md` and refresh `examples/with-mcp-server` with stdio-only and HTTP/SSE configurations.
  - When MCP is enabled we now publish REST endpoints in Swagger/OpenAPI and echo them in the startup banner so you can discover `/mcp/*` routes without digging through code.

  **Getting started**

  ```ts
  import { Agent, VoltAgent } from "@voltagent/core";
  import { MCPServer } from "@voltagent/mcp-server";
  import { honoServer } from "@voltagent/server-hono";

  const assistant = new Agent({
    name: "AssistantAgent",
    purpose: "Respond to support questions and invoke helper tools when needed.",
    model: myModel,
  });

  const mcpServer = new MCPServer({
    name: "support-mcp",
    version: "1.0.0",
    agents: { assistant },
    protocols: { stdio: true, http: false, sse: false },
  });

  export const voltAgent = new VoltAgent({
    agents: { assistant },
    mcpServers: { primary: mcpServer },
    server: honoServer({ port: 3141 }), // flip http/sse to true when you need remote clients
  });
  ```

- Updated dependencies [[`355836b`](https://github.com/VoltAgent/voltagent/commit/355836b39a6d1ba36c5cfac82008cab3281703e7), [`355836b`](https://github.com/VoltAgent/voltagent/commit/355836b39a6d1ba36c5cfac82008cab3281703e7)]:
  - @voltagent/internal@0.0.11

## 1.1.12

### Patch Changes

- [#590](https://github.com/VoltAgent/voltagent/pull/590) [`4292460`](https://github.com/VoltAgent/voltagent/commit/42924609b3fc72c918addba050d6f85e8e8712d8) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: resolve Zod v4 compatibility issue in delegate_task tool schema

  Fixed a compatibility issue where `z.record(z.unknown())` in the delegate_task tool's context parameter was causing JSON schema generation errors with Zod v4. Changed to `z.record(z.string(), z.any())` which works correctly with both Zod v3 and v4.

  The error occurred when using the MCP server or other components that convert Zod schemas to JSON schemas:

  ```
  TypeError: Cannot read properties of undefined (reading '_zod')
  ```

  This fix ensures the delegate_task tool works seamlessly across all Zod versions supported by the framework (^3.25.0 || ^4.0.0).

## 1.1.11

### Patch Changes

- [#584](https://github.com/VoltAgent/voltagent/pull/584) [`00838b0`](https://github.com/VoltAgent/voltagent/commit/00838b0f4f75f03fad606589a6159121be0b40ba) Thanks [@omeraplak](https://github.com/omeraplak)! - refactor: add ConversationBuffer + MemoryPersistQueue so tool calls, results, and assistant text persist as a single step and flush on errors

## 1.1.10

### Patch Changes

- [`103c48c`](https://github.com/VoltAgent/voltagent/commit/103c48cb197e23fdedf61a4804f1a50c4ccdc655) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: resolve UIMessage tool persistence issue causing OpenAI API errors and useChat display problems

  Fixed a critical issue where tool messages weren't being properly converted between UIMessage and ModelMessage formats, causing two problems:
  1. OpenAI API rejecting requests with "An assistant message with 'tool_calls' must be followed by tool messages"
  2. useChat hook showing tools as "working/running" despite having `state: "output-available"`

  ## The Problem

  When converting tool messages to UIMessages for persistence:
  - Tool role messages were incorrectly having `providerExecuted: false` set
  - This caused AI SDK's `convertToModelMessages` to misinterpret client-executed tools
  - The conversion logic was not properly preserving the tool execution context

  ## The Solution
  - Removed explicit `providerExecuted` assignments for tool role messages
  - Tool role messages now correctly indicate client execution by omitting the flag
  - Removed unnecessary `step-start` insertions that were added during message conversion
  - Now exactly mimics AI SDK's UIMessage generation behavior

  ## Technical Details

  The `providerExecuted` flag determines how tools are converted:
  - `providerExecuted: true` → tool results embedded in assistant message (provider-executed)
  - `providerExecuted: undefined/false` → separate tool role messages (client-executed)

  By not setting this flag for tool role messages, the AI SDK correctly:
  1. Generates required tool messages after tool_calls (fixes OpenAI API error)
  2. Recognizes tools as completed rather than "working" (fixes useChat display)

## 1.1.9

### Patch Changes

- [#577](https://github.com/VoltAgent/voltagent/pull/577) [`749bbdf`](https://github.com/VoltAgent/voltagent/commit/749bbdfc12a42242ebc3b93e0fea5b439e5b84bf) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: resolve subagent tool call/result pairing issue with Claude/Bedrock

  Fixed a critical issue where subagents performing tool calls would break the conversation flow with Claude/Bedrock models. The error "tool_use ids were found without tool_result blocks" occurred because the tool result messages were not being properly included when converting subagent responses to UI message streams.

  ## The Problem

  When a subagent executed a tool call, the parent agent would receive incomplete message history:
  - Direct agents: Called `toUIMessageStream` with `sendStart: false` and `originalMessages`, which only included the initial task message
  - StreamText configs: Called `toUIMessageStream` without any parameters
  - Both approaches failed to include the complete tool call/result sequence

  ## The Solution
  - Removed explicit parameters from `toUIMessageStream` calls in both direct agent and streamText configuration paths
  - Let the AI SDK handle the default behavior for proper message inclusion
  - This ensures tool_use and tool_result messages remain properly paired in the conversation

  ## Impact
  - Fixes "No output generated" errors when subagents use tools
  - Resolves conversation breakage after subagent tool calls
  - Maintains proper message history for Claude/Bedrock compatibility
  - No breaking changes - the fix simplifies the internal implementation

## 1.1.8

### Patch Changes

- [#573](https://github.com/VoltAgent/voltagent/pull/573) [`51cc774`](https://github.com/VoltAgent/voltagent/commit/51cc774445e5c4e676563b5576868ad45d8ecb9c) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: improve subagent tracing hierarchy and entity filtering

  ## What Changed

  Fixed OpenTelemetry span hierarchy issues where subagent spans were overriding parent delegate_task spans instead of being properly nested as children. Also resolved entity ID filtering returning incorrect traces for subagent queries.

  ## The Problem

  When a supervisor agent delegated tasks to subagents:
  1. **Span Hierarchy**: Subagent spans appeared to replace delegate_task spans instead of being children
  2. **Entity Filtering**: Querying by subagent entity ID (e.g., `entityId=Formatter`) incorrectly returned traces that should only be associated with the root agent (e.g., `entityId=Supervisor`)

  ## The Solution

  Implemented namespace-based attribute management in trace-context:
  - **Root agents** use `entity.id`, `entity.type`, `entity.name` attributes
  - **Subagents** use `subagent.id`, `subagent.name`, `subagent.type` namespace
  - **Subagents inherit** parent's `entity.id` for correct trace association
  - **Span naming** clearly identifies subagents with `subagent:AgentName` prefix

  ## Example

  ```typescript
  // Before: Incorrect hierarchy and filtering
  // delegate_task span seemed to disappear
  // entityId=Formatter returned Supervisor's traces

  // After: Proper hierarchy and filtering
  const supervisor = new Agent({
    name: "Supervisor",
    subAgents: [formatter, writer],
  });

  // Trace structure now shows:
  // - Supervisor (root span)
  //   - delegate_task: Formatter (tool span)
  //     - subagent:Formatter (subagent span with proper parent)
  //       - (formatter's tools and operations)

  // Filtering works correctly:
  // entityId=Supervisor ✓ Returns supervisor traces
  // entityId=Formatter ✗ Returns no traces (correct - Formatter is a subagent)
  ```

  ## Impact
  - Proper parent-child relationships in span hierarchy
  - Correct trace filtering by entity ID
  - Clear distinction between root agents and subagents in observability data
  - Better debugging experience with properly nested spans

## 1.1.7

### Patch Changes

- [#571](https://github.com/VoltAgent/voltagent/pull/571) [`b801a8d`](https://github.com/VoltAgent/voltagent/commit/b801a8da47da5cad15b8637635f83acab5e0d6fc) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add Zod v4 support (backwards-compatible with v3)

  What’s new
  - Core + server now support `zod` v4 while keeping v3 working.
  - Peer ranges expanded to `"zod": "^3.25.0 || ^4.0.0"`.
  - JSON Schema → Zod conversion handles both versions:
    - Uses `zod-from-json-schema@^0.5.0` when Zod v4 is detected.
    - Falls back to `zod-from-json-schema@^0.0.5` via alias `zod-from-json-schema-v3` for Zod v3.
  - Implemented in MCP client (core) and object handlers (server-core).

  Why
  - Zod v4 introduces changes that require a version-aware conversion path. This update adds seamless compatibility for both major versions.

  Impact
  - No breaking changes. Projects on Zod v3 continue to work unchanged. Projects can upgrade to Zod v4 without code changes.

  Notes
  - If your bundler disallows npm aliasing, ensure it can resolve `zod-from-json-schema-v3` (alias to `zod-from-json-schema@^0.0.5`).

## 1.1.7-next.1

### Patch Changes

- [`78a5046`](https://github.com/VoltAgent/voltagent/commit/78a5046ca4d768a96650ebee63ae1630b0dff7a7) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add Zod v4 support (backwards-compatible with v3)

  What’s new
  - Core + server now support `zod` v4 while keeping v3 working.
  - Peer ranges expanded to `"zod": "^3.25.0 || ^4.0.0"`.
  - JSON Schema → Zod conversion handles both versions:
    - Uses `zod-from-json-schema@^0.5.0` when Zod v4 is detected.
    - Falls back to `zod-from-json-schema@^0.0.5` via alias `zod-from-json-schema-v3` for Zod v3.
  - Implemented in MCP client (core) and object handlers (server-core).

  Why
  - Zod v4 introduces changes that require a version-aware conversion path. This update adds seamless compatibility for both major versions.

  Impact
  - No breaking changes. Projects on Zod v3 continue to work unchanged. Projects can upgrade to Zod v4 without code changes.

  Notes
  - If your bundler disallows npm aliasing, ensure it can resolve `zod-from-json-schema-v3` (alias to `zod-from-json-schema@^0.0.5`).

## 1.1.7-next.0

### Patch Changes

- [#551](https://github.com/VoltAgent/voltagent/pull/551) [`77a3f64`](https://github.com/VoltAgent/voltagent/commit/77a3f64dea6e8a06fbbd72878711efa9ceb90bc3) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add Zod v4 support (backwards-compatible with v3)

  What’s new
  - Core + server now support `zod` v4 while keeping v3 working.
  - Peer ranges expanded to `"zod": "^3.25.0 || ^4.0.0"`.
  - JSON Schema → Zod conversion handles both versions:
    - Uses `zod-from-json-schema@^0.5.0` when Zod v4 is detected.
    - Falls back to `zod-from-json-schema@^0.0.5` via alias `zod-from-json-schema-v3` for Zod v3.
  - Implemented in MCP client (core) and object handlers (server-core).

  Why
  - Zod v4 introduces changes that require a version-aware conversion path. This update adds seamless compatibility for both major versions.

  Impact
  - No breaking changes. Projects on Zod v3 continue to work unchanged. Projects can upgrade to Zod v4 without code changes.

  Notes
  - If your bundler disallows npm aliasing, ensure it can resolve `zod-from-json-schema-v3` (alias to `zod-from-json-schema@^0.0.5`).

## 1.1.6

### Patch Changes

- [#565](https://github.com/VoltAgent/voltagent/pull/565) [`b14d953`](https://github.com/VoltAgent/voltagent/commit/b14d95345f0bce653931ff27e5dac59e4750c123) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add experimental_output support for structured generation - #428

  ## What Changed for You

  VoltAgent now supports ai-sdk v5's experimental structured output features! You can now generate type-safe structured data directly from your agents using Zod schemas.

  ## Features Added
  - **`experimental_output`** for `generateText` - Get fully typed structured output
  - **`experimental_partialOutputStream`** for `streamText` - Stream partial objects as they're being generated

  ## Using Structured Output with `generateText`

  ```typescript
  import { Agent } from "@voltagent/core";
  import { Output } from "ai";
  import { z } from "zod";

  // Define your schema
  const RecipeSchema = z.object({
    name: z.string(),
    ingredients: z.array(z.string()),
    instructions: z.array(z.string()),
    prepTime: z.number(),
    cookTime: z.number(),
  });

  // Generate structured output
  const result = await agent.generateText("Create a pasta recipe", {
    experimental_output: Output.object({
      schema: RecipeSchema,
    }),
  });

  // Access the typed object directly!
  console.log(result.experimental_output);
  // {
  //   name: "Creamy Garlic Pasta",
  //   ingredients: ["pasta", "garlic", "cream", ...],
  //   instructions: ["Boil water", "Cook pasta", ...],
  //   prepTime: 10,
  //   cookTime: 15
  // }
  ```

  ## Streaming Partial Objects with `streamText`

  ```typescript
  // Stream partial objects as they're generated
  const stream = await agent.streamText("Create a detailed recipe", {
    experimental_output: Output.object({
      schema: RecipeSchema,
    }),
  });

  // Access the partial object stream
  for await (const partial of stream.experimental_partialOutputStream ?? []) {
    console.log(partial);
    // Partial objects that build up over time:
    // { name: "Creamy..." }
    // { name: "Creamy Garlic Pasta", ingredients: ["pasta"] }
    // { name: "Creamy Garlic Pasta", ingredients: ["pasta", "garlic"] }
    // ... until the full object is complete
  }
  ```

  ## Text Mode for Constrained Output

  You can also use `Output.text()` for text generation with specific constraints:

  ```typescript
  const result = await agent.generateText("Write a haiku", {
    experimental_output: Output.text({
      maxLength: 100,
      description: "A traditional haiku poem",
    }),
  });

  console.log(result.experimental_output); // The generated haiku text
  ```

  ## Important Notes
  - These are **experimental features** from ai-sdk v5 and may change
  - TypeScript may show `experimental_output` as `any` due to type inference limitations
  - `generateText` returns the complete structured output in `experimental_output`
  - `streamText` provides partial objects via `experimental_partialOutputStream`
  - Both features require importing `Output` from `@voltagent/core` (re-exported from ai-sdk)

  ## Why This Matters
  - **Type-safe output** - No more parsing JSON strings and hoping for the best
  - **Real-time streaming** - See structured data build up as it's generated
  - **Zod validation** - Automatic validation against your schemas
  - **Better DX** - Work with typed objects instead of unstructured text

## 1.1.5

### Patch Changes

- [#562](https://github.com/VoltAgent/voltagent/pull/562) [`2886b7a`](https://github.com/VoltAgent/voltagent/commit/2886b7aab5bda296cebc0b8b2bd56d684324d799) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: using `safeStringify` instead of `JSON.stringify`

- [#561](https://github.com/VoltAgent/voltagent/pull/561) [`ca6a8ec`](https://github.com/VoltAgent/voltagent/commit/ca6a8ec9e45de4c262864e8819f45b1a83679592) Thanks [@zrosenbauer](https://github.com/zrosenbauer)! - chore: updated the underlying AgentError creation and types for improved upstream types & internal usage

## 1.1.4

### Patch Changes

- [#559](https://github.com/VoltAgent/voltagent/pull/559) [`134bf9a`](https://github.com/VoltAgent/voltagent/commit/134bf9a2978f0b069f842910fb4fb3e969f70390) Thanks [@zrosenbauer](https://github.com/zrosenbauer)! - fix: add deps that the core types rely on, i.e. `type-fest` or they are not installed by default by package managers

- [`a0d9e84`](https://github.com/VoltAgent/voltagent/commit/a0d9e8404fe3e2cebfc146cd4622b607bd16b462) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: @voltagent/logger dependency version

- Updated dependencies [[`134bf9a`](https://github.com/VoltAgent/voltagent/commit/134bf9a2978f0b069f842910fb4fb3e969f70390)]:
  - @voltagent/internal@0.0.10

## 1.1.3

### Patch Changes

- [#557](https://github.com/VoltAgent/voltagent/pull/557) [`4c2919e`](https://github.com/VoltAgent/voltagent/commit/4c2919e9d531681d72586505174ff3d688666e2b) Thanks [@omeraplak](https://github.com/omeraplak)! - fix(core): preserve context Map instance across operations and subagents

  ## What Changed
  - Reuse the same `context` Map instance instead of cloning it on every call.
  - `createOperationContext` no longer creates a fresh `new Map(...)` for user or parent context; it reuses the incoming Map to keep state alive.
  - All results now expose the same context reference:
    - `generateText`, `streamText`, `generateObject`, `streamObject` return `{ context: oc.context }` instead of `new Map(oc.context)`.
  - Subagents invoked via `delegate_task` receive and update the same shared context through `parentOperationContext`.

  ## Merge Precedence (no overwrites of parent)

  `parentOperationContext.context` > `options.context` > agent default context. Only missing keys are filled from lower-precedence sources; parent context values are not overridden.

  ## Why

  Previously, context was effectively reset by cloning on each call, which broke continuity and sharing across subagents. This fix ensures a single source of truth for context throughout an operation chain.

  ## Potential Impact
  - If you relied on context being cloned (new Map identity per call), note that the instance is now shared. For isolation, pass `new Map(existingContext)` yourself when needed.

  ## Affected Files
  - `packages/core/src/agent/agent.ts` (createOperationContext; return shapes for generate/stream methods)

## 1.1.2

### Patch Changes

- [#556](https://github.com/VoltAgent/voltagent/pull/556) [`3d3deb9`](https://github.com/VoltAgent/voltagent/commit/3d3deb98379066072392f29d08b43b431c0d3b9b) Thanks [@omeraplak](https://github.com/omeraplak)! - feat(core): semantic memory defaults and retrieval fixes

  ## Summary
  - Default `semanticMemory.mergeStrategy` is now `"append"` (previously `"prepend"`).
  - Default `semanticMemory.semanticThreshold` is `0.7`.
  - Fix: propagate `semanticMemory` options end‑to‑end (Agent → MemoryManager → Memory).
  - Fix: preserve vector result order when mapping `messageIds` → `UIMessage`.
  - Docs: updated Semantic Search/Overview to reflect new defaults.
  - Examples: long conversation demo with optional real LLM seeding.

  ## Why

  Appending semantic hits after the recent context reduces stale facts overriding recent ones (e.g., old name "Ömer" overshadowing newer "Ahmet"). Preserving vector result order ensures the most relevant semantic hits remain in ranked order.

  ## Defaults

  When `userId` + `conversationId` are provided and vectors are configured:
  - `enabled: true`
  - `semanticLimit: 5`
  - `semanticThreshold: 0.7`
  - `mergeStrategy: "append"`

  ## Migration Notes

  If you relied on the previous default `mergeStrategy: "prepend"`, explicitly set:

  ```ts
  await agent.generateText(input, {
    userId,
    conversationId,
    semanticMemory: { mergeStrategy: "prepend" },
  });
  ```

  Otherwise, no action is required.

- [`9b08cff`](https://github.com/VoltAgent/voltagent/commit/9b08cff97c2e8616807a12e89bdbd3dceaf66d33) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: node:crypto import issue on workflow

## 1.1.1

### Patch Changes

- [#552](https://github.com/VoltAgent/voltagent/pull/552) [`89f3f37`](https://github.com/VoltAgent/voltagent/commit/89f3f373a4efe97875c725a9be8374ed31c5bf40) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: improve shutdown handlers to properly stop server and clean up resources - #528

  ## What Changed

  Fixed the shutdown handler to properly stop the VoltAgent server and clean up all resources when receiving SIGINT/SIGTERM signals. This ensures the process can exit cleanly when multiple signal handlers exist from other frameworks.

  ## The Problem (Before)

  When multiple SIGINT/SIGTERM handlers existed (from frameworks like Adonis, NestJS, etc.), the VoltAgent server would remain open after shutdown, preventing the process from exiting cleanly. The previous fix only addressed the `process.exit()` issue but didn't actually stop the server.

  ## The Solution (After)
  - **Server Cleanup**: The shutdown handler now properly stops the server using `stopServer()`
  - **Telemetry Shutdown**: Added telemetry/observability shutdown for complete cleanup
  - **Public API**: Added a new `shutdown()` method for programmatic cleanup
  - **Resource Order**: Resources are cleaned up in the correct order: server → workflows → telemetry
  - **Framework Compatibility**: Still respects other frameworks' handlers using `isSoleSignalHandler` check

  ## Usage

  ```typescript
  // Programmatic shutdown (new)
  const voltAgent = new VoltAgent({ agents, server });
  await voltAgent.shutdown(); // Cleanly stops server, workflows, and telemetry

  // Automatic cleanup on SIGINT/SIGTERM still works
  // Server is now properly stopped, allowing the process to exit
  ```

  This ensures VoltAgent plays nicely with other frameworks while properly cleaning up all resources during shutdown.

## 1.1.0

### Minor Changes

- [#549](https://github.com/VoltAgent/voltagent/pull/549) [`63d4787`](https://github.com/VoltAgent/voltagent/commit/63d4787bd92135fa2d6edffb3b610889ddc0e3f5) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: ai sdk v5 ModelMessage support across Agent + Workflow; improved image/file handling and metadata preservation.

  What's new
  - Agent I/O: `generateText`, `streamText`, `generateObject`, `streamObject` now accept `string | UIMessage[] | ModelMessage[]` (AI SDK v5) as input. No breaking changes for existing callers.
  - Conversion layer: Robust `ModelMessage → UIMessage` handling with:
    - Image support: `image` parts are mapped to UI `file` parts; URLs and `data:` URIs are preserved, raw/base64 strings become `data:<mediaType>;base64,...`.
    - File support: string data is auto-detected as URL (`http(s)://`, `data:`) or base64; binary is encoded to data URI.
    - Metadata: `providerOptions` on text/reasoning/image/file parts is preserved as `providerMetadata` on UI parts.
    - Step boundaries: Inserts `step-start` after tool results when followed by assistant text.
  - Workflow: `andAgent` step and `WorkflowInput` types now also accept `UIMessage[] | ModelMessage[]` in addition to `string`.

  Usage examples
  1. Agent with AI SDK v5 ModelMessage input (multimodal)

  ```ts
  import type { ModelMessage } from "@ai-sdk/provider-utils";

  const messages: ModelMessage[] = [
    {
      role: "user",
      content: [
        { type: "image", image: "https://example.com/cat.jpg", mediaType: "image/jpeg" },
        { type: "text", text: "What's in this picture?" },
      ],
    },
  ];

  const result = await agent.generateText(messages);
  console.log(result.text);
  ```

  2. Agent with UIMessage input

  ```ts
  import type { UIMessage } from "ai";

  const uiMessages: UIMessage[] = [
    {
      id: crypto.randomUUID(),
      role: "user",
      parts: [
        { type: "file", url: "https://example.com/cat.jpg", mediaType: "image/jpeg" },
        { type: "text", text: "What's in this picture?" },
      ],
    },
  ];

  const result = await agent.generateText(uiMessages);
  ```

  3. Provider metadata preservation (files/images)

  ```ts
  import type { ModelMessage } from "@ai-sdk/provider-utils";

  const msgs: ModelMessage[] = [
    {
      role: "assistant",
      content: [
        {
          type: "file",
          mediaType: "image/png",
          data: "https://cdn.example.com/img.png",
          providerOptions: { source: "cdn" },
        },
      ],
    },
  ];

  // Internally preserved as providerMetadata on the UI file part
  await agent.generateText(msgs);
  ```

  4. Workflow andAgent with ModelMessage[] or UIMessage[]

  ```ts
  import { z } from "zod";
  import type { ModelMessage } from "@ai-sdk/provider-utils";

  workflow
    .andAgent(
      ({ data }) =>
        [
          {
            role: "user",
            content: [{ type: "text", text: `Hello ${data.name}` }],
          },
        ] as ModelMessage[],
      agent,
      { schema: z.object({ reply: z.string() }) }
    )
    .andThen({
      id: "extract",
      execute: async ({ data }) => data.reply,
    });
  ```

  Notes
  - No breaking changes. Existing string/UIMessage inputs continue to work.
  - Multimodal inputs are passed through correctly to the model after conversion.

## 1.0.1

### Patch Changes

- [#546](https://github.com/VoltAgent/voltagent/pull/546) [`f12f344`](https://github.com/VoltAgent/voltagent/commit/f12f34405edf0fcb417ed098deba62570260fb81) Thanks [@omeraplak](https://github.com/omeraplak)! - chore: align Zod to ^3.25.76 and fix type mismatch with AI SDK

  We aligned Zod versions across packages to `^3.25.76` to match AI SDK peer ranges and avoid multiple Zod instances at runtime.

  Why this matters
  - Fixes TypeScript narrowing issues in workflows when consuming `@voltagent/core` from npm with a different Zod instance (e.g., `ai` packages pulling newer Zod).
  - Prevents errors like "Spread types may only be created from object types" where `data` failed to narrow because `z.ZodTypeAny` checks saw different Zod identities.

  What changed
  - `@voltagent/server-core`, `@voltagent/server-hono`: dependencies.zod → `^3.25.76`.
  - `@voltagent/docs-mcp`, `@voltagent/core`: devDependencies.zod → `^3.25.76`.
  - Examples and templates updated to use `^3.25.76` for consistency (non-publishable).

  Notes for consumers
  - Ensure a single Zod version is installed (consider a workspace override to pin Zod to `3.25.76`).
  - This improves compatibility with `ai@5.x` packages that require `zod@^3.25.76 || ^4`.

## 1.0.0

### Major Changes

- [`a2b492e`](https://github.com/VoltAgent/voltagent/commit/a2b492e8ed4dba96fa76862bbddf156f3a1a5c93) Thanks [@omeraplak](https://github.com/omeraplak)! - # Core 1.x — AI SDK native, Memory V2, pluggable server

  Breaking but simple to migrate. Key changes and copy‑paste examples below.

  Full migration guide: [Migration Guide](https://voltagent.dev/docs/getting-started/migration-guide/)

  ## Agent: remove `llm`, use ai‑sdk model directly

  Before (0.1.x):

  ```ts
  import { Agent } from "@voltagent/core";
  import { VercelAIProvider } from "@voltagent/vercel-ai";
  import { openai } from "@ai-sdk/openai";

  const agent = new Agent({
    name: "app",
    instructions: "Helpful",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
  });
  ```

  After (1.x):

  ```ts
  import { Agent } from "@voltagent/core";
  import { openai } from "@ai-sdk/openai";

  const agent = new Agent({
    name: "app",
    instructions: "Helpful",
    model: openai("gpt-4o-mini"), // ai-sdk native
  });
  ```

  Note: `@voltagent/core@1.x` has a peer dependency on `ai@^5`. Install `ai` and a provider like `@ai-sdk/openai`.

  ## Memory V2: use `Memory({ storage: <Adapter> })`

  Before (0.1.x):

  ```ts
  import { LibSQLStorage } from "@voltagent/libsql";

  const agent = new Agent({
    // ...
    memory: new LibSQLStorage({ url: "file:./.voltagent/memory.db" }),
  });
  ```

  After (1.x):

  ```ts
  import { Memory } from "@voltagent/core";
  import { LibSQLMemoryAdapter } from "@voltagent/libsql";

  const agent = new Agent({
    // ...
    memory: new Memory({
      storage: new LibSQLMemoryAdapter({ url: "file:./.voltagent/memory.db" }),
    }),
  });
  ```

  Default memory is in‑memory when omitted.

  ## Server: moved out of core → use `@voltagent/server-hono`

  Before (0.1.x):

  ```ts
  import { VoltAgent } from "@voltagent/core";

  new VoltAgent({ agents: { agent }, port: 3141, enableSwaggerUI: true });
  ```

  After (1.x):

  ```ts
  import { VoltAgent } from "@voltagent/core";
  import { honoServer } from "@voltagent/server-hono";

  new VoltAgent({
    agents: { agent },
    server: honoServer({ port: 3141, enableSwaggerUI: true }),
  });
  ```

  ## Abort: option renamed

  ```ts
  // 0.1.x
  await agent.generateText("...", { abortController: new AbortController() });

  // 1.x
  const ac = new AbortController();
  await agent.generateText("...", { abortSignal: ac.signal });
  ```

  ## Observability: OTel‑based, zero code required

  Set keys and run:

  ```bash
  VOLTAGENT_PUBLIC_KEY=pk_... VOLTAGENT_SECRET_KEY=sk_...
  ```

  Remote export auto‑enables when keys are present. Local Console streaming remains available.

## 1.0.0-next.2

### Major Changes

- [`a2b492e`](https://github.com/VoltAgent/voltagent/commit/a2b492e8ed4dba96fa76862bbddf156f3a1a5c93) Thanks [@omeraplak](https://github.com/omeraplak)! - # Core 1.x — AI SDK native, Memory V2, pluggable server

  Breaking but simple to migrate. Key changes and copy‑paste examples below.

  Full migration guide: [Migration Guide](https://voltagent.dev/docs/getting-started/migration-guide/)

  ## Agent: remove `llm`, use ai‑sdk model directly

  Before (0.1.x):

  ```ts
  import { Agent } from "@voltagent/core";
  import { VercelAIProvider } from "@voltagent/vercel-ai";
  import { openai } from "@ai-sdk/openai";

  const agent = new Agent({
    name: "app",
    instructions: "Helpful",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
  });
  ```

  After (1.x):

  ```ts
  import { Agent } from "@voltagent/core";
  import { openai } from "@ai-sdk/openai";

  const agent = new Agent({
    name: "app",
    instructions: "Helpful",
    model: openai("gpt-4o-mini"), // ai-sdk native
  });
  ```

  Note: `@voltagent/core@1.x` has a peer dependency on `ai@^5`. Install `ai` and a provider like `@ai-sdk/openai`.

  ## Memory V2: use `Memory({ storage: <Adapter> })`

  Before (0.1.x):

  ```ts
  import { LibSQLStorage } from "@voltagent/libsql";

  const agent = new Agent({
    // ...
    memory: new LibSQLStorage({ url: "file:./.voltagent/memory.db" }),
  });
  ```

  After (1.x):

  ```ts
  import { Memory } from "@voltagent/core";
  import { LibSQLMemoryAdapter } from "@voltagent/libsql";

  const agent = new Agent({
    // ...
    memory: new Memory({
      storage: new LibSQLMemoryAdapter({ url: "file:./.voltagent/memory.db" }),
    }),
  });
  ```

  Default memory is in‑memory when omitted.

  ## Server: moved out of core → use `@voltagent/server-hono`

  Before (0.1.x):

  ```ts
  import { VoltAgent } from "@voltagent/core";

  new VoltAgent({ agents: { agent }, port: 3141, enableSwaggerUI: true });
  ```

  After (1.x):

  ```ts
  import { VoltAgent } from "@voltagent/core";
  import { honoServer } from "@voltagent/server-hono";

  new VoltAgent({
    agents: { agent },
    server: honoServer({ port: 3141, enableSwaggerUI: true }),
  });
  ```

  ## Abort: option renamed

  ```ts
  // 0.1.x
  await agent.generateText("...", { abortController: new AbortController() });

  // 1.x
  const ac = new AbortController();
  await agent.generateText("...", { abortSignal: ac.signal });
  ```

  ## Observability: OTel‑based, zero code required

  Set keys and run:

  ```bash
  VOLTAGENT_PUBLIC_KEY=pk_... VOLTAGENT_SECRET_KEY=sk_...
  ```

  Remote export auto‑enables when keys are present. Local Console streaming remains available.

### Patch Changes

- Updated dependencies [[`a2b492e`](https://github.com/VoltAgent/voltagent/commit/a2b492e8ed4dba96fa76862bbddf156f3a1a5c93)]:
  - @voltagent/logger@1.0.0-next.0

## 1.0.0-next.1

### Major Changes

- [#514](https://github.com/VoltAgent/voltagent/pull/514) [`e86cadb`](https://github.com/VoltAgent/voltagent/commit/e86cadb5ae9ee9719bfd1f12e7116d95224699ce) Thanks [@omeraplak](https://github.com/omeraplak)! - # Agent Class - AI SDK Native Integration

  The Agent class has been completely refactored to use AI SDK directly, removing the provider abstraction layer for better performance and simpler API.

  ## Breaking Changes

  ### Provider System Removed

  The Agent class no longer uses the provider abstraction. It now works directly with AI SDK's LanguageModel.

  **Before:**

  ```typescript
  import { VercelAIProvider } from "@voltagent/vercel-ai";

  const agent = new Agent({
    name: "assistant",
    description: "You are a helpful assistant",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
  });
  ```

  **After:**

  ```typescript
  import { openai } from "@ai-sdk/openai";

  const agent = new Agent({
    name: "assistant",
    instructions: "You are a helpful assistant", // description -> instructions
    model: openai("gpt-4o-mini"),
  });
  ```

  ### Description Field Removed

  The deprecated `description` field has been completely removed in favor of `instructions`.

  **Before:**

  ```typescript
  const agent = new Agent({
    name: "assistant",
    description: "You are a helpful assistant", // @deprecated
    instructions: "You are a helpful assistant", // Had to use both
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
  });
  ```

  **After:**

  ```typescript
  const agent = new Agent({
    name: "assistant",
    instructions: "You are a helpful assistant", // Only instructions now
    model: openai("gpt-4o-mini"),
  });
  ```

  ### Context API Changes

  The context property has been renamed from `userContext` to `context` and can now accept plain objects.

  **Before:**

  ```typescript
  // userContext only accepted Map
  const agent = new Agent({
    userContext: new Map([["key", "value"]]),
  });

  await agent.generateText({
    input: "Hello",
    userContext: new Map([["key", "value"]]),
  });
  ```

  **After:**

  ```typescript
  // context accepts both Map and plain objects
  const agent = new Agent({
    context: { key: "value" }, // Can be Map or plain object
  });

  await agent.generateText({
    input: "Hello",
    context: { key: "value" }, // ContextInput type: Map or Record
  });
  ```

  ```ts
  // New AgentContext structure used internally:
  interface AgentContext {
    context: Map<string | symbol, unknown>;
    operation: {
      id: string;
      userId?: string;
      conversationId?: string;
      parentAgentId?: string;
      parentHistoryId?: string;
    };
    system: {
      logger: Logger;
      signal?: AbortSignal;
      startTime: string;
    };
  }
  ```

  ### Hook System Simplified

  Hooks are now defined directly without createHooks wrapper.

  **Before:**

  ```typescript
  import { createHooks } from "@voltagent/core";

  const agent = new Agent({
    hooks: createHooks({
      onStart: async (context) => {},
      onEnd: async (context, result) => {},
    }),
  });
  ```

  **After:**

  ```ts
  const agent = new Agent({
    hooks: {
      onStart: async (context: AgentContext) => {},
      onEnd: async (context: AgentContext, result, error?) => {},
      onError: async (context: AgentContext, error) => {},
      onPrepareMessages: async (messages: UIMessage[], context) => {
        // New hook for message preparation
        return { messages };
      },
      onToolStart: async (context, tool) => {},
      onToolEnd: async (context, tool, output, error?) => {},
    },
  });
  ```

  ### Method Signatures Now Use AI SDK Options

  All generation methods now accept AI SDK's CallSettings.

  **Before:**

  ```typescript
  await agent.generateText({
    input: "Hello",
    userId: "123",
    conversationId: "conv-1",
    provider: {
      maxTokens: 1000,
      temperature: 0.7,
    },
  });
  ```

  **After:**

  ```typescript
  await agent.generateText({
    input: "Hello",
    // VoltAgent specific
    userId: "123",
    conversationId: "conv-1",
    context: { key: "value" },
    // AI SDK CallSettings
    maxTokens: 1000,
    temperature: 0.7,
    topP: 0.9,
    presencePenalty: 0.1,
    frequencyPenalty: 0.1,
    seed: 12345,
    maxRetries: 3,
  });
  ```

  ### Message Format Changes

  Agent now accepts UIMessage format from AI SDK.

  **Before:**

  ```typescript
  // BaseMessage format
  await agent.generateText({
    input: [
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi there!" },
    ],
  });
  ```

  **After:**

  ```typescript
  // UIMessage format (AI SDK compatible)
  await agent.generateText({
    input: [
      {
        id: "1",
        role: "user",
        parts: [{ type: "text", text: "Hello" }],
      },
      {
        id: "2",
        role: "assistant",
        parts: [{ type: "text", text: "Hi there!" }],
      },
    ],
  });

  // UIMessage structure from AI SDK:
  interface UIMessage {
    id: string;
    role: "system" | "user" | "assistant";
    metadata?: unknown; // For custom data like createdAt
    parts: Array<UIMessagePart>; // text, tool, reasoning, etc.
  }
  ```

  ## New Features

  ### Direct AI SDK Integration
  - Better performance without abstraction overhead
  - Access to all AI SDK features directly
  - Simplified error handling
  - Native streaming support

  ### Enhanced Type Safety

  ```typescript
  // All methods now have proper generic types
  const result = await agent.generateObject<typeof schema>({
    input: "Generate user data",
    schema: userSchema,
  });
  // result.object is properly typed
  ```

  ### Streamlined API

  ```typescript
  // All generation methods follow same pattern
  const textResult = await agent.generateText(options);
  const textStream = await agent.streamText(options);
  const objectResult = await agent.generateObject(options);
  const objectStream = await agent.streamObject(options);
  ```

  ## Migration Guide

  ### 1. Remove Deprecated Packages

  ```diff
  - "@voltagent/vercel-ai": "^0.9.0",
  - "@voltagent/vercel-ui": "^0.9.0",
  - "@voltagent/xsai": "^0.9.0",
  ```

  ```bash
  npm uninstall @voltagent/vercel-ai @voltagent/vercel-ui @voltagent/xsai
  ```

  ### 2. Install AI SDK Directly

  ```diff
  + "ai": "^5.0.0",
  + "@ai-sdk/openai": "^1.0.0",
  + "@ai-sdk/anthropic": "^1.0.0",
  ```

  ```bash
  npm install ai @ai-sdk/openai @ai-sdk/anthropic
  ```

  ### 3. Update Your Code

  ```diff
  // imports
  - import { VercelAIProvider } from '@voltagent/vercel-ai';
  + import { openai } from '@ai-sdk/openai';

  // agent creation
  const agent = new Agent({
    name: 'assistant',
  - description: 'You are a helpful assistant',
  + instructions: 'You are a helpful assistant',
  - llm: new VercelAIProvider(),
  - model: 'gpt-4o-mini',
  + model: openai('gpt-4o-mini'),
  });

  // hooks
  - import { createHooks } from '@voltagent/core';
  - hooks: createHooks({ onStart: () => {} })
  + hooks: { onStart: () => {} }

  // context
  - userContext: new Map([['key', 'value']])
  + context: { key: 'value' }
  ```

  ## Benefits
  - **Simpler API**: No provider abstraction complexity
  - **Better Performance**: Direct AI SDK usage
  - **Type Safety**: Improved TypeScript support
  - **Future Proof**: Aligned with AI SDK ecosystem
  - **Smaller Bundle**: Removed abstraction layer code

- [#514](https://github.com/VoltAgent/voltagent/pull/514) [`e86cadb`](https://github.com/VoltAgent/voltagent/commit/e86cadb5ae9ee9719bfd1f12e7116d95224699ce) Thanks [@omeraplak](https://github.com/omeraplak)! - # VoltAgent Server Architecture - Pluggable Server Providers

  VoltAgent's server architecture has been completely redesigned with a pluggable server provider pattern, removing the built-in server in favor of optional server packages.

  ## Breaking Changes

  ### Built-in Server Removed

  The built-in server has been removed from the core package. Server functionality is now provided through separate server packages.

  **Before:**

  ```typescript
  import { VoltAgent } from "@voltagent/core";

  // Server was built-in and auto-started
  const voltAgent = new VoltAgent({
    agents: { myAgent },
    port: 3000,
    enableSwaggerUI: true,
    autoStart: true, // Server auto-started
  });
  ```

  **After:**

  ```typescript
  import { VoltAgent } from "@voltagent/core";
  import { honoServer } from "@voltagent/server-hono";

  // Server is now optional and explicitly configured
  const voltAgent = new VoltAgent({
    agents: { myAgent },
    server: honoServer({
      port: 3000,
      enableSwaggerUI: true,
    }),
  });
  ```

  ### Custom Endpoints Removed

  Custom endpoint registration methods have been removed. Custom routes should now be added through the server provider's `configureApp` option.

  **Before:**

  ```typescript
  voltAgent.registerCustomEndpoint({
    path: "/custom",
    method: "GET",
    handler: async (req) => {
      return { message: "Hello" };
    },
  });
  ```

  **After:**

  ```typescript
  import { honoServer } from "@voltagent/server-hono";

  new VoltAgent({
    agents: { myAgent },
    server: honoServer({
      port: 3000,
      // Configure custom routes via configureApp callback
      configureApp: (app) => {
        app.get("/api/custom", (c) => {
          return c.json({ message: "Hello" });
        });

        app.post("/api/calculate", async (c) => {
          const { a, b } = await c.req.json();
          return c.json({ result: a + b });
        });
      },
    }),
  });
  ```

  ### Server Management Methods Changed

  **Before:**

  ```typescript
  // Server started automatically or with:
  voltAgent.startServer();
  // No stop method available
  ```

  **After:**

  ```typescript
  // Server starts automatically if provider is configured
  voltAgent.startServer(); // Still available
  voltAgent.stopServer(); // New method for graceful shutdown
  ```

  ## New Server Provider Pattern

  ### IServerProvider Interface

  Server providers must implement the `IServerProvider` interface:

  ```typescript
  interface IServerProvider {
    start(): Promise<{ port: number }>;
    stop(): Promise<void>;
    isRunning(): boolean;
  }
  ```

  ### Available Server Providers

  #### @voltagent/server-hono (Recommended)

  Edge-optimized server using Hono framework:

  ```typescript
  import { honoServer } from "@voltagent/server-hono";

  new VoltAgent({
    agents: { myAgent },
    server: honoServer({
      port: 3141,
      enableSwaggerUI: true,
      auth: {
        provider: "jwt",
        secret: "your-secret",
      },
      configureApp: (app) => {
        // Add custom routes
        app.get("/api/health", (c) => {
          return c.json({ status: "healthy" });
        });
      },
    }),
  });
  ```

  Features:
  - **Built-in JWT Authentication**: Secure your API with JWT tokens
  - **Swagger UI Support**: Interactive API documentation
  - **WebSocket Support**: Real-time streaming capabilities
  - **Edge Runtime Compatible**: Deploy to Vercel Edge, Cloudflare Workers, etc.
  - **Fast and Lightweight**: Optimized for performance

  #### Authentication & Authorization

  The server-hono package includes comprehensive JWT authentication support:

  ```typescript
  import { honoServer, jwtAuth } from "@voltagent/server-hono";

  new VoltAgent({
    agents: { myAgent },
    server: honoServer({
      port: 3141,

      // Configure JWT authentication
      auth: jwtAuth({
        secret: process.env.JWT_SECRET,

        // Map JWT payload to user object
        mapUser: (payload) => ({
          id: payload.sub,
          email: payload.email,
          role: payload.role,
          permissions: payload.permissions || [],
        }),

        // Define public routes (no auth required)
        publicRoutes: ["/health", "/metrics"],

        // JWT verification options
        verifyOptions: {
          algorithms: ["HS256"],
          audience: "your-app",
          issuer: "your-auth-server",
        },
      }),
    }),
  });
  ```

  **Accessing User Context in Agents:**

  ```typescript
  const agent = new Agent({
    name: "SecureAgent",
    instructions: "You are a secure assistant",
    model: openai("gpt-4o-mini"),

    // Access authenticated user in hooks
    hooks: {
      onStart: async ({ context }) => {
        const user = context.get("user");
        if (user?.role === "admin") {
          // Admin-specific logic
        }
      },
    },
  });
  ```

  **Making Authenticated Requests:**

  ```bash
  # Include JWT token in Authorization header
  curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
    http://localhost:3141/api/agent/chat
  ```

  ### No Server Configuration

  For serverless or custom deployments:

  ```typescript
  new VoltAgent({
    agents: { myAgent },
    // No server property - runs without HTTP server
  });
  ```

  ## Migration Guide
  1. **Install server package**:

     ```bash
     npm install @voltagent/server-hono
     ```

  2. **Update imports**:

     ```typescript
     import { honoServer } from "@voltagent/server-hono";
     ```

  3. **Update VoltAgent configuration**:
     - Remove: `port`, `enableSwaggerUI`, `autoStart`, `customEndpoints`
     - Add: `server: honoServer({ /* config */ })`
  4. **Handle custom routes**:
     - Use `configureApp` callback in server config
     - Access full Hono app instance for custom routes

## 1.0.0-next.0

### Major Changes

- [#485](https://github.com/VoltAgent/voltagent/pull/485) [`64a50e6`](https://github.com/VoltAgent/voltagent/commit/64a50e6800dec844fad7b9f3a3b1c2c8d0486229) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: change default memory storage from LibSQL to InMemoryStorage for serverless compatibility

  ## Breaking Change ⚠️

  The default memory storage has been changed from LibSQL to InMemoryStorage to fix serverless deployment issues with native binary dependencies.

  ## Migration Guide

  ### If you need persistent storage with LibSQL:
  1. Install the new package:

  ```bash
  npm install @voltagent/libsql
  # or
  pnpm add @voltagent/libsql
  ```

  2. Import and configure LibSQLStorage:

  ```typescript
  import { Agent } from "@voltagent/core";
  import { LibSQLStorage } from "@voltagent/libsql";

  // Use with Agent
  const agent = new Agent({
    name: "Assistant",
    instructions: "You are a helpful assistant",
    // Pass LibSQL storage explicitly
    memory: new LibSQLStorage({
      url: "file:./.voltagent/memory.db", // It's default value
    }),
    // ... other config
  });
  ```

  ### If you're fine with in-memory storage:

  No changes needed! Your agents will use InMemoryStorage by default:

  ```typescript
  const agent = new Agent({
    name: "Assistant",
    instructions: "You are a helpful assistant",
    // memory defaults to InMemoryStorage (no persistence)
  });
  ```

  ## Why This Change?
  - **Lambda Compatibility**: Fixes "Cannot find module '@libsql/linux-x64-gnu'" error in AWS Lambda
  - **Smaller Core Bundle**: Removes native dependencies from core package
  - **Better Defaults**: InMemoryStorage works everywhere without configuration
  - **Modular Architecture**: Use only the storage backends you need

- [`9e8b211`](https://github.com/VoltAgent/voltagent/commit/9e8b2119a783942f114459f0a9b93e645727445e) Thanks [@omeraplak](https://github.com/omeraplak)! - Initial v1.0.0 prerelease

  This is the first prerelease for VoltAgent v1.0.0. This release includes various improvements and prepares for the upcoming major version.

  Testing the prerelease workflow with the next branch.

## 0.1.84

### Patch Changes

- [#462](https://github.com/VoltAgent/voltagent/pull/462) [`23ecea4`](https://github.com/VoltAgent/voltagent/commit/23ecea421b8c699f5c395dc8aed687f94d558b6c) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add cachedInputTokens and reasoningTokens to UsageInfo type

  Enhanced the `UsageInfo` type to include additional token usage metrics:
  - Added `cachedInputTokens?: number` to track tokens served from cache
  - Added `reasoningTokens?: number` to track tokens used for model reasoning

  These optional fields provide more granular usage information when supported by the underlying LLM provider. The Vercel AI provider now passes through these values when available from the AI SDK.

- [#462](https://github.com/VoltAgent/voltagent/pull/462) [`23ecea4`](https://github.com/VoltAgent/voltagent/commit/23ecea421b8c699f5c395dc8aed687f94d558b6c) Thanks [@omeraplak](https://github.com/omeraplak)! - Update Zod to v3.25.0 for compatibility with Vercel AI@5
  - Updated Zod dependency to ^3.25.0 across all packages
  - Maintained compatibility with zod-from-json-schema@0.0.5
  - Fixed TypeScript declaration build hanging issue
  - Resolved circular dependency issues in the build process

## 0.1.83

### Patch Changes

- Updated dependencies [[`5968cef`](https://github.com/VoltAgent/voltagent/commit/5968cef5fe417cd118867ac78217dddfbd60493d)]:
  - @voltagent/internal@0.0.9

## 0.1.82

### Patch Changes

- [#492](https://github.com/VoltAgent/voltagent/pull/492) [`17d73f2`](https://github.com/VoltAgent/voltagent/commit/17d73f2972f061d8f468c209b79c42b5241cf06f) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add addTools method and deprecate addItems for better developer experience - #487

  ## What Changed
  - Added new `addTools()` method to Agent class for dynamically adding tools and toolkits
  - Deprecated `addItems()` method in favor of more intuitive `addTools()` naming
  - Fixed type signature to accept `Tool<any, any>` instead of `Tool<any>` to support tools with output schemas

  ## Before

  ```typescript
  // ❌ Method didn't exist - would throw error
  agent.addTools([weatherTool]);

  // ❌ Type error with tools that have outputSchema
  agent.addItems([weatherTool]); // Type error if weatherTool has outputSchema
  ```

  ## After

  ```typescript
  // ✅ Works with new addTools method
  agent.addTools([weatherTool]);

  // ✅ Also supports toolkits
  agent.addTools([myToolkit]);

  // ✅ No type errors with outputSchema tools
  const weatherTool = createTool({
    name: "getWeather",
    outputSchema: weatherOutputSchema, // Works without type errors
    // ...
  });
  agent.addTools([weatherTool]);
  ```

  ## Migration

  The `addItems()` method is deprecated but still works. Update your code to use `addTools()`:

  ```typescript
  // Old (deprecated)
  agent.addItems([tool1, tool2]);

  // New (recommended)
  agent.addTools([tool1, tool2]);
  ```

  This change improves developer experience by using more intuitive method naming and fixing TypeScript compatibility issues with tools that have output schemas.

## 0.1.81

### Patch Changes

- [#489](https://github.com/VoltAgent/voltagent/pull/489) [`fc79d81`](https://github.com/VoltAgent/voltagent/commit/fc79d81a2657a8472fdc2169213f6ef9f93e9b22) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add separate stream method for workflows with real-time event streaming

  ## What Changed

  Workflows now have a dedicated `.stream()` method that returns an AsyncIterable for real-time event streaming, separate from the `.run()` method. This provides better separation of concerns and improved developer experience.

  ## New Stream Method

  ```typescript
  // Stream workflow execution with real-time events
  const stream = workflow.stream(input);

  // Iterate through events as they happen
  for await (const event of stream) {
    console.log(`[${event.type}] ${event.from}`, event);

    if (event.type === "workflow-suspended") {
      // Resume continues the same stream
      await stream.resume({ approved: true });
    }
  }

  // Get final result after stream completes
  const result = await stream.result;
  ```

  ## Key Features
  - **Separate `.stream()` method**: Clean API separation from `.run()`
  - **AsyncIterable interface**: Native async iteration support
  - **Promise-based fields**: Result, status, and usage resolve when execution completes
  - **Continuous streaming**: Stream remains open across suspend/resume cycles (programmatic API)
  - **Type safety**: Full TypeScript support with `WorkflowStreamResult` type

  ## REST API Streaming

  Added Server-Sent Events (SSE) endpoint for workflow streaming:

  ```typescript
  POST / workflows / { id } / stream;

  // Returns SSE stream with real-time workflow events
  // Note: Due to stateless architecture, stream closes on suspension
  // Resume operations return complete results (not streamed)
  ```

  ## Technical Details
  - Stream events flow through central `WorkflowStreamController`
  - No-op stream writer for non-streaming execution
  - Suspension events properly emitted to stream
  - Documentation updated with streaming examples and architecture notes

- [#490](https://github.com/VoltAgent/voltagent/pull/490) [`3d278cf`](https://github.com/VoltAgent/voltagent/commit/3d278cfb1799ffb2b2e460d5595ad68fc5f5c812) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: InMemoryStorage timestamp field for VoltOps history display

  Fixed an issue where VoltOps history wasn't displaying when using InMemoryStorage. The problem was caused by using `updatedAt` field instead of `timestamp` when setting history entries.

  The fix ensures that the `timestamp` field is properly preserved when updating history entries in InMemoryStorage, allowing VoltOps to correctly display workflow execution history.

## 0.1.80

### Patch Changes

- [#484](https://github.com/VoltAgent/voltagent/pull/484) [`6a638f5`](https://github.com/VoltAgent/voltagent/commit/6a638f52b682e7282747a95cac5c3a917caaaf5b) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add real-time stream support and usage tracking for workflows

  ## What Changed for You

  Workflows now support real-time event streaming and token usage tracking, providing complete visibility into workflow execution and resource consumption. Previously, workflows only returned final results without intermediate visibility or usage metrics.

  ## Before - Limited Visibility

  ```typescript
  // ❌ OLD: Only final result, no streaming or usage tracking
  const workflow = createWorkflowChain(config)
    .andThen({ execute: async ({ data }) => processData(data) })
    .andAgent(prompt, agent, { schema });

  const result = await workflow.run(input);
  // Only got final result, no intermediate events or usage info
  ```

  ## After - Full Stream Support and Usage Tracking

  ```typescript
  // ✅ NEW: Real-time streaming and usage tracking
  const workflow = createWorkflowChain(config)
    .andThen({
      execute: async ({ data, writer }) => {
        // Emit custom events for monitoring
        writer.write({
          type: "processing-started",
          metadata: { itemCount: data.items.length },
        });

        const processed = await processData(data);

        writer.write({
          type: "processing-complete",
          output: { processedCount: processed.length },
        });

        return processed;
      },
    })
    .andAgent(prompt, agent, { schema });

  // Get both result and stream
  const execution = await workflow.run(input);

  // Monitor events in real-time
  for await (const event of execution.stream) {
    console.log(`[${event.type}] ${event.from}:`, event);
    // Events: workflow-start, step-start, custom events, step-complete, workflow-complete
  }

  // Access token usage from all andAgent steps
  console.log("Total tokens used:", execution.usage);
  // { promptTokens: 250, completionTokens: 150, totalTokens: 400 }
  ```

  ## Advanced: Agent Stream Piping

  ```typescript
  // ✅ NEW: Pipe agent's streaming output directly to workflow stream
  .andThen({
    execute: async ({ data, writer }) => {
      const agent = new Agent({ /* ... */ });

      // Stream agent's response with full visibility
      const response = await agent.streamText(prompt);

      // Pipe all agent events (text-delta, tool-call, etc.) to workflow stream
      if (response.fullStream) {
        await writer.pipeFrom(response.fullStream, {
          prefix: "agent-", // Optional: prefix event types
          filter: (part) => part.type !== "finish" // Optional: filter events
        });
      }

      const result = await response.text;
      return { ...data, agentResponse: result };
    }
  })
  ```

  ## Key Features

  ### 1. Stream Events

  Every workflow execution now includes a stream of events:
  - `workflow-start` / `workflow-complete` - Workflow lifecycle
  - `step-start` / `step-complete` - Step execution tracking
  - Custom events via `writer.write()` - Application-specific monitoring
  - Piped agent events via `writer.pipeFrom()` - Full agent visibility

  ### 2. Writer API in All Steps

  The `writer` is available in all step types:

  ```typescript
  // andThen
  .andThen({ execute: async ({ data, writer }) => { /* ... */ } })

  // andTap (observe without modifying)
  .andTap({ execute: async ({ data, writer }) => {
    writer.write({ type: "checkpoint", metadata: { data } });
  }})

  // andWhen
  .andWhen({
    condition: async ({ data, writer }) => {
      writer.write({ type: "condition-check", input: data });
      return data.shouldProcess;
    },
    execute: async ({ data, writer }) => { /* ... */ }
  })
  ```

  ### 3. Usage Tracking

  Token usage from all `andAgent` steps is automatically accumulated:

  ```typescript
  const execution = await workflow.run(input);

  // Total usage across all andAgent steps
  const { promptTokens, completionTokens, totalTokens } = execution.usage;

  // Usage is always available (defaults to 0 if no agents used)
  console.log(`Cost: ${totalTokens * 0.0001}`); // Example cost calculation
  ```

  ## Why This Matters
  - **Real-time Monitoring**: See what's happening as workflows execute
  - **Debugging**: Track data flow through each step with custom events
  - **Cost Control**: Monitor token usage across complex workflows
  - **Agent Integration**: Full visibility into agent operations within workflows
  - **Production Ready**: Stream events for logging, monitoring, and alerting

  ## Technical Details
  - Stream is always available (non-optional) for consistent API
  - Events include execution context (executionId, timestamp, status)
  - Writer functions are synchronous for `write()`, async for `pipeFrom()`
  - Usage tracking only counts `andAgent` steps (not custom agent calls in `andThen`)
  - All events flow through a central `WorkflowStreamController` for ordering

## 0.1.79

### Patch Changes

- [#481](https://github.com/VoltAgent/voltagent/pull/481) [`2fd8bb4`](https://github.com/VoltAgent/voltagent/commit/2fd8bb47af2906bcfff9be4aac8c6a53a264b628) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add configurable subagent event forwarding for enhanced stream control

  ## What Changed for You

  You can now control which events from subagents are forwarded to the parent stream, providing fine-grained control over stream verbosity and performance. Previously, only `tool-call` and `tool-result` events were forwarded with no way to customize this behavior.

  ## Before - Fixed Event Forwarding

  ```typescript
  // ❌ OLD: Only tool-call and tool-result events were forwarded (hardcoded)
  const supervisor = new Agent({
    name: "Supervisor",
    subAgents: [writerAgent, editorAgent],
    // No way to change which events were forwarded
  });

  const result = await supervisor.streamText("Create content");

  // Stream only contained tool-call and tool-result from subagents
  for await (const event of result.fullStream) {
    console.log("Event", event);
  }
  ```

  ## After - Full Control Over Event Forwarding

  ```typescript
  // ✅ NEW: Configure exactly which events to forward
  const supervisor = new Agent({
    name: "Supervisor",
    subAgents: [writerAgent, editorAgent],

    supervisorConfig: {
      fullStreamEventForwarding: {
        // Choose which event types to forward (default: ['tool-call', 'tool-result'])
        types: ["tool-call", "tool-result", "text-delta"],

        // Control tool name prefixing (default: true)
        addSubAgentPrefix: true, // "WriterAgent: search_tool" vs "search_tool"
      },
    },
  });

  // Stream only contains configured event types from subagents
  const result = await supervisor.streamText("Create content");

  // Filter subagent events in your application
  for await (const event of result.fullStream) {
    if (event.subAgentId && event.subAgentName) {
      console.log(`Event from ${event.subAgentName}: ${event.type}`);
    }
  }
  ```

  ## Configuration Options

  ```typescript
  // Minimal - Only tool events (default)
  fullStreamEventForwarding: {
    types: ['tool-call', 'tool-result'],
  }

  // Verbose - See what subagents are saying and doing
  fullStreamEventForwarding: {
    types: ['tool-call', 'tool-result', 'text-delta'],
  }

  // Full visibility - All events for debugging
  fullStreamEventForwarding: {
    types: ['tool-call', 'tool-result', 'text-delta', 'reasoning', 'source', 'error', 'finish'],
  }

  // Clean tool names without agent prefix
  fullStreamEventForwarding: {
    types: ['tool-call', 'tool-result'],
    addSubAgentPrefix: false,
  }
  ```

  ## Why This Matters
  - **Better Performance**: Reduce stream overhead by forwarding only necessary events
  - **Cleaner Streams**: Focus on meaningful actions rather than all intermediate steps
  - **Type Safety**: Use `StreamEventType[]` for compile-time validation of event types
  - **Backward Compatible**: Existing code continues to work with sensible defaults

  ## Technical Details
  - Default configuration: `['tool-call', 'tool-result']` with `addSubAgentPrefix: true`
  - Events from subagents include `subAgentId` and `subAgentName` properties for filtering
  - Configuration available through `supervisorConfig.fullStreamEventForwarding`
  - Utilizes the `streamEventForwarder` utility for consistent event filtering

## 0.1.78

### Patch Changes

- [#466](https://github.com/VoltAgent/voltagent/pull/466) [`730232e`](https://github.com/VoltAgent/voltagent/commit/730232e730cdbd1bb7de6acff8519e8af93f2abf) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add message helper utilities to simplify working with complex message content

  ## What Changed for You

  Working with message content (which can be either a string or an array of content parts) used to require complex if/else blocks. Now you have simple helper functions that handle all the complexity.

  ## Before - Your Old Code (Complex)

  ```typescript
  // Adding timestamps to messages - 30+ lines of code
  const enhancedMessages = messages.map((msg) => {
    if (msg.role === "user") {
      const timestamp = new Date().toLocaleTimeString();

      // Handle string content
      if (typeof msg.content === "string") {
        return {
          ...msg,
          content: `[${timestamp}] ${msg.content}`,
        };
      }

      // Handle structured content (array of content parts)
      if (Array.isArray(msg.content)) {
        return {
          ...msg,
          content: msg.content.map((part) => {
            if (part.type === "text") {
              return {
                ...part,
                text: `[${timestamp}] ${part.text}`,
              };
            }
            return part;
          }),
        };
      }
    }
    return msg;
  });

  // Extracting text from content - another 15+ lines
  function getText(content) {
    if (typeof content === "string") {
      return content;
    }
    if (Array.isArray(content)) {
      return content
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("");
    }
    return "";
  }
  ```

  ## After - Your New Code (Simple)

  ```typescript
  import { messageHelpers } from "@voltagent/core";

  // Adding timestamps - 1 line!
  const enhancedMessages = messages.map((msg) =>
    messageHelpers.addTimestampToMessage(msg, timestamp)
  );

  // Extracting text - 1 line!
  const text = messageHelpers.extractText(content);

  // Check if has images - 1 line!
  if (messageHelpers.hasImagePart(content)) {
    // Handle image content
  }

  // Build complex content - fluent API
  const content = new messageHelpers.MessageContentBuilder()
    .addText("Here's an image:")
    .addImage("screenshot.png")
    .addText("And a file:")
    .addFile("document.pdf")
    .build();
  ```

  ## Real Use Case in Hooks

  ```typescript
  import { Agent, messageHelpers } from "@voltagent/core";

  const agent = new Agent({
    name: "Assistant",
    hooks: {
      onPrepareMessages: async ({ messages }) => {
        // Before: 30+ lines of complex if/else
        // After: 2 lines!
        const timestamp = new Date().toLocaleTimeString();
        return {
          messages: messages.map((msg) => messageHelpers.addTimestampToMessage(msg, timestamp)),
        };
      },
    },
  });
  ```

  ## What You Get
  - **No more if/else blocks** for content type checking
  - **Type-safe operations** with TypeScript support
  - **30+ lines → 1 line** for common operations
  - **Works everywhere**: hooks, tools, custom logic

  ## Available Helpers

  ```typescript
  import { messageHelpers } from "@voltagent/core";

  // Check content type
  messageHelpers.isTextContent(content); // Is it a string?
  messageHelpers.hasImagePart(content); // Has images?

  // Extract content
  messageHelpers.extractText(content); // Get all text
  messageHelpers.extractImageParts(content); // Get all images

  // Transform content
  messageHelpers.transformTextContent(content, (text) => text.toUpperCase());
  messageHelpers.addTimestampToMessage(message, "10:30:00");

  // Build content
  new messageHelpers.MessageContentBuilder().addText("Hello").addImage("world.png").build();
  ```

  Your message handling code just got 90% simpler!

- [#466](https://github.com/VoltAgent/voltagent/pull/466) [`730232e`](https://github.com/VoltAgent/voltagent/commit/730232e730cdbd1bb7de6acff8519e8af93f2abf) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add onPrepareMessages hook - transform messages before they reach the LLM

  ## What Changed for You

  You can now modify, filter, or enhance messages before they're sent to the LLM. Previously impossible without forking the framework.

  ## Before - What You Couldn't Do

  ```typescript
  // ❌ No way to:
  // - Add timestamps to messages
  // - Filter sensitive data (SSN, credit cards)
  // - Add user context to messages
  // - Remove duplicate messages
  // - Inject system prompts dynamically

  const agent = new Agent({
    name: "Assistant",
    // Messages went straight to LLM - no control!
  });
  ```

  ## After - What You Can Do Now

  ```typescript
  import { Agent, messageHelpers } from "@voltagent/core";

  const agent = new Agent({
    name: "Assistant",

    hooks: {
      // ✅ NEW: Intercept and transform messages!
      onPrepareMessages: async ({ messages, context }) => {
        // Add timestamps
        const timestamp = new Date().toLocaleTimeString();
        const enhanced = messages.map((msg) =>
          messageHelpers.addTimestampToMessage(msg, timestamp)
        );

        return { messages: enhanced };
      },
    },
  });

  // Your message: "What time is it?"
  // LLM receives: "[14:30:45] What time is it?"
  ```

  ## When It Runs

  ```typescript
  // 1. User sends message
  await agent.generateText("Hello");

  // 2. Memory loads previous messages
  // [previous messages...]

  // 3. ✨ onPrepareMessages runs HERE
  // You can transform messages

  // 4. Messages sent to LLM
  // [your transformed messages]
  ```

  ## What You Need to Know
  - **Runs on every LLM call**: generateText, streamText, generateObject, streamObject
  - **Gets all messages**: Including system prompt and memory messages
  - **Return transformed messages**: Or return nothing to keep original
  - **Access to context**: userContext, operationId, agent reference

  Your app just got smarter without changing any existing code!

- [#466](https://github.com/VoltAgent/voltagent/pull/466) [`730232e`](https://github.com/VoltAgent/voltagent/commit/730232e730cdbd1bb7de6acff8519e8af93f2abf) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: memory messages now return parsed objects instead of JSON strings

  ## What Changed for You

  Memory messages that contain structured content (like tool calls or multi-part messages) now return as **parsed objects** instead of **JSON strings**. This is a breaking change if you were manually parsing these messages.

  ## Before - You Had to Parse JSON Manually

  ```typescript
  // ❌ OLD BEHAVIOR: Content came as JSON string
  const messages = await memory.getMessages({ conversationId: "123" });

  // What you got from memory:
  console.log(messages[0]);
  // {
  //   role: "user",
  //   content: '[{"type":"text","text":"Hello"},{"type":"image","image":"data:..."}]',  // STRING!
  //   type: "text"
  // }

  // You had to manually parse the JSON string:
  const content = JSON.parse(messages[0].content); // Parse required!
  console.log(content);
  // [
  //   { type: "text", text: "Hello" },
  //   { type: "image", image: "data:..." }
  // ]

  // Tool calls were also JSON strings:
  console.log(messages[1].content);
  // '[{"type":"tool-call","toolCallId":"123","toolName":"weather"}]'  // STRING!
  ```

  ## After - You Get Parsed Objects Automatically

  ```typescript
  // ✅ NEW BEHAVIOR: Content comes as proper objects
  const messages = await memory.getMessages({ conversationId: "123" });

  // What you get from memory NOW:
  console.log(messages[0]);
  // {
  //   role: "user",
  //   content: [
  //     { type: "text", text: "Hello" },      // OBJECT!
  //     { type: "image", image: "data:..." }  // OBJECT!
  //   ],
  //   type: "text"
  // }

  // Direct access - no JSON.parse needed!
  const content = messages[0].content; // Already parsed!
  console.log(content[0].text); // "Hello"

  // Tool calls are proper objects:
  console.log(messages[1].content);
  // [
  //   { type: "tool-call", toolCallId: "123", toolName: "weather" }  // OBJECT!
  // ]
  ```

  ## Breaking Change Warning ⚠️

  If your code was doing this:

  ```typescript
  // This will now FAIL because content is already parsed
  const parsed = JSON.parse(msg.content); // ❌ Error: not a string!
  ```

  Change it to:

  ```typescript
  // Just use the content directly
  const content = msg.content; // ✅ Already an object/array
  ```

  ## What Gets Auto-Parsed
  - **String content** → Stays as string ✅
  - **Structured content** (arrays) → Auto-parsed to objects ✅
  - **Tool calls** → Auto-parsed to objects ✅
  - **Tool results** → Auto-parsed to objects ✅
  - **Metadata fields** → Auto-parsed to objects ✅

  ## Why This Matters
  - **No more JSON.parse errors** in your application
  - **Type-safe access** to structured content
  - **Cleaner code** without try/catch blocks
  - **Consistent behavior** with how agents handle messages

  ## Migration Guide
  1. **Remove JSON.parse calls** for message content
  2. **Remove try/catch** blocks around parsing
  3. **Use content directly** as objects/arrays

  Your memory messages now "just work" without manual parsing!

## 0.1.77

### Patch Changes

- [#472](https://github.com/VoltAgent/voltagent/pull/472) [`8de5785`](https://github.com/VoltAgent/voltagent/commit/8de5785e385bec632f846bcae44ee5cb22a9022e) Thanks [@zrosenbauer](https://github.com/zrosenbauer)! - fix: Migrate to using `safeStringify` to prevent issues using the JSON.stringify/parse method, in addition use structuredClone via Nodejs instead legacy method that errors

- Updated dependencies [[`8de5785`](https://github.com/VoltAgent/voltagent/commit/8de5785e385bec632f846bcae44ee5cb22a9022e)]:
  - @voltagent/internal@0.0.8

## 0.1.76

### Patch Changes

- [#468](https://github.com/VoltAgent/voltagent/pull/468) [`c7fec1b`](https://github.com/VoltAgent/voltagent/commit/c7fec1b6c09547adce7dfdb779a2eae7e2fbd153) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: separate system-managed context from user context in operationContext

  Separated system-managed values from userContext by introducing a new `systemContext` field in OperationContext. This provides cleaner separation of concerns between user-provided context and internal system tracking.

  ### What Changed
  - Added `systemContext` field to `OperationContext` type for internal system values
  - Moved system-managed values from `userContext` to `systemContext`:
    - `agent_start_time`: Agent execution start timestamp
    - `agent_start_event_id`: Agent start event identifier
    - `tool_${toolId}`: Tool execution tracking (eventId and startTime)

  ### Why This Matters

  Previously, system values were mixed with user context, which could:
  - Pollute the user's context namespace
  - Make it unclear which values were user-provided vs system-generated
  - Potentially cause conflicts if users used similar key names

  Now there's a clear separation:
  - `userContext`: Contains only user-provided values
  - `systemContext`: Contains only system-managed internal tracking values

  ### Migration

  This is an internal change that doesn't affect the public API. User code remains unchanged.

  ```typescript
  // User API remains the same
  const response = await agent.generateText("Hello", {
    userContext: new Map([["userId", "123"]]),
  });

  // userContext now only contains user values
  console.log(response.userContext.get("userId")); // "123"
  // System values are kept separate internally
  ```

- [#465](https://github.com/VoltAgent/voltagent/pull/465) [`4fe0f21`](https://github.com/VoltAgent/voltagent/commit/4fe0f21e1dde82bb80fcaab4a7039b446b8d9153) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: abort signal propagation to LLM providers for proper cancellation support

  Fixed an issue where abort signals were not correctly propagated to LLM providers in agent methods (`generateText`, `streamText`, `generateObject`, `streamObject`). The methods were using `internalOptions.signal` instead of `operationContext.signal`, which contains the properly derived signal from the AbortController.

  ## What's Fixed
  - **Signal Propagation**: All agent methods now correctly pass `operationContext.signal` to LLM providers
  - **AbortController Support**: Abort signals from parent agents properly cascade to subagents
  - **Cancellation Handling**: Operations can now be properly cancelled when AbortController is triggered

  ## Usage Example

  ```typescript
  import { Agent, isAbortError } from "@voltagent/core";
  import { VercelAIProvider } from "@voltagent/vercel-ai";
  import { openai } from "@ai-sdk/openai";

  const abortController = new AbortController();

  // Create supervisor with subagents
  const supervisor = new Agent({
    name: "Supervisor",
    instructions: "Coordinate tasks",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
    subAgents: [contentAgent, formatterAgent],
    hooks: {
      onEnd: async ({ error }) => {
        // Check if the operation was aborted
        if (isAbortError(error)) {
          console.log("Operation was aborted:", error.message);
          // Handle cleanup for aborted operations
          return;
        }

        if (error) {
          console.error("Operation failed:", error);
        }
      },
    },
  });

  // Start streaming with abort controller
  const stream = await supervisor.streamText("Create a story", {
    abortController,
  });

  // Abort after 500ms - now properly stops all subagent operations
  setTimeout(() => {
    abortController.abort();
  }, 500);

  try {
    // Stream will properly terminate when aborted
    for await (const chunk of stream.textStream) {
      console.log(chunk);
    }
  } catch (error) {
    if (isAbortError(error)) {
      console.log("Stream aborted successfully");
    }
  }
  ```

  ## Error Handling in Hooks

  The `onEnd` hook now receives `AbortError` type errors when operations are cancelled:

  ```typescript
  import { isAbortError } from "@voltagent/core";

  const agent = new Agent({
    // ... agent config
    hooks: {
      onEnd: async ({ error }) => {
        if (isAbortError(error)) {
          // error is typed as AbortError
          // error.name === "AbortError"
          // Handle abort-specific logic
          await cleanupResources();
          return;
        }

        // Handle other errors
        if (error) {
          await logError(error);
        }
      },
    },
  });
  ```

  This fix ensures that expensive operations can be properly cancelled, preventing unnecessary computation and improving resource efficiency when users navigate away or cancel requests.

## 0.1.75

### Patch Changes

- [`3a3ebd2`](https://github.com/VoltAgent/voltagent/commit/3a3ebd2bc72ed5d14dd924d824b54203b73ab19d) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: voltops client validation to prevent empty string keys from creating invalid clients
  - VoltOpsClient now validates keys before initializing services
  - Keys must not be empty and must have correct prefixes (pk* and sk*)
  - Added hasValidKeys() method to check client validity
  - Updated /setup-observability endpoint to update existing keys in .env file instead of adding duplicates

## 0.1.74

### Patch Changes

- [#463](https://github.com/VoltAgent/voltagent/pull/463) [`760a294`](https://github.com/VoltAgent/voltagent/commit/760a294e4d68742d8701d54dc1c541c87959e5d8) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: improve /setup-observability endpoint to handle commented .env entries

  ### What's New

  The `/setup-observability` API endpoint now intelligently updates existing .env files by replacing commented VoltOps key entries instead of creating duplicates.

  ### Changes
  - **Smart .env Updates**: When setting up observability, the endpoint now finds and updates commented entries like `# VOLTAGENT_PUBLIC_KEY=`
  - **No More Duplicates**: Prevents duplicate key entries by updating existing lines (both commented and active)
  - **Cleaner Configuration**: Results in a cleaner .env file without confusing duplicate entries

  ### Before

  ```bash
  # VoltAgent Observability (Optional)
  # VOLTAGENT_PUBLIC_KEY=
  # VOLTAGENT_SECRET_KEY=

  # ... later in file ...

  # VoltAgent Observability
  VOLTAGENT_PUBLIC_KEY=your-public-key
  VOLTAGENT_SECRET_KEY=your-secret-key
  ```

  ### After

  ```bash
  # VoltAgent Observability (Optional)
  VOLTAGENT_PUBLIC_KEY=your-public-key
  VOLTAGENT_SECRET_KEY=your-secret-key
  ```

  This change improves the developer experience by maintaining a clean .env file structure when setting up observability through the VoltOps Console.

- [#463](https://github.com/VoltAgent/voltagent/pull/463) [`760a294`](https://github.com/VoltAgent/voltagent/commit/760a294e4d68742d8701d54dc1c541c87959e5d8) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add VoltOps API key validation and improved auto-configuration

  ### What's New
  - **API Key Validation**: VoltAgent now validates VoltOps API keys to ensure they have the correct format (must start with `pk_` for public keys and `sk_` for secret keys)
  - **Smart Auto-Configuration**: The VoltAgent constructor only creates VoltOpsClient when valid API keys are detected
  - **Dummy Key Protection**: Placeholder values like "your-public-key" are now properly rejected

  ### Changes
  - Added `isValidVoltOpsKeys()` utility function to validate API key formats
  - Updated VoltAgent constructor to check key validity before auto-configuring VoltOpsClient
  - Environment variables with invalid keys are now silently ignored instead of causing errors

  ### Usage

  ```typescript
  // Valid keys - VoltOpsClient will be auto-configured
  // .env file:
  // VOLTAGENT_PUBLIC_KEY=your-public-key
  // VOLTAGENT_SECRET_KEY=your-secret-key

  // Invalid keys - VoltOpsClient will NOT be created
  // .env file:
  // VOLTAGENT_PUBLIC_KEY=your-public-key  // ❌ Rejected
  // VOLTAGENT_SECRET_KEY=your-secret-key  // ❌ Rejected

  const voltAgent = new VoltAgent({
    agents: { myAgent },
    // No need to manually configure VoltOpsClient if valid keys exist in environment
  });
  ```

  This change improves the developer experience by preventing confusion when placeholder API keys are present in the environment variables.

- [#459](https://github.com/VoltAgent/voltagent/pull/459) [`980d037`](https://github.com/VoltAgent/voltagent/commit/980d037ce535bcc85cc7df3f64354c823453a147) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add userContext to logger context for better traceability

  ### What's New

  The `userContext` is now automatically included in the logger context for all agent operations. This provides better traceability and debugging capabilities by associating custom context data with all log messages generated during an agent's execution.

  ### Usage

  When you pass a `userContext` to any agent method, it will automatically appear in all log messages:

  ```typescript
  const userContext = new Map([
    ["sessionId", "session-123"],
    ["userId", "user-456"],
    ["customKey", "customValue"],
  ]);

  await agent.generateText("Hello", { userContext });

  // All logs during this operation will include:
  // {
  //   "component": "agent",
  //   "agentId": "TestAgent",
  //   "executionId": "...",
  //   "userContext": {
  //     "sessionId": "session-123",
  //     "userId": "user-456",
  //     "customKey": "customValue"
  //   }
  // }
  ```

  ### Benefits
  - **Better Debugging**: Easily correlate logs with specific user sessions or requests
  - **Enhanced Observability**: Track custom context throughout the entire agent execution
  - **Multi-tenant Support**: Associate logs with specific tenants, users, or organizations
  - **Request Tracing**: Follow a request through all agent operations and sub-agents

  This change improves the observability experience by ensuring all log messages include the relevant user context, making it easier to debug issues and track operations in production environments.

## 0.1.73

### Patch Changes

- [#457](https://github.com/VoltAgent/voltagent/pull/457) [`8d89469`](https://github.com/VoltAgent/voltagent/commit/8d8946919820c0298bffea13731ea08660b72c4b) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: optimize agent event system and add pagination to agent history API

  Significantly improved agent performance and UI scalability with two major enhancements:

  ## 1. Event System Optimization

  Refactored agent event system to emit events immediately before database writes, matching the workflow event system behavior. This provides real-time event visibility without waiting for persistence operations.

  **Before:**
  - Events were queued and only emitted after database write completion
  - Real-time monitoring was delayed by persistence operations

  **After:**
  - Events emit immediately for real-time updates
  - Database persistence happens asynchronously in the background
  - Consistent behavior with workflow event system

  ## 2. Agent History Pagination

  Added comprehensive pagination support to agent history API, preventing performance issues when loading large history datasets.

  **New API:**

  ```typescript
  // Agent class
  const history = await agent.getHistory({ page: 0, limit: 20 });
  // Returns: { entries: AgentHistoryEntry[], pagination: { page, limit, total, totalPages } }

  // REST API
  GET /agents/:id/history?page=0&limit=20
  // Returns paginated response format
  ```

  **Implementation Details:**
  - Added pagination to all storage backends (LibSQL, PostgreSQL, Supabase, InMemory)
  - Updated WebSocket initial load to use pagination
  - Maintained backward compatibility (when page/limit not provided, returns first 100 entries)
  - Updated all tests to work with new pagination format

  **Storage Changes:**
  - LibSQL: Added LIMIT/OFFSET support
  - PostgreSQL: Added pagination with proper SQL queries
  - Supabase: Used `.range()` method for efficient pagination
  - InMemory: Implemented array slicing with total count

  This improves performance for agents with extensive history and provides better UX for viewing agent execution history.

- [`90a1316`](https://github.com/VoltAgent/voltagent/commit/90a131622a876c0d91e1b9046a5e1fc143fef6b5) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: improve code quality with biome linting and package configuration enhancements

  This update focuses on improving code quality and package configuration across the entire VoltAgent monorepo:

  **Key improvements:**
  - **Biome Linting**: Fixed numerous linting issues identified by Biome across all packages, ensuring consistent code style and catching potential bugs
  - **Package Configuration**: Added `publint` script to all packages for strict validation of package.json files to ensure proper publishing configuration
  - **TypeScript Exports**: Fixed `typesVersions` structure in @voltagent/internal package and removed duplicate entries
  - **Test Utilities**: Refactored `createTrackedStorage` function in core package by simplifying its API - removed the `testName` parameter for cleaner test setup
  - **Type Checking**: Enabled `attw` (Are The Types Wrong) checking to ensure TypeScript types are correctly exported

  These changes improve the overall maintainability and reliability of the VoltAgent framework without affecting the public API.

- [#447](https://github.com/VoltAgent/voltagent/pull/447) [`71500c5`](https://github.com/VoltAgent/voltagent/commit/71500c5368cce3ed4aacfb0fb2749752bf71badd) Thanks [@zrosenbauer](https://github.com/zrosenbauer)! - feat: (experimental) Allow for dynamic `andAll` steps when using the `createWorkflow` API.

  ### Usage

  You can now provide a function to the `steps` property of `andAll` to dynamically generate the steps.

  > [!NOTE]
  > This is an experimental feature and may change in the future, its only supported for `andAll` steps in the `createWorkflow` API.

  ```typescript
  const workflow = createWorkflow(
    {
      id: "my-workflow",
      name: "My Workflow",
      input: z.object({
        id: z.string(),
      }),
      result: z.object({
        name: z.string(),
      }),
      memory,
    },
    andThen({
      id: "fetch-data",
      name: "Fetch data",
      execute: async ({ data }) => {
        return request.get(`https://api.example.com/data/${data.id}`);
      },
    }),
    andAll({
      id: "transform-data",
      name: "Transform data",
      steps: async (context) =>
        context.data.map((item) =>
          andThen({
            id: `transform-${item.id}`,
            name: `Transform ${item.id}`,
            execute: async ({ data }) => {
              return {
                ...item,
                name: [item.name, item.id].join("-"),
              };
            },
          })
        ),
    }),
    andThen({
      id: "pick-data",
      name: "Pick data",
      execute: async ({ data }) => {
        return {
          name: data[0].name,
        };
      },
    })
  );
  ```

- [#452](https://github.com/VoltAgent/voltagent/pull/452) [`6cc552a`](https://github.com/VoltAgent/voltagent/commit/6cc552ada896b1a8344976c46a08b53d2b3a5743) Thanks [@zrosenbauer](https://github.com/zrosenbauer)! - fix: Expose the `andWorkflow` function as it was built but not re-exported

- Updated dependencies [[`90a1316`](https://github.com/VoltAgent/voltagent/commit/90a131622a876c0d91e1b9046a5e1fc143fef6b5)]:
  - @voltagent/internal@0.0.7

## 0.1.72

### Patch Changes

- [#445](https://github.com/VoltAgent/voltagent/pull/445) [`a658ae6`](https://github.com/VoltAgent/voltagent/commit/a658ae6fd5ae404448a43026f21bfa0351189f01) Thanks [@zrosenbauer](https://github.com/zrosenbauer)! - fix: Fixed types in andAll and andRace where the inferred result from the steps was NOT being passed along

## 0.1.71

### Patch Changes

- [#438](https://github.com/VoltAgent/voltagent/pull/438) [`99fe836`](https://github.com/VoltAgent/voltagent/commit/99fe83662e9b3e550380fce066521a5c27d69eb3) Thanks [@danielyogel](https://github.com/danielyogel)! - feat: add optional outputSchema validation for tools

  VoltAgent now supports optional output schema validation for tools, providing runtime type safety and enabling LLM self-correction when tool outputs don't match expected formats.

  **Key Features:**
  - **Optional Output Schema**: Tools can now define an `outputSchema` using Zod schemas
  - **Runtime Validation**: Tool outputs are validated against the schema when provided
  - **LLM Error Recovery**: Validation errors are returned to the LLM instead of throwing, allowing it to retry with corrected output
  - **Full Backward Compatibility**: Existing tools without output schemas continue to work as before
  - **TypeScript Type Safety**: Output types are inferred from schemas when provided

  **Usage Example:**

  ```typescript
  import { createTool } from "@voltagent/core";
  import { z } from "zod";

  // Define output schema
  const weatherOutputSchema = z.object({
    temperature: z.number(),
    condition: z.enum(["sunny", "cloudy", "rainy", "snowy"]),
    humidity: z.number().min(0).max(100),
  });

  // Create tool with output validation
  const weatherTool = createTool({
    name: "getWeather",
    description: "Get current weather",
    parameters: z.object({
      location: z.string(),
    }),
    outputSchema: weatherOutputSchema, // Optional
    execute: async ({ location }) => {
      // Return value will be validated
      return {
        temperature: 22,
        condition: "sunny",
        humidity: 65,
      };
    },
  });
  ```

  **Validation Behavior:**

  When a tool with `outputSchema` is executed:
  1. The output is validated against the schema
  2. If validation succeeds, the validated output is returned
  3. If validation fails, an error object is returned to the LLM:
     ```json
     {
       "error": true,
       "message": "Output validation failed: Expected number, received string",
       "validationErrors": [...],
       "actualOutput": {...}
     }
     ```
  4. The LLM can see the error and potentially fix it by calling the tool again

  This feature enhances tool reliability while maintaining the flexibility for LLMs to handle validation errors gracefully.

## 0.1.70

### Patch Changes

- [#400](https://github.com/VoltAgent/voltagent/pull/400) [`57825dd`](https://github.com/VoltAgent/voltagent/commit/57825ddb359177b5abc3696f3c54e5fc873ea621) Thanks [@zrosenbauer](https://github.com/zrosenbauer)! - feat(core): Add in new `andWorkflow` step to allow for running a workflow from another workflow

- [#436](https://github.com/VoltAgent/voltagent/pull/436) [`89e4ef1`](https://github.com/VoltAgent/voltagent/commit/89e4ef1f0e84f3f42bb208cf70f39cca0898ddc7) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: make tool errors non-fatal for better agent resilience - #430 & #349

  Previously, when tools encountered errors (timeouts, connection issues, etc.), the entire agent execution would fail. This change improves resilience by:
  - Catching tool execution errors and returning them as structured results instead of throwing
  - Allowing the LLM to see tool errors and decide whether to retry or use alternative approaches
  - Including error details (message and stack trace) in the tool result for debugging
  - Ensuring agent execution only fails when it reaches maxSteps or the LLM cannot proceed

  The error result format includes:

  ```json
  {
    "error": true,
    "message": "Error message",
    "stack": "Error stack trace (optional)"
  }
  ```

  This change makes agents more robust when dealing with unreliable external tools or transient network issues.

## 0.1.69

### Patch Changes

- [#425](https://github.com/VoltAgent/voltagent/pull/425) [`8605e70`](https://github.com/VoltAgent/voltagent/commit/8605e708d17e6fa0150bd13235e795288422c52b) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add Promise-based properties and warnings to AI responses - #422

  Enhanced AI response types to align with Vercel AI SDK's API and provide better metadata:

  **For `streamObject`:**
  - Added optional `object?: Promise<T>` property that resolves to the final generated object
  - Added optional `usage?: Promise<UsageInfo>` property that resolves to token usage information
  - Added optional `warnings?: Promise<any[] | undefined>` property for provider warnings

  **For `streamText`:**
  - Added optional `text?: Promise<string>` property that resolves to the full generated text
  - Added optional `finishReason?: Promise<string>` property that resolves to the reason generation stopped
  - Added optional `usage?: Promise<UsageInfo>` property that resolves to token usage information
  - Added optional `reasoning?: Promise<string | undefined>` property that resolves to model's reasoning text

  **For `generateText` and `generateObject`:**
  - Added optional `reasoning?: string` property for model's reasoning text (generateText only)
  - Added optional `warnings?: any[]` property for provider warnings

  These properties are optional to maintain backward compatibility. Providers that support these features (like Vercel AI) now return these values, allowing users to access rich metadata:

  ```typescript
  // For streamObject
  const response = await agent.streamObject(input, schema);
  const finalObject = await response.object; // Promise<T>
  const usage = await response.usage; // Promise<UsageInfo>

  // For streamText
  const response = await agent.streamText(input);
  const fullText = await response.text; // Promise<string>
  const usage = await response.usage; // Promise<UsageInfo>

  // For generateText
  const response = await agent.generateText(input);
  console.log(response.warnings); // Any provider warnings
  console.log(response.reasoning); // Model's reasoning (if available)
  ```

## 0.1.68

### Patch Changes

- [#423](https://github.com/VoltAgent/voltagent/pull/423) [`089c039`](https://github.com/VoltAgent/voltagent/commit/089c03993e3b9e05655a1108355e7bee940d33a7) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add message type filtering support to memory storage implementations

  Added the ability to filter messages by type when retrieving conversation history. This enhancement allows the framework to distinguish between different message types (text, tool-call, tool-result) and retrieve only the desired types, improving context preparation for LLMs.

  ## Key Changes
  - **MessageFilterOptions**: Added optional `types` parameter to filter messages by type
  - **prepareConversationContext**: Now filters to only include text messages, excluding tool-call and tool-result messages for cleaner LLM context
  - **All storage implementations**: Added database-level filtering for better performance

  ## Usage

  ```typescript
  // Get only text messages
  const textMessages = await memory.getMessages({
    userId: "user-123",
    conversationId: "conv-456",
    types: ["text"],
  });

  // Get tool-related messages
  const toolMessages = await memory.getMessages({
    userId: "user-123",
    conversationId: "conv-456",
    types: ["tool-call", "tool-result"],
  });

  // Get all messages (default behavior - backward compatible)
  const allMessages = await memory.getMessages({
    userId: "user-123",
    conversationId: "conv-456",
  });
  ```

  ## Implementation Details
  - **InMemoryStorage**: Filters messages in memory after retrieval
  - **LibSQLStorage**: Adds SQL WHERE clause with IN operator for type filtering
  - **PostgreSQL**: Uses parameterized IN clause with proper parameter counting
  - **Supabase**: Utilizes query builder's `.in()` method for type filtering

  This change ensures that `prepareConversationContext` provides cleaner, more focused context to LLMs by excluding intermediate tool execution details, while maintaining full backward compatibility for existing code.

## 0.1.67

### Patch Changes

- [#417](https://github.com/VoltAgent/voltagent/pull/417) [`67450c3`](https://github.com/VoltAgent/voltagent/commit/67450c3bc4306ab6021ca8feed2afeef6dcc320e) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: dynamic toolkit resolution and VoltOps UI visibility

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

- [#418](https://github.com/VoltAgent/voltagent/pull/418) [`aa024c1`](https://github.com/VoltAgent/voltagent/commit/aa024c1a7c643b2aff7a5fd0d150c87f8a9a1858) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: memory storage implementations now correctly return the most recent messages when using context limit

  Fixed an issue where memory storage implementations (LibSQL, PostgreSQL, Supabase) were returning the oldest messages instead of the most recent ones when a context limit was specified. This was causing AI agents to lose important recent context in favor of old conversation history.

  **Before:**
  - `contextLimit: 10` returned the first 10 messages (oldest)
  - Agents were working with outdated context

  **After:**
  - `contextLimit: 10` returns the last 10 messages (most recent) in chronological order
  - Agents now have access to the most relevant recent context
  - InMemoryStorage was already working correctly and remains unchanged

  Changes:
  - LibSQLStorage: Modified query to use `ORDER BY DESC` with `LIMIT`, then reverse results
  - PostgreSQL: Modified query to use `ORDER BY DESC` with `LIMIT`, then reverse results
  - Supabase: Modified query to use `ascending: false` with `limit`, then reverse results

  This ensures consistent behavior across all storage implementations where context limits provide the most recent messages, improving AI agent response quality and relevance.

- [#418](https://github.com/VoltAgent/voltagent/pull/418) [`aa024c1`](https://github.com/VoltAgent/voltagent/commit/aa024c1a7c643b2aff7a5fd0d150c87f8a9a1858) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: tool errors now properly recorded in conversation history and allow agent retry - #349

  Fixed critical issues where tool execution errors were halting agent runs and not being recorded in conversation/event history. This prevented agents from retrying failed tool calls and lost important error context.

  **Before:**
  - Tool errors would throw and halt agent execution immediately
  - No error events or steps were recorded in conversation history
  - Agents couldn't learn from or retry after tool failures
  - Error context was lost, making debugging difficult

  **After:**
  - Tool errors are caught and handled gracefully
  - Error events (`tool:error`) are created and persisted
  - Error steps are added to conversation history with full error details
  - Agents can continue execution and retry within `maxSteps` limit
  - Tool lifecycle hooks (onEnd) are properly called even on errors

  Changes:
  - Added `handleToolError` helper method to centralize error handling logic
  - Modified `generateText` to catch and handle tool errors without halting execution
  - Updated `streamText` onError callback to use the same error handling
  - Ensured tool errors are saved to memory storage for context retention

  This improves agent resilience and debugging capabilities when working with potentially unreliable tools.

## 0.1.66

### Patch Changes

- [`1f8ce22`](https://github.com/VoltAgent/voltagent/commit/1f8ce226fec449f16f1dce6c2b96cef7030eff3a) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: zod peer dependency to allow flexible versioning (^3.24.2 instead of 3.24.2) to resolve npm install conflicts

## 0.1.65

### Patch Changes

- [#404](https://github.com/VoltAgent/voltagent/pull/404) [`809bd13`](https://github.com/VoltAgent/voltagent/commit/809bd13c5fce7b2afdb0f0d934cc5a21d3e77726) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: integrate comprehensive logging system with @voltagent/logger support

  Enhanced the core package with a flexible logging infrastructure that supports both the built-in ConsoleLogger and the advanced @voltagent/logger package. This update provides better debugging, monitoring, and observability capabilities across all VoltAgent components.

  **Key Changes:**
  - **Logger Integration**: VoltAgent, Agents, and Workflows now accept a logger instance for centralized logging
  - **Default ConsoleLogger**: Built-in logger for quick prototyping with basic timestamp formatting
  - **Logger Propagation**: Parent loggers automatically create child loggers for agents and workflows
  - **Context Preservation**: Child loggers maintain context (component names, IDs) throughout execution
  - **Environment Variables**: Support for `VOLTAGENT_LOG_LEVEL` and `LOG_LEVEL` environment variables
  - **Backward Compatible**: Existing code works without changes, using the default ConsoleLogger

  **Installation:**

  ```bash
  # npm
  npm install @voltagent/logger

  # pnpm
  pnpm add @voltagent/logger

  # yarn
  yarn add @voltagent/logger
  ```

  **Usage Examples:**

  ```typescript
  // Using default ConsoleLogger
  const voltAgent = new VoltAgent({ agents: [agent] });

  // Using @voltagent/logger for production
  import { createPinoLogger } from "@voltagent/logger";

  const logger = createPinoLogger({ level: "info" });
  const voltAgent = new VoltAgent({
    logger,
    agents: [agent],
  });
  ```

  This update lays the foundation for comprehensive observability and debugging capabilities in VoltAgent applications.

- Updated dependencies [[`809bd13`](https://github.com/VoltAgent/voltagent/commit/809bd13c5fce7b2afdb0f0d934cc5a21d3e77726)]:
  - @voltagent/internal@0.0.6

## 0.1.64

### Patch Changes

- [`aea3c78`](https://github.com/VoltAgent/voltagent/commit/aea3c78c467e42c53d10ad6c0890514dff861fca) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: replace `npm-check-updates` with native package manager support

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

## 0.1.63

### Patch Changes

- [`6089462`](https://github.com/VoltAgent/voltagent/commit/60894629cef27950021da323390f455098b5bce2) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: prevent duplicate column errors in LibSQL agent_history table initialization

  Fixed a first-time database initialization error where the `migrateAgentHistorySchema` function was attempting to add `userId` and `conversationId` columns that already existed in newly created `agent_history` tables.

  The issue occurred because:
  - The CREATE TABLE statement now includes `userId` and `conversationId` columns by default
  - The migration function was still trying to add these columns, causing "duplicate column name" SQLite errors

  Changes:
  - Added check in `migrateAgentHistorySchema` to skip migration if both columns already exist
  - Properly set migration flag to prevent unnecessary migration attempts
  - Ensured backward compatibility for older databases that need the migration

## 0.1.62

### Patch Changes

- [`6fadbb0`](https://github.com/VoltAgent/voltagent/commit/6fadbb098fe40d8b658aa3386e6126fea155f117) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: createAsyncIterableStream import issue

- Updated dependencies [[`6fadbb0`](https://github.com/VoltAgent/voltagent/commit/6fadbb098fe40d8b658aa3386e6126fea155f117)]:
  - @voltagent/internal@0.0.5

## 0.1.61

### Patch Changes

- [#391](https://github.com/VoltAgent/voltagent/pull/391) [`57c4874`](https://github.com/VoltAgent/voltagent/commit/57c4874d4d4807c50242b2e34ab9574fc6129888) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: improve workflow execute API with context-based pattern

  Breaking change: The workflow execute functions now use a context-based API for better developer experience and extensibility.

  **Before:**

  ```typescript
  .andThen({
    execute: async (data, state) => {
      // old API with separate parameters
      return { ...data, processed: true };
    }
  })
  ```

  **After:**

  ```typescript
  .andThen({
    execute: async ({ data, state, getStepData }) => {
      // new API with context object
      const previousStep = getStepData("step-id");
      return { ...data, processed: true };
    }
  })
  ```

  This change applies to:
  - `andThen` execute functions
  - `andAgent` prompt functions
  - `andWhen` condition functions
  - `andTap` execute functions

  The new API provides:
  - Better TypeScript inference
  - Access to previous step data via `getStepData`
  - Cleaner, more extensible design

- [#399](https://github.com/VoltAgent/voltagent/pull/399) [`da66f86`](https://github.com/VoltAgent/voltagent/commit/da66f86d92a278007c2d3386d22b482fa70d93ff) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add suspend/resume functionality for workflows

  **Workflows can now be paused and resumed!** Perfect for human-in-the-loop processes, waiting for external events, or managing long-running operations.

  ## Two Ways to Suspend

  ### 1. Internal Suspension (Inside Steps)

  ```typescript
  const approvalWorkflow = createWorkflowChain({
    id: "simple-approval",
    name: "Simple Approval",
    input: z.object({ item: z.string() }),
    result: z.object({ approved: z.boolean() }),
  }).andThen({
    id: "wait-for-approval",
    execute: async ({ data, suspend, resumeData }) => {
      // If resuming, return the decision
      if (resumeData) {
        return { approved: resumeData.approved };
      }

      // Otherwise suspend and wait
      await suspend("Waiting for approval");
    },
  });

  // Run and resume
  const execution = await approvalWorkflow.run({ item: "New laptop" });
  const result = await execution.resume({ approved: true });
  ```

  ### 2. External Suspension (From Outside)

  ```typescript
  import { createSuspendController } from "@voltagent/core";

  // Create controller
  const controller = createSuspendController();

  // Run workflow with controller
  const execution = await workflow.run(input, {
    suspendController: controller,
  });

  // Pause from outside (e.g., user clicks pause)
  controller.suspend("User paused workflow");

  // Resume later
  if (execution.status === "suspended") {
    const result = await execution.resume();
  }
  ```

  ## Key Features
  - ⏸️ **Internal suspension** with `await suspend()` inside steps
  - 🎮 **External control** with `createSuspendController()`
  - 📝 **Type-safe resume data** with schemas
  - 💾 **State persists** across server restarts
  - 🚀 **Simplified API** - just pass `suspendController`, no need for separate `signal`

  📚 **For detailed documentation: [https://voltagent.dev/docs/workflows/suspend-resume](https://voltagent.dev/docs/workflows/suspend-resume)**

- [#401](https://github.com/VoltAgent/voltagent/pull/401) [`4a7145d`](https://github.com/VoltAgent/voltagent/commit/4a7145debd66c7b1dfb953608e400b6c1ed02db7) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: resolve TypeScript performance issues by fixing Zod dependency configuration (#377)

  Moved Zod from direct dependencies to peer dependencies in @voltagent/vercel-ai to prevent duplicate Zod installations that were causing TypeScript server slowdowns. Also standardized Zod versions across the workspace to ensure consistency.

  Changes:
  - @voltagent/vercel-ai: Moved `zod` from dependencies to peerDependencies
  - @voltagent/docs-mcp: Updated `zod` from `^3.23.8` to `3.24.2`
  - @voltagent/with-postgres: Updated `zod` from `^3.24.2` to `3.24.2` (removed caret)

  This fix significantly improves TypeScript language server performance by ensuring only one Zod version is processed, eliminating the "Type instantiation is excessively deep and possibly infinite" errors that users were experiencing.

## 0.1.60

### Patch Changes

- [#371](https://github.com/VoltAgent/voltagent/pull/371) [`6ddedc2`](https://github.com/VoltAgent/voltagent/commit/6ddedc2b9be9c3dc4978dc53198a43c2cba74945) Thanks [@omeraplak](https://github.com/omeraplak)! - This update adds a powerful, type-safe workflow engine to `@voltagent/core`. You can now build complex, multi-step processes that chain together your code, AI models, and conditional logic with full type-safety and built-in observability.

  Here is a quick example of what you can build:

  ```typescript
  import { createWorkflowChain, Agent, VoltAgent } from "@voltagent/core";
  import { z } from "zod";
  import { VercelAIProvider } from "@voltagent/vercel-ai";
  import { openai } from "@ai-sdk/openai";

  // Define an agent to use in the workflow
  const analyzerAgent = new Agent({
    name: "Analyzer",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
    instructions: "You are a text analyzer.",
  });

  // 1. Define the workflow chain
  const workflow = createWorkflowChain({
    id: "greeting-analyzer",
    name: "Greeting Analyzer",
    input: z.object({ name: z.string() }),
    result: z.object({ greeting: z.string(), sentiment: z.string() }),
  })
    .andThen({
      id: "create-greeting",
      execute: async ({ name }) => ({ greeting: `Hello, ${name}!` }),
    })
    .andAgent(
      (data) => `Analyze the sentiment of this greeting: "${data.greeting}"`,
      analyzerAgent,
      {
        schema: z.object({ sentiment: z.string().describe("e.g., positive") }),
      }
    );

  // You can run the chain directly
  const result = await workflow.run({ name: "World" });
  ```

  To make your workflow runs visible in the **VoltOps Console** for debugging and monitoring, register both the workflow and its agents with a `VoltAgent` instance:

  ![VoltOps Workflow Observability](https://cdn.voltagent.dev/docs/workflow-observability-demo.gif)

  ```typescript
  // 2. Register the workflow and agent to enable observability
  new VoltAgent({
    agents: {
      analyzerAgent,
    },
    workflows: {
      workflow,
    },
  });

  // Now, when you run the workflow, its execution will appear in VoltOps.
  await workflow.run({ name: "Alice" });
  ```

  This example showcases the fluent API, data flow between steps, type-safety, and integration with Agents, which are the core pillars of this new feature.

## 0.1.59

### Patch Changes

- [#382](https://github.com/VoltAgent/voltagent/pull/382) [`86acef0`](https://github.com/VoltAgent/voltagent/commit/86acef01dd6ce2e213b13927136c32bcf1078484) Thanks [@zrosenbauer](https://github.com/zrosenbauer)! - fix: Allow workflow.run to accept userContext, conversationId, and userId and pass along to all steps & agents

- [#375](https://github.com/VoltAgent/voltagent/pull/375) [`1f55501`](https://github.com/VoltAgent/voltagent/commit/1f55501ec7a221002c11a3a0e87779c8f1379bed) Thanks [@SashankMeka1](https://github.com/SashankMeka1)! - feat(core): MCPServerConfig timeouts - #363.

  Add MCPServerConfig timeouts

  ```ts
  const mcpConfig = new MCPConfiguration({
    servers: {
      filesystem: {
        type: "stdio",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-filesystem", path.resolve("./data")],
        timeout: 10000,
      },
    },
  });
  ```

- [#385](https://github.com/VoltAgent/voltagent/pull/385) [`bfb13c3`](https://github.com/VoltAgent/voltagent/commit/bfb13c390a8ff59ad61a08144a5f6fa0439d25b7) Thanks [@zrosenbauer](https://github.com/zrosenbauer)! - fix(core): Add back the result for a workflow execution, as the result was removed due to change in state management process

- [#384](https://github.com/VoltAgent/voltagent/pull/384) [`757219c`](https://github.com/VoltAgent/voltagent/commit/757219cc76e7f0320074230788012714f91e81bb) Thanks [@zrosenbauer](https://github.com/zrosenbauer)! - feat(core): Add ability to pass hooks into the generate functions (i.e. streamText) that do not update/mutate the agent hooks

  ### Usage

  ```ts
  const agent = new Agent({
    name: "My Agent with Hooks",
    instructions: "An assistant demonstrating hooks",
    llm: provider,
    model: openai("gpt-4o"),
    hooks: myAgentHooks,
  });

  // both the myAgentHooks and the hooks passed in the generateText method will be called
  await agent.generateText("Hello, how are you?", {
    hooks: {
      onEnd: async ({ context }) => {
        console.log("End of generation but only on this invocation!");
      },
    },
  });
  ```

- [#381](https://github.com/VoltAgent/voltagent/pull/381) [`b52cdcd`](https://github.com/VoltAgent/voltagent/commit/b52cdcd2d8072fa93011e14c41841b6ff8a97b0b) Thanks [@zrosenbauer](https://github.com/zrosenbauer)! - feat: Add ability to tap into workflow without mutating the data by adding the `andTap` step

  ### Usage

  The andTap step is useful when you want to tap into the workflow without mutating the data, for example:

  ```ts
  const workflow = createWorkflowChain(config)
    .andTap({
      execute: async (data) => {
        console.log("🔄 Translating text:", data);
      },
    })
    .andTap({
      id: "sleep",
      execute: async (data) => {
        console.log("🔄 Sleeping for 1 second");
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return data;
      },
    })
    .andThen({
      execute: async (data) => {
        return { ...data, translatedText: data.translatedText };
      },
    })
    .run({
      originalText: "Hello, world!",
      targetLanguage: "en",
    });
  ```

  You will notice that the `andTap` step is not included in the result, BUT it is `awaited` and `executed` before the next step, so you can block processing safely if needed.

## 0.1.58

### Patch Changes

- [#342](https://github.com/VoltAgent/voltagent/pull/342) [`8448674`](https://github.com/VoltAgent/voltagent/commit/84486747b1b40eaca315b900c56fd2ad976780ea) Thanks [@zrosenbauer](https://github.com/zrosenbauer)! - feat: add Workflow support (alpha)

  **🧪 ALPHA FEATURE: Workflow orchestration system is now available for early testing.** This feature allows you to create complex, multi-step agent workflows with chaining API and conditional branching. The API is experimental and may change in future releases.

  ## 📋 Usage

  **Basic Workflow Chain Creation:**

  ```typescript
  import { openai } from "@ai-sdk/openai";
  import { Agent, VoltAgent, createWorkflowChain } from "@voltagent/core";
  import { VercelAIProvider } from "@voltagent/vercel-ai";
  import { z } from "zod";

  // Create workflow agents
  const analyzerAgent = new Agent({
    name: "DataAnalyzer",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
    instructions: "Analyze input data and extract key insights with confidence scores",
  });

  const processorAgent = new Agent({
    name: "DataProcessor",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
    instructions: "Process and transform analyzed data into structured format",
  });

  const reporterAgent = new Agent({
    name: "ReportGenerator",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
    instructions: "Generate comprehensive reports from processed data",
  });

  // Create workflow chain
  const dataProcessingWorkflow = createWorkflowChain({
    id: "data-processing-workflow",
    name: "Data Processing Pipeline",
    purpose: "Analyze, process, and generate reports from raw data",
    input: z.object({
      rawData: z.string(),
      analysisType: z.string(),
    }),
    result: z.object({
      originalData: z.string(),
      analysisResults: z.object({
        insights: z.array(z.string()),
        confidence: z.number().min(0).max(1),
      }),
      processedData: z.object({
        summary: z.string(),
        keyPoints: z.array(z.string()),
      }),
      finalReport: z.string(),
      processingTime: z.number(),
    }),
  })
    .andAgent(
      async (data) => {
        return `Analyze the following data: ${data.rawData}. Focus on ${data.analysisType} analysis.`;
      },
      analyzerAgent,
      {
        schema: z.object({
          insights: z.array(z.string()),
          confidence: z.number().min(0).max(1),
        }),
      }
    )
    .andThen({
      execute: async (data, state) => {
        // Skip processing if confidence is too low
        if (data.confidence < 0.5) {
          throw new Error(`Analysis confidence too low: ${data.confidence}`);
        }
        return {
          analysisResults: data,
          originalData: state.input.rawData,
        };
      },
    })
    .andAgent(
      async (data, state) => {
        return `Process these insights: ${JSON.stringify(data.analysisResults.insights)}`;
      },
      processorAgent,
      {
        schema: z.object({
          summary: z.string(),
          keyPoints: z.array(z.string()),
        }),
      }
    )
    .andAgent(
      async (data, state) => {
        return `Generate a final report based on: ${JSON.stringify(data)}`;
      },
      reporterAgent,
      {
        schema: z.object({
          finalReport: z.string(),
        }),
      }
    )
    .andThen({
      execute: async (data, state) => {
        return {
          ...data,
          processingTime: Date.now() - state.startAt.getTime(),
        };
      },
    });

  // Execute workflow
  const result = await dataProcessingWorkflow.run({
    rawData: "User input data...",
    analysisType: "sentiment",
  });

  console.log(result.analysisResults); // Analysis results
  console.log(result.finalReport); // Generated report
  ```

  **Conditional Logic Example:**

  ```typescript
  const conditionalWorkflow = createWorkflowChain({
    id: "conditional-workflow",
    name: "Smart Processing Pipeline",
    purpose: "Process data based on complexity level",
    input: z.object({
      data: z.string(),
    }),
    result: z.object({
      complexity: z.string(),
      processedData: z.string(),
      processingMethod: z.string(),
    }),
  })
    .andAgent(
      async (data) => {
        return `Analyze complexity of: ${data.data}`;
      },
      validatorAgent,
      {
        schema: z.object({
          complexity: z.enum(["low", "medium", "high"]),
        }),
      }
    )
    .andThen({
      execute: async (data, state) => {
        // Route to different processing based on complexity
        if (data.complexity === "low") {
          return { ...data, processingMethod: "simple" };
        } else {
          return { ...data, processingMethod: "advanced" };
        }
      },
    })
    .andAgent(
      async (data, state) => {
        if (data.processingMethod === "simple") {
          return `Simple processing for: ${state.input.data}`;
        } else {
          return `Advanced processing for: ${state.input.data}`;
        }
      },
      data.processingMethod === "simple" ? simpleProcessor : advancedProcessor,
      {
        schema: z.object({
          processedData: z.string(),
        }),
      }
    );
  ```

  **⚠️ Alpha Limitations:**
  - **NOT READY FOR PRODUCTION** - This is an experimental feature
  - Visual flow UI integration is in development
  - Error handling and recovery mechanisms are basic
  - Performance optimizations pending
  - **API may change significantly** based on community feedback
  - Limited documentation and examples

  **🤝 Help Shape Workflows:**
  We need your feedback to make Workflows awesome! The API will evolve based on real-world usage and community input.
  - 💬 **[Join our Discord](https://s.voltagent.dev/discord)**: Share ideas, discuss use cases, and get help
  - 🐛 **[GitHub Issues](https://github.com/VoltAgent/voltagent/issues)**: Report bugs, request features, or suggest improvements
  - 🚀 **Early Adopters**: Build experimental projects and share your learnings
  - 📝 **API Feedback**: Tell us what's missing, confusing, or could be better

  **🔄 Future Plans:**
  - React Flow integration for visual workflow editor
  - Advanced error handling and retry mechanisms
  - Workflow templates and presets
  - Real-time execution monitoring
  - Comprehensive documentation and tutorials

## 0.1.57

### Patch Changes

- [`894be7f`](https://github.com/VoltAgent/voltagent/commit/894be7feb97630c10e036cf3691974a5e351472c) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: export PromptContent type to resolve "cannot be named" TypeScript error

## 0.1.56

### Patch Changes

- [#351](https://github.com/VoltAgent/voltagent/pull/351) [`f8f8d04`](https://github.com/VoltAgent/voltagent/commit/f8f8d04340d6f9609450f6ae000c9fe1d71072d7) Thanks [@alasano](https://github.com/alasano)! - fix: add historyMemory option to Agent configuration

## 0.1.55

### Patch Changes

- [#352](https://github.com/VoltAgent/voltagent/pull/352) [`b7dcded`](https://github.com/VoltAgent/voltagent/commit/b7dcdedfbbdda5bfb1885317b59b4d4e2495c956) Thanks [@alasano](https://github.com/alasano)! - fix(core): store and use userContext from Agent constructor

- [#345](https://github.com/VoltAgent/voltagent/pull/345) [`822739c`](https://github.com/VoltAgent/voltagent/commit/822739c901bbc679cd11dd2c9df99cd041fc40c7) Thanks [@thujee](https://github.com/thujee)! - fix: moves zod from direct to dev dependency to avoid version conflicts in consuming app

## 0.1.54

### Patch Changes

- [#346](https://github.com/VoltAgent/voltagent/pull/346) [`5100f7f`](https://github.com/VoltAgent/voltagent/commit/5100f7f9419db7e26aa18681b0ad3c09c0957b10) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: export PromptContent type to resolve "cannot be named" TypeScript error

  Fixed a TypeScript compilation error where users would get "cannot be named" errors when exporting variables that use `InstructionsDynamicValue` type. This occurred because `InstructionsDynamicValue` references `PromptContent` type, but `PromptContent` was not being re-exported from the public API.

  **Before:**

  ```typescript
  export type { DynamicValueOptions, DynamicValue, PromptHelper };
  ```

  **After:**

  ```typescript
  export type { DynamicValueOptions, DynamicValue, PromptHelper, PromptContent };
  ```

  This ensures that all types referenced by public API types are properly exported, preventing TypeScript compilation errors when users export agents or variables that use dynamic instructions.

## 0.1.53

### Patch Changes

- [#343](https://github.com/VoltAgent/voltagent/pull/343) [`096bda4`](https://github.com/VoltAgent/voltagent/commit/096bda41d5333e110da2c034e57f60b4ce7b9076) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: extend SubAgent functionality with support for multiple execution methods and flexible configuration API

  **SubAgent functionality has been significantly enhanced to support all four agent execution methods (generateText, streamText, generateObject, streamObject) with flexible per-subagent configuration.** Previously, SubAgents only supported `streamText` method. Now you can configure each SubAgent to use different execution methods with custom options and schemas.

  ## 📋 Usage

  **New SubAgent API with createSubagent():**

  ```typescript
  import { Agent, createSubagent } from "@voltagent/core";
  import { VercelAIProvider } from "@voltagent/vercel-ai";
  import { openai } from "@ai-sdk/openai";
  import { z } from "zod";

  // Define schemas for structured output
  const analysisSchema = z.object({
    summary: z.string(),
    keyFindings: z.array(z.string()),
    confidence: z.number().min(0).max(1),
  });

  const reportSchema = z.object({
    title: z.string(),
    sections: z.array(
      z.object({
        heading: z.string(),
        content: z.string(),
        priority: z.enum(["high", "medium", "low"]),
      })
    ),
  });

  // Create specialized subagents
  const dataAnalyst = new Agent({
    name: "DataAnalyst",
    instructions: "Analyze data and provide structured insights",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
  });

  const reportGenerator = new Agent({
    name: "ReportGenerator",
    instructions: "Generate comprehensive reports",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
  });

  const summaryWriter = new Agent({
    name: "SummaryWriter",
    instructions: "Create concise summaries",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
  });

  // Supervisor with enhanced SubAgent configuration
  const supervisor = new Agent({
    name: "AdvancedSupervisor",
    instructions: "Coordinate specialized agents with different methods",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
    subAgents: [
      // ✅ OLD STYLE: Direct agent (defaults to streamText) - still supported
      summaryWriter,

      // ✅ NEW STYLE: generateObject with schema
      createSubagent({
        agent: dataAnalyst,
        method: "generateObject",
        schema: analysisSchema,
        options: {
          temperature: 0.3, // Precise analysis
          maxTokens: 1500,
        },
      }),

      // ✅ NEW STYLE: streamObject with schema
      createSubagent({
        agent: reportGenerator,
        method: "streamObject",
        schema: reportSchema,
        options: {
          temperature: 0.5,
          maxTokens: 2000,
        },
      }),

      // ✅ NEW STYLE: generateText with custom options
      createSubagent({
        agent: summaryWriter,
        method: "generateText",
        options: {
          temperature: 0.7, // Creative writing
          maxTokens: 800,
        },
      }),
    ],
  });
  ```

  **Backward Compatibility:**

  ```typescript
  // ✅ OLD STYLE: Still works (defaults to streamText)
  const supervisor = new Agent({
    name: "Supervisor",
    subAgents: [agent1, agent2, agent3], // Direct Agent instances
    // ... other config
  });
  ```

- [#344](https://github.com/VoltAgent/voltagent/pull/344) [`5d908c5`](https://github.com/VoltAgent/voltagent/commit/5d908c5a83569848c91d86c5ecfcd3d4d4ffae42) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add supervisorConfig API for customizing supervisor agent behavior

  **SupervisorConfig API enables complete control over supervisor agent system messages and behavior** when working with SubAgents, allowing users to customize guidelines, override system messages, and control memory inclusion.

  ## 🎯 What's New

  **🚀 SupervisorConfig API:**

  ```typescript
  const supervisor = new Agent({
    name: "Custom Supervisor",
    instructions: "Coordinate specialized tasks",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
    subAgents: [writerAgent, editorAgent],

    supervisorConfig: {
      // Complete system message override
      systemMessage: "You are TaskBot. Use delegate_task to assign work.",

      // Add custom rules to default guidelines
      customGuidelines: ["Always verify sources", "Include confidence levels"],

      // Control memory inclusion (default: true)
      includeAgentsMemory: false,
    },
  });
  ```

  ## 🔧 Configuration Options
  - **`systemMessage`**: Complete system message override - replaces default template
  - **`customGuidelines`**: Add custom rules to default supervisor guidelines
  - **`includeAgentsMemory`**: Control whether previous agent interactions are included

- [#340](https://github.com/VoltAgent/voltagent/pull/340) [`ef778c5`](https://github.com/VoltAgent/voltagent/commit/ef778c543acb229edd049da2e7bbed2ae5fe40cf) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: separate conversation memory from history storage when memory: false

  When `memory: false` is set, conversation memory and user messages should be disabled, but history storage and timeline events should continue working. Previously, both conversation memory and history storage were being disabled together.

  **Before:**

  ```typescript
  const agent = new Agent({
    name: "TestAgent",
    instructions: "You are a helpful assistant",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
    memory: false, // ❌ Disabled both conversation memory AND history storage
  });

  // Result: No conversation context + No history/events tracking
  ```

  **After:**

  ```typescript
  const agent = new Agent({
    name: "TestAgent",
    instructions: "You are a helpful assistant",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
    memory: false, // ✅ Disables only conversation memory, history storage remains active
  });

  // Result: No conversation context + History/events tracking still works
  ```

  **What this means for users:**
  - ✅ `memory: false` now only disables conversation memory (user messages and context)
  - ✅ History storage and timeline events continue to work for debugging and observability
  - ✅ Agent interactions are still tracked in VoltAgent Console
  - ✅ Tools and sub-agents can still access operation context and history

  This change improves the observability experience while maintaining the expected behavior of disabling conversation memory when `memory: false` is set.

  Fixes the issue where setting `memory: false` would prevent history and events from being tracked in the VoltAgent Console.

## 0.1.52

### Patch Changes

- [#338](https://github.com/VoltAgent/voltagent/pull/338) [`3e9a863`](https://github.com/VoltAgent/voltagent/commit/3e9a8631c0e4774d0623825263040ad3a14c23d0) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: implement configurable maxSteps parameter with parent-child agent inheritance

  **Agents now support configurable maxSteps parameter at the API level, allowing fine-grained control over computational resources. Parent agents automatically pass their effective maxSteps to subagents, ensuring consistent resource management across the agent hierarchy.**

  ## 🎯 What's New

  **🚀 Configurable MaxSteps System**
  - **API-Level Configuration**: Set maxSteps dynamically for any agent call
  - **Agent-Level Defaults**: Configure default maxSteps when creating agents
  - **Automatic Inheritance**: SubAgents automatically inherit parent's effective maxSteps
  - **Configurable Supervisor**: Enhanced supervisor system message generation with agent memory

  ## 📋 Usage Examples

  **API-Level MaxSteps Configuration:**

  ```typescript
  import { Agent, VoltAgent } from "@voltagent/core";
  import { VercelAIProvider } from "@voltagent/vercel-ai";
  import { openai } from "@ai-sdk/openai";

  // Create agent with default maxSteps
  const agent = new Agent({
    name: "AssistantAgent",
    instructions: "Help users with their questions",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
    maxSteps: 10, // Default maxSteps for this agent
  });

  // Usage examples:

  // 1. Use agent's default maxSteps (10)
  const result1 = await agent.generateText("Simple question");

  // 2. Override with API-level maxSteps
  const result2 = await agent.generateText("Complex question", {
    maxSteps: 25, // Override agent's default (10) with API-level (25)
  });

  // 3. Stream with custom maxSteps
  const stream = await agent.streamText("Long conversation", {
    maxSteps: 50, // Allow more steps for complex interactions
  });

  // 4. Generate object with specific maxSteps
  const objectResult = await agent.generateObject("Create structure", schema, {
    maxSteps: 5, // Limit steps for simple object generation
  });
  ```

  **Parent-Child Agent Inheritance:**

  ```typescript
  // Create specialized subagents
  const contentCreator = new Agent({
    name: "ContentCreator",
    instructions: "Create engaging content",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
  });

  const formatter = new Agent({
    name: "Formatter",
    instructions: "Format and style content",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
  });

  // Create supervisor with subagents
  const supervisor = new Agent({
    name: "Supervisor",
    instructions: "Coordinate content creation and formatting",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
    subAgents: [contentCreator, formatter],
    maxSteps: 15, // Agent limit
  });

  // Parent-child inheritance examples:

  // 1. Use supervisor's default maxSteps
  const result1 = await supervisor.generateText("Create a blog post");
  // Supervisor uses: maxSteps: 15
  // SubAgents inherit: maxSteps: 15

  // 2. Override with API-level maxSteps
  const result2 = await supervisor.generateText("Create a blog post", {
    maxSteps: 8, // API-level override
  });
  // Supervisor uses: maxSteps: 8
  // SubAgents inherit: maxSteps: 8

  // 3. Direct subagent calls use their own defaults
  const directResult = await contentCreator.generateText("Create content");
  // Uses contentCreator's own maxSteps or default calculation
  ```

  **REST API Usage:**

  ```bash
  # with generateText
  curl -X POST http://localhost:3141/agents/my-agent-id/generate \
       -H "Content-Type: application/json" \
       -d '{
         "input": "Explain quantum physics",
         "options": {
           "maxSteps": 10,
         }
       }'

  # with streamText
  curl -N -X POST http://localhost:3141/agents/supervisor-agent-id/stream \
       -H "Content-Type: application/json" \
       -d '{
         "input": "Coordinate research and writing workflow",
         "options": {
           "maxSteps": 15,
         }
       }'
  ```

  This enhancement provides fine-grained control over agent computational resources while maintaining backward compatibility with existing agent configurations.

## 0.1.51

### Patch Changes

- [#333](https://github.com/VoltAgent/voltagent/pull/333) [`721372a`](https://github.com/VoltAgent/voltagent/commit/721372a59edab1095ee608488ca96b81326fd1cc) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add abort signal support for operation cancellation

  **Abort Signal Support enables graceful cancellation of agent operations.** Users can now cancel expensive operations when they navigate away or change their minds.

  ## 🎯 Key Features
  - **Stream API Cancellation**: `/stream` and `/stream-object` endpoints now handle client disconnection automatically
  - **Agent Method Support**: All agent methods (`generateText`, `streamText`, `generateObject`, `streamObject`) support abort signals
  - **SubAgent Propagation**: Abort signals cascade through sub-agent hierarchies

  ## 📋 Usage

  ```typescript
  // Create AbortController
  const abortController = new AbortController();

  // Cancel when user navigates away or clicks stop
  window.addEventListener("beforeunload", () => abortController.abort());

  // Stream request with abort signal
  const response = await fetch("http://localhost:3141/agents/my-agent/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: "Write a very long story...",
      options: { maxTokens: 4000 },
    }),
    signal: abortController.signal, // ✅ Automatic cancellation
  });

  // Manual cancellation after 10 seconds
  setTimeout(() => abortController.abort(), 10000);
  ```

  This prevents unnecessary computation and improves resource efficiency.

## 0.1.50

### Patch Changes

- [#329](https://github.com/VoltAgent/voltagent/pull/329) [`9406552`](https://github.com/VoltAgent/voltagent/commit/94065520f51a1743be91c3b5be9ab5370d47f666) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: userContext changes in onEnd hook now properly reflected in final response

  The `userContext` changes made in the `onEnd` hook were not being reflected in the final response from `.generateText()` and `.generateObject()` methods. This was because the userContext snapshot was taken before the `onEnd` hook execution, causing any modifications made within the hook to be lost.

  **Before**:

  ```typescript
  const agent = new Agent({
    name: "TestAgent",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
    hooks: createHooks({
      onEnd: ({ context }) => {
        // This change was lost in the final response
        context.userContext.set("agent_response", "bye");
      },
    }),
  });

  const response = await agent.generateText("Hello", {
    userContext: new Map([["agent_response", "hi"]]),
  });

  console.log(response.userContext?.get("agent_response")); // ❌ "hi" (old value)
  ```

  **After**:

  ```typescript
  const agent = new Agent({
    name: "TestAgent",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
    hooks: createHooks({
      onEnd: ({ context }) => {
        // This change is now preserved in the final response
        context.userContext.set("agent_response", "bye");
      },
    }),
  });

  const response = await agent.generateText("Hello", {
    userContext: new Map([["agent_response", "hi"]]),
  });

  console.log(response.userContext?.get("agent_response")); // ✅ "bye" (updated value)
  ```

## 0.1.49

### Patch Changes

- [#324](https://github.com/VoltAgent/voltagent/pull/324) [`8da1ecc`](https://github.com/VoltAgent/voltagent/commit/8da1eccd0332d1f9037085e16cb0b7d5afaac479) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add enterprise-grade VoltOps Prompt Management platform with team collaboration and analytics

  **VoltOps Prompt Management transforms VoltAgent from a simple framework into an enterprise-grade platform for managing AI prompts at scale.** Think "GitHub for prompts" with built-in team collaboration, version control, environment management, and performance analytics.

  ## 🎯 What's New

  **🚀 VoltOps Prompt Management Platform**
  - **Team Collaboration**: Non-technical team members can edit prompts via web console
  - **Version Control**: Full prompt versioning with commit messages and rollback capabilities
  - **Environment Management**: Promote prompts from development → staging → production with labels
  - **Template Variables**: Dynamic `{{variable}}` substitution with validation
  - **Performance Analytics**: Track prompt effectiveness, costs, and usage patterns

  ## 📋 Usage Examples

  **Basic VoltOps Setup:**

  ```typescript
  import { Agent, VoltAgent, VoltOpsClient } from "@voltagent/core";
  import { VercelAIProvider } from "@voltagent/vercel-ai";
  import { openai } from "@ai-sdk/openai";

  // 1. Initialize VoltOps client
  const voltOpsClient = new VoltOpsClient({
    publicKey: process.env.VOLTAGENT_PUBLIC_KEY,
    secretKey: process.env.VOLTAGENT_SECRET_KEY,
  });

  // 2. Create agent with VoltOps prompts
  const supportAgent = new Agent({
    name: "SupportAgent",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
    instructions: async ({ prompts }) => {
      return await prompts.getPrompt({
        promptName: "customer-support-prompt",
        label: process.env.NODE_ENV === "production" ? "production" : "development",
        variables: {
          companyName: "VoltAgent Corp",
          tone: "friendly and professional",
          supportLevel: "premium",
        },
      });
    },
  });

  // 3. Initialize VoltAgent with global VoltOps client
  const voltAgent = new VoltAgent({
    agents: { supportAgent },
    voltOpsClient: voltOpsClient,
  });
  ```

- [#324](https://github.com/VoltAgent/voltagent/pull/324) [`8da1ecc`](https://github.com/VoltAgent/voltagent/commit/8da1eccd0332d1f9037085e16cb0b7d5afaac479) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: introduce VoltOpsClient as unified replacement for deprecated telemetryExporter

  **VoltOpsClient** is the new unified platform client for VoltAgent that replaces the deprecated `telemetryExporter`.

  ## 📋 Usage

  ```typescript
  import { Agent, VoltAgent, VoltOpsClient } from "@voltagent/core";

  const voltOpsClient = new VoltOpsClient({
    publicKey: process.env.VOLTAGENT_PUBLIC_KEY,
    secretKey: process.env.VOLTAGENT_SECRET_KEY,
    observability: true, // Enable observability - default is true
    prompts: true, // Enable prompt management - default is true
  });

  const voltAgent = new VoltAgent({
    agents: { myAgent },
    voltOpsClient: voltOpsClient, // ✅ New approach
  });
  ```

  ## 🔄 Migration from telemetryExporter

  Replace the deprecated `telemetryExporter` with the new `VoltOpsClient`:

  ```diff
  import { Agent, VoltAgent } from "@voltagent/core";
  - import { VoltAgentExporter } from "@voltagent/core";
  + import { VoltOpsClient } from "@voltagent/core";

  const voltAgent = new VoltAgent({
    agents: { myAgent },
  - telemetryExporter: new VoltAgentExporter({
  + voltOpsClient: new VoltOpsClient({
      publicKey: process.env.VOLTAGENT_PUBLIC_KEY,
      secretKey: process.env.VOLTAGENT_SECRET_KEY,
  -   baseUrl: "https://api.voltagent.dev",
    }),
  });
  ```

  ## ⚠️ Deprecation Notice

  `telemetryExporter` is now **deprecated** and will be removed in future versions:

  ```typescript
  // ❌ Deprecated - Don't use
  new VoltAgent({
    agents: { myAgent },
    telemetryExporter: new VoltAgentExporter({...}), // Deprecated!
  });

  // ✅ Correct approach
  new VoltAgent({
    agents: { myAgent },
    voltOpsClient: new VoltOpsClient({...}),
  });
  ```

  **For migration guide, see:** `/docs/observability/developer-console#migration-guide`

  ## 🔧 Advanced Configuration

  ```typescript
  const voltOpsClient = new VoltOpsClient({
    publicKey: process.env.VOLTAGENT_PUBLIC_KEY,
    secretKey: process.env.VOLTAGENT_SECRET_KEY,
    baseUrl: "https://api.voltagent.dev", // Default
    observability: true, // Enable observability export - default is true
    prompts: false, // Observability only - default is true
    promptCache: {
      enabled: true, // Enable prompt cache - default is true
      ttl: 300, // 5 minute cache - default is 300
      maxSize: 100, // Max size of the cache - default is 100
    },
  });
  ```

- Updated dependencies [[`8da1ecc`](https://github.com/VoltAgent/voltagent/commit/8da1eccd0332d1f9037085e16cb0b7d5afaac479)]:
  - @voltagent/internal@0.0.4

## 0.1.48

### Patch Changes

- [#296](https://github.com/VoltAgent/voltagent/pull/296) [`4621e09`](https://github.com/VoltAgent/voltagent/commit/4621e09118fc652d8a05f40758b02d5108e38967) Thanks [@Ajay-Satish-01](https://github.com/Ajay-Satish-01)! - The `UserContext` was properly propagated through tools and hooks, but was not being returned in the final response from `.generateText()` and `.generateObject()` methods. This prevented post-processing logic from accessing the UserContext data.

  **Before**:

  ```typescript
  const result = await agent.generateText(...);

  result.userContext; // ❌ Missing userContext
  ```

  **After**:

  ```typescript
  const result = await agent.generateText(...);

  return result.userContext; // ✅ Includes userContext

  **How users can see the changes**:

  Now users can access the `userContext` in the response from all agent methods:

  // Set custom context before calling the agent
  const customContext = new Map();
  customContext.set("sessionId", "user-123");
  customContext.set("requestId", "req-456");

  // generateText now returns userContext
  const result = await agent.generateText("Hello", {
    userContext: customContext,
  });

  // Access the userContext from the response
  console.log(result.userContext.get("sessionId")); // 'user-123'
  console.log(result.userContext.get("requestId")); // 'req-456'

  // GenerateObject
  const objectResult = await agent.generateObject("Create a summary", schema, {
    userContext: customContext,
  });
  console.log(objectResult.userContext.get("sessionId")); // 'user-123'

  // Streaming methods
  const streamResult = await agent.streamText("Hello", {
    userContext: customContext,
  });
  console.log(streamResult.userContext?.get("sessionId")); // 'user-123'
  ```

  Fixes: [#283](https://github.com/VoltAgent/voltagent/issues/283)

## 0.1.47

### Patch Changes

- [#311](https://github.com/VoltAgent/voltagent/pull/311) [`1f7fa14`](https://github.com/VoltAgent/voltagent/commit/1f7fa140fcc4062fe85220e61f276e439392b0b4) Thanks [@zrosenbauer](https://github.com/zrosenbauer)! - fix(core, vercel-ui): Currently the `convertToUIMessages` function does not handle tool calls in steps correctly as it does not properly default filter non-tool related steps for sub-agents, same as the `data-stream` functions and in addition in the core the `operationContext` does not have the `subAgent` fields set correctly.

  ### Changes
  - deprecated `isSubAgentStreamPart` in favor of `isSubAgent` for universal use
  - by default `convertToUIMessages` now filters out non-tool related steps for sub-agents
  - now able to exclude specific parts or steps (from OperationContext) in `convertToUIMessages`

  ***

  ### Internals

  New utils were added to the internal package:
  - `isObject`
  - `isFunction`
  - `isPlainObject`
  - `isEmptyObject`
  - `isNil`
  - `hasKey`

- Updated dependencies [[`1f7fa14`](https://github.com/VoltAgent/voltagent/commit/1f7fa140fcc4062fe85220e61f276e439392b0b4)]:
  - @voltagent/internal@0.0.3

## 0.1.46

### Patch Changes

- [#309](https://github.com/VoltAgent/voltagent/pull/309) [`b81a6b0`](https://github.com/VoltAgent/voltagent/commit/b81a6b09c33d95f7e586501cc058ae8381c854c4) Thanks [@zrosenbauer](https://github.com/zrosenbauer)! - fix(core): Default to filtering `error` types from the `fullStream` to allow for error handling to happen properly

## 0.1.45

### Patch Changes

- [#308](https://github.com/VoltAgent/voltagent/pull/308) [`33afe6e`](https://github.com/VoltAgent/voltagent/commit/33afe6ef40ef56c501f7fa69be42da730f87d29d) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: subAgents now share conversation steps and context with parent agents

  SubAgents automatically inherit and contribute to their parent agent's operation context, including `userContext` and conversation history. This creates a unified workflow where all agents (supervisor + subagents) add steps to the same `conversationSteps` array, providing complete visibility and traceability across the entire agent hierarchy.

  ## Usage

  ```typescript
  import { Agent, createHooks } from "@voltagent/core";
  import { VercelAIProvider } from "@voltagent/vercel-ai";
  import { openai } from "@ai-sdk/openai";

  // SubAgent automatically receives parent's context
  const translatorAgent = new Agent({
    name: "Translator Agent",
    hooks: createHooks({
      onStart: ({ context }) => {
        // Access parent's userContext automatically
        const projectId = context.userContext.get("projectId");
        const language = context.userContext.get("language");
        console.log(`Translating for project ${projectId} to ${language}`);
      },
    }),
    instructions: "You are a skilled translator",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
  });

  // Supervisor agent with context
  const supervisorAgent = new Agent({
    name: "Supervisor Agent",
    subAgents: [translatorAgent],
    hooks: createHooks({
      onEnd: ({ context }) => {
        // Access complete workflow history from all agents
        const allSteps = context.conversationSteps;
        console.log(`Total workflow steps: ${allSteps.length}`);
        // Includes supervisor's delegate_task calls + subagent's processing steps
      },
    }),
    instructions: "Coordinate translation workflow",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
  });

  // Usage - context automatically flows to subagents
  const response = await supervisorAgent.streamText("Translate this text", {
    userContext: new Map([
      ["projectId", "proj-123"],
      ["language", "Spanish"],
    ]),
  });

  // Final context includes data from both supervisor and subagents
  console.log("Project:", response.userContext?.get("projectId"));
  ```

- [#306](https://github.com/VoltAgent/voltagent/pull/306) [`b8529b5`](https://github.com/VoltAgent/voltagent/commit/b8529b53313fa97e941ecacb8c1555205de49c19) Thanks [@zrosenbauer](https://github.com/zrosenbauer)! - fix(core): Revert original fix by @omeraplak to pass the task role as "user" instead of prompt to prevent errors in providers such as Anthropic, Grok, etc.

## 0.1.44

### Patch Changes

- Updated dependencies [[`94de46a`](https://github.com/VoltAgent/voltagent/commit/94de46ab2b7ccead47a539e93c72b357f17168f6)]:
  - @voltagent/internal@0.0.2

## 0.1.43

### Patch Changes

- [#287](https://github.com/VoltAgent/voltagent/pull/287) [`4136a9b`](https://github.com/VoltAgent/voltagent/commit/4136a9bd1a2f687bf009858dda4e56a50574c9c2) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: optimize streamText/generateText/genereteObject/streamObject performance with background event publishing and memory operations

  Significantly improved agent response times by optimizing blocking operations during stream initialization. Stream start time reduced by 70-80% while maintaining full conversation context quality.

  ## What's Fixed
  - **Background Event Publishing**: Timeline events now publish asynchronously, eliminating blocking delays
  - **Memory Operations**: Context loading optimized with background conversation setup and input saving

  ## Performance Impact
  - Stream initialization: ~300-500ms → ~150-200ms
  - 70-80% faster response start times
  - Zero impact on conversation quality or history tracking

  Perfect for production applications requiring fast AI interactions.

- [#287](https://github.com/VoltAgent/voltagent/pull/287) [`4136a9b`](https://github.com/VoltAgent/voltagent/commit/4136a9bd1a2f687bf009858dda4e56a50574c9c2) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add `deepClone` function to `object-utils` module

  Added a new `deepClone` utility function to the object-utils module for creating deep copies of complex JavaScript objects. This utility provides safe cloning of nested objects, arrays, and primitive values while handling circular references and special object types.

  Usage:

  ```typescript
  import { deepClone } from "@voltagent/core/utils/object-utils";

  const original = {
    nested: {
      array: [1, 2, { deep: "value" }],
      date: new Date(),
    },
  };

  const cloned = deepClone(original);
  // cloned is completely independent from original
  ```

  This utility is particularly useful for agent state management, configuration cloning, and preventing unintended mutations in complex data structures.

- [#287](https://github.com/VoltAgent/voltagent/pull/287) [`4136a9b`](https://github.com/VoltAgent/voltagent/commit/4136a9bd1a2f687bf009858dda4e56a50574c9c2) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: optimize performance with new `BackgroundQueue` utility class and non-blocking background operations

  Added a new `BackgroundQueue` utility class for managing background operations with enhanced reliability, performance, and order preservation. Significantly improved agent response times by optimizing blocking operations during stream initialization and agent interactions.

  ## Performance Improvements

  **All blocking operations have been moved to background jobs**, resulting in significant performance gains:
  - **Agent execution is no longer blocked** by history persistence, memory operations, or telemetry exports
  - **3-5x faster response times** for agent interactions due to non-blocking background processing
  - **Zero blocking delays** during agent conversations and tool executions

  ## Stream Operations Optimized
  - **Background Event Publishing**: Timeline events now publish asynchronously, eliminating blocking delays
  - **Memory Operations**: Context loading optimized with background conversation setup and input saving
  - **Stream initialization**: ~300-500ms → ~150-200ms (70-80% faster response start times)
  - **Zero impact on conversation quality or history tracking**

  Perfect for production applications requiring fast AI interactions with enhanced reliability and order preservation.

## 0.1.42

### Patch Changes

- [#286](https://github.com/VoltAgent/voltagent/pull/286) [`73632ea`](https://github.com/VoltAgent/voltagent/commit/73632ea229917ab4042bb58b61d5e6dbd9b72804) Thanks [@zrosenbauer](https://github.com/zrosenbauer)! - Fixed issue where fullStream processing was erroring due to inability to access a Nil value

## 0.1.41

### Patch Changes

- [`7705108`](https://github.com/VoltAgent/voltagent/commit/7705108317a8166bb1324838f99691ad8879b94d) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: reverted subagent handoff message role from `user` back to `system`.

## 0.1.40

### Patch Changes

- [#284](https://github.com/VoltAgent/voltagent/pull/284) [`003ea5e`](https://github.com/VoltAgent/voltagent/commit/003ea5e0aab1e3e4a1398ed5ebf54b20fc9e27f3) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: subagent task delegation system message handling for Google Gemini compatibility

  Fixed an issue where subagent task delegation was sending tasks as system messages, which caused errors with certain AI models like Google Gemini that have strict system message requirements. The task delegation now properly sends tasks as user messages instead of system messages.

  This change improves compatibility across different AI providers, particularly Google Gemini, which expects a specific system message format and doesn't handle multiple or dynamic system messages well during task delegation workflows.

- [#284](https://github.com/VoltAgent/voltagent/pull/284) [`003ea5e`](https://github.com/VoltAgent/voltagent/commit/003ea5e0aab1e3e4a1398ed5ebf54b20fc9e27f3) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: userContext reference preservation in agent history initialization

## 0.1.39

### Patch Changes

- [#276](https://github.com/VoltAgent/voltagent/pull/276) [`937ccf8`](https://github.com/VoltAgent/voltagent/commit/937ccf8bf84a4261ee9ed2c94aab9f8c49ab69bd) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add dynamic agent parameters with userContext support - #272

  Added dynamic agent parameters functionality that allows agents to adapt their behavior, models, and tools based on runtime context. This enables personalized, multi-tenant, and role-based AI experiences.

  ## Features
  - **Dynamic Instructions**: Agent instructions that change based on user context
  - **Dynamic Models**: Different AI models based on subscription tiers or user roles
  - **Dynamic Tools**: Role-based tool access and permissions
  - **REST API Integration**: Full userContext support via REST endpoints
  - **VoltOps Integration**: Visual testing interface for dynamic agents

  ## Usage

  ```typescript
  import { Agent } from "@voltagent/core";
  import { VercelAIProvider } from "@voltagent/vercel-ai";
  import { openai } from "@ai-sdk/openai";

  const dynamicAgent = new Agent({
    name: "Adaptive Assistant",

    // Dynamic instructions based on user context
    instructions: ({ userContext }) => {
      const role = (userContext.get("role") as string) || "user";
      const language = (userContext.get("language") as string) || "English";

      if (role === "admin") {
        return `You are an admin assistant with special privileges. Respond in ${language}.`;
      } else {
        return `You are a helpful assistant. Respond in ${language}.`;
      }
    },

    // Dynamic model selection based on subscription tier
    model: ({ userContext }) => {
      const tier = (userContext.get("tier") as string) || "free";

      switch (tier) {
        case "premium":
          return openai("gpt-4o");
        case "pro":
          return openai("gpt-4o-mini");
        default:
          return openai("gpt-3.5-turbo");
      }
    },

    // Dynamic tools based on user role
    tools: ({ userContext }) => {
      const role = (userContext.get("role") as string) || "user";

      if (role === "admin") {
        return [basicTool, adminTool];
      } else {
        return [basicTool];
      }
    },

    llm: new VercelAIProvider(),
  });

  // Usage with userContext
  const userContext = new Map([
    ["role", "admin"],
    ["language", "Spanish"],
    ["tier", "premium"],
  ]);

  const response = await dynamicAgent.generateText("Help me manage the system", { userContext });
  ```

  ## REST API Integration

  Dynamic agents work seamlessly with REST API endpoints:

  ```bash
  # POST /agents/my-agent/text
  curl -X POST http://localhost:3141/agents/my-agent/text \
       -H "Content-Type: application/json" \
       -d '{
         "input": "I need admin access",
         "options": {
           "userContext": {
             "role": "admin",
             "language": "Spanish",
             "tier": "premium"
           }
         }
       }'
  ```

  Perfect for multi-tenant applications, role-based access control, subscription tiers, internationalization, and A/B testing scenarios.

## 0.1.38

### Patch Changes

- [#267](https://github.com/VoltAgent/voltagent/pull/267) [`f7e5a34`](https://github.com/VoltAgent/voltagent/commit/f7e5a344a5bcb63d1a225e580f01dfa5886b6a01) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: subagent event ordering and stream injection

  Fixed an issue where subagent events were not being properly included in the main agent's stream before subagent completion. Previously, subagent events (text-delta, tool-call, tool-result, etc.) would sometimes miss being included in the parent agent's real-time stream, causing incomplete event visibility for monitoring and debugging.

## 0.1.37

### Patch Changes

- [#252](https://github.com/VoltAgent/voltagent/pull/252) [`88f2d06`](https://github.com/VoltAgent/voltagent/commit/88f2d0682413d27a7ac2d1d8cd502fd9c665e547) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add userId and conversationId support to agent history tables

  This release adds comprehensive support for `userId` and `conversationId` fields in agent history tables across all memory storage implementations, enabling better conversation tracking and user-specific history management.

  ### New Features
  - **Agent History Enhancement**: Added `userId` and `conversationId` columns to agent history tables
  - **Cross-Implementation Support**: Consistent implementation across PostgreSQL, Supabase, LibSQL, and In-Memory storage
  - **Automatic Migration**: Safe schema migrations for existing installations
  - **Backward Compatibility**: Existing history entries remain functional

  ### Migration Notes

  **PostgreSQL & Supabase**: Automatic schema migration with user-friendly SQL scripts
  **LibSQL**: Seamless column addition with proper indexing
  **In-Memory**: No migration required, immediate support

  ### Technical Details
  - **Database Schema**: Added `userid TEXT` and `conversationid TEXT` columns (PostgreSQL uses lowercase)
  - **Indexing**: Performance-optimized indexes for new columns
  - **Migration Safety**: Non-destructive migrations with proper error handling
  - **API Consistency**: Unified interface across all storage implementations

- [#261](https://github.com/VoltAgent/voltagent/pull/261) [`b63fe67`](https://github.com/VoltAgent/voltagent/commit/b63fe675dfca9121862a9dd67a0fae5d39b9db90) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: subAgent event propagation in fullStream for enhanced streaming experience

  Fixed an issue where SubAgent events (text-delta, tool-call, tool-result, reasoning, source, finish) were not being properly forwarded to the parent agent's fullStream. This enhancement improves the streaming experience by ensuring all SubAgent activities are visible in the parent stream with proper metadata (subAgentId, subAgentName) for UI filtering and display.

## 0.1.36

### Patch Changes

- [#251](https://github.com/VoltAgent/voltagent/pull/251) [`be0cf47`](https://github.com/VoltAgent/voltagent/commit/be0cf47ec6e9640119d752dd6b608097d06bf69d) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add fullStream support and subagent event forwarding

  Added `fullStream` support to the core agent system for enhanced streaming with detailed chunk types (text-delta, tool-call, tool-result, reasoning, finish, error). Also improved event forwarding between subagents for better multi-agent workflows. SubAgent events are now fully forwarded to parent agents, with filtering moved to the client side for better flexibility.

  Real-world example:

  ```typescript
  const response = await agent.streamText("What's the weather in Istanbul?");

  if (response.fullStream) {
    for await (const chunk of response.fullStream) {
      // Filter out SubAgent text, reasoning, and source events for cleaner UI
      if (chunk.subAgentId && chunk.subAgentName) {
        if (chunk.type === "text" || chunk.type === "reasoning" || chunk.type === "source") {
          continue; // Skip these events from sub-agents
        }
      }

      switch (chunk.type) {
        case "text-delta":
          process.stdout.write(chunk.textDelta); // Stream text in real-time
          break;
        case "tool-call":
          console.log(`🔧 Using tool: ${chunk.toolName}`);
          break;
        case "tool-result":
          console.log(`✅ Tool completed: ${chunk.toolName}`);
          break;
        case "reasoning":
          console.log(`🤔 AI thinking: ${chunk.reasoning}`);
          break;
        case "finish":
          console.log(`\n✨ Done! Tokens used: ${chunk.usage?.totalTokens}`);
          break;
      }
    }
  }
  ```

- [#248](https://github.com/VoltAgent/voltagent/pull/248) [`a3b4e60`](https://github.com/VoltAgent/voltagent/commit/a3b4e604e6f79281903ff0c28422e6ee2863b340) Thanks [@alasano](https://github.com/alasano)! - feat(core): add streamable HTTP transport support for MCP
  - Upgrade @modelcontextprotocol/sdk from 1.10.1 to 1.12.1
  - Add support for streamable HTTP transport (the newer MCP protocol)
  - Modified existing `type: "http"` to use automatic selection with streamable HTTP → SSE fallback
  - Added two new transport types:
    - `type: "sse"` - Force SSE transport only (legacy)
    - `type: "streamable-http"` - Force streamable HTTP only (no fallback)
  - Maintain full backward compatibility - existing `type: "http"` configurations continue to work via automatic fallback

  Fixes #246

- [#247](https://github.com/VoltAgent/voltagent/pull/247) [`20119ad`](https://github.com/VoltAgent/voltagent/commit/20119ada182ec5f313a7f46956218d593180e096) Thanks [@Ajay-Satish-01](https://github.com/Ajay-Satish-01)! - feat(core): Enhanced server configuration with unified `server` object and Swagger UI control

  Server configuration options have been enhanced with a new unified `server` object for better organization and flexibility while maintaining full backward compatibility.

  **What's New:**
  - **Unified Server Configuration:** All server-related options (`autoStart`, `port`, `enableSwaggerUI`, `customEndpoints`) are now grouped under a single `server` object.
  - **Swagger UI Control:** Fine-grained control over Swagger UI availability with environment-specific defaults.
  - **Backward Compatibility:** Legacy individual options are still supported but deprecated.
  - **Override Logic:** New `server` object takes precedence over deprecated individual options.

  **Migration Guide:**

  **New Recommended Usage:**

  ```typescript
  import { Agent, VoltAgent } from "@voltagent/core";
  import { VercelAIProvider } from "@voltagent/vercel-ai";
  import { openai } from "@ai-sdk/openai";

  const agent = new Agent({
    name: "My Assistant",
    instructions: "A helpful assistant",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
  });

  new VoltAgent({
    agents: { agent },
    server: {
      autoStart: true,
      port: 3000,
      enableSwaggerUI: true,
      customEndpoints: [
        {
          path: "/health",
          method: "get",
          handler: async (c) => c.json({ status: "ok" }),
        },
      ],
    },
  });
  ```

  **Legacy Usage (Deprecated but Still Works):**

  ```typescript
  new VoltAgent({
    agents: { agent },
    autoStart: true, // @deprecated - use server.autoStart
    port: 3000, // @deprecated - use server.port
    customEndpoints: [], // @deprecated - use server.customEndpoints
  });
  ```

  **Mixed Usage (Server Object Overrides):**

  ```typescript
  new VoltAgent({
    agents: { agent },
    autoStart: false, // This will be overridden
    server: {
      autoStart: true, // This takes precedence
    },
  });
  ```

  **Swagger UI Defaults:**
  - Development (`NODE_ENV !== 'production'`): Swagger UI enabled
  - Production (`NODE_ENV === 'production'`): Swagger UI disabled
  - Override with `server.enableSwaggerUI: true/false`

  Resolves [#241](https://github.com/VoltAgent/voltagent/issues/241)

## 0.1.35

### Patch Changes

- [#240](https://github.com/VoltAgent/voltagent/pull/240) [`8605863`](https://github.com/VoltAgent/voltagent/commit/860586377bff11b9e7ba80e06fd26b0098bd334a) Thanks [@zrosenbauer](https://github.com/zrosenbauer)! - trim the system prompt so we don't have extra newlines and offset text

## 0.1.34

### Patch Changes

- [#238](https://github.com/VoltAgent/voltagent/pull/238) [`ccdba7a`](https://github.com/VoltAgent/voltagent/commit/ccdba7ac58e284dcda9f6b7bec2c8d2e69892940) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: user messages saving with proper content serialization

  Fixed an issue where user messages were not being saved correctly to storage due to improper content formatting. The message content is now properly stringified when it's not already a string, ensuring consistent storage format across PostgreSQL and LibSQL implementations.

## 0.1.33

### Patch Changes

- [#236](https://github.com/VoltAgent/voltagent/pull/236) [`5d39cdc`](https://github.com/VoltAgent/voltagent/commit/5d39cdc68c4ec36ec2f0bf86a29dbf1225644416) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: Remove userId parameter from addMessage method

  Simplified the `addMessage` method signature by removing the `userId` parameter. This change makes the API cleaner and more consistent with the conversation-based approach where user context is handled at the conversation level.

  ### Changes
  - **Removed**: `userId` parameter from `addMessage` method
  - **Before**: `addMessage(message: MemoryMessage, userId: string, conversationId: string)`
  - **After**: `addMessage(message: MemoryMessage, conversationId: string)`

  ### Migration Guide

  If you were calling `addMessage` with a `userId` parameter, simply remove it:

  ```typescript
  // Before
  await memory.addMessage(message, conversationId, userId);

  // After
  await memory.addMessage(message, conversationId);
  ```

  ### Rationale

  User context is now properly managed at the conversation level, making the API more intuitive and reducing parameter complexity. The user association is handled through the conversation's `userId` property instead of requiring it on every message operation.

  **Breaking Change:**

  This is a minor breaking change. Update your `addMessage` calls to remove the `userId` parameter.

- [#235](https://github.com/VoltAgent/voltagent/pull/235) [`16c2a86`](https://github.com/VoltAgent/voltagent/commit/16c2a863d3ecdc09f09219bd40f2dbf1d789194d) Thanks [@alasano](https://github.com/alasano)! - fix: onHandoff hook invocation to pass arguments as object instead of positional parameters

- [#233](https://github.com/VoltAgent/voltagent/pull/233) [`0d85f0e`](https://github.com/VoltAgent/voltagent/commit/0d85f0e960dbc6e8df6a79a16c775ca7a34043bb) Thanks [@zrosenbauer](https://github.com/zrosenbauer)! - fix: adding in missing changeset from [PR #226](https://github.com/VoltAgent/voltagent/pull/226)

## 0.1.32

### Patch Changes

- [#215](https://github.com/VoltAgent/voltagent/pull/215) [`f2f4539`](https://github.com/VoltAgent/voltagent/commit/f2f4539af7722f25a5aad9f01c2b7b5e50ba51b8) Thanks [@Ajay-Satish-01](https://github.com/Ajay-Satish-01)! - This release introduces powerful new methods for managing conversations with user-specific access control and improved developer experience.

  ### Simple Usage Example

  ```typescript
  // Get all conversations for a user
  const conversations = await storage.getUserConversations("user-123").limit(10).execute();

  console.log(conversations);

  // Get first conversation and its messages
  const conversation = conversations[0];
  if (conversation) {
    const messages = await storage.getConversationMessages(conversation.id);
    console.log(messages);
  }
  ```

  ### Pagination Support

  ```typescript
  // Get paginated conversations
  const result = await storage.getPaginatedUserConversations("user-123", 1, 20);
  console.log(result.conversations); // Array of conversations
  console.log(result.hasMore); // Boolean indicating if more pages exist
  ```

- [#229](https://github.com/VoltAgent/voltagent/pull/229) [`0eba8a2`](https://github.com/VoltAgent/voltagent/commit/0eba8a265c35241da74324613e15801402f7b778) Thanks [@zrosenbauer](https://github.com/zrosenbauer)! - fix: migrate the provider streams to `AsyncIterableStream`

  Example:

  ```typescript
  const stream = createAsyncIterableStream(
    new ReadableStream({
      start(controller) {
        controller.enqueue("Hello");
        controller.enqueue(", ");
        controller.enqueue("world!");
        controller.close();
      },
    })
  );

  for await (const chunk of stream) {
    console.log(chunk);
  }

  // in the agent
  const result = await agent.streamObject({
    messages,
    model: "test-model",
    schema,
  });

  for await (const chunk of result.objectStream) {
    console.log(chunk);
  }
  ```

  New exports:
  - `createAsyncIterableStream`
  - `type AsyncIterableStream`

## 0.1.31

### Patch Changes

- [#213](https://github.com/VoltAgent/voltagent/pull/213) [`ed68922`](https://github.com/VoltAgent/voltagent/commit/ed68922e4c71560c2f68117064b84e874a72009f) Thanks [@baseballyama](https://github.com/baseballyama)! - chore!: drop Node.js v18

- [#223](https://github.com/VoltAgent/voltagent/pull/223) [`80fd3c0`](https://github.com/VoltAgent/voltagent/commit/80fd3c069de4c23116540a55082b891c4b376ce6) Thanks [@omeraplak](https://github.com/omeraplak)! - Add userContext support to retrievers for tracking references and metadata

  Retrievers can now store additional information (like references, sources, citations) in userContext that can be accessed from agent responses. This enables tracking which documents were used to generate responses, perfect for citation systems and audit trails.

  ```ts
  class MyRetriever extends BaseRetriever {
    async retrieve(input: string, options: RetrieveOptions): Promise<string> {
      // Find relevant documents
      const docs = this.findRelevantDocs(input);

      const references = docs.map((doc) => ({
        id: doc.id,
        title: doc.title,
        source: doc.source,
      }));
      options.userContext.set("references", references);

      return docs.map((doc) => doc.content).join("\n");
    }
  }

  // Access references from response
  const response = await agent.generateText("What is VoltAgent?");
  const references = response.userContext?.get("references");
  ```

## 0.1.30

### Patch Changes

- [#201](https://github.com/VoltAgent/voltagent/pull/201) [`04dd320`](https://github.com/VoltAgent/voltagent/commit/04dd3204455b09dc490d1bdfbd0cfeea13c3c409) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: include modelParameters in agent event metadata

  This adds the `modelParameters` field to agent event metadata to improve observability and debugging of model-specific behavior during agent execution.

## 0.1.29

### Patch Changes

- [#191](https://github.com/VoltAgent/voltagent/pull/191) [`07d99d1`](https://github.com/VoltAgent/voltagent/commit/07d99d133232babf78ba4e1c32fe235d5b3c9944) Thanks [@zrosenbauer](https://github.com/zrosenbauer)! - Remove console based logging in favor of a dev-only logger that will not output logs in production environments by leveraging the NODE_ENV

- [#196](https://github.com/VoltAgent/voltagent/pull/196) [`67b0e7e`](https://github.com/VoltAgent/voltagent/commit/67b0e7ea704d23bf9efb722c0b0b4971d0974153) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add `systemPrompt` and `messages` array to metadata for display on VoltOps Platform

## 0.1.28

### Patch Changes

- [#189](https://github.com/VoltAgent/voltagent/pull/189) [`07138fc`](https://github.com/VoltAgent/voltagent/commit/07138fc85ef27c9136d303233559f6b358ad86de) Thanks [@zrosenbauer](https://github.com/zrosenbauer)! - Added the 'purpose' field to agents (subagents) to provide a limited description of the purpose of the agent to the supervisor instead of passing the instructions for the subagent directly to the supervisor

  ```ts
  const storyAgent = new Agent({
    name: "Story Agent",
    purpose: "A story writer agent that creates original, engaging short stories.",
    instructions: "You are a creative story writer. Create original, engaging short stories.",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
  });
  ```

  > The supervisor agent's system prompt is automatically modified to include instructions on how to manage its subagents effectively. It lists the available subagents and their `purpose` and provides guidelines for delegation, communication, and response aggregation.

- [#186](https://github.com/VoltAgent/voltagent/pull/186) [`adad41a`](https://github.com/VoltAgent/voltagent/commit/adad41a930e338c4683306b9dbffec22096eba5c) Thanks [@necatiozmen](https://github.com/necatiozmen)! - chore: update "VoltAgent Console" -> "VoltOps Platform"

## 0.1.27

### Patch Changes

- [#126](https://github.com/VoltAgent/voltagent/pull/126) [`2c47bc1`](https://github.com/VoltAgent/voltagent/commit/2c47bc1e9cd845cc60e6e9d7e86df40c98b82614) Thanks [@fav-devs](https://github.com/fav-devs)! - feat: add custom endpoints feature to VoltAgent API server, allowing developers to extend the API with their own endpoints

  ```typescript
  import { VoltAgent } from "@voltagent/core";

  new VoltAgent({
    agents: { myAgent },
    customEndpoints: [
      {
        path: "/api/health",
        method: "get",
        handler: async (c) => {
          return c.json({
            success: true,
            data: { status: "healthy" },
          });
        },
      },
    ],
  });
  ```

## 0.1.26

### Patch Changes

- [#181](https://github.com/VoltAgent/voltagent/pull/181) [`1b4a9fd`](https://github.com/VoltAgent/voltagent/commit/1b4a9fd78b84d9b758120380cb80a940c2354020) Thanks [@omeraplak](https://github.com/omeraplak)! - Implement comprehensive error handling for streaming endpoints - #170
  - **Backend**: Added error handling to `streamRoute` and `streamObjectRoute` with onError callbacks, safe stream operations, and multiple error layers (setup, iteration, stream errors)
  - **Documentation**: Added detailed error handling guide with examples for fetch-based SSE streaming

  Fixes issue where streaming errors weren't being communicated to frontend users, leaving them without feedback when API calls failed during streaming operations.

## 0.1.25

### Patch Changes

- [`13d25b4`](https://github.com/VoltAgent/voltagent/commit/13d25b4033c3a4b41d501e954e2893b50553d8d4) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: update zod-from-json-schema dependency version to resolve MCP tools compatibility issues

## 0.1.24

### Patch Changes

- [#176](https://github.com/VoltAgent/voltagent/pull/176) [`790d070`](https://github.com/VoltAgent/voltagent/commit/790d070e26a41a6467927471933399020ceec275) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: removed `@n8n/json-schema-to-zod` dependency - #177

- [#176](https://github.com/VoltAgent/voltagent/pull/176) [`790d070`](https://github.com/VoltAgent/voltagent/commit/790d070e26a41a6467927471933399020ceec275) Thanks [@omeraplak](https://github.com/omeraplak)! - The `error` column has been deprecated and replaced with `statusMessage` column for better consistency and clearer messaging. The old `error` column is still supported for backward compatibility but will be removed in a future major version.

  Changes:
  - Deprecated `error` column (still functional)
  - Improved error handling and status reporting

## 0.1.23

### Patch Changes

- [`b2f423d`](https://github.com/VoltAgent/voltagent/commit/b2f423d55ee031fc02b0e8eda5175cfe15e38a42) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: zod import issue - #161

  Fixed incorrect zod import that was causing OpenAPI type safety errors. Updated to use proper import from @hono/zod-openapi package.

## 0.1.22

### Patch Changes

- [#149](https://github.com/VoltAgent/voltagent/pull/149) [`0137a4e`](https://github.com/VoltAgent/voltagent/commit/0137a4e67deaa2490b4a07f9de5f13633f2c473c) Thanks [@VenomHare](https://github.com/VenomHare)! - Added JSON schema support for REST API `generateObject` and `streamObject` functions. The system now accepts JSON schemas which are internally converted to Zod schemas for validation. This enables REST API usage where Zod schemas cannot be directly passed. #87

  Additional Changes:
  - Included the JSON schema from `options.schema` in the system message for the `generateObject` and `streamObject` functions in both `anthropic-ai` and `groq-ai` providers.
  - Enhanced schema handling to convert JSON schemas to Zod internally for seamless REST API compatibility.

- [#151](https://github.com/VoltAgent/voltagent/pull/151) [`4308b85`](https://github.com/VoltAgent/voltagent/commit/4308b857ab2133f6ca60f22271dcf30bad8b4c08) Thanks [@process.env.POSTGRES_USER](https://github.com/process.env.POSTGRES_USER)! - feat: Agent memory can now be stored in PostgreSQL database. This feature enables agents to persistently store conversation history in PostgreSQL. - #16

  ## Usage

  ```tsx
  import { openai } from "@ai-sdk/openai";
  import { Agent, VoltAgent } from "@voltagent/core";
  import { PostgresStorage } from "@voltagent/postgres";
  import { VercelAIProvider } from "@voltagent/vercel-ai";

  // Configure PostgreSQL Memory Storage
  const memoryStorage = new PostgresStorage({
    // Read connection details from environment variables
    connection: {
      host: process.env.POSTGRES_HOST || "localhost",
      port: Number.parseInt(process.env.POSTGRES_PORT || "5432"),
      database: process.env.POSTGRES_DB || "voltagent",
   || "postgres",
      password: process.env.POSTGRES_PASSWORD || "password",
      ssl: process.env.POSTGRES_SSL === "true",
    },

    // Alternative: Use connection string
    // connection: process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/voltagent",

    // Optional: Customize table names
    tablePrefix: "voltagent_memory",

    // Optional: Configure connection pool
    maxConnections: 10,

    // Optional: Set storage limit for messages
    storageLimit: 100,

    // Optional: Enable debug logging for development
    debug: process.env.NODE_ENV === "development",
  });

  // Create agent with PostgreSQL memory
  const agent = new Agent({
    name: "PostgreSQL Memory Agent",
    description: "A helpful assistant that remembers conversations using PostgreSQL.",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
    memory: memoryStorage, // Use the configured PostgreSQL storage
  });
  ```

## 0.1.21

### Patch Changes

- [#160](https://github.com/VoltAgent/voltagent/pull/160) [`03ed437`](https://github.com/VoltAgent/voltagent/commit/03ed43723cd56f29ac67088f0624a88632a14a1b) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: improved event system architecture for better observability

  We've updated the event system architecture to improve observability capabilities. The system includes automatic migrations to maintain backward compatibility, though some events may not display perfectly due to the architectural changes. Overall functionality remains stable and most features work as expected.

  No action required - the system will automatically handle the migration process. If you encounter any issues, feel free to reach out on [Discord](https://s.voltagent.dev/discord) for support.

  **What's Changed:**
  - Enhanced event system for better observability and monitoring
  - Automatic database migrations for seamless upgrades
  - Improved agent history tracking and management

  **Migration Notes:**
  - Backward compatibility is maintained through automatic migrations
  - Some legacy events may display differently but core functionality is preserved
  - No manual intervention needed - migrations run automatically

  **Note:**
  Some events may not display perfectly due to architecture changes, but the system will automatically migrate and most functionality will work as expected.

## 0.1.20

### Patch Changes

- [#155](https://github.com/VoltAgent/voltagent/pull/155) [`35b11f5`](https://github.com/VoltAgent/voltagent/commit/35b11f5258073dd39f3032db6d9b29146f4b940c) Thanks [@baseballyama](https://github.com/baseballyama)! - chore: update `tsconfig.json`'s `target` to `ES2022`

- [#162](https://github.com/VoltAgent/voltagent/pull/162) [`b164bd0`](https://github.com/VoltAgent/voltagent/commit/b164bd014670452cb162b388f03565db992767af) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: pin zod version to 3.24.2 to avoid "Type instantiation is excessively deep and possibly infinite" error

  Fixed compatibility issues between different zod versions that were causing TypeScript compilation errors. This issue occurs when multiple packages use different patch versions of zod (e.g., 3.23.x vs 3.24.x), leading to type instantiation depth problems. By pinning to 3.24.2, we ensure consistent behavior across all packages.

  See: https://github.com/colinhacks/zod/issues/3435

- [#158](https://github.com/VoltAgent/voltagent/pull/158) [`9412cf0`](https://github.com/VoltAgent/voltagent/commit/9412cf0633f20d6b77c87625fc05e9e216936758) Thanks [@baseballyama](https://github.com/baseballyama)! - chore(core): fixed a type error that occurred in src/server/api.ts

## 0.1.19

### Patch Changes

- [#128](https://github.com/VoltAgent/voltagent/pull/128) [`d6cf2e1`](https://github.com/VoltAgent/voltagent/commit/d6cf2e194d47352565314c93f1a4e477701563c1) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add VoltAgentExporter for production observability 🚀

  VoltAgentExporter enables persistent storage and monitoring of AI agents in production environments:
  - Send agent telemetry data to the VoltAgent cloud platform
  - Access historical execution data through your project dashboard
  - Monitor deployed agents over time
  - Debug production issues with comprehensive tracing

  To configure your project with VoltAgentExporter, visit the new tracing setup page at [`https://console.voltagent.dev/tracing-setup`](https://console.voltagent.dev/tracing-setup).

  For more information about production tracing with VoltAgentExporter, see our [developer documentation](https://voltagent.dev/docs/observability/developer-console/#production-tracing-with-voltagentexporter).

## 0.1.18

### Patch Changes

- [#113](https://github.com/VoltAgent/voltagent/pull/113) [`0a120f4`](https://github.com/VoltAgent/voltagent/commit/0a120f4bf1b71575a4b6c67c94104633c58e1410) Thanks [@nhc](https://github.com/nhc)! - export createTool from toolkit

## 0.1.17

### Patch Changes

- [#106](https://github.com/VoltAgent/voltagent/pull/106) [`b31c8f2`](https://github.com/VoltAgent/voltagent/commit/b31c8f2ad1b4bf242b197a094300cb3397109a94) Thanks [@omeraplak](https://github.com/omeraplak)! - Enabled `userContext` to be passed from supervisor agents to their sub-agents, allowing for consistent contextual data across delegated tasks. This ensures that sub-agents can operate with the necessary shared information provided by their parent agent.

  ```typescript
  // Supervisor Agent initiates an operation with userContext:
  const supervisorContext = new Map<string | symbol, unknown>();
  supervisorContext.set("globalTransactionId", "tx-supervisor-12345");

  await supervisorAgent.generateText(
    "Delegate analysis of transaction tx-supervisor-12345 to the financial sub-agent.",
    { userContext: supervisorContext }
  );

  // In your sub-agent's hook definition (e.g., within createHooks):
  onStart: ({ agent, context }: OnStartHookArgs) => {
    const inheritedUserContext = context.userContext; // Access the OperationContext's userContext
    const transactionId = inheritedUserContext.get("globalTransactionId");
    console.log(`[${agent.name}] Hook: Operating with Transaction ID: ${transactionId}`);
    // Expected log: [FinancialSubAgent] Hook: Operating with Transaction ID: tx-supervisor-12345
  };

  // Example: Inside a Tool executed by the Sub-Agent
  // In your sub-agent tool's execute function:
  execute: async (params: { someParam: string }, options?: ToolExecutionContext) => {
    if (options?.operationContext?.userContext) {
      const inheritedUserContext = options.operationContext.userContext;
      const transactionId = inheritedUserContext.get("globalTransactionId");
      console.log(`[SubAgentTool] Tool: Processing with Transaction ID: ${transactionId}`);
      // Expected log: [SubAgentTool] Tool: Processing with Transaction ID: tx-supervisor-12345
      return `Processed ${params.someParam} for transaction ${transactionId}`;
    }
    return "Error: OperationContext not available for tool";
  };
  ```

## 0.1.14

### Patch Changes

- [#102](https://github.com/VoltAgent/voltagent/pull/102) [`cdfec65`](https://github.com/VoltAgent/voltagent/commit/cdfec657f731fdc1b6d0c307376e3299813f55d3) Thanks [@omeraplak](https://github.com/omeraplak)! - refactor: use 'instructions' field for Agent definitions in examples - #88

  Updated documentation examples (READMEs, docs, blogs) and relevant package code examples to use the `instructions` field instead of `description` when defining `Agent` instances.

  This change aligns the examples with the preferred API usage for the `Agent` class, where `instructions` provides behavioral guidance to the agent/LLM. This prepares for the eventual deprecation of the `description` field specifically for `Agent` class definitions.

  **Example Change for Agent Definition:**

  ```diff
    const agent = new Agent({
      name: "My Assistant",
  -   description: "A helpful assistant.",
  +   instructions: "A helpful assistant.",
      llm: new VercelAIProvider(),
      model: openai("gpt-4o-mini"),
    });
  ```

## 0.1.13

### Patch Changes

- [`f7de864`](https://github.com/VoltAgent/voltagent/commit/f7de864503d598cf7131cc01afa3779639190107) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: add `toolName` to event metadata to ensure `delegate_task` name is visible in VoltOps LLM Observability Platform

- [`13db262`](https://github.com/VoltAgent/voltagent/commit/13db2621ae6b730667f9991d3c2129c85265e925) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: Update Zod to version 3.24.2 to resolve "Type instantiation is excessively deep and possibly infinite" error (related to https://github.com/colinhacks/zod/issues/3435).

## 0.1.12

### Patch Changes

- [#94](https://github.com/VoltAgent/voltagent/pull/94) [`004df81`](https://github.com/VoltAgent/voltagent/commit/004df81fa6a23571391e6ddeba0dfe6bfea267e8) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: Add Langfuse Observability Exporter

  This introduces a new package `@voltagent/langfuse-exporter` that allows you to export OpenTelemetry traces generated by `@voltagent/core` directly to Langfuse (https://langfuse.com/) for detailed observability into your agent's operations.

  **How to Use:**

  ## Installation

  Install the necessary packages:

  ```bash
  npm install @voltagent/langfuse-exporter
  ```

  ## Configuration

  Configure the `LangfuseExporter` and pass it to `VoltAgent`:

  ```typescript
  import { Agent, VoltAgent } from "@voltagent/core";
  import { VercelAIProvider } from "@voltagent/vercel-ai";
  import { openai } from "@ai-sdk/openai";

  import { LangfuseExporter } from "@voltagent/langfuse-exporter";

  // Ensure LANGFUSE_SECRET_KEY and LANGFUSE_PUBLIC_KEY are set in your environment

  // Define your agent(s)
  const agent = new Agent({
    name: "my-voltagent-app",
    instructions: "A helpful assistant that answers questions without using tools",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
  });

  // Configure the Langfuse Exporter
  const langfuseExporter = new LangfuseExporter({
    publicKey: process.env.LANGFUSE_PUBLIC_KEY,
    secretKey: process.env.LANGFUSE_SECRET_KEY,
    baseUrl: process.env.LANGFUSE_BASE_URL, // Optional: Defaults to Langfuse Cloud
    // debug: true // Optional: Enable exporter logging
  });

  // Initialize VoltAgent with the exporter
  // This automatically sets up OpenTelemetry tracing
  new VoltAgent({
    agents: {
      agent, // Register your agent(s)
    },
    telemetryExporter: langfuseExporter, // Pass the exporter instance
  });

  console.log("VoltAgent initialized with Langfuse exporter.");

  // Now, any operations performed by 'agent' (e.g., agent.generateText(...))
  // will automatically generate traces and send them to Langfuse.
  ```

  By providing the `telemetryExporter` to `VoltAgent`, OpenTelemetry is automatically configured, and detailed traces including LLM interactions, tool usage, and agent metadata will appear in your Langfuse project.

## 0.1.11

### Patch Changes

- [`e5b3a46`](https://github.com/VoltAgent/voltagent/commit/e5b3a46e2e61f366fa3c67f9a37d4e4d9e0fe426) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: enhance API Overview documentation
  - Added `curl` examples for all key generation endpoints (`/text`, `/stream`, `/object`, `/stream-object`).
  - Clarified that `userId` and `conversationId` options are optional.
  - Provided separate `curl` examples demonstrating usage both with and without optional parameters (`userId`, `conversationId`).
  - Added a new "Common Generation Options" section with a detailed table explaining parameters like `temperature`, `maxTokens`, `contextLimit`, etc., including their types and default values.

- [`4649c3c`](https://github.com/VoltAgent/voltagent/commit/4649c3ccb9e56a7fcabfe6a0bcef2383ff6506ef) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: improve agent event handling and error processing
  - Enhanced start event emission in agent operations
  - Fixed timeline event creation for agent operations

- [`8e6d2e9`](https://github.com/VoltAgent/voltagent/commit/8e6d2e994398c1a727d4afea39d5e34ffc4a5fca) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: Allow passing arbitrary provider-specific options via the `provider` object in agent generation methods (`generateText`, `streamText`, etc.).

  Added an index signature `[key: string]: unknown;` to the `ProviderOptions` type (`voltagent/packages/core/src/agent/types.ts`). This allows users to pass any provider-specific parameters directly through the `provider` object, enhancing flexibility and enabling the use of features not covered by the standard options.

  Example using a Vercel AI SDK option:

  ```typescript
  import { Agent } from "@voltagent/core";
  import { VercelProvider } from "@voltagent/vercel-ai";
  import { openai } from "@ai-sdk/openai";

  const agent = new Agent({
    name: "Example Agent",
    llm: new VercelProvider(),
    model: openai("gpt-4o-mini"),
  });

  await agent.streamText("Tell me a joke", {
    provider: {
      // Standard options can still be used
      temperature: 0.7,
      // Provider-specific options are now allowed by the type
      experimental_activeTools: ["tool1", "tool2"],
      anotherProviderOption: "someValue",
    },
  });
  ```

## 0.1.10

### Patch Changes

- [#77](https://github.com/VoltAgent/voltagent/pull/77) [`beaa8fb`](https://github.com/VoltAgent/voltagent/commit/beaa8fb1f1bc6351f1bede0b65a6a189cc1b6ea2) Thanks [@omeraplak](https://github.com/omeraplak)! - **API & Providers:** Standardized message content format for array inputs.
  - The API (`/text`, `/stream`, `/object`, `/stream-object` endpoints) now strictly expects the `content` field within message objects (when `input` is an array) to be either a `string` or an `Array` of content parts (e.g., `[{ type: 'text', text: '...' }]`).
  - The previous behavior of allowing a single content object (e.g., `{ type: 'text', ... }`) directly as the value for `content` in message arrays is no longer supported in the API schema. Raw string inputs remain unchanged.
  - Provider logic (`google-ai`, `groq-ai`, `xsai`) updated to align with this stricter definition.

  **Console:**
  - **Added file and image upload functionality to the Assistant Chat.** Users can now attach multiple files/images via a button, preview attachments, and send them along with text messages.
  - Improved the Assistant Chat resizing: Replaced size toggle buttons with a draggable handle (top-left corner).
  - Chat window dimensions are now saved to local storage and restored on reload.

  **Internal:**
  - Added comprehensive test suites for Groq and XsAI providers.

## 0.1.9

### Patch Changes

- [#71](https://github.com/VoltAgent/voltagent/pull/71) [`1f20509`](https://github.com/VoltAgent/voltagent/commit/1f20509528fc2cb2ba00f86d649848afae34af04) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: Introduce `userContext` for passing custom data through agent operations

  Introduced `userContext`, a `Map<string | symbol, unknown>` within the `OperationContext`. This allows developers to store and retrieve custom data across agent lifecycle hooks (`onStart`, `onEnd`) and tool executions for a specific agent operation (like a `generateText` call). This context is isolated per operation, providing a way to manage state specific to a single request or task.

  **Usage Example:**

  ```typescript
  import {
    Agent,
    createHooks,
    createTool,
    type OperationContext,
    type ToolExecutionContext,
  } from "@voltagent/core";
  import { z } from "zod";

  // Define hooks that set and retrieve data
  const hooks = createHooks({
    onStart: (agent: Agent<any>, context: OperationContext) => {
      // Set data needed throughout the operation and potentially by tools
      const requestId = `req-${Date.now()}`;
      const traceId = `trace-${Math.random().toString(16).substring(2, 8)}`;
      context.userContext.set("requestId", requestId);
      context.userContext.set("traceId", traceId);
      console.log(
        `[${agent.name}] Operation started. RequestID: ${requestId}, TraceID: ${traceId}`
      );
    },
    onEnd: (agent: Agent<any>, result: any, context: OperationContext) => {
      // Retrieve data at the end of the operation
      const requestId = context.userContext.get("requestId");
      const traceId = context.userContext.get("traceId"); // Can retrieve traceId here too
      console.log(
        `[${agent.name}] Operation finished. RequestID: ${requestId}, TraceID: ${traceId}`
      );
      // Use these IDs for logging, metrics, cleanup, etc.
    },
  });

  // Define a tool that uses the context data set in onStart
  const customContextTool = createTool({
    name: "custom_context_logger",
    description: "Logs a message using trace ID from the user context.",
    parameters: z.object({
      message: z.string().describe("The message to log."),
    }),
    execute: async (params: { message: string }, options?: ToolExecutionContext) => {
      // Access userContext via options.operationContext
      const traceId = options?.operationContext?.userContext?.get("traceId") || "unknown-trace";
      const requestId =
        options?.operationContext?.userContext?.get("requestId") || "unknown-request"; // Can access requestId too
      const logMessage = `[RequestID: ${requestId}, TraceID: ${traceId}] Tool Log: ${params.message}`;
      console.log(logMessage);
      // In a real scenario, you might interact with external systems using these IDs
      return `Logged message with RequestID: ${requestId} and TraceID: ${traceId}`;
    },
  });

  // Create an agent with the tool and hooks
  const agent = new Agent({
    name: "MyCombinedAgent",
    llm: myLlmProvider, // Your LLM provider instance
    model: myModel, // Your model instance
    tools: [customContextTool],
    hooks: hooks,
  });

  // Trigger the agent. The LLM might decide to use the tool.
  await agent.generateText(
    "Log the following information using the custom logger: 'User feedback received.'"
  );

  // Console output will show logs from onStart, the tool (if called), and onEnd,
  // demonstrating context data flow.
  ```

- [#71](https://github.com/VoltAgent/voltagent/pull/71) [`1f20509`](https://github.com/VoltAgent/voltagent/commit/1f20509528fc2cb2ba00f86d649848afae34af04) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: Standardize Agent Error and Finish Handling

  This change introduces a more robust and consistent way errors and successful finishes are handled across the `@voltagent/core` Agent and LLM provider implementations (like `@voltagent/vercel-ai`).

  **Key Improvements:**
  - **Standardized Errors (`VoltAgentError`):**
    - Introduced `VoltAgentError`, `ToolErrorInfo`, and `StreamOnErrorCallback` types in `@voltagent/core`.
    - LLM Providers (e.g., Vercel) now wrap underlying SDK/API errors into a structured `VoltAgentError` before passing them to `onError` callbacks or throwing them.
    - Agent methods (`generateText`, `streamText`, `generateObject`, `streamObject`) now consistently handle `VoltAgentError`, enabling richer context (stage, code, tool details) in history events and logs.

  - **Standardized Stream Finish Results:**
    - Introduced `StreamTextFinishResult`, `StreamTextOnFinishCallback`, `StreamObjectFinishResult`, and `StreamObjectOnFinishCallback` types in `@voltagent/core`.
    - LLM Providers (e.g., Vercel) now construct these standardized result objects upon successful stream completion.
    - Agent streaming methods (`streamText`, `streamObject`) now receive these standardized results in their `onFinish` handlers, ensuring consistent access to final output (`text` or `object`), `usage`, `finishReason`, etc., for history, events, and hooks.

  - **Updated Interfaces:** The `LLMProvider` interface and related options types (`StreamTextOptions`, `StreamObjectOptions`) have been updated to reflect these new standardized callback types and error-throwing expectations.

  These changes lead to more predictable behavior, improved debugging capabilities through structured errors, and a more consistent experience when working with different LLM providers.

- [`7a7a0f6`](https://github.com/VoltAgent/voltagent/commit/7a7a0f672adbe42635c3edc5f0a7f282575d0932) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: Refactor Agent Hooks Signature to Use Single Argument Object - #57

  This change refactors the signature for all agent hooks (`onStart`, `onEnd`, `onToolStart`, `onToolEnd`, `onHandoff`) in `@voltagent/core` to improve usability, readability, and extensibility.

  **Key Changes:**
  - **Single Argument Object:** All hooks now accept a single argument object containing named properties (e.g., `{ agent, context, output, error }`) instead of positional arguments.
  - **`onEnd` / `onToolEnd` Refinement:** The `onEnd` and `onToolEnd` hooks no longer use an `isError` flag or a combined `outputOrError` parameter. They now have distinct `output: <Type> | undefined` and `error: VoltAgentError | undefined` properties, making it explicit whether the operation or tool execution succeeded or failed.
  - **Unified `onEnd` Output:** The `output` type for the `onEnd` hook (`AgentOperationOutput`) is now a standardized union type, providing a consistent structure regardless of which agent method (`generateText`, `streamText`, etc.) completed successfully.

  **Migration Guide:**

  If you have implemented custom agent hooks, you will need to update their signatures:

  **Before:**

  ```typescript
  const myHooks = {
    onStart: async (agent, context) => {
      /* ... */
    },
    onEnd: async (agent, outputOrError, context, isError) => {
      if (isError) {
        // Handle error (outputOrError is the error)
      } else {
        // Handle success (outputOrError is the output)
      }
    },
    onToolStart: async (agent, tool, context) => {
      /* ... */
    },
    onToolEnd: async (agent, tool, result, context) => {
      // Assuming result might contain an error or be the success output
    },
    // ...
  };
  ```

  **After:**

  ```typescript
  import type {
    OnStartHookArgs,
    OnEndHookArgs,
    OnToolStartHookArgs,
    OnToolEndHookArgs,
    // ... other needed types
  } from "@voltagent/core";

  const myHooks = {
    onStart: async (args: OnStartHookArgs) => {
      const { agent, context } = args;
      /* ... */
    },
    onEnd: async (args: OnEndHookArgs) => {
      const { agent, output, error, context } = args;
      if (error) {
        // Handle error (error is VoltAgentError)
      } else if (output) {
        // Handle success (output is AgentOperationOutput)
      }
    },
    onToolStart: async (args: OnToolStartHookArgs) => {
      const { agent, tool, context } = args;
      /* ... */
    },
    onToolEnd: async (args: OnToolEndHookArgs) => {
      const { agent, tool, output, error, context } = args;
      if (error) {
        // Handle tool error (error is VoltAgentError)
      } else {
        // Handle tool success (output is the result)
      }
    },
    // ...
  };
  ```

  Update your hook function definitions to accept the single argument object and use destructuring or direct property access (`args.propertyName`) to get the required data.

## 0.1.8

### Patch Changes

- [#51](https://github.com/VoltAgent/voltagent/pull/51) [`55c58b0`](https://github.com/VoltAgent/voltagent/commit/55c58b0da12dd94a3095aad4bc74c90757c98db4) Thanks [@kwaa](https://github.com/kwaa)! - Use the latest Hono to avoid duplicate dependencies

- [#59](https://github.com/VoltAgent/voltagent/pull/59) [`d40cb14`](https://github.com/VoltAgent/voltagent/commit/d40cb14860a5abe8771e0b91200d10f522c62881) Thanks [@kwaa](https://github.com/kwaa)! - fix: add package exports

- [`e88cb12`](https://github.com/VoltAgent/voltagent/commit/e88cb1249c4189ced9e245069bed5eab71cdd894) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: Enhance `createPrompt` with Template Literal Type Inference

  Improved the `createPrompt` utility to leverage TypeScript's template literal types. This provides strong type safety by:
  - Automatically inferring required variable names directly from `{{variable}}` placeholders in the template string.
  - Enforcing the provision of all required variables with the correct types at compile time when calling `createPrompt`.

  This significantly reduces the risk of runtime errors caused by missing or misspelled prompt variables.

- [#65](https://github.com/VoltAgent/voltagent/pull/65) [`0651d35`](https://github.com/VoltAgent/voltagent/commit/0651d35442cda32b6057f8b7daf7fd8655a9a2a4) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: Add OpenAPI (Swagger) Documentation for Core API - #64
  - Integrated `@hono/zod-openapi` and `@hono/swagger-ui` to provide interactive API documentation.
  - Documented the following core endpoints with request/response schemas, parameters, and examples:
    - `GET /agents`: List all registered agents.
    - `POST /agents/{id}/text`: Generate text response.
    - `POST /agents/{id}/stream`: Stream text response (SSE).
    - `POST /agents/{id}/object`: Generate object response (Note: Requires backend update to fully support JSON Schema input).
    - `POST /agents/{id}/stream-object`: Stream object response (SSE) (Note: Requires backend update to fully support JSON Schema input).
  - Added `/doc` endpoint serving the OpenAPI 3.1 specification in JSON format.
  - Added `/ui` endpoint serving the interactive Swagger UI.
  - Improved API discoverability:
    - Added links to Swagger UI and OpenAPI Spec on the root (`/`) endpoint.
    - Added links to Swagger UI in the server startup console logs.
  - Refactored API schemas and route definitions into `api.routes.ts` for better organization.
  - Standardized generation options (like `userId`, `temperature`, `maxTokens`) in the API schema with descriptions, examples, and sensible defaults.

## 0.1.7

### Patch Changes

- [`e328613`](https://github.com/VoltAgent/voltagent/commit/e32861366852f4bb7ad8854527b2bb6525703a25) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: prevent `ReferenceError: module is not defined` in ES module environments by adding guards around the CommonJS-specific `require.main === module` check in the main entry point.

## 0.1.6

### Patch Changes

- [#41](https://github.com/VoltAgent/voltagent/pull/41) [`52d5fa9`](https://github.com/VoltAgent/voltagent/commit/52d5fa94045481dc43dc260a40b701606190585c) Thanks [@omeraplak](https://github.com/omeraplak)! - ## Introducing Toolkits for Better Tool Management

  Managing related tools and their instructions is now simpler with `Toolkit`s.

  **Motivation:**
  - Defining shared instructions for multiple related tools was cumbersome.
  - The logic for deciding which instructions to add to the agent's system prompt could become complex.
  - We wanted a cleaner way to group tools logically.

  **What's New: The `Toolkit`**

  A `Toolkit` bundles related tools and allows defining shared `instructions` and an `addInstructions` flag _at the toolkit level_.

  ```typescript
  // packages/core/src/tool/toolkit.ts
  export type Toolkit = {
    /**
     * Unique identifier name for the toolkit.
     */
    name: string;
    /**
     * A brief description of what the toolkit does. Optional.
     */
    description?: string;
    /**
     * Shared instructions for the LLM on how to use the tools within this toolkit.
     * Optional.
     */
    instructions?: string;
    /**
     * Whether to automatically add the toolkit's `instructions` to the agent's system prompt.
     * Defaults to false.
     */
    addInstructions?: boolean;
    /**
     * An array of Tool instances that belong to this toolkit.
     */
    tools: Tool<any>[];
  };
  ```

  **Key Changes to Core:**
  1.  **`ToolManager` Upgrade:** Now manages both `Tool` and `Toolkit` objects.
  2.  **`AgentOptions` Update:** The `tools` option accepts `(Tool<any> | Toolkit)[]`.
  3.  **Simplified Instruction Handling:** `Agent` now only adds instructions from `Toolkit`s where `addInstructions` is true.

  This change leads to a clearer separation of concerns, simplifies the agent's internal logic, and makes managing tool instructions more predictable and powerful.

  ### New `createToolkit` Helper

  We've also added a helper function, `createToolkit`, to simplify the creation of toolkits. It provides default values and basic validation:

  ```typescript
  // packages/core/src/tool/toolkit.ts
  export const createToolkit = (options: Toolkit): Toolkit => {
    if (!options.name) {
      throw new Error("Toolkit name is required");
    }
    if (!options.tools || options.tools.length === 0) {
      console.warn(`Toolkit '${options.name}' created without any tools.`);
    }

    return {
      name: options.name,
      description: options.description || "", // Default empty description
      instructions: options.instructions,
      addInstructions: options.addInstructions || false, // Default to false
      tools: options.tools || [], // Default to empty array
    };
  };
  ```

  **Example Usage:**

  ```typescript
  import { createTool, createToolkit } from "@voltagent/core";
  import { z } from "zod";

  // Define some tools first
  const getWeather = createTool({
    name: "getWeather",
    description: "Gets the weather for a location.",
    schema: z.object({ location: z.string() }),
    run: async ({ location }) => ({ temperature: "25C", condition: "Sunny" }),
  });

  const searchWeb = createTool({
    name: "searchWeb",
    description: "Searches the web for a query.",
    schema: z.object({ query: z.string() }),
    run: async ({ query }) => ({ results: ["Result 1", "Result 2"] }),
  });

  // Create a toolkit using the helper
  const webInfoToolkit = createToolkit({
    name: "web_information",
    description: "Tools for getting information from the web.",
    addInstructions: true, // Add the instructions to the system prompt
    tools: [getWeather, searchWeb],
  });

  console.log(webInfoToolkit);
  /*
  Output:
  {
    name: 'web_information',
    description: 'Tools for getting information from the web.',
    instructions: 'Use these tools to find current information online.',
    addInstructions: true,
    tools: [ [Object Tool: getWeather], [Object Tool: searchWeb] ]
  }
  */
  ```

- [#33](https://github.com/VoltAgent/voltagent/pull/33) [`3ef2eaa`](https://github.com/VoltAgent/voltagent/commit/3ef2eaa9661e8ecfebf17af56b09af41285d0ca9) Thanks [@kwaa](https://github.com/kwaa)! - Update package.json files:
  - Remove `src` directory from the `files` array.
  - Add explicit `exports` field for better module resolution.

- [#41](https://github.com/VoltAgent/voltagent/pull/41) [`52d5fa9`](https://github.com/VoltAgent/voltagent/commit/52d5fa94045481dc43dc260a40b701606190585c) Thanks [@omeraplak](https://github.com/omeraplak)! - ## Introducing Reasoning Tools Helper

  This update introduces a new helper function, `createReasoningTools`, to easily add step-by-step reasoning capabilities to your agents. #24

  ### New `createReasoningTools` Helper

  **Feature:** Easily add `think` and `analyze` tools for step-by-step reasoning.

  We've added a new helper function, `createReasoningTools`, which makes it trivial to equip your agents with structured thinking capabilities, similar to patterns seen in advanced AI systems.
  - **What it does:** Returns a pre-configured `Toolkit` named `reasoning_tools`.
  - **Tools included:** Contains the `think` tool (for internal monologue/planning) and the `analyze` tool (for evaluating results and deciding next steps).
  - **Instructions:** Includes detailed instructions explaining how the agent should use these tools iteratively to solve problems. You can choose whether these instructions are automatically added to the system prompt via the `addInstructions` option.

  ```typescript
  import { createReasoningTools, type Toolkit } from "@voltagent/core";

  // Get the reasoning toolkit (with instructions included in the system prompt)
  const reasoningToolkit: Toolkit = createReasoningTools({ addInstructions: true });

  // Get the toolkit without automatically adding instructions
  const reasoningToolkitManual: Toolkit = createReasoningTools({ addInstructions: false });
  ```

  ### How to Use Reasoning Tools

  Pass the `Toolkit` object returned by `createReasoningTools` directly to the agent's `tools` array.

  ```typescript
  // Example: Using the new reasoning tools helper
  import { Agent, createReasoningTools, type Toolkit } from "@voltagent/core";
  import { VercelAIProvider } from "@voltagent/vercel-ai";
  import { openai } from "@ai-sdk/openai";

  const reasoningToolkit: Toolkit = createReasoningTools({
    addInstructions: true,
  });

  const agent = new Agent({
    name: "MyThinkingAgent",
    instructions: "An agent equipped with reasoning tools.",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
    tools: [reasoningToolkit], // Pass the toolkit
  });

  // Agent's system message will include reasoning instructions.
  ```

  This change simplifies adding reasoning capabilities to your agents.

## 0.1.5

### Patch Changes

- [#35](https://github.com/VoltAgent/voltagent/pull/35) [`9acbbb8`](https://github.com/VoltAgent/voltagent/commit/9acbbb898a517902cbdcb7ae7a8460e9d35f3dbe) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: Prevent potential error when accessing debug option in LibSQLStorage - #34
  - Modified the `debug` method within the `LibSQLStorage` class.
  - Changed the access to `this.options.debug` to use optional chaining (`this.options?.debug`).

  This change prevents runtime errors that could occur in specific environments, such as Next.js, if the `debug` method is invoked before the `options` object is fully initialized or if `options` becomes unexpectedly `null` or `undefined`. It ensures the debug logging mechanism is more robust.

## 0.1.4

### Patch Changes

- [#27](https://github.com/VoltAgent/voltagent/pull/27) [`3c0829d`](https://github.com/VoltAgent/voltagent/commit/3c0829dcec4db9596147b583a9cf2d4448bc30f1) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: improve sub-agent context sharing for sequential task execution - #30

  Enhanced the Agent system to properly handle context sharing between sub-agents, enabling reliable sequential task execution. The changes include:
  - Adding `contextMessages` parameter to `getSystemMessage` method
  - Refactoring `prepareAgentsMemory` to properly format conversation history
  - Ensuring conversation context is correctly passed between delegated tasks
  - Enhancing system prompts to better handle sequential workflows

  This fixes issues where the second agent in a sequence would not have access to the first agent's output, causing failures in multi-step workflows.

## 0.1.1

- 🚀 **Introducing VoltAgent: TypeScript AI Agent Framework!**

  This initial release marks the beginning of VoltAgent, a powerful toolkit crafted for the JavaScript developer community. We saw the challenges: the complexity of building AI from scratch, the limitations of No-Code tools, and the lack of first-class AI tooling specifically for JS.

  ![VoltAgent Demo](https://cdn.voltagent.dev/readme/demo.gif)
  VoltAgent aims to fix that by providing the building blocks you need:
  - **`@voltagent/core`**: The foundational engine for agent capabilities.
  - **`@voltagent/voice`**: Easily add voice interaction.
  - **`@voltagent/vercel-ai`**: Seamless integration with [Vercel AI SDK](https://sdk.vercel.ai/docs/introduction).
  - **`@voltagent/xsai`**: A Seamless integration with [xsAI](https://xsai.js.org/).
  - **`@voltagent/cli` & `create-voltagent-app`**: Quick start tools to get you building _fast_.

  We're combining the flexibility of code with the clarity of visual tools (like our **currently live [VoltOps LLM Observability Platform](https://console.voltagent.dev/)**) to make AI development easier, clearer, and more powerful. Join us as we build the future of AI in JavaScript!

  Explore the [Docs](https://voltagent.dev/docs/) and join our [Discord community](https://s.voltagent.dev/discord)!
