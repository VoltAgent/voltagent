---
title: Local Playground
sidebar_label: Local Playground
---

The local playground runs alongside your VoltAgent API. Open `http://localhost:3142` to chat with agents, run workflows, and inspect their execution on a node canvas. No VoltOps account or login is required.

## Start with your project

```ts
import { Agent, VoltAgent } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";

const assistant = new Agent({
  name: "Assistant",
  instructions: "Help the user with their questions.",
  model: "openai/gpt-4o-mini",
});

const app = new VoltAgent({
  agents: { assistant },
  server: honoServer({ port: 3141 }),
  playground: { enabled: true, port: 3142 },
});
```

Your model provider still needs its normal credentials. The playground itself needs no account, API key, or separate frontend command. Its prebuilt TanStack Start application is included through `@voltagent/playground`, a dependency of core.

When `playground` is omitted, it starts automatically with a Node server provider unless `NODE_ENV` is `production` or `test`. `playground: true` or a configuration object enables it explicitly, including in production. `playground: false` or `{ enabled: false }` disables it. A configuration object without `enabled` enables it.

The API and playground use separate listeners:

| Option                         | Default                              | Behavior                                                     |
| ------------------------------ | ------------------------------------ | ------------------------------------------------------------ |
| `server: honoServer({ port })` | `3141`                               | Agent and workflow API                                       |
| `playground.port`              | `3142`                               | Playground HTTP listener, bound to `127.0.0.1`               |
| `playground.apiUrl`            | `http://127.0.0.1:<actual API port>` | Override for a custom API host, base path, or HTTPS endpoint |

Set different playground ports when running multiple projects. If its port is occupied, VoltAgent logs a warning and keeps the API running. `port: 0` selects an available port; read the resulting URL with `getPlaygroundUrl()` after startup.

Serverless providers do not start a playground listener. The playground needs a running `server` provider.

## Explore agents and workflows

Select an agent or workflow from the sidebar. **Structure** shows the components registered in code; **Execution** shows recorded spans and updates while a run is active. Scroll with your mouse or trackpad to pan the canvas; pinch or use the zoom controls to zoom. You can also drag detailed cards or use **Overview** to orient yourself in the flow. Node positions are saved in this browser.

Execution steps progress from left to right. The default flow highlights model calls, tools, workflow steps, guardrails, and subagents. Memory bookkeeping and model-loop wrappers are grouped under their containing operation: open its **internal spans** in the inspector, or open **View → Show internal spans** to display the complete trace. Failed, suspended, and cancelled operations remain visible, including internal operations. Custom spans stay visible too.

Dashed connections describe time order, not proven data or control dependencies. Overlapping operations and explicit parallel workflow branches occupy separate lanes; subagent execution opens on its own lane. Explicit resume/replay links use labelled green connections. Existing visible nodes stay in place as new spans arrive. The original span identities, parents, and attributes remain available in the inspector.

The run summary shows the selected execution's outcome, duration, time, tool calls when present, and token usage when reported. When the runtime records reaching `maxSteps`, **Step limit reached · 2/2** shows the actual model-step count and configured limit; click it to inspect those values. **Metrics** contains the span count; **Metrics → Longest step** opens the longest visible leaf operation; **Go to error** opens a recorded failure. A completed run with a failed intermediate attempt remains **Completed**. When recorded retry/fallback metadata links a failed attempt to a later successful attempt, the summary explains the recovery and links to both attempts. Other errors remain available through **Inspect recorded error**. Missing token usage is omitted from the summary and remains unreported in the inspector. Linked ancestor executions are excluded from this summary.

An agent waiting for a tool decision shows **Awaiting approval** or **Awaiting client result** in the summary, root card, history, inspector, and waterfall. **Chat** returns to the pending tool controls; **Result → Review tool request** opens them too. Approve/deny or submit/decline the result to continue; a new message cannot bypass that pending action. These states supplement completed HTTP-request spans with this browser’s latest conversation messages. Original telemetry is unchanged; external clients without this browser history cannot reconstruct pending actions from a completed span alone.

Loop iterations and foreach items have one-based labels. Skipped steps show the recorded reason; race winners, bail exits, guardrail decisions, memory changes and workspace operations are explained when the corresponding evidence is available. The run summary also links directly to recorded race winners and skipped steps. Raw attribute indices retain their original zero-based values.

