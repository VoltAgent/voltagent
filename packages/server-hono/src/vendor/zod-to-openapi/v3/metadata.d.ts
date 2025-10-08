import { ZodType, ZodTypeAny } from 'zod';
import { ZodOpenAPIMetadata, ZodOpenApiFullMetadata } from './zod-extensions';
import { ParameterObject, ReferenceObject, SchemaObject } from './types';
export declare class Metadata {
    static getMetadata<T extends any>(zodSchema: ZodType<T>): ZodOpenApiFullMetadata<T> | undefined;
    static getInternalMetadata<T extends any>(zodSchema: ZodType<T>): import("./zod-extensions").ZodOpenAPIInternalMetadata | undefined;
    static getParamMetadata<T extends any>(zodSchema: ZodType<T>): ZodOpenApiFullMetadata<T> | undefined;
    /**
     * A method that omits all custom keys added to the regular OpenAPI
     * metadata properties
     */
    static buildSchemaMetadata(metadata: ZodOpenAPIMetadata): Partial<{
        [x: `x-${string}`]: any;
        minimum?: any;
        type?: any;
        maximum?: any;
        multipleOf?: any;
        example?: any;
        examples?: any;
        default?: any;
        discriminator?: any;
        readOnly?: any;
        writeOnly?: any;
        xml?: any;
        externalDocs?: any;
        deprecated?: any;
        format?: any;
        allOf?: any;
        oneOf?: any;
        anyOf?: any;
        not?: any;
        items?: any;
        properties?: any;
        additionalProperties?: any;
        description?: any;
        title?: any;
        exclusiveMaximum?: any;
        exclusiveMinimum?: any;
        maxLength?: any;
        minLength?: any;
        pattern?: any;
        maxItems?: any;
        minItems?: any;
        uniqueItems?: any;
        maxProperties?: any;
        minProperties?: any;
        required?: any;
        enum?: any;
    }>;
    static buildParameterMetadata(metadata: Required<ZodOpenAPIMetadata>['param']): Partial<{
        [x: `x-${string}`]: any;
        name?: any;
        in?: any;
        description?: any;
        required?: any;
        deprecated?: any;
        allowEmptyValue?: any;
        style?: any;
        explode?: any;
        allowReserved?: any;
        schema?: any;
        examples?: any;
        example?: any;
        content?: any;
    } | {
        [x: `x-${string}`]: any;
        name?: any;
        in?: any;
        description?: any;
        required?: any;
        deprecated?: any;
        allowEmptyValue?: any;
        style?: any;
        explode?: any;
        allowReserved?: any;
        schema?: any;
        examples?: any;
        example?: any;
        content?: any;
    }>;
    static applySchemaMetadata(initialData: SchemaObject | ParameterObject | ReferenceObject, metadata: Partial<ZodOpenAPIMetadata>): SchemaObject | ReferenceObject;
    static getRefId<T extends any>(zodSchema: ZodType<T>): string | undefined;
    static unwrapChained(schema: ZodType): ZodType;
    static getDefaultValue<T>(zodSchema: ZodTypeAny): T | undefined;
    private static unwrapUntil;
    static isOptionalSchema(zodSchema: ZodTypeAny): boolean;
}
