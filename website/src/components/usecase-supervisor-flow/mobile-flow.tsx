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
import {
  Background,
  ConnectionMode,
  type Edge,
  Handle,
  MarkerType,
  type Node,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import clsx from "clsx";
import type React from "react";
import { useCallback, useEffect, useState } from "react";

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

interface MobileFlowProps {
  slug: string;
  className?: string;
  agents?: AgentNode[];
  tools?: ToolNode[];
}

// Node styles optimized for mobile
const nodeStyles = {
  user: "border-solid border-blue-400/60 text-blue-300 bg-[#0A0F15]/80 px-2 py-1.5 text-xs rounded-lg min-w-[70px] flex flex-col items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.3)]",
  supervisor:
    "border-solid border-[#00d992]/60 text-[#00d992] bg-[#0A0F15]/80 px-2 py-1.5 text-xs rounded-lg min-w-[70px] flex flex-col items-center justify-center shadow-[0_0_15px_rgba(0,217,146,0.3)]",
  agent:
    "border-solid border-emerald-400/50 text-emerald-300 bg-[#0A0F15]/80 px-2 py-1 text-[10px] rounded-lg min-w-[60px] flex flex-col items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.2)]",
  tool: "border-solid border-cyan-400/50 text-cyan-300 bg-[#0A0F15]/80 px-2 py-1 text-[10px] rounded-lg min-w-[60px] flex flex-col items-center justify-center shadow-[0_0_10px_rgba(6,182,212,0.2)]",
  memory:
    "border-solid border-purple-400/50 text-purple-300 bg-[#0A0F15]/80 px-2 py-1.5 text-xs rounded-lg min-w-[80px] flex flex-col items-center justify-center shadow-[0_0_15px_rgba(147,51,234,0.3)]",
};

type NodeData = {
  label: React.ReactNode;
  className: string;
};

// Custom node component
const CustomNode = ({ data }: { data: NodeData }) => (
  <div className={data.className}>
    {data.label}
    <Handle
      id="left"
      type="target"
      position={Position.Left}
      style={{ background: "transparent", border: "none", top: "50%" }}
      isConnectable={false}
    />
    <Handle
      id="right"
      type="source"
      position={Position.Right}
      style={{ background: "transparent", border: "none", top: "50%" }}
      isConnectable={false}
    />
    <Handle
      id="top"
      type="target"
      position={Position.Top}
      style={{ background: "transparent", border: "none", left: "50%" }}
      isConnectable={false}
    />
    <Handle
      id="bottom"
      type="source"
      position={Position.Bottom}
      style={{ background: "transparent", border: "none", left: "50%" }}
      isConnectable={false}
    />
  </div>
);

// Create node helper
const createNode = (
  id: string,
  position: { x: number; y: number },
  label: React.ReactNode,
  className: string,
): Node => ({
  id,
  position,
  data: { label, className },
  type: "custom",
  draggable: false,
});

// Mobile-optimized positions with better alignment
const mobilePositions = {
  user: { x: 80, y: 139 }, // Centered in viewport
  supervisor: { x: 200, y: 129 }, // Exactly same Y as user for straight line
  memory: { x: 195, y: 250 }, // Below supervisor
  // Agents vertically centered around y=160
  billing: { x: 340, y: 110 },
  account: { x: 340, y: 150 }, // Same Y as user/supervisor for single path
  bug: { x: 340, y: 190 },
  // Tools positioned symmetrically
  kb: { x: 470, y: 130 },
  crm: { x: 470, y: 170 },
  // Midpoints for single path connections
  agentsMidpoint: { x: 340, y: 150 }, // Not used anymore but kept for compatibility
  toolsMidpoint: { x: 470, y: 162 }, // Exact center between kb (140) and crm (180) = (140+180)/2 = 160
};

// Initial nodes for mobile
const createInitialNodes = (): Node[] => [
  createNode(
    "user",
    mobilePositions.user,
    <div className="flex flex-col items-center gap-0.5">
      <UserIcon className="w-4 h-4" />
      <span className="text-[10px]">User</span>
    </div>,
    nodeStyles.user,
  ),
  createNode(
    "supervisor",
    mobilePositions.supervisor,
    <div className="flex flex-col items-center gap-0.5">
      <CpuChipIcon className="w-4 h-4" />
      <span className="text-[10px]">Supervisor</span>
      <span className="text-[8px] opacity-70">Support</span>
    </div>,
    nodeStyles.supervisor,
  ),
  createNode(
    "memory",
    mobilePositions.memory,
    <div className="flex flex-col items-center gap-0.5">
      <ClipboardDocumentListIcon className="w-4 h-4" />
      <span className="text-[10px]">Memory</span>
    </div>,
    nodeStyles.memory,
  ),
  createNode(
    "billing",
    mobilePositions.billing,
    <div className="flex items-center gap-1">
      <CreditCardIcon className="w-3 h-3" />
      <span className="text-[9px]">Billing</span>
    </div>,
    nodeStyles.agent,
  ),
  createNode(
    "account",
    mobilePositions.account,
    <div className="flex items-center gap-1">
      <QuestionMarkCircleIcon className="w-3 h-3" />
      <span className="text-[9px]">Account</span>
    </div>,
    nodeStyles.agent,
  ),
  createNode(
    "bug",
    mobilePositions.bug,
    <div className="flex items-center gap-1">
      <BugAntIcon className="w-3 h-3" />
      <span className="text-[9px]">Bug</span>
    </div>,
    nodeStyles.agent,
  ),
  createNode(
    "kb",
    mobilePositions.kb,
    <div className="flex items-center gap-1">
      <BookOpenIcon className="w-3 h-3" />
      <span className="text-[9px]">KB</span>
    </div>,
    nodeStyles.tool,
  ),
  createNode(
    "crm",
    mobilePositions.crm,
    <div className="flex items-center gap-1">
      <BuildingLibraryIcon className="w-3 h-3" />
      <span className="text-[9px]">CRM</span>
    </div>,
    nodeStyles.tool,
  ),
  // Invisible midpoint nodes for single path connections
  createNode(
    "agentsMidpoint",
    mobilePositions.agentsMidpoint,
    <div style={{ width: "1px", height: "1px", opacity: 0 }} />,
    "",
  ),
  createNode(
    "toolsMidpoint",
    mobilePositions.toolsMidpoint,
    <div style={{ width: "1px", height: "1px", opacity: 0 }} />,
    "",
  ),
];

// Create edge helper
const createEdge = (
  id: string,
  source: string,
  target: string,
  color: string,
  animated = true,
  sourceHandle?: string,
  targetHandle?: string,
  edgeType: "straight" | "smoothstep" = "smoothstep",
): Edge => ({
  id,
  source,
  target,
  animated,
  style: {
    stroke: color,
    strokeWidth: 1.5,
  },
  type: edgeType,
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color,
    width: 15,
    height: 15,
  },
  sourceHandle,
  targetHandle,
});

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

