"use client";

import { motion } from "framer-motion";
import { type RefObject, useEffect, useId, useState } from "react";

// Helper builders for beam paths and length
const buildCurvedPath = (
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  curv: number,
) => {
  const midX = (startX + endX) / 2;
  const controlY = Math.min(startY, endY) - Math.abs(curv);
  return `M ${startX},${startY} Q ${midX},${controlY} ${endX},${endY}`;
};

const approximatePathLength = (startX: number, startY: number, endX: number, endY: number) => {
  const dx = endX - startX;
  const dy = endY - startY;
  return Math.sqrt(dx * dx + dy * dy) * 1.2;
};

export interface AnimatedBeamProps {
  className?: string;
  containerRef: RefObject<HTMLElement | null>;
  fromRef: RefObject<HTMLElement | null>;
  toRef: RefObject<HTMLElement | null>;
  curvature?: number;
  reverse?: boolean;
  pathColor?: string;
  pathWidth?: number;
  pathOpacity?: number;
  gradientStartColor?: string;
  gradientStopColor?: string;
  delay?: number;
  duration?: number;
  startXOffset?: number;
  startYOffset?: number;
  endXOffset?: number;
  endYOffset?: number;
  showParticles?: boolean;
  particleColor?: string;
  particleSize?: number;
  particleSpeed?: number;
  particleCount?: number;
}

export const AnimatedBeam: React.FC<AnimatedBeamProps> = ({
  className,
  containerRef,
  fromRef,
  toRef,
  curvature = 0,
  reverse = false,
  duration = 4,
  delay = 0,
  pathColor = "rgba(100, 100, 100, 0.2)",
  pathWidth = 2,
  pathOpacity = 0.3,
  gradientStartColor = "#10b981",
  gradientStopColor = "#10b981",
  startXOffset = 0,
  startYOffset = 0,
  endXOffset = 0,
  endYOffset = 0,
  showParticles = true,
  particleColor = "#10b981",
  particleSize = 3,
  particleSpeed = 2,
  particleCount = 2,
}) => {
  const id = useId();
  const particleId = useId();
  const [pathD, setPathD] = useState("");
  const [svgDimensions, setSvgDimensions] = useState({ width: 0, height: 0 });
  const [pathLength, setPathLength] = useState(0);

  // Calculate the gradient coordinates based on the reverse prop
  const gradientCoordinates = reverse
    ? {
        x1: ["90%", "-10%"],
        x2: ["100%", "0%"],
        y1: ["0%", "0%"],
        y2: ["0%", "0%"],
      }
    : {
        x1: ["10%", "110%"],
        x2: ["0%", "100%"],
        y1: ["0%", "0%"],
        y2: ["0%", "0%"],
      };

  useEffect(() => {
    const updatePath = () => {
      if (containerRef.current && fromRef.current && toRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const rectA = fromRef.current.getBoundingClientRect();
        const rectB = toRef.current.getBoundingClientRect();

        const svgWidth = containerRect.width;
        const svgHeight = containerRect.height;
        setSvgDimensions({ width: svgWidth, height: svgHeight });

        const startX = rectA.left - containerRect.left + rectA.width / 2 + startXOffset;
        const startY = rectA.top - containerRect.top + rectA.height / 2 + startYOffset;
        const endX = rectB.left - containerRect.left + rectB.width / 2 + endXOffset;
        const endY = rectB.top - containerRect.top + rectB.height / 2 + endYOffset;

        const d = buildCurvedPath(startX, startY, endX, endY, curvature);
        setPathD(d);

        // Calculate path length for particle animation
        const approxLength = approximatePathLength(startX, startY, endX, endY);
        setPathLength(approxLength);
      }
    };

    // Initialize ResizeObserver
    const resizeObserver = new ResizeObserver(() => {
      updatePath();
    });

    // Observe the container element
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Call the updatePath initially to set the initial path
    updatePath();

    // Clean up the observer on component unmount
    return () => {
      resizeObserver.disconnect();
    };
  }, [containerRef, fromRef, toRef, curvature, startXOffset, startYOffset, endXOffset, endYOffset]);

  return (
    <svg
      fill="none"
      width={svgDimensions.width}
      height={svgDimensions.height}
      xmlns="http://www.w3.org/2000/svg"
      className={`pointer-events-none absolute left-0 top-0 transform-gpu ${className || ""}`}
      viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`}
    >
      <title>Animated beam</title>

      {/* Glow filter */}
      <defs>
        <filter id={`glow-${id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Base path with glow effect */}
      <path
        d={pathD}
        stroke={pathColor}
        strokeWidth={pathWidth + 6}
        strokeOpacity={0.1}
        strokeLinecap="round"
        filter={`url(#glow-${id})`}
      />

      {/* Main path */}
      <path
        d={pathD}
        stroke={pathColor}
        strokeWidth={pathWidth}
        strokeOpacity={pathOpacity}
        strokeLinecap="round"
      />

      {/* Animated gradient path */}
      <path
        d={pathD}
        strokeWidth={pathWidth}
        stroke={`url(#${id})`}
        strokeOpacity="1"
        strokeLinecap="round"
      />

      {/* Particle animation */}
      {showParticles && pathLength > 0 && (
        <>
          {/* First particle */}
          <circle r={particleSize} fill={particleColor}>
            <animateMotion dur={`${particleSpeed}s`} repeatCount="indefinite" path={pathD} />
          </circle>

          {/* Second particle */}
          {particleCount >= 2 && (
            <circle r={particleSize * 0.7} fill={particleColor} opacity="0.7">
              <animateMotion
                dur={`${particleSpeed * 1.3}s`}
                repeatCount="indefinite"
                path={pathD}
                begin={`${particleSpeed * 0.4}s`}
              />
            </circle>
          )}

          {/* Third particle */}
          {particleCount >= 3 && (
            <circle r={particleSize * 0.5} fill={particleColor} opacity="0.5">
              <animateMotion
                dur={`${particleSpeed * 0.9}s`}
                repeatCount="indefinite"
                path={pathD}
                begin={`${particleSpeed * 0.7}s`}
              />
            </circle>
          )}

          {/* Hidden path for reference */}
          <path id={particleId} d={pathD} opacity="0" />
        </>
      )}

      <defs>
        {/* Gradient definition */}
        <motion.linearGradient
          className="transform-gpu"
          id={id}
          gradientUnits="userSpaceOnUse"
          initial={{
            x1: "0%",
            x2: "0%",
            y1: "0%",
            y2: "0%",
          }}
          animate={{
            x1: gradientCoordinates.x1,
            x2: gradientCoordinates.x2,
            y1: gradientCoordinates.y1,
            y2: gradientCoordinates.y2,
          }}
          transition={{
            delay,
            duration,
            ease: [0.16, 1, 0.3, 1],
            repeat: Number.POSITIVE_INFINITY,
            repeatDelay: 0,
          }}
        >
          <stop stopColor={gradientStartColor} stopOpacity="0" />
          <stop stopColor={gradientStartColor} />
          <stop offset="32.5%" stopColor={gradientStopColor} />
          <stop offset="100%" stopColor={gradientStopColor} stopOpacity="0" />
        </motion.linearGradient>
      </defs>
    </svg>
  );
};
