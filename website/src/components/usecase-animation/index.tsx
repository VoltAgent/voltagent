"use client";

import {
  BoltIcon,
  BookOpenIcon,
  BugAntIcon,
  CreditCardIcon,
  ExclamationTriangleIcon,
  QuestionMarkCircleIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { useMediaQuery } from "@site/src/hooks/use-media-query";
import clsx from "clsx";
import React, { forwardRef, useRef, useState, useEffect, useMemo } from "react";
import { AnimatedBeam } from "../magicui/animated-beam";
import { getUseCaseConfig } from "./configs";

// Node component similar to agents-animation
const Node = React.memo(
  forwardRef<
    HTMLDivElement,
    {
      className?: string;
      children?: React.ReactNode;
      label?: string;
      description?: string;
      type?: "center" | "peripheral";
      nodeId?: string;
      processing?: boolean;
    }
  >(({ className, children, label, description, type = "peripheral", processing = false }, ref) => {
    const [isHovered, setIsHovered] = useState(false);
    const isMobile = useMediaQuery("(max-width: 768px)");

    if (type === "center") {
      return (
        <div className="flex flex-col items-center relative">
          <div
            ref={ref}
            className={clsx(
              "z-20 flex items-center justify-center rounded-full border-2 border-solid transition-all duration-300 relative overflow-visible",
              "border-[#00d992] bg-[#00d992]/10 shadow-[0_0_30px_rgba(0,217,146,0.3)]",
              "hover:scale-110",
              isMobile ? "size-12" : "size-16",
              className,
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {/* Processing blink (no scale) */}
            {processing && (
              <>
                <div className="pointer-events-none absolute inset-0 rounded-full bg-[#00d992] blur-md opacity-30 animate-[pulse_0.5s_ease-in-out_infinite]" />
                <div className="pointer-events-none absolute -inset-1 rounded-full border border-[#00d992]/40 animate-[pulse_0.5s_ease-in-out_infinite]" />
              </>
            )}
            <div className="relative z-10 flex items-center justify-center">{children}</div>
          </div>
          {label && (
            <span
              className={clsx(
                "mt-2 font-semibold text-[#00d992]",
                isMobile ? "text-xs" : "text-sm",
              )}
            >
              {label}
            </span>
          )}
          {description && isHovered && (
            <div className="absolute top-full mt-2 z-50 w-48 rounded-md bg-[#0c2520] border border-solid border-[#113328] p-3 shadow-lg text-xs text-gray-300">
              {description}
            </div>
          )}
        </div>
      );
    }

    // Peripheral node with rectangular design
    return (
      <div className="relative">
        <div
          ref={ref}
          className={clsx(
            "z-10 flex items-center gap-2 rounded-md backdrop-blur-sm border border-dashed transition-all duration-300",
            "border-[#4f5d75] border-opacity-40",
            "hover:scale-105 hover:bg-[#113328]/30 hover:border-[#00d992]/40",
            "px-3 py-2",
            isMobile ? "min-w-[100px]" : "min-w-[120px]",
            className,
          )}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className="flex items-center justify-center size-5">{children}</div>
          <span className="text-xs font-medium text-gray-300 whitespace-nowrap">{label}</span>
        </div>

        {description && isHovered && (
          <div className="absolute top-full mt-2 z-50 w-48 rounded-md bg-[#0c2520] border border-solid border-[#113328] p-3 shadow-lg text-xs text-gray-300">
            {description}
          </div>
        )}
      </div>
    );
  }),
);

Node.displayName = "Node";

interface UseCaseAnimationProps {
  slug: string;
  className?: string;
  businessTopics?: string[];
  systemCapabilities?: string[];
}

export const UseCaseAnimation = React.memo(function UseCaseAnimation({
  slug,
  className,
  businessTopics,
  systemCapabilities,
}: UseCaseAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);

  // Create refs for all nodes
  const nodeRefs = useRef<{ [key: string]: React.RefObject<HTMLDivElement> }>({});

  // Memoize config so effect doesn't restart on every render
  const config = useMemo(() => getUseCaseConfig(slug), [slug]);
  const nodeIds = useMemo(() => {
    if (businessTopics && systemCapabilities) {
      const ids = [];
      businessTopics.forEach((_, i) => ids.push(`business-${i}`));
      systemCapabilities.forEach((_, i) => ids.push(`system-${i}`));
      return ids;
    }
    return config.nodes.map((n) => n.id);
  }, [config, businessTopics, systemCapabilities]);
  const isMobile = useMediaQuery("(max-width: 768px)");

  // Initialize refs for each node
  nodeIds.forEach((nodeId) => {
    if (!nodeRefs.current[nodeId]) {
      nodeRefs.current[nodeId] = React.createRef<HTMLDivElement>();
    }
  });

  // Animation state - separate inbound and outbound beams
  const [activeBeams, setActiveBeams] = useState<{
    inbound: string[];
    outbound: string[];
  }>({
    inbound: [],
    outbound: [],
  });

  // Static paths are handled directly in render, no need for state

  // Center node pulse animation state
  const [centerPulse, setCenterPulse] = useState(false);
  // Store inbound paths per node to reuse exactly for outbound
  const inboundPathsRef = useRef<Record<string, string>>({});
  const reverseQuadraticPath = (d: string) => {
    const match = d.match(
      /M\s*([-\d.]+),([-\d.]+)\s*Q\s*([-\d.]+),([-\d.]+)\s*([-\d.]+),([-\d.]+)/,
    );
    if (!match) return undefined;
    const [, sx, sy, mx, my, ex, ey] = match;
    return `M ${ex},${ey} Q ${mx},${my} ${sx},${sy}`;
  };

  // Animation parameters
  const inboundDuration = 2.5; // Node to center duration
  const outboundDuration = 1.0; // Center to node duration (faster return)
  const holdDuration = 0.5; // Wait at center before fanning out
  const cycleDelay = 0.2; // Very small delay before next cycle for smooth loop

  // Track visibility
  const [isVisible, setIsVisible] = useState(false);

  // Set up IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 },
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, []);

  // Create continuous bidirectional animation sequence (self-scheduling)
  useEffect(() => {
    if (!isVisible) return; // Don't run animations when not visible

    const timers: NodeJS.Timeout[] = [];

    const runCycle = () => {
      // Phase 1: Start inbound particle animation
      setActiveBeams({ inbound: nodeIds, outbound: [] });

      // Phase 2: After inbound animation, pulse center
      const pulseTimer = setTimeout(() => {
        setCenterPulse(true);

        // After hold, start outbound particle animation
        const startOutboundTimer = setTimeout(() => {
          setActiveBeams({ inbound: nodeIds, outbound: nodeIds });
          setCenterPulse(false);
        }, holdDuration * 1000);
        timers.push(startOutboundTimer);
      }, inboundDuration * 1000);
      timers.push(pulseTimer);

      // Phase 3: After outbound completes, clear and restart
      const restartTimer = setTimeout(
        () => {
          // Clear all active beams to reset particle animations
          setActiveBeams({ inbound: [], outbound: [] });

          // Small delay before restarting the cycle
          const delayedRestart = setTimeout(() => {
            runCycle();
          }, cycleDelay * 1000);
          timers.push(delayedRestart);
        },
        (inboundDuration + holdDuration + outboundDuration) * 1000,
      );
      timers.push(restartTimer);
    };

    runCycle();

    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, [nodeIds, isVisible]);

  // Calculate responsive radius
  const radius = isMobile ? 120 : 180;

  return (
    <div
      ref={containerRef}
      className={clsx(
        "relative flex items-center justify-center",
        "w-full h-[400px] md:h-[500px]",
        className,
      )}
    >
      {/* Center Node - VoltAgent */}
      <div className="absolute" style={{ zIndex: 20 }}>
        <div className={clsx("transition-all duration-300")}>
          <Node
            ref={centerRef}
            type="center"
            processing={centerPulse}
            label={config.centerNode.label}
            description="Core AI agent orchestrating all operations"
          >
            <BoltIcon
              className={clsx(
                "text-[#00d992] transition-all duration-300",
                centerPulse && "drop-shadow-[0_0_20px_rgba(0,217,146,0.8)]",
                isMobile ? "h-5 w-5" : "h-9 w-9",
              )}
            />
          </Node>
        </div>
      </div>

      {/* Peripheral Nodes in circular layout */}
      {(() => {
        // Use data from JSON when available
        if (businessTopics && systemCapabilities) {
          const iconMap = {
            // Business topics
            Billing: CreditCardIcon,
            "Account Questions": QuestionMarkCircleIcon,
            "Bug Reports": BugAntIcon,
            "Lead Qualification": UserCircleIcon,
            "Sales Research": BookOpenIcon,
            Outreach: BoltIcon,
            Invoicing: CreditCardIcon,
            Expenses: CreditCardIcon,
            Reporting: BookOpenIcon,
            "Code Review": BugAntIcon,
            "CI/CD": BoltIcon,
            "On-Call Support": ExclamationTriangleIcon,
            Campaigns: BoltIcon,
            Content: BookOpenIcon,
            Analytics: BookOpenIcon,
            Contracts: BookOpenIcon,
            Compliance: ExclamationTriangleIcon,
            "Legal Review": BookOpenIcon,
            Claims: CreditCardIcon,
            Underwriting: BookOpenIcon,
            "Policy Management": BookOpenIcon,
            Maintenance: BoltIcon,
            Monitoring: ExclamationTriangleIcon,
            Safety: ExclamationTriangleIcon,
            Tutoring: BookOpenIcon,
            Advising: UserCircleIcon,
            Administration: BookOpenIcon,
            Permits: BookOpenIcon,
            "Public Information": QuestionMarkCircleIcon,
            Benefits: CreditCardIcon,
            "API Docs": BookOpenIcon,
            Changelogs: BookOpenIcon,
            Tutorials: BookOpenIcon,
            // System capabilities
            "Knowledge Base": BookOpenIcon,
            "CRM System": UserCircleIcon,
            Escalation: ExclamationTriangleIcon,
            HRIS: UserCircleIcon,
            "Policy Engine": ExclamationTriangleIcon,
            "Enrichment APIs": BoltIcon,
            "ERP/Accounting": CreditCardIcon,
            Repos: BookOpenIcon,
            "Issue Tracker": BugAntIcon,
            "Observability Stack": ExclamationTriangleIcon,
            "CRM/CDP": UserCircleIcon,
            "Analytics Tools": BookOpenIcon,
            "Content APIs": BookOpenIcon,
            "Doc Systems": BookOpenIcon,
            "Claims System": CreditCardIcon,
            CRM: UserCircleIcon,
            IoT: BoltIcon,
            ERP: CreditCardIcon,
            LMS: BookOpenIcon,
            SIS: BookOpenIcon,
            "Case Management": BookOpenIcon,
            "Build System": BoltIcon,
          };

          // Create nodes from JSON data
          const nodes = [
            ...businessTopics.map((topic, i) => ({
              id: `business-${i}`,
              label: topic,
              icon: iconMap[topic] || QuestionMarkCircleIcon,
            })),
            ...systemCapabilities.map((capability, i) => ({
              id: `system-${i}`,
              label: capability,
              icon: iconMap[capability] || BookOpenIcon,
            })),
          ];

          return nodes.map((node, index) => {
            const Icon = node.icon;
            const angle = (2 * Math.PI * index) / nodes.length - Math.PI / 2;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            return (
              <div
                key={node.id}
                className="absolute"
                style={{
                  transform: `translate(${x}px, ${y}px)`,
                  zIndex: 10,
                }}
              >
                <Node ref={nodeRefs.current[node.id]} label={node.label} nodeId={node.id}>
                  <Icon className="h-4 w-4 text-[#00d992]" />
                </Node>
              </div>
            );
          });
        }

        // Default: use config for other cases
        return config.nodes.map((node, index) => {
          const Icon = node.icon;
          const angle = (2 * Math.PI * index) / config.nodes.length - Math.PI / 2;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;

          return (
            <div
              key={node.id}
              className="absolute"
              style={{
                transform: `translate(${x}px, ${y}px)`,
                zIndex: 10,
              }}
            >
              <Node
                ref={nodeRefs.current[node.id]}
                label={node.label}
                description={node.description}
                nodeId={node.id}
              >
                <Icon className="h-4 w-4 text-[#00d992]" />
              </Node>
            </div>
          );
        });
      })()}

      {/* Static paths that are always visible */}
      {nodeIds.map((nodeId) => {
        if (!nodeRefs.current[nodeId]?.current) return null;

        return (
          <AnimatedBeam
            key={`static-${nodeId}`}
            containerRef={containerRef}
            fromRef={nodeRefs.current[nodeId]}
            toRef={centerRef}
            curvature={0}
            pathColor="rgba(0, 217, 146, 0.15)"
            pathWidth={2}
            pathType="curved"
            showParticles={false}
            showPath={true}
            showGradient={false}
            onPathComputed={(d) => {
              inboundPathsRef.current[nodeId] = d;
            }}
          />
        );
      })}

      {/* Animated Beams - Inbound (Nodes to Center) */}
      {activeBeams.inbound.map((nodeId) => {
        if (!nodeRefs.current[nodeId]?.current) return null;

        return (
          <AnimatedBeam
            key={`inbound-${nodeId}`}
            containerRef={containerRef}
            fromRef={nodeRefs.current[nodeId]}
            toRef={centerRef}
            curvature={0}
            gradientStartColor="#00d992"
            gradientStopColor="#00d992"
            pathColor="rgba(0, 217, 146, 0)"
            pathWidth={2}
            pathType="curved"
            showParticles={true}
            showPath={false}
            showGradient={false}
            particleSize={3}
            particleSpeed={inboundDuration}
            particleColor="#00d992"
            particleCount={2}
            particleDirection="forward"
            duration={inboundDuration}
            delay={0}
            particleDuration={inboundDuration}
          />
        );
      })}

      {/* Animated Beams - Outbound (Center to Nodes) */}
      {activeBeams.outbound.map((nodeId) => {
        if (!nodeRefs.current[nodeId]?.current) return null;

        const inboundD = inboundPathsRef.current[nodeId];
        const reversedD = inboundD ? reverseQuadraticPath(inboundD) : undefined;

        return (
          <AnimatedBeam
            key={`outbound-${nodeId}`}
            containerRef={containerRef}
            fromRef={centerRef}
            toRef={nodeRefs.current[nodeId]}
            curvature={80}
            gradientStartColor="#00d992"
            gradientStopColor="#00d992"
            pathColor="rgba(0, 217, 146, 0)"
            pathWidth={3}
            pathType="curved"
            showParticles={true}
            particleSize={3}
            particleSpeed={outboundDuration}
            particleColor="#00d992"
            particleCount={2}
            particleDirection="forward"
            showPath={false}
            showGradient={false}
            animateDraw={false}
            duration={outboundDuration}
            delay={0}
            particleDuration={outboundDuration}
            pathOverride={reversedD}
          />
        );
      })}

      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] md:w-[400px] md:h-[400px] rounded-full bg-[#00d992]/5 blur-3xl" />
      </div>
    </div>
  );
});
