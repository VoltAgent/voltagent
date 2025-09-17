import {
  ArrowPathIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  BookOpenIcon,
  BriefcaseIcon,
  BugAntIcon,
  BuildingLibraryIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentListIcon,
  CodeBracketIcon,
  CodeBracketSquareIcon,
  CpuChipIcon,
  CreditCardIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  QuestionMarkCircleIcon,
  ReceiptPercentIcon,
  ServerStackIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { useMediaQuery } from "@site/src/hooks/use-media-query";
import clsx from "clsx";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatedBeam } from "../magicui/animated-beam";

interface AgentNode {
  id: string;
  label: string;
  sublabel: string;
  icon: string;
}

interface ToolNode {
  id: string;
  label: string;
  sublabel: string;
  icon: string;
}

interface UseCaseSupervisorFlowProps {
  className?: string;
  agents?: AgentNode[];
  tools?: ToolNode[];
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

// Icon mapping
const iconMap: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  ArrowPathIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  BookOpenIcon,
  BriefcaseIcon,
  BugAntIcon,
  BuildingLibraryIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentListIcon,
  CodeBracketIcon,
  CodeBracketSquareIcon,
  CpuChipIcon,
  CreditCardIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  QuestionMarkCircleIcon,
  ReceiptPercentIcon,
  ServerStackIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserIcon,
};

const getIcon = (iconName: string) => iconMap[iconName] || QuestionMarkCircleIcon;

