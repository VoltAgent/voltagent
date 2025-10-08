import { ZodDiscriminatedUnion, ZodDiscriminatedUnionOption } from 'zod';
import { DiscriminatorObject, MapNullableOfArrayWithNullable, MapSubSchema } from '../types';
export declare class DiscriminatedUnionTransformer {
    transform(zodSchema: ZodDiscriminatedUnion<string, ZodDiscriminatedUnionOption<string>[]>, isNullable: boolean, mapNullableOfArray: MapNullableOfArrayWithNullable, mapItem: MapSubSchema, generateSchemaRef: (schema: string) => string): {
        oneOf: (import("../types").SchemaObject | import("../types").ReferenceObject)[];
        discriminator?: undefined;
    } | {
        oneOf: (import("../types").SchemaObject | import("../types").ReferenceObject)[];
        discriminator: DiscriminatorObject | undefined;
    };
    private mapDiscriminator;
}
