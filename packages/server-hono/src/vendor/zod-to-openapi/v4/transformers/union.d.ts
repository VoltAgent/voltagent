import { ZodUnion } from 'zod';
import { MapNullableOfArray, MapSubSchema } from '../types';
import { UnionPreferredType } from '../zod-extensions';
export declare class UnionTransformer {
    private options?;
    constructor(options?: {
        unionPreferredType?: UnionPreferredType;
    } | undefined);
    transform(zodSchema: ZodUnion, mapNullableOfArray: MapNullableOfArray, mapItem: MapSubSchema): {
        [x: string]: (import("../types").SchemaObject | import("../types").ReferenceObject)[];
    };
    private flattenUnionTypes;
    private unwrapNullable;
}
