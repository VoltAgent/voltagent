import { ArrowPathIcon, CpuChipIcon, UserCircleIcon } from "@heroicons/react/24/outline";
import { useMediaQuery } from "@site/src/hooks/use-media-query";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatedBeam } from "../magicui/animated-beam";

interface WorkflowCodeExampleProps {
  isVisible: boolean;
}

// Unified color scheme - softer, less eye-straining colors
const colors = {
  user: {
    border: "border-emerald-400/70",
    text: "text-emerald-300",
    shadow: "shadow-[0_0_15px_rgba(52,211,153,0.3)]",
    activeShadow: "shadow-[0_0_20px_rgba(52,211,153,0.5)]",
    beam: "#34d399",
    beamOpacity: "rgba(52, 211, 153, 0.4)",
  },
  workflow: {
    border: "border-rose-400/70",
    text: "text-rose-300",
    shadow: "shadow-[0_0_15px_rgba(251,113,133,0.3)]",
    activeShadow: "shadow-[0_0_20px_rgba(251,113,133,0.5)]",
    beam: "#fb7185",
    beamOpacity: "rgba(251, 113, 133, 0.4)",
  },
  agentA: {
    border: "border-blue-400/70",
    text: "text-blue-300",
    shadow: "shadow-[0_0_15px_rgba(96,165,250,0.3)]",
    activeShadow: "shadow-[0_0_20px_rgba(96,165,250,0.5)]",
    beam: "#60a5fa",
    beamOpacity: "rgba(96, 165, 250, 0.4)",
  },
  agentB: {
    border: "border-teal-400/70",
    text: "text-teal-300",
    shadow: "shadow-[0_0_15px_rgba(45,212,191,0.3)]",
    activeShadow: "shadow-[0_0_20px_rgba(45,212,191,0.5)]",
    beam: "#2dd4bf",
    beamOpacity: "rgba(45, 212, 191, 0.4)",
  },
  codeHighlight: {
    step: "text-purple-400",
    entity: "text-blue-400",
    softGlow: "text-shadow-neon",
  },
};

type NodeRef = React.RefObject<HTMLDivElement>;

interface WorkflowCodeBlockProps {
  animationStep: number;
}

const WorkflowCodeBlock = ({ animationStep }: WorkflowCodeBlockProps) => {
  const isAgentStep = animationStep === 3 || animationStep === 4;

  return (
    <div className={`border-r ${colors.workflow.border}`}>
      <pre className="text-left h-full bg-transparent overflow-x-auto p-0 text-sm font-mono m-0">
        <div className="flex">
          <div className="py-5 px-2 text-right text-gray-500 select-none border-r border-gray-700/50 min-w-[40px] text-xs">
            <div>1</div>
            <div>2</div>
            <div>3</div>
            <div>4</div>
            <div>5</div>
            <div>6</div>
            <div>7</div>
            <div>8</div>
          </div>
          <code className="py-5 px-3 block text-xs">
            <span
              className={`text-blue-400 transition-all duration-500 ease-in-out ${
                animationStep === 1 ? "text-shadow-neon-blue font-bold" : ""
              }`}
            >
              createWorkflowChain
            </span>
            <span className="text-gray-300">()</span>
            <br />
            <span
              className={`text-purple-400 ml-2 transition-all duration-500 ease-in-out ${
                animationStep === 2 ? "text-shadow-neon-purple font-bold" : ""
              }`}
            >
              .andAll
            </span>
            <span className="text-gray-300">({"{"}</span>
            <br />
            <span className="text-gray-300 ml-4">id: </span>
            <span className="text-green-400">"fetch-user-data-steps"</span>
            <span className="text-gray-300">,</span>
            <br />
            <span className="text-gray-300 ml-4">steps: [</span>
            <br />
            <span
              className={`text-blue-400 ml-6 transition-all duration-500 ease-in-out ${
                isAgentStep ? "text-shadow-neon-blue font-bold" : ""
              }`}
            >
              andAgent
            </span>
            <span className="text-gray-300">(</span>
            <span
              className={`text-teal-400 transition-all duration-500 ease-in-out ${
                isAgentStep ? "text-shadow-neon font-bold" : ""
              }`}
            >
              contentAgent
            </span>
            <span className="text-gray-300">),</span>
            <br />
            <span
              className={`text-blue-400 ml-6 transition-all duration-500 ease-in-out ${
                isAgentStep ? "text-shadow-neon-blue font-bold" : ""
              }`}
            >
              andAgent
            </span>
            <span className="text-gray-300">(</span>
            <span
              className={`text-rose-400 transition-all duration-500 ease-in-out ${
                isAgentStep ? "text-shadow-neon font-bold" : ""
              }`}
            >
              analysisAgent
            </span>
            <span className="text-gray-300">),</span>
            <br />
            <span className="text-gray-300 ml-4">],</span>
            <br />
            <span className="text-gray-300 ml-2">{"}"}</span>
            <span className="text-gray-300">)</span>
          </code>
        </div>
      </pre>
    </div>
  );
};

