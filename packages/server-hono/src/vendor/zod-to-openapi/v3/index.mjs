/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol */


function __rest(s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
}

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

function isZodType(schema, typeName) {
    var _a;
    return ((_a = schema === null || schema === void 0 ? void 0 : schema._def) === null || _a === void 0 ? void 0 : _a.typeName) === typeName;
}
function isAnyZodType(schema) {
    return '_def' in schema;
}

function preserveMetadataFromModifier(zod, modifier) {
    const zodModifier = zod.ZodType.prototype[modifier];
    zod.ZodType.prototype[modifier] = function (...args) {
        const result = zodModifier.apply(this, args);
        result._def.openapi = this._def.openapi;
        return result;
    };
}
function extendZodWithOpenApi(zod) {
    if (typeof zod.ZodType.prototype.openapi !== 'undefined') {
        // This zod instance is already extended with the required methods,
        // doing it again will just result in multiple wrapper methods for
        // `optional` and `nullable`
        return;
    }
    zod.ZodType.prototype.openapi = function (refOrOpenapi, metadata) {
        var _a, _b, _c, _d, _e, _f;
        const openapi = typeof refOrOpenapi === 'string' ? metadata : refOrOpenapi;
        const _g = openapi !== null && openapi !== void 0 ? openapi : {}, { param } = _g, restOfOpenApi = __rest(_g, ["param"]);
        const _internal = Object.assign(Object.assign({}, (_a = this._def.openapi) === null || _a === void 0 ? void 0 : _a._internal), (typeof refOrOpenapi === 'string'
            ? { refId: refOrOpenapi }
            : undefined));
        const resultMetadata = Object.assign(Object.assign(Object.assign({}, (_b = this._def.openapi) === null || _b === void 0 ? void 0 : _b.metadata), restOfOpenApi), (((_d = (_c = this._def.openapi) === null || _c === void 0 ? void 0 : _c.metadata) === null || _d === void 0 ? void 0 : _d.param) || param
            ? {
                param: Object.assign(Object.assign({}, (_f = (_e = this._def.openapi) === null || _e === void 0 ? void 0 : _e.metadata) === null || _f === void 0 ? void 0 : _f.param), param),
            }
            : undefined));
        const result = new this.constructor(Object.assign(Object.assign({}, this._def), { openapi: Object.assign(Object.assign({}, (Object.keys(_internal).length > 0 ? { _internal } : undefined)), (Object.keys(resultMetadata).length > 0
                ? { metadata: resultMetadata }
                : undefined)) }));
        if (isZodType(this, 'ZodObject')) {
            const originalExtend = this.extend;
            result.extend = function (...args) {
                var _a, _b, _c, _d, _e, _f, _g;
                const extendedResult = originalExtend.apply(this, args);
                extendedResult._def.openapi = {
                    _internal: {
                        extendedFrom: ((_b = (_a = this._def.openapi) === null || _a === void 0 ? void 0 : _a._internal) === null || _b === void 0 ? void 0 : _b.refId)
                            ? { refId: (_d = (_c = this._def.openapi) === null || _c === void 0 ? void 0 : _c._internal) === null || _d === void 0 ? void 0 : _d.refId, schema: this }
                            : (_f = (_e = this._def.openapi) === null || _e === void 0 ? void 0 : _e._internal) === null || _f === void 0 ? void 0 : _f.extendedFrom,
                    },
                    metadata: (_g = extendedResult._def.openapi) === null || _g === void 0 ? void 0 : _g.metadata,
                };
                return extendedResult;
            };
        }
        return result;
    };
    preserveMetadataFromModifier(zod, 'optional');
    preserveMetadataFromModifier(zod, 'nullable');
    preserveMetadataFromModifier(zod, 'default');
    preserveMetadataFromModifier(zod, 'transform');
    preserveMetadataFromModifier(zod, 'refine');
    const zodDeepPartial = zod.ZodObject.prototype.deepPartial;
    zod.ZodObject.prototype.deepPartial = function () {
        const initialShape = this._def.shape();
        const result = zodDeepPartial.apply(this);
        const resultShape = result._def.shape();
        Object.entries(resultShape).forEach(([key, value]) => {
            var _a, _b;
            value._def.openapi = (_b = (_a = initialShape[key]) === null || _a === void 0 ? void 0 : _a._def) === null || _b === void 0 ? void 0 : _b.openapi;
        });
        result._def.openapi = undefined;
        return result;
    };
    const zodPick = zod.ZodObject.prototype.pick;
    zod.ZodObject.prototype.pick = function (...args) {
        const result = zodPick.apply(this, args);
        result._def.openapi = undefined;
        return result;
    };
    const zodOmit = zod.ZodObject.prototype.omit;
    zod.ZodObject.prototype.omit = function (...args) {
        const result = zodOmit.apply(this, args);
        result._def.openapi = undefined;
        return result;
    };
}

function isEqual(x, y) {
    if (x === null || x === undefined || y === null || y === undefined) {
        return x === y;
    }
    if (x === y || x.valueOf() === y.valueOf()) {
        return true;
    }
    if (Array.isArray(x)) {
        if (!Array.isArray(y)) {
            return false;
        }
        if (x.length !== y.length) {
            return false;
        }
    }
    // if they are strictly equal, they both need to be object at least
    if (!(x instanceof Object) || !(y instanceof Object)) {
        return false;
    }
    // recursive object equality check
    const keysX = Object.keys(x);
    return (Object.keys(y).every(keyY => keysX.indexOf(keyY) !== -1) &&
        keysX.every(key => isEqual(x[key], y[key])));
}
class ObjectSet {
    constructor() {
        this.buckets = new Map();
    }
    put(value) {
        const hashCode = this.hashCodeOf(value);
        const itemsByCode = this.buckets.get(hashCode);
        if (!itemsByCode) {
            this.buckets.set(hashCode, [value]);
            return;
        }
        const alreadyHasItem = itemsByCode.some(_ => isEqual(_, value));
        if (!alreadyHasItem) {
            itemsByCode.push(value);
        }
    }
    contains(value) {
        const hashCode = this.hashCodeOf(value);
        const itemsByCode = this.buckets.get(hashCode);
        if (!itemsByCode) {
            return false;
        }
        return itemsByCode.some(_ => isEqual(_, value));
    }
    values() {
        return [...this.buckets.values()].flat();
    }
    stats() {
        let totalBuckets = 0;
        let totalValues = 0;
        let collisions = 0;
        for (const bucket of this.buckets.values()) {
            totalBuckets += 1;
            totalValues += bucket.length;
            if (bucket.length > 1) {
                collisions += 1;
            }
        }
        const hashEffectiveness = totalBuckets / totalValues;
        return { totalBuckets, collisions, totalValues, hashEffectiveness };
    }
    hashCodeOf(object) {
        let hashCode = 0;
        if (Array.isArray(object)) {
            for (let i = 0; i < object.length; i++) {
                hashCode ^= this.hashCodeOf(object[i]) * i;
            }
            return hashCode;
        }
        if (typeof object === 'string') {
            for (let i = 0; i < object.length; i++) {
                hashCode ^= object.charCodeAt(i) * i;
            }
            return hashCode;
        }
        if (typeof object === 'number') {
            return object;
        }
        if (typeof object === 'object') {
            for (const [key, value] of Object.entries(object)) {
                hashCode ^= this.hashCodeOf(key) + this.hashCodeOf(value !== null && value !== void 0 ? value : '');
            }
        }
        return hashCode;
    }
}

