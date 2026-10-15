import { useRef } from "react";

export function PanelResizer({
  width,
  onChange,
}: { width: number; onChange: (width: number) => void }) {
  const drag = useRef<{ x: number; width: number } | undefined>(undefined);
  const clamp = (value: number) =>
    Math.max(330, Math.min(value, Math.max(330, window.innerWidth - 350)));
  return (
    <div
      role="separator"
      tabIndex={0}
      aria-orientation="vertical"
      aria-label="Resize details and runner panel"
      aria-valuemin={330}
      aria-valuenow={width}
      className="panel-resizer"
      onPointerDown={(event) => {
        drag.current = { x: event.clientX, width };
        event.currentTarget.setPointerCapture(event.pointerId);
        event.preventDefault();
      }}
      onPointerMove={(event) => {
        if (drag.current) onChange(clamp(drag.current.width + drag.current.x - event.clientX));
      }}
      onPointerUp={(event) => {
        drag.current = undefined;
        event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => {
        drag.current = undefined;
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          onChange(clamp(width + (event.key === "ArrowLeft" ? 30 : -30)));
        }
      }}
      onDoubleClick={() => onChange(420)}
    />
  );
}