Use **Steps** in the toolbar to open a searchable list of names, input/query previews, model call numbers, span IDs and explanations. Filter by status or enable **Include internal spans**. Selecting a result focuses it, opens details and closes the list. Cards show type-specific facts and expandable payload previews by default. Model cards use the recorded model name as their title, with the request sequence shown separately as **Model · Call N**; retry attempt numbers remain separate. Agent cards include models, available tools, token usage, instructions and input/output. Tool cards include their purpose, scopes, arguments, results and parameter schema. Workflow cards expose inputs, outputs, step type, branch/iteration information and retries. Memory, retrieval, embedding, vector, guardrail, middleware, scorer, summary and delegation cards show their corresponding operations, decisions, metrics and payloads when recorded. Completed cards use a discreet status icon; failures, cancellation and waiting states keep explicit labels. **View → Extra metadata** adds secondary metadata; essential content no longer depends on this setting. The inspector always exposes the full record. A provider call without its own usage explicitly says so; aggregate agent tokens are never attributed to an individual call. Parent cards can collapse nested spans, retaining outcome counts. **View → Expand all steps** restores them.

Live following reveals newly arriving steps without changing zoom. Panning, zooming or dragging pauses it; **View → Follow latest step** resumes. Completed executions open at their start; running, failed and suspended executions focus the operation that needs attention. **Overview** shows concise summaries with readable labels instead of miniaturizing full cards. Select a summary or a result from **Steps** to open the full card at readable zoom; **Back to cards** returns to the detailed flow. Large overviews retain a minimum scale and remain pannable. **View → Focus step** restores readable framing. Input/output and lifecycle presentation cards are optional under **View → Input / output & lifecycle cards**. All layout, logs, detailed-card and previous-run controls are in **View**. The minimap helps navigate long flows. Cancelled workflows label saved suspended steps as **Paused checkpoint** in the flow, Steps and inspector; step details explain that the workflow is no longer waiting to resume.

On completion, automatic following frames the run from its start; manual navigation takes priority.

- **Agents:** Stream responses, attach files supported by the model, inspect tool calls and reasoning, approve or deny tool requests, and submit JSON results for client tools. Stop interrupts the current chat stream.
- **Run settings:** Override model, instructions, temperature, step limit, and `maxOutputTokens`. Provider options have guided fields for OpenAI, Anthropic, and Google plus a complete JSON editor. Context supports string, number, boolean, object, array, and null values through a form or JSON. Use **Apply conversation IDs** after editing user/conversation IDs to load that conversation. These IDs are forwarded to the agent’s memory. Context validation still happens in the runtime.
- **Workflows:** Generate example input from the schema, run with streaming events, suspend, cancel, resume with data, or replay from a selected step. Replay input comes from that step’s recorded input; when unavailable, enter it explicitly. Resume controls show the reported schema and a sample. Replay previews the selected top-level step and following steps, and offers a recorded-input versus edited-input comparison. To replay a nested step, choose its top-level container. An optional workflow state override is available. Suspension takes effect at the workflow's supported checkpoints. The last execution can reconnect after a page reload while it is still available in the runtime.
- **Inspect:** Console-style execution cards show status, duration, model/token usage, retry settings, tool parameters, memory operations, and guardrail decisions when recorded. Expand instructions or input/output directly on a card, or choose **Details** for the full detail panel. Opening details keeps the runner mounted. Recent runs come from the local observability API.

If a workflow execution has advanced beyond the selected checkpoint, **Historical checkpoint** identifies the recorded state and links to **Open current run**. The recorded checkpoint remains read-only; resume/replay controls target the current execution state.

Selecting a recent run also selects its conversation/user or workflow execution. Chat history is restored from the agent’s memory (up to 100 messages), with browser history as a fallback. Changing runs is disabled while the active runner is executing. **New run** opens an editable workflow form and the Structure view. The previous result remains available through **Back to result**, including its original read-only **Run input**; editing the draft does not change or start an execution. Run the form to start a new execution. A suspended execution stays suspended when preparing or starting a new run; return to it through **Back to result** before submitting, or through the run history afterward. Active execution must finish or be suspended/cancelled before preparing another run. Low-level events and the execution ID are under **Execution details**. Select a workflow step and choose **Resume workflow** or **Replay from this step** in its inspector to open controls for its source execution. **View → Show previous runs** reveals explicitly linked resume/replay traces with historical status labels; unrelated executions stay separate. Unavailable ancestor traces are reported.