interface WorkflowDiagramProps {
  isMobile: boolean;
  animationStep: number;
  showFullDiagram: boolean;
  diagramRef: NodeRef;
  userNodeRef: NodeRef;
  workflowNodeRef: NodeRef;
  agentOneNodeRef: NodeRef;
  agentTwoNodeRef: NodeRef;
}

const WorkflowDiagram = ({
  isMobile,
  animationStep,
  showFullDiagram,
  diagramRef,
  userNodeRef,
  workflowNodeRef,
  agentOneNodeRef,
  agentTwoNodeRef,
}: WorkflowDiagramProps) => {
  return (
    <div
      className={`w-full relative ${isMobile ? "min-h-[400px]" : "min-h-[250px] mr-12"}`}
      ref={diagramRef}
    >
      <div
        className={`w-full h-full flex items-center justify-center py-4 ${
          showFullDiagram ? "opacity-100" : "opacity-90"
        } transition-opacity duration-500`}
      >
        <WorkflowNodes
          isMobile={isMobile}
          animationStep={animationStep}
          userNodeRef={userNodeRef}
          workflowNodeRef={workflowNodeRef}
          agentOneNodeRef={agentOneNodeRef}
          agentTwoNodeRef={agentTwoNodeRef}
        />
        <WorkflowBeams
          isMobile={isMobile}
          animationStep={animationStep}
          diagramRef={diagramRef}
          userNodeRef={userNodeRef}
          workflowNodeRef={workflowNodeRef}
          agentOneNodeRef={agentOneNodeRef}
          agentTwoNodeRef={agentTwoNodeRef}
        />
      </div>
    </div>
  );
};

interface WorkflowNodesProps {
  isMobile: boolean;
  animationStep: number;
  userNodeRef: NodeRef;
  workflowNodeRef: NodeRef;
  agentOneNodeRef: NodeRef;
  agentTwoNodeRef: NodeRef;
}

const WorkflowNodes = ({
  isMobile,
  animationStep,
  userNodeRef,
  workflowNodeRef,
  agentOneNodeRef,
  agentTwoNodeRef,
}: WorkflowNodesProps) => {
  const isUserActive = animationStep === 5 || animationStep === 6;
  const isWorkflowActive = animationStep >= 2;
  const isWorkflowSpinning = animationStep > 2;
  const isAgentActive = animationStep === 3;

  const agentOnePosition = isMobile
    ? "top-[70%] left-[30%] transform -translate-x-1/2"
    : "top-[25%] left-[75%] transform -translate-y-1/2";
  const agentTwoPosition = isMobile
    ? "top-[70%] left-[70%] transform -translate-x-1/2"
    : "top-[75%] left-[75%] transform -translate-y-1/2";

  return (
    <>
      <UserNode nodeRef={userNodeRef} isMobile={isMobile} isActive={isUserActive} />
      <WorkflowNode
        nodeRef={workflowNodeRef}
        isMobile={isMobile}
        isActive={isWorkflowActive}
        isSpinning={isWorkflowSpinning}
      />
      <AgentNode
        nodeRef={agentOneNodeRef}
        positionClass={agentOnePosition}
        colors={colors.agentA}
        label="contentAgent"
        isActive={isAgentActive}
      />
      <AgentNode
        nodeRef={agentTwoNodeRef}
        positionClass={agentTwoPosition}
        colors={colors.agentB}
        label="analysisAgent"
        isActive={isAgentActive}
        containerClassName="whitespace-nowrap"
        labelClassName="whitespace-nowrap"
      />
    </>
  );
};