function isUndefined(value) {
    return value === undefined;
}
function mapValues(object, mapper) {
    const result = {};
    Object.entries(object).forEach(([key, value]) => {
        result[key] = mapper(value);
    });
    return result;
}
function omit(object, keys) {
    const result = {};
    Object.entries(object).forEach(([key, value]) => {
        if (!keys.some(keyToOmit => keyToOmit === key)) {
            result[key] = value;
        }
    });
    return result;
}
function omitBy(object, predicate) {
    const result = {};
    Object.entries(object).forEach(([key, value]) => {
        if (!predicate(value, key)) {
            result[key] = value;
        }
    });
    return result;
}
function compact(arr) {
    return arr.filter((elem) => !isUndefined(elem));
}
const objectEquals = isEqual;
function uniq(values) {
    const set = new ObjectSet();
    values.forEach(value => set.put(value));
    return [...set.values()];
}
function isString(val) {
    return typeof val === 'string';
}

function getOpenApiMetadata(zodSchema) {
    var _a, _b;
    return omitBy((_b = (_a = zodSchema._def.openapi) === null || _a === void 0 ? void 0 : _a.metadata) !== null && _b !== void 0 ? _b : {}, isUndefined);
}

class OpenAPIRegistry {
    constructor(parents) {
        this.parents = parents;
        this._definitions = [];
    }
    get definitions() {
        var _a, _b;
        const parentDefinitions = (_b = (_a = this.parents) === null || _a === void 0 ? void 0 : _a.flatMap(par => par.definitions)) !== null && _b !== void 0 ? _b : [];
        return [...parentDefinitions, ...this._definitions];
    }
    /**
     * Registers a new component schema under /components/schemas/${name}
     */
    register(refId, zodSchema) {
        const schemaWithRefId = this.schemaWithRefId(refId, zodSchema);
        this._definitions.push({ type: 'schema', schema: schemaWithRefId });
        return schemaWithRefId;
    }
    /**
     * Registers a new parameter schema under /components/parameters/${name}
     */
    registerParameter(refId, zodSchema) {
        var _a, _b, _c;
        const schemaWithRefId = this.schemaWithRefId(refId, zodSchema);
        const currentMetadata = (_a = schemaWithRefId._def.openapi) === null || _a === void 0 ? void 0 : _a.metadata;
        const schemaWithMetadata = schemaWithRefId.openapi(Object.assign(Object.assign({}, currentMetadata), { param: Object.assign(Object.assign({}, currentMetadata === null || currentMetadata === void 0 ? void 0 : currentMetadata.param), { name: (_c = (_b = currentMetadata === null || currentMetadata === void 0 ? void 0 : currentMetadata.param) === null || _b === void 0 ? void 0 : _b.name) !== null && _c !== void 0 ? _c : refId }) }));
        this._definitions.push({
            type: 'parameter',
            schema: schemaWithMetadata,
        });
        return schemaWithMetadata;
    }
    /**
     * Registers a new path that would be generated under paths:
     */
    registerPath(route) {
        this._definitions.push({
            type: 'route',
            route,
        });
    }
    /**
     * Registers a new webhook that would be generated under webhooks:
     */
    registerWebhook(webhook) {
        this._definitions.push({
            type: 'webhook',
            webhook,
        });
    }
    /**
     * Registers a raw OpenAPI component. Use this if you have a simple object instead of a Zod schema.
     *
     * @param type The component type, e.g. `schemas`, `responses`, `securitySchemes`, etc.
     * @param name The name of the object, it is the key under the component
     *             type in the resulting OpenAPI document
     * @param component The actual object to put there
     */
    registerComponent(type, name, component) {
        this._definitions.push({
            type: 'component',
            componentType: type,
            name,
            component,
        });
        return {
            name,
            ref: { $ref: `#/components/${type}/${name}` },
        };
    }
    schemaWithRefId(refId, zodSchema) {
        return zodSchema.openapi(refId);
    }
}

class ZodToOpenAPIError {
    constructor(message) {
        this.message = message;
    }
}
class ConflictError extends ZodToOpenAPIError {
    constructor(message, data) {
        super(message);
        this.data = data;
    }
}
class MissingParameterDataError extends ZodToOpenAPIError {
    constructor(data) {
        super(`Missing parameter data, please specify \`${data.missingField}\` and other OpenAPI parameter props using the \`param\` field of \`ZodSchema.openapi\``);
        this.data = data;
    }
}
function enhanceMissingParametersError(action, paramsToAdd) {
    try {
        return action();
    }
    catch (error) {
        if (error instanceof MissingParameterDataError) {
            throw new MissingParameterDataError(Object.assign(Object.assign({}, error.data), paramsToAdd));
        }
        throw error;
    }
}
class UnknownZodTypeError extends ZodToOpenAPIError {
    constructor(data) {
        super(`Unknown zod object type, please specify \`type\` and other OpenAPI props using \`ZodSchema.openapi\`.`);
        this.data = data;
    }
}

