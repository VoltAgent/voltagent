import type React from "react";

interface AdmonitionProps {
  type?: "tip" | "note" | "warning" | "info";
  title?: string;
  children: React.ReactNode;
}

const admonitionStyles = {
  tip: {
    border: "border-emerald-400/20",
    bg: "bg-emerald-400/5",
    icon: "text-emerald-400",
    iconPath: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  note: {
    border: "border-blue-400/20",
    bg: "bg-blue-400/5",
    icon: "text-blue-400",
    iconPath: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  warning: {
    border: "border-yellow-400/20",
    bg: "bg-yellow-400/5",
    icon: "text-yellow-400",
    iconPath:
      "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
  },
  info: {
    border: "border-gray-400/20",
    bg: "bg-gray-400/5",
    icon: "text-gray-400",
    iconPath: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
};

export default function Admonition({
  type = "note",
  title,
  children,
}: AdmonitionProps): JSX.Element {
  const style = admonitionStyles[type];
  const defaultTitles = { tip: "TIP", note: "NOTE", warning: "WARNING", info: "INFO" };

  return (
    <div className={`my-4 rounded-lg border border-solid ${style.border} ${style.bg} p-4`}>
      <div className="flex items-start gap-3">
        <svg
          className={`w-5 h-5 flex-shrink-0 mt-0.5 ${style.icon}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={style.iconPath} />
        </svg>
        <div className="flex-1">
          {title !== undefined && (
            <div className={`text-[10px] font-bold uppercase tracking-wide mb-2 ${style.icon}`}>
              {title || defaultTitles[type]}
            </div>
          )}
          <div className="text-sm text-[var(--ifm-font-color-base)] leading-relaxed [&_p]:!mb-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
