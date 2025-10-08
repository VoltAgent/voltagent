import { ZodTypeAny } from 'zod';
export declare function getOpenApiMetadata<T extends ZodTypeAny>(zodSchema: T): Partial<{
    [x: string]: any;
}>;
