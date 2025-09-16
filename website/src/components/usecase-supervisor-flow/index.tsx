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
        "relative px-3 py-2.5 rounded-lg border-1 border-dashed transition-shadow duration-300",
        "flex items-center gap-2.5 min-w-[140px] select-none",
        styles.border,
        styles.bg,
        styles.glow,
      )}
    >
      {/* Status indicator */}
      {status !== "idle" && (
        <div
          className={clsx(
            "absolute -top-1 -right-1 w-2 h-2 rounded-full",
            status === "processing" ? "bg-yellow-400" : "bg-green-400",
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
  // Right edge ref for supervisor
  const supervisorRightRef = useRef<HTMLDivElement>(null);

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

  // Dynamic anchor offsets for Supervisor <-> Memory beam (attach to edges)
  const [supMemAnchors, setSupMemAnchors] = useState<{ supBottom: number; memTop: number }>({
    supBottom: 22,
    memTop: -22,
  });

  // Container size for responsive, evenly spaced X positions
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    if (!containerRef.current) return;
    const update = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setContainerSize({ width: rect.width, height: rect.height });

      // Recalculate Supervisor/Memory anchor offsets based on actual node heights
      if (supervisorRef.current && memoryRef.current) {
        const supRect = supervisorRef.current.getBoundingClientRect();
        const memRect = memoryRef.current.getBoundingClientRect();
        const supBottom = Math.max(0, Math.round(supRect.height / 2) - 2);
        const memTop = -Math.max(0, Math.round(memRect.height / 2) - 2);
        setSupMemAnchors({ supBottom, memTop });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Layout constants - equal spacing between all node groups to fill width
  const layout = useMemo(() => {
    const w = Math.max(containerSize.width, 720); // minimum width to avoid overlap
    const h = containerSize.height || (isMobile ? 360 : 460);
    // Ensure centers never push cards outside: half card ~110 (desktop), ~90 (mobile)
    const halfNode = isMobile ? 90 : 110;
    const sidePadding = Math.max(halfNode + 16, 40);
    const columns = 4; // User | Supervisor | Agents | Tools
    const step = (w - sidePadding * 2) / (columns - 1);

    return {
      centerY: Math.round(h / 2),
      userX: sidePadding + step * 0,
      supervisorX: sidePadding + step * 1,
      agentsX: sidePadding + step * 2,
      toolsX: sidePadding + step * 3,
      memoryGap: 150,
      agentSpacing: 80,
      groupLabelOffset: 40,
    };
  }, [containerSize.width, containerSize.height, isMobile]);

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
      kb: { x: toolsX, y: centerY - 40 },
      crm: { x: toolsX, y: centerY + 40 },

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
      pathType?: "curved" | "angular" | "stepped";
      startYOffset?: number;
      endYOffset?: number;
      particleDuration?: number;
      particleSpeed?: number;
      particleCountOverride?: number;
    }> = [];

    switch (animationStep) {
      case 1: // User -> Supervisor
        beams.push({
          from: userRef,
          to: supervisorRef,
          curvature: 0,
          particleDuration: 2.5,
          particleSpeed: 2.5,
          pathType: "curved",
        });
        break;
      case 2: // Supervisor -> All 3 Agents (parallel)
        beams.push(
          {
            from: supervisorRef,
            to: billingRef,
            curvature: -20,
            particleDuration: 2.5,
            particleSpeed: 2.5,
          },
          {
            from: supervisorRef,
            to: accountRef,
            curvature: 0,
            particleDuration: 2.5,
            particleSpeed: 2.5,
          },
          {
            from: supervisorRef,
            to: bugRef,
            curvature: 20,
            particleDuration: 2.5,
            particleSpeed: 2.5,
          },
        );
        break;
      case 3: // Agents -> Tools (direct paths, no convergence)
        // Direct paths from each agent to tools midpoint
        beams.push(
          {
            from: billingRightRef,
            to: toolsMidpointRef,
            curvature: -20,
            pathType: "curved",
            color: "#06b6d4",
            particleDuration: 2.5,
            particleSpeed: 2.5,
          },
          {
            from: accountRightRef,
            to: toolsMidpointRef,
            curvature: 0,
            pathType: "curved",
            color: "#06b6d4",
            particleDuration: 2.5,
            particleSpeed: 2.5,
          },
          {
            from: bugRightRef,
            to: toolsMidpointRef,
            curvature: 20,
            pathType: "curved",
            color: "#06b6d4",
            particleDuration: 2.5,
            particleSpeed: 2.5,
          },
        );
        break;
      case 4: // Return: Tools inner gap -> middle agent right edge, then to Supervisor right edge (single merged route)
        beams.push({
          from: toolsMidpointRef,
          to: accountRightRef,
          curvature: 0,
          pathType: "curved",
          color: "#06b6d4",
          particleDuration: 2.5,
          particleSpeed: 2.5,
        });
        // Continue from middle agent to Supervisor right edge anchor
        beams.push({
          from: accountRightRef,
          to: supervisorRightRef,
          curvature: 0,
          pathType: "curved",
          particleDuration: 2.5,
          particleSpeed: 2.5,
        });
        break;
      case 5: // Supervisor -> User (final response)
        beams.push({
          from: supervisorRef,
          to: userRef,
          curvature: 0,
          particleDuration: 2.5,
          particleSpeed: 2.5,
          pathType: "curved",
        });
        break;
    }

    // Add continuous bidirectional memory sync beams (only when memorySyncActive) using memory color
    if (memorySyncActive) {
      beams.push(
        {
          from: supervisorRef,
          to: memoryRef,
          color: "#a855f7",
          pathType: "curved",
          curvature: 0,
          width: 2,
          startYOffset: supMemAnchors.supBottom,
          endYOffset: supMemAnchors.memTop,
          particleDuration: 0,
          particleSpeed: 2.5,
          particleCountOverride: 2,
        },
        {
          from: memoryRef,
          to: supervisorRef,
          color: "#a855f7",
          pathType: "curved",
          curvature: 0,
          width: 2,
          startYOffset: supMemAnchors.memTop,
          endYOffset: supMemAnchors.supBottom,
          particleDuration: 0,
          particleSpeed: 2.5,
          particleCountOverride: 2,
        },
      );
    }

    return beams;
  }, [animationStep, memorySyncActive, supMemAnchors]);

  // Enable memory sync after User->Supervisor completes (step 2) and disable when Supervisor->User starts (step 5)
  useEffect(() => {
    if (animationStep >= 2 && animationStep < 5) {
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

      // Step 5: Supervisor -> User (final response) and conclude tools' active effect
      setNodeStates((prev) => ({
        ...prev,
        supervisor: "idle",
        memory: "idle",
        kb: "idle",
        crm: "idle",
        user: "active",
      }));
      setAnimationStep(5);
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
        "relative w-full h-[500px] md:h-[450px] overflow-x-hidden overflow-y-hidden px-4 md:px-8",
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
      </div>

      {/* Nodes */}
      <div
        className="absolute"
        style={{
          left: positions.user.x,
          top: positions.user.y,
          transform: "translate(-50%, -50%)",
        }}
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
          transform: "translate(-50%, -50%)",
        }}
      >
        <div className="relative">
          <NodeCard
            label="Supervisor"
            sublabel="Customer Support System"
            icon={CpuChipIcon}
            refProp={supervisorRef}
            variant="supervisor"
            status={nodeStates.supervisor}
          />
          <div
            ref={supervisorRightRef}
            className="absolute w-1 h-1"
            style={{ right: 0, top: "50%", transform: "translateY(-50%)" }}
          />
        </div>
      </div>

      <div
        className="absolute"
        style={{
          left: positions.memory.x,
          top: positions.memory.y,
          transform: "translate(-50%, -50%)",
        }}
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

      {/* Sub-Agents Group Label - Centered above the group */}
      <div
        className="absolute text-emerald-400 text-sm font-semibold tracking-wider uppercase"
        style={{
          left: positions.account.x,
          top: positions.billing.y - positions.groupLabelOffset - 35,
          transform: "translateX(-50%)",
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
          transform: "translate(-50%, -50%)",
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
            style={{ right: 0, top: "50%", transform: "translateY(-50%)" }}
          />
        </div>
      </div>

      {/* Tools Group Label - Centered above the group */}
      <div
        className="absolute text-cyan-400 text-sm font-semibold tracking-wider uppercase"
        style={{
          left: positions.toolsMidpoint.x,
          top: positions.kb.y - positions.groupLabelOffset - 35,
          transform: "translateX(-50%)",
        }}
      >
        Tools
      </div>

      <div
        className="absolute"
        style={{ left: positions.kb.x, top: positions.kb.y, transform: "translate(-50%, -50%)" }}
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
          transform: "translate(-50%, -50%)",
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
            style={{ right: 0, top: "50%", transform: "translateY(-50%)" }}
          />
        </div>
      </div>

      <div
        className="absolute"
        style={{ left: positions.crm.x, top: positions.crm.y, transform: "translate(-50%, -50%)" }}
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
        style={{ left: positions.bug.x, top: positions.bug.y, transform: "translate(-50%, -50%)" }}
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
            style={{ right: 0, top: "50%", transform: "translateY(-50%)" }}
          />
        </div>
      </div>

      {/* Invisible point at tools left edge for beam targeting */}
      <div
        ref={toolsMidpointRef}
        className="absolute w-1 h-1"
        style={{
          left: positions.toolsMidpoint.x - 55, // Positioned at left edge of tools
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
      {activeBeams.map((beam, index) => {
        // Simple key generation using index and color
        const beamKey = `beam-${index}-${beam.color || "default"}`;
        return (
          <AnimatedBeam
            key={beamKey}
            containerRef={containerRef}
            fromRef={beam.from}
            toRef={beam.to}
            pathColor={beam.color ? `${beam.color}30` : "rgba(0, 217, 146, 0.2)"}
            pathWidth={beam.width || 2}
            pathType={beam.pathType || "angular"}
            curvature={beam.curvature || 0}
            showParticles={true}
            particleColor={beam.color || "#00d992"}
            particleSize={3}
            particleCount={beam.particleCountOverride ?? 2}
            particleSpeed={beam.particleSpeed ?? 2.5}
            particleDirection={beam.reverse ? "backward" : "forward"}
            duration={beam.particleSpeed ?? 2.5}
            particleDuration={beam.particleDuration ?? beam.particleSpeed ?? 2.5}
            showPath={true}
            showGradient={false}
            startYOffset={beam.startYOffset ?? 0}
            endYOffset={beam.endYOffset ?? 0}
          />
        );
      })}
    </div>
  );
}
