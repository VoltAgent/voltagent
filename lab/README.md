# LAB

This folder contains:

- `platform/`: Exact static copy of the original platform frontend (no source modifications).
- `backend/`: Complete backend API interfaces based on `website/docs/api/api-reference.md`.

## Run Platform Copy

```bash
cd lab/platform
npx --yes serve -l 5180
```

## Run Backend Interfaces

```bash
cd lab/backend
npm install
npm start
```

Backend runs on `http://localhost:3141` and exposes:

- HTTP interfaces for Docs, Agents, Tools, Workflows, Memory, Observability, System
- WebSocket interfaces for `/ws`, `/ws/logs`, `/ws/observability`
- OpenAPI contract: `http://localhost:3141/openapi.json`
