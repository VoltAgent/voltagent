"use client";

import {
  BookOpenIcon,
  BugAntIcon,
  BuildingLibraryIcon,
  ClipboardDocumentListIcon,
  CpuChipIcon,
  CreditCardIcon,
  QuestionMarkCircleIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { useMediaQuery } from "@site/src/hooks/use-media-query";
import clsx from "clsx";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatedBeam } from "../magicui/animated-beam";

interface UseCaseSupervisorFlowProps {
  slug: string;
  className?: string;
}

// Node component with consistent styling
function NodeCard({
  label,
  sublabel,
  icon: Icon,
  refProp,
  variant = "default",
  status = "idle",
}: {
  label: string;
  sublabel?: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  refProp: React.RefObject<HTMLDivElement>;
  variant?: "default" | "user" | "supervisor" | "agent" | "tool" | "memory";
  status?: "idle" | "active" | "processing";
}) {
  const getVariantStyles = () => {
    switch (variant) {
      case "user":
        return {
          border: "border-blue-400/60",
          text: "text-blue-300",
          bg: "bg-transparent",
          glow: status === "active" ? "shadow-[0_0_20px_rgba(59,130,246,0.4)]" : "",
        };
      case "supervisor":
        return {
          border: "border-[#00d992]/60",
          text: "text-[#00d992]",
          bg: "bg-transparent",
          glow: status === "processing" ? "shadow-[0_0_30px_rgba(0,217,146,0.5)]" : "",
        };
      case "agent":
        return {
          border: "border-emerald-400/50",
          text: "text-emerald-300",
          bg: "bg-transparent",
          glow: status === "active" ? "shadow-[0_0_20px_rgba(16,185,129,0.3)]" : "",
        };
      case "tool":
        return {
          border: "border-cyan-400/50",
          text: "text-cyan-300",
          bg: "bg-transparent",
          glow: status === "active" ? "shadow-[0_0_20px_rgba(6,182,212,0.3)]" : "",
        };
      case "memory":
        return {
          border: "border-purple-400/50",
          text: "text-purple-300",
          bg: "bg-transparent",
          glow: status === "active" ? "shadow-[0_0_20px_rgba(147,51,234,0.3)]" : "",
        };
      default:
        return {
          border: "border-gray-500/40",
          text: "text-gray-300",
          bg: "bg-transparent",
          glow: "",
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div
      ref={refProp}
      className={clsx(
        "relative px-3 py-2.5 rounded-lg border-1 border-dashed transition-all duration-300",
        "flex items-center gap-2.5 min-w-[140px] select-none",
        styles.border,
        styles.bg,
        styles.glow,
        "hover:scale-[1.02]",
      )}
    >
      {/* Status indicator */}
      {status !== "idle" && (
        <div
          className={clsx(
            "absolute -top-1 -right-1 w-2 h-2 rounded-full",
            status === "processing" ? "bg-yellow-400 animate-pulse" : "bg-green-400",
          )}
        />
      )}

      <Icon className={clsx("w-4 h-4 flex-shrink-0", styles.text)} />
      <div className="flex-1">
        <div className={clsx("text-xs font-semibold leading-tight", styles.text)}>{label}</div>
        {sublabel && <div className="text-[10px] text-gray-400 mt-0.5">{sublabel}</div>}
      </div>
    </div>
  );
}

export function UseCaseSupervisorFlow({ slug, className }: UseCaseSupervisorFlowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery("(max-width: 768px)");

  // Node refs
  const userRef = useRef<HTMLDivElement>(null);
  const supervisorRef = useRef<HTMLDivElement>(null);
  const billingRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const bugRef = useRef<HTMLDivElement>(null);
  const kbRef = useRef<HTMLDivElement>(null);
  const crmRef = useRef<HTMLDivElement>(null);
  const memoryRef = useRef<HTMLDivElement>(null);
  const toolsMidpointRef = useRef<HTMLDivElement>(null);
  const agentsMidpointRef = useRef<HTMLDivElement>(null);
  // Right edge refs for sub-agents
  const billingRightRef = useRef<HTMLDivElement>(null);
  const accountRightRef = useRef<HTMLDivElement>(null);
  const bugRightRef = useRef<HTMLDivElement>(null);

  const [animationStep, setAnimationStep] = useState(0);
  const [memorySyncActive, setMemorySyncActive] = useState(false);
  const [nodeStates, setNodeStates] = useState<Record<string, "idle" | "active" | "processing">>({
    user: "idle",
    supervisor: "idle",
    billing: "idle",
    account: "idle",
    bug: "idle",
    kb: "idle",
    crm: "idle",
    memory: "idle",
  });

  // Layout constants - equal spacing between all node groups to fill width
  const layout = {
    // Center line for User and Supervisor
    centerY: isMobile ? 180 : 200,

    // X positions - evenly distributed across the full width
    userX: isMobile ? 20 : 40, // Near left edge
    supervisorX: isMobile ? 150 : 280, // 1/4 of width
    agentsX: isMobile ? 300 : 520, // Center-right
    toolsX: isMobile ? 450 : 760, // Near right edge

    // Memory position (centered under supervisor)
    memoryGap: 150,

    // Vertical spacing
    agentSpacing: 70,
    groupLabelOffset: 40, // Offset for group labels above nodes
  };

  // Calculate positions
  const positions = useMemo(() => {
    const {
      centerY,
      userX,
      supervisorX,
      memoryGap,
      agentsX,
      toolsX,
      agentSpacing,
      groupLabelOffset,
    } = layout;

    return {
      // Left side
      user: { x: userX, y: centerY },

      // Center
      supervisor: { x: supervisorX, y: centerY },
      memory: { x: supervisorX, y: centerY + memoryGap },

      // Right side - Agents column (3 agents vertically aligned)
      billing: { x: agentsX, y: centerY - agentSpacing },
      account: { x: agentsX, y: centerY },
      bug: { x: agentsX, y: centerY + agentSpacing },

      // Far right - Tools column (2 tools vertically centered)
      kb: { x: toolsX, y: centerY - 35 },
      crm: { x: toolsX, y: centerY + 35 },

      // Midpoint between tools for beam targeting
      toolsMidpoint: { x: toolsX, y: centerY },

      // Midpoint between agents and tools for beam convergence
      agentsMidpoint: { x: agentsX + (toolsX - agentsX) / 2, y: centerY },

      // Group label positions
      groupLabelOffset,
    };
  }, [layout]);

  // Active beams based on animation step
  const activeBeams = useMemo(() => {
    const beams: Array<{
      from: React.RefObject<HTMLDivElement>;
      to: React.RefObject<HTMLDivElement>;
      color?: string;
      width?: number;
      curvature?: number;
      reverse?: boolean;
    }> = [];

    switch (animationStep) {
      case 1: // User -> Supervisor
        beams.push({ from: userRef, to: supervisorRef, curvature: 0 });
        break;
      case 2: // Supervisor -> All 3 Agents (parallel)
        beams.push(
          { from: supervisorRef, to: billingRef, curvature: -20 },
          { from: supervisorRef, to: accountRef, curvature: 0 },
          { from: supervisorRef, to: bugRef, curvature: 20 },
        );
        break;
      case 3: // All Agents converge and go to Tools
        // Three beams from agents converge at midpoint
        beams.push({ from: billingRightRef, to: agentsMidpointRef, curvature: -15 });
        beams.push({ from: accountRightRef, to: agentsMidpointRef, curvature: 0 });
        beams.push({ from: bugRightRef, to: agentsMidpointRef, curvature: 15 });
        // Single beam from convergence to tools
        beams.push({ from: agentsMidpointRef, to: toolsMidpointRef, curvature: 0 });
        break;
      case 4: // All agents -> Supervisor (return)
        beams.push(
          { from: billingRef, to: supervisorRef, curvature: -20 },
          { from: accountRef, to: supervisorRef, curvature: 0 },
          { from: bugRef, to: supervisorRef, curvature: 20 },
        );
        break;
      case 5: // Supervisor -> Memory
        beams.push({ from: supervisorRef, to: memoryRef, color: "#9333ea", curvature: 0 });
        break;
      case 6: // Supervisor -> User (final response)
        beams.push({ from: supervisorRef, to: userRef, curvature: 0 });
        break;
    }

    // Add continuous bidirectional memory sync beams (always active after step 2)
    if (memorySyncActive && animationStep >= 2 && animationStep < 6) {
      // Supervisor to Memory
      beams.push({
        from: supervisorRef,
        to: memoryRef,
        color: "#9333ea",
        curvature: -15,
        width: 1,
      });
      // Memory to Supervisor (simultaneous)
      beams.push({
        from: memoryRef,
        to: supervisorRef,
        color: "#a855f7",
        curvature: 15,
        width: 1,
      });
    }

    return beams;
  }, [animationStep, memorySyncActive]);

  // Enable memory sync when animation reaches step 2
  useEffect(() => {
    if (animationStep >= 2 && animationStep < 6) {
      setMemorySyncActive(true);
    } else {
      setMemorySyncActive(false);
    }
  }, [animationStep]);

  // Animation sequence
  useEffect(() => {
    if (slug !== "customer-support-agent") return;

    const runAnimation = async () => {
      // Reset
      setAnimationStep(0);
      setNodeStates({
        user: "idle",
        supervisor: "idle",
        billing: "idle",
        account: "idle",
        bug: "idle",
        kb: "idle",
        crm: "idle",
        memory: "idle",
      });

      await new Promise((r) => setTimeout(r, 500));

      // Step 1: User -> Supervisor
      setNodeStates((prev) => ({ ...prev, user: "active" }));
      setAnimationStep(1);
      await new Promise((r) => setTimeout(r, 1500));

      // Step 2: Supervisor -> All 3 Agents simultaneously
      setNodeStates((prev) => ({
        ...prev,
        user: "idle",
        supervisor: "processing",
        billing: "processing",
        account: "processing",
        bug: "processing",
      }));
      setAnimationStep(2);
      await new Promise((r) => setTimeout(r, 1500));

      // Step 3: All Agents -> Tools (forward)
      setNodeStates((prev) => ({
        ...prev,
        supervisor: "idle",
        billing: "processing",
        account: "processing",
        bug: "processing",
        kb: "active",
        crm: "active",
      }));
      setAnimationStep(3);
      await new Promise((r) => setTimeout(r, 1500));

      // Step 4: All agents -> Supervisor
      setNodeStates((prev) => ({
        ...prev,
        billing: "idle",
        account: "idle",
        bug: "idle",
        supervisor: "active",
      }));
      setAnimationStep(4);
      await new Promise((r) => setTimeout(r, 1500));

      // Step 5: Supervisor -> Memory
      setNodeStates((prev) => ({
        ...prev,
        memory: "active",
      }));
      setAnimationStep(5);
      await new Promise((r) => setTimeout(r, 1000));

      // Step 6: Supervisor -> User (final response)
      setNodeStates((prev) => ({
        ...prev,
        memory: "idle",
        user: "active",
      }));
      setAnimationStep(6);
      await new Promise((r) => setTimeout(r, 1500));

      // Loop
      await new Promise((r) => setTimeout(r, 2000));
      runAnimation();
    };

    runAnimation();
  }, [slug]);

  return (
    <div
      ref={containerRef}
      className={clsx(
        "relative w-full h-[500px] md:h-[550px] overflow-x-auto overflow-y-hidden",
        "bg-gradient-to-br from-gray-950 via-gray-900 to-black rounded-xl",
        className,
      )}
    >
      {/* Background glow effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Central green glow */}
        <div className="absolute top-1/2 left-[45%] -translate-x-1/2 -translate-y-1/2 w-[400px] h-[300px] md:w-[500px] md:h-[100px] rounded-full bg-[#00d992]/20 blur-[120px]" />

        {/* Secondary glow near agents */}
        <div className="absolute top-1/2 left-[65%] -translate-x-1/2 -translate-y-1/2 w-[300px] h-[250px] md:w-[350px] md:h-[100px] rounded-full bg-[#00d992]/15 blur-[100px]" />

        {/* Dotted grid overlay */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: "radial-gradient(circle, #00d992 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
      </div>

      {/* Nodes */}
      <div
        className="absolute"
        style={{ left: positions.user.x, top: positions.user.y, transform: "translate(0, -50%)" }}
      >
        <NodeCard
          label="User"
          sublabel="Request"
          icon={UserIcon}
          refProp={userRef}
          variant="user"
          status={nodeStates.user}
        />
      </div>

      <div
        className="absolute"
        style={{
          left: positions.supervisor.x,
          top: positions.supervisor.y,
          transform: "translateY(-50%)",
        }}
      >
        <NodeCard
          label="Supervisor"
          sublabel="Customer Support System"
          icon={CpuChipIcon}
          refProp={supervisorRef}
          variant="supervisor"
          status={nodeStates.supervisor}
        />
      </div>

      <div
        className="absolute"
        style={{ left: positions.memory.x, top: positions.memory.y, transform: "translateY(-50%)" }}
      >
        <NodeCard
          label="Conversation Memory"
          sublabel="Context"
          icon={ClipboardDocumentListIcon}
          refProp={memoryRef}
          variant="memory"
          status={nodeStates.memory}
        />
      </div>

      {/* Sub-Agents Group Label */}
      <div
        className="absolute text-emerald-400 text-sm font-semibold tracking-wider uppercase"
        style={{
          left: positions.billing.x,
          top: positions.billing.y - positions.groupLabelOffset - 20,
        }}
      >
        Sub-Agents
      </div>

      {/* Right Grid - Agents */}
      <div
        className="absolute"
        style={{
          left: positions.billing.x,
          top: positions.billing.y,
          transform: "translateY(-50%)",
        }}
      >
        <div className="relative">
          <NodeCard
            label="Billing Agent"
            sublabel="Payment"
            icon={CreditCardIcon}
            refProp={billingRef}
            variant="agent"
            status={nodeStates.billing}
          />
          {/* Right edge connection point */}
          <div
            ref={billingRightRef}
            className="absolute w-1 h-1"
            style={{ right: -70, top: "50%", transform: "translateY(-50%)" }}
          />
        </div>
      </div>

      {/* Tools Group Label */}
      <div
        className="absolute text-cyan-400 text-sm font-semibold tracking-wider uppercase"
        style={{
          left: positions.kb.x,
          top: positions.kb.y - positions.groupLabelOffset - 15,
        }}
      >
        Tools
      </div>

      <div
        className="absolute"
        style={{ left: positions.kb.x, top: positions.kb.y, transform: "translateY(-50%)" }}
      >
        <NodeCard
          label="KB Search"
          sublabel="Knowledge"
          icon={BookOpenIcon}
          refProp={kbRef}
          variant="tool"
          status={nodeStates.kb}
        />
      </div>

      <div
        className="absolute"
        style={{
          left: positions.account.x,
          top: positions.account.y,
          transform: "translateY(-50%)",
        }}
      >
        <div className="relative">
          <NodeCard
            label="Account Agent"
            sublabel="User Info"
            icon={QuestionMarkCircleIcon}
            refProp={accountRef}
            variant="agent"
            status={nodeStates.account}
          />
          {/* Right edge connection point */}
          <div
            ref={accountRightRef}
            className="absolute w-1 h-1"
            style={{ right: -70, top: "50%", transform: "translateY(-50%)" }}
          />
        </div>
      </div>

      <div
        className="absolute"
        style={{ left: positions.crm.x, top: positions.crm.y, transform: "translateY(-50%)" }}
      >
        <NodeCard
          label="CRM"
          sublabel="Customer Data"
          icon={BuildingLibraryIcon}
          refProp={crmRef}
          variant="tool"
          status={nodeStates.crm}
        />
      </div>

      <div
        className="absolute"
        style={{ left: positions.bug.x, top: positions.bug.y, transform: "translateY(-50%)" }}
      >
        <div className="relative">
          <NodeCard
            label="Bug Triager"
            sublabel="Issues"
            icon={BugAntIcon}
            refProp={bugRef}
            variant="agent"
            status={nodeStates.bug}
          />
          {/* Right edge connection point */}
          <div
            ref={bugRightRef}
            className="absolute w-1 h-1"
            style={{ right: -70, top: "50%", transform: "translateY(-50%)" }}
          />
        </div>
      </div>

      {/* Invisible midpoint between tools for beam targeting */}
      <div
        ref={toolsMidpointRef}
        className="absolute w-1 h-1"
        style={{
          left: positions.toolsMidpoint.x,
          top: positions.toolsMidpoint.y,
          transform: "translateY(-50%)",
        }}
      />

      {/* Invisible midpoint between agents for beam targeting */}
      <div
        ref={agentsMidpointRef}
        className="absolute w-1 h-1"
        style={{
          left: positions.agentsMidpoint.x,
          top: positions.agentsMidpoint.y,
          transform: "translateY(-50%)",
        }}
      />

      {/* Animated Beams */}
      {activeBeams.map((beam) => {
        // Create unique key based on beam properties
        const fromNode =
          beam.from === userRef
            ? "user"
            : beam.from === supervisorRef
              ? "supervisor"
              : beam.from === billingRef
                ? "billing"
                : beam.from === billingRightRef
                  ? "billingR"
                  : beam.from === accountRef
                    ? "account"
                    : beam.from === accountRightRef
                      ? "accountR"
                      : beam.from === bugRef
                        ? "bug"
                        : beam.from === bugRightRef
                          ? "bugR"
                          : beam.from === memoryRef
                            ? "memory"
                            : beam.from === agentsMidpointRef
                              ? "agentsMid"
                              : beam.from === toolsMidpointRef
                                ? "toolsMid"
                                : "unknown";
        const toNode =
          beam.to === userRef
            ? "user"
            : beam.to === supervisorRef
              ? "supervisor"
              : beam.to === billingRef
                ? "billing"
                : beam.to === accountRef
                  ? "account"
                  : beam.to === bugRef
                    ? "bug"
                    : beam.to === memoryRef
                      ? "memory"
                      : beam.to === agentsMidpointRef
                        ? "agentsMid"
                        : beam.to === toolsMidpointRef
                          ? "toolsMid"
                          : "unknown";
        const beamKey = `${fromNode}-to-${toNode}-${beam.color || "default"}`;
        return (
          <AnimatedBeam
            key={beamKey}
            containerRef={containerRef}
            fromRef={beam.from}
            toRef={beam.to}
            pathColor={beam.color ? `${beam.color}30` : "rgba(0, 217, 146, 0.2)"}
            pathWidth={beam.width || 2}
            pathType="angular"
            curvature={beam.curvature || 0}
            showParticles={true}
            particleColor={beam.color || "#00d992"}
            particleSize={beam.color === "#9333ea" || beam.color === "#a855f7" ? 2 : 3}
            particleCount={beam.color === "#9333ea" || beam.color === "#a855f7" ? 4 : 2}
            particleSpeed={beam.color === "#9333ea" || beam.color === "#a855f7" ? 2.5 : 1.5}
            particleDirection={beam.reverse ? "backward" : "forward"}
            duration={beam.color === "#9333ea" || beam.color === "#a855f7" ? 2.5 : 1.5}
            particleDuration={beam.color === "#9333ea" || beam.color === "#a855f7" ? 2.5 : 1.5}
            showPath={true}
            showGradient={false}
          />
        );
      })}
    </div>
  );
}