class Metadata {
    static getMetadata(zodSchema) {
        var _a;
        const innerSchema = this.unwrapChained(zodSchema);
        const metadata = zodSchema._def.openapi
            ? zodSchema._def.openapi
            : innerSchema._def.openapi;
        /**
         * Every zod schema can receive a `description` by using the .describe method.
         * That description should be used when generating an OpenApi schema.
         * The `??` bellow makes sure we can handle both:
         * - schema.describe('Test').optional()
         * - schema.optional().describe('Test')
         */
        const zodDescription = (_a = zodSchema.description) !== null && _a !== void 0 ? _a : innerSchema.description;
        // A description provided from .openapi() should be taken with higher precedence
        return {
            _internal: metadata === null || metadata === void 0 ? void 0 : metadata._internal,
            metadata: Object.assign({ description: zodDescription }, metadata === null || metadata === void 0 ? void 0 : metadata.metadata),
        };
    }
    static getInternalMetadata(zodSchema) {
        const innerSchema = this.unwrapChained(zodSchema);
        const openapi = zodSchema._def.openapi
            ? zodSchema._def.openapi
            : innerSchema._def.openapi;
        return openapi === null || openapi === void 0 ? void 0 : openapi._internal;
    }
    static getParamMetadata(zodSchema) {
        var _a, _b;
        const innerSchema = this.unwrapChained(zodSchema);
        const metadata = zodSchema._def.openapi
            ? zodSchema._def.openapi
            : innerSchema._def.openapi;
        /**
         * Every zod schema can receive a `description` by using the .describe method.
         * That description should be used when generating an OpenApi schema.
         * The `??` bellow makes sure we can handle both:
         * - schema.describe('Test').optional()
         * - schema.optional().describe('Test')
         */
        const zodDescription = (_a = zodSchema.description) !== null && _a !== void 0 ? _a : innerSchema.description;
        return {
            _internal: metadata === null || metadata === void 0 ? void 0 : metadata._internal,
            metadata: Object.assign(Object.assign({}, metadata === null || metadata === void 0 ? void 0 : metadata.metadata), { 
                // A description provided from .openapi() should be taken with higher precedence
                param: Object.assign({ description: zodDescription }, (_b = metadata === null || metadata === void 0 ? void 0 : metadata.metadata) === null || _b === void 0 ? void 0 : _b.param) }),
        };
    }
    /**
     * A method that omits all custom keys added to the regular OpenAPI
     * metadata properties
     */
    static buildSchemaMetadata(metadata) {
        return omitBy(omit(metadata, ['param']), isUndefined);
    }
    static buildParameterMetadata(metadata) {
        return omitBy(metadata, isUndefined);
    }
    static applySchemaMetadata(initialData, metadata) {
        return omitBy(Object.assign(Object.assign({}, initialData), this.buildSchemaMetadata(metadata)), isUndefined);
    }
    static getRefId(zodSchema) {
        var _a;
        return (_a = this.getInternalMetadata(zodSchema)) === null || _a === void 0 ? void 0 : _a.refId;
    }
    static unwrapChained(schema) {
        return this.unwrapUntil(schema);
    }
    static getDefaultValue(zodSchema) {
        const unwrapped = this.unwrapUntil(zodSchema, 'ZodDefault');
        return unwrapped === null || unwrapped === void 0 ? void 0 : unwrapped._def.defaultValue();
    }
    static unwrapUntil(schema, typeName) {
        if (typeName && isZodType(schema, typeName)) {
            return schema;
        }
        if (isZodType(schema, 'ZodOptional') ||
            isZodType(schema, 'ZodNullable') ||
            isZodType(schema, 'ZodBranded')) {
            return this.unwrapUntil(schema.unwrap(), typeName);
        }
        if (isZodType(schema, 'ZodDefault') || isZodType(schema, 'ZodReadonly')) {
            return this.unwrapUntil(schema._def.innerType, typeName);
        }
        if (isZodType(schema, 'ZodEffects')) {
            return this.unwrapUntil(schema._def.schema, typeName);
        }
        if (isZodType(schema, 'ZodPipeline')) {
            return this.unwrapUntil(schema._def.in, typeName);
        }
        return typeName ? undefined : schema;
    }
    static isOptionalSchema(zodSchema) {
        return zodSchema.isOptional();
    }
}

class ArrayTransformer {
    transform(zodSchema, mapNullableType, mapItems) {
        var _a, _b;
        const itemType = zodSchema._def.type;
        return Object.assign(Object.assign({}, mapNullableType('array')), { items: mapItems(itemType), minItems: (_a = zodSchema._def.minLength) === null || _a === void 0 ? void 0 : _a.value, maxItems: (_b = zodSchema._def.maxLength) === null || _b === void 0 ? void 0 : _b.value });
    }
}

class BigIntTransformer {
    transform(mapNullableType) {
        return Object.assign(Object.assign({}, mapNullableType('string')), { pattern: `^\d+$` });
    }
}

class DiscriminatedUnionTransformer {
    transform(zodSchema, isNullable, mapNullableOfArray, mapItem, generateSchemaRef) {
        const options = [...zodSchema.options.values()];
        const optionSchema = options.map(mapItem);
        if (isNullable) {
            return {
                oneOf: mapNullableOfArray(optionSchema, isNullable),
            };
        }
        return {
            oneOf: optionSchema,
            discriminator: this.mapDiscriminator(options, zodSchema.discriminator, generateSchemaRef),
        };
    }
    mapDiscriminator(zodObjects, discriminator, generateSchemaRef) {
        // All schemas must be registered to use a discriminator
        if (zodObjects.some(obj => Metadata.getRefId(obj) === undefined)) {
            return undefined;
        }
        const mapping = {};
        zodObjects.forEach(obj => {
            var _a;
            const refId = Metadata.getRefId(obj); // type-checked earlier
            const value = (_a = obj.shape) === null || _a === void 0 ? void 0 : _a[discriminator];
            if (isZodType(value, 'ZodEnum') || isZodType(value, 'ZodNativeEnum')) {
                // Native enums have their keys as both number and strings however the number is an
                // internal representation and the string is the access point for a documentation
                const keys = Object.values(value.enum).filter(isString);
                keys.forEach((enumValue) => {
                    mapping[enumValue] = generateSchemaRef(refId);
                });
                return;
            }
            const literalValue = value === null || value === void 0 ? void 0 : value._def.value;
            // This should never happen because Zod checks the disciminator type but to keep the types happy
            if (typeof literalValue !== 'string') {
                throw new Error(`Discriminator ${discriminator} could not be found in one of the values of a discriminated union`);
            }
            mapping[literalValue] = generateSchemaRef(refId);
        });
        return {
            propertyName: discriminator,
            mapping,
        };
    }
}

class EnumTransformer {
    transform(zodSchema, mapNullableType) {
        // ZodEnum only accepts strings
        return Object.assign(Object.assign({}, mapNullableType('string')), { enum: zodSchema._def.values });
    }
}

class IntersectionTransformer {
    transform(zodSchema, isNullable, mapNullableOfArray, mapItem) {
        const subtypes = this.flattenIntersectionTypes(zodSchema);
        const allOfSchema = {
            allOf: subtypes.map(mapItem),
        };
        if (isNullable) {
            return {
                anyOf: mapNullableOfArray([allOfSchema], isNullable),
            };
        }
        return allOfSchema;
    }
    flattenIntersectionTypes(schema) {
        if (!isZodType(schema, 'ZodIntersection')) {
            return [schema];
        }
        const leftSubTypes = this.flattenIntersectionTypes(schema._def.left);
        const rightSubTypes = this.flattenIntersectionTypes(schema._def.right);
        return [...leftSubTypes, ...rightSubTypes];
    }
}

class LiteralTransformer {
    transform(zodSchema, mapNullableType) {
        return Object.assign(Object.assign({}, mapNullableType(typeof zodSchema._def.value)), { enum: [zodSchema._def.value] });
    }
}

