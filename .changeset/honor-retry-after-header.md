---
"@voltagent/core": patch
---

Honor the provider's `Retry-After` header on retried model calls. The retry loop in `executeWithModelFallback` previously always used local exponential backoff capped at 10 seconds, regardless of what the server asked for; this caused concurrent agents under shared 429/503 contention to converge their retry windows. The delay now uses `Retry-After` (delta-seconds or HTTP-date, RFC 7231) as a floor, keeps the exponential floor as a backpressure baseline, and caps at 5 minutes for safety.
