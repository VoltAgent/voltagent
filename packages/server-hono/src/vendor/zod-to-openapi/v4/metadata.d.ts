import { ZodType, z } from 'zod';
import { ZodOpenAPIInternalMetadata, ZodOpenAPIMetadata, ZodOpenApiFullMetadata, ZodOpenApiFullMetadataForRegistry } from './zod-extensions';
import { ParameterObject, ReferenceObject, SchemaObject } from './types';
/**
 * @deprecated This is not really deprecated but this should always be used with
 * caution. Using it may alter the behavior of the library and the generated schemas.
 */
export declare const zodToOpenAPIRegistry: z.core.$ZodRegistry<ZodOpenApiFullMetadataForRegistry<any>, z.core.$ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
export declare class Metadata {
    static collectMetadata(schema: ZodType, metadata?: ZodOpenApiFullMetadata): ZodOpenApiFullMetadata | undefined;
    /**
     * @deprecated Use one of `getOpenApiMetadata` or `getInternalMetadata` instead
     */
    static getMetadata<T extends any>(zodSchema: ZodType<T>): ZodOpenApiFullMetadata<any> | undefined;
    static getOpenApiMetadata<T extends any>(zodSchema: ZodType<T>): ZodOpenAPIMetadata<T> | undefined;
    static getInternalMetadata<T extends any>(zodSchema: ZodType<T>): ZodOpenAPIInternalMetadata | undefined;
    static getParamMetadata<T extends any>(zodSchema: ZodType<T>): {
        param: {
            description?: string | undefined;
        } | {
            name?: string | undefined;
            in?: import("openapi3-ts/oas30").ParameterLocation | undefined;
            description?: string;
            required?: boolean | undefined;
            deprecated?: boolean | undefined;
            allowEmptyValue?: boolean | undefined;
            style?: import("openapi3-ts/oas30").ParameterStyle | undefined;
            explode?: boolean | undefined;
            allowReserved?: boolean | undefined;
            schema?: (import("openapi3-ts/oas30").SchemaObject | import("openapi3-ts/oas30").ReferenceObject) | undefined;
            examples?: {
                [param: string]: import("openapi3-ts/oas30").ExampleObject | import("openapi3-ts/oas30").ReferenceObject;
            } | undefined;
            example?: any;
            content?: import("openapi3-ts/oas30").ContentObject | undefined;
        } | {
            name?: string | undefined;
            in?: import("openapi3-ts/oas31").ParameterLocation | undefined;
            description?: string;
            required?: boolean | undefined;
            deprecated?: boolean | undefined;
            allowEmptyValue?: boolean | undefined;
            style?: import("openapi3-ts/oas31").ParameterStyle | undefined;
            explode?: boolean | undefined;
            allowReserved?: boolean | undefined;
            schema?: (import("openapi3-ts/oas31").SchemaObject | import("openapi3-ts/oas31").ReferenceObject) | undefined;
            examples?: {
                [param: string]: import("openapi3-ts/oas31").ExampleObject | import("openapi3-ts/oas31").ReferenceObject;
            } | undefined;
            example?: any;
            content?: import("openapi3-ts/oas31").ContentObject | undefined;
        };
        _internal?: ZodOpenAPIInternalMetadata;
        example?: any;
        examples?: any[] | undefined;
        default?: any;
        discriminator?: import("openapi3-ts/oas30").DiscriminatorObject | import("openapi3-ts/oas31").DiscriminatorObject | undefined;
        readOnly?: boolean;
        writeOnly?: boolean;
        xml?: import("openapi3-ts/oas30").XmlObject | import("openapi3-ts/oas31").XmlObject | undefined;
        externalDocs?: import("openapi3-ts/oas30").ExternalDocumentationObject | import("openapi3-ts/oas31").ExternalDocumentationObject | undefined;
        deprecated?: boolean;
        type?: "string" | "number" | "boolean" | "object" | "integer" | "null" | "array" | import("openapi3-ts/oas30").SchemaObjectType[] | import("openapi3-ts/oas31").SchemaObjectType[] | undefined;
        format?: import("openapi3-ts/oas30").SchemaObjectFormat;
        allOf?: (import("openapi3-ts/oas30").SchemaObject | import("openapi3-ts/oas30").ReferenceObject)[] | (import("openapi3-ts/oas31").SchemaObject | import("openapi3-ts/oas31").ReferenceObject)[] | undefined;
        oneOf?: (import("openapi3-ts/oas30").SchemaObject | import("openapi3-ts/oas30").ReferenceObject)[] | (import("openapi3-ts/oas31").SchemaObject | import("openapi3-ts/oas31").ReferenceObject)[] | undefined;
        anyOf?: (import("openapi3-ts/oas30").SchemaObject | import("openapi3-ts/oas30").ReferenceObject)[] | (import("openapi3-ts/oas31").SchemaObject | import("openapi3-ts/oas31").ReferenceObject)[] | undefined;
        not?: import("openapi3-ts/oas30").SchemaObject | import("openapi3-ts/oas31").SchemaObject | import("openapi3-ts/oas30").ReferenceObject | import("openapi3-ts/oas31").ReferenceObject | undefined;
        items?: import("openapi3-ts/oas30").SchemaObject | import("openapi3-ts/oas31").SchemaObject | import("openapi3-ts/oas30").ReferenceObject | import("openapi3-ts/oas31").ReferenceObject | undefined;
        properties?: {
            [propertyName: string]: import("openapi3-ts/oas30").SchemaObject | import("openapi3-ts/oas30").ReferenceObject;
        } | {
            [propertyName: string]: import("openapi3-ts/oas31").SchemaObject | import("openapi3-ts/oas31").ReferenceObject;
        } | undefined;
        additionalProperties?: boolean | import("openapi3-ts/oas30").SchemaObject | import("openapi3-ts/oas31").SchemaObject | import("openapi3-ts/oas30").ReferenceObject | import("openapi3-ts/oas31").ReferenceObject | undefined;
        description?: string;
        title?: string;
        multipleOf?: number;
        maximum?: number;
        exclusiveMaximum?: number | boolean | undefined;
        minimum?: number;
        exclusiveMinimum?: number | boolean | undefined;
        maxLength?: number;
        minLength?: number;
        pattern?: string;
        maxItems?: number;
        minItems?: number;
        uniqueItems?: boolean;
        maxProperties?: number;
        minProperties?: number;
        required?: string[];
        enum?: any[];
    };
    /**
     * A method that omits all custom keys added to the regular OpenAPI
     * metadata properties
     */
    static buildSchemaMetadata(metadata: Partial<ZodOpenAPIMetadata>): Partial<{
        [x: `x-${string}`]: any;
        example?: any;
        examples?: any;
        default?: any;
        discriminator?: any;
        readOnly?: any;
        writeOnly?: any;
        xml?: any;
        externalDocs?: any;
        deprecated?: any;
        type?: any;
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
        multipleOf?: any;
        maximum?: any;
        exclusiveMaximum?: any;
        minimum?: any;
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
    static getDefaultValue<T>(zodSchema: ZodType): T | undefined;
    private static unwrapUntil;
    static getMetadataFromInternalRegistry(zodSchema: ZodType): ZodOpenApiFullMetadata | undefined;
    static getMetadataFromRegistry(zodSchema: ZodType): any;
    static setMetadataInRegistry(zodSchema: ZodType, metadata: ZodOpenApiFullMetadata): void;
}
