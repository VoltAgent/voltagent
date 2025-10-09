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

const ZodTypeKeys = {
    ZodAny: 'any',
    ZodArray: 'array',
    ZodBigInt: 'bigint',
    ZodBoolean: 'boolean',
    ZodDefault: 'default',
    ZodTransform: 'transform',
    ZodEnum: 'enum',
    ZodIntersection: 'intersection',
    ZodLiteral: 'literal',
    ZodNever: 'never',
    ZodNull: 'null',
    ZodNullable: 'nullable',
    ZodNumber: 'number',
    ZodNonOptional: 'nonoptional',
    ZodObject: 'object',
    ZodOptional: 'optional',
    ZodPipe: 'pipe',
    ZodReadonly: 'readonly',
    ZodRecord: 'record',
    ZodString: 'string',
    ZodTuple: 'tuple',
    ZodType: 'type',
    ZodUnion: 'union',
    ZodDiscriminatedUnion: 'union',
    ZodUnknown: 'unknown',
    ZodVoid: 'void',
    ZodDate: 'date',
};
function isZodType(schema, typeNames) {
    const typeNamesArray = Array.isArray(typeNames) ? typeNames : [typeNames];
    return typeNamesArray.some(typeName => {
        var _a;
        const typeNameMatch = ((_a = schema === null || schema === void 0 ? void 0 : schema.def) === null || _a === void 0 ? void 0 : _a.type) === ZodTypeKeys[typeName];
        if (typeName === 'ZodDiscriminatedUnion') {
            return (typeNameMatch &&
                'discriminator' in schema.def);
        }
        return typeNameMatch;
    });
}
function isAnyZodType(schema) {
    return 'def' in schema;
}
/**
 * The schema.isNullable() is deprecated. This is the suggested replacement
 * as this was how isNullable operated beforehand.
 */
function isNullableSchema(schema) {
    return schema.safeParse(null).success;
}
/**
 * The schema.isOptional() is deprecated. This is the suggested replacement
 * as this was how isOptional operated beforehand.
 */
function isOptionalSchema(schema) {
    return schema.safeParse(undefined).success;
}

class $ZodRegistry {
    constructor() {
        this._map = new Map();
        this._idmap = new Map();
    }
    add(schema, ..._meta) {
        const meta = _meta[0];
        this._map.set(schema, meta);
        if (meta && typeof meta === "object" && "id" in meta) {
            if (this._idmap.has(meta.id)) {
                throw new Error(`ID ${meta.id} already exists in the registry`);
            }
            this._idmap.set(meta.id, schema);
        }
        return this;
    }
    clear() {
        this._map = new Map();
        this._idmap = new Map();
        return this;
    }
    remove(schema) {
        const meta = this._map.get(schema);
        if (meta && typeof meta === "object" && "id" in meta) {
            this._idmap.delete(meta.id);
        }
        this._map.delete(schema);
        return this;
    }
    get(schema) {
        // return this._map.get(schema) as any;
        // inherit metadata
        const p = schema._zod.parent;
        if (p) {
            const pm = { ...(this.get(p) ?? {}) };
            delete pm.id; // do not inherit id
            return { ...pm, ...this._map.get(schema) };
        }
        return this._map.get(schema);
    }
    has(schema) {
        return this._map.has(schema);
    }
}
// registries
function registry() {
    return new $ZodRegistry();
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
function sortObjectByKeys(obj) {
    return Object.fromEntries(Object.entries(obj).sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey)));
}

/**
 * @deprecated This is not really deprecated but this should always be used with
 * caution. Using it may alter the behavior of the library and the generated schemas.
 */
