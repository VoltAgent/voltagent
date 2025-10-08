import { MapNullableOfArrayWithNullable, MapSubSchema, SchemaObject } from '../types';
import { ZodIntersection, ZodTypeAny } from 'zod';
export declare class IntersectionTransformer {
    transform(zodSchema: ZodIntersection<ZodTypeAny, ZodTypeAny>, isNullable: boolean, mapNullableOfArray: MapNullableOfArrayWithNullable, mapItem: MapSubSchema): SchemaObject;
    private flattenIntersectionTypes;
}
