import { ParameterObject as ParameterObject30, SchemaObject as SchemaObject30 } from 'openapi3-ts/oas30';
import { ParameterObject as ParameterObject31, SchemaObject as SchemaObject31 } from 'openapi3-ts/oas31';
import type { ZodObject } from 'zod';
import { z } from 'zod';
import type { core } from 'zod';
type ExampleValue<T> = T extends Date ? string : T;
type ParameterObject = ParameterObject30 | ParameterObject31;
type SchemaObject = SchemaObject30 | SchemaObject31;
export type UnionPreferredType = 'oneOf' | 'anyOf';
export type ZodOpenAPIMetadata<T = any, E = ExampleValue<T>> = Omit<SchemaObject, 'example' | 'examples' | 'default'> & {
    param?: Partial<ParameterObject> & {
        example?: E;
    };
    example?: E;
    examples?: E[];
    default?: T;
    _internal?: never;
};
interface OpenApiOptions {
    unionPreferredType?: UnionPreferredType;
}
/**
 *
 * Since this commit https://github.com/colinhacks/zod/commit/6707ebb14c885b1c577ce64a240475e26e3ff182
 * zod started preserving metadata from functions. Since the ZodObject type contains some function types
 * that also have generics this leads to a too deep type instantiation. We only use this type internally
 * so I've opted to type the _internal metadata in the registry as any. However the Metadata.getInternalMetadata
 * method has an explicit return type of ZodOpenAPIInternalMetadata.
 */
interface InternalUserOnlyZodOpenAPIInternalMetadata extends OpenApiOptions {
    refId?: string;
    extendedFrom?: {
        refId: string;
        schema: any;
    };
}
/**
 *
 * The metadata that is received from the registry should be obtained using the Metadata methods that have an
 * explicit return type of ZodOpenApiFullMetadata or ZodOpenAPIInternalMetadata.
 *
 * @deprecated Do not use for anything other than the registry. See the comment above for more details.
 */
export interface ZodOpenApiFullMetadataForRegistry<T = any> extends Omit<ZodOpenAPIMetadata<T>, '_internal'> {
    _internal?: InternalUserOnlyZodOpenAPIInternalMetadata;
    [k: string]: unknown;
}
export interface ZodOpenAPIInternalMetadata extends InternalUserOnlyZodOpenAPIInternalMetadata {
    extendedFrom?: {
        refId: string;
        schema: ZodObject;
    };
}
export interface ZodOpenApiFullMetadata<T = any> extends ZodOpenApiFullMetadataForRegistry<T> {
    _internal?: ZodOpenAPIInternalMetadata;
}
declare module 'zod' {
    interface ZodType<out Output = unknown, out Input = unknown, out Internals extends core.$ZodTypeInternals<Output, Input> = core.$ZodTypeInternals<Output, Input>> extends core.$ZodType<Output, Input, Internals> {
        openapi(metadata: Partial<ZodOpenAPIMetadata<Input>>, options?: OpenApiOptions): this;
        openapi(refId: string, metadata?: Partial<ZodOpenAPIMetadata<Input>>, options?: OpenApiOptions): this;
    }
}
export declare function extendZodWithOpenApi(zod: typeof z): void;
export {};