interface UserNodeProps {
  nodeRef: NodeRef;
  isMobile: boolean;
  isActive: boolean;
}

const UserNode = ({ nodeRef, isMobile, isActive }: UserNodeProps) => {
  const positionClass = isMobile
    ? "top-[10%] left-1/2 transform -translate-x-1/2"
    : "top-1/2 left-[10%] transform -translate-y-1/2";

  return (
    <div
      ref={nodeRef}
      className={`absolute ${positionClass} px-4 py-2 rounded-md ${
        colors.user.border
      } text-sm flex items-center gap-2 transition-all duration-700 ease-out opacity-100 scale-100 ${
        isActive ? colors.user.activeShadow : colors.user.shadow
      }`}
    >
      <UserCircleIcon
        className={`w-5 h-5 ${colors.user.text} ${isActive ? "animate-pulse" : ""}`}
      />
      <span className="text-white">user</span>
    </div>
  );
};

interface WorkflowNodeProps {
  nodeRef: NodeRef;
  isMobile: boolean;
  isActive: boolean;
  isSpinning: boolean;
}

const WorkflowNode = ({ nodeRef, isMobile, isActive, isSpinning }: WorkflowNodeProps) => {
  const positionClass = isMobile
    ? "top-[40%] left-1/2 transform -translate-x-1/2"
    : "top-1/2 left-[40%] transform -translate-y-1/2";

  return (
    <div
      ref={nodeRef}
      className={`absolute ${positionClass} px-4 py-2 rounded-md ${
        colors.workflow.border
      } text-sm flex items-center gap-2 transition-all duration-700 ease-out opacity-100 scale-100 ${
        isActive ? colors.workflow.activeShadow : colors.workflow.shadow
      }`}
    >
      <ArrowPathIcon
        className={`w-5 h-5 ${colors.workflow.text} ${isSpinning ? "animate-spin" : ""}`}
      />
      <span className="text-white">workflow</span>
    </div>
  );
};

type NodeColors = {
  border: string;
  text: string;
  shadow: string;
  activeShadow: string;
};

interface AgentNodeProps {
  nodeRef: NodeRef;
  positionClass: string;
  colors: NodeColors;
  label: string;
  isActive: boolean;
  containerClassName?: string;
  labelClassName?: string;
}

const AgentNode = ({
  nodeRef,
  positionClass,
  colors: nodeColors,
  label,
  isActive,
  containerClassName,
  labelClassName,
}: AgentNodeProps) => {
  return (
    <div
      ref={nodeRef}
      className={`absolute ${positionClass} ${containerClassName ?? ""} px-4 py-2 rounded-md ${
        nodeColors.border
      } text-sm flex items-center gap-2 transition-all duration-700 ease-out opacity-100 scale-100 ${
        isActive ? nodeColors.activeShadow : nodeColors.shadow
      } bg-black/80`}
    >
      <CpuChipIcon className={`w-5 h-5 ${nodeColors.text} ${isActive ? "animate-pulse" : ""}`} />
      <span className={`text-white ${labelClassName ?? ""}`}>{label}</span>
    </div>
  );
};

interface WorkflowBeamsProps {
  isMobile: boolean;
  animationStep: number;
  diagramRef: NodeRef;
  userNodeRef: NodeRef;
  workflowNodeRef: NodeRef;
  agentOneNodeRef: NodeRef;
  agentTwoNodeRef: NodeRef;
}

