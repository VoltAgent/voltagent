# VoltAgent Live Scorers Example

This example shows how to attach live scorers to an agent and read the results from VoltAgent's observability storage.

The agent evaluates each response with the built-in moderation and possible scorers sourced from the `@voltagent/scorers` package. Scores run asynchronously after the agent produces an answer, and are stored in the observability adapter together with trace identifiers and sampling metadata.

## Setup

1. Install dependencies:

   ```bash
   pnpm install
   pnpm --filter example-with-live-scorers install
   ```

2. Provide an OpenAI API key (the moderation scorer calls the OpenAI API):

   ```bash
   export OPENAI_API_KEY=sk-...
   ```

   You can also create an `.env` file alongside this README and place `OPENAI_API_KEY=...` inside it.

3. Run the example:

   ```bash
   pnpm --filter example-with-live-scorers start
   ```

The script prints the agent's reply followed by the live evaluation scores fetched from the in-memory observability adapter. Adjust the prompt or add additional scorers in `src/run.ts` to experiment with different behaviours.
