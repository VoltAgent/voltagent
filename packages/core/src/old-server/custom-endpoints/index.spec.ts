import type { CustomEndpointDefinition } from "./index";
import { CustomEndpointError, validateCustomEndpoint, validateCustomEndpoints } from "./index";

describe("Custom Endpoints", () => {
  describe("validateCustomEndpoint", () => {
    it("should validate a valid endpoint definition", () => {
      const endpoint: CustomEndpointDefinition = {
        path: "/test",
        method: "get",
        handler: (c: any) => c.json({ success: true }),
        description: "Test endpoint",
      };

      expect(() => validateCustomEndpoint(endpoint)).not.toThrow();

      const result = validateCustomEndpoint(endpoint);
      expect(result.path).toBe(endpoint.path);
      expect(result.method).toBe(endpoint.method);
      expect(result.description).toBe(endpoint.description);
      expect(typeof result.handler).toBe("function");
    });

    it("should throw an error for an invalid path", () => {
      const endpoint: CustomEndpointDefinition = {
        path: "invalid-path", // Missing leading slash
        method: "get",
        handler: (c: any) => c.json({ success: true }),
      };

      expect(() => validateCustomEndpoint(endpoint)).toThrow(CustomEndpointError);
      expect(() => validateCustomEndpoint(endpoint)).toThrow(/Invalid custom endpoint definition/);
    });

    it("should throw an error for an invalid method", () => {
      const endpoint = {
        path: "/test",
        method: "invalid-method", // Not a valid HTTP method
        handler: (c: any) => c.json({ success: true }),
      } as unknown as CustomEndpointDefinition;

      expect(() => validateCustomEndpoint(endpoint)).toThrow(CustomEndpointError);
      expect(() => validateCustomEndpoint(endpoint)).toThrow(/Invalid custom endpoint definition/);
    });

    it("should throw an error if handler is not a function", () => {
      const endpoint = {
        path: "/test",
        method: "get",
        handler: "not-a-function", // Not a function
      } as unknown as CustomEndpointDefinition;

      expect(() => validateCustomEndpoint(endpoint)).toThrow(CustomEndpointError);
      expect(() => validateCustomEndpoint(endpoint)).toThrow(/Invalid custom endpoint definition/);
    });
  });

  describe("validateCustomEndpoints", () => {
    it("should validate an array of valid endpoint definitions", () => {
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

      expect(() => validateCustomEndpoints(endpoints)).not.toThrow();

      const result = validateCustomEndpoints(endpoints);
      expect(result).toHaveLength(2);
      expect(result[0].path).toBe("/test1");
      expect(result[0].method).toBe("get");
      expect(result[0].description).toBe("Test endpoint 1");
      expect(typeof result[0].handler).toBe("function");
      expect(result[1].path).toBe("/test2");
      expect(result[1].method).toBe("post");
      expect(result[1].description).toBe("Test endpoint 2");
      expect(typeof result[1].handler).toBe("function");
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

      expect(() => validateCustomEndpoints(endpoints)).toThrow(CustomEndpointError);
      expect(() => validateCustomEndpoints(endpoints)).toThrow(
        /Invalid custom endpoint definition/,
      );
    });

    it("should throw an error if endpoints is not an array", () => {
      const endpoints = "not-an-array" as unknown as CustomEndpointDefinition[];

      expect(() => validateCustomEndpoints(endpoints)).toThrow(CustomEndpointError);
      expect(() => validateCustomEndpoints(endpoints)).toThrow(/Custom endpoints must be an array/);
    });

    it("should return an empty array if endpoints is an empty array", () => {
      const endpoints: CustomEndpointDefinition[] = [];

      expect(validateCustomEndpoints(endpoints)).toEqual([]);
    });
  });
});