const WorkflowBeams = ({
  isMobile,
  animationStep,
  diagramRef,
  userNodeRef,
  workflowNodeRef,
  agentOneNodeRef,
  agentTwoNodeRef,
}: WorkflowBeamsProps) => {
  return (
    <>
      <UserToWorkflowBeam
        containerRef={diagramRef}
        fromRef={userNodeRef}
        toRef={workflowNodeRef}
        isMobile={isMobile}
        animationStep={animationStep}
      />
      <WorkflowToAgentOneBeam
        containerRef={diagramRef}
        fromRef={workflowNodeRef}
        toRef={agentOneNodeRef}
        isMobile={isMobile}
        animationStep={animationStep}
      />
      <AgentOneToWorkflowBeam
        containerRef={diagramRef}
        fromRef={agentOneNodeRef}
        toRef={workflowNodeRef}
        isMobile={isMobile}
        animationStep={animationStep}
      />
      <WorkflowToAgentTwoBeam
        containerRef={diagramRef}
        fromRef={workflowNodeRef}
        toRef={agentTwoNodeRef}
        isMobile={isMobile}
        animationStep={animationStep}
      />
      <AgentTwoToWorkflowBeam
        containerRef={diagramRef}
        fromRef={agentTwoNodeRef}
        toRef={workflowNodeRef}
        isMobile={isMobile}
        animationStep={animationStep}
      />
      <WorkflowToUserBeam
        containerRef={diagramRef}
        fromRef={workflowNodeRef}
        toRef={userNodeRef}
        isMobile={isMobile}
        animationStep={animationStep}
      />
    </>
  );
};

interface BeamProps {
  containerRef: NodeRef;
  fromRef: NodeRef;
  toRef: NodeRef;
  isMobile: boolean;
  animationStep: number;
}

const UserToWorkflowBeam = ({
  containerRef,
  fromRef,
  toRef,
  isMobile,
  animationStep,
}: BeamProps) => {
  if (animationStep < 2) {
    return null;
  }

  const isRequest = animationStep === 2;
  const beamColor = isRequest ? colors.workflow.beam : "transparent";

  return (
    <AnimatedBeam
      containerRef={containerRef}
      fromRef={fromRef}
      toRef={toRef}
      pathColor={colors.workflow.beamOpacity}
      pathWidth={1.5}
      gradientStartColor={beamColor}
      gradientStopColor={beamColor}
      particleColor={beamColor}
      delay={0.1}
      duration={3}
      curvature={0}
      startXOffset={isMobile ? 0 : 10}
      endXOffset={isMobile ? 0 : -10}
      particleSize={3}
      particleCount={3}
      particleSpeed={3.0}
      showParticles={isRequest}
      solidBeamAfterRequest={animationStep > 2}
    />
  );
};

const WorkflowToAgentOneBeam = ({
  containerRef,
  fromRef,
  toRef,
  isMobile,
  animationStep,
}: BeamProps) => {
  if (animationStep < 3) {
    return null;
  }

  const showBeam = animationStep <= 4;
  const beamColor = showBeam ? colors.agentA.beam : "transparent";

  return (
    <AnimatedBeam
      containerRef={containerRef}
      fromRef={fromRef}
      toRef={toRef}
      pathColor={colors.agentA.beamOpacity}
      pathWidth={1.5}
      gradientStartColor={beamColor}
      gradientStopColor={beamColor}
      particleColor={beamColor}
      delay={0.1}
      duration={6}
      curvature={-20}
      startXOffset={isMobile ? 0 : 10}
      endXOffset={isMobile ? 0 : -10}
      particleCount={1}
      showParticles={showBeam}
      pathType="angular"
      particleSpeed={3.0}
      particleSize={3}
      particleDuration={animationStep === 3 ? 3.2 : 0}
      solidBeamAfterRequest={animationStep > 3}
    />
  );
};

