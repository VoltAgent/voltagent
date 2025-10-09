"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  OpenAPIHono: () => OpenAPIHono,
  createRoute: () => createRoute,
  extendZodWithOpenApi: () => import_zod_to_openapi.extendZodWithOpenApi,
  z: () => import_zod.z
});
module.exports = __toCommonJS(index_exports);
var import_zod_to_openapi = require("../../zod-to-openapi/v3/index.cjs");
var import_zod_validator = require("../../zod-validator/index.cjs");
var import_hono = require("hono");
var import_url = require("hono/utils/url");
var import_zod = require("zod");
var OpenAPIHono = class _OpenAPIHono extends import_hono.Hono {
  openAPIRegistry;
  defaultHook;
  constructor(init) {
    super(init);
    this.openAPIRegistry = new import_zod_to_openapi.OpenAPIRegistry();
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
      const validator = (0, import_zod_validator.zValidator)("query", route.request.query, hook);
      validators.push(validator);
    }
    if (route.request?.params) {
      const validator = (0, import_zod_validator.zValidator)("param", route.request.params, hook);
      validators.push(validator);
    }
    if (route.request?.headers) {
      const validator = (0, import_zod_validator.zValidator)("header", route.request.headers, hook);
      validators.push(validator);
    }
    if (route.request?.cookies) {
      const validator = (0, import_zod_validator.zValidator)("cookie", route.request.cookies, hook);
      validators.push(validator);
    }
    const bodyContent = route.request?.body?.content;
    if (bodyContent) {
      for (const mediaType of Object.keys(bodyContent)) {
        if (!bodyContent[mediaType]) {
          continue;
        }
        const schema = bodyContent[mediaType]["schema"];
        if (!(schema instanceof import_zod.ZodType)) {
          continue;
        }
        if (isJSONContentType(mediaType)) {
          const validator = (0, import_zod_validator.zValidator)("json", schema, hook);
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
          const validator = (0, import_zod_validator.zValidator)("form", schema, hook);
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
  getOpenAPIDocument = (config) => {
    const generator = new import_zod_to_openapi.OpenApiGeneratorV3(this.openAPIRegistry.definitions);
    const document = generator.generateDocument(config);
    return this._basePath ? addBasePathToDocument(document, this._basePath) : document;
  };
  getOpenAPI31Document = (config) => {
    const generator = new import_zod_to_openapi.OpenApiGeneratorV31(this.openAPIRegistry.definitions);
    const document = generator.generateDocument(config);
    return this._basePath ? addBasePathToDocument(document, this._basePath) : document;
  };
  doc = (path, configure) => {
    return this.get(path, (c) => {
      const config = typeof configure === "function" ? configure(c) : configure;
      try {
        const document = this.getOpenAPIDocument(config);
        return c.json(document);
      } catch (e) {
        return c.json(e, 500);
      }
    });
  };
  doc31 = (path, configure) => {
    return this.get(path, (c) => {
      const config = typeof configure === "function" ? configure(c) : configure;
      try {
        const document = this.getOpenAPI31Document(config);
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
            path: (0, import_url.mergePath)(
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
            path: (0, import_url.mergePath)(
              pathForOpenAPI,
              // @ts-expect-error _basePath is private
              app._basePath.replaceAll(/:([^\/]+)/g, "{$1}"),
              def.webhook.path
            )
          });
          return;
        }
        case "schema":
          return this.openAPIRegistry.register(def.schema._def.openapi._internal.refId, def.schema);
        case "parameter":
          return this.openAPIRegistry.registerParameter(
            def.schema._def.openapi._internal.refId,
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
(0, import_zod_to_openapi.extendZodWithOpenApi)(import_zod.z);
function addBasePathToDocument(document, basePath) {
  const updatedPaths = {};
  Object.keys(document.paths).forEach((path) => {
    updatedPaths[(0, import_url.mergePath)(basePath.replaceAll(/:([^\/]+)/g, "{$1}"), path)] = document.paths[path];
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  OpenAPIHono,
  createRoute,
  extendZodWithOpenApi,
  z
});