export function UseCaseSupervisorFlow({
  className,
  agents = [],
  tools = [],
}: UseCaseSupervisorFlowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery("(max-width: 768px)");

  // Fixed node refs
  const userRef = useRef<HTMLDivElement>(null);
  const supervisorRef = useRef<HTMLDivElement>(null);
  const memoryRef = useRef<HTMLDivElement>(null);
  const toolsMidpointRef = useRef<HTMLDivElement>(null);
  const agentsMidpointRef = useRef<HTMLDivElement>(null);
  const supervisorRightRef = useRef<HTMLDivElement>(null);

  // Dynamic refs for agents and tools
  const agentRefs = useRef<Record<string, React.RefObject<HTMLDivElement>>>({});
  const agentRightRefs = useRef<Record<string, React.RefObject<HTMLDivElement>>>({});
  const toolRefs = useRef<Record<string, React.RefObject<HTMLDivElement>>>({});

  // Initialize dynamic refs
  agents.forEach((agent) => {
    if (!agentRefs.current[agent.id]) {
      agentRefs.current[agent.id] = React.createRef<HTMLDivElement>();
      agentRightRefs.current[agent.id] = React.createRef<HTMLDivElement>();
    }
  });

  tools.forEach((tool) => {
    if (!toolRefs.current[tool.id]) {
      toolRefs.current[tool.id] = React.createRef<HTMLDivElement>();
    }
  });

  const [animationStep, setAnimationStep] = useState(0);
  const [memorySyncActive, setMemorySyncActive] = useState(false);

  // Dynamic node states
  const initialNodeStates: Record<string, "idle" | "active" | "processing"> = {
    user: "idle",
    supervisor: "idle",
    memory: "idle",
  };

  agents.forEach((agent) => {
    initialNodeStates[agent.id] = "idle";
  });

  tools.forEach((tool) => {
    initialNodeStates[tool.id] = "idle";
  });

  const [nodeStates, setNodeStates] =
    useState<Record<string, "idle" | "active" | "processing">>(initialNodeStates);

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

    // Agent positions (vertical stack)
    const agentCount = agents.length || 1;
    const totalAgentHeight = agentSpacing * (agentCount - 1);
    const agentPositions: Record<string, { x: number; y: number }> = {};

    agents.forEach((agent, index) => {
      const y = centerY - totalAgentHeight / 2 + index * agentSpacing;
      agentPositions[agent.id] = { x: agentsX, y };
    });

    // Tool positions (vertical stack)
    const toolCount = tools.length || 1;
    const toolSpacing = 80;
    const totalToolHeight = toolSpacing * (toolCount - 1);
    const toolPositions: Record<string, { x: number; y: number }> = {};

    tools.forEach((tool, index) => {
      const y = centerY - totalToolHeight / 2 + index * toolSpacing;
      toolPositions[tool.id] = { x: toolsX, y };
    });

    return {
      // Left side
      user: { x: userX, y: centerY },

      // Center
      supervisor: { x: supervisorX, y: centerY },
      memory: { x: supervisorX, y: centerY + memoryGap },

      // Dynamic agents and tools
      agents: agentPositions,
      tools: toolPositions,

      // Midpoint between tools for beam targeting
      toolsMidpoint: { x: toolsX, y: centerY },

      // Midpoint between agents and tools for beam convergence
      agentsMidpoint: { x: agentsX + (toolsX - agentsX) / 2, y: centerY },

      // Group label positions
      groupLabelOffset,

      // For backwards compatibility (will update later)
      billing: agentPositions[agents[0]?.id] || { x: agentsX, y: centerY - agentSpacing },
      account: agentPositions[agents[1]?.id] || { x: agentsX, y: centerY },
      bug: agentPositions[agents[2]?.id] || { x: agentsX, y: centerY + agentSpacing },
      kb: toolPositions[tools[0]?.id] || { x: toolsX, y: centerY - 40 },
      crm: toolPositions[tools[1]?.id] || { x: toolsX, y: centerY + 40 },
    };
  }, [layout, agents, tools]);

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
      case 2: // Supervisor -> All Agents (parallel)
        agents.forEach((agent, index) => {
          const ref = agentRefs.current[agent.id];
          if (ref) {
            beams.push({
              from: supervisorRef,
              to: ref,
              curvature: index === 0 ? -20 : index === agents.length - 1 ? 20 : 0,
              particleDuration: 2.5,
              particleSpeed: 2.5,
            });
          }
        });
        break;
      case 3: // Agents -> Tools (direct paths, no convergence)
        agents.forEach((agent, index) => {
          const rightRef = agentRightRefs.current[agent.id];
          if (rightRef) {
            beams.push({
              from: rightRef,
              to: toolsMidpointRef,
              curvature: index === 0 ? -20 : index === agents.length - 1 ? 20 : 0,
              pathType: "curved",
              color: "#06b6d4",
              particleDuration: 2.5,
              particleSpeed: 2.5,
            });
          }
        });
        break;
      case 4: {
        // Return: Tools -> middle agent -> Supervisor
        // Get the middle agent (or first if odd number)
        const middleAgentIndex = Math.floor(agents.length / 2);
        const middleAgent = agents[middleAgentIndex];
        if (middleAgent) {
          const middleRightRef = agentRightRefs.current[middleAgent.id];
          if (middleRightRef) {
            beams.push({
              from: toolsMidpointRef,
              to: middleRightRef,
              curvature: 0,
              pathType: "curved",
              color: "#06b6d4",
              particleDuration: 2.5,
              particleSpeed: 2.5,
            });
            beams.push({
              from: middleRightRef,
              to: supervisorRightRef,
              curvature: 0,
              pathType: "curved",
              particleDuration: 2.5,
              particleSpeed: 2.5,
            });
          }
        }
        break;
      }
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
  }, [animationStep, memorySyncActive, supMemAnchors, agents]);

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
    const runAnimation = async () => {
      // Reset - create initial state dynamically
      const resetState: Record<string, "idle" | "active" | "processing"> = {
        user: "idle",
        supervisor: "idle",
        memory: "idle",
      };
      agents.forEach((agent) => {
        resetState[agent.id] = "idle";
      });
      tools.forEach((tool) => {
        resetState[tool.id] = "idle";
      });

      setAnimationStep(0);
      setNodeStates(resetState);

      await new Promise((r) => setTimeout(r, 500));

      // Step 1: User -> Supervisor
      setNodeStates((prev) => ({ ...prev, user: "active" }));
      setAnimationStep(1);
      await new Promise((r) => setTimeout(r, 1500));

      // Step 2: Supervisor -> All Agents simultaneously
      const agentProcessingState: Record<string, "idle" | "active" | "processing"> = {
        ...resetState,
        user: "idle",
        supervisor: "processing",
      };
      agents.forEach((agent) => {
        agentProcessingState[agent.id] = "processing";
      });
      setNodeStates(agentProcessingState);
      setAnimationStep(2);
      await new Promise((r) => setTimeout(r, 1500));

      // Step 3: All Agents -> Tools (forward)
      const toolsActiveState: Record<string, "idle" | "active" | "processing"> = {
        ...agentProcessingState,
        supervisor: "idle",
      };
      tools.forEach((tool) => {
        toolsActiveState[tool.id] = "active";
      });
      setNodeStates(toolsActiveState);
      setAnimationStep(3);
      await new Promise((r) => setTimeout(r, 1500));

      // Step 4: Return path - Tools -> middle agent -> Supervisor
      const returnState: Record<string, "idle" | "active" | "processing"> = {
        ...resetState,
        supervisor: "processing",
      };
      // Keep middle agent active
      const middleAgentIndex = Math.floor(agents.length / 2);
      if (agents[middleAgentIndex]) {
        returnState[agents[middleAgentIndex].id] = "active";
      }
      setNodeStates(returnState);
      setAnimationStep(4);
      await new Promise((r) => setTimeout(r, 1500));

      // Step 5: Supervisor -> User (final response)
      setNodeStates((prev) => ({
        ...prev,
        supervisor: "active",
        user: "processing",
        memory: "idle",
        ...(agents[middleAgentIndex] ? { [agents[middleAgentIndex].id]: "idle" } : {}),
      }));
      setAnimationStep(5);
      await new Promise((r) => setTimeout(r, 1500));

      // Final state
      setNodeStates(resetState);
      setAnimationStep(0);

      // Wait then restart
      await new Promise((r) => setTimeout(r, 2000));
      runAnimation();
    };

    const timer = setTimeout(() => {
      runAnimation();
    }, 1000);

    return () => clearTimeout(timer);
  }, [agents, tools]);

  return (
    <div
      ref={containerRef}
      className={clsx(
        "relative w-full h-[500px] md:h-[450px] overflow-x-hidden overflow-y-hidden px-4 md:px-8",
        "bg-gradient-to-br from-gray-950 via-gray-900 to-black rounded-xl",
        className,
      )}
    >
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
      {agents.length > 0 && (
        <div
          className="absolute text-emerald-400 text-sm font-semibold tracking-wider uppercase"
          style={{
            left: layout.agentsX,
            top:
              Math.min(...agents.map((a) => positions.agents[a.id].y)) -
              positions.groupLabelOffset -
              35,
            transform: "translateX(-50%)",
          }}
        >
          Sub-Agents
        </div>
      )}

      {/* Render Dynamic Agents */}
      {agents.map((agent) => {
        const Icon = getIcon(agent.icon);
        const position = positions.agents[agent.id];

        return (
          <div
            key={agent.id}
            className="absolute"
            style={{
              left: position.x,
              top: position.y,
              transform: "translate(-50%, -50%)",
            }}
          >
            <div className="relative">
              <NodeCard
                label={agent.label}
                sublabel={agent.sublabel}
                icon={Icon}
                refProp={agentRefs.current[agent.id]}
                variant="agent"
                status={nodeStates[agent.id]}
              />
              {/* Right edge connection point */}
              <div
                ref={agentRightRefs.current[agent.id]}
                className="absolute w-1 h-1"
                style={{ right: 0, top: "50%", transform: "translateY(-50%)" }}
              />
            </div>
          </div>
        );
      })}

      {/* Tools Group Label - Centered above the group */}
      {tools.length > 0 && (
        <div
          className="absolute text-cyan-400 text-sm font-semibold tracking-wider uppercase"
          style={{
            left: positions.toolsMidpoint.x,
            top:
              Math.min(...tools.map((t) => positions.tools[t.id].y)) -
              positions.groupLabelOffset -
              35,
            transform: "translateX(-50%)",
          }}
        >
          Tools
        </div>
      )}

      {/* Render Dynamic Tools */}
      {tools.map((tool) => {
        const Icon = getIcon(tool.icon);
        const position = positions.tools[tool.id];

        return (
          <div
            key={tool.id}
            className="absolute"
            style={{
              left: position.x,
              top: position.y,
              transform: "translate(-50%, -50%)",
            }}
          >
            <NodeCard
              label={tool.label}
              sublabel={tool.sublabel}
              icon={Icon}
              refProp={toolRefs.current[tool.id]}
              variant="tool"
              status={nodeStates[tool.id]}
            />
          </div>
        );
      })}

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

      {/* All paths are handled by animated beams during the animation sequence */}

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
