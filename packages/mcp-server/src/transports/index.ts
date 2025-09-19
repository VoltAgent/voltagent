export * from "./registry";
export * from "./stdio";
export * from "./external-sse";

import { transportRegistry } from "./registry";
import { StdioTransport } from "./stdio";

transportRegistry.register("stdio", (server) => new StdioTransport(server));

export { StdioTransport };
