import { Env, ValidationTargets, Context, TypedResponse, Input, MiddlewareHandler } from 'hono';
import * as v3 from 'zod/v3';
import { ZodSafeParseResult as ZodSafeParseResult$1 } from 'zod/v4';
import * as v4 from 'zod/v4/core';

type ZodSchema = v3.ZodType | v4.$ZodType;
type ZodError<T extends ZodSchema> = T extends v4.$ZodType ? v4.$ZodError : v3.ZodError;
type ZodSafeParseResult<T, T2, T3 extends ZodSchema> = T3 extends v4.$ZodType ? ZodSafeParseResult$1<T> : v3.SafeParseReturnType<T, T2>;
type zInput<T> = T extends v3.ZodType ? v3.input<T> : T extends v4.$ZodType ? v4.input<T> : never;
type zOutput<T> = T extends v3.ZodType ? v3.output<T> : T extends v4.$ZodType ? v4.output<T> : never;
type zInfer<T> = T extends v3.ZodType ? v3.infer<T> : T extends v4.$ZodType ? v4.infer<T> : never;
type Hook<T, E extends Env, P extends string, Target extends keyof ValidationTargets = keyof ValidationTargets, O = {}, Schema extends ZodSchema = any> = (result: ({
    success: true;
    data: T;
} | {
    success: false;
    error: ZodError<Schema>;
    data: T;
}) & {
    target: Target;
}, c: Context<E, P>) => Response | void | TypedResponse<O> | Promise<Response | void | TypedResponse<O>>;
type HasUndefined<T> = undefined extends T ? true : false;
declare const zValidator: <T extends ZodSchema, Target extends keyof ValidationTargets, E extends Env, P extends string, In = zInput<T>, Out = zOutput<T>, I extends Input = {
    in: HasUndefined<In> extends true ? { [K in Target]?: In extends ValidationTargets[K] ? In : { [K2 in keyof In]?: ValidationTargets[K][K2]; }; } : { [K in Target]: In extends ValidationTargets[K] ? In : { [K2 in keyof In]: ValidationTargets[K][K2]; }; };
    out: { [K in Target]: Out; };
}, V extends I = I, InferredValue = zInfer<T>>(target: Target, schema: T, hook?: Hook<InferredValue, E, P, Target, {}, T>, options?: {
    validationFunction: (schema: T, value: ValidationTargets[Target]) => ZodSafeParseResult<any, any, T> | Promise<ZodSafeParseResult<any, any, T>>;
}) => MiddlewareHandler<E, P, V>;

export { type Hook, zValidator };
