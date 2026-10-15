import type { Viewport, XYPosition } from "@xyflow/react";
import type { Trace } from "./api";
import type { GraphNode } from "./graph";
import { spanStatus, traceRoot } from "./trace-presentation";

/** Start with the operation that needs attention, preserving explicit span links. */
export function defaultGraphFocus(trace: Trace, nodes: GraphNode[]): string | undefined {
  const own = [...nodes].reverse().filter((node) => node.data.span?.traceId === trace.traceId);
  const root = traceRoot(trace);
  const state = root && spanStatus(root);
  if (state === "suspended")
    return (
      nodes.find((node) => node.data.kind === "pause")?.id ??
      own.find((node) => node.data.status === "suspended")?.id
    );
  if (state === "error") return own.find((node) => node.data.status === "error")?.id;
  if (state === "running") return own.find((node) => node.data.status === "running")?.id;
  return root?.spanId ?? nodes[0]?.id;
}

/** Matches the responsive card body plus header/footer, with a small measurement buffer. */
export function spanCardHeight(canvasHeight: number): number {
  return Math.min(430, Math.max(188, canvasHeight - 115));
}

/** Reveal a new step with the smallest pan possible, preserving the user's zoom. */
export function followViewport(
  viewport: Viewport,
  position: XYPosition,
  size: { width: number; height: number },
): Viewport {
  const left = viewport.x + position.x * viewport.zoom;
  const top = viewport.y + position.y * viewport.zoom;
  const right = left + 350 * viewport.zoom;
  const bottom = top + spanCardHeight(size.height) * viewport.zoom;
  const leftLimit = Math.min(40, Math.max(8, (size.width - 350 * viewport.zoom) / 2));
  const rightLimit = Math.max(leftLimit, size.width - leftLimit);
  const bottomLimit = Math.max(250, size.height - 20);
  return {
    zoom: viewport.zoom,
    x:
      viewport.x +
      (left < leftLimit ? leftLimit - left : right > rightLimit ? rightLimit - right : 0),
    y: viewport.y + (top < 95 ? 95 - top : bottom > bottomLimit ? bottomLimit - bottom : 0),
  };
}

/** Keep the first steps readable and center all lanes when the run fits vertically. */
export function initialTraceViewport(
  nodes: Array<{ id: string; position: XYPosition; measured?: { height?: number } }>,
  size: { width: number; height: number },
  _compact: boolean,
  selectedSpanId?: string,
  frameWholeRun = false,
): Viewport {
  if (!nodes.length) return { x: 40, y: 65, zoom: 1 };
  const cardWidth = 350;
  const cardHeight = spanCardHeight(size.height);
  const width =
    Math.max(...nodes.map((node) => node.position.x + cardWidth)) -
    Math.min(...nodes.map((node) => node.position.x));
  const fitZoom = Math.min(1, (size.width - 80) / width);
  const zoom = fitZoom >= 0.85 ? fitZoom : 1;
  const focusId = frameWholeRun && fitZoom >= 0.85 ? undefined : selectedSpanId;
  const first = nodes.find((node) => node.id === focusId) ?? nodes[0];
  const firstY = focusId ? first.position.y : Math.min(...nodes.map((node) => node.position.y));
  const lastY = focusId
    ? first.position.y + cardHeight
    : Math.max(...nodes.map((node) => node.position.y + (node.measured?.height ?? cardHeight)));
  return {
    x:
      (focusId
        ? Math.max(40, Math.min(cardWidth + 100, (size.width - cardWidth * zoom) / 2))
        : 40) -
      first.position.x * zoom,
    y: Math.max(65, Math.min(150, (size.height - (lastY - firstY) * zoom) / 2)) - firstY * zoom,
    zoom,
  };
}

/** Fit concise summaries without letting labels become miniature text. Long flows remain pannable. */
export function overviewViewport(
  nodes: Array<{ position: XYPosition }>,
  size: { width: number; height: number },
): Viewport {
  if (!nodes.length) return { x: 20, y: 60, zoom: 1 };
  const left = Math.min(...nodes.map((node) => node.position.x));
  const top = Math.min(...nodes.map((node) => node.position.y));
  const width = Math.max(...nodes.map((node) => node.position.x)) - left + 180;
  const spread = Math.max(...nodes.map((node) => node.position.y)) - top;
  const zoom = Math.max(
    0.55,
    Math.min(1, (size.width - 40) / width, (size.height - 210) / Math.max(1, spread)),
  );
  return {
    x: Math.max(20, (size.width - width * zoom) / 2) - left * zoom,
    y: 70 - top * zoom,
    zoom,
  };
}