export function MobileFlow({ slug, className, agents = [], tools = [] }: MobileFlowProps) {
  // Create dynamic initial nodes based on agents and tools
  const createDynamicInitialNodes = (): Node[] => {
    const staticNodes: Node[] = [
      createNode(
        "user",
        mobilePositions.user,
        <div className="flex flex-col items-center gap-0.5">
          <UserIcon className="w-4 h-4" />
          <span className="text-[10px]">User</span>
        </div>,
        nodeStyles.user,
      ),
      createNode(
        "supervisor",
        mobilePositions.supervisor,
        <div className="flex flex-col items-center gap-0.5">
          <CpuChipIcon className="w-4 h-4" />
          <span className="text-[10px]">Supervisor</span>
          <span className="text-[8px] opacity-70">System</span>
        </div>,
        nodeStyles.supervisor,
      ),
      createNode(
        "memory",
        mobilePositions.memory,
        <div className="flex flex-col items-center gap-0.5">
          <ClipboardDocumentListIcon className="w-4 h-4" />
          <span className="text-[10px]">Memory</span>
        </div>,
        nodeStyles.memory,
      ),
    ];

    // Add dynamic agent nodes
    const agentNodes = agents.map((agent, index) => {
      const Icon = getIcon(agent.icon);
      const y = 110 + index * 40; // Vertical spacing
      return createNode(
        agent.id,
        { x: 340, y },
        <div className="flex items-center gap-1">
          <Icon className="w-3 h-3" />
          <span className="text-[9px]">{agent.label}</span>
        </div>,
        nodeStyles.agent,
      );
    });

    // Add dynamic tool nodes
    const toolNodes = tools.map((tool, index) => {
      const Icon = getIcon(tool.icon);
      const y = 130 + index * 40; // Vertical spacing
      return createNode(
        tool.id,
        { x: 470, y },
        <div className="flex items-center gap-1">
          <Icon className="w-3 h-3" />
          <span className="text-[9px]">{tool.label}</span>
        </div>,
        nodeStyles.tool,
      );
    });

    return [...staticNodes, ...agentNodes, ...toolNodes];
  };

  const [nodes, setNodes] = useNodesState(createDynamicInitialNodes());
  const [edges, setEdges] = useEdgesState([]);
  const [_animationStep, setAnimationStep] = useState(0);

  // Reset nodes when component mounts/remounts
  useEffect(() => {
    setNodes(createInitialNodes());
  }, [setNodes]);

  // Animation sequence with single centered paths
  const startAnimation = useCallback(() => {
    const steps: (() => void)[] = [
      // Step 1: User -> Supervisor (right side of user to left side of supervisor)
      () => {
        setEdges([
          createEdge(
            "user-supervisor",
            "user",
            "supervisor",
            "#3b82f6",
            true,
            "right",
            "left",
            "straight",
          ),
        ]);
        setAnimationStep(1);
      },
      // Step 2: Supervisor -> Middle Agent (account) only
      () => {
        setEdges([
          createEdge(
            "supervisor-account",
            "supervisor",
            "account",
            "#00d992",
            true,
            "right",
            "left",
          ),
        ]);
        setAnimationStep(2);
      },
      // Step 3: Account -> Tools midpoint (single path only)
      () => {
        setEdges([
          createEdge("account-tools", "account", "toolsMidpoint", "#06b6d4", true, "right", "left"),
        ]);
        setAnimationStep(3);
      },
      // Step 4: Tools -> Account -> Supervisor (return path)
      () => {
        setEdges([
          createEdge("tools-account", "toolsMidpoint", "account", "#06b6d4", true, "left", "right"),
          createEdge(
            "account-supervisor",
            "account",
            "supervisor",
            "#06b6d4",
            true,
            "left",
            "right",
          ),
        ]);
        setAnimationStep(4);
      },
      // Step 5: Supervisor -> User (final, left side of supervisor to right side of user)
      () => {
        setEdges([
          createEdge(
            "supervisor-user",
            "supervisor",
            "user",
            "#00d992",
            true,
            "left",
            "right",
            "straight",
          ),
        ]);
        setAnimationStep(5);
      },
    ];

    // Memory sync edges (always visible during steps 2-4)
    const memoryEdges = [
      createEdge(
        "supervisor-memory",
        "supervisor",
        "memory",
        "#9333ea",
        true,
        "bottom",
        "top",
        "straight",
      ),
      createEdge(
        "memory-supervisor",
        "memory",
        "supervisor",
        "#9333ea",
        true,
        "top",
        "bottom",
        "straight",
      ),
    ];

    let currentStep = 0;
    const stepDuration = 1500; // 1.5 seconds per step

    const runStep = () => {
      if (currentStep < steps.length) {
        steps[currentStep]();

        // Add memory sync during middle steps
        if (currentStep >= 1 && currentStep < 4) {
          setEdges((prev) => [...prev, ...memoryEdges]);
        }

        currentStep++;
        setTimeout(runStep, stepDuration);
      } else {
        // Reset and restart
        setTimeout(() => {
          setEdges([]);
          setAnimationStep(0);
          currentStep = 0;
          setTimeout(runStep, 200);
        }, stepDuration);
      }
    };

    runStep();
  }, [setEdges]);

  // Start animation on mount
  useEffect(() => {
    if (slug === "customer-support-agent") {
      const timer = setTimeout(() => {
        startAnimation();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [slug, startAnimation]);

  const nodeTypes = {
    custom: CustomNode,
  };

  return (
    <div
      className={clsx(
        "relative w-full h-[350px] overflow-hidden",
        "bg-gradient-to-br from-gray-950 via-gray-900 to-black rounded-xl",
        className,
      )}
    >
      {/* Background glow effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[40%] left-[35%] -translate-x-1/2 -translate-y-1/2 w-[200px] h-[150px] rounded-full bg-[#00d992]/15 blur-[80px]" />
        <div className="absolute top-[40%] left-[65%] -translate-x-1/2 -translate-y-1/2 w-[150px] h-[100px] rounded-full bg-[#00d992]/10 blur-[60px]" />
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{
          padding: 0.15,
          maxZoom: 0.9,
          minZoom: 0.7,
        }}
        minZoom={0.7}
        maxZoom={0.9}
        zoomOnScroll={false}
        zoomOnPinch={false}
        panOnScroll={false}
        panOnDrag={false}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#1e293b" gap={20} size={1} />
      </ReactFlow>
    </div>
  );
}
