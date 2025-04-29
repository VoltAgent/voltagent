---
"@voltagent/core": patch
---

feat: Add OpenAPI (Swagger) Documentation for Core API - #64

- Integrated `@hono/zod-openapi` and `@hono/swagger-ui` to provide interactive API documentation.
- Documented the following core endpoints with request/response schemas, parameters, and examples:
  - `GET /agents`: List all registered agents.
  - `POST /agents/{id}/text`: Generate text response.
  - `POST /agents/{id}/stream`: Stream text response (SSE).
  - `POST /agents/{id}/object`: Generate object response (Note: Requires backend update to fully support JSON Schema input).
  - `POST /agents/{id}/stream-object`: Stream object response (SSE) (Note: Requires backend update to fully support JSON Schema input).
- Added `/doc` endpoint serving the OpenAPI 3.1 specification in JSON format.
- Added `/ui` endpoint serving the interactive Swagger UI.
- Improved API discoverability:
  - Added links to Swagger UI and OpenAPI Spec on the root (`/`) endpoint.
  - Added links to Swagger UI and OpenAPI Spec in the server startup console logs.
- Refactored API schemas and route definitions into `api.routes.ts` for better organization.
- Standardized generation options (like `userId`, `temperature`, `maxTokens`) in the API schema with descriptions, examples, and sensible defaults.
