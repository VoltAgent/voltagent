import { Agent, VoltAgent } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { fxmacrodataTools } from "./tools.js";

const logger = createPinoLogger({
  name: "fxmacrodata-agent",
  level: "info",
});

const macroResearchAgent = new Agent({
  name: "macro-research-agent",
  instructions: `You answer macroeconomic and FX questions with FXMacroData tools.

Use listIndicators when you need an indicator slug, getIndicatorHistory for released values,
getReleaseCalendar for what is scheduled next, and getFxRates for exchange rates.
For released values, give the period each value refers to and, when the tool result includes them,
the publication time and source link. For calendar entries and FX rates, use the dates and times the
tool returns. Never fill in a date, time or source that the tool result does not contain.
If a tool result has a note, tell the user about the limits it describes, such as delayed releases.
If a tool returns HTTP 401 or 403, say that the currency or dataset needs an FXMacroData API key
rather than guessing a number.`,
  model: "openai/gpt-4o-mini",
  tools: fxmacrodataTools,
});

new VoltAgent({
  agents: {
    macroResearchAgent,
  },
  logger,
  // Local example: listen on loopback only. The server has no auth, so do not
  // bind it to a public interface without adding authentication first.
  server: honoServer({ hostname: "127.0.0.1" }),
});
