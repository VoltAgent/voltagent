# Local playground scenario lab

23 agents and 15 workflows exercise local VoltAgent behavior through the real Hono API and the bundled playground. Model responses are deterministic AI SDK V4 mock providers; tools, middleware, memory, guardrails, workflows and tracing run normally. No provider credentials or database are needed.

From the repository root:

```sh
pnpm --filter @voltagent/core... build
pnpm --filter @voltagent/server-hono... build
pnpm --filter @voltagent/e2e playground:smoke
```

Open <http://localhost:3142>. The API uses port 3141. Override with `PLAYGROUND_PORT` and `PLAYGROUND_API_PORT`. The fixture is deliberately in memory: restarting it clears server history and files. **New conversation** / **New execution** clears the selected browser run; it does not delete server history.

With that fixture running, use another terminal:

```sh
pnpm --filter @voltagent/e2e playground:typecheck
pnpm --filter @voltagent/e2e playground:test
```

Set `PLAYGROUND_TEST_URL=http://localhost:<api-port>` for a different API port. The tests check the scenario catalog before executing requests. Run against this disposable demo, not an application with production tools. Tests add history, exercise intentional failures, and leave the server running.

## Agent scenarios

Choose an agent in the sidebar. Its instructions are available in **About this agent** and the empty chat. Unless noted, send any message. Use a new conversation to compare variants.

| #   | Agent ID              | Try / expected result                                                                                                                                                                               |
| --- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01  | `demo-streaming`      | Markdown, reasoning, cached/reasoning usage and completed model spans.                                                                                                                              |
| 02  | `travel-assistant`    | Weather followed by route planning; two sequential tool calls.                                                                                                                                      |
| 03  | `demo-parallel-tools` | Weather and events overlap, then the model combines results.                                                                                                                                        |
| 04  | `approval-demo`       | Approve and deny a fictional reservation in separate conversations. Only approval executes the tool.                                                                                                |
| 05  | `demo-client-tool`    | Expand **Provide a client-side result**, submit `{"theme":"dark"}`; also try **Decline**.                                                                                                           |
| 06  | `demo-tool-error`     | Tool throws; model recovers. Completed run retains a failed tool span.                                                                                                                              |
| 07  | `demo-invalid-tool`   | Invalid city argument is rejected before tool execution.                                                                                                                                            |
| 08  | `demo-fallback`       | Primary fails, fallback succeeds; both attempts remain inspectable.                                                                                                                                 |
| 09  | `demo-retry`          | First provider attempt fails, second succeeds. Each request resets the demo counter.                                                                                                                |
| 10  | `demo-provider-error` | Intentional terminal failure. Inspect the trace and try **Retry last message**.                                                                                                                     |
| 11  | `demo-guardrails`     | `safe` redacts `123456`; `block` fails before the model.                                                                                                                                            |
| 12  | `demo-memory`         | Send `remember tea`, then `remember coffee`; inspect working-memory changes and reload to restore history.                                                                                          |
| 13  | `demo-context`        | In Run settings, set context to `{"language":"tr"}` or `{"language":"en"}`; another value fails validation.                                                                                         |
| 14  | `demo-workspace`      | Read `/notes.txt`, list the travel skill, browse Workspace files/skills.                                                                                                                            |
| 15  | `demo-retrieval`      | Ask about ports. Inspect `retriever.search` and knowledge-base metadata.                                                                                                                            |
| 16  | `demo-supervisor`     | Supervisor delegates to Demo researcher; inspect the nested agent spans and live child text in chat. This demo explicitly enables text/reasoning/finish event forwarding.                           |
| 17  | `demo-stop-stream`    | Press **Stop response** while text arrives. Partial text stays, the composer becomes available, and model spans finish as cancelled.                                                                |
| 18  | `demo-payloads`       | Inspect false, zero, empty string, null, 65 nested rows and literal HTML in tool output.                                                                                                            |
| 19  | `demo-middleware`     | `safe` normalizes input and creates a custom span/log; `abort` fails before the model. Output middleware also transforms the final runtime result; it does not rewrite already emitted text deltas. |
| 20  | `demo-step-limit`     | Exactly two tool calls, then no text reply. The summary shows **Step limit reached · 2/2**. A second message starts one new run; neither turn automatically restarts the loop.                      |
| 21  | `demo-attachments`    | Attach a small text file/image. The mock reports attachment count; this checks transport, not vision quality.                                                                                       |
| 22  | `demo-summary`        | Two messages in one conversation generate a successful `agent.summary` span. Inspect its actual summary text and reload history.                                                                    |

