import { BoltIcon, CheckIcon, CpuChipIcon, SignalIcon } from "@heroicons/react/24/outline";
import { StarIcon } from "@heroicons/react/24/solid";
import React, { memo, useRef, useState, useEffect, useCallback } from "react";
import { AnimatedBeam } from "./AnimatedBeam";

// Global styles for all animations - defined once to prevent re-renders
const GlobalAnimationStyles = () => (
  <style>{`
    @property --angle {
      syntax: '<angle>';
      initial-value: 0deg;
      inherits: false;
    }
    @keyframes rotate {
      from { --angle: 0deg; }
      to { --angle: 360deg; }
    }
    @keyframes borderRotate {
      0% { background-position: 0% 50%; }
      100% { background-position: 200% 50%; }
    }
    @keyframes spinStar {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes discordPulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }
  `}</style>
);

interface NodeProps {
  isActive?: boolean;
  isCompleted?: boolean;
}

// Animated border component with rotating light beam
const AnimatedBorder: React.FC<{ isActive: boolean; isDashed?: boolean }> = ({
  isActive,
  isDashed = false,
}) => {
  if (!isActive) return null;

  return (
    <>
      {/* Rotating gradient border */}
      <div
        className="absolute inset-0 rounded-lg"
        style={{
          padding: "2px",
          background:
            "linear-gradient(90deg, transparent, rgba(6, 182, 212, 0.8), rgba(20, 184, 166, 0.8), transparent)",
          backgroundSize: "200% 100%",
          animation: "borderRotate 2s linear infinite",
          mask: isDashed
            ? "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)"
            : "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          maskComposite: "exclude",
          WebkitMask: isDashed
            ? "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)"
            : "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
        }}
      />
      {/* Conic gradient rotating effect */}
      <div
        className="absolute inset-[-2px] rounded-lg overflow-hidden"
        style={{
          background:
            "conic-gradient(from var(--angle), transparent 0%, transparent 60%, rgba(6, 182, 212, 0.8) 70%, rgba(20, 184, 166, 1) 80%, rgba(6, 182, 212, 0.8) 90%, transparent 100%)",
          animation: "rotate 2s linear infinite",
          mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          maskComposite: "exclude",
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          padding: "3px",
        }}
      />
      {/* Glow effect */}
      <div
        className="absolute inset-0 rounded-lg opacity-30 blur-sm"
        style={{
          background:
            "conic-gradient(from var(--angle), transparent 0%, transparent 70%, rgba(6, 182, 212, 0.4) 75%, rgba(20, 184, 166, 0.5) 80%, rgba(6, 182, 212, 0.4) 85%, transparent 90%, transparent 100%)",
          animation: "rotate 2s linear infinite",
        }}
      />
    </>
  );
};

// GitHub Star Node - Circle style
const GitHubStarNode = memo(
  React.forwardRef<HTMLDivElement, NodeProps>(({ isActive, isCompleted }, ref) => {
    return (
      <div ref={ref} className="relative flex-shrink-0 flex flex-col items-center">
        <div
          className={`
        relative w-14 h-14 rounded-full border-2 bg-[#0d0e10]
        flex items-center justify-center
        transition-all duration-500
        ${isActive || isCompleted ? "border-yellow-400/70" : "border-gray-700/30"}
      `}
        >
          <div className="flex items-center gap-0.5">
            <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            <StarIcon
              className={`w-3.5 h-3.5 transition-all duration-300 ${
                isActive || isCompleted ? "text-yellow-400" : "text-gray-400"
              }`}
              style={isActive ? { animation: "spinStar 1s ease-in-out" } : undefined}
            />
          </div>
        </div>
        <div className="text-gray-500 text-[12px] mt-1.5 text-center">External Event</div>
      </div>
    );
  }),
);

GitHubStarNode.displayName = "GitHubStarNode";