/**
 * Numeric enums have a reverse mapping https://www.typescriptlang.org/docs/handbook/enums.html#reverse-mappings
 * whereas string ones don't.
 *
 * This function checks if an enum is fully numeric - i.e all values are numbers or not.
 * And filters out only the actual enum values when a reverse mapping is apparent.
 */
function enumInfo(enumObject) {
    const keysExceptReverseMappings = Object.keys(enumObject).filter(key => typeof enumObject[enumObject[key]] !== 'number');
    const values = keysExceptReverseMappings.map(key => enumObject[key]);
    const numericCount = values.filter(_ => typeof _ === 'number').length;
    const type = numericCount === 0
        ? 'string'
        : numericCount === values.length
            ? 'numeric'
            : 'mixed';
    return { values, type };
}

class NativeEnumTransformer {
    transform(zodSchema, mapNullableType) {
        const { type, values } = enumInfo(zodSchema._def.values);
        if (type === 'mixed') {
            // enum Test {
            //   A = 42,
            //   B = 'test',
            // }
            //
            // const result = z.nativeEnum(Test).parse('42');
            //
            // This is an error, so we can't just say it's a 'string'
            throw new ZodToOpenAPIError('Enum has mixed string and number values, please specify the OpenAPI type manually');
        }
        return Object.assign(Object.assign({}, mapNullableType(type === 'numeric' ? 'integer' : 'string')), { enum: values });
    }
}

class NumberTransformer {
    transform(zodSchema, mapNullableType, getNumberChecks) {
        return Object.assign(Object.assign({}, mapNullableType(zodSchema.isInt ? 'integer' : 'number')), getNumberChecks(zodSchema._def.checks));
    }
}

class ObjectTransformer {
    transform(zodSchema, defaultValue, mapNullableType, mapItem) {
        var _a;
        const extendedFrom = (_a = Metadata.getInternalMetadata(zodSchema)) === null || _a === void 0 ? void 0 : _a.extendedFrom;
        const required = this.requiredKeysOf(zodSchema);
        const properties = mapValues(zodSchema._def.shape(), mapItem);
        if (!extendedFrom) {
            return Object.assign(Object.assign(Object.assign(Object.assign({}, mapNullableType('object')), { properties, default: defaultValue }), (required.length > 0 ? { required } : {})), this.generateAdditionalProperties(zodSchema, mapItem));
        }
        const parent = extendedFrom.schema;
        // We want to generate the parent schema so that it can be referenced down the line
        mapItem(parent);
        const keysRequiredByParent = this.requiredKeysOf(parent);
        const propsOfParent = mapValues(parent === null || parent === void 0 ? void 0 : parent._def.shape(), mapItem);
        const propertiesToAdd = Object.fromEntries(Object.entries(properties).filter(([key, type]) => {
            return !objectEquals(propsOfParent[key], type);
        }));
        const additionallyRequired = required.filter(prop => !keysRequiredByParent.includes(prop));
        const objectData = Object.assign(Object.assign(Object.assign(Object.assign({}, mapNullableType('object')), { default: defaultValue, properties: propertiesToAdd }), (additionallyRequired.length > 0
            ? { required: additionallyRequired }
            : {})), this.generateAdditionalProperties(zodSchema, mapItem));
        return {
            allOf: [
                { $ref: `#/components/schemas/${extendedFrom.refId}` },
                objectData,
            ],
        };
    }
    generateAdditionalProperties(zodSchema, mapItem) {
        const unknownKeysOption = zodSchema._def.unknownKeys;
        const catchallSchema = zodSchema._def.catchall;
        if (isZodType(catchallSchema, 'ZodNever')) {
            if (unknownKeysOption === 'strict') {
                return { additionalProperties: false };
            }
            return {};
        }
        return { additionalProperties: mapItem(catchallSchema) };
    }
    requiredKeysOf(objectSchema) {
        return Object.entries(objectSchema._def.shape())
            .filter(([_key, type]) => !Metadata.isOptionalSchema(type))
            .map(([key, _type]) => key);
    }
}

class RecordTransformer {
    transform(zodSchema, mapNullableType, mapItem) {
        const propertiesType = zodSchema._def.valueType;
        const keyType = zodSchema._def.keyType;
        const propertiesSchema = mapItem(propertiesType);
        if (isZodType(keyType, 'ZodEnum') || isZodType(keyType, 'ZodNativeEnum')) {
            // Native enums have their keys as both number and strings however the number is an
            // internal representation and the string is the access point for a documentation
            const keys = Object.values(keyType.enum).filter(isString);
            const properties = keys.reduce((acc, curr) => (Object.assign(Object.assign({}, acc), { [curr]: propertiesSchema })), {});
            return Object.assign(Object.assign({}, mapNullableType('object')), { properties });
        }
        return Object.assign(Object.assign({}, mapNullableType('object')), { additionalProperties: propertiesSchema });
    }
}

class StringTransformer {
    transform(zodSchema, mapNullableType) {
        var _a, _b, _c;
        const regexCheck = this.getZodStringCheck(zodSchema, 'regex');
        const length = (_a = this.getZodStringCheck(zodSchema, 'length')) === null || _a === void 0 ? void 0 : _a.value;
        const maxLength = Number.isFinite(zodSchema.minLength)
            ? (_b = zodSchema.minLength) !== null && _b !== void 0 ? _b : undefined
            : undefined;
        const minLength = Number.isFinite(zodSchema.maxLength)
            ? (_c = zodSchema.maxLength) !== null && _c !== void 0 ? _c : undefined
            : undefined;
        return Object.assign(Object.assign({}, mapNullableType('string')), { 
            // FIXME: https://github.com/colinhacks/zod/commit/d78047e9f44596a96d637abb0ce209cd2732d88c
            minLength: length !== null && length !== void 0 ? length : maxLength, maxLength: length !== null && length !== void 0 ? length : minLength, format: this.mapStringFormat(zodSchema), pattern: regexCheck === null || regexCheck === void 0 ? void 0 : regexCheck.regex.source });
    }
    /**
     * Attempts to map Zod strings to known formats
     * https://json-schema.org/understanding-json-schema/reference/string.html#built-in-formats
     */
    mapStringFormat(zodString) {
        if (zodString.isUUID)
            return 'uuid';
        if (zodString.isEmail)
            return 'email';
        if (zodString.isURL)
            return 'uri';
        if (zodString.isDate)
            return 'date';
        if (zodString.isDatetime)
            return 'date-time';
        if (zodString.isCUID)
            return 'cuid';
        if (zodString.isCUID2)
            return 'cuid2';
        if (zodString.isULID)
            return 'ulid';
        if (zodString.isIP)
            return 'ip';
        if (zodString.isEmoji)
            return 'emoji';
        return undefined;
    }
    getZodStringCheck(zodString, kind) {
        return zodString._def.checks.find((check) => {
            return check.kind === kind;
        });
    }
}

