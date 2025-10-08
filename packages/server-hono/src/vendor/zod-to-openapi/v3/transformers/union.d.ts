import { ZodTypeAny, ZodUnion } from 'zod';
import { MapNullableOfArray, MapSubSchema } from '../types';
export declare class UnionTransformer {
    transform<T extends [ZodTypeAny, ...ZodTypeAny[]]>(zodSchema: ZodUnion<T>, mapNullableOfArray: MapNullableOfArray, mapItem: MapSubSchema): {
        anyOf: (import("../types").SchemaObject | import("../types").ReferenceObject)[];
    };
    private flattenUnionTypes;
    private unwrapNullable;
}
