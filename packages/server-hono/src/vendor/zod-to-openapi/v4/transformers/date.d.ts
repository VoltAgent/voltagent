import { MapNullableType } from '../types';
export declare class DateTransformer {
    transform(mapNullableType: MapNullableType): {
        format: string;
        type?: ((import("openapi3-ts/oas30").SchemaObjectType | import("openapi3-ts/oas30").SchemaObjectType[]) & (import("openapi3-ts/oas31").SchemaObjectType | import("openapi3-ts/oas31").SchemaObjectType[])) | undefined;
        nullable?: boolean | undefined;
    };
}
