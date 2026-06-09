# Testing

VoltAgent uses Vitest for testing, with `*.spec.ts` for runtime tests and `*.spec-d.ts` for type tests.

## Quick Reference

- **Framework**: Vitest
- **Runtime test files**: `*.spec.ts`
- **Type test files**: `*.spec-d.ts`
- **Coverage**: V8 provider
- **Environment**: Node.js

## Running Tests

```bash
# Run all tests
pnpm test:all

# Run tests with coverage
pnpm test:all:coverage

# Run tests for a specific package
pnpm --dir packages/core test

# Run single test file
pnpm --dir packages/core test:single -- src/tool/index.spec.ts
```

## Writing Tests

Tests should be co-located with the code they cover. Use matching names where possible, such as `tool.spec.ts` for `tool.ts`.

### Basic Structure

```typescript
import { describe, expect, it, vi } from "vitest";
import { yourFunction } from "./index";

describe("yourFunction", () => {
  it("should do something", () => {
    // Arrange
    const instance = new YourClass();

    // Act
    const result = instance.methodName();

    // Assert
    expect(result).toBe("expected");
  });
});
```

### Type Tests

Type tests verify public inference and type compatibility. Add or update `*.spec-d.ts` files when changing exported types, generics, or overload behavior.

```typescript
import { describe, expectTypeOf, it } from "vitest";
import type { YourType } from "./index";

describe("YourType", () => {
  it("should have the correct type", () => {
    expectTypeOf<YourType>().toBeObject();
  });
});
```

[Type Test Documentation](https://vitest.dev/guide/testing-types.html)

### Mocking

```typescript
// Mock external modules
vi.mock("uuid", () => ({
  v4: vi.fn().mockReturnValue("mock-uuid"),
}));

// Mock AI SDK functions
vi.mock("ai", () => ({
  generateText: vi.fn(),
  streamText: vi.fn(),
}));

// Mock functions
const mockExecute = vi.fn();
```

[Mocking Documentation](https://vitest.dev/guide/mocking.html#mocking)

### Testing Agents with the AI SDK

VoltAgent is built on top of the `ai` SDK, and uses the `ai/test` package to mock the AI SDK functions for testing.

```typescript
import { MockLanguageModelV3 } from "ai/test";
import { Agent } from "./agent";

describe("Agent", () => {
  let mockModel: MockLanguageModelV3;

  beforeEach(() => {
    mockModel = new MockLanguageModelV3({
      doGenerate: vi.fn().mockResolvedValue({
        finishReason: "stop",
        content: [{ type: "text", text: "Hello, world!" }],
        usage: {
          inputTokens: 10,
          outputTokens: 20,
          totalTokens: 30,
          inputTokenDetails: { noCacheTokens: 10, cacheReadTokens: 0, cacheWriteTokens: 0 },
          outputTokenDetails: { textTokens: 20, reasoningTokens: 0 },
        },
      }),
    });
  });

  it("should generate text", async () => {
    const agent = new Agent({
      name: "test-agent",
      model: mockModel,
    });

    const result = await agent.generateText("Say hello");
    expect(result.text).toBe("Hello, world!");
  });
});
```

### Testing Tools

```typescript
import { z } from "zod";
import { createTool } from "./index";

describe("Tool", () => {
  it("should create tool with schema", () => {
    const tool = createTool({
      name: "testTool",
      description: "A test tool",
      parameters: z.object({
        input: z.string(),
      }),
      execute: async ({ input }) => `Output: ${input}`,
    });

    expect(tool.name).toBe("testTool");
    expect(tool.execute).resolves.toBe("Output: test");
  });
});
```

## Related Docs

- [Development tooling](./tooling.md)
- [Linting and formatting](./linting.md)
