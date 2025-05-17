import { app } from "./api";
import { registerCustomEndpoint, registerCustomEndpoints } from "./api";
import { CustomEndpointDefinition, CustomEndpointError } from "./custom-endpoints";

// Mock the Hono app
jest.mock("./api", () => {
  const app = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    options: jest.fn(),
    head: jest.fn(),
  };

  return {
    app,
    registerCustomEndpoint: jest.requireActual("./api").registerCustomEndpoint,
    registerCustomEndpoints: jest.requireActual("./api").registerCustomEndpoints,
  };
});

describe("API Custom Endpoints", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("registerCustomEndpoint", () => {
    it("should register a GET endpoint", () => {
      const endpoint: CustomEndpointDefinition = {
        path: "/test",
        method: "get",
        handler: (c) => c.json({ success: true }),
        description: "Test endpoint",
      };

      registerCustomEndpoint(endpoint);

      expect(app.get).toHaveBeenCalledWith("/test", endpoint.handler);
    });

    it("should register a POST endpoint", () => {
      const endpoint: CustomEndpointDefinition = {
        path: "/test",
        method: "post",
        handler: (c) => c.json({ success: true }),
        description: "Test endpoint",
      };

      registerCustomEndpoint(endpoint);

      expect(app.post).toHaveBeenCalledWith("/test", endpoint.handler);
    });

    it("should register a PUT endpoint", () => {
      const endpoint: CustomEndpointDefinition = {
        path: "/test",
        method: "put",
        handler: (c) => c.json({ success: true }),
        description: "Test endpoint",
      };

      registerCustomEndpoint(endpoint);

      expect(app.put).toHaveBeenCalledWith("/test", endpoint.handler);
    });

    it("should register a PATCH endpoint", () => {
      const endpoint: CustomEndpointDefinition = {
        path: "/test",
        method: "patch",
        handler: (c) => c.json({ success: true }),
        description: "Test endpoint",
      };

      registerCustomEndpoint(endpoint);

      expect(app.patch).toHaveBeenCalledWith("/test", endpoint.handler);
    });

    it("should register a DELETE endpoint", () => {
      const endpoint: CustomEndpointDefinition = {
        path: "/test",
        method: "delete",
        handler: (c) => c.json({ success: true }),
        description: "Test endpoint",
      };

      registerCustomEndpoint(endpoint);

      expect(app.delete).toHaveBeenCalledWith("/test", endpoint.handler);
    });

    it("should register an OPTIONS endpoint", () => {
      const endpoint: CustomEndpointDefinition = {
        path: "/test",
        method: "options",
        handler: (c) => c.json({ success: true }),
        description: "Test endpoint",
      };

      registerCustomEndpoint(endpoint);

      expect(app.options).toHaveBeenCalledWith("/test", endpoint.handler);
    });

    it("should register a HEAD endpoint", () => {
      const endpoint: CustomEndpointDefinition = {
        path: "/test",
        method: "head",
        handler: (c) => c.json({ success: true }),
        description: "Test endpoint",
      };

      registerCustomEndpoint(endpoint);

      expect(app.head).toHaveBeenCalledWith("/test", endpoint.handler);
    });

    it("should throw an error for an invalid endpoint", () => {
      const endpoint = {
        path: "invalid-path", // Missing leading slash
        method: "get",
        handler: (c) => c.json({ success: true }),
      } as unknown as CustomEndpointDefinition;

      expect(() => registerCustomEndpoint(endpoint)).toThrow(CustomEndpointError);
    });
  });

  describe("registerCustomEndpoints", () => {
    it("should register multiple endpoints", () => {
      const endpoints: CustomEndpointDefinition[] = [
        {
          path: "/test1",
          method: "get",
          handler: (c) => c.json({ success: true }),
          description: "Test endpoint 1",
        },
        {
          path: "/test2",
          method: "post",
          handler: (c) => c.json({ success: true }),
          description: "Test endpoint 2",
        },
      ];

      registerCustomEndpoints(endpoints);

      expect(app.get).toHaveBeenCalledWith("/test1", endpoints[0].handler);
      expect(app.post).toHaveBeenCalledWith("/test2", endpoints[1].handler);
    });

    it("should throw an error if any endpoint is invalid", () => {
      const endpoints: CustomEndpointDefinition[] = [
        {
          path: "/test1",
          method: "get",
          handler: (c) => c.json({ success: true }),
          description: "Test endpoint 1",
        },
        {
          path: "invalid-path", // Missing leading slash
          method: "post",
          handler: (c) => c.json({ success: true }),
          description: "Test endpoint 2",
        },
      ];

      expect(() => registerCustomEndpoints(endpoints)).toThrow(CustomEndpointError);
    });

    it("should do nothing if endpoints is an empty array", () => {
      const endpoints: CustomEndpointDefinition[] = [];

      registerCustomEndpoints(endpoints);

      expect(app.get).not.toHaveBeenCalled();
      expect(app.post).not.toHaveBeenCalled();
      expect(app.put).not.toHaveBeenCalled();
      expect(app.patch).not.toHaveBeenCalled();
      expect(app.delete).not.toHaveBeenCalled();
      expect(app.options).not.toHaveBeenCalled();
      expect(app.head).not.toHaveBeenCalled();
    });
  });
});