class TupleTransformer {
    constructor(versionSpecifics) {
        this.versionSpecifics = versionSpecifics;
    }
    transform(zodSchema, mapNullableType, mapItem) {
        const { items } = zodSchema._def;
        const schemas = items.map(mapItem);
        return Object.assign(Object.assign({}, mapNullableType('array')), this.versionSpecifics.mapTupleItems(schemas));
    }
}

class UnionTransformer {
    transform(zodSchema, mapNullableOfArray, mapItem) {
        const options = this.flattenUnionTypes(zodSchema);
        const schemas = options.map(schema => {
            // If any of the underlying schemas of a union is .nullable then the whole union
            // would be nullable. `mapNullableOfArray` would place it where it belongs.
            // Therefor we are stripping the additional nullables from the inner schemas
            // See https://github.com/asteasolutions/zod-to-openapi/issues/149
            const optionToGenerate = this.unwrapNullable(schema);
            return mapItem(optionToGenerate);
        });
        return {
            anyOf: mapNullableOfArray(schemas),
        };
    }
    flattenUnionTypes(schema) {
        if (!isZodType(schema, 'ZodUnion')) {
            return [schema];
        }
        const options = schema._def.options;
        return options.flatMap(option => this.flattenUnionTypes(option));
    }
    unwrapNullable(schema) {
        if (isZodType(schema, 'ZodNullable')) {
            return this.unwrapNullable(schema.unwrap());
        }
        return schema;
    }
}

class OpenApiTransformer {
    constructor(versionSpecifics) {
        this.versionSpecifics = versionSpecifics;
        this.objectTransformer = new ObjectTransformer();
        this.stringTransformer = new StringTransformer();
        this.numberTransformer = new NumberTransformer();
        this.bigIntTransformer = new BigIntTransformer();
        this.literalTransformer = new LiteralTransformer();
        this.enumTransformer = new EnumTransformer();
        this.nativeEnumTransformer = new NativeEnumTransformer();
        this.arrayTransformer = new ArrayTransformer();
        this.unionTransformer = new UnionTransformer();
        this.discriminatedUnionTransformer = new DiscriminatedUnionTransformer();
        this.intersectionTransformer = new IntersectionTransformer();
        this.recordTransformer = new RecordTransformer();
        this.tupleTransformer = new TupleTransformer(versionSpecifics);
    }
    transform(zodSchema, isNullable, mapItem, generateSchemaRef, defaultValue) {
        if (isZodType(zodSchema, 'ZodNull')) {
            return this.versionSpecifics.nullType;
        }
        if (isZodType(zodSchema, 'ZodUnknown') || isZodType(zodSchema, 'ZodAny')) {
            return this.versionSpecifics.mapNullableType(undefined, isNullable);
        }
        if (isZodType(zodSchema, 'ZodObject')) {
            return this.objectTransformer.transform(zodSchema, defaultValue, // verified on TS level from input
            // verified on TS level from input
            _ => this.versionSpecifics.mapNullableType(_, isNullable), mapItem);
        }
        const schema = this.transformSchemaWithoutDefault(zodSchema, isNullable, mapItem, generateSchemaRef);
        return Object.assign(Object.assign({}, schema), { default: defaultValue });
    }
    transformSchemaWithoutDefault(zodSchema, isNullable, mapItem, generateSchemaRef) {
        if (isZodType(zodSchema, 'ZodUnknown') || isZodType(zodSchema, 'ZodAny')) {
            return this.versionSpecifics.mapNullableType(undefined, isNullable);
        }
        if (isZodType(zodSchema, 'ZodString')) {
            return this.stringTransformer.transform(zodSchema, schema => this.versionSpecifics.mapNullableType(schema, isNullable));
        }
        if (isZodType(zodSchema, 'ZodNumber')) {
            return this.numberTransformer.transform(zodSchema, schema => this.versionSpecifics.mapNullableType(schema, isNullable), _ => this.versionSpecifics.getNumberChecks(_));
        }
        if (isZodType(zodSchema, 'ZodBigInt')) {
            return this.bigIntTransformer.transform(schema => this.versionSpecifics.mapNullableType(schema, isNullable));
        }
        if (isZodType(zodSchema, 'ZodBoolean')) {
            return this.versionSpecifics.mapNullableType('boolean', isNullable);
        }
        if (isZodType(zodSchema, 'ZodLiteral')) {
            return this.literalTransformer.transform(zodSchema, schema => this.versionSpecifics.mapNullableType(schema, isNullable));
        }
        if (isZodType(zodSchema, 'ZodEnum')) {
            return this.enumTransformer.transform(zodSchema, schema => this.versionSpecifics.mapNullableType(schema, isNullable));
        }
        if (isZodType(zodSchema, 'ZodNativeEnum')) {
            return this.nativeEnumTransformer.transform(zodSchema, schema => this.versionSpecifics.mapNullableType(schema, isNullable));
        }
        if (isZodType(zodSchema, 'ZodArray')) {
            return this.arrayTransformer.transform(zodSchema, _ => this.versionSpecifics.mapNullableType(_, isNullable), mapItem);
        }
        if (isZodType(zodSchema, 'ZodTuple')) {
            return this.tupleTransformer.transform(zodSchema, _ => this.versionSpecifics.mapNullableType(_, isNullable), mapItem);
        }
        if (isZodType(zodSchema, 'ZodUnion')) {
            return this.unionTransformer.transform(zodSchema, _ => this.versionSpecifics.mapNullableOfArray(_, isNullable), mapItem);
        }
        if (isZodType(zodSchema, 'ZodDiscriminatedUnion')) {
            return this.discriminatedUnionTransformer.transform(zodSchema, isNullable, _ => this.versionSpecifics.mapNullableOfArray(_, isNullable), mapItem, generateSchemaRef);
        }
        if (isZodType(zodSchema, 'ZodIntersection')) {
            return this.intersectionTransformer.transform(zodSchema, isNullable, _ => this.versionSpecifics.mapNullableOfArray(_, isNullable), mapItem);
        }
        if (isZodType(zodSchema, 'ZodRecord')) {
            return this.recordTransformer.transform(zodSchema, _ => this.versionSpecifics.mapNullableType(_, isNullable), mapItem);
        }
        if (isZodType(zodSchema, 'ZodDate')) {
            return this.versionSpecifics.mapNullableType('string', isNullable);
        }
        const refId = Metadata.getRefId(zodSchema);
        throw new UnknownZodTypeError({
            currentSchema: zodSchema._def,
            schemaName: refId,
        });
    }
}

