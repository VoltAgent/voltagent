import { CallbackObject as CallbackObject30, ComponentsObject as ComponentsObject30, EncodingObject as EncodingObject30, ExampleObject as ExampleObject30, ExamplesObject as ExamplesObject30, HeaderObject as HeaderObject30, HeadersObject as HeadersObject30, ISpecificationExtension as ISpecificationExtension30, LinkObject as LinkObject30, LinksObject as LinksObject30, OperationObject as OperationObject30, ParameterObject as ParameterObject30, ReferenceObject as ReferenceObject30, RequestBodyObject as RequestBodyObject30, ResponseObject as ResponseObject30, SchemaObject as SchemaObject30, SecuritySchemeObject as SecuritySchemeObject30 } from 'openapi3-ts/oas30';
import { CallbackObject as CallbackObject31, ComponentsObject as ComponentsObject31, EncodingObject as EncodingObject31, ExampleObject as ExampleObject31, ExamplesObject as ExamplesObject31, HeaderObject as HeaderObject31, HeadersObject as HeadersObject31, ISpecificationExtension as ISpecificationExtension31, LinkObject as LinkObject31, LinksObject as LinksObject31, OperationObject as OperationObject31, ParameterObject as ParameterObject31, ReferenceObject as ReferenceObject31, RequestBodyObject as RequestBodyObject31, ResponseObject as ResponseObject31, SchemaObject as SchemaObject31, SecuritySchemeObject as SecuritySchemeObject31 } from 'openapi3-ts/oas31';
type CallbackObject = CallbackObject30 | CallbackObject31;
type ComponentsObject = ComponentsObject30 | ComponentsObject31;
type EncodingObject = EncodingObject30 | EncodingObject31;
type ExampleObject = ExampleObject30 | ExampleObject31;
type ExamplesObject = ExamplesObject30 | ExamplesObject31;
type HeaderObject = HeaderObject30 | HeaderObject31;
type HeadersObject = HeadersObject30 | HeadersObject31;
type ISpecificationExtension = ISpecificationExtension30 | ISpecificationExtension31;
type LinkObject = LinkObject30 | LinkObject31;
type LinksObject = LinksObject30 | LinksObject31;
type OperationObject = OperationObject30 | OperationObject31;
type ParameterObject = ParameterObject30 | ParameterObject31;
type ReferenceObject = ReferenceObject30 | ReferenceObject31;
type RequestBodyObject = RequestBodyObject30 | RequestBodyObject31;
type ResponseObject = ResponseObject30 | ResponseObject31;
type SchemaObject = SchemaObject30 | SchemaObject31;
type SecuritySchemeObject = SecuritySchemeObject30 | SecuritySchemeObject31;
import type { AnyZodObject, ZodEffects, ZodType, ZodTypeAny } from 'zod';
type Method = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'head' | 'options' | 'trace';
export interface ZodMediaTypeObject {
    schema: ZodType<unknown> | SchemaObject | ReferenceObject;
    examples?: ExamplesObject;
    example?: any;
    encoding?: EncodingObject;
}
export type ZodMediaType = 'application/json' | 'text/html' | 'text/plain' | 'application/xml' | (string & {});
export type ZodContentObject = Partial<Record<ZodMediaType, ZodMediaTypeObject>>;
export interface ZodRequestBody {
    description?: string;
    content: ZodContentObject;
    required?: boolean;
}
export interface ResponseConfig {
    description: string;
    headers?: AnyZodObject | HeadersObject;
    links?: LinksObject;
    content?: ZodContentObject;
}
type ZodObjectWithEffect = AnyZodObject | ZodEffects<ZodObjectWithEffect, unknown, unknown>;
export type RouteParameter = ZodObjectWithEffect | undefined;
export type RouteConfig = Omit<OperationObject, 'responses'> & {
    method: Method;
    path: string;
    request?: {
        body?: ZodRequestBody;
        params?: RouteParameter;
        query?: RouteParameter;
        cookies?: RouteParameter;
        headers?: RouteParameter | ZodType<unknown>[];
    };
    responses: {
        [statusCode: string]: ResponseConfig | ReferenceObject;
    };
};
export type OpenAPIComponentObject = SchemaObject | ResponseObject | ParameterObject | ExampleObject | RequestBodyObject | HeaderObject | SecuritySchemeObject | LinkObject | CallbackObject | ISpecificationExtension;
export type ComponentTypeKey = Exclude<keyof ComponentsObject, number>;
export type ComponentTypeOf<K extends ComponentTypeKey> = NonNullable<ComponentsObject[K]>[string];
export type WebhookDefinition = {
    type: 'webhook';
    webhook: RouteConfig;
};
export type OpenAPIDefinitions = {
    type: 'component';
    componentType: ComponentTypeKey;
    name: string;
    component: OpenAPIComponentObject;
} | {
    type: 'schema';
    schema: ZodTypeAny;
} | {
    type: 'parameter';
    schema: ZodTypeAny;
} | {
    type: 'route';
    route: RouteConfig;
} | WebhookDefinition;
export declare class OpenAPIRegistry {
    private parents?;
    private _definitions;
    constructor(parents?: OpenAPIRegistry[] | undefined);
    get definitions(): OpenAPIDefinitions[];
    /**
     * Registers a new component schema under /components/schemas/${name}
     */
    register<T extends ZodTypeAny>(refId: string, zodSchema: T): T;
    /**
     * Registers a new parameter schema under /components/parameters/${name}
     */
    registerParameter<T extends ZodTypeAny>(refId: string, zodSchema: T): T;
    /**
     * Registers a new path that would be generated under paths:
     */
    registerPath(route: RouteConfig): void;
    /**
     * Registers a new webhook that would be generated under webhooks:
     */
    registerWebhook(webhook: RouteConfig): void;
    /**
     * Registers a raw OpenAPI component. Use this if you have a simple object instead of a Zod schema.
     *
     * @param type The component type, e.g. `schemas`, `responses`, `securitySchemes`, etc.
     * @param name The name of the object, it is the key under the component
     *             type in the resulting OpenAPI document
     * @param component The actual object to put there
     */
    registerComponent<K extends ComponentTypeKey>(type: K, name: string, component: ComponentTypeOf<K>): {
        name: string;
        ref: {
            $ref: string;
        };
    };
    private schemaWithRefId;
}
export {};
