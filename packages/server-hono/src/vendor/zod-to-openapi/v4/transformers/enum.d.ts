import { ZodEnum } from 'zod';
import { MapNullableType } from '../types';
export declare class EnumTransformer {
    transform(zodSchema: ZodEnum, mapNullableType: MapNullableType): {
        enum: (string | number | undefined)[];
        type?: ((import("openapi3-ts/oas30").SchemaObjectType | import("openapi3-ts/oas30").SchemaObjectType[]) & (import("openapi3-ts/oas31").SchemaObjectType | import("openapi3-ts/oas31").SchemaObjectType[])) | undefined;
        nullable?: boolean | undefined;
    };
}
