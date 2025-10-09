export declare class ZodToOpenAPIError {
    private message;
    constructor(message: string);
}
interface ConflictErrorProps {
    key: string;
    values: any[];
}
export declare class ConflictError extends ZodToOpenAPIError {
    private data;
    constructor(message: string, data: ConflictErrorProps);
}
export interface MissingParameterDataErrorProps {
    paramName?: string;
    route?: string;
    location?: string;
    missingField: string;
}
export declare class MissingParameterDataError extends ZodToOpenAPIError {
    data: MissingParameterDataErrorProps;
    constructor(data: MissingParameterDataErrorProps);
}
export declare function enhanceMissingParametersError<T>(action: () => T, paramsToAdd: Partial<MissingParameterDataErrorProps>): T;
interface UnknownZodTypeErrorProps {
    schemaName?: string;
    currentSchema: any;
}
export declare class UnknownZodTypeError extends ZodToOpenAPIError {
    private data;
    constructor(data: UnknownZodTypeErrorProps);
}
export {};