| 23 | `demo-evaluation` | Send `pass`, `fail`, or `error`. Inspect score 1/0, threshold 0.8, threshold outcome, and intentional scorer errors independently of the completed agent response. |

## Workflow scenarios

Select **Use schema example** for the default input, or enter `{}` to exercise schema defaults. **About this workflow** describes the variants. Successful runs show a copyable result; intentional failures show an error.

| #   | Workflow ID          | Variants / expected result                                                                                                                                                                                          |
| --- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01  | `trip-plan`          | Default completes. `{"approval":true}` suspends at `review-plan`; resume with `{"approved":true}` or `false`. Replay `create-itinerary` with `{"city":"Ankara"}`. Empty city fails input validation.                |
| 02  | `demo-w-parallel`    | Two branches overlap and join; default total is 10.                                                                                                                                                                 |
| 03  | `demo-w-race`        | Cache wins immediately; the slower branch receives cancellation and is shown as skipped.                                                                                                                            |
| 04  | `demo-w-conditional` | Value 2 executes; 0 skips. Skipped is distinct from completed.                                                                                                                                                      |
| 05  | `demo-w-branch`      | Route `left`, `right`, `both`, `none`; only matching results appear; unmatched branches have a Skipped span with “Branch condition not met”.                                                                        |
| 06  | `demo-w-foreach`     | `[1,2,3]` becomes `[2,4,6]` with concurrency 2; empty items produce `[]`.                                                                                                                                           |
| 07  | `demo-w-loop`        | doWhile and doUntil produce 5; repeated step instances remain visible.                                                                                                                                              |
| 08  | `demo-w-state`       | Tap preserves input and writes shared state; map returns original 2, doubled 4 and a constant.                                                                                                                      |
| 09  | `demo-w-retry`       | Two failures then success with attempts=3.                                                                                                                                                                          |
| 10  | `demo-w-failure`     | Mode `throw` fails execution; `schema` fails output validation; `ok` succeeds.                                                                                                                                      |
| 11  | `demo-w-control`     | Start the 5-second sleep, suspend/resume, or cancel while running. Set waitMs=10 for a quick success. Suspended runs can also be cancelled; their stored state becomes cancelled and subsequent resume is rejected. |
| 12  | `demo-w-guardrail`   | Default trims input and redacts digits to `Code ***`; text `block` fails.                                                                                                                                           |
| 13  | `demo-w-nested`      | Child doubles to 4, parent increments to 5; independent execution IDs. Nested suspend/resume is not modeled by this example.                                                                                        |
| 14  | `demo-w-agent`       | Agent produces validated structured classification, then workflow adds routed=true.                                                                                                                                 |
| 15  | `demo-w-exit`        | Mode `complete` runs all steps, `bail` returns early, `abort` cancels; later steps must not run for bail/abort.                                                                                                     |

## What is verified

The HTTP suite covers 60 cases, including all catalog entries and their principal variants. It checks outputs, intentional failures, SSE behavior, tool order, overlapping execution, approvals, client results, context validation, memory history, summary/retriever/subagent/custom spans, usage, resume, replay, cancellation and early exits. It uses a unique conversation per test.

Browser acceptance covers each catalog entry plus approval/denial, client-result submission, history reload, upload, stop, workflow failure, skip, suspend/resume, replay and cancellation. The pure UI helper and rendering tests live in `packages/playground`; workflow regression tests live in `packages/core/src/workflow/scenario-regressions.spec.ts`.

