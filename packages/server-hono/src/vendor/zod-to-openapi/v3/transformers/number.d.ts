import { ZodNumber } from 'zod';
import { MapNullableType, GetNumberChecks } from '../types';
export declare class NumberTransformer {
    transform(zodSchema: ZodNumber, mapNullableType: MapNullableType, getNumberChecks: GetNumberChecks): {
        minimum?: number | undefined;
        exclusiveMinimum?: undefined;
        maximum?: number | undefined;
        exclusiveMaximum?: undefined;
        type?: ((import("openapi3-ts/oas30").SchemaObjectType | import("openapi3-ts/oas30").SchemaObjectType[]) & (import("openapi3-ts/oas31").SchemaObjectType | import("openapi3-ts/oas31").SchemaObjectType[])) | undefined;
        nullable?: boolean | undefined;
    };
}