Use the **View → Layout** selector to compare span durations and overlapping operations. **View → Show logs** opens trace-wide logs, including linked workflow traces, with severity and text filters. Select **Inspect span** from a log to open its node. Structure cards show configured descriptions, instructions, schemas and component settings, including retrievers, guardrails, embedding/vector components and working memory, without execution-status overlays. Structure reflects the current code configuration; open Execution or select a historical run to see recorded outcomes. Restoring a workflow result selects its execution view.

Recent runs show a compact request title, timestamp with seconds, execution status, duration and tool count. These metrics help distinguish repeated requests without repeating similar response text. Full titles, result previews, timestamps and trace IDs remain available on hover. Related calls stay grouped without a separate group-count header. Use **Result → Compare runs → Organize & export** to name or pin a run; names and pins stay in this browser. Pinned groups keep their related history together above the day groups. Search includes names and result previews. Workflow inputs with a message, prompt or query use that text as the title; full timestamps and trace IDs are available on hover. Each related group keeps its newest run visible and puts older calls under **earlier runs**; selecting an older trace reveals it automatically. Empty workflow input uses a short recorded result or workflow name instead of an empty JSON label. Open **Filter runs** to search this history and filter by outcome; related calls group by user/conversation, and workflow executions group only through explicit resume/replay links. In chat, expand a recorded tool call and choose **Inspect in flow** to select its exact span. **Show tool call in chat** returns to and highlights that call. Related log rows are highlighted; **Selected step only** filters the log panel to that span. Waterfall always includes all recorded spans, including internals.

### Review, inspect and repeat

The right panel keeps **Chat/Run**, **Result**, and **Tests** visible. **Compare runs** and **Save test** are secondary actions on the selected result. Selecting a recent run opens **Result**, including when its chat history is unavailable. Newly finished runs open their result unless you are already inspecting a step or another panel. **Result** prioritizes recorded output and the next action: **Run again** after completion, or continuation controls when input is needed. Error/retry/guardrail/quality findings appear only when recorded; successful runs do not show empty diagnostic sections. It distinguishes execution completion from quality checks and explains missing output explicitly. Pending approvals and suspended workflows link back to the runner.

The **Steps** button opens the single searchable step list, including when the graph is focused on one operation. Select a step to focus its node and open details. Switching between **Structure** and **Execution** keeps the selected result available; structure continues to represent current code, not the historical code version.

**Run again** prepares a fresh run with recorded input and supported overrides. Review or edit it before sending. Its previous result becomes the comparison baseline automatically. This creates a new execution with fresh user/conversation IDs; it does not rewind memory, external services, or code. Saved test cases add repeatable checks to the same flow. The most recent 50 run-to-baseline associations remain in this browser across reloads.

### Compare and export a run

Open **Result → Compare runs**. The comparison stays beside the canvas so you can return to a step without a floating menu. Choose a baseline from the loaded history to compare status, duration, tokens and tool counts, followed by input, output and recorded settings diffs. **Recorded effective settings** shows the values captured by the selected execution and its model calls, separate from the next request’s editable settings. Unreported agent defaults are not inferred.

**Organize & export → Prepare debug JSON** collects the selected trace, loaded linked ancestors and their logs. Use **Save debug JSON** to download it or **Copy debug JSON** to copy it. This stays local; the file can contain recorded prompts, outputs and context. If logs are unavailable, the export includes explicit fetch errors instead of silently claiming a complete bundle. Browser-only waiting annotations are exported separately from original span attributes. Trace retention and redaction still apply.

### Save and repeat test cases

Choose **Result → Save test** on a run. Give it a name, review or edit **Case input · JSON** and **Run settings**, then save it. Cases are scoped to their agent or workflow under **Tests**.

