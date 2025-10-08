import { MapNullableOfArrayWithNullable, MapSubSchema, SchemaObject } from '../types';
import { ZodIntersection } from 'zod';
export declare class IntersectionTransformer {
    transform(zodSchema: ZodIntersection, isNullable: boolean, mapNullableOfArray: MapNullableOfArrayWithNullable, mapItem: MapSubSchema): SchemaObject;
    private flattenIntersectionTypes;
}
