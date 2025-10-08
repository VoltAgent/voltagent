import { ZodLiteral } from 'zod';
import { MapNullableType } from '../types';
export declare class LiteralTransformer {
    transform<T>(zodSchema: ZodLiteral<T>, mapNullableType: MapNullableType): {
        enum: T[];
        type?: ((import("openapi3-ts/oas30").SchemaObjectType | import("openapi3-ts/oas30").SchemaObjectType[]) & (import("openapi3-ts/oas31").SchemaObjectType | import("openapi3-ts/oas31").SchemaObjectType[])) | undefined;
        nullable?: boolean | undefined;
    };
}