**Prepare run** fills a fresh runner without starting a request. Agents provide **Run test case**; workflows use **Run workflow**. Each prepared case uses fresh user/conversation IDs, preserving its input, context and supported overrides. Agent cases retain their complete saved request on retry and retain message history for continuations without server memory. Workflow cases start a new execution, rather than resuming a checkpoint. They use workflow context and identity options, not agent model overrides.

When the new trace finishes, **Result** shows its outcome and checks. Open **Compare runs** for the saved baseline comparison: status, duration, token/tool counts, input, output and recorded settings. The baseline result is stored with the case, so comparison does not depend on trace retention. Editing a case preserves its baseline; save a new case from a later run to establish another reference. Comparisons show changes, not automatic answer-quality grades. Optional **Success checks** assert the expected execution status, a case-sensitive substring in the recorded output, and comma-separated tool names. A tool check means a call was recorded, including a failed call; it does not assert successful execution. Missing output or a missing root span is **Unavailable**, and unfinished or waiting executions are **Pending**. A technically completed execution can still fail its checks. Existing cases without checks remain valid. Passing checks start collapsed; failed, pending or unavailable checks stay expanded.

For a request sent in the current browser session, cases capture the actual input and overrides. Older runs are reconstructed from available root trace fields; the editor identifies this and leaves unreported settings on current runtime defaults. A recorded model ID alone is not treated as a resolvable model override. Review settings for older cases before running. Server memory, external services, code versions, approval decisions and suspended workflow state are not snapshotted. Cases and baseline payloads stay in browser storage, scoped to the playground's origin.

### SpanDetailsAI

The local inspector provides the Console's detailed span views using recorded local data. Use **Expand details panel** for more space. Cards keep a bounded height so expanded content does not overlap the next lane: scroll inside a card to read more, and scroll the canvas to pan the flow.

- **Summary:** Input and Output start open. Small JSON results expand automatically; larger or deeply nested results remain collapsible and paginated. Model calls show their outcome and latest non-system request message first, with the full request available under **All request messages**. The separate **Input** and **Output** tabs provide focused views. **Configuration & telemetry** contains instructions, context, model/provider settings, retries, schemas, prompt metadata, memory configuration, decisions, workflow state, workspace/retrieval metadata, IDs and todos. Errors remain visible above the payloads; recorded stacks are available in telemetry.
- **More details → Messages:** Compare recorded UI, model, and LLM messages by role. Tool calls show their input, output and status, with call IDs behind a disclosure. AI SDK text/JSON result envelopes show their contained value; copying the message preserves the original record. Reasoning is collapsible. Image/file attachments and recorded audio can be previewed, including PCM16 wrapped for browser playback. Message representations identical to Input or Output are omitted; distinct UI/model representations remain available. Historical tool messages are read-only; approvals remain in the active chat.
- **Usage:** **Run total** labels usage recorded on the root operation, **Agent total** labels an agent’s recorded usage, and **This call** labels the selected provider request. Missing call usage is explicitly unreported, never copied from the agent total. Inspect input, output, total, cached, and reasoning tokens. Cached/reasoning breakdowns are not added to the total again. **Context estimate (not usage)** shows recorded system/message/tool estimates separately from provider usage. Agent estimates aggregate their own model requests, excluding child agents and duplicate model-loop wrappers; retries and repeated context count per request.
- **Changes:** Switch working memory, middleware and guardrail payloads between initial, final, and diff views. Middleware cards show direction and whether the payload changed. Live scorer cards show recorded scores, thresholds, pass/fail decisions, sampling and error metadata; a low score is separate from an execution failure.
- **More details → Attributes, Events, Logs:** Search attribute names/values and expand nested JSON. Events and logs retain their recorded metadata. Trace/span IDs can be copied; linked spans in the loaded trace can be inspected.

Sections appear only when the runtime records the corresponding metadata. Existing trace retention, redaction, and truncation still apply; the inspector cannot reconstruct omitted messages or payloads. Prompt metadata is displayed locally, while cloud prompt management, user/project analytics, and hosted evaluations remain Console features.

The right panel keeps **Chat / Run** as its primary action. Open **Utilities** for:

- **Tools:** Choose a registered tool, enter schema-based input or raw JSON and optional context, and execute it independently of the agent. The server validates inputs. This endpoint invokes the server tool directly, outside the agent loop and its approval flow. Provider/client tools without a server execute function return an error. Shared tool names resolve to the first registered implementation, matching the API.
- **Memory:** Search users, page through their conversations, inspect messages and recorded steps, and read current conversation/user working memory. **Continue in chat** restores the selected user and conversation. These are read-only views of your configured server memory adapter; browser chat storage is separate.
- **API:** Copy curl, fetch, or framework SDK examples for the selected entity. Switch streaming on/off for HTTP examples and browse registered OpenAPI endpoints. Sample inputs come from schemas; validate required values before sending.
- **Workspace:** Browse configured workspace directories, read files, and search/filter skills by name, tag and active state. The events tab groups filesystem, search, sandbox and skill operations with counters, recorded result previews and file/skill shortcuts. These views use the existing agent workspace endpoints; workspace editing and shell execution are not part of the explorer.

Drag the divider beside the right panel to resize it, or focus the divider and use the arrow keys. Its width is saved in this browser. Workflow input, resume data, replay input and schema editor JSON mode use a locally bundled Monaco editor with syntax/schema diagnostics, completion and formatting. **Plain text** switches back to a textarea. Server validation remains authoritative.

Execution views optionally include input/output and workflow lifecycle cards under **View**. By default, a continued or replayed run shows a collapsed link to its previous run and technical metadata; duration is labelled **this segment** and excludes previous model calls and waiting time. These are display-only: they do not add spans, usage or records to trace exports. Workflow step cards expose their type, branch/attempt information when recorded, with resume/replay controls in the selected step’s inspector. Tool plans and memory/vector metadata are available in detailed cards.

**Copy link** preserves the selected agent/workflow, trace and inspected span. Opening it restores the matching conversation or workflow execution. Links only work while the target local server retains that trace; they do not publish it. Chat renders image attachments and forwarded subagent text/reasoning in separate collapsible sections. To stream child text, include `text-delta` and `reasoning-delta` in the supervisor’s `supervisorConfig.fullStreamEventForwarding.types`; include `finish`, `error` and `abort` for explicit stream outcomes. Keep any tool/guardrail event types you already forward. The runtime’s default forwarding policy remains unchanged.

### Voice

For agents configured with `voice`, Chat exposes **Dictate**, **Read last reply** and **Start voice conversation**. Dictation inserts a draft for review. A voice conversation records one utterance, detects a pause, transcribes it, sends it to the agent, plays the reply, then listens again. Tool approval/client actions pause the voice session until resolved in chat. **End voice conversation** releases the microphone and stops playback; it does not cancel an agent run already submitted.

This is turn-based STT/TTS, not a full-duplex realtime audio connection. Your browser must support microphone recording and grant permission. Audio/text is processed by the agent’s configured voice provider; provider credentials stay on the server and normal provider charges apply. Each utterance is limited to 60 seconds, speech text to 10,000 characters, and uploads to 20 MB. Voice controls remain hidden when no voice provider is configured.

The Hono API adds `GET /agents/:id/voice/listener`, `GET /agents/:id/voice/voices`, `POST /agents/:id/voice/listen` (multipart `audio` plus optional JSON-string `options`) and `POST /agents/:id/voice/speak` (`{ text, options? }`, MP3 response). These use the same authentication middleware as agent routes. Custom server providers can use the server-core voice handlers to expose matching routes.

Enable **Reconnect streams** in run settings to reconnect an active chat after reload. This requires a resumable-stream adapter on the server and both user and conversation IDs. Without an adapter, the API falls back to ordinary streaming. With resumable streaming enabled, stopping/disconnecting the browser stream does not necessarily cancel generation on the server. See [Resumable Streams](../agents/resumable-streaming.md) for server setup.

The canvas visualizes and executes the agents and workflows defined in your project. Editing a node's position does not change the workflow definition. This version does not author workflows or edit project source files.

## Stop and restart independently

```ts
await app.ready;
await app.startServer(); // Wait for API and automatic playground startup.

console.log(app.getPlaygroundUrl());
await app.stopPlayground(); // The API remains running.
await app.startPlayground(); // Uses the configured playground port.

await app.shutdown(); // Stops both listeners and other runtime resources.
```

