import {
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import type React from "react";

type CalloutType = "info" | "success" | "warning";

const ICONS: Record<CalloutType, React.ReactNode> = {
  info: <InformationCircleIcon className="h-5 w-5" />,
  success: <ShieldCheckIcon className="h-5 w-5" />,
  warning: <ExclamationTriangleIcon className="h-5 w-5" />,
};

const WRAPPER_STYLES: Record<CalloutType, string> = {
  info: "border border-solid border-emerald-400/30 bg-gradient-to-br from-emerald-500/15 via-slate-950/80 to-emerald-500/10 text-emerald-50",
  success:
    "border border-solid border-lime-400/30 bg-gradient-to-br from-lime-500/20 via-slate-950/80 to-lime-400/10 text-lime-50",
  warning:
    "border border-solid border-amber-400/30 bg-gradient-to-br from-amber-500/20 via-slate-950/80 to-amber-400/10 text-amber-50",
};

const ICON_STYLES: Record<CalloutType, string> = {
  info: "text-emerald-200",
  success: "text-lime-200",
  warning: "text-amber-100",
};

interface CalloutProps {
  title?: string;
  type?: CalloutType;
  children: React.ReactNode;
}

export function Callout({ title, type = "info", children }: CalloutProps) {
  return (
    <div
      className={clsx(
        "rounded-2xl p-5 sm:p-6 shadow-lg shadow-black/10 backdrop-blur",
        "flex flex-col gap-4",
        WRAPPER_STYLES[type],
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={clsx(
            "inline-flex h-8 w-8 items-center justify-center text-base",
            ICON_STYLES[type],
          )}
        >
          {ICONS[type]}
        </span>
        {title ? (
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-white/80">
            {title}
          </span>
        ) : null}
      </div>
      <div className="text-sm leading-relaxed text-white/80 [&_p]:mb-0">{children}</div>
    </div>
  );
}

export function Info(props: Omit<CalloutProps, "type">) {
  return <Callout type="info" {...props} />;
}

export function Success(props: Omit<CalloutProps, "type">) {
  return <Callout type="success" {...props} />;
}

export function Warning(props: Omit<CalloutProps, "type">) {
  return <Callout type="warning" {...props} />;
}
