import { RouteConfig as RouteConfig$1, ZodRequestBody, ZodContentObject, ZodMediaTypeObject, OpenApiGeneratorV3, OpenAPIRegistry } from '../../zod-to-openapi/v4/index';
export { extendZodWithOpenApi } from '../../zod-to-openapi/v4/index';
import { MiddlewareHandler, TypedResponse, Env, ValidationTargets, Context, Input, Handler, Schema, Hono, ToSchema } from 'hono';
import { MergePath, MergeSchemaPath } from 'hono/types';
import { InfoStatusCode, SuccessStatusCode, RedirectStatusCode, ClientErrorStatusCode, ServerErrorStatusCode, StatusCode } from 'hono/utils/http-status';
import { SimplifyDeepArray, JSONValue, JSONParsed, RemoveBlankRecord } from 'hono/utils/types';
import { OpenAPIObject } from 'openapi3-ts/oas30';
import { OpenAPIObject as OpenAPIObject$1 } from 'openapi3-ts/oas31';
import { ZodType, z, ZodError } from 'zod';
export { z } from 'zod';

type MaybePromise<T> = Promise<T> | T;
type RouteConfig = RouteConfig$1 & {
    middleware?: MiddlewareHandler | MiddlewareHandler[];
    hide?: boolean;
};
type RequestTypes = {
    body?: ZodRequestBody;
    params?: ZodType;
    query?: ZodType;
    cookies?: ZodType;
    headers?: ZodType | ZodType[];
};
type IsJson<T> = T extends string ? T extends `application/${infer Start}json${infer _End}` ? Start extends '' | `${string}+` | `vnd.${string}+` ? 'json' : never : never : never;
type IsForm<T> = T extends string ? T extends `multipart/form-data${infer _Rest}` | `application/x-www-form-urlencoded${infer _Rest}` ? 'form' : never : never;
type ReturnJsonOrTextOrResponse<ContentType, Content, Status extends keyof StatusCodeRangeDefinitions | StatusCode> = ContentType extends string ? ContentType extends `application/${infer Start}json${infer _End}` ? Start extends '' | `${string}+` | `vnd.${string}+` ? TypedResponse<SimplifyDeepArray<Content> extends JSONValue ? JSONValue extends SimplifyDeepArray<Content> ? never : JSONParsed<Content> : never, ExtractStatusCode<Status>, 'json'> : never : ContentType extends `text/plain${infer _Rest}` ? TypedResponse<Content, ExtractStatusCode<Status>, 'text'> : Response : never;
type RequestPart<R extends RouteConfig, Part extends string> = Part extends keyof R['request'] ? R['request'][Part] : {};
type HasUndefined<T> = undefined extends T ? true : false;
type InputTypeBase<R extends RouteConfig, Part extends string, Type extends keyof ValidationTargets> = R['request'] extends RequestTypes ? RequestPart<R, Part> extends ZodType ? {
    in: {
        [K in Type]: HasUndefined<ValidationTargets[K]> extends true ? {
            [K2 in keyof z.input<RequestPart<R, Part>>]?: z.input<RequestPart<R, Part>>[K2];
        } : {
            [K2 in keyof z.input<RequestPart<R, Part>>]: z.input<RequestPart<R, Part>>[K2];
        };
    };
    out: {
        [K in Type]: z.output<RequestPart<R, Part>>;
    };
} : {} : {};
type InputTypeJson<R extends RouteConfig> = R['request'] extends RequestTypes ? R['request']['body'] extends ZodRequestBody ? R['request']['body']['content'] extends ZodContentObject ? IsJson<keyof R['request']['body']['content']> extends never ? {} : R['request']['body']['content'][keyof R['request']['body']['content']] extends Record<'schema', ZodType<any>> ? {
    in: {
        json: z.input<R['request']['body']['content'][keyof R['request']['body']['content']]['schema']>;
    };
    out: {
        json: z.output<R['request']['body']['content'][keyof R['request']['body']['content']]['schema']>;
    };
} : {} : {} : {} : {};
type InputTypeForm<R extends RouteConfig> = R['request'] extends RequestTypes ? R['request']['body'] extends ZodRequestBody ? R['request']['body']['content'] extends ZodContentObject ? IsForm<keyof R['request']['body']['content']> extends never ? {} : R['request']['body']['content'][keyof R['request']['body']['content']] extends Record<'schema', ZodType<any>> ? {
    in: {
        form: z.input<R['request']['body']['content'][keyof R['request']['body']['content']]['schema']>;
    };
    out: {
        form: z.output<R['request']['body']['content'][keyof R['request']['body']['content']]['schema']>;
    };
} : {} : {} : {} : {};
type InputTypeParam<R extends RouteConfig> = InputTypeBase<R, 'params', 'param'>;
type InputTypeQuery<R extends RouteConfig> = InputTypeBase<R, 'query', 'query'>;
type InputTypeHeader<R extends RouteConfig> = InputTypeBase<R, 'headers', 'header'>;
type InputTypeCookie<R extends RouteConfig> = InputTypeBase<R, 'cookies', 'cookie'>;
type ExtractContent<T> = T extends {
    [K in keyof T]: infer A;
} ? A extends Record<'schema', ZodType> ? z.infer<A['schema']> : never : never;
type StatusCodeRangeDefinitions = {
    '1XX': InfoStatusCode;
    '2XX': SuccessStatusCode;
    '3XX': RedirectStatusCode;
    '4XX': ClientErrorStatusCode;
    '5XX': ServerErrorStatusCode;
};
type RouteConfigStatusCode = keyof StatusCodeRangeDefinitions | StatusCode;
type ExtractStatusCode<T extends RouteConfigStatusCode> = T extends keyof StatusCodeRangeDefinitions ? StatusCodeRangeDefinitions[T] : T;
type DefinedStatusCodes<R extends RouteConfig> = keyof R['responses'] & RouteConfigStatusCode;
type RouteConfigToTypedResponse<R extends RouteConfig> = {
    [Status in DefinedStatusCodes<R>]: R['responses'][Status] extends {
        content: infer Content;
    } ? undefined extends Content ? never : ReturnJsonOrTextOrResponse<keyof R['responses'][Status]['content'], ExtractContent<R['responses'][Status]['content']>, Status> : TypedResponse<{}, ExtractStatusCode<Status>, string>;
}[DefinedStatusCodes<R>] | ('default' extends keyof R['responses'] ? R['responses']['default'] extends {
    content: infer Content;
} ? undefined extends Content ? never : ReturnJsonOrTextOrResponse<keyof Content, ExtractContent<Content>, Exclude<StatusCode, ExtractStatusCode<DefinedStatusCodes<R>>>> : TypedResponse<{}, Exclude<StatusCode, ExtractStatusCode<DefinedStatusCodes<R>>>, string> : never);
type Hook<T, E extends Env, P extends string, R> = (result: {
    target: keyof ValidationTargets;
} & ({
    success: true;
    data: T;
} | {
    success: false;
    error: ZodError;
}), c: Context<E, P>) => R;
type ConvertPathType<T extends string> = T extends `${infer Start}/{${infer Param}}${infer Rest}` ? `${Start}/:${Param}${ConvertPathType<Rest>}` : T;
type OpenAPIHonoOptions<E extends Env> = {
    defaultHook?: Hook<any, E, any, any>;
};
type HonoInit<E extends Env> = ConstructorParameters<typeof Hono>[0] & OpenAPIHonoOptions<E>;
/**
 * Turns `T | T[] | undefined` into `T[]`
 */