class OpenAPIGenerator {
    constructor(definitions, versionSpecifics) {
        this.definitions = definitions;
        this.versionSpecifics = versionSpecifics;
        this.schemaRefs = {};
        this.paramRefs = {};
        this.pathRefs = {};
        this.rawComponents = [];
        this.openApiTransformer = new OpenApiTransformer(versionSpecifics);
        this.sortDefinitions();
    }
    generateDocumentData() {
        this.definitions.forEach(definition => this.generateSingle(definition));
        return {
            components: this.buildComponents(),
            paths: this.pathRefs,
        };
    }
    generateComponents() {
        this.definitions.forEach(definition => this.generateSingle(definition));
        return {
            components: this.buildComponents(),
        };
    }
    buildComponents() {
        var _a, _b;
        const rawComponents = {};
        this.rawComponents.forEach(({ componentType, name, component }) => {
            var _a;
            (_a = rawComponents[componentType]) !== null && _a !== void 0 ? _a : (rawComponents[componentType] = {});
            rawComponents[componentType][name] = component;
        });
        return Object.assign(Object.assign({}, rawComponents), { schemas: Object.assign(Object.assign({}, ((_a = rawComponents.schemas) !== null && _a !== void 0 ? _a : {})), this.schemaRefs), parameters: Object.assign(Object.assign({}, ((_b = rawComponents.parameters) !== null && _b !== void 0 ? _b : {})), this.paramRefs) });
    }
    sortDefinitions() {
        const generationOrder = [
            'schema',
            'parameter',
            'component',
            'route',
        ];
        this.definitions.sort((left, right) => {
            // No type means "plain zod schema" => it comes as highest priority based on the array above
            if (!('type' in left)) {
                if (!('type' in right)) {
                    return 0;
                }
                return -1;
            }
            if (!('type' in right)) {
                return 1;
            }
            const leftIndex = generationOrder.findIndex(type => type === left.type);
            const rightIndex = generationOrder.findIndex(type => type === right.type);
            return leftIndex - rightIndex;
        });
    }
    generateSingle(definition) {
        if (!('type' in definition)) {
            this.generateSchemaWithRef(definition);
            return;
        }
        switch (definition.type) {
            case 'parameter':
                this.generateParameterDefinition(definition.schema);
                return;
            case 'schema':
                this.generateSchemaWithRef(definition.schema);
                return;
            case 'route':
                this.generateSingleRoute(definition.route);
                return;
            case 'component':
                this.rawComponents.push(definition);
                return;
        }
    }
    generateParameterDefinition(zodSchema) {
        const refId = Metadata.getRefId(zodSchema);
        const result = this.generateParameter(zodSchema);
        if (refId) {
            this.paramRefs[refId] = result;
        }
        return result;
    }
    getParameterRef(schemaMetadata, external) {
        var _a, _b, _c, _d, _e;
        const parameterMetadata = (_a = schemaMetadata === null || schemaMetadata === void 0 ? void 0 : schemaMetadata.metadata) === null || _a === void 0 ? void 0 : _a.param;
        const existingRef = ((_b = schemaMetadata === null || schemaMetadata === void 0 ? void 0 : schemaMetadata._internal) === null || _b === void 0 ? void 0 : _b.refId)
            ? this.paramRefs[(_c = schemaMetadata._internal) === null || _c === void 0 ? void 0 : _c.refId]
            : undefined;
        if (!((_d = schemaMetadata === null || schemaMetadata === void 0 ? void 0 : schemaMetadata._internal) === null || _d === void 0 ? void 0 : _d.refId) || !existingRef) {
            return undefined;
        }
        if ((parameterMetadata && existingRef.in !== parameterMetadata.in) ||
            ((external === null || external === void 0 ? void 0 : external.in) && existingRef.in !== external.in)) {
            throw new ConflictError(`Conflicting location for parameter ${existingRef.name}`, {
                key: 'in',
                values: compact([
                    existingRef.in,
                    external === null || external === void 0 ? void 0 : external.in,
                    parameterMetadata === null || parameterMetadata === void 0 ? void 0 : parameterMetadata.in,
                ]),
            });
        }
        if ((parameterMetadata && existingRef.name !== parameterMetadata.name) ||
            ((external === null || external === void 0 ? void 0 : external.name) && existingRef.name !== (external === null || external === void 0 ? void 0 : external.name))) {
            throw new ConflictError(`Conflicting names for parameter`, {
                key: 'name',
                values: compact([
                    existingRef.name,
                    external === null || external === void 0 ? void 0 : external.name,
                    parameterMetadata === null || parameterMetadata === void 0 ? void 0 : parameterMetadata.name,
                ]),
            });
        }
        return {
            $ref: `#/components/parameters/${(_e = schemaMetadata._internal) === null || _e === void 0 ? void 0 : _e.refId}`,
        };
    }
    generateInlineParameters(zodSchema, location) {
        var _a;
        const metadata = Metadata.getMetadata(zodSchema);
        const parameterMetadata = (_a = metadata === null || metadata === void 0 ? void 0 : metadata.metadata) === null || _a === void 0 ? void 0 : _a.param;
        const referencedSchema = this.getParameterRef(metadata, { in: location });
        if (referencedSchema) {
            return [referencedSchema];
        }
        if (isZodType(zodSchema, 'ZodObject')) {
            const propTypes = zodSchema._def.shape();
            const parameters = Object.entries(propTypes).map(([key, schema]) => {
                var _a, _b;
                const innerMetadata = Metadata.getMetadata(schema);
                const referencedSchema = this.getParameterRef(innerMetadata, {
                    in: location,
                    name: key,
                });
                if (referencedSchema) {
                    return referencedSchema;
                }
                const innerParameterMetadata = (_a = innerMetadata === null || innerMetadata === void 0 ? void 0 : innerMetadata.metadata) === null || _a === void 0 ? void 0 : _a.param;
                if ((innerParameterMetadata === null || innerParameterMetadata === void 0 ? void 0 : innerParameterMetadata.name) &&
                    innerParameterMetadata.name !== key) {
                    throw new ConflictError(`Conflicting names for parameter`, {
                        key: 'name',
                        values: [key, innerParameterMetadata.name],
                    });
                }
                if ((innerParameterMetadata === null || innerParameterMetadata === void 0 ? void 0 : innerParameterMetadata.in) &&
                    innerParameterMetadata.in !== location) {
                    throw new ConflictError(`Conflicting location for parameter ${(_b = innerParameterMetadata.name) !== null && _b !== void 0 ? _b : key}`, {
                        key: 'in',
                        values: [location, innerParameterMetadata.in],
                    });
                }
                return this.generateParameter(schema.openapi({ param: { name: key, in: location } }));
            });
            return parameters;
        }
        if ((parameterMetadata === null || parameterMetadata === void 0 ? void 0 : parameterMetadata.in) && parameterMetadata.in !== location) {
            throw new ConflictError(`Conflicting location for parameter ${parameterMetadata.name}`, {
                key: 'in',
                values: [location, parameterMetadata.in],
            });
        }
        return [
            this.generateParameter(zodSchema.openapi({ param: { in: location } })),
        ];
    }
    generateSimpleParameter(zodSchema) {
        var _a;
        const metadata = Metadata.getParamMetadata(zodSchema);
        const paramMetadata = (_a = metadata === null || metadata === void 0 ? void 0 : metadata.metadata) === null || _a === void 0 ? void 0 : _a.param;
        // TODO: Why are we not unwrapping here for isNullable as well?
        const required = !Metadata.isOptionalSchema(zodSchema) && !zodSchema.isNullable();
        const schema = this.generateSchemaWithRef(zodSchema);
        return Object.assign({ schema,
            required }, (paramMetadata ? Metadata.buildParameterMetadata(paramMetadata) : {}));
    }
    generateParameter(zodSchema) {
        var _a;
        const metadata = Metadata.getMetadata(zodSchema);
        const paramMetadata = (_a = metadata === null || metadata === void 0 ? void 0 : metadata.metadata) === null || _a === void 0 ? void 0 : _a.param;
        const paramName = paramMetadata === null || paramMetadata === void 0 ? void 0 : paramMetadata.name;
        const paramLocation = paramMetadata === null || paramMetadata === void 0 ? void 0 : paramMetadata.in;
        if (!paramName) {
            throw new MissingParameterDataError({ missingField: 'name' });
        }
        if (!paramLocation) {
            throw new MissingParameterDataError({
                missingField: 'in',
                paramName,
            });
        }
        const baseParameter = this.generateSimpleParameter(zodSchema);
        return Object.assign(Object.assign({}, baseParameter), { in: paramLocation, name: paramName });
    }
    generateSchemaWithMetadata(zodSchema) {
        var _a;
        const innerSchema = Metadata.unwrapChained(zodSchema);
        const metadata = Metadata.getMetadata(zodSchema);
        const defaultValue = Metadata.getDefaultValue(zodSchema);
        const result = ((_a = metadata === null || metadata === void 0 ? void 0 : metadata.metadata) === null || _a === void 0 ? void 0 : _a.type)
            ? { type: metadata === null || metadata === void 0 ? void 0 : metadata.metadata.type }
            : this.toOpenAPISchema(innerSchema, zodSchema.isNullable(), defaultValue);
        return (metadata === null || metadata === void 0 ? void 0 : metadata.metadata)
            ? Metadata.applySchemaMetadata(result, metadata.metadata)
            : omitBy(result, isUndefined);
    }
    /**
     * Same as above but applies nullable
     */
    constructReferencedOpenAPISchema(zodSchema) {
        var _a;
        const metadata = Metadata.getMetadata(zodSchema);
        const innerSchema = Metadata.unwrapChained(zodSchema);
        const defaultValue = Metadata.getDefaultValue(zodSchema);
        const isNullableSchema = zodSchema.isNullable();
        if ((_a = metadata === null || metadata === void 0 ? void 0 : metadata.metadata) === null || _a === void 0 ? void 0 : _a.type) {
            return this.versionSpecifics.mapNullableType(metadata.metadata.type, isNullableSchema);
        }
        return this.toOpenAPISchema(innerSchema, isNullableSchema, defaultValue);
    }
    /**
     * Generates an OpenAPI SchemaObject or a ReferenceObject with all the provided metadata applied
     */
    generateSimpleSchema(zodSchema) {
        var _a;
        const metadata = Metadata.getMetadata(zodSchema);
        const refId = Metadata.getRefId(zodSchema);
        if (!refId || !this.schemaRefs[refId]) {
            return this.generateSchemaWithMetadata(zodSchema);
        }
        const schemaRef = this.schemaRefs[refId];
        const referenceObject = {
            $ref: this.generateSchemaRef(refId),
        };
        // Metadata provided from .openapi() that is new to what we had already registered
        const newMetadata = omitBy(Metadata.buildSchemaMetadata((_a = metadata === null || metadata === void 0 ? void 0 : metadata.metadata) !== null && _a !== void 0 ? _a : {}), (value, key) => value === undefined || objectEquals(value, schemaRef[key]));
        // Do not calculate schema metadata overrides if type is provided in .openapi
        // https://github.com/asteasolutions/zod-to-openapi/pull/52/files/8ff707fe06e222bc573ed46cf654af8ee0b0786d#r996430801
        if (newMetadata.type) {
            return {
                allOf: [referenceObject, newMetadata],
            };
        }
        // New metadata from ZodSchema properties.
        const newSchemaMetadata = omitBy(this.constructReferencedOpenAPISchema(zodSchema), (value, key) => value === undefined || objectEquals(value, schemaRef[key]));
        const appliedMetadata = Metadata.applySchemaMetadata(newSchemaMetadata, newMetadata);
        if (Object.keys(appliedMetadata).length > 0) {
            return {
                allOf: [referenceObject, appliedMetadata],
            };
        }
        return referenceObject;
    }
    /**
     * Same as `generateSchema` but if the new schema is added into the
     * referenced schemas, it would return a ReferenceObject and not the
     * whole result.
     *
     * Should be used for nested objects, arrays, etc.
     */
    generateSchemaWithRef(zodSchema) {
        const refId = Metadata.getRefId(zodSchema);
        const result = this.generateSimpleSchema(zodSchema);
        if (refId && this.schemaRefs[refId] === undefined) {
            this.schemaRefs[refId] = result;
            return { $ref: this.generateSchemaRef(refId) };
        }
        return result;
    }
    generateSchemaRef(refId) {
        return `#/components/schemas/${refId}`;
    }
    getRequestBody(requestBody) {
        if (!requestBody) {
            return;
        }
        const { content } = requestBody, rest = __rest(requestBody, ["content"]);
        const requestBodyContent = this.getBodyContent(content);
        return Object.assign(Object.assign({}, rest), { content: requestBodyContent });
    }
    getParameters(request) {
        if (!request) {
            return [];
        }
        const { headers } = request;
        const query = this.cleanParameter(request.query);
        const params = this.cleanParameter(request.params);
        const cookies = this.cleanParameter(request.cookies);
        const queryParameters = enhanceMissingParametersError(() => (query ? this.generateInlineParameters(query, 'query') : []), { location: 'query' });
        const pathParameters = enhanceMissingParametersError(() => (params ? this.generateInlineParameters(params, 'path') : []), { location: 'path' });
        const cookieParameters = enhanceMissingParametersError(() => (cookies ? this.generateInlineParameters(cookies, 'cookie') : []), { location: 'cookie' });
        const headerParameters = enhanceMissingParametersError(() => {
            if (Array.isArray(headers)) {
                return headers.flatMap(header => this.generateInlineParameters(header, 'header'));
            }
            const cleanHeaders = this.cleanParameter(headers);
            return cleanHeaders
                ? this.generateInlineParameters(cleanHeaders, 'header')
                : [];
        }, { location: 'header' });
        return [
            ...pathParameters,
            ...queryParameters,
            ...headerParameters,
            ...cookieParameters,
        ];
    }
    cleanParameter(schema) {
        if (!schema) {
            return undefined;
        }
        return isZodType(schema, 'ZodEffects')
            ? this.cleanParameter(schema._def.schema)
            : schema;
    }
    generatePath(route) {
        const { method, path, request, responses } = route, pathItemConfig = __rest(route, ["method", "path", "request", "responses"]);
        const generatedResponses = mapValues(responses, response => {
            return this.getResponse(response);
        });
        const parameters = enhanceMissingParametersError(() => this.getParameters(request), { route: `${method} ${path}` });
        const requestBody = this.getRequestBody(request === null || request === void 0 ? void 0 : request.body);
        const routeDoc = {
            [method]: Object.assign(Object.assign(Object.assign(Object.assign({}, pathItemConfig), (parameters.length > 0
                ? {
                    parameters: [...(pathItemConfig.parameters || []), ...parameters],
                }
                : {})), (requestBody ? { requestBody } : {})), { responses: generatedResponses }),
        };
        return routeDoc;
    }
    generateSingleRoute(route) {
        const routeDoc = this.generatePath(route);
        this.pathRefs[route.path] = Object.assign(Object.assign({}, this.pathRefs[route.path]), routeDoc);
        return routeDoc;
    }
    getResponse(response) {
        if (this.isReferenceObject(response)) {
            return response;
        }
        const { content, headers } = response, rest = __rest(response, ["content", "headers"]);
        const responseContent = content
            ? { content: this.getBodyContent(content) }
            : {};
        if (!headers) {
            return Object.assign(Object.assign({}, rest), responseContent);
        }
        const responseHeaders = isZodType(headers, 'ZodObject')
            ? this.getResponseHeaders(headers)
            : // This is input data so it is okay to cast in the common generator
                // since this is the user's responsibility to keep it correct
                headers;
        return Object.assign(Object.assign(Object.assign({}, rest), { headers: responseHeaders }), responseContent);
    }
    isReferenceObject(schema) {
        return '$ref' in schema;
    }
    getResponseHeaders(headers) {
        const schemaShape = headers._def.shape();
        const responseHeaders = mapValues(schemaShape, _ => this.generateSimpleParameter(_));
        return responseHeaders;
    }
    getBodyContent(content) {
        return mapValues(content, config => {
            if (!config || !isAnyZodType(config.schema)) {
                return config;
            }
            const { schema: configSchema } = config, rest = __rest(config, ["schema"]);
            const schema = this.generateSchemaWithRef(configSchema);
            return Object.assign({ schema }, rest);
        });
    }
    toOpenAPISchema(zodSchema, isNullable, defaultValue) {
        return this.openApiTransformer.transform(zodSchema, isNullable, _ => this.generateSchemaWithRef(_), _ => this.generateSchemaRef(_), defaultValue);
    }
}

