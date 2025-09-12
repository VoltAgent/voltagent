"use client";

import { motion } from "framer-motion";
import { type RefObject, useEffect, useId, useState } from "react";

import { cn } from "@site/src/utils/index";

// Helper builders for beam paths and length (module scope for stable identity)
const buildCurvedPath = (
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  curv: number,
) => {
  const midX = (startX + endX) / 2;
  const controlY = startY - curv;
  return `M ${startX},${startY} Q ${midX},${controlY} ${endX},${endY}`;
};

const buildAngularPath = (startX: number, startY: number, endX: number, endY: number) => {
  const midX = (startX + endX) / 2;
  const radius = 15;
  const goingRight = endX > startX;
  const goingDown = endY > startY;
  let d = `M ${startX},${startY}`;
  d += ` L ${goingRight ? midX - radius : midX + radius},${startY}`;
  d += ` Q ${midX},${startY} ${midX},${goingDown ? startY + radius : startY - radius}`;
  d += ` L ${midX},${goingDown ? endY - radius : endY + radius}`;
  d += ` Q ${midX},${endY} ${goingRight ? midX + radius : midX - radius},${endY}`;
  d += ` L ${endX},${endY}`;
  return d;
};

const buildSteppedPath = (
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  vOff: number,
) => {
  const vOffset = vOff || (startY < endY ? -30 : 30);
  const midY = startY + vOffset;
  const radius = 10;
  let d = `M ${startX},${startY}`;
  if (vOffset > 0) {
    d += ` L ${startX},${startY + radius}`;
    d += ` Q ${startX},${midY - radius} ${startX + radius},${midY - radius}`;
  } else {
    d += ` L ${startX},${startY - radius}`;
    d += ` Q ${startX},${midY + radius} ${startX + radius},${midY + radius}`;
  }
  d += ` L ${endX > startX ? endX - radius : endX + radius},${midY}`;
  if (endY > midY) {
    d += ` Q ${endX},${midY} ${endX},${midY + radius}`;
    d += ` L ${endX},${endY}`;
  } else {
    d += ` Q ${endX},${midY} ${endX},${midY - radius}`;
    d += ` L ${endX},${endY}`;
  }
  return d;
};

const approximatePathLength = (
  type: "curved" | "angular" | "stepped",
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  vOff: number,
) => {
  if (type === "curved") {
    const dx = endX - startX;
    const dy = endY - startY;
    return Math.sqrt(dx * dx + dy * dy) * 1.2;
  }
  if (type === "angular") {
    const dx = Math.abs(endX - startX);
    const dy = Math.abs(endY - startY);
    return dx + dy + 30;
  }
  const dx = Math.abs(endX - startX);
  const vOffset = Math.abs(vOff || 30);
  return dx + Math.abs(startY - (startY + vOffset)) + Math.abs(startY + vOffset - endY) + 40;
};

export interface AnimatedBeamProps {
  className?: string;
  containerRef: RefObject<HTMLElement | null>; // Container ref
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
  particleDuration?: number; // New prop: duration in seconds before particles stop
  solidBeamAfterRequest?: boolean; // New prop: whether to show a solid beam after particles stop
  pathType?: "curved" | "angular" | "stepped"; // New prop: type of path
  verticalOffset?: number; // New prop: vertical offset for stepped paths
  particleDirection?: "forward" | "backward"; // New prop: direction of particles
  particleCount?: number; // New prop: number of particles to show (1-3)
  showPath?: boolean; // New prop: whether to render the path (base + main)
  showGradient?: boolean; // New prop: whether to render the gradient beam
  animateDraw?: boolean; // New prop: animate gradient beam drawing from start to end
  onPathComputed?: (d: string) => void; // Callback with computed path string
  pathOverride?: string; // If provided, use this path string instead of computing
  drawDirection?: "startToEnd" | "endToStart"; // Future use if we add reverse drawing
}