`packages/playground/src/components/chat-continuation.spec.ts` exercises the real chat hook and transport with streamed tool-only responses. It checks that two user turns create exactly two requests, and that approval, denial, client result and client error each allow just one continuation. After rebuilding the bundled playground, reload already-open browser tabs to load the new client code; **Refresh API data** in the header refreshes API data only. Clients with the build-manifest feature offer a manual reload when a newer build is detected.

### Visual status checks

Check the eight shared execution states separately from functional acceptance. Use the stop-stream agent for running/cancelled, provider failure for failed, the race workflow for completed/skipped, and the approval workflow for waiting to resume. Inspect flow cards, selected cards, history, the minimap, the inspector and the waterfall.

| State                  | Visual cues                                                       |
| ---------------------- | ----------------------------------------------------------------- |
| Awaiting approval      | Amber, pause icon, tool name and Open chat action                 |
| Awaiting client result | Amber, pause icon, result/decline controls                        |
| Completed              | Neutral, check icon                                               |
| Failed                 | Red, cross icon                                                   |
| Running                | Blue, spinner (static with reduced motion)                        |
| Waiting to resume      | Amber, pause icon                                                 |
| Cancelled              | Purple, stop icon; cancellation reason is separate from a failure |
| Skipped                | Gray, skip icon, dashed card and timeline bar                     |

State labels remain visible when scrolling card contents. Cards use a thin, uniform border and muted pastel status colors. Selection uses a separate neutral outline and preserves the status color. These checks cover shared status presentation, not a visual audit of every possible payload or viewport.

This is an offline local-runtime coverage matrix, not exhaustive provider/integration certification. Real provider quality and billing, external MCP/A2A services, voice hardware, durable database restarts, hosted VoltOps features and resumable chat adapters require their own integration environments. No such external services are simulated as passing here.

### Execution UX acceptance

- Approval/client result: summary, root, history and waterfall show a pending action after the HTTP stream ends; continue once, then return to Completed. Completed tool-only responses never auto-loop.
- Fallback and model/workflow retries: show the successful recovery and keep failed attempts inspectable; terminal failures must not be called recovered.
- Loop/foreach: one-based iteration/item labels; search and focus the exact instance.
- Race/condition: show the recorded skip reason. Identify the race winner only when recorded timing and skipped-branch evidence support it.
- Collapse a parent, check its hidden outcome counts, then search for a hidden failure to expand and focus it. Test both detailed and compact cards.
- History: filter status and search, group conversation calls and explicitly linked workflow runs. Compare two runs without changing the selected run.
- Export: prepare the bundle, save/copy JSON, retain raw attributes, and report unavailable logs in the file.
- Resume/replay: inspect the resume schema, enter data, preview the top-level replay scope and input diff, then verify the final result and linked history.
- Rebuild with a tab open: show an update notice without reloading or interrupting its run. A fresh page must not show a false update notice.

The execution toolbar spans the workspace; detailed controls remain on demand. Include a 1280×720 window in visual acceptance, as well as the user’s normal window size.

### Layout and run-form checks

- Check the default compact cards and **Detailed cards** at normal desktop width and 1280×720. Names, waiting/error states and race/skip reasons must remain readable.
- Structure shows code configuration without execution-status overlays. Restored workflow results open Execution; **New run** opens Structure and a draft form.
- Edit a new workflow draft, use **Back to result**, and confirm the recorded input/output is unchanged. Return to **New run** and confirm the draft is retained. Invalid JSON must not change the previous run's status.
- Verify **Find step**, **Filter runs**, **View options**, **Compare runs & export**, **Timing**, and **Execution details** remain accessible on demand.

The real-provider companion is [`examples/with-local-playground`](../../../../examples/with-local-playground/README.md), with OpenAI calls and ten live integration checks.
