import React from "react";

interface DotPatternProps {
  className?: string;
  dotColor?: string;
  dotSize?: number;
  spacing?: number;
}

export const DotPattern: React.FC<DotPatternProps> = ({
  className = "",
  dotColor = "#D1D5DB",
  dotSize = 1,
  spacing = 20,
}) => {
  const uniqueId = React.useId().replace(/:/g, "");
  const patternId = `dots-${uniqueId}`;
  const gradientId = `gradient-${uniqueId}`;
  const maskId = `mask-${uniqueId}`;

  return (
    <div className={`fixed pointer-events-none ${className}`}>
      <svg
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: "fixed", top: 0, left: 0, zIndex: -1 }}
      >
        <title>Decorative dot pattern background</title>
        <defs>
          <radialGradient id={gradientId} cx="50%" cy="50%" r="70%" fx="50%" fy="50%">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="50%" stopColor="white" stopOpacity="0.5" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>

          <pattern
            id={patternId}
            x="0"
            y="0"
            width={spacing}
            height={spacing}
            patternUnits="userSpaceOnUse"
          >
            <circle cx={spacing / 2} cy={spacing / 2} r={dotSize} fill={dotColor} />
          </pattern>

          <mask id={maskId}>
            <rect width="100%" height="100%" fill={`url(#${gradientId})`} />
          </mask>
        </defs>

        <rect
          width="100%"
          height="100%"
          fill={`url(#${patternId})`}
          style={{ opacity: 0.15 }}
          mask={`url(#${maskId})`}
        />
      </svg>
    </div>
  );
};
