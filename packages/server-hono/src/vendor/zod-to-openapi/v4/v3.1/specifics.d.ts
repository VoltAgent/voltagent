import type { ReferenceObject, SchemaObject } from 'openapi3-ts/oas31';
import { OpenApiVersionSpecifics } from '../openapi-generator';
import { ZodNumericCheck, SchemaObject as CommonSchemaObject } from '../types';
export declare class OpenApiGeneratorV31Specifics implements OpenApiVersionSpecifics {
    get nullType(): {
        readonly type: "null";
    };
    mapNullableOfArray(objects: (SchemaObject | ReferenceObject)[], isNullable: boolean): (SchemaObject | ReferenceObject)[];
    mapNullableType(type: NonNullable<SchemaObject['type']> | undefined, isNullable: boolean): {
        type?: SchemaObject['type'];
    };
    mapTupleItems(schemas: (CommonSchemaObject | ReferenceObject)[]): {
        prefixItems: (ReferenceObject | CommonSchemaObject)[];
    };
    getNumberChecks(checks: ZodNumericCheck[]): Pick<SchemaObject, 'minimum' | 'exclusiveMinimum' | 'maximum' | 'exclusiveMaximum'>;
}