type AsArray<T> = T extends undefined ? [] : T extends any[] ? T : [T];
/**
 * Like simplify but recursive
 */
type DeepSimplify<T> = {
    [KeyType in keyof T]: T[KeyType] extends Record<string, unknown> ? DeepSimplify<T[KeyType]> : T[KeyType];
} & {};
/**
 * Helper to infer generics from {@link MiddlewareHandler}
 */
type OfHandlerType<T extends MiddlewareHandler> = T extends MiddlewareHandler<infer E, infer P, infer I> ? {
    env: E;
    path: P;
    input: I;
} : never;
/**
 * Reduce a tuple of middleware handlers into a single
 * handler representing the composition of all
 * handlers.
 */
type MiddlewareToHandlerType<M extends MiddlewareHandler<any, any, any>[]> = M extends [
    infer First,
    infer Second,
    ...infer Rest
] ? First extends MiddlewareHandler<any, any, any> ? Second extends MiddlewareHandler<any, any, any> ? Rest extends MiddlewareHandler<any, any, any>[] ? MiddlewareToHandlerType<[
    MiddlewareHandler<DeepSimplify<OfHandlerType<First>['env'] & OfHandlerType<Second>['env']>, // Combine envs
    OfHandlerType<First>['path'], // Keep path from First
    OfHandlerType<First>['input']>,
    ...Rest
]> : never : never : never : M extends [infer Last] ? Last : MiddlewareHandler<Env>;
type RouteMiddlewareParams<R extends RouteConfig> = OfHandlerType<MiddlewareToHandlerType<AsArray<R['middleware']>>>;
type RouteConfigToEnv<R extends RouteConfig> = RouteMiddlewareParams<R> extends never ? Env : RouteMiddlewareParams<R>['env'];
type RouteHandler<R extends RouteConfig, E extends Env = RouteConfigToEnv<R>, I extends Input = InputTypeParam<R> & InputTypeQuery<R> & InputTypeHeader<R> & InputTypeCookie<R> & InputTypeForm<R> & InputTypeJson<R>, P extends string = ConvertPathType<R['path']>> = Handler<E, P, I, R extends {
    responses: {
        [statusCode: number]: {
            content: {
                [mediaType: string]: ZodMediaTypeObject;
            };
        };
    };
} ? MaybePromise<RouteConfigToTypedResponse<R>> : MaybePromise<RouteConfigToTypedResponse<R>> | MaybePromise<Response>>;
type RouteHook<R extends RouteConfig, E extends Env = RouteConfigToEnv<R>, I extends Input = InputTypeParam<R> & InputTypeQuery<R> & InputTypeHeader<R> & InputTypeCookie<R> & InputTypeForm<R> & InputTypeJson<R>, P extends string = ConvertPathType<R['path']>> = Hook<I, E, P, RouteConfigToTypedResponse<R> | Response | Promise<Response> | void | Promise<void>>;
type OpenAPIObjectConfig = Parameters<InstanceType<typeof OpenApiGeneratorV3>['generateDocument']>[0];
type OpenAPIObjectConfigure<E extends Env, P extends string> = OpenAPIObjectConfig | ((context: Context<E, P>) => OpenAPIObjectConfig);
type OpenAPIGeneratorOptions = ConstructorParameters<typeof OpenApiGeneratorV3>[1];
type OpenAPIGeneratorConfigure<E extends Env, P extends string> = OpenAPIGeneratorOptions | ((context: Context<E, P>) => OpenAPIGeneratorOptions);
declare class OpenAPIHono<E extends Env = Env, S extends Schema = {}, BasePath extends string = '/'> extends Hono<E, S, BasePath> {
    openAPIRegistry: OpenAPIRegistry;
    defaultHook?: OpenAPIHonoOptions<E>['defaultHook'];
    constructor(init?: HonoInit<E>);
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
    openapi: <R extends RouteConfig, I extends Input = InputTypeParam<R> & InputTypeQuery<R> & InputTypeHeader<R> & InputTypeCookie<R> & InputTypeForm<R> & InputTypeJson<R>, P extends string = ConvertPathType<R["path"]>>({ middleware: routeMiddleware, hide, ...route }: R, handler: Handler<R["middleware"] extends MiddlewareHandler[] | MiddlewareHandler ? RouteMiddlewareParams<R>["env"] & E : E, P, I, R extends {
        responses: {
            [statusCode: number]: {
                content: {
                    [mediaType: string]: ZodMediaTypeObject;
                };
            };
        };
    } ? MaybePromise<RouteConfigToTypedResponse<R>> : MaybePromise<RouteConfigToTypedResponse<R>> | MaybePromise<Response>>, hook?: Hook<I, E, P, R extends {
        responses: {
            [statusCode: number]: {
                content: {
                    [mediaType: string]: ZodMediaTypeObject;
                };
            };
        };
    } ? MaybePromise<RouteConfigToTypedResponse<R>> | undefined : MaybePromise<RouteConfigToTypedResponse<R>> | MaybePromise<Response> | undefined> | undefined) => OpenAPIHono<E, S & ToSchema<R["method"], MergePath<BasePath, P>, I, RouteConfigToTypedResponse<R>>, BasePath>;
    getOpenAPIDocument: (objectConfig: OpenAPIObjectConfig, generatorConfig?: OpenAPIGeneratorOptions) => OpenAPIObject;
    getOpenAPI31Document: (objectConfig: OpenAPIObjectConfig, generatorConfig?: OpenAPIGeneratorOptions) => OpenAPIObject$1;
    doc: <P extends string>(path: P, configureObject: OpenAPIObjectConfigure<E, P>, configureGenerator?: OpenAPIGeneratorConfigure<E, P>) => OpenAPIHono<E, S & ToSchema<"get", P, {}, {}>, BasePath>;
    doc31: <P extends string>(path: P, configureObject: OpenAPIObjectConfigure<E, P>, configureGenerator?: OpenAPIGeneratorConfigure<E, P>) => OpenAPIHono<E, S & ToSchema<"get", P, {}, {}>, BasePath>;
    route<SubPath extends string, SubEnv extends Env, SubSchema extends Schema, SubBasePath extends string>(path: SubPath, app: Hono<SubEnv, SubSchema, SubBasePath>): OpenAPIHono<E, MergeSchemaPath<SubSchema, MergePath<BasePath, SubPath>> & S, BasePath>;
    route<SubPath extends string>(path: SubPath): Hono<E, RemoveBlankRecord<S>, BasePath>;
    basePath<SubPath extends string>(path: SubPath): OpenAPIHono<E, S, MergePath<BasePath, SubPath>>;
}
type RoutingPath<P extends string> = P extends `${infer Head}/{${infer Param}}${infer Tail}` ? `${Head}/:${Param}${RoutingPath<Tail>}` : P;
declare const createRoute: <P extends string, R extends Omit<RouteConfig, "path"> & {
    path: P;
}>(routeConfig: R) => R & {
    getRoutingPath(): RoutingPath<R["path"]>;
};

export { type DeepSimplify, type Hook, type MiddlewareToHandlerType, type OfHandlerType, type OpenAPIGeneratorConfigure, type OpenAPIGeneratorOptions, OpenAPIHono, type OpenAPIHonoOptions, type OpenAPIObjectConfigure, type RouteConfig, type RouteConfigToEnv, type RouteConfigToTypedResponse, type RouteHandler, type RouteHook, createRoute };
