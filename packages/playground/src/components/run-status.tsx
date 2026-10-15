import { Check, CircleStop, LoaderCircle, Pause, SkipForward, X } from "lucide-react";
import { type RunStatus, statusLabels } from "../lib/trace-presentation";

const icons = {
  approval: Pause,
  "client-result": Pause,
  success: Check,
  error: X,
  running: LoaderCircle,
  suspended: Pause,
  cancelled: CircleStop,
  skipped: SkipForward,
} satisfies Record<RunStatus, typeof Check>;

export function StatusIcon({ status, size = 13 }: { status: RunStatus; size?: number }) {
  const Icon = icons[status];
  return <Icon size={size} className={status === "running" ? "spin" : undefined} aria-hidden />;
}

export function StatusBadge({ status, label }: { status: RunStatus; label?: string }) {
  return (
    <span className={`node-state ${status}`}>
      <StatusIcon status={status} />
      {label ?? statusLabels[status]}
    </span>
  );
}