export const AnimatedBeam: React.FC<AnimatedBeamProps> = ({
  className,
  containerRef,
  fromRef,
  toRef,
  curvature = 80,
  reverse = false,
  duration = Math.random() * 3 + 4,
  delay = 0,
  pathColor = "rgba(0, 217, 146, 0.2)",
  pathWidth = 2,
  pathOpacity = 0.3,
  gradientStartColor = "#00d992",
  gradientStopColor = "#00d992",
  startXOffset = 0,
  startYOffset = 0,
  endXOffset = 0,
  endYOffset = 0,
  showParticles = true,
  particleColor = "#00d992",
  particleSize = 2,
  particleSpeed = 3,
  particleDuration = 0, // Default: 0 means particles show indefinitely
  solidBeamAfterRequest = false, // Default: false means no solid beam after particles
  pathType = "curved", // Default: curved path
  verticalOffset = 0, // Default: 0 vertical offset
  particleDirection = "forward", // Default: forward direction
  particleCount = 1, // Default: 1 particle
  showPath = true,
  showGradient = true,
  animateDraw = false,
  onPathComputed,
  pathOverride,
}) => {
  const id = useId();
  const particleId = useId();
  const [pathD, setPathD] = useState("");
  const [svgDimensions, setSvgDimensions] = useState({ width: 0, height: 0 });
  const [pathLength, setPathLength] = useState(0);
  const [showParticlesState, setShowParticlesState] = useState(showParticles);
  const [showSolidBeam, setShowSolidBeam] = useState(false);

  // (helper functions moved to module scope above)

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

  // Effect to handle particle duration
  useEffect(() => {
    if (particleDuration > 0) {
      const timer = setTimeout(() => {
        setShowParticlesState(false);
        if (solidBeamAfterRequest) {
          setShowSolidBeam(true);
        }
      }, particleDuration * 1000);

      return () => clearTimeout(timer);
    }
  }, [particleDuration, solidBeamAfterRequest]);

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

        let d = pathOverride || "";
        if (!d) {
          switch (pathType) {
            case "curved":
              d = buildCurvedPath(startX, startY, endX, endY, curvature);
              break;
            case "angular":
              d = buildAngularPath(startX, startY, endX, endY);
              break;
            case "stepped":
              d = buildSteppedPath(startX, startY, endX, endY, verticalOffset);
              break;
          }
        }

        setPathD(d);
        if (onPathComputed) onPathComputed(d);

        // Calculate path length for particle or draw animation
        if (showParticles || animateDraw) {
          const approxLength = approximatePathLength(
            pathType,
            startX,
            startY,
            endX,
            endY,
            verticalOffset,
          );
          setPathLength(approxLength);
        }
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
  }, [
    containerRef,
    fromRef,
    toRef,
    curvature,
    startXOffset,
    startYOffset,
    endXOffset,
    endYOffset,
    showParticles,
    animateDraw,
    pathType,
    verticalOffset,
    onPathComputed,
    pathOverride,
  ]);

  return (
    <svg
      fill="none"
      width={svgDimensions.width}
      height={svgDimensions.height}
      xmlns="http://www.w3.org/2000/svg"
      className={cn("pointer-events-none absolute left-0 top-0 transform-gpu", className)}
      viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`}
    >
      <title>Animated beam</title>
      {/* Base path with glow effect */}
      {showPath && (
        <>
          <filter id={`glow-${id}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <path
            d={pathD}
            stroke={pathColor}
            strokeWidth={pathWidth + 4}
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
        </>
      )}

      {/* Solid beam that appears after particles stop */}
      {showSolidBeam && (
        <path
          d={pathD}
          stroke={particleColor}
          strokeWidth={pathWidth}
          strokeOpacity={0.8}
          strokeLinecap="round"
        />
      )}

      {/* Animated gradient path */}
      {showGradient &&
        (animateDraw && pathLength > 0 ? (
          <motion.path
            d={pathD}
            strokeWidth={pathWidth}
            stroke={`url(#${id})`}
            strokeLinecap="round"
            initial={{ strokeDasharray: pathLength, strokeDashoffset: pathLength }}
            animate={{ strokeDashoffset: 0 }}
            transition={{ delay, duration, ease: [0.16, 1, 0.3, 1] }}
          />
        ) : (
          <path
            d={pathD}
            strokeWidth={pathWidth}
            stroke={`url(#${id})`}
            strokeOpacity="1"
            strokeLinecap="round"
          />
        ))}

      {/* Particle animation */}
      {showParticlesState && pathLength > 0 && (
        <>
          {/* First particle (always shown) */}
          <circle r={particleSize} fill={particleColor}>
            <motion.animateMotion
              path={particleDirection === "backward" ? pathD.split("").reverse().join("") : pathD}
              dur={`${particleSpeed}s`}
              repeatCount="indefinite"
              rotate="auto"
            >
              <mpath href={`#${particleId}`} />
            </motion.animateMotion>
          </circle>

          {/* Second particle (shown if particleCount >= 2) */}
          {particleCount >= 2 && (
            <circle r={particleSize * 0.8} fill={particleColor} opacity="0.8">
              <motion.animateMotion
                path={particleDirection === "backward" ? pathD.split("").reverse().join("") : pathD}
                dur={`${particleSpeed * 1.3}s`}
                repeatCount="indefinite"
                rotate="auto"
                begin={`${particleSpeed * 0.3}s`}
              >
                <mpath href={`#${particleId}`} />
              </motion.animateMotion>
            </circle>
          )}

          {/* Third particle (shown if particleCount >= 3) */}
          {particleCount >= 3 && (
            <circle r={particleSize * 0.6} fill={particleColor} opacity="0.6">
              <motion.animateMotion
                path={particleDirection === "backward" ? pathD.split("").reverse().join("") : pathD}
                dur={`${particleSpeed * 0.8}s`}
                repeatCount="indefinite"
                rotate="auto"
                begin={`${particleSpeed * 0.6}s`}
              >
                <mpath href={`#${particleId}`} />
              </motion.animateMotion>
            </circle>
          )}

          {/* Hidden path for particle animation reference */}
          <path id={particleId} d={pathD} opacity="0" />
        </>
      )}

      <defs>
        {/* Gradient definition */}
        <motion.linearGradient
          className="transform-gpu"
          id={id}
          gradientUnits={"userSpaceOnUse"}
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
            ease: [0.16, 1, 0.3, 1], // https://easings.net/#easeOutExpo
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
