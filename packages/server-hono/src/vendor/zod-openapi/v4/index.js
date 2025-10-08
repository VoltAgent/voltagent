// src/index.ts
import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  OpenApiGeneratorV31,
  extendZodWithOpenApi,
  getOpenApiMetadata
} from "../../zod-to-openapi/v4/index.mjs";
import { zValidator } from "../../zod-validator/index.js";
import { Hono } from "hono";
import { mergePath } from "hono/utils/url";
import { ZodType, z } from "zod";
var OpenAPIHono = class _OpenAPIHono extends Hono {
  openAPIRegistry;
  defaultHook;
  constructor(init) {
    super(init);
    this.openAPIRegistry = new OpenAPIRegistry();
    this.defaultHook = init?.defaultHook;
  }
  /**
   *
   * @param {RouteConfig} route - The route definition which you create with `createRoute()`.
   * @param {Handler} handler - The handler. If you want to return a JSON object, you should specify the status code with `c.json()`.
   * @param {Hook} hook - Optional. The hook method defines what it should do after validation.
   * @example
   * app.openapi(
   *   route,
   *   (c) => {
   *     // ...
   *     return c.json(
   *       {
   *         age: 20,
   *         name: 'Young man',
   *       },
   *       200 // You should specify the status code even if it's 200.
   *     )
   *   },
   *  (result, c) => {
   *    if (!result.success) {
   *      return c.json(
   *        {
   *          code: 400,
   *          message: 'Custom Message',
   *        },
   *        400
   *      )
   *    }
   *  }
   *)
   */
  openapi = ({ middleware: routeMiddleware, hide, ...route }, handler, hook = this.defaultHook) => {
    if (!hide) {
      this.openAPIRegistry.registerPath(route);
    }
    const validators = [];
    if (route.request?.query) {
      const validator = zValidator("query", route.request.query, hook);
      validators.push(validator);
    }
    if (route.request?.params) {
      const validator = zValidator("param", route.request.params, hook);
      validators.push(validator);
    }
    if (route.request?.headers) {
      const validator = zValidator("header", route.request.headers, hook);
      validators.push(validator);
    }
    if (route.request?.cookies) {
      const validator = zValidator("cookie", route.request.cookies, hook);
      validators.push(validator);
    }
    const bodyContent = route.request?.body?.content;
    if (bodyContent) {
      for (const mediaType of Object.keys(bodyContent)) {
        if (!bodyContent[mediaType]) {
          continue;
        }
        const schema = bodyContent[mediaType]["schema"];
        if (!(schema instanceof ZodType)) {
          continue;
        }
        if (isJSONContentType(mediaType)) {
          const validator = zValidator("json", schema, hook);
          if (route.request?.body?.required) {
            validators.push(validator);
          } else {
            const mw = async (c, next) => {
              if (c.req.header("content-type")) {
                if (isJSONContentType(c.req.header("content-type"))) {
                  return await validator(c, next);
                }
              }
              c.req.addValidatedData("json", {});
              await next();
            };
            validators.push(mw);
          }
        }
        if (isFormContentType(mediaType)) {
          const validator = zValidator("form", schema, hook);
          if (route.request?.body?.required) {
            validators.push(validator);
          } else {
            const mw = async (c, next) => {
              if (c.req.header("content-type")) {
                if (isFormContentType(c.req.header("content-type"))) {
                  return await validator(c, next);
                }
              }
              c.req.addValidatedData("form", {});
              await next();
            };
            validators.push(mw);
          }
        }
      }
    }
    const middleware = routeMiddleware ? Array.isArray(routeMiddleware) ? routeMiddleware : [routeMiddleware] : [];
    this.on(
      [route.method],
      route.path.replaceAll(/\/{(.+?)}/g, "/:$1"),
      ...middleware,
      ...validators,
      handler
    );
    return this;
  };
  getOpenAPIDocument = (objectConfig, generatorConfig) => {
    const generator = new OpenApiGeneratorV3(this.openAPIRegistry.definitions, generatorConfig);
    const document = generator.generateDocument(objectConfig);
    return this._basePath ? addBasePathToDocument(document, this._basePath) : document;
  };
  getOpenAPI31Document = (objectConfig, generatorConfig) => {
    const generator = new OpenApiGeneratorV31(this.openAPIRegistry.definitions, generatorConfig);
    const document = generator.generateDocument(objectConfig);
    return this._basePath ? addBasePathToDocument(document, this._basePath) : document;
  };
  doc = (path, configureObject, configureGenerator) => {
    return this.get(path, (c) => {
      const objectConfig = typeof configureObject === "function" ? configureObject(c) : configureObject;
      const generatorConfig = typeof configureGenerator === "function" ? configureGenerator(c) : configureGenerator;
      try {
        const document = this.getOpenAPIDocument(objectConfig, generatorConfig);
        return c.json(document);
      } catch (e) {
        return c.json(e, 500);
      }
    });
  };
  doc31 = (path, configureObject, configureGenerator) => {
    return this.get(path, (c) => {
      const objectConfig = typeof configureObject === "function" ? configureObject(c) : configureObject;
      const generatorConfig = typeof configureGenerator === "function" ? configureGenerator(c) : configureGenerator;
      try {
        const document = this.getOpenAPI31Document(objectConfig, generatorConfig);
        return c.json(document);
      } catch (e) {
        return c.json(e, 500);
      }
    });
  };
  route(path, app) {
    const pathForOpenAPI = path.replaceAll(/:([^\/]+)/g, "{$1}");
    super.route(path, app);
    if (!(app instanceof _OpenAPIHono)) {
      return this;
    }
    app.openAPIRegistry.definitions.forEach((def) => {
      switch (def.type) {
        case "component":
          return this.openAPIRegistry.registerComponent(def.componentType, def.name, def.component);
        case "route": {
          this.openAPIRegistry.registerPath({
            ...def.route,
            path: mergePath(
              pathForOpenAPI,
              // @ts-expect-error _basePath is private
              app._basePath.replaceAll(/:([^\/]+)/g, "{$1}"),
              def.route.path
            )
          });
          return;
        }
        case "webhook": {
          this.openAPIRegistry.registerWebhook({
            ...def.webhook,
            path: mergePath(
              pathForOpenAPI,
              // @ts-expect-error _basePath is private
              app._basePath.replaceAll(/:([^\/]+)/g, "{$1}"),
              def.webhook.path
            )
          });
          return;
        }
        case "schema":
          return this.openAPIRegistry.register(
            getOpenApiMetadata(def.schema)._internal?.refId,
            def.schema
          );
        case "parameter":
          return this.openAPIRegistry.registerParameter(
            getOpenApiMetadata(def.schema)._internal?.refId,
            def.schema
          );
        default: {
          const errorIfNotExhaustive = def;
          throw new Error(`Unknown registry type: ${errorIfNotExhaustive}`);
        }
      }
    });
    return this;
  }
  basePath(path) {
    return new _OpenAPIHono({ ...super.basePath(path), defaultHook: this.defaultHook });
  }
};
var createRoute = (routeConfig) => {
  const route = {
    ...routeConfig,
    getRoutingPath() {
      return routeConfig.path.replaceAll(/\/{(.+?)}/g, "/:$1");
    }
  };
  return Object.defineProperty(route, "getRoutingPath", { enumerable: false });
};
extendZodWithOpenApi(z);
function addBasePathToDocument(document, basePath) {
  const updatedPaths = {};
  Object.keys(document.paths).forEach((path) => {
    updatedPaths[mergePath(basePath.replaceAll(/:([^\/]+)/g, "{$1}"), path)] = document.paths[path];
  });
  return {
    ...document,
    paths: updatedPaths
  };
}
function isJSONContentType(contentType) {
  return /^application\/([a-z-\.]+\+)?json/.test(contentType);
}
function isFormContentType(contentType) {
  return contentType.startsWith("multipart/form-data") || contentType.startsWith("application/x-www-form-urlencoded");
}
export {
  OpenAPIHono,
  createRoute,
  extendZodWithOpenApi,
  z
};
