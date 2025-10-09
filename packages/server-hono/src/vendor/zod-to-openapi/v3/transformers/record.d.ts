import { MapNullableType, MapSubSchema, SchemaObject } from '../types';
import { ZodRecord } from 'zod';
export declare class RecordTransformer {
    transform(zodSchema: ZodRecord, mapNullableType: MapNullableType, mapItem: MapSubSchema): SchemaObject;
}
