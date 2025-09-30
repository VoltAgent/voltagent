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
  info: "border border-solid border-emerald-400/20 bg-transparent text-emerald-100",
  success: "border border-solid border-lime-400/20 bg-transparent text-lime-100",
  warning: "border border-solid border-amber-400/25 bg-transparent text-amber-100",
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
        "rounded-2xl p-3 sm:p-4 shadow-lg shadow-black/10",
        "flex flex-col gap-3 sm:gap-4",
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
          <span className="text-xs font-semibold uppercase tracking-[0.35em] text-white/80">
            {title}
          </span>
        ) : null}
      </div>
      <div className="text-sm leading-relaxed text-white/85 [&_ul]:space-y-2 [&_ul]:mb-0 [&_li]:leading-relaxed [&_p]:mb-0 [&_p]:leading-[1.7]">
        {children}
      </div>
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