const AgentOneToWorkflowBeam = ({
  containerRef,
  fromRef,
  toRef,
  isMobile,
  animationStep,
}: BeamProps) => {
  if (animationStep < 4) {
    return null;
  }

  const showBeam = animationStep <= 4;
  const beamColor = showBeam ? colors.agentA.beam : "transparent";

  return (
    <AnimatedBeam
      containerRef={containerRef}
      fromRef={fromRef}
      toRef={toRef}
      pathColor={colors.agentA.beamOpacity}
      pathWidth={1.5}
      gradientStartColor={beamColor}
      gradientStopColor={beamColor}
      particleColor={beamColor}
      delay={0.2}
      duration={6}
      curvature={-20}
      reverse={true}
      startXOffset={isMobile ? 0 : -10}
      endXOffset={isMobile ? 0 : 10}
      particleCount={1}
      showParticles={showBeam}
      pathType="angular"
      particleSpeed={3.0}
      particleSize={3}
      particleDuration={animationStep === 4 ? 3.2 : 0}
      solidBeamAfterRequest={animationStep > 4}
    />
  );
};

const WorkflowToAgentTwoBeam = ({
  containerRef,
  fromRef,
  toRef,
  isMobile,
  animationStep,
}: BeamProps) => {
  if (animationStep < 3) {
    return null;
  }

  const showBeam = animationStep <= 4;
  const beamColor = showBeam ? colors.agentB.beam : "transparent";

  return (
    <AnimatedBeam
      containerRef={containerRef}
      fromRef={fromRef}
      toRef={toRef}
      pathColor={colors.agentB.beamOpacity}
      pathWidth={1.5}
      gradientStartColor={beamColor}
      gradientStopColor={beamColor}
      particleColor={beamColor}
      delay={0.1}
      duration={6}
      curvature={20}
      startXOffset={isMobile ? 0 : 10}
      endXOffset={isMobile ? 0 : -10}
      pathType="angular"
      particleCount={1}
      showParticles={showBeam}
      particleSpeed={3.0}
      particleSize={3}
      particleDuration={animationStep === 3 ? 3.2 : 0}
      solidBeamAfterRequest={animationStep > 3}
    />
  );
};

const AgentTwoToWorkflowBeam = ({
  containerRef,
  fromRef,
  toRef,
  isMobile,
  animationStep,
}: BeamProps) => {
  if (animationStep < 4) {
    return null;
  }

  const showBeam = animationStep <= 4;
  const beamColor = showBeam ? colors.agentB.beam : "transparent";

  return (
    <AnimatedBeam
      containerRef={containerRef}
      fromRef={fromRef}
      toRef={toRef}
      pathColor={colors.agentB.beamOpacity}
      pathWidth={1.5}
      gradientStartColor={beamColor}
      gradientStopColor={beamColor}
      particleColor={beamColor}
      delay={0.1}
      duration={6}
      curvature={20}
      reverse={true}
      startXOffset={isMobile ? 0 : -10}
      endXOffset={isMobile ? 0 : 10}
      pathType="angular"
      particleCount={1}
      showParticles={showBeam}
      particleSpeed={3.0}
      particleSize={3}
      particleDuration={animationStep === 4 ? 3.2 : 0}
      solidBeamAfterRequest={animationStep > 4 && animationStep < 6}
    />
  );
};

const WorkflowToUserBeam = ({
  containerRef,
  fromRef,
  toRef,
  isMobile,
  animationStep,
}: BeamProps) => {
  if (animationStep < 5) {
    return null;
  }

  return (
    <AnimatedBeam
      containerRef={containerRef}
      fromRef={fromRef}
      toRef={toRef}
      pathColor={colors.user.beamOpacity}
      pathWidth={1.5}
      gradientStartColor={colors.user.beam}
      gradientStopColor={colors.user.beam}
      particleColor={colors.user.beam}
      delay={0.1}
      duration={3}
      curvature={0}
      reverse={true}
      startXOffset={isMobile ? 0 : -10}
      endXOffset={isMobile ? 0 : 10}
      particleCount={3}
      showParticles={true}
      particleSpeed={2.5}
      particleSize={3}
      particleDuration={0}
    />
  );
};

