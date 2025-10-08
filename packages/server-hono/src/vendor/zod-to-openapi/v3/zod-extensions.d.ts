import { ParameterObject as ParameterObject30, SchemaObject as SchemaObject30 } from 'openapi3-ts/oas30';
import { ParameterObject as ParameterObject31, SchemaObject as SchemaObject31 } from 'openapi3-ts/oas31';
import type { ZodObject, ZodRawShape, ZodTypeAny, z } from 'zod';
type ExampleValue<T> = T extends Date ? string : T;
type ParameterObject = ParameterObject30 | ParameterObject31;
type SchemaObject = SchemaObject30 | SchemaObject31;
export type ZodOpenAPIMetadata<T = any, E = ExampleValue<T>> = Omit<SchemaObject, 'example' | 'examples' | 'default'> & {
    param?: Partial<ParameterObject> & {
        example?: E;
    };
    example?: E;
    examples?: E[];
    default?: T;
};
export interface ZodOpenAPIInternalMetadata {
    refId?: string;
    extendedFrom?: {
        refId: string;
        schema: ZodObject<ZodRawShape>;
    };
}
export interface ZodOpenApiFullMetadata<T = any> {
    _internal?: ZodOpenAPIInternalMetadata;
    metadata?: ZodOpenAPIMetadata<T>;
}
declare module 'zod' {
    interface ZodTypeDef {
        openapi?: ZodOpenApiFullMetadata;
    }
    interface ZodType<Output = any, Def extends ZodTypeDef = ZodTypeDef, Input = Output> {
        openapi<T extends ZodTypeAny>(this: T, metadata: Partial<ZodOpenAPIMetadata<z.input<T>>>): T;
        openapi<T extends ZodTypeAny>(this: T, refId: string, metadata?: Partial<ZodOpenAPIMetadata<z.input<T>>>): T;
    }
}
export declare function extendZodWithOpenApi(zod: typeof z): void;
export {};
