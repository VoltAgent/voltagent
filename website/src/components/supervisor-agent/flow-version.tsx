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
import { useCallback, useEffect, useState } from "react";

type FlowVersionProps = {
  isVisible: boolean;
};

// Custom node styles
const nodeStyles = {
  user: "border-solid border-[#34d399] text-[#ffff] bg-[#0A0F15] px-2 py-1 text-xs rounded min-w-[80px] flex flex-col items-center justify-center shadow-[0_0_15px_rgba(52,211,153,0.3)]",
  supervisor:
    "border-solid border-[#818cf8] text-[#ffff] bg-[#0A0F15] px-2 py-1 text-xs rounded min-w-[80px] flex flex-col items-center justify-center shadow-[0_0_15px_rgba(129,140,248,0.3)]",
  agentA:
    "border-solid border-[#60a5fa] text-[#ffff] bg-[#0A0F15] px-2 py-1 text-xs rounded min-w-[80px] flex flex-col items-center justify-center shadow-[0_0_15px_rgba(96,165,250,0.3)]",
  agentB:
    "border-solid border-[#2dd4bf] text-[#ffff] bg-[#0A0F15] px-2 py-1 text-xs rounded min-w-[80px] flex flex-col items-center justify-center shadow-[0_0_15px_rgba(45,212,191,0.3)]",
  agentC:
    "border-solid border-[#a855f7] text-[#ffff] bg-[#0A0F15] px-2 py-1 text-xs rounded min-w-[80px] flex flex-col items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.3)]",
  memory:
    "border-solid border-[#4b5563] text-[#ffff] bg-[#0A0F15] px-2 py-1 text-xs rounded min-w-[100px] flex flex-col items-center justify-center gap-1 shadow-[0_0_15px_rgba(75,85,99,0.3)]",
  groupLabel: "text-[#34d399] absolute -top-6 left-0 text-xs",
  thinkinglabel: "text-[#34d399] absolute -top-6 left-0 text-xs",
  teamlabel: "text-[#34d399] absolute -top-8 left-0 text-xs",
  historyLabel: "text-[#34d399] absolute top-[180px] left-[350px] text-xs",
};

type NodeData = {
  label: React.ReactNode;
  className: string;
};

const CustomNode = ({ data }: { data: NodeData }) => (
  <div className={data.className}>
    {data.label}
    {/* Default handles for User and Supervisor */}
    <Handle
      id="default-target"
      type="target"
      position={Position.Left}
      style={{ background: "transparent", border: "none", top: "50%" }}
      isConnectable={false}
    />
    <Handle
      id="default-source"
      type="source"
      position={Position.Right}
      style={{ background: "transparent", border: "none", top: "50%" }}
      isConnectable={false}
    />
    {/* Special handles for Agent nodes */}
    <Handle
      id="agent-target"
      type="target"
      position={Position.Left}
      style={{ background: "transparent", border: "none", top: "50%" }}
      isConnectable={false}
    />
    {/* Memory handles */}
    <Handle
      id="memory-source"
      type="source"
      position={Position.Bottom}
      style={{ background: "transparent", border: "none" }}
      isConnectable={false}
    />
    <Handle
      id="memory-target"
      type="target"
      position={Position.Top}
      style={{ background: "transparent", border: "none" }}
      isConnectable={false}
    />
  </div>
);

const createAgentNode = (
  id: string,
  position: { x: number; y: number },
  label: string,
  model: string,
  className: string,
) => ({
  id,
  position,
  data: {
    label: (
      <div className="relative">
        <span
          className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] opacity-0 transition-opacity duration-300 text-white"
          data-status
        >
          executing...
        </span>
        <div className="flex flex-col items-center gap-1">
          <span>{label}</span>
          <span className="text-[10px] opacity-70">{model}</span>
        </div>
      </div>
    ),
    className,
  },
  type: "custom",
  draggable: false,
});

