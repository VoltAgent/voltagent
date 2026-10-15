import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";

// Never copy credentials into this example. Existing process values take precedence.
for (const location of [
  new URL("../.env", import.meta.url),
  new URL("../../base/.env", import.meta.url),
]) {
  try {
    const values = parseEnv(readFileSync(location, "utf8"));
    for (const key of ["OPENAI_API_KEY", "OPENAI_MODEL", "API_PORT", "PLAYGROUND_PORT"]) {
      if (!process.env[key] && values[key]) process.env[key] = values[key];
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}
if (!process.env.OPENAI_API_KEY)
  throw new Error("Set OPENAI_API_KEY in your environment or this example’s .env file.");
