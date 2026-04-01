import { AsyncLocalStorage } from "node:async_hooks";
import { type Context, type ContextManager, ROOT_CONTEXT } from "@opentelemetry/api";

export class AsyncLocalStorageContextManager implements ContextManager {
  private storage = new AsyncLocalStorage<Context>();

  active(): Context {
    return this.storage.getStore() ?? ROOT_CONTEXT;
  }

  with<A extends unknown[], F extends (...args: A) => ReturnType<F>>(
    context: Context,
    fn: F,
    thisArg?: ThisParameterType<F>,
    ...args: A
  ): ReturnType<F> {
    return this.storage.run(context, () => fn.apply(thisArg, args));
  }

  bind<T>(context: Context, target: T): T {
    if (typeof target === "function") {
      const self = this;
      return function (this: any, ...args: any[]) {
        return self.with(context, () => (target as any).apply(this, args));
      } as unknown as T;
    }
    return target;
  }

  enable(): this {
    return this;
  }

  disable(): this {
    return this;
  }
}
