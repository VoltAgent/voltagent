/**
 * Minimal event emitter that works in both Node and edge runtimes.
 */
export class SimpleEventEmitter {
  private listeners = new Map<string, Set<(...args: any[]) => void>>();

  on(event: string, listener: (...args: any[]) => void): this {
    const set = this.listeners.get(event) ?? new Set();
    set.add(listener);
    this.listeners.set(event, set);
    return this;
  }

  off(event: string, listener: (...args: any[]) => void): this {
    const set = this.listeners.get(event);
    if (set) {
      // A listener added via once() is stored as an internal wrapper, so a direct
      // delete of the original function misses. Scan every registration and match
      // either the function itself or a wrapper whose `.listener` is the original.
      // The same function can be registered with both on() and once(); like Node's
      // EventEmitter we remove only the newest matching entry, so the Set's
      // insertion order lets the last match win.
      let match: ((...args: any[]) => void) | undefined;
      for (const registered of set) {
        if (
          registered === listener ||
          (registered as { listener?: (...args: any[]) => void }).listener === listener
        ) {
          match = registered;
        }
      }
      if (match) {
        set.delete(match);
      }
      if (set.size === 0) {
        this.listeners.delete(event);
      }
    }
    return this;
  }

  once(event: string, listener: (...args: any[]) => void): this {
    const wrapper = (...args: any[]) => {
      this.off(event, wrapper);
      listener(...args);
    };
    // Tag the wrapper so off(event, listener) can find and remove it.
    (wrapper as { listener?: (...args: any[]) => void }).listener = listener;
    return this.on(event, wrapper);
  }

  emit(event: string, ...args: any[]): boolean {
    const set = this.listeners.get(event);
    if (!set || set.size === 0) {
      return false;
    }
    for (const listener of Array.from(set)) {
      try {
        listener(...args);
      } catch {
        // Ignore listener errors to align with Node's EventEmitter behavior
      }
    }
    return true;
  }

  listenerCount(event: string): number {
    return this.listeners.get(event)?.size ?? 0;
  }

  removeAllListeners(event?: string): void {
    if (typeof event === "string") {
      this.listeners.delete(event);
      return;
    }

    this.listeners.clear();
  }
}
