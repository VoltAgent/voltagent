---
"@voltagent/sdk": patch
---

Honor caller abort signals in `VoltAgentCoreAPI.sendRequest`, preventing dispatch of pre-aborted requests and cancelling response-body reads. Preserve caller abort reasons before response headers and native fetch behavior during body reads, while keeping SDK request timeouts classified as HTTP 408. Fixes #1443.
