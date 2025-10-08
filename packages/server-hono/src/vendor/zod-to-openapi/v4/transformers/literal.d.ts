import { ZodLiteral } from 'zod';
import { MapNullableType } from '../types';
export declare class LiteralTransformer {
    private bigIntTransformer;
    transform(zodSchema: ZodLiteral, mapNullableType: MapNullableType): Pick<import("../types").SchemaObject, "type" | "nullable"> | {
        enum: import("zod/v4/core/util.cjs").Literal[];
        type?: ((import("openapi3-ts/oas30").SchemaObjectType | import("openapi3-ts/oas30").SchemaObjectType[]) & (import("openapi3-ts/oas31").SchemaObjectType | import("openapi3-ts/oas31").SchemaObjectType[])) | undefined;
        nullable?: boolean | undefined;
    };
}