`startPlayground()` also allows manual startup after `playground: false`. `stopServer()` stops the playground along with the API. Stopping the playground disconnects browser streams; it does not cancel an already running workflow. Use the workflow's **Cancel** control to cancel execution.

## Storage and API access

Run settings, chat messages, pending conversation actions, compact-card preference, workflow input, the last execution ID, and node positions are stored in browser local storage. Clear the site's browser data to remove these preferences and local chat copies. Trace and log retention follows the observability adapter configured in your VoltAgent process; the default in-memory adapter loses them when the process exits.

The playground proxies requests to the configured API and streams chat/workflow responses. It receives live span/log events over the local `/ws/observability` endpoint and periodically reconciles traces through HTTP. If WebSocket connectivity fails, HTTP polling continues and the live connection retries. Custom reverse proxies must forward WebSocket upgrades to use live events. It does not require a hosted Console connection. Your agents can still call external model providers and tools, and existing VoltOps exporters keep their configured behavior.

The UI binds only to loopback and checks request Host/Origin. It has no login of its own and does not bypass authentication configured on your API. The initial UI targets local APIs without authentication; protected APIs retain their authentication requirements.

Memory mutation/administration, hosted evaluation management, feedback submission, cloud triggers, Ask AI, user/project analytics and other account-dependent Console screens remain outside this local playground. Local scorer traces and read-only memory browsing are available without an account. See the [VoltOps Platform](./developer-console.md) for those features.

## Develop the playground in this repository

```bash
pnpm --filter @voltagent/playground dev
```

After rebuilding, an open playground checks for a newer UI bundle and offers **Reload playground**. It never reloads automatically during a run; save unsent drafts before reloading. **Refresh API data** only refetches API data. Tabs opened before the version-check feature was added still need one manual browser reload.

Run the VoltAgent API separately with `playground: false` so the frontend development server can use port `3142`. Set `VOLTAGENT_API_URL` when that API is not at `http://127.0.0.1:3141`.

For a deterministic demo without provider credentials, build core and its dependencies, then run:

```bash
pnpm --filter @voltagent/core... build
pnpm --filter @voltagent/server-hono... build
pnpm --filter @voltagent/e2e playground:smoke
```

The fixture provides **23 agents and 15 workflows**, using mock model responses and real local API endpoints. Each entry describes how to try it in **About this agent/workflow**. Agents cover streaming/reasoning, sequential and parallel tools, approval/denial, client results, tool and provider errors, fallback/retry, guardrails, memory, typed context, workspace/skills, retrieval, delegation, attachments, stopping, step limits, summarization and live scoring (pass/fail/error). Workflows cover branching, iteration, races, shared state, schema failures, retry, sleep, suspend/resume, replay, nested workflows, structured agent output, early exit and abort.

With the fixture running, run its repeatable HTTP checks in another terminal:

```bash
pnpm --filter @voltagent/e2e playground:test
pnpm --filter @voltagent/e2e playground:typecheck
```

The [scenario matrix](https://github.com/VoltAgent/voltagent/blob/next/packages/e2e/fixtures/playground/README.md) lists inputs, expected outcomes and coverage limits. Intentional failures are part of the demo. These offline checks do not validate external provider quality, MCP services, voice hardware, hosted features or durable storage.

Workflow results appear in a copyable result card. Failed runs show their recorded error; skipped steps have a separate **Skipped** state. A chat that reaches its step limit can finish after tool calls without a text reply. It does not automatically start another run: automatic continuation follows your approval decision or submitted client tool result.

### Real-model example

The [`with-local-playground` example](https://github.com/VoltAgent/voltagent/tree/next/examples/with-local-playground) runs four agents and a human-review workflow with OpenAI, on API port 3151 and playground port 3152. It includes a live integration test for tools, approval, client results, summarization, and workflow controls. Its support agent also configures OpenAI voice for dictation, speech playback and turn-based conversation.

Invalid context is rejected before execution and reports the field to correct in Run settings. Tool input validation appears as a separate rejected-call record, without claiming the tool executed. Suspended workflows can be cancelled permanently; their checkpoint spans remain historical, while the current execution status comes from persisted state. Cancelled executions cannot resume.
