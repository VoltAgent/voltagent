import type { ResumableStreamAdapter } from "@voltagent/core";
import {
  createResumableStreamAdapter,
  createResumableStreamRedisStore,
} from "@voltagent/resumable-streams";
import { after } from "next/server";

let adapterPromise: Promise<ResumableStreamAdapter> | undefined;

export function getResumableStreamAdapter() {
  if (!adapterPromise) {
    adapterPromise = (async () => {
      const streamStore = await createResumableStreamRedisStore({ waitUntil: after });
      return createResumableStreamAdapter({ streamStore });
    })();
  }

  return adapterPromise;
}
