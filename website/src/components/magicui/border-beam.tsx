"use client";

import { cn } from "@site/src/utils/index";
import { MotionStyle, type Transition, motion } from "motion/react";
import type React from "react";

interface BorderBeamProps {
  /**
   * The size of the border beam.
   */
  size?: number;
  /**
   * The duration of the border beam.
   */
  duration?: number;
  /**
   * The delay of the border beam.
   */
  delay?: number;
  /**
   * The color of the border beam from.
   */
  colorFrom?: string;
  /**
   * The color of the border beam to.
   */
  colorTo?: string;
  /**
   * The motion transition of the border beam.
   */
  transition?: Transition;
  /**
   * The class name of the border beam.
   */
  className?: string;
  /**
   * The style of the border beam.
   */
  style?: React.CSSProperties;
  /**
   * Whether to reverse the animation direction.
   */
  reverse?: boolean;
  /**
   * The initial offset position (0-100).
   */
  initialOffset?: number;
  children?: React.ReactNode;
}

export function BorderBeam({
  className,
  size = 50,
  delay = 0,
  duration = 6,
  colorFrom = "#ffaa40",
  colorTo = "#9c40ff",
  transition,
  style,
  reverse = false,
  initialOffset = 0,
  children,
}: BorderBeamProps) {
  return (
    <div className={`relative ${className} rounded-xl`}>
      <div
        className="absolute -inset-[2px] rounded-lg z-0"
        style={{
          background:
            "linear-gradient(45deg, #00d992, #00d992, #00d992, #00d992)",
        }}
      />
    </div>
  );
}
