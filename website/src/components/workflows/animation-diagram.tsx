import {
  ArrowPathIcon,
  BoltIcon,
  CpuChipIcon,
  CubeIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { useMediaQuery } from "@site/src/hooks/use-media-query";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { AnimatedBeam } from "../magicui/animated-beam";

interface WorkflowCodeExampleProps {
  isVisible: boolean;
}

export function WorkflowCodeExample({ isVisible }: WorkflowCodeExampleProps) {
  const [animationStep, setAnimationStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showFullDiagram, setShowFullDiagram] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const diagramRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery("(max-width: 768px)");

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
      }, 3000); // 3 saniye sonra otomatik olarak tekrar başlat

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
                        animationStep === 3 || animationStep === 4
                          ? "text-shadow-neon-blue font-bold"
                          : ""
                      }`}
                    >
                      andAgent
                    </span>
                    <span className="text-gray-300">(</span>
                    <span
                      className={`text-teal-400 transition-all duration-500 ease-in-out ${
                        animationStep === 3 || animationStep === 4
                          ? "text-shadow-neon font-bold"
                          : ""
                      }`}
                    >
                      contentAgent
                    </span>
                    <span className="text-gray-300">),</span>
                    <br />
                    <span
                      className={`text-blue-400 ml-6 transition-all duration-500 ease-in-out ${
                        animationStep === 3 || animationStep === 4
                          ? "text-shadow-neon-blue font-bold"
                          : ""
                      }`}
                    >
                      andAgent
                    </span>
                    <span className="text-gray-300">(</span>
                    <span
                      className={`text-rose-400 transition-all duration-500 ease-in-out ${
                        animationStep === 3 || animationStep === 4
                          ? "text-shadow-neon font-bold"
                          : ""
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

            {/* Diagram Section - Right Side */}
            <div
              className={`w-full relative ${isMobile ? "min-h-[400px]" : "min-h-[250px] mr-12"}`}
              ref={diagramRef}
            >
              <div
                className={`w-full h-full flex items-center justify-center py-4 ${
                  showFullDiagram ? "opacity-100" : "opacity-90"
                } transition-opacity duration-500`}
              >
                {/* User Node */}
                <div
                  ref={userNodeRef}
                  className={`absolute ${
                    isMobile
                      ? "top-[10%] left-1/2 transform -translate-x-1/2"
                      : "top-1/2 left-[10%] transform -translate-y-1/2"
                  } px-4 py-2 rounded-md ${
                    colors.user.border
                  } text-sm flex items-center gap-2 transition-all duration-700 ease-out opacity-100 scale-100 ${
                    animationStep === 5 || animationStep === 6
                      ? colors.user.activeShadow
                      : colors.user.shadow
                  }`}
                >
                  <UserCircleIcon
                    className={`w-5 h-5 ${colors.user.text} ${
                      animationStep === 5 || animationStep === 6 ? "animate-pulse" : ""
                    }`}
                  />
                  <span className="text-white">user</span>
                </div>

                {/* Workflow Node */}
                <div
                  ref={workflowNodeRef}
                  className={`absolute ${
                    isMobile
                      ? "top-[40%] left-1/2 transform -translate-x-1/2"
                      : "top-1/2 left-[40%] transform -translate-y-1/2"
                  } px-4 py-2 rounded-md ${
                    colors.workflow.border
                  } text-sm flex items-center gap-2 transition-all duration-700 ease-out opacity-100 scale-100 ${
                    animationStep >= 2 ? colors.workflow.activeShadow : colors.workflow.shadow
                  }`}
                >
                  <ArrowPathIcon
                    className={`w-5 h-5 ${colors.workflow.text} ${
                      animationStep > 2 ? "animate-spin" : ""
                    }`}
                  />
                  <span className="text-white">workflow</span>
                </div>

                {/* Agent One Node */}
                <div
                  ref={agentOneNodeRef}
                  className={`absolute ${
                    isMobile
                      ? "top-[70%] left-[30%] transform -translate-x-1/2"
                      : "top-[25%] left-[75%] transform -translate-y-1/2"
                  } px-4 py-2 rounded-md ${
                    colors.agentA.border
                  } text-sm flex items-center gap-2 transition-all duration-700 ease-out opacity-100 scale-100 ${
                    animationStep === 3 ? colors.agentA.activeShadow : colors.agentA.shadow
                  } bg-black/80`}
                >
                  <CpuChipIcon
                    className={`w-5 h-5 ${colors.agentA.text} ${
                      animationStep === 3 ? "animate-pulse" : ""
                    }`}
                  />
                  <span className="text-white">contentAgent</span>
                </div>

                {/* Agent Two Node */}
                <div
                  ref={agentTwoNodeRef}
                  className={`absolute ${
                    isMobile
                      ? "top-[70%] left-[70%] transform -translate-x-1/2"
                      : "top-[75%] left-[75%] transform -translate-y-1/2"
                  } px-4 py-2 rounded-md whitespace-nowrap ${
                    colors.agentB.border
                  } text-sm flex items-center gap-2 transition-all duration-700 ease-out opacity-100 scale-100 ${
                    animationStep === 3 ? colors.agentB.activeShadow : colors.agentB.shadow
                  } bg-black/80`}
                >
                  <CpuChipIcon
                    className={`w-5 h-5 ${colors.agentB.text} ${
                      animationStep === 3 ? "animate-pulse" : ""
                    }`}
                  />
                  <span className="text-white whitespace-nowrap">analysisAgent</span>
                </div>

                {/* Animated Beams */}
                {/* User to Workflow - Initial Request */}
                {animationStep >= 2 && (
                  <AnimatedBeam
                    containerRef={diagramRef}
                    fromRef={userNodeRef}
                    toRef={workflowNodeRef}
                    pathColor={colors.workflow.beamOpacity}
                    pathWidth={1.5}
                    gradientStartColor={animationStep > 2 ? "transparent" : colors.workflow.beam}
                    gradientStopColor={animationStep > 2 ? "transparent" : colors.workflow.beam}
                    particleColor={animationStep > 2 ? "transparent" : colors.workflow.beam}
                    delay={0.1}
                    duration={3}
                    curvature={0}
                    startXOffset={isMobile ? 0 : 10}
                    endXOffset={isMobile ? 0 : -10}
                    particleSize={3}
                    particleCount={3}
                    particleSpeed={3.0}
                    showParticles={animationStep === 2}
                    solidBeamAfterRequest={animationStep > 2}
                  />
                )}

                {/* Workflow to Agent One - Request */}
                {animationStep >= 3 && (
                  <AnimatedBeam
                    containerRef={diagramRef}
                    fromRef={workflowNodeRef}
                    toRef={agentOneNodeRef}
                    pathColor={colors.agentA.beamOpacity}
                    pathWidth={1.5}
                    gradientStartColor={animationStep > 4 ? "transparent" : colors.agentA.beam}
                    gradientStopColor={animationStep > 4 ? "transparent" : colors.agentA.beam}
                    particleColor={animationStep > 4 ? "transparent" : colors.agentA.beam}
                    delay={0.1}
                    duration={6}
                    curvature={isMobile ? -20 : -20}
                    startXOffset={isMobile ? 0 : 10}
                    endXOffset={isMobile ? 0 : -10}
                    particleCount={1}
                    showParticles={animationStep <= 4}
                    pathType={"angular"}
                    particleSpeed={3.0}
                    particleSize={3}
                    particleDuration={animationStep === 3 ? 3.2 : 0}
                    solidBeamAfterRequest={animationStep > 3}
                  />
                )}

                {/* Agent One to Workflow - Response */}
                {animationStep >= 4 && (
                  <AnimatedBeam
                    containerRef={diagramRef}
                    fromRef={agentOneNodeRef}
                    toRef={workflowNodeRef}
                    pathColor={colors.agentA.beamOpacity}
                    pathWidth={1.5}
                    gradientStartColor={animationStep > 4 ? "transparent" : colors.agentA.beam}
                    gradientStopColor={animationStep > 4 ? "transparent" : colors.agentA.beam}
                    particleColor={animationStep > 4 ? "transparent" : colors.agentA.beam}
                    delay={0.2}
                    duration={6}
                    curvature={isMobile ? -20 : -20}
                    reverse={true}
                    startXOffset={isMobile ? 0 : -10}
                    endXOffset={isMobile ? 0 : 10}
                    particleCount={1}
                    showParticles={animationStep <= 4}
                    pathType={"angular"}
                    particleSpeed={3.0}
                    particleSize={3}
                    particleDuration={animationStep === 4 ? 3.2 : 0}
                    solidBeamAfterRequest={animationStep > 4}
                  />
                )}

                {/* Workflow to Agent Two - Request */}
                {animationStep >= 3 && (
                  <AnimatedBeam
                    containerRef={diagramRef}
                    fromRef={workflowNodeRef}
                    toRef={agentTwoNodeRef}
                    pathColor={colors.agentB.beamOpacity}
                    pathWidth={1.5}
                    gradientStartColor={animationStep > 4 ? "transparent" : colors.agentB.beam}
                    gradientStopColor={animationStep > 4 ? "transparent" : colors.agentB.beam}
                    particleColor={animationStep > 4 ? "transparent" : colors.agentB.beam}
                    delay={0.1}
                    duration={6}
                    curvature={isMobile ? 20 : 20}
                    startXOffset={isMobile ? 0 : 10}
                    endXOffset={isMobile ? 0 : -10}
                    pathType={"angular"}
                    particleCount={1}
                    showParticles={animationStep <= 4}
                    particleSpeed={3.0}
                    particleSize={3}
                    particleDuration={animationStep === 3 ? 3.2 : 0}
                    solidBeamAfterRequest={animationStep > 3}
                  />
                )}

                {/* Agent Two to Workflow - Response */}
                {animationStep >= 4 && (
                  <AnimatedBeam
                    containerRef={diagramRef}
                    fromRef={agentTwoNodeRef}
                    toRef={workflowNodeRef}
                    pathColor={colors.agentB.beamOpacity}
                    pathWidth={1.5}
                    gradientStartColor={animationStep > 4 ? "transparent" : colors.agentB.beam}
                    gradientStopColor={animationStep > 4 ? "transparent" : colors.agentB.beam}
                    particleColor={animationStep > 4 ? "transparent" : colors.agentB.beam}
                    delay={0.1}
                    duration={6}
                    curvature={isMobile ? 20 : 20}
                    reverse={true}
                    startXOffset={isMobile ? 0 : -10}
                    endXOffset={isMobile ? 0 : 10}
                    pathType={"angular"}
                    particleCount={1}
                    showParticles={animationStep <= 4}
                    particleSpeed={3.0}
                    particleSize={3}
                    particleDuration={animationStep === 4 ? 3.2 : 0}
                    solidBeamAfterRequest={animationStep > 4 && animationStep < 6}
                  />
                )}

                {/* Workflow to User - Final Response */}
                {animationStep >= 5 && (
                  <AnimatedBeam
                    containerRef={diagramRef}
                    fromRef={workflowNodeRef}
                    toRef={userNodeRef}
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
                )}
              </div>
            </div>
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
