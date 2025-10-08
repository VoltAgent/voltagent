import type { z } from 'zod';
export type ZodTypes = {
    ZodAny: z.ZodAny;
    ZodArray: z.ZodArray;
    ZodBigInt: z.ZodBigInt;
    ZodBoolean: z.ZodBoolean;
    ZodDefault: z.ZodDefault;
    ZodTransform: z.ZodTransform;
    ZodEnum: z.ZodEnum;
    ZodIntersection: z.ZodIntersection;
    ZodLiteral: z.ZodLiteral;
    ZodNever: z.ZodNever;
    ZodNull: z.ZodNull;
    ZodNullable: z.ZodNullable;
    ZodNumber: z.ZodNumber;
    ZodNonOptional: z.ZodNonOptional;
    ZodObject: z.ZodObject;
    ZodOptional: z.ZodOptional;
    ZodPipe: z.ZodPipe;
    ZodReadonly: z.ZodReadonly;
    ZodRecord: z.ZodRecord;
    ZodString: z.ZodString;
    ZodTuple: z.ZodTuple;
    ZodType: z.ZodType;
    ZodUnion: z.ZodUnion;
    ZodDiscriminatedUnion: z.ZodDiscriminatedUnion;
    ZodUnknown: z.ZodUnknown;
    ZodVoid: z.ZodVoid;
    ZodDate: z.ZodDate;
};
export declare function isZodType<TypeName extends keyof ZodTypes>(schema: object, typeNames: TypeName[]): schema is ZodTypes[TypeName];
export declare function isZodType<TypeName extends keyof ZodTypes>(schema: object, typeName: TypeName): schema is ZodTypes[TypeName];
export declare function isAnyZodType(schema: object): schema is z.ZodType;
/**
 * The schema.isNullable() is deprecated. This is the suggested replacement
 * as this was how isNullable operated beforehand.
 */
export declare function isNullableSchema(schema: z.ZodType): boolean;
/**
 * The schema.isOptional() is deprecated. This is the suggested replacement
 * as this was how isOptional operated beforehand.
 */
export declare function isOptionalSchema(schema: z.ZodType): boolean;
