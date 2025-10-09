import type { OpenAPIObject } from 'openapi3-ts/oas30';
import { OpenApiGeneratorOptions } from '../openapi-generator';
import { ZodType } from 'zod';
import { OpenAPIDefinitions } from '../openapi-registry';
export type OpenAPIObjectConfig = Omit<OpenAPIObject, 'paths' | 'components' | 'webhooks'>;
export declare class OpenApiGeneratorV3 {
    private generator;
    constructor(definitions: (OpenAPIDefinitions | ZodType)[], options?: OpenApiGeneratorOptions);
    generateDocument(config: OpenAPIObjectConfig): OpenAPIObject;
    generateComponents(): Pick<OpenAPIObject, 'components'>;
}
