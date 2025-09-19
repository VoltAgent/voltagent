import type { FilterContext } from "../filters";
import type { MCPServer } from "../server";

export interface TransportStartOptions {
  contextOverrides?: Partial<Omit<FilterContext, "transport">>;
}

export interface TransportController {
  start(options?: TransportStartOptions): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
}

type TransportFactory = (server: MCPServer) => TransportController;

export class TransportRegistry {
  private factories = new Map<string, TransportFactory>();

  register(name: string, factory: TransportFactory): void {
    this.factories.set(name, factory);
  }

  unregister(name: string): void {
    this.factories.delete(name);
  }

  has(name: string): boolean {
    return this.factories.has(name);
  }

  create(name: string, server: MCPServer): TransportController {
    const factory = this.factories.get(name);
    if (!factory) {
      throw new Error(`Transport '${name}' is not registered`);
    }
    return factory(server);
  }

  list(): string[] {
    return Array.from(this.factories.keys());
  }
}

export const transportRegistry = new TransportRegistry();
