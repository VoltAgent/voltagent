import http from "node:http";
import express from "express";
import { WebSocketServer } from "ws";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3141;

app.use(express.json({ limit: "2mb" }));

function ok(data = {}) {
  return { success: true, data };
}

function notImpl(path) {
  return ok({ message: `Interface ready: ${path}` });
}

app.get("/", (_req, res) => {
  res.json(ok({ name: "VoltAgent Lab Backend Interfaces", docs: ["/doc", "/ui"] }));
});

app.get("/doc", (_req, res) => {
  res.json(ok({ openapi: "3.1.0", note: "Use openapi.json for full contract" }));
});

app.get("/ui", (_req, res) => {
  res.type("html").send("<h1>Lab Backend Interfaces</h1><p>Swagger UI placeholder</p>");
});

app.get("/agents", (_req, res) => res.json(ok([{ id: "assistant", name: "Assistant" }])));
app.get("/agents/:id", (req, res) => res.json(ok({ id: req.params.id, name: req.params.id })));
app.post("/agents/:id/text", (req, res) =>
  res.json(ok({ id: req.params.id, mode: "text", input: req.body?.input || null })),
);
app.post("/agents/:id/stream", (req, res) => res.json(notImpl(req.path)));
app.post("/agents/:id/object", (req, res) =>
  res.json(ok({ id: req.params.id, mode: "object", output: {} })),
);
app.post("/agents/:id/stream-object", (req, res) => res.json(notImpl(req.path)));
app.get("/agents/:id/history", (req, res) => res.json(ok({ id: req.params.id, history: [] })));

app.get("/tools", (_req, res) => res.json(ok([{ name: "search" }, { name: "calculator" }])));
app.post("/tools/:name/execute", (req, res) => {
  res.json(ok({ tool: req.params.name, input: req.body?.input ?? null, result: null }));
});

app.get("/workflows", (_req, res) => res.json(ok([{ id: "expense-approval" }])));
app.get("/workflows/:id", (req, res) => res.json(ok({ id: req.params.id })));
app.get("/workflows/executions", (req, res) => res.json(ok({ filters: req.query, items: [] })));
app.post("/workflows/:id/execute", (req, res) => {
  res.json(ok({ id: req.params.id, executionId: "exec_1", input: req.body?.input ?? {} }));
});
app.post("/workflows/:id/stream", (req, res) => res.json(notImpl(req.path)));
app.post("/workflows/:id/executions/:executionId/suspend", (req, res) => {
  res.json(
    ok({ workflowId: req.params.id, executionId: req.params.executionId, status: "suspended" }),
  );
});
app.post("/workflows/:id/executions/:executionId/resume", (req, res) => {
  res.json(
    ok({ workflowId: req.params.id, executionId: req.params.executionId, status: "running" }),
  );
});
app.get("/workflows/:id/executions/:executionId/state", (req, res) => {
  res.json(ok({ workflowId: req.params.id, executionId: req.params.executionId, state: {} }));
});

app.get("/api/memory/conversations", (_req, res) => res.json(ok([])));
app.get("/api/memory/conversations/:conversationId", (req, res) =>
  res.json(ok({ id: req.params.conversationId })),
);
app.get("/api/memory/conversations/:conversationId/messages", (req, res) => {
  res.json(ok({ conversationId: req.params.conversationId, messages: [] }));
});
app.get("/api/memory/conversations/:conversationId/working-memory", (req, res) => {
  res.json(ok({ conversationId: req.params.conversationId, workingMemory: {} }));
});
app.post("/api/memory/save-messages", (req, res) =>
  res.json(ok({ saved: true, payload: req.body })),
);
app.post("/api/memory/conversations", (req, res) =>
  res.status(201).json(ok({ created: true, payload: req.body })),
);
app.patch("/api/memory/conversations/:conversationId", (req, res) => {
  res.json(ok({ updated: true, conversationId: req.params.conversationId, payload: req.body }));
});
app.delete("/api/memory/conversations/:conversationId", (req, res) => {
  res.json(ok({ deleted: true, conversationId: req.params.conversationId }));
});
app.post("/api/memory/conversations/:conversationId/clone", (req, res) => {
  res.json(ok({ clonedFrom: req.params.conversationId, newId: "conversation_clone_1" }));
});
app.post("/api/memory/conversations/:conversationId/working-memory", (req, res) => {
  res.json(ok({ conversationId: req.params.conversationId, updated: true, payload: req.body }));
});
app.post("/api/memory/messages/delete", (req, res) =>
  res.json(ok({ deleted: true, payload: req.body })),
);
app.get("/api/memory/search", (req, res) => res.json(ok({ query: req.query, results: [] })));

app.get("/api/logs", (req, res) => res.json(ok({ query: req.query, logs: [] })));
app.get("/observability/status", (_req, res) => res.json(ok({ enabled: true })));
app.get("/observability/traces", (req, res) => res.json(ok({ query: req.query, items: [] })));
app.get("/observability/traces/:traceId", (req, res) =>
  res.json(ok({ traceId: req.params.traceId })),
);
app.get("/observability/spans/:spanId", (req, res) => res.json(ok({ spanId: req.params.spanId })));
app.get("/observability/traces/:traceId/logs", (req, res) =>
  res.json(ok({ traceId: req.params.traceId, logs: [] })),
);
app.get("/observability/spans/:spanId/logs", (req, res) =>
  res.json(ok({ spanId: req.params.spanId, logs: [] })),
);
app.get("/observability/logs", (req, res) => res.json(ok({ query: req.query, logs: [] })));
app.post("/setup-observability", (req, res) =>
  res.json(ok({ configured: true, payload: req.body })),
);

app.get("/updates", (_req, res) => res.json(ok({ available: false, version: null })));
app.post("/updates", (_req, res) =>
  res.json(ok({ started: false, reason: "No update package configured in lab mode" })),
);

app.get("/openapi.json", (_req, res) => {
  res.sendFile(new URL("./openapi.json", import.meta.url).pathname);
});

wss.on("connection", (socket, request) => {
  const url = request.url || "/ws";
  socket.send(JSON.stringify(ok({ type: "connected", path: url })));

  const timer = setInterval(() => {
    if (socket.readyState === socket.OPEN) {
      socket.send(
        JSON.stringify(
          ok({
            type: url.includes("observability")
              ? "OBSERVABILITY_EVENT"
              : url.includes("logs")
                ? "LOG_EVENT"
                : "ECHO",
            timestamp: new Date().toISOString(),
          }),
        ),
      );
    }
  }, 5000);

  socket.on("message", (msg) => {
    if (socket.readyState === socket.OPEN) {
      socket.send(JSON.stringify(ok({ type: "echo", payload: String(msg) })));
    }
  });

  socket.on("close", () => clearInterval(timer));
});

server.listen(PORT, () => {
  console.log(`LAB backend interfaces running on http://localhost:${PORT}`);
});
