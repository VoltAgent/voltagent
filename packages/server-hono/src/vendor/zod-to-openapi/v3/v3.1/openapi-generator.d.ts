import type { OpenAPIObject } from 'openapi3-ts/oas31';
import { ZodSchema } from 'zod';
import { OpenAPIDefinitions } from '../openapi-registry';
export type OpenAPIObjectConfigV31 = Omit<OpenAPIObject, 'paths' | 'components' | 'webhooks'>;
export declare class OpenApiGeneratorV31 {
    private definitions;
    private generator;
    private webhookRefs;
    constructor(definitions: (OpenAPIDefinitions | ZodSchema)[]);
    generateDocument(config: OpenAPIObjectConfigV31): OpenAPIObject;
    generateComponents(): Pick<OpenAPIObject, 'components'>;
    private generateSingleWebhook;
}
