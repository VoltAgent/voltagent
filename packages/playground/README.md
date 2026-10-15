# @voltagent/playground

A local, account-free playground for VoltAgent. The bundled TanStack Start SPA uses React Flow to show agent structure and execution traces, with streaming chat, tool approval, and workflow execution controls.

**Result → Run again** prepares a fresh request and attaches the previous result as its baseline. **Result → Compare runs** shows output, input, metrics and recorded settings changes beside the canvas. **Save test** stores input/overrides and optional success checks under **Tests**: expected execution status, output text and recorded tool calls. Missing telemetry is unavailable and pending runs are not graded. Completion does not imply answer quality. The latest 50 run comparisons survive browser reloads. Reruns use fresh identities; server memory, external state and code are not snapshotted.

Execution traces grow left to right, with separate lanes for parallel operations and subagents. **Steps** opens a searchable list with input/query previews, model call numbers, status filters and optional internal spans; selecting a step opens its inspector at readable zoom. **View** groups layout, logs, detailed cards, linked runs and canvas framing. **Overview** shows concise step summaries instead of shrinking rich cards into thumbnails. Select a summary or use **Back to cards** to restore full cards; **View → Focus step** restores readable framing. Large overviews keep a minimum readable scale and can be panned. **Follow latest step** resumes live following after manual navigation. The minimap supports long runs.

The default flow groups memory bookkeeping and model-loop wrappers into inspectable internal spans. Errors stay visible; **Show internal spans** and the waterfall expose the full trace. Dashed lines indicate time order, while explicit resume/replay links are labelled. Run summaries show outcome, duration and usage; Metrics holds span counts and the longest step. Recent runs show request titles, timestamps with seconds, status, duration and tool counts; full result previews remain in the tooltip and search. Continued runs label duration as this segment and expose the previous run and lifecycle metadata in a collapsed link. Tool calls link between chat and their exact span, with matching logs highlighted and an optional selected-step filter.

Execution cards show useful facts for each node type by default: agent model/usage/instructions, model outcome/latest message/settings, tool purpose/parameters/input/output, and workflow, memory, retrieval, guardrail, middleware, scorer and delegation details. Payload previews expand in place; **View → Extra metadata** adds secondary metadata. Model titles use the recorded model name, with **Call N** separate from retry attempts. Missing per-call usage stays explicitly unreported. Structure cards show current configuration and schemas. Cards use wider spacing to keep expanded content readable.

Select a historical run to open **Result**, with output, actionable findings and step links; switch to **Chat/Run** for its conversation or execution controls. Switching workflows opens a new-run draft; select **Recent runs** to return to an execution. Reloading the page can restore a saved execution that is still available. If that automatically restored execution no longer exists on the API, the playground clears its saved reference and opens a new-run draft. Connection failures and unavailable executions explicitly selected from history still show an error. Workflow steps support resume/replay with recorded inputs, and related traces stay connected. The inspector displays token breakdowns, model parameters, tool I/O and memory/middleware/guardrail changes. Scorer nodes expose scores and thresholds. Input/output and workflow transition cards are presentation-only and do not change trace counts or exports. Live WebSocket events have an HTTP polling fallback; switch to the waterfall for timing or open trace-wide searchable logs.

Execution uses Console-style cards with status/duration, model and retry settings, token usage, parameters, and expandable instructions and I/O. Scroll inside a card for its recorded fields; scrolling the canvas still pans the flow. **Details** opens the expandable SpanDetailsAI panel with role-based UI/model messages, structured JSON, context, prompt metadata, working-memory and guardrail diffs, workflow/workspace/retrieval details, and error stacks. Recorded attachments and audio (including PCM16) can be previewed. The inspector opens with Input and Output; small JSON results expand automatically, while large results stay bounded. Configuration, telemetry and IDs remain available below. Model requests preview the latest non-system message and keep all request messages accessible. **Agent total**, **This call** and **Context estimate (not usage)** distinguish recorded totals, provider call usage and estimates. Estimates exclude child agents and duplicate model wrappers. These views use local trace data; hosted user/project analytics, evaluations, and prompt-management screens are not required.

The resizable right panel includes schema-based tool tests, a workspace file/skill explorer with event categories and filters, read-only server memory browsing with conversation restoration, and API examples/OpenAPI inspection. JSON inputs use a locally bundled Monaco editor with a plain-text fallback. **Copy link** restores a retained trace and span. Run settings support output token limits, provider forms and structured context. Chat reconnection is opt-in and requires a resumable-stream adapter on the API.

Agents with a configured voice provider expose dictation, reply playback and turn-based STT/TTS conversation. Hono voice routes use the existing agent authentication; no microphone is opened until requested. Forwarded subagent text/reasoning appears inline in chat when enabled in the supervisor event forwarding configuration.

**About this agent/workflow** exposes instructions beside the runner. Workflow outcomes include a copyable result or readable error, and skipped steps are labeled separately. Chat only automatically continues after a user submits an approval decision or client tool result, preserving server step limits. File attachments are converted before the file picker is reset.

The [offline scenario lab](../e2e/fixtures/playground/README.md) includes 23 agents and 15 workflows, with 63 HTTP checks and a documented browser acceptance matrix. Start it with `pnpm --filter @voltagent/e2e playground:smoke`, then run `pnpm --filter @voltagent/e2e playground:test` in another terminal.

Core starts it alongside a configured server provider in development:

```ts
new VoltAgent({
  agents: { assistant },
  server: honoServer({ port: 3141 }),
  playground: { enabled: true, port: 3142 },
});
```

Open `http://localhost:3142`. Use `playground: false` to disable automatic startup. Production and test environments default to disabled. The UI binds to loopback and forwards requests to the existing API without bypassing its authentication.

The optional standalone server API is:

```ts
import { startPlaygroundServer } from "@voltagent/playground";

const playground = await startPlaygroundServer({
  apiUrl: "http://127.0.0.1:3141",
  port: 3142,
});
await playground.stop();
```

The frontend is prebuilt into `dist/client`. TanStack Start and React are build dependencies; running the published server does not require a frontend build. The generated SSR build is used only to prerender the SPA shell and is excluded from the published package.

For development, run `pnpm dev` with an API on port 3141, or set `VOLTAGENT_API_URL`. Use `pnpm build`, `pnpm typecheck`, and `pnpm test` to validate the package. Start/Router versions are pinned together to support the workspace's Vite major.

See [Local Playground](../../website/docs/observability/local-playground.md) for features, lifecycle controls, persistence, and limitations.

Current traces are shown first; **View → Show previous runs** reveals linked historical traces with explicit labels. Input-rejected tools have a validation record without implying that they executed. Invalid request context shows field errors without directing users to a nonexistent trace. Cancelling a suspended workflow persists a cancelled state, with its earlier checkpoint spans retained as historical evidence.

For real OpenAI testing, see [the local playground example](../../examples/with-local-playground/README.md).
