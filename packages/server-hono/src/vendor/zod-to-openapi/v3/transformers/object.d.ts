import { MapNullableType, MapSubSchema, SchemaObject } from '../types';
import { ZodObject, ZodRawShape } from 'zod';
export declare class ObjectTransformer {
    transform(zodSchema: ZodObject<ZodRawShape>, defaultValue: object, mapNullableType: MapNullableType, mapItem: MapSubSchema): SchemaObject;
    private generateAdditionalProperties;
    private requiredKeysOf;
}
