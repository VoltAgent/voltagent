import { MapNullableType, MapSubSchema, SchemaObject } from '../types';
import { ZodTuple } from 'zod';
import { OpenApiVersionSpecifics } from '../openapi-generator';
export declare class TupleTransformer {
    private versionSpecifics;
    constructor(versionSpecifics: OpenApiVersionSpecifics);
    transform(zodSchema: ZodTuple, mapNullableType: MapNullableType, mapItem: MapSubSchema): SchemaObject;
}
