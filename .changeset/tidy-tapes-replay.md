---
"@voltagent/evals": minor
---

feat(evals): add runner tapes that record native `ExperimentRunner` output before scoring and replay it through new scorers without calling the target again

`createRecordingRunner` and `createReplayRunner` plug into the existing `runExperiment` pipeline. Results are keyed by item ID and original index, bound to a caller-declared manifest, and stored in a process-local store (`createMemoryTapeStore`) or a durable private directory (`createDirectoryTapeStore`) that claims each slot with fsync before the target runs and fails closed on corrupt files. `inspectTape` reports outcome counts and indices without exposing content.

Also fixes `runExperiment` treating falsy thrown values (`undefined`, `null`, `0`, `false`) from a runner or scorer as success.