const initialNodes: Node[] = [
  {
    id: "user",
    position: { x: 100, y: 85 },
    data: {
      label: (
        <div className="flex flex-col items-center gap-1">
          <span>User</span>
        </div>
      ),
      className: nodeStyles.user,
    },
    type: "custom",
    draggable: false,
  },
  {
    id: "supervisor-group",
    position: { x: 300, y: 60 },
    data: {
      label: (
        <div className="relative">
          <span className={nodeStyles.groupLabel}>Lead Agent</span>
          <span
            className="absolute  left-1/2 -translate-x-1/2 text-[10px] opacity-0 transition-opacity duration-300 text-[#6366f1]"
            data-thinking
          >
            Thinking...
          </span>
          <div className="border border-dashed border-[#6366f1] rounded-lg p-4 bg-[rgba(99,102,241,0.02)]">
            <div className={nodeStyles.supervisor}>
              <span>Supervisor</span>
              <span className="text-[10px] opacity-70">gpt-4o-mini</span>
            </div>
          </div>
        </div>
      ),
      className: "",
    },
    type: "custom",
    draggable: false,
  },
  {
    id: "agent-a",
    position: { x: 500, y: 0 },
    data: {
      label: (
        <div className="relative">
          <span className={nodeStyles.teamlabel}>Team</span>
          <span
            className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] opacity-0 transition-opacity duration-300 text-white"
            data-status
          >
            executing...
          </span>
          <div className="flex flex-col items-center gap-1">
            <span>Agent A</span>
            <span className="text-[10px] opacity-70">claude-3.7</span>
          </div>
        </div>
      ),
      className: nodeStyles.agentA,
    },
    type: "custom",
    draggable: false,
  },
  createAgentNode("agent-b", { x: 500, y: 75 }, "Agent B", "gpt-4", nodeStyles.agentB),
  createAgentNode("agent-c", { x: 500, y: 150 }, "Agent C", "Custom LLM", nodeStyles.agentC),
  {
    id: "team-line",
    position: { x: 485, y: 220 },
    data: {
      label: <div className="w-[130px] h-[1px] bg-[#4b5563]" />,
      className: "",
    },
    type: "custom",
    draggable: false,
  },
  {
    id: "conversation-history",
    position: { x: 0, y: 0 },
    data: {
      label: <span className={nodeStyles.historyLabel}>Conversation-History</span>,
    },
    type: "custom",
    draggable: false,
  },
  {
    id: "user-lead-memory",
    position: { x: 307, y: 250 },
    data: {
      label: (
        <div className="flex flex-col items-center gap-1">
          <span>User-Lead</span>
          <span>Memory</span>
        </div>
      ),
      className: nodeStyles.memory,
    },
    type: "custom",
    draggable: false,
  },
  {
    id: "lead-team-memory",
    position: { x: 500, y: 250 },
    data: {
      label: (
        <div className="flex flex-col items-center gap-1">
          <span>Lead-Team</span>
          <span>Memory</span>
        </div>
      ),
      className: nodeStyles.memory,
    },
    type: "custom",
    draggable: false,
  },
];

const initialEdges: Edge[] = [];

const createEdge = (source: string, target: string, color: string, isResponse = false): Edge => {
  const edge: Edge = {
    id: `${source}-${target}`,
    source: isResponse ? target : source,
    target: isResponse ? source : target,
    animated: true,
    style: {
      stroke: color,
      strokeWidth: 1,
      strokeDasharray: "4 4",
    },
    className: "animate-pulse",
    type: "smoothstep",
    markerStart: {
      type: MarkerType.Arrow,
      color: color,
      width: 20,
      height: 20,
    },
    markerEnd: {
      type: MarkerType.Arrow,
      color: color,
      width: 20,
      height: 20,
    },
    data: {
      marker: <circle r="4" fill={color} className="animate-[moveAlongPath_2s_linear_infinite]" />,
    },
    sourceHandle: isResponse ? "default-target" : "default-source",
    targetHandle: isResponse ? "default-source" : "default-target",
  };
  return edge;
};
const createUserEdge = (
  source: string,
  target: string,
  color: string,
  isResponse = false,
): Edge => {
  const edge: Edge = {
    id: `${source}-${target}`,
    source: isResponse ? target : source,
    target: isResponse ? source : target,
    animated: true,
    style: {
      stroke: color,
      strokeWidth: 1,
      strokeDasharray: "4 4",
    },
    className: "animate-pulse",
    type: "smoothstep",

    markerEnd: {
      type: MarkerType.Arrow,
      color: color,
      width: 20,
      height: 20,
    },
    data: {
      marker: <circle r="4" fill={color} className="animate-[moveAlongPath_2s_linear_infinite]" />,
    },
    sourceHandle: isResponse ? "default-target" : "default-source",
    targetHandle: isResponse ? "default-source" : "default-target",
  };
  return edge;
};

const createMemoryEdge = (source: string, target: string): Edge => ({
  id: `${source}-${target}`,
  source,
  target,
  animated: true,
  style: {
    stroke: "#4b5563",
    strokeWidth: 1,
    strokeDasharray: "4 4",
  },
  type: "smoothstep",
  markerEnd: {
    type: MarkerType.Arrow,
    color: "#4b5563",
    width: 15,
    height: 15,
  },
  markerStart: {
    type: MarkerType.Arrow,
    color: "#4b5563",
    width: 15,
    height: 15,
  },
  sourceHandle: "memory-source",
  targetHandle: "memory-target",
  data: {
    marker: <circle r="4" fill="#4b5563" className="animate-[moveAlongPath_2s_linear_infinite]" />,
  },
});