class OpenApiGeneratorV30Specifics {
    get nullType() {
        return { nullable: true };
    }
    mapNullableOfArray(objects, isNullable) {
        if (isNullable) {
            return [...objects, this.nullType];
        }
        return objects;
    }
    mapNullableType(type, isNullable) {
        return Object.assign(Object.assign({}, (type ? { type } : undefined)), (isNullable ? this.nullType : undefined));
    }
    mapTupleItems(schemas) {
        const uniqueSchemas = uniq(schemas);
        return {
            items: uniqueSchemas.length === 1
                ? uniqueSchemas[0]
                : { anyOf: uniqueSchemas },
            minItems: schemas.length,
            maxItems: schemas.length,
        };
    }
    getNumberChecks(checks) {
        return Object.assign({}, ...checks.map(check => {
            switch (check.kind) {
                case 'min':
                    return check.inclusive
                        ? { minimum: Number(check.value) }
                        : { minimum: Number(check.value), exclusiveMinimum: true };
                case 'max':
                    return check.inclusive
                        ? { maximum: Number(check.value) }
                        : { maximum: Number(check.value), exclusiveMaximum: true };
                default:
                    return {};
            }
        }));
    }
}

class OpenApiGeneratorV3 {
    constructor(definitions) {
        const specifics = new OpenApiGeneratorV30Specifics();
        this.generator = new OpenAPIGenerator(definitions, specifics);
    }
    generateDocument(config) {
        const baseData = this.generator.generateDocumentData();
        return Object.assign(Object.assign({}, config), baseData);
    }
    generateComponents() {
        return this.generator.generateComponents();
    }
}

