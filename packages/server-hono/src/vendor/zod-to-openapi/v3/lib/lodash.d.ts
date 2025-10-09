import { isEqual } from './object-set';
export declare function isUndefined<T>(value: any): value is undefined;
export declare function mapValues<T extends object, MapperResult, Result = {
    [K in keyof T]: MapperResult;
}>(object: T, mapper: (val: T[keyof T]) => MapperResult): Result;
export declare function omit<T extends object, Keys extends keyof T, Result = Omit<T, Keys>>(object: T, keys: Keys[]): Result;
export declare function omitBy<T extends object, Result = Partial<{
    [K in keyof T]: T[keyof T];
}>>(object: T, predicate: (val: T[keyof T], key: keyof T) => boolean): Result;
export declare function compact<T extends any>(arr: (T | null | undefined)[]): T[];
export declare const objectEquals: typeof isEqual;
export declare function uniq<T>(values: T[]): T[];
export declare function isString(val: unknown): val is string;