export const FlowVersion = ({ isVisible }: FlowVersionProps) => {
  const [nodes, _, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [__, setAnimationStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const startAnimation = useCallback(() => {
    setIsAnimating(true);
    setAnimationStep(0);
    setEdges([]);

    const showExecuting = (agentId: string) => {
      const agentNode = document.querySelector(`[data-id="${agentId}"] [data-status]`);
      if (agentNode) {
        agentNode.classList.remove("opacity-0");
        agentNode.classList.add("opacity-70");
      }
    };

    const hideExecuting = (agentId: string) => {
      const agentNode = document.querySelector(`[data-id="${agentId}"] [data-status]`);
      if (agentNode) {
        agentNode.classList.remove("opacity-70");
        agentNode.classList.add("opacity-0");
      }
    };

    const showThinking = () => {
      const supervisorNode = document.querySelector(`[data-id="supervisor-group"] [data-thinking]`);
      if (supervisorNode) {
        supervisorNode.classList.remove("opacity-0");
        supervisorNode.classList.add("opacity-70");
      }
    };

    const hideThinking = () => {
      const supervisorNode = document.querySelector(`[data-id="supervisor-group"] [data-thinking]`);
      if (supervisorNode) {
        supervisorNode.classList.remove("opacity-70");
        supervisorNode.classList.add("opacity-0");
      }
    };

    const steps = [
      // Step 1: User to Supervisor (Request) + Memory connection
      () => {
        setEdges([
          createUserEdge("user", "supervisor-group", "#4ade80"),
          createMemoryEdge("supervisor-group", "user-lead-memory"),
          createMemoryEdge("team-line", "lead-team-memory"),
        ]);
      },

      // Step 2: Clear request connection
      () => {
        setEdges([createMemoryEdge("supervisor-group", "user-lead-memory")]);
      },

      // Step 3: Supervisor to Agent A (Request + Response)
      () => {
        setEdges([
          createMemoryEdge("supervisor-group", "user-lead-memory"),
          createMemoryEdge("team-line", "lead-team-memory"),
          createEdge("supervisor-group", "agent-a", "#60a5fa"),
        ]);
        setTimeout(() => showExecuting("agent-a"), 50);
        setTimeout(() => hideExecuting("agent-a"), 2000);
      },

      // Step 4: Supervisor to Agent B (Request + Response)
      () => {
        setEdges([
          createMemoryEdge("supervisor-group", "user-lead-memory"),
          createMemoryEdge("team-line", "lead-team-memory"),
          createEdge("supervisor-group", "agent-b", "#2dd4bf"),
        ]);
        setTimeout(() => showExecuting("agent-b"), 50);
        setTimeout(() => hideExecuting("agent-b"), 2000);
      },

      // Step 5: Supervisor to Agent C (Request + Response)
      () => {
        setEdges([
          createMemoryEdge("supervisor-group", "user-lead-memory"),
          createMemoryEdge("team-line", "lead-team-memory"),
          createEdge("supervisor-group", "agent-c", "#a855f7"),
        ]);
        setTimeout(() => showExecuting("agent-c"), 50);
        setTimeout(() => hideExecuting("agent-c"), 2000);
      },

      // Step 6: Supervisor thinking after all agent responses
      () => {
        setEdges([
          createMemoryEdge("supervisor-group", "user-lead-memory"),
          createMemoryEdge("team-line", "lead-team-memory"),
        ]);
        showThinking();
        setTimeout(() => hideThinking(), 2000);
      },

      // Step 7: Final response back to User
      () => {
        setEdges([
          createEdge("user", "supervisor-group", "#34d399", true),
          createMemoryEdge("supervisor-group", "user-lead-memory"),
          createMemoryEdge("team-line", "lead-team-memory"),
        ]);
        // Reset and restart animation after final response
        setTimeout(() => {
          setEdges([]);
          setIsAnimating(false);
          startAnimation();
        }, 1000);
      },
    ];

    const stepDurations = [
      1000, // User -> Supervisor + User-Lead Memory
      2000, // Supervisor -> Agent A
      2000, // Supervisor -> Agent B
      2000, // Supervisor -> Agent C
      2000, // Supervisor thinking
      1000, // Final response
    ];

    let currentStep = 0;

    const animateNextStep = () => {
      if (currentStep < steps.length) {
        setTimeout(() => {
          steps[currentStep]();
          setAnimationStep(currentStep + 1);
          currentStep++;
          if (currentStep < steps.length) {
            animateNextStep();
          }
        }, stepDurations[currentStep]);
      }
    };

    animateNextStep();
  }, [setEdges]);

  useEffect(() => {
    if (isVisible && !isAnimating) {
      startAnimation();
    }
  }, [isVisible, isAnimating, startAnimation]);

  useEffect(() => {
    // Add keyframes for the marker animation
    const style = document.createElement("style");
    style.textContent = `
      @keyframes moveAlongPath {
        0% {
          offset-distance: 0%;
        }
        100% {
          offset-distance: 100%;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const nodeTypes = {
    custom: CustomNode,
  };

  const proOptions = { hideAttribution: true };

  return (
    <div className="w-full h-[425px] bg-[#3A42594D] backdrop-blur-md">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        className="bg-[#00000033] [&_.react-flow__node]:!bg-[#00000033] [&_.react-flow__node]:!bg-opacity-100"
        minZoom={0.5}
        maxZoom={2}
        zoomOnScroll={false}
        zoomOnPinch={false}
        panOnScroll={false}
        panOnDrag={false}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={proOptions}
      >
        <Background />
        <defs>
          <marker
            id="moving-dot"
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerWidth="5"
            markerHeight="5"
          >
            <circle cx="5" cy="5" r="4" fill="currentColor" />
          </marker>
        </defs>
      </ReactFlow>
    </div>
  );
};