export function WorkflowCodeExample({ isVisible }: WorkflowCodeExampleProps) {
  const [animationStep, setAnimationStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showFullDiagram, setShowFullDiagram] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const diagramRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery("(max-width: 768px)");

  // Refs for beam connections
  const userNodeRef = useRef<HTMLDivElement>(null);
  const workflowNodeRef = useRef<HTMLDivElement>(null);
  const agentOneNodeRef = useRef<HTMLDivElement>(null);
  const agentTwoNodeRef = useRef<HTMLDivElement>(null);

  // Animation steps
  const totalSteps = 6;

  // Intersection Observer to start animation when element is in view
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !isAnimating && animationStep === 0) {
          startAnimation();
        }
      },
      { threshold: 0.3 }, // Start when 30% of the element is visible
    );

    observer.observe(containerRef.current);

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, [isAnimating, animationStep]);

  // Start animation function
  const startAnimation = useCallback(() => {
    setAnimationStep(0);
    setIsAnimating(true);
    setShowFullDiagram(false);

    // Start animation sequence with smoother timing
    const stepDurations = [600, 700, 3500, 3500, 700, 600]; // Parallel execution for both agents

    let currentStep = 0;
    const animateNextStep = () => {
      if (currentStep < totalSteps) {
        setTimeout(() => {
          setAnimationStep(currentStep + 1);
          currentStep++;
          animateNextStep();
        }, stepDurations[currentStep]);
      } else {
        setIsAnimating(false);
      }
    };

    // Start the animation sequence
    setTimeout(animateNextStep, 300);
  }, []);

  // Reset animation when isVisible changes
  useEffect(() => {
    if (isVisible) {
      startAnimation();
    }
  }, [isVisible, startAnimation]);

  // Auto-replay animation after completing
  useEffect(() => {
    if (animationStep === totalSteps && !isAnimating) {
      const timer = setTimeout(() => {
        startAnimation();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [animationStep, isAnimating, startAnimation]);

  // Handle hover to show full diagram
  const handleMouseEnter = () => {
    if (!isAnimating) {
      setShowFullDiagram(true);
    }
  };

  const handleMouseLeave = () => {
    setShowFullDiagram(false);
  };

  return (
    <>
      <div
        className="relative w-full"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        ref={containerRef}
      >
        <div className={"w-full  rounded-lg transition-all duration-500"}>
          <div className="flex flex-col md:flex-row md:items-center items-start">
            {/* Code Section - Left Side */}
            <WorkflowCodeBlock animationStep={animationStep} />

            {/* Diagram Section - Right Side */}
            <WorkflowDiagram
              isMobile={isMobile}
              animationStep={animationStep}
              showFullDiagram={showFullDiagram}
              diagramRef={diagramRef}
              userNodeRef={userNodeRef}
              workflowNodeRef={workflowNodeRef}
              agentOneNodeRef={agentOneNodeRef}
              agentTwoNodeRef={agentTwoNodeRef}
            />
          </div>
        </div>
      </div>
    </>
  );
}

// Add this to your global CSS or as a style tag
const styles = `
  .text-shadow-neon-blue {
    text-shadow: 0 0 7px rgba(96, 165, 250, 0.9),
                0 0 14px rgba(96, 165, 250, 0.7),
                0 0 21px rgba(96, 165, 250, 0.5),
                0 0 28px rgba(96, 165, 250, 0.3);
    filter: brightness(1.2);
  }
  
  .text-shadow-neon-purple {
    text-shadow: 0 0 7px rgba(168, 85, 247, 0.9),
                0 0 14px rgba(168, 85, 247, 0.7),
                0 0 21px rgba(168, 85, 247, 0.5),
                0 0 28px rgba(168, 85, 247, 0.3);
    filter: brightness(1.2);
  }

  .text-shadow-soft {
    text-shadow: 0 0 5px rgba(251, 113, 133, 0.5),
                0 0 10px rgba(251, 113, 133, 0.3);
    filter: brightness(1.1);
  }
`;

// Add style tag to document
if (typeof document !== "undefined") {
  const styleTag = document.createElement("style");
  styleTag.innerHTML = styles;
  document.head.appendChild(styleTag);
}
