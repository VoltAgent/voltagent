import { type ZodObject, type ZodRawShape, z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

import { type FunctionDeclaration, type Schema, Type } from "@google/genai";

/**
 * Copied over from google-ai repo https://github.com/googleapis/js-genai/blob/main/src/schema_helper.ts
 * This was done because the schema_helper.ts file is not exported from the google-ai package.
 * https://github.com/googleapis/js-genai/blob/main/src/schema_helper.ts
 */

/**
 * A placeholder name for the zod schema when converting to JSON schema. The
 * name is not important and will not be used by users.
 */
const PLACEHOLDER_ZOD_SCHEMA_NAME = "placeholderZodSchemaName";

/**
 * Represents the possible JSON schema types.
 */
export type JSONSchemaType =
  | "string"
  | "number"
  | "integer"
  | "object"
  | "array"
  | "boolean"
  | "null";

/**
 * A subset of JSON Schema according to 2020-12 JSON Schema draft.
 *
 * Represents a subset of a JSON Schema object that can be used by Gemini API.
 * The difference between this interface and the Schema interface is that this
 * interface is compatible with OpenAPI 3.1 schema objects while the
 * types.Schema interface @see {@linkcode Schema} is used to make API call to
 * Gemini API.
 */
export interface JSONSchema {
  /**
   * Validation succeeds if the type of the instance matches the type
   * represented by the given type, or matches at least one of the given types
   * in the array.
   */
  type?: JSONSchemaType | JSONSchemaType[];

  /**
   * Defines semantic information about a string instance (e.g., "date-time",
   * "email").
   */
  format?: string;

  /**
   * A preferably short description about the purpose of the instance
   * described by the schema. This is not supported for Gemini API.
   */
  title?: string;

  /**
   * An explanation about the purpose of the instance described by the
   * schema.
   */
  description?: string;

  /**
   * This keyword can be used to supply a default JSON value associated
   * with a particular schema. The value should be valid according to the
   * schema. This is not supported for Gemini API.
   */
  default?: unknown;

  /**
   * Used for arrays. This keyword is used to define the schema of the elements
   * in the array.
   */
  items?: JSONSchema;

  /**
   * Key word for arrays. Specify the minimum number of elements in the array.
   */
  minItems?: string;

  /**
   * Key word for arrays. Specify the maximum number of elements in the array.e
   */
  maxItems?: string;

  /**
   * Used for specify the possible values for an enum.
   */
  enum?: unknown[];

  /**
   * Used for objects. This keyword is used to define the schema of the
   * properties in the object.
   */
  properties?: Record<string, JSONSchema>;

  /**
   * Used for objects. This keyword is used to specify the properties of the
   * object that are required to be present in the instance.
   */
  required?: string[];

  /**
   * The key word for objects. Specify the minimum number of properties in the
   * object.
   */
  minProperties?: string;

  /**
   * The key word for objects. Specify the maximum number of properties in the
   * object.
   */
  maxProperties?: string;

  /**
   * Used for numbers. Specify the minimum value for a number.
   */
  minimum?: number;

  /**
   * Used for numbers. specify the maximum value for a number.
   */
  maximum?: number;

  /**
   * Used for strings. The keyword to specify the minimum length of the
   * string.
   */
  minLength?: string;

  /**
   * Used for strings. The keyword to specify the maximum length of the
   * string.
   */
  maxLength?: string;

  /**
   * Used for strings. Key word to specify a regular
   * expression (ECMA-262) matches the instance successfully.
   */
  pattern?: string;

  /**
   * Used for Union types and Intersection types. This keyword is used to define
   * the schema of the possible values.
   */
  anyOf?: JSONSchema[];
}

const jsonSchemaTypeValidator = z.enum([
  "string",
  "number",
  "integer",
  "object",
  "array",
  "boolean",
  "null",
]);

// Handles all types and arrays of all types.
const schemaTypeUnion = z.union([jsonSchemaTypeValidator, z.array(jsonSchemaTypeValidator)]);

// Declare the type for the schema variable.
type jsonSchemaValidatorType = z.ZodType<JSONSchema>;

const jsonSchemaValidator: jsonSchemaValidatorType = z.lazy(() => {
  return z
    .object({
      // --- Type ---
      type: schemaTypeUnion.optional(),

      // --- Annotations ---
      format: z.string().optional(),
      title: z.string().optional(),
      description: z.string().optional(),
      default: z.unknown().optional(),

      // --- Array Validations ---
      items: jsonSchemaValidator.optional(),
      minItems: z.coerce.string().optional(),
      maxItems: z.coerce.string().optional(),
      // --- Generic Validations ---
      enum: z.array(z.unknown()).optional(),

      // --- Object Validations ---
      properties: z.record(z.string(), jsonSchemaValidator).optional(),
      required: z.array(z.string()).optional(),
      minProperties: z.coerce.string().optional(),
      maxProperties: z.coerce.string().optional(),

      // --- Numeric Validations ---
      minimum: z.number().optional(),
      maximum: z.number().optional(),

      // --- String Validations ---
      minLength: z.coerce.string().optional(),
      maxLength: z.coerce.string().optional(),
      pattern: z.string().optional(),

      // --- Schema Composition ---
      anyOf: z.array(jsonSchemaValidator).optional(),

      // --- Additional Properties --- This field is not included in the
      // JSONSchema, will not be communicated to the model, it is here purely
      // for enabling the zod validation strict mode.
      additionalProperties: z.union([z.boolean(), z.object({})]).optional(),
    })
    .strict();
});

/**
 * Converts a Zod object into the Gemini schema format.
 *
 * @param vertexai If true, targets Vertex AI schema format; otherwise, targets
 * the Gemini API format.
 * @param zodSchema The Zod schema object to convert. Its structure is validated
 * against the interface before conversion to JSONSchema
 * schema.
 * @return The resulting Schema object.
 * @throws If the input `zodSchema` does not conform to the expected
 * JSONSchema structure during the initial validation step.
 */
export function responseSchemaFromZodType(vertexai: boolean, zodSchema: z.ZodType): Schema {
  return processZodSchema(vertexai, zodSchema);
}

function processZodSchema(vertexai: boolean, zodSchema: z.ZodType): Schema {
  const jsonSchema = zodToJsonSchema(zodSchema, PLACEHOLDER_ZOD_SCHEMA_NAME).definitions?.[
    PLACEHOLDER_ZOD_SCHEMA_NAME
  ] as Record<string, unknown>;
  const validatedJsonSchema = jsonSchemaValidator.parse(jsonSchema);
  return processJsonSchema(vertexai, validatedJsonSchema);
}

/*
Handle type field:
The resulted type field in JSONSchema form zod_to_json_schema can be either
an array consist of primitive types or a single primitive type.
This is due to the optimization of zod_to_json_schema, when the types in the
union are primitive types without any additional specifications,
zod_to_json_schema will squash the types into an array instead of put them
in anyOf fields. Otherwise, it will put the types in anyOf fields.
See the following link for more details:
https://github.com/zodjs/zod-to-json-schema/blob/main/src/index.ts#L101
The logic here is trying to undo that optimization, flattening the array of
types to anyOf fields.
                                 type field
                                      |
                            ___________________________
                           /                           \
                          /                              \
                         /                                \
                       Array                              Type.*
                /                  \                       |
      Include null.              Not included null     type = Type.*.
      [null, Type.*, Type.*]     multiple types.
      [null, Type.*]             [Type.*, Type.*]
            /                                \
      remove null                             \
      add nullable = true                      \
       /                    \                   \
    [Type.*]           [Type.*, Type.*]          \
 only one type left     multiple types left       \
 add type = Type.*.           \                  /
                               \                /
                         not populate the type field in final result
                           and make the types into anyOf fields
                          anyOf:[{type: 'Type.*'}, {type: 'Type.*'}];
*/
function flattenTypeArrayToAnyOf(typeList: string[], resultingSchema: Schema) {
  if (typeList.includes("null")) {
    resultingSchema.nullable = true;
  }
  const listWithoutNull = typeList.filter((type) => type !== "null");

  if (listWithoutNull.length === 1) {
    resultingSchema.type = Object.keys(Type).includes(listWithoutNull[0].toUpperCase())
      ? Type[listWithoutNull[0].toUpperCase() as keyof typeof Type]
      : Type.TYPE_UNSPECIFIED;
  } else {
    resultingSchema.anyOf = [];
    for (const i of listWithoutNull) {
      resultingSchema.anyOf.push({
        type: Object.keys(Type).includes(i.toUpperCase())
          ? Type[i.toUpperCase() as keyof typeof Type]
          : Type.TYPE_UNSPECIFIED,
      });
    }
  }
}

/**
 * Handles the case where a JSONSchema might be nullable via an `anyOf` with 'null'.
 * If it finds such a pattern, it modifies the `genAISchema` to be nullable
 * and returns the non-null schema part. Otherwise, it returns the original schema.
 */
function handleNullableAnyOf(jsonSchema: JSONSchema, genAISchema: Schema): JSONSchema {
  const incomingAnyOf = jsonSchema.anyOf as JSONSchema[] | undefined;
  if (incomingAnyOf?.length === 2) {
    if (incomingAnyOf[0].type === "null") {
      genAISchema.nullable = true;
      return incomingAnyOf[1];
    }

    if (incomingAnyOf[1]?.type === "null") {
      genAISchema.nullable = true;
      return incomingAnyOf[0];
    }
  }
  return jsonSchema;
}

/**
 * Processes the 'type' field of a JSONSchema.
 */
function processTypeField(fieldName: string, fieldValue: unknown, genAISchema: Schema): void {
  if (fieldName !== "type") return;

  if (fieldValue === "null") {
    throw new Error("type: null can not be the only possible type for the field.");
  }
  if (Array.isArray(fieldValue)) {
    // This case is handled by flattenTypeArrayToAnyOf called earlier
    return;
  }
  if (typeof fieldValue === "string") {
    genAISchema.type = Object.keys(Type).includes(fieldValue.toUpperCase())
      ? Type[fieldValue.toUpperCase() as keyof typeof Type]
      : Type.TYPE_UNSPECIFIED;
  }
}

/**
 * Processes fields that contain nested schemas (e.g., 'items').
 */
function processNestedSchemaField(
  vertexai: boolean,
  fieldName: string,
  fieldValue: unknown,
  genAISchema: Schema,
): void {
  const schemaFieldNames = ["items"];
  if (!schemaFieldNames.includes(fieldName)) return;

  (genAISchema as Record<string, unknown>)[fieldName] = processJsonSchema(
    vertexai,
    fieldValue as JSONSchema,
  );
}

/**
 * Processes fields that contain a list of nested schemas (e.g., 'anyOf').
 */
function processListOfSchemasField(
  vertexai: boolean,
  fieldName: string,
  fieldValue: unknown,
  genAISchema: Schema,
): void {
  const listSchemaFieldNames = ["anyOf"];
  if (!listSchemaFieldNames.includes(fieldName)) return;

  const listSchemaFieldValue: Schema[] = [];
  for (const item of fieldValue as JSONSchema[]) {
    if (item.type === "null") {
      genAISchema.nullable = true;
      continue;
    }
    listSchemaFieldValue.push(processJsonSchema(vertexai, item));
  }
  (genAISchema as Record<string, unknown>)[fieldName] = listSchemaFieldValue;
}

/**
 * Processes fields that contain a dictionary of nested schemas (e.g., 'properties').
 */
function processDictOfSchemasField(
  vertexai: boolean,
  fieldName: string,
  fieldValue: unknown,
  genAISchema: Schema,
): void {
  const dictSchemaFieldNames = ["properties"];
  if (!dictSchemaFieldNames.includes(fieldName)) return;

  const dictSchemaFieldValue: Record<string, Schema> = {};
  for (const [key, value] of Object.entries(fieldValue as Record<string, JSONSchema>)) {
    dictSchemaFieldValue[key] = processJsonSchema(vertexai, value);
  }
  (genAISchema as Record<string, unknown>)[fieldName] = dictSchemaFieldValue;
}

/**
 * Processes miscellaneous fields like 'enum', 'default', etc.
 */
function processOtherFields(
  vertexai: boolean,
  fieldName: string,
  fieldValue: unknown,
  genAISchema: Schema,
): void {
  const handledFields = [
    "type",
    "items",
    "anyOf",
    "properties",
    "additionalProperties", // This is skipped intentionally
  ];
  if (handledFields.includes(fieldName)) return;

  if (fieldName === "enum") {
    genAISchema.format = "enum";
  }
  if (fieldName === "default" && !vertexai) {
    throw new Error("Default value is not supported for Gemini API.");
  }
  (genAISchema as Record<string, unknown>)[fieldName] = fieldValue;
}

function processJsonSchema(vertexai: boolean, _jsonSchema: JSONSchema): Schema {
  const genAISchema: Schema = {};

  if (_jsonSchema.type && _jsonSchema.anyOf) {
    throw new Error("type and anyOf cannot be both populated.");
  }

  // Handle potential nullable types defined via anyOf: [null, ...]
  const currentJsonSchema = handleNullableAnyOf(_jsonSchema, genAISchema);

  // Handle cases where type is an array (e.g., ['string', 'null'])
  if (Array.isArray(currentJsonSchema.type)) {
    flattenTypeArrayToAnyOf(currentJsonSchema.type, genAISchema);
  }

  // Process all fields from the potentially updated currentJsonSchema
  for (const [fieldName, fieldValue] of Object.entries(currentJsonSchema)) {
    if (fieldValue == null) {
      continue; // Skip null or undefined values
    }

    processTypeField(fieldName, fieldValue, genAISchema);
    processNestedSchemaField(vertexai, fieldName, fieldValue, genAISchema);
    processListOfSchemasField(vertexai, fieldName, fieldValue, genAISchema);
    processDictOfSchemasField(vertexai, fieldName, fieldValue, genAISchema);
    processOtherFields(vertexai, fieldName, fieldValue, genAISchema);
  }

  return genAISchema;
}

/**
 * Object for passing the details of the zod function schema.
 * This is to set up the named parameters for the functionDeclarationFromZod
 * function.
 */
export interface ZodFunction {
  // The name of the function.
  name: string;
  // The zod function schema. This any here is to support the zod function with no arguments.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  zodFunctionSchema: z.ZodFunction<z.ZodTuple<any, z.ZodTypeAny>, z.ZodTypeAny>;
}

function isZodSchema(obj: any): obj is z.ZodTypeAny {
  return obj?._def?.typeName === "ZodObject";
}

function isZodVoid(obj: any): obj is z.ZodVoid {
  return obj?._def?.typeName === "ZodVoid";
}

/**
 * Converts a Zod function schema definition into a FunctionDeclaration object.
 *
 * [Experimental] This function help to convert the zod function to the function
 * declaration format. Currently, the function only support the function with
 * one parameter value, the parameter can be object or void.
 *
 * @param vertexai If true, targets Vertex AI schema format; otherwise, targets
 * the Gemini API format.
 * @param zodFunction The zodFunction object for passing the name and zod
 *     function
 * schema.
 * @return The resulting FunctionDeclaration object. @see {@linkcode FunctionDeclaration}
 * @throws {ZodError} If the input `zodFunction` contains paramters that can not
 * be converteed to Schema object
 * @throws {Error} If the input `zodFunction` contains more than one parameter
 * or the parameter is not object.
 */
export function functionDeclarationFromZodFunction(
  vertaxai: boolean,
  zodFunction: ZodFunction,
): FunctionDeclaration {
  const functionDeclaration: FunctionDeclaration = {};

  // Process the name of the function.
  functionDeclaration.name = zodFunction.name;
  // Process the description of the function.
  functionDeclaration.description = zodFunction.zodFunctionSchema._def.description;
  // Process the return value of the function.
  const zodFunctionReturn = zodFunction.zodFunctionSchema._def.returns;
  if (!(zodFunctionReturn instanceof z.ZodVoid)) {
    functionDeclaration.response = processZodSchema(vertaxai, zodFunctionReturn);
  }
  // Process the parameters of the function.
  const functionParams = zodFunction.zodFunctionSchema._def.args._def.items as z.ZodTypeAny[];
  if (functionParams.length > 1) {
    throw new Error(
      "Multiple positional parameters are not supported at the moment. Function parameters must be defined using a single object with named properties.",
    );
  }
  if (functionParams.length === 1) {
    const param = functionParams[0];
    if (isZodSchema(param)) {
      functionDeclaration.parameters = processZodSchema(vertaxai, functionParams[0]);
    } else {
      if (!isZodVoid(param)) {
        throw new Error(
          "Function parameter is not object and not void, please check the parameter type.",
        );
      }
    }
  }

  return functionDeclaration;
}

export const isZodObject = (schema: any): schema is ZodObject<ZodRawShape> => {
  return (
    typeof schema === "object" &&
    schema !== null &&
    typeof schema.shape === "object" &&
    schema.shape !== null
  );
};
