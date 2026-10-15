# Local playground with a real OpenAI model

Four agents and one workflow exercise real model calls through the Hono API, AI SDK chat protocol, and local playground. The model is `gpt-4o-mini` by default. Tools use a small fictional help center and local previews; they do not send email, issue refunds, or modify external systems.

From the repository root:

```sh
pnpm install
pnpm --filter @voltagent/server-hono... build
pnpm --filter @voltagent/voice build
pnpm --filter voltagent-example-local-playground dev
```

Open **http://localhost:3152** (API: **http://localhost:3151**). These ports let this example coexist with the offline lab on 3141/3142.

Set `OPENAI_API_KEY` in your shell or copy `.env.example` to `.env` and set it there. Inside this repository, the example can also read the key from `examples/base/.env`; it does not copy or print it. Precedence is process environment → this example’s `.env` → base `.env`. Only `OPENAI_API_KEY`, `OPENAI_MODEL`, `API_PORT`, and `PLAYGROUND_PORT` are read. Credentials stay on the server. Choose another model with `OPENAI_MODEL`; it must support tools and structured output.

## Try it

| Scenario                       | Input / action                                                                                               | What to inspect                                                                                                                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Support with knowledge search  | “How do I reset my password?”                                                                                | Real model → `search_help` → answer citing `reset-password`; tool input/output, usage and model timing. Set `language` to `tr` in Run settings for Turkish.                                         |
| Memory explorer                | After a support conversation, open **Memory**, choose your user and conversation, then **Continue in chat**. | Server-stored messages, steps and current working-memory scopes; reload preserves the selected identity.                                                                                            |
| Voice                          | In the support agent, open **Voice**. Dictate a draft, read a reply, or start a voice conversation.          | OpenAI transcription + TTS. Conversations take turns; microphone permission is only requested when starting recording. **End voice conversation** stops recording/playback. Provider charges apply. |
| API / JSON / trace links       | Open **API**, copy an example; select a trace/span and **Copy link**. Use workflow JSON mode.                | Local OpenAPI schema, shareable local trace selection, Monaco diagnostics and a resizable panel.                                                                                                    |
| Refund preview with approval   | “Create a refund preview for ticket T-100, amount 25 USD.”                                                   | Approve or deny in chat. Approval only creates a local preview. Denial should not request approval again.                                                                                           |
| Browser tool result            | “Read my browser context.”                                                                                   | Submit `{"theme":"dark","locale":"tr-TR"}` or decline. The client provides the result; the server has no execute function for this tool.                                                            |
| Conversation and summarization | “Remember my favorite drink is jasmine tea.” Then “What is my favorite drink?”                               | Successful summary span, summary text, reduced model context and retained preference. The very low threshold is for demonstration.                                                                  |
| Ticket triage                  | Run the default workflow input.                                                                              | Actual structured model output, then a suspended review step. Resume with `{"approved":true}` or false. Cancel also works while suspended.                                                          |
| History / replay               | Select a completed triage run; select a top-level step and use Resume / replay.                              | Original input, replay scope, linked runs. Previous runs are available with **View → Show previous runs**; their historical statuses stay intact.                                                   |
| Validation                     | Set support Context to `{"language":"invalid"}`.                                                             | Field-specific request error before a trace starts. Fix it in Run settings and retry.                                                                                                               |

Use **Steps** to search and select an operation. **View → Fit whole map** shows the full topology and **View → Readable view** restores readable cards. Scroll pans the canvas. Select a node for details or replay; pending approvals stay in chat and suspended workflows offer **Resume workflow**. **Result → Run again** prepares a fresh request, **Compare runs** compares it with a baseline, and **Save test** adds optional checks.

## Run the real integration checks

Leave the example running, then use another terminal:

```sh
pnpm --filter voltagent-example-local-playground test:live
```

Ten checks cover tool execution/citation, invalid context, approval/denial, client result/decline, actual summary generation with preference recall, and structured workflow approval/decline/cancellation. These make real OpenAI requests using the running server’s key. The test process itself does not load credentials. Set `TEST_API_URL` if you change the API port. Each conversation gets a fresh ID; generated traces remain inspectable in Recent runs.

The approval and browser agents use `prepareStep` to request their tool once per user turn, then disable tools after a result. The model still generates the arguments and final response. Model responses can vary; checks assert tool/protocol behavior and structured outcomes rather than exact prose. Offline failure, race, parallel, guardrail, step-limit and stop-stream coverage remains in `packages/e2e/fixtures/playground`.

Memory and workflow checkpoints use in-memory storage in this example. They are lost when the process restarts. Browser settings remain local. For persistence across restarts, configure a durable memory adapter. Use `playground: false` or change `playground.port` in `src/index.ts` to control the UI server independently.

The optional `pnpm test:voice` check generates a short synthetic sentence with the configured voice provider, transcribes those bytes, and checks the round trip. It makes real provider calls without opening or recording a microphone. Browser microphone permissions and speaker hardware still require a manual check.
