import {
  CustomEndpointDefinition,
  CustomEndpointError,
  validateCustomEndpoint,
  validateCustomEndpoints,
} from "./custom-endpoints";

describe("Custom Endpoints", () => {
  describe("validateCustomEndpoint", () => {
    it("should validate a valid endpoint definition", () => {
      const endpoint: CustomEndpointDefinition = {
        path: "/test",
        method: "get",
        handler: (c) => c.json({ success: true }),
        description: "Test endpoint",
      };

      expect(() => validateCustomEndpoint(endpoint)).not.toThrow();
      expect(validateCustomEndpoint(endpoint)).toEqual(endpoint);
    });

    it("should throw an error for an invalid path", () => {
      const endpoint: CustomEndpointDefinition = {
        path: "invalid-path", // Missing leading slash
        method: "get",
        handler: (c) => c.json({ success: true }),
      };

      expect(() => validateCustomEndpoint(endpoint)).toThrow(CustomEndpointError);
      expect(() => validateCustomEndpoint(endpoint)).toThrow(/Invalid custom endpoint definition/);
    });

    it("should throw an error for an invalid method", () => {
      const endpoint = {
        path: "/test",
        method: "invalid-method", // Not a valid HTTP method
        handler: (c) => c.json({ success: true }),
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

      expect(() => validateCustomEndpoints(endpoints)).not.toThrow();
      expect(validateCustomEndpoints(endpoints)).toEqual(endpoints);
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
