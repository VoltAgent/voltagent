import type { ZodTypeAny } from 'zod';
import { OpenAPIDefinitions, RouteConfig } from './openapi-registry';
import { ComponentsObject, OpenAPIObject, PathItemObject, ReferenceObject, SchemaObject, ZodNumericCheck } from './types';
declare const openApiVersions: readonly ["3.0.0", "3.0.1", "3.0.2", "3.0.3", "3.1.0"];
export type OpenApiVersion = typeof openApiVersions[number];
export interface OpenApiVersionSpecifics {
    get nullType(): any;
    mapNullableOfArray(objects: any[], isNullable: boolean): any[];
    mapNullableType(type: NonNullable<SchemaObject['type']> | undefined, isNullable: boolean): Pick<SchemaObject, 'type' | 'nullable'>;
    mapTupleItems(schemas: (SchemaObject | ReferenceObject)[]): {
        items?: SchemaObject | ReferenceObject;
        minItems?: number;
        maxItems?: number;
        prefixItems?: (SchemaObject | ReferenceObject)[];
    };
    getNumberChecks(checks: ZodNumericCheck[]): any;
}
export declare class OpenAPIGenerator {
    private definitions;
    private versionSpecifics;
    private schemaRefs;
    private paramRefs;
    private pathRefs;
    private rawComponents;
    private openApiTransformer;
    constructor(definitions: (OpenAPIDefinitions | ZodTypeAny)[], versionSpecifics: OpenApiVersionSpecifics);
    generateDocumentData(): {
        components: ComponentsObject;
        paths: Record<string, PathItemObject>;
    };
    generateComponents(): Pick<OpenAPIObject, 'components'>;
    private buildComponents;
    private sortDefinitions;
    private generateSingle;
    private generateParameterDefinition;
    private getParameterRef;
    private generateInlineParameters;
    private generateSimpleParameter;
    private generateParameter;
    private generateSchemaWithMetadata;
    /**
     * Same as above but applies nullable
     */
    private constructReferencedOpenAPISchema;
    /**
     * Generates an OpenAPI SchemaObject or a ReferenceObject with all the provided metadata applied
     */
    private generateSimpleSchema;
    /**
     * Same as `generateSchema` but if the new schema is added into the
     * referenced schemas, it would return a ReferenceObject and not the
     * whole result.
     *
     * Should be used for nested objects, arrays, etc.
     */
    private generateSchemaWithRef;
    private generateSchemaRef;
    private getRequestBody;
    private getParameters;
    private cleanParameter;
    generatePath(route: RouteConfig): PathItemObject;
    private generateSingleRoute;
    private getResponse;
    private isReferenceObject;
    private getResponseHeaders;
    private getBodyContent;
    private toOpenAPISchema;
}
export {};