const zodToOpenAPIRegistry = registry();
class Metadata {
    static collectMetadata(schema, metadata) {
        const currentMetadata = this.getMetadataFromRegistry(schema);
        const _internal = Object.assign(Object.assign({}, currentMetadata === null || currentMetadata === void 0 ? void 0 : currentMetadata._internal), metadata === null || metadata === void 0 ? void 0 : metadata._internal);
        const param = Object.assign(Object.assign({}, currentMetadata === null || currentMetadata === void 0 ? void 0 : currentMetadata.param), metadata === null || metadata === void 0 ? void 0 : metadata.param);
        const totalMetadata = Object.assign(Object.assign(Object.assign(Object.assign({}, (Object.keys(_internal).length > 0 ? { _internal } : {})), currentMetadata), metadata), (Object.keys(param).length > 0 ? { param } : {}));
        if (isZodType(schema, [
            'ZodOptional',
            'ZodNullable',
            'ZodDefault',
            'ZodReadonly',
            'ZodNonOptional',
        ]) &&
            isAnyZodType(schema._zod.def.innerType)) {
            return this.collectMetadata(schema._zod.def.innerType, totalMetadata);
        }
        if (isZodType(schema, 'ZodPipe')) {
            const inSchema = schema._zod.def.in;
            const outSchema = schema._zod.def.out;
            // meaning preprocess
            if (isZodType(inSchema, 'ZodTransform') && isAnyZodType(outSchema)) {
                return this.collectMetadata(outSchema, totalMetadata);
            }
            if (isAnyZodType(inSchema)) {
                // meaning transform
                return this.collectMetadata(inSchema, totalMetadata);
            }
        }
        return totalMetadata;
    }
    /**
     * @deprecated Use one of `getOpenApiMetadata` or `getInternalMetadata` instead
     */
    static getMetadata(zodSchema) {
        return this.collectMetadata(zodSchema);
    }
    static getOpenApiMetadata(zodSchema) {
        const metadata = this.collectMetadata(zodSchema);
        const _a = metadata !== null && metadata !== void 0 ? metadata : {}, rest = __rest(_a, ["_internal"]);
        return rest;
    }
    static getInternalMetadata(zodSchema) {
        var _a;
        return (_a = this.collectMetadata(zodSchema)) === null || _a === void 0 ? void 0 : _a._internal;
    }
    static getParamMetadata(zodSchema) {
        const metadata = this.collectMetadata(zodSchema);
        return Object.assign(Object.assign({}, metadata), { 
            // A description provided from .openapi() should be taken with higher precedence
            param: Object.assign(Object.assign({}, ((metadata === null || metadata === void 0 ? void 0 : metadata.description) ? { description: metadata.description } : {})), metadata === null || metadata === void 0 ? void 0 : metadata.param) });
    }
    /**
     * A method that omits all custom keys added to the regular OpenAPI
     * metadata properties
     */
    static buildSchemaMetadata(metadata) {
        return omitBy(omit(metadata, ['param', '_internal']), isUndefined);
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
        return unwrapped === null || unwrapped === void 0 ? void 0 : unwrapped._zod.def.defaultValue;
    }
    static unwrapUntil(schema, typeName) {
        if (typeName && isZodType(schema, typeName)) {
            return schema;
        }
        if (isZodType(schema, [
            'ZodOptional',
            'ZodNullable',
            'ZodDefault',
            'ZodReadonly',
            'ZodNonOptional',
        ]) &&
            isAnyZodType(schema._zod.def.innerType)) {
            return this.unwrapUntil(schema._zod.def.innerType, typeName);
        }
        if (isZodType(schema, 'ZodPipe')) {
            const inSchema = schema._zod.def.in;
            const outSchema = schema._zod.def.out;
            // meaning preprocess
            if (isZodType(inSchema, 'ZodTransform') && isAnyZodType(outSchema)) {
                return this.unwrapUntil(outSchema, typeName);
            }
            // meaning transform
            if (isAnyZodType(inSchema)) {
                return this.unwrapUntil(inSchema, typeName);
            }
        }
        return typeName ? undefined : schema;
    }
    static getMetadataFromInternalRegistry(zodSchema) {
        return zodToOpenAPIRegistry.get(zodSchema);
    }
    static getMetadataFromRegistry(zodSchema) {
        const internal = this.getMetadataFromInternalRegistry(zodSchema);
        const general = zodSchema.meta();
        if (!internal) {
            return general;
        }
        const { _internal } = internal, rest = __rest(internal, ["_internal"]);
        const _a = general !== null && general !== void 0 ? general : {}, { id, title } = _a, restGeneral = __rest(_a, ["id", "title"]);
        return Object.assign(Object.assign(Object.assign({ _internal: Object.assign(Object.assign({}, (id ? { refId: id } : {})), _internal) }, rest), (title ? { description: title } : {})), restGeneral);
    }
    static setMetadataInRegistry(zodSchema, metadata) {
        zodToOpenAPIRegistry.add(zodSchema, metadata);
    }
}

