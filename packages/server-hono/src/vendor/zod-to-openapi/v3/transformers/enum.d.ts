import { ZodEnum } from 'zod';
import { MapNullableType } from '../types';
export declare class EnumTransformer {
    transform<T extends [string, ...string[]]>(zodSchema: ZodEnum<T>, mapNullableType: MapNullableType): {
        enum: T;
        type?: ((import("openapi3-ts/oas30").SchemaObjectType | import("openapi3-ts/oas30").SchemaObjectType[]) & (import("openapi3-ts/oas31").SchemaObjectType | import("openapi3-ts/oas31").SchemaObjectType[])) | undefined;
        nullable?: boolean | undefined;
    };
}
