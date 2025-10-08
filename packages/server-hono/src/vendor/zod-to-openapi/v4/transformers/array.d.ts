import { ZodArray } from 'zod';
import { MapNullableType, MapSubSchema } from '../types';
export declare class ArrayTransformer {
    transform(zodSchema: ZodArray, mapNullableType: MapNullableType, mapItems: MapSubSchema): {
        items: import("../types").SchemaObject | import("../types").ReferenceObject;
        minItems: number | undefined;
        maxItems: number | undefined;
        type?: ((import("openapi3-ts/oas30").SchemaObjectType | import("openapi3-ts/oas30").SchemaObjectType[]) & (import("openapi3-ts/oas31").SchemaObjectType | import("openapi3-ts/oas31").SchemaObjectType[])) | undefined;
        nullable?: boolean | undefined;
    };
}