function preserveMetadataFromModifier(zodSchema, modifier) {
    const zodModifier = zodSchema[modifier];
    if (typeof zodModifier !== 'function') {
        return;
    }
    zodSchema[modifier] = function (...args) {
        const result = zodModifier.apply(this, args);
        const meta = Metadata.getMetadataFromRegistry(this);
        if (meta) {
            Metadata.setMetadataInRegistry(result, meta);
        }
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
    zod.ZodType.prototype.openapi = function (...args) {
        const { refId, metadata, options } = getOpenApiConfiguration(...args);
        const _a = metadata !== null && metadata !== void 0 ? metadata : {}, { param } = _a, restOfOpenApi = __rest(_a, ["param"]);
        const allMetadata = Metadata.getMetadataFromRegistry(this);
        const _b = allMetadata !== null && allMetadata !== void 0 ? allMetadata : {}, { _internal: internalMetadata } = _b, currentMetadata = __rest(_b, ["_internal"]);
        const _internal = Object.assign(Object.assign(Object.assign({}, internalMetadata), options), (refId ? { refId } : undefined));
        const resultMetadata = Object.assign(Object.assign(Object.assign({}, currentMetadata), restOfOpenApi), ((currentMetadata === null || currentMetadata === void 0 ? void 0 : currentMetadata.param) || param
            ? {
                param: Object.assign(Object.assign({}, currentMetadata === null || currentMetadata === void 0 ? void 0 : currentMetadata.param), param),
            }
            : undefined));
        // We need to create a new instance of the schema so that sequential
        // calls to .openapi from keys do not override each other
        // See the test in metadata-overrides.spec.ts (only adds overrides for new metadata properties)
        const result = new this.constructor(this._def);
        Metadata.setMetadataInRegistry(result, Object.assign(Object.assign({}, (Object.keys(_internal).length > 0 ? { _internal } : undefined)), resultMetadata));
        if (isZodType(result, 'ZodObject')) {
            const currentMetadata = Metadata.getMetadataFromRegistry(result);
            const originalExtend = result.extend;
            result.extend = function (...args) {
                const extendedResult = originalExtend.apply(result, args);
                const _a = currentMetadata !== null && currentMetadata !== void 0 ? currentMetadata : {}, { _internal } = _a, rest = __rest(_a, ["_internal"]);
                Metadata.setMetadataInRegistry(extendedResult, {
                    _internal: {
                        extendedFrom: (_internal === null || _internal === void 0 ? void 0 : _internal.refId)
                            ? { refId: _internal.refId, schema: result }
                            : _internal === null || _internal === void 0 ? void 0 : _internal.extendedFrom,
                    },
                });
                // This is hacky. Yes we can do that directly in the meta call above,
                // but that would not override future calls to .extend. That's why
                // we call openapi explicitly here. And in that case might as well add the metadata
                // here instead of through the meta call
                return extendedResult.openapi(rest);
            };
            preserveMetadataFromModifier(result, 'catchall');
        }
        preserveMetadataFromModifier(result, 'optional');
        preserveMetadataFromModifier(result, 'nullable');
        preserveMetadataFromModifier(result, 'default');
        preserveMetadataFromModifier(result, 'transform');
        preserveMetadataFromModifier(result, 'refine');
        preserveMetadataFromModifier(result, 'length');
        preserveMetadataFromModifier(result, 'min');
        preserveMetadataFromModifier(result, 'max');
        const originalMeta = result.meta;
        result.meta = function (...args) {
            const result = originalMeta.apply(this, args);
            if (args[0]) {
                const meta = Metadata.getMetadataFromInternalRegistry(this);
                if (meta) {
                    Metadata.setMetadataInRegistry(result, Object.assign(Object.assign({}, meta), args[0]));
                }
            }
            return result;
        };
        return result;
    };
}
function getOpenApiConfiguration(refOrOpenapi, metadataOrOptions, options) {
    if (typeof refOrOpenapi === 'string') {
        return {
            refId: refOrOpenapi,
            metadata: metadataOrOptions,
            options,
        };
    }
    return {
        refId: undefined,
        metadata: refOrOpenapi,
        options: metadataOrOptions,
    };
}

function getOpenApiMetadata(zodSchema) {
    var _a;
    return omitBy((_a = Metadata.getOpenApiMetadata(zodSchema)) !== null && _a !== void 0 ? _a : {}, isUndefined);
}
function getRefId(zodSchema) {
    return Metadata.getRefId(zodSchema);
}

class OpenAPIRegistry {
    constructor(parents) {
        this.parents = parents;
        this._definitions = [];
    }
    get definitions() {
        var _a, _b;
        const parentDefinitions = (_b = (_a = this.parents) === null || _a === void 0 ? void 0 : _a.flatMap(par => par._definitions)) !== null && _b !== void 0 ? _b : [];
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
        const currentMetadata = (_a = Metadata.getOpenApiMetadata(schemaWithRefId)) !== null && _a !== void 0 ? _a : {};
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
        super(`Missing parameter data, please specify \`${data.missingField}\` and other OpenAPI parameter props using the \`param\` field of \`schema.openapi\``);
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
        super(`Unknown zod object type, please specify \`type\` and other OpenAPI props using \`schema.openapi\`.`);
        this.data = data;
    }
}

class ArrayTransformer {
    transform(zodSchema, mapNullableType, mapItems) {
        var _a, _b, _c, _d;
        const itemType = zodSchema.def.element;
        const minItems = (_b = (_a = zodSchema.def.checks) === null || _a === void 0 ? void 0 : _a.find((check) => check._zod.def.check === 'min_length')) === null || _b === void 0 ? void 0 : _b._zod.def.minimum;
        const maxItems = (_d = (_c = zodSchema.def.checks) === null || _c === void 0 ? void 0 : _c.find((check) => check._zod.def.check === 'max_length')) === null || _d === void 0 ? void 0 : _d._zod.def.maximum;
        return Object.assign(Object.assign({}, mapNullableType('array')), { items: isAnyZodType(itemType) ? mapItems(itemType) : {}, minItems,
            maxItems });
    }
}

class BigIntTransformer {
    transform(mapNullableType) {
        return Object.assign(Object.assign({}, mapNullableType('string')), { pattern: `^\d+$` });
    }
}

class DiscriminatedUnionTransformer {
    transform(zodSchema, isNullable, mapNullableOfArray, mapItem, generateSchemaRef) {
        const options = [...zodSchema.def.options];
        const optionSchema = options.map(mapItem);
        if (isNullable) {
            return {
                oneOf: mapNullableOfArray(optionSchema, isNullable),
            };
        }
        const discriminator = zodSchema._zod.def.discriminator;
        if (!discriminator) {
            console.error('No discriminator found for discriminated union', zodSchema);
            return {
                oneOf: optionSchema,
            };
        }
        return {
            oneOf: optionSchema,
            discriminator: this.mapDiscriminator(options, discriminator, generateSchemaRef),
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
            const value = (_a = obj.def.shape) === null || _a === void 0 ? void 0 : _a[discriminator];
            if (isZodType(value, 'ZodEnum')) {
                // Native enums have their keys as both number and strings however the number is an
                // internal representation and the string is the access point for a documentation
                const keys = Object.values(value._zod.def.entries).filter(isString);
                keys.forEach((enumValue) => {
                    mapping[enumValue] = generateSchemaRef(refId);
                });
                return;
            }
            const literalValue = value === null || value === void 0 ? void 0 : value.def.values[0];
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

class EnumTransformer {
    transform(zodSchema, mapNullableType) {
        const { type, values } = enumInfo(zodSchema._zod.def.entries);
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
        const leftSubTypes = isAnyZodType(schema._zod.def.left)
            ? this.flattenIntersectionTypes(schema._zod.def.left)
            : [];
        const rightSubTypes = isAnyZodType(schema._zod.def.right)
            ? this.flattenIntersectionTypes(schema._zod.def.right)
            : [];
        return [...leftSubTypes, ...rightSubTypes];
    }
}

class LiteralTransformer {
    constructor() {
        this.bigIntTransformer = new BigIntTransformer();
    }
    transform(zodSchema, mapNullableType) {
        const type = typeof zodSchema.def.values[0];
        if (type === 'boolean' ||
            type === 'number' ||
            type === 'string' ||
            type === 'object') {
            return Object.assign(Object.assign({}, mapNullableType(type)), { enum: [zodSchema.def.values[0]] });
        }
        if (type === 'bigint') {
            return this.bigIntTransformer.transform(mapNullableType);
        }
        // Zod doesn't really support anything else anyways
        return mapNullableType('null');
    }
}

class NumberTransformer {
    transform(zodSchema, mapNullableType, getNumberChecks) {
        var _a;
        return Object.assign(Object.assign(Object.assign({}, mapNullableType('number')), mapNullableType(zodSchema.format === 'safeint' ? 'integer' : 'number')), getNumberChecks((_a = zodSchema.def.checks) !== null && _a !== void 0 ? _a : []));
    }
}

class ObjectTransformer {
    transform(zodSchema, defaultValue, mapNullableType, mapItem) {
        var _a;
        const extendedFrom = (_a = Metadata.getInternalMetadata(zodSchema)) === null || _a === void 0 ? void 0 : _a.extendedFrom;
        const required = this.requiredKeysOf(zodSchema);
        const properties = mapValues(zodSchema.def.shape, mapItem);
        if (!extendedFrom) {
            return Object.assign(Object.assign(Object.assign(Object.assign({}, mapNullableType('object')), { properties, default: defaultValue }), (required.length > 0 ? { required } : {})), this.generateAdditionalProperties(zodSchema, mapItem));
        }
        const parent = extendedFrom.schema;
        // We want to generate the parent schema so that it can be referenced down the line
        mapItem(parent);
        const keysRequiredByParent = this.requiredKeysOf(parent);
        const propsOfParent = mapValues(parent === null || parent === void 0 ? void 0 : parent.def.shape, mapItem);
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
        const catchallSchema = zodSchema.def.catchall;
        if (!catchallSchema) {
            return {};
        }
        if (isZodType(catchallSchema, 'ZodNever')) {
            return { additionalProperties: false };
        }
        if (isAnyZodType(catchallSchema)) {
            return { additionalProperties: mapItem(catchallSchema) };
        }
        return {};
    }
    requiredKeysOf(objectSchema) {
        return Object.entries(objectSchema.def.shape)
            .filter(([_key, type]) => !isOptionalSchema(type))
            .map(([key, _type]) => key);
    }
}

class RecordTransformer {
    transform(zodSchema, mapNullableType, mapItem) {
        const propertiesType = zodSchema.valueType;
        const keyType = zodSchema.keyType;
        const propertiesSchema = isAnyZodType(propertiesType)
            ? mapItem(propertiesType)
            : {};
        if (isZodType(keyType, 'ZodEnum')) {
            // Native enums have their keys as both number and strings however the number is an
            // internal representation and the string is the access point for a documentation
            const keys = Object.values(keyType._zod.def.entries).filter(isString);
            const properties = keys.reduce((acc, curr) => (Object.assign(Object.assign({}, acc), { [curr]: propertiesSchema })), {});
            return Object.assign(Object.assign({}, mapNullableType('object')), { properties });
        }
        return Object.assign(Object.assign({}, mapNullableType('object')), { additionalProperties: propertiesSchema });
    }
}

function isZodCheckLengthEquals(check) {
    return check._zod.def.check === 'length_equals';
}
function isZodCheckRegex(check) {
    return (check._zod.def.check === 'string_format' &&
        check._zod.def.format === 'regex');
}
class StringTransformer {
    transform(zodSchema, mapNullableType) {
        var _a, _b, _c, _d;
        const regexCheck = (_a = zodSchema.def.checks) === null || _a === void 0 ? void 0 : _a.find(isZodCheckRegex);
        // toString generates an additional / at the beginning and end of the pattern
        const pattern = regexCheck === null || regexCheck === void 0 ? void 0 : regexCheck._zod.def.pattern.toString().replace(/^\/|\/$/g, '');
        const check = (_b = zodSchema.def.checks) === null || _b === void 0 ? void 0 : _b.find(isZodCheckLengthEquals);
        const length = check === null || check === void 0 ? void 0 : check._zod.def.length;
        const maxLength = Number.isFinite(zodSchema.minLength)
            ? (_c = zodSchema.minLength) !== null && _c !== void 0 ? _c : undefined
            : undefined;
        const minLength = Number.isFinite(zodSchema.maxLength)
            ? (_d = zodSchema.maxLength) !== null && _d !== void 0 ? _d : undefined
            : undefined;
        return Object.assign(Object.assign({}, mapNullableType('string')), { 
            // FIXME: https://github.com/colinhacks/zod/commit/d78047e9f44596a96d637abb0ce209cd2732d88c
            minLength: length !== null && length !== void 0 ? length : maxLength, maxLength: length !== null && length !== void 0 ? length : minLength, format: this.mapStringFormat(zodSchema), pattern });
    }
    /**
     * Attempts to map Zod strings to known formats
     * https://json-schema.org/understanding-json-schema/reference/string.html#built-in-formats
     */
    mapStringFormat(zodString) {
        if (zodString.format === 'uuid')
            return 'uuid';
        if (zodString.format === 'email')
            return 'email';
        if (zodString.format === 'url')
            return 'uri';
        if (zodString.format === 'date')
            return 'date';
        if (zodString.format === 'datetime')
            return 'date-time';
        if (zodString.format === 'cuid')
            return 'cuid';
        if (zodString.format === 'cuid2')
            return 'cuid2';
        if (zodString.format === 'ulid')
            return 'ulid';
        if (zodString.format === 'ipv4')
            return 'ip';
        if (zodString.format === 'ipv6')
            return 'ip';
        if (zodString.format === 'emoji')
            return 'emoji';
        return undefined;
    }
}

class TupleTransformer {
    constructor(versionSpecifics) {
        this.versionSpecifics = versionSpecifics;
    }
    transform(zodSchema, mapNullableType, mapItem) {
        const items = zodSchema._zod.def.items;
        const schemas = items.map(item => isAnyZodType(item) ? mapItem(item) : {});
        return Object.assign(Object.assign({}, mapNullableType('array')), this.versionSpecifics.mapTupleItems(schemas));
    }
}

class UnionTransformer {
    constructor(options) {
        this.options = options;
    }
    transform(zodSchema, mapNullableOfArray, mapItem) {
        var _a, _b, _c;
        const internalMetadata = Metadata.getInternalMetadata(zodSchema);
        const preferredType = (_c = (_a = internalMetadata === null || internalMetadata === void 0 ? void 0 : internalMetadata.unionPreferredType) !== null && _a !== void 0 ? _a : (_b = this.options) === null || _b === void 0 ? void 0 : _b.unionPreferredType) !== null && _c !== void 0 ? _c : 'anyOf';
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
            [preferredType]: mapNullableOfArray(schemas),
        };
    }
    flattenUnionTypes(schema) {
        if (!isZodType(schema, 'ZodUnion')) {
            return [schema];
        }
        const options = schema.def.options;
        return options.flatMap(option => isAnyZodType(option) ? this.flattenUnionTypes(option) : []);
    }
    unwrapNullable(schema) {
        if (isZodType(schema, 'ZodNullable')) {
            const unwrapped = schema.unwrap();
            if (isAnyZodType(unwrapped)) {
                return this.unwrapNullable(unwrapped);
            }
        }
        return schema;
    }
}

class DateTransformer {
    transform(mapNullableType) {
        return Object.assign(Object.assign({}, mapNullableType('string')), { format: 'date' });
    }
}

class OpenApiTransformer {
    constructor(versionSpecifics, options) {
        this.versionSpecifics = versionSpecifics;
        this.objectTransformer = new ObjectTransformer();
        this.stringTransformer = new StringTransformer();
        this.numberTransformer = new NumberTransformer();
        this.bigIntTransformer = new BigIntTransformer();
        this.dateTransformer = new DateTransformer();
        this.literalTransformer = new LiteralTransformer();
        this.enumTransformer = new EnumTransformer();
        this.arrayTransformer = new ArrayTransformer();
        this.discriminatedUnionTransformer = new DiscriminatedUnionTransformer();
        this.intersectionTransformer = new IntersectionTransformer();
        this.recordTransformer = new RecordTransformer();
        this.tupleTransformer = new TupleTransformer(versionSpecifics);
        this.unionTransformer = new UnionTransformer(options);
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
        if (isZodType(zodSchema, 'ZodArray')) {
            return this.arrayTransformer.transform(zodSchema, _ => this.versionSpecifics.mapNullableType(_, isNullable), mapItem);
        }
        if (isZodType(zodSchema, 'ZodTuple')) {
            return this.tupleTransformer.transform(zodSchema, _ => this.versionSpecifics.mapNullableType(_, isNullable), mapItem);
        }
        // Note: It is important that this goes above the union transformer
        // because the discriminated union is still a union
        if (isZodType(zodSchema, 'ZodDiscriminatedUnion')) {
            return this.discriminatedUnionTransformer.transform(zodSchema, isNullable, _ => this.versionSpecifics.mapNullableOfArray(_, isNullable), mapItem, generateSchemaRef);
        }
        if (isZodType(zodSchema, 'ZodUnion')) {
            return this.unionTransformer.transform(zodSchema, _ => this.versionSpecifics.mapNullableOfArray(_, isNullable), mapItem);
        }
        if (isZodType(zodSchema, 'ZodIntersection')) {
            return this.intersectionTransformer.transform(zodSchema, isNullable, _ => this.versionSpecifics.mapNullableOfArray(_, isNullable), mapItem);
        }
        if (isZodType(zodSchema, 'ZodRecord')) {
            return this.recordTransformer.transform(zodSchema, _ => this.versionSpecifics.mapNullableType(_, isNullable), mapItem);
        }
        if (isZodType(zodSchema, 'ZodDate')) {
            return this.dateTransformer.transform(_ => this.versionSpecifics.mapNullableType(_, isNullable));
        }
        const refId = Metadata.getRefId(zodSchema);
        throw new UnknownZodTypeError({
            currentSchema: zodSchema.def,
            schemaName: refId,
        });
    }
}

class OpenAPIGenerator {
    constructor(definitions, versionSpecifics, options) {
        this.definitions = definitions;
        this.versionSpecifics = versionSpecifics;
        this.options = options;
        this.schemaRefs = {};
        this.paramRefs = {};
        this.pathRefs = {};
        this.rawComponents = [];
        this.openApiTransformer = new OpenApiTransformer(versionSpecifics, options);
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
        var _a, _b, _c, _d;
        const rawComponents = {};
        this.rawComponents.forEach(({ componentType, name, component }) => {
            var _a;
            (_a = rawComponents[componentType]) !== null && _a !== void 0 ? _a : (rawComponents[componentType] = {});
            rawComponents[componentType][name] = component;
        });
        const allSchemas = Object.assign(Object.assign({}, ((_a = rawComponents.schemas) !== null && _a !== void 0 ? _a : {})), this.schemaRefs);
        const schemas = ((_b = this.options) === null || _b === void 0 ? void 0 : _b.sortComponents) === 'alphabetically'
            ? sortObjectByKeys(allSchemas)
            : allSchemas;
        const allParameters = Object.assign(Object.assign({}, ((_c = rawComponents.parameters) !== null && _c !== void 0 ? _c : {})), this.paramRefs);
        const parameters = ((_d = this.options) === null || _d === void 0 ? void 0 : _d.sortComponents) === 'alphabetically'
            ? sortObjectByKeys(allParameters)
            : allParameters;
        return Object.assign(Object.assign({}, rawComponents), { schemas, parameters });
    }
    sortObjectKeys(object) { }
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
    getParameterRef(schema, external) {
        const metadata = Metadata.getOpenApiMetadata(schema);
        const internalMetadata = Metadata.getInternalMetadata(schema);
        const parameterMetadata = metadata === null || metadata === void 0 ? void 0 : metadata.param;
        const existingRef = (internalMetadata === null || internalMetadata === void 0 ? void 0 : internalMetadata.refId)
            ? this.paramRefs[internalMetadata.refId]
            : undefined;
        if (!(internalMetadata === null || internalMetadata === void 0 ? void 0 : internalMetadata.refId) || !existingRef) {
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
            $ref: `#/components/parameters/${internalMetadata.refId}`,
        };
    }
    generateInlineParameters(zodSchema, location) {
        const metadata = Metadata.getOpenApiMetadata(zodSchema);
        const parameterMetadata = metadata === null || metadata === void 0 ? void 0 : metadata.param;
        const referencedSchema = this.getParameterRef(zodSchema, { in: location });
        if (referencedSchema) {
            return [referencedSchema];
        }
        if (isZodType(zodSchema, 'ZodObject')) {
            const propTypes = zodSchema.def.shape;
            const parameters = Object.entries(propTypes).map(([key, schema]) => {
                var _a;
                const innerMetadata = Metadata.getOpenApiMetadata(schema);
                const referencedSchema = this.getParameterRef(schema, {
                    in: location,
                    name: key,
                });
                if (referencedSchema) {
                    return referencedSchema;
                }
                const innerParameterMetadata = innerMetadata === null || innerMetadata === void 0 ? void 0 : innerMetadata.param;
                if ((innerParameterMetadata === null || innerParameterMetadata === void 0 ? void 0 : innerParameterMetadata.name) &&
                    innerParameterMetadata.name !== key) {
                    throw new ConflictError(`Conflicting names for parameter`, {
                        key: 'name',
                        values: [key, innerParameterMetadata.name],
                    });
                }
                if ((innerParameterMetadata === null || innerParameterMetadata === void 0 ? void 0 : innerParameterMetadata.in) &&
                    innerParameterMetadata.in !== location) {
                    throw new ConflictError(`Conflicting location for parameter ${(_a = innerParameterMetadata.name) !== null && _a !== void 0 ? _a : key}`, {
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
        const metadata = Metadata.getParamMetadata(zodSchema);
        const paramMetadata = metadata === null || metadata === void 0 ? void 0 : metadata.param;
        // TODO: Why are we not unwrapping here for isNullable as well?
        const required = !isOptionalSchema(zodSchema) && !isNullableSchema(zodSchema);
        const schema = this.generateSchemaWithRef(zodSchema);
        return Object.assign({ schema,
            required }, (paramMetadata ? Metadata.buildParameterMetadata(paramMetadata) : {}));
    }
    generateParameter(zodSchema) {
        const metadata = Metadata.getOpenApiMetadata(zodSchema);
        const paramMetadata = metadata === null || metadata === void 0 ? void 0 : metadata.param;
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
        const innerSchema = Metadata.unwrapChained(zodSchema);
        const metadata = Metadata.getOpenApiMetadata(zodSchema);
        const defaultValue = Metadata.getDefaultValue(zodSchema);
        const result = (metadata === null || metadata === void 0 ? void 0 : metadata.type)
            ? { type: metadata.type }
            : this.toOpenAPISchema(innerSchema, isNullableSchema(zodSchema), defaultValue);
        return metadata
            ? Metadata.applySchemaMetadata(result, metadata)
            : omitBy(result, isUndefined);
    }
    /**
     * Same as above but applies nullable
     */
    constructReferencedOpenAPISchema(zodSchema) {
        const metadata = Metadata.getOpenApiMetadata(zodSchema);
        const innerSchema = Metadata.unwrapChained(zodSchema);
        const defaultValue = Metadata.getDefaultValue(zodSchema);
        const isNullable = isNullableSchema(zodSchema);
        if (metadata === null || metadata === void 0 ? void 0 : metadata.type) {
            return this.versionSpecifics.mapNullableType(metadata.type, isNullable);
        }
        return this.toOpenAPISchema(innerSchema, isNullable, defaultValue);
    }
    /**
     * Generates an OpenAPI SchemaObject or a ReferenceObject with all the provided metadata applied
     */
    generateSimpleSchema(zodSchema) {
        const metadata = Metadata.getOpenApiMetadata(zodSchema);
        const refId = Metadata.getRefId(zodSchema);
        if (!refId || !this.schemaRefs[refId]) {
            return this.generateSchemaWithMetadata(zodSchema);
        }
        const schemaRef = this.schemaRefs[refId];
        const referenceObject = {
            $ref: this.generateSchemaRef(refId),
        };
        // Metadata provided from .openapi() that is new to what we had already registered
        const newMetadata = omitBy(Metadata.buildSchemaMetadata(metadata !== null && metadata !== void 0 ? metadata : {}), (value, key) => value === undefined || objectEquals(value, schemaRef[key]));
        // Do not calculate schema metadata overrides if type is provided in .openapi
        // https://github.com/asteasolutions/zod-to-openapi/pull/52/files/8ff707fe06e222bc573ed46cf654af8ee0b0786d#r996430801
        if (newMetadata.type) {
            return {
                allOf: [referenceObject, newMetadata],
            };
        }
        // New metadata from zodSchema properties.
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
        if (isZodType(schema, 'ZodPipe')) {
            const inSchema = schema._zod.def.in;
            const outSchema = schema._zod.def.out;
            // meaning transform
            if (isZodType(inSchema, 'ZodObject')) {
                return this.cleanParameter(inSchema);
            }
            // meaning preprocess
            if (isZodType(outSchema, 'ZodObject')) {
                return this.cleanParameter(outSchema);
            }
            return undefined;
        }
        return schema;
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
        const schemaShape = headers.def.shape;
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
        const result = this.openApiTransformer.transform(zodSchema, isNullable, _ => this.generateSchemaWithRef(_), _ => this.generateSchemaRef(_), defaultValue);
        return result;
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
            switch (check._zod.def.check) {
                case 'greater_than': {
                    const greaterThanCheck = check;
                    return greaterThanCheck._zod.def.inclusive
                        ? { minimum: Number(greaterThanCheck._zod.def.value) }
                        : {
                            minimum: Number(greaterThanCheck._zod.def.value),
                            exclusiveMinimum: true,
                        };
                }
                case 'less_than': {
                    const lessThanCheck = check;
                    return lessThanCheck._zod.def.inclusive
                        ? { maximum: Number(lessThanCheck._zod.def.value) }
                        : {
                            maximum: Number(lessThanCheck._zod.def.value),
                            exclusiveMaximum: !lessThanCheck._zod.def.inclusive,
                        };
                }
                default:
                    return {};
            }
        }));
    }
}

class OpenApiGeneratorV3 {
    constructor(definitions, options) {
        const specifics = new OpenApiGeneratorV30Specifics();
        this.generator = new OpenAPIGenerator(definitions, specifics, options);
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
            switch (check._zod.def.check) {
                case 'greater_than': {
                    const greaterThanCheck = check;
                    return greaterThanCheck._zod.def.inclusive
                        ? { minimum: Number(greaterThanCheck._zod.def.value) }
                        : { exclusiveMinimum: Number(greaterThanCheck._zod.def.value) };
                }
                case 'less_than': {
                    const lessThanCheck = check;
                    return lessThanCheck._zod.def.inclusive
                        ? { maximum: Number(lessThanCheck._zod.def.value) }
                        : { exclusiveMaximum: Number(lessThanCheck._zod.def.value) };
                }
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
    constructor(definitions, options) {
        this.definitions = definitions;
        this.webhookRefs = {};
        const specifics = new OpenApiGeneratorV31Specifics();
        this.generator = new OpenAPIGenerator(this.definitions, specifics, options);
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

export { OpenAPIRegistry, OpenApiGeneratorV3, OpenApiGeneratorV31, extendZodWithOpenApi, getOpenApiMetadata, getRefId, zodToOpenAPIRegistry };
