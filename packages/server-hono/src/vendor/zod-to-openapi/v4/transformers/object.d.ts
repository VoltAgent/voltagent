import { MapNullableType, MapSubSchema, SchemaObject } from '../types';
import { ZodObject } from 'zod';
export declare class ObjectTransformer {
    transform(zodSchema: ZodObject, defaultValue: object, mapNullableType: MapNullableType, mapItem: MapSubSchema): SchemaObject;
    private generateAdditionalProperties;
    private requiredKeysOf;
}
