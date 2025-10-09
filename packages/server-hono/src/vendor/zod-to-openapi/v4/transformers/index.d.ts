import { SchemaObject, ReferenceObject, MapSubSchema } from '../types';
import { ZodType } from 'zod';
import { OpenApiGeneratorOptions, OpenApiVersionSpecifics } from '../openapi-generator';
export declare class OpenApiTransformer {
    private versionSpecifics;
    private objectTransformer;
    private stringTransformer;
    private numberTransformer;
    private bigIntTransformer;
    private dateTransformer;
    private literalTransformer;
    private enumTransformer;
    private arrayTransformer;
    private tupleTransformer;
    private unionTransformer;
    private discriminatedUnionTransformer;
    private intersectionTransformer;
    private recordTransformer;
    constructor(versionSpecifics: OpenApiVersionSpecifics, options?: OpenApiGeneratorOptions);
    transform<T>(zodSchema: ZodType<T>, isNullable: boolean, mapItem: MapSubSchema, generateSchemaRef: (ref: string) => string, defaultValue?: T): SchemaObject | ReferenceObject;
    private transformSchemaWithoutDefault;
}