class OpenApiGeneratorV31Specifics {
    get nullType() {
        return { type: 'null' };
    }
    mapNullableOfArray(objects, isNullable) {
        if (isNullable) {
            return [...objects, this.nullType];
        }
        return objects;
    }
    mapNullableType(type, isNullable) {
        if (!type) {
            // 'null' is considered a type in Open API 3.1.0 => not providing a type includes null
            return {};
        }
        // Open API 3.1.0 made the `nullable` key invalid and instead you use type arrays
        if (isNullable) {
            return {
                type: Array.isArray(type) ? [...type, 'null'] : [type, 'null'],
            };
        }
        return {
            type,
        };
    }
    mapTupleItems(schemas) {
        return {
            prefixItems: schemas,
        };
    }
    getNumberChecks(checks) {
        return Object.assign({}, ...checks.map(check => {
            switch (check.kind) {
                case 'min':
                    return check.inclusive
                        ? { minimum: Number(check.value) }
                        : { exclusiveMinimum: Number(check.value) };
                case 'max':
                    return check.inclusive
                        ? { maximum: Number(check.value) }
                        : { exclusiveMaximum: Number(check.value) };
                default:
                    return {};
            }
        }));
    }
}

function isWebhookDefinition(definition) {
    return 'type' in definition && definition.type === 'webhook';
}
class OpenApiGeneratorV31 {
    constructor(definitions) {
        this.definitions = definitions;
        this.webhookRefs = {};
        const specifics = new OpenApiGeneratorV31Specifics();
        this.generator = new OpenAPIGenerator(this.definitions, specifics);
    }
    generateDocument(config) {
        const baseDocument = this.generator.generateDocumentData();
        this.definitions
            .filter(isWebhookDefinition)
            .forEach(definition => this.generateSingleWebhook(definition.webhook));
        return Object.assign(Object.assign(Object.assign({}, config), baseDocument), { webhooks: this.webhookRefs });
    }
    generateComponents() {
        return this.generator.generateComponents();
    }
    generateSingleWebhook(route) {
        const routeDoc = this.generator.generatePath(route);
        this.webhookRefs[route.path] = Object.assign(Object.assign({}, this.webhookRefs[route.path]), routeDoc);
        return routeDoc;
    }
}

export { OpenAPIRegistry, OpenApiGeneratorV3, OpenApiGeneratorV31, extendZodWithOpenApi, getOpenApiMetadata };
