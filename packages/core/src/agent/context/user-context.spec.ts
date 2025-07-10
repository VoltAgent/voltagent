import { describe, expect, it } from "vitest";
import type { OperationContext } from "../types";
import type { UserContext } from "./types";
import {
  createUserContext,
  hasUserContext,
  isUserContext,
  resolveUserContext,
} from "./user-context";

describe("createUserContext", () => {
  it("should create an empty user context when no data is provided", () => {
    const userContext = createUserContext();

    expect(userContext).toBeInstanceOf(Map);
    expect(Array.from(userContext.entries()).length).toBe(0);
    expect(isUserContext(userContext)).toBe(true);
  });

  it("should create a user context from a plain object", () => {
    const data = { name: "John", age: 30 };
    const userContext = createUserContext(data);

    expect(userContext).toBeInstanceOf(Map);
    expect(userContext.get("name")).toBe("John");
    expect(userContext.get("age")).toBe(30);
    expect(isUserContext(userContext)).toBe(true);
  });

  it("should create a user context from an array of entries", () => {
    const userContext = createUserContext([
      ["name", "John"],
      ["age", 30],
    ]);

    expect(userContext).toBeInstanceOf(Map);
    expect(userContext.get("name")).toBe("John");
    expect(userContext.get("age")).toBe(30);
    expect(isUserContext(userContext)).toBe(true);
  });

  it("should return a new Map if a new user context is passed", () => {
    const originalContext = createUserContext({ name: "John" });
    const userContext = createUserContext(originalContext);

    expect(userContext).not.toBe(originalContext);
    expect(isUserContext(userContext)).toBe(true);
  });

  it("should handle nested objects in the data", () => {
    const data = {
      user: { name: "John", age: 30 },
      settings: { theme: "dark" },
    };
    const userContext = createUserContext(data);

    expect(userContext.get("user")).toEqual({ name: "John", age: 30 });
    expect(userContext.get("settings")).toEqual({ theme: "dark" });
  });

  it("should handle arrays in the data", () => {
    const data = {
      tags: ["tag1", "tag2", "tag3"],
      numbers: [1, 2, 3],
    };
    const userContext = createUserContext(data);

    expect(userContext.get("tags")).toEqual(["tag1", "tag2", "tag3"]);
    expect(userContext.get("numbers")).toEqual([1, 2, 3]);
  });

  it("should handle null and undefined values", () => {
    const data = {
      nullValue: null,
      undefinedValue: undefined,
      emptyString: "",
    };
    const userContext = createUserContext(data);

    expect(userContext.get("nullValue")).toBe(null);
    expect(userContext.get("undefinedValue")).toBe(undefined);
    expect(userContext.get("emptyString")).toBe("");
  });
});

describe("resolveUserContext", () => {
  it("should return a new user context when operation context is null", () => {
    const userContext = resolveUserContext(null);

    expect(userContext).toBeInstanceOf(Map);
    expect(isUserContext(userContext)).toBe(true);
  });

  it("should return a new user context when operation context is undefined", () => {
    const userContext = resolveUserContext(undefined);

    expect(userContext).toBeInstanceOf(Map);
    expect(isUserContext(userContext)).toBe(true);
  });

  it("should return the user context from operation context when it exists", () => {
    const existingUserContext = createUserContext({ name: "John" });
    const operationContext = {
      userContext: existingUserContext,
      agentId: "test-agent",
      conversationId: "test-conversation",
      userId: "test-user",
    } as unknown as OperationContext;

    const userContext = resolveUserContext(operationContext);

    expect(userContext).toBe(existingUserContext);
    expect(userContext.get("name")).toBe("John");
  });

  it("should handle operation context with empty user context", () => {
    const emptyUserContext = createUserContext();
    const operationContext = {
      userContext: emptyUserContext,
      agentId: "test-agent",
      conversationId: "test-conversation",
      userId: "test-user",
    } as unknown as OperationContext;

    const userContext = resolveUserContext(operationContext);
    expect(userContext).toBe(emptyUserContext);
  });
});

describe("hasUserContext", () => {
  it("should return false when operation context is undefined", () => {
    const result = hasUserContext(undefined);
    expect(result).toBe(false);
  });

  it("should return false when operation context is null", () => {
    const result = hasUserContext(null);
    expect(result).toBe(false);
  });

  it("should return false when operation context is not an object", () => {
    const result = hasUserContext("not an object");
    expect(result).toBe(false);
  });

  it("should return false when operation context does not have userContext property", () => {
    const operationContext = { agentId: "test-agent" };
    const result = hasUserContext(operationContext);
    expect(result).toBe(false);
  });

  it("should return false when operation context has null userContext", () => {
    const operationContext = { userContext: null };
    const result = hasUserContext(operationContext);
    expect(result).toBe(false);
  });

  it("should return false when operation context has undefined userContext", () => {
    const operationContext = { userContext: undefined };
    const result = hasUserContext(operationContext);
    expect(result).toBe(false);
  });

  it("should return true when operation context has a valid user context", () => {
    const userContext = createUserContext({ name: "John" });
    const operationContext = { userContext };
    const result = hasUserContext(operationContext);
    expect(result).toBe(true);
  });

  it("should provide proper type narrowing", () => {
    const userContext = createUserContext({ name: "John" });
    const operationContext = { userContext };

    if (hasUserContext(operationContext)) {
      expectTypeOf(operationContext).toExtend<{ userContext: UserContext }>();
    } else {
      throw new Error("Operation context does not have user context");
    }
  });
});

describe("isUserContext", () => {
  it("should return false for null", () => {
    const result = isUserContext(null);
    expect(result).toBe(false);
  });

  it("should return false for undefined", () => {
    const result = isUserContext(undefined);
    expect(result).toBe(false);
  });

  it("should return false for primitive values", () => {
    expect(isUserContext("string")).toBe(false);
    expect(isUserContext(123)).toBe(false);
    expect(isUserContext(true)).toBe(false);
    expect(isUserContext(false)).toBe(false);
  });

  it("should return false for plain objects", () => {
    expect(isUserContext({})).toBe(false);
    expect(isUserContext({ name: "John" })).toBe(false);
  });

  it("should return false for arrays", () => {
    expect(isUserContext([])).toBe(false);
    expect(isUserContext([1, 2, 3])).toBe(false);
  });

  it("should return false for regular Map instances", () => {
    const regularMap = new Map([["name", "John"]]);
    expect(isUserContext(regularMap)).toBe(false);
  });

  it("should return true for user context created by createUserContext", () => {
    const userContext = createUserContext({ name: "John" });
    expect(isUserContext(userContext)).toBe(true);
  });

  it("should return true for empty user context", () => {
    const userContext = createUserContext();
    expect(isUserContext(userContext)).toBe(true);
  });

  it("should return true for user context with complex data", () => {
    const userContext = createUserContext({
      user: { name: "John", age: 30 },
      settings: { theme: "dark" },
      tags: ["tag1", "tag2"],
    });
    expect(isUserContext(userContext)).toBe(true);
  });

  it("should provide proper type narrowing", () => {
    const userContext = createUserContext({ name: "John" });

    if (isUserContext(userContext)) {
      expectTypeOf(userContext).toExtend<UserContext>();
    } else {
      throw new Error("User context is not a user context");
    }
  });
});