// Step Node - Compact (Gray theme like GitHub button)
const StepNode = memo(
  React.forwardRef<
    HTMLDivElement,
    NodeProps & {
      step: number;
      title: string;
      subtitle: string;
      icon: React.ReactNode;
    }
  >(({ isActive, isCompleted, step, title, subtitle, icon }, ref) => {
    return (
      <div ref={ref} className="flex flex-col items-center flex-shrink-0">
        {/* Card with animated border */}
        <div className="relative w-[110px]">
          <AnimatedBorder isActive={!!isActive} />
          <div
            className={`
          relative border-2 rounded-lg p-2.5 bg-[#0d0e10] h-full
          transition-all duration-500
          ${
            isActive
              ? "border-transparent"
              : isCompleted
                ? "border-cyan-500/70"
                : "border-gray-700/30"
          }
        `}
          >
            {/* Step Number Badge - Inside top-left */}
            <div className="absolute top-1.5 left-1.5 z-10">
              <div
                className={`
              w-4 h-4 rounded-full flex items-center justify-center
              transition-all duration-500
              ${
                isActive || isCompleted
                  ? "bg-cyan-500/20 border border-cyan-500/50"
                  : "bg-gray-600/80"
              }
            `}
              >
                {isCompleted ? (
                  <CheckIcon className="w-2.5 h-2.5 text-cyan-400" strokeWidth={3} />
                ) : (
                  <span
                    className={`text-[8px] font-bold ${isActive ? "text-cyan-400" : "text-white"}`}
                  >
                    {step}
                  </span>
                )}
              </div>
            </div>

            <div className="flex justify-center my-1">
              <div
                className={`transition-colors duration-300 ${
                  isActive || isCompleted ? "text-cyan-400" : "text-gray-400"
                }`}
              >
                {icon}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-200 transition-colors duration-300">
                {title}
              </div>
            </div>
          </div>
        </div>
        {/* Subtitle - completely outside the card and animated border */}
        <div className="text-gray-500 text-[12px] mt-2 text-center">{subtitle}</div>
      </div>
    );
  }),
);

// Discord Node - Circle style
const DiscordNode = memo(
  React.forwardRef<HTMLDivElement, NodeProps>(({ isActive, isCompleted }, ref) => {
    return (
      <div ref={ref} className="relative flex-shrink-0 flex flex-col items-center">
        <div
          className={`
        relative w-14 h-14 rounded-full border-2 bg-[#0d0e10]
        flex items-center justify-center
        transition-all duration-500
        ${isActive || isCompleted ? "border-[#5865F2]/70" : "border-gray-700/30"}
      `}
        >
          <svg
            className={`w-6 h-6 transition-all duration-300 ${
              isActive || isCompleted ? "text-[#5865F2]" : "text-gray-400"
            }`}
            fill="currentColor"
            viewBox="0 0 24 24"
            style={isActive ? { animation: "discordPulse 1s ease-in-out" } : undefined}
          >
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
          </svg>
        </div>
        <div className="text-gray-500 text-[12px] mt-1.5 text-center">Received Message</div>
      </div>
    );
  }),
);

DiscordNode.displayName = "DiscordNode";

StepNode.displayName = "StepNode";

