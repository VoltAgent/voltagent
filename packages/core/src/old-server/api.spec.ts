import type { CustomEndpointDefinition } from "./custom-endpoints";
import { CustomEndpointError } from "./custom-endpoints";

// Create a mock app
const mockApp = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  options: vi.fn(),
};

// Mock only the default export (the app), not the functions
vi.mock("./api", async () => ({
  __esModule: true,
  ...((await vi.importActual("./api")) as {
    default: typeof mockApp;
    registerCustomEndpoint: typeof registerCustomEndpoint;
    registerCustomEndpoints: typeof registerCustomEndpoints;
  }),
}));

// Import the actual functions after mocking
import { registerCustomEndpoint, registerCustomEndpoints } from "./api";

describe("API Custom Endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear global state before each test
    (global as any).__voltAgentCustomEndpoints = undefined;
  });

  describe("registerCustomEndpoint", () => {
    it("should validate and register a valid endpoint", () => {
      const endpoint: CustomEndpointDefinition = {
        path: "/test",
        method: "get",
        handler: (c: any) => c.json({ success: true }),
        description: "Test endpoint",
      };

      // Test that it doesn't throw for valid endpoint
      expect(() => registerCustomEndpoint(endpoint)).not.toThrow();

      // Test that it stores the endpoint in global state
      expect((global as any).__voltAgentCustomEndpoints).toHaveLength(1);
      expect((global as any).__voltAgentCustomEndpoints[0].path).toBe("/test");
      expect((global as any).__voltAgentCustomEndpoints[0].method).toBe("get");
    });

    it("should throw an error for an invalid endpoint", () => {
      const endpoint = {
        path: "invalid-path", // Missing leading slash
        method: "get",
        handler: (c: any) => c.json({ success: true }),
      } as unknown as CustomEndpointDefinition;

      expect(() => registerCustomEndpoint(endpoint)).toThrow(CustomEndpointError);
    });
  });

  describe("registerCustomEndpoints", () => {
    it("should validate and register multiple valid endpoints", () => {
      const endpoints: CustomEndpointDefinition[] = [
        {
          path: "/test1",
          method: "get",
          handler: (c: any) => c.json({ success: true }),
          description: "Test endpoint 1",
        },
        {
          path: "/test2",
          method: "post",
          handler: (c: any) => c.json({ success: true }),
          description: "Test endpoint 2",
        },
      ];

      expect(() => registerCustomEndpoints(endpoints)).not.toThrow();

      // Test that it stores the endpoints in global state
      expect((global as any).__voltAgentCustomEndpoints).toHaveLength(2);
      expect((global as any).__voltAgentCustomEndpoints[0].path).toBe("/test1");
      expect((global as any).__voltAgentCustomEndpoints[1].path).toBe("/test2");
    });

    it("should throw an error if any endpoint is invalid", () => {
      const endpoints: CustomEndpointDefinition[] = [
        {
          path: "/test1",
          method: "get",
          handler: (c: any) => c.json({ success: true }),
          description: "Test endpoint 1",
        },
        {
          path: "invalid-path", // Missing leading slash
          method: "post",
          handler: (c: any) => c.json({ success: true }),
          description: "Test endpoint 2",
        },
      ];

      expect(() => registerCustomEndpoints(endpoints)).toThrow(CustomEndpointError);
    });

    it("should do nothing if endpoints is an empty array", () => {
      const endpoints: CustomEndpointDefinition[] = [];

      expect(() => registerCustomEndpoints(endpoints)).not.toThrow();

      // Global state should remain undefined for empty array
      expect((global as any).__voltAgentCustomEndpoints).toBeUndefined();
    });

    it("should accumulate endpoints in global state", () => {
      const firstBatch: CustomEndpointDefinition[] = [
        {
          path: "/test1",
          method: "get",
          handler: (c: any) => c.json({ success: true }),
          description: "Test endpoint 1",
        },
      ];

      const secondBatch: CustomEndpointDefinition[] = [
        {
          path: "/test2",
          method: "post",
          handler: (c: any) => c.json({ success: true }),
          description: "Test endpoint 2",
        },
      ];

      registerCustomEndpoints(firstBatch);
      registerCustomEndpoints(secondBatch);

      expect((global as any).__voltAgentCustomEndpoints).toHaveLength(2);
      expect((global as any).__voltAgentCustomEndpoints[0].path).toBe("/test1");
      expect((global as any).__voltAgentCustomEndpoints[1].path).toBe("/test2");
    });
  });
});