export const WorkflowDiagramFlow: React.FC = () => {
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const githubRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const agentRef = useRef<HTMLDivElement>(null);
  const discordRef = useRef<HTMLDivElement>(null);
  const actionRef = useRef<HTMLDivElement>(null);

  // Animation phase: 0=idle, 1=github→trigger, 2=trigger→agent, 3=agent→discord, 4=discord→action, 5=complete
  const [phase, setPhase] = useState(0);

  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  const clearTimeouts = useCallback(() => {
    timeoutsRef.current.forEach((t) => clearTimeout(t));
    timeoutsRef.current = [];
  }, []);

  const runAnimation = useCallback(() => {
    clearTimeouts();
    setPhase(0);

    const sequence = [
      { phase: 1, delay: 500 },
      { phase: 2, delay: 4000 },
      { phase: 3, delay: 7500 },
      { phase: 4, delay: 11000 },
      { phase: 5, delay: 14500 },
      { phase: 0, delay: 17000 },
    ];

    sequence.forEach(({ phase: p, delay }) => {
      const timeout = setTimeout(() => setPhase(p), delay);
      timeoutsRef.current.push(timeout);
    });
  }, [clearTimeouts]);

  useEffect(() => {
    runAnimation();
    const interval = setInterval(runAnimation, 18000);
    return () => {
      clearInterval(interval);
      clearTimeouts();
    };
  }, [runAnimation, clearTimeouts]);

  return (
    <div className="w-full py-8">
      {/* Mobile/Tablet: Static image */}
      <div className="block lg:hidden">
        <img
          src="https://cdn.voltagent.dev/console/get-started/flow.png"
          alt="Workflow diagram"
          className="w-full h-auto"
        />
      </div>

      {/* Desktop: Animated diagram */}
      <div className="hidden lg:block">
        <GlobalAnimationStyles />
        <div className="relative rounded-lg p-2 bg-gradient-to-r from-[#0f1011] via-[#151618] to-[#0d0e10] to-transparent">
          {/* Content Layout - All nodes with equal spacing */}
          <div ref={mainContainerRef} className="relative flex items-center justify-between">
            {/* GitHub Star */}
            <GitHubStarNode ref={githubRef} isActive={phase === 1} isCompleted={phase > 1} />

            {/* Trigger Node */}
            <StepNode
              ref={triggerRef}
              step={1}
              title="Trigger"
              subtitle="Captures webhook"
              isActive={phase === 2}
              isCompleted={phase > 2}
              icon={<SignalIcon className="w-5 h-5" />}
            />

            {/* AI Agent Node */}
            <StepNode
              ref={agentRef}
              step={2}
              title="AI Agent"
              subtitle="Generates message"
              isActive={phase === 3}
              isCompleted={phase > 3}
              icon={<CpuChipIcon className="w-5 h-5" />}
            />

            {/* Action Node */}
            <StepNode
              ref={discordRef}
              step={3}
              title="Action"
              subtitle="Sends message"
              isActive={phase === 4}
              isCompleted={phase > 4}
              icon={<BoltIcon className="w-5 h-5" />}
            />

            {/* Discord Node */}
            <DiscordNode ref={actionRef} isActive={phase === 5} isCompleted={false} />

            {/* Animated Beams - paths always visible, particles animate based on phase */}
            <AnimatedBeam
              containerRef={mainContainerRef}
              fromRef={githubRef}
              toRef={triggerRef}
              startXOffset={28}
              startYOffset={-10}
              endXOffset={-55}
              endYOffset={-10}
              pathColor="rgba(107, 114, 128, 0.25)"
              gradientStartColor="transparent"
              gradientStopColor="transparent"
              particleColor="#9ca3af"
              particleSize={2}
              particleSpeed={2}
              particleCount={3}
              pathWidth={1.5}
              curvature={0}
              duration={4}
              showParticles={phase === 1}
            />

            <AnimatedBeam
              containerRef={mainContainerRef}
              fromRef={triggerRef}
              toRef={agentRef}
              startXOffset={55}
              startYOffset={-10}
              endXOffset={-55}
              endYOffset={-10}
              pathColor="rgba(107, 114, 128, 0.25)"
              gradientStartColor="transparent"
              gradientStopColor="transparent"
              particleColor="#9ca3af"
              particleSize={2}
              particleSpeed={2}
              particleCount={3}
              pathWidth={1.5}
              curvature={0}
              duration={4}
              showParticles={phase === 2}
            />

            <AnimatedBeam
              containerRef={mainContainerRef}
              fromRef={agentRef}
              toRef={discordRef}
              startXOffset={55}
              startYOffset={-10}
              endXOffset={-55}
              endYOffset={-10}
              pathColor="rgba(107, 114, 128, 0.25)"
              gradientStartColor="transparent"
              gradientStopColor="transparent"
              particleColor="#9ca3af"
              particleSize={2}
              particleSpeed={2}
              particleCount={3}
              pathWidth={1.5}
              curvature={0}
              duration={4}
              showParticles={phase === 3}
            />

            <AnimatedBeam
              containerRef={mainContainerRef}
              fromRef={discordRef}
              toRef={actionRef}
              startXOffset={55}
              startYOffset={-10}
              endXOffset={-28}
              endYOffset={-10}
              pathColor="rgba(107, 114, 128, 0.25)"
              gradientStartColor="transparent"
              gradientStopColor="transparent"
              particleColor="#9ca3af"
              particleSize={2}
              particleSpeed={2}
              particleCount={3}
              pathWidth={1.5}
              curvature={0}
              duration={4}
              showParticles={phase === 4}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowDiagramFlow;
