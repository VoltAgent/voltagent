import {
  ArrowPathIcon,
  CpuChipIcon,
  FingerPrintIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { useMediaQuery } from "@site/src/hooks/use-media-query";
import { Claude37Logo } from "@site/static/img/logos/claudie";
import { OpenAILogo } from "@site/static/img/logos/openai";
import React, { useState, useEffect, useRef } from "react";
import { AnimatedBeam } from "../magicui/animated-beam";

interface WorkflowCodeExampleProps {
  isVisible: boolean;
}

export function WorkflowCodeExample({ isVisible }: WorkflowCodeExampleProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [animationStep, setAnimationStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [supervisorThinking, setSupervisorThinking] = useState(false);
  const [supervisorProcessing, setSupervisorProcessing] = useState(false);
  const [currentThinkingAgent, setCurrentThinkingAgent] = useState<
    string | null
  >(null);
  const [currentBeam, setCurrentBeam] = useState<number>(0);

  // Agent color scheme - More unified and less eye-straining
  const agentColors = {
    A: {
      border: "border-blue-400/70",
      text: "text-blue-300",
      shadow: "shadow-[0_0_15px_rgba(96,165,250,0.3)]",
      activeShadow: "shadow-[0_0_20px_rgba(96,165,250,0.5)]",
      bg: "bg-blue-500/10",
      beam: "#60a5fa",
      beamOpacity: "rgba(96, 165, 250, 0.4)",
    },
    B: {
      border: "border-teal-400/70",
      text: "text-teal-300",
      shadow: "shadow-[0_0_15px_rgba(45,212,191,0.3)]",
      activeShadow: "shadow-[0_0_20px_rgba(45,212,191,0.5)]",
      bg: "bg-teal-500/10",
      beam: "#2dd4bf",
      beamOpacity: "rgba(45, 212, 191, 0.4)",
    },
    C: {
      border: "border-purple-400/70",
      text: "text-purple-300",
      shadow: "shadow-[0_0_15px_rgba(168,85,247,0.3)]",
      activeShadow: "shadow-[0_0_20px_rgba(168,85,247,0.5)]",
      bg: "bg-purple-500/10",
      beam: "#a855f7",
      beamOpacity: "rgba(168, 85, 247, 0.4)",
    },
    User: {
      border: "border-emerald-400/70",
      text: "text-emerald-300",
      shadow: "shadow-[0_0_15px_rgba(52,211,153,0.3)]",
      activeShadow: "shadow-[0_0_20px_rgba(52,211,153,0.5)]",
      bg: "bg-emerald-500/10",
      beam: "#34d399",
      beamOpacity: "rgba(52, 211, 153, 0.4)",
    },
    Supervisor: {
      border: "border-indigo-400/70",
      text: "text-indigo-300",
      shadow: "shadow-[0_0_15px_rgba(129,140,248,0.3)]",
      activeShadow: "shadow-[0_0_20px_rgba(129,140,248,0.5)]",
      bg: "bg-indigo-500/10",
      beam: "#818cf8",
      beamOpacity: "rgba(129, 140, 248, 0.4)",
    },
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const diagramRef = useRef<HTMLDivElement>(null);

  // Refs for beam connections
  const userNodeRef = useRef<HTMLDivElement>(null);
  const supervisorNodeRef = useRef<HTMLDivElement>(null);
  const agentANodeRef = useRef<HTMLDivElement>(null);
  const agentBNodeRef = useRef<HTMLDivElement>(null);
  const agentCNodeRef = useRef<HTMLDivElement>(null);
  const userLeadMemoryRef = useRef<HTMLDivElement>(null);
  const knowledgeLogRef = useRef<HTMLDivElement>(null);
  const leadAgentRegionRef = useRef<HTMLDivElement>(null);
  const teamRegionRef = useRef<HTMLDivElement>(null);
  const leadTeamMemoryRef = useRef<HTMLDivElement>(null);
  const leadAgentBeamAnchorRef = useRef<HTMLDivElement>(null);
  const teamBeamAnchorRef = useRef<HTMLDivElement>(null);

  // Animation steps - Updated for sequential flow
  const totalSteps = 8; // Reduced total steps for cleaner sequence

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
  const startAnimation = () => {
    setAnimationStep(0);
    setIsAnimating(true);
    setSupervisorThinking(false);
    setSupervisorProcessing(false);
    setCurrentThinkingAgent(null);
    setCurrentBeam(0);

    // Updated step durations for sequential animation
    const stepDurations = [
      2000, // Step 1: User to Supervisor
      2000, // Step 2: Supervisor to Agent A
      2000, // Step 3: Agent A to Supervisor
      2000, // Step 4: Supervisor to Agent B
      2000, // Step 5: Agent B to Supervisor
      2000, // Step 6: Supervisor to Agent C
      2000, // Step 7: Agent C to Supervisor
      2000, // Step 8: Supervisor thinking (2s) + final beam to User (2s)
    ];

    let currentStep = 0;
    const animateNextStep = () => {
      if (currentStep < totalSteps) {
        setTimeout(() => {
          // Update current animation step
          setAnimationStep(currentStep + 1);

          // Handle special cases for each step
          if (currentStep === 0) {
            // User to Supervisor
            setCurrentBeam(1);
          } else if (currentStep === 1) {
            // Supervisor to Agent A
            setCurrentBeam(2);
            setSupervisorThinking(true);
            setCurrentThinkingAgent("A");
          } else if (currentStep === 2) {
            // Agent A to Supervisor
            setCurrentBeam(3);
            setSupervisorThinking(false);
          } else if (currentStep === 3) {
            // Supervisor to Agent B
            setCurrentBeam(4);
            setSupervisorThinking(true);
            setCurrentThinkingAgent("B");
          } else if (currentStep === 4) {
            // Agent B to Supervisor
            setCurrentBeam(5);
            setSupervisorThinking(false);
          } else if (currentStep === 5) {
            // Supervisor to Agent C
            setCurrentBeam(6);
            setSupervisorThinking(true);
            setCurrentThinkingAgent("C");
          } else if (currentStep === 6) {
            // Agent C to Supervisor
            setCurrentBeam(7);
            setSupervisorThinking(false);
            setCurrentThinkingAgent(null);
          } else if (currentStep === 7) {
            // CRITICAL CHANGE: After receiving response from Agent C, ONLY show "Thinking..."
            // Do NOT set current beam to 8 yet, this is our major fix
            setSupervisorProcessing(true);

            // Wait 2 seconds then show the final beam to User
            setTimeout(() => {
              console.log("Setting currentBeam to 8 after thinking"); // Debug
              setCurrentBeam(8); // Show final beam to User AFTER thinking
              setSupervisorProcessing(false);
            }, 2000);
          }

          currentStep++;
          if (currentStep < totalSteps) {
            animateNextStep();
          } else {
            // Animation complete
            setTimeout(() => {
              setIsAnimating(false);
              setSupervisorThinking(false);
              setSupervisorProcessing(false);
              setCurrentThinkingAgent(null);
            }, 2000); // Give 2 more seconds to complete
          }
        }, stepDurations[currentStep]);
      }
    };

    // Start the animation sequence
    setTimeout(animateNextStep, 300);
  };

  // Auto-replay animation after completing
  // biome-ignore lint/correctness/useExhaustiveDependencies: ignore
  useEffect(() => {
    if (animationStep === totalSteps && !isAnimating) {
      const timer = setTimeout(() => {
        startAnimation();
      }, 4000); // Auto-restart after 4 seconds

      return () => clearTimeout(timer);
    }
  }, [animationStep, isAnimating]);

  // Reset animation when isVisible changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: ignore
  useEffect(() => {
    if (isVisible) {
      startAnimation();
    }
  }, [isVisible]);

  return (
    <>
      <div className="relative w-full" ref={containerRef}>
        <div className="w-full border border-indigo-500/20 rounded-lg transition-all duration-500 ">
          <div className="flex flex-col items-center">
            {/* Diagram Section - Top Side */}
            <div
              className="w-full relative min-h-[650px]  py-12"
              ref={diagramRef}
            >
              {/* Mobile Memory Sidebar */}
              {isMobile && (
                <div className="absolute left-0 top-0 w-[25%] h-full border-r border-gray-500/30 px-2">
                  <div className="sticky top-0 flex flex-col gap-4">
                    <div className="text-xs text-main-emerald font-mono">
                      Memory
                    </div>
                    <div
                      ref={userLeadMemoryRef}
                      className="px-2 py-1 rounded-md text-[10px] bg-black/50 border border-gray-500/30"
                    >
                      <span className="text-gray-300">User-Lead Memory</span>
                    </div>
                    <div
                      ref={leadTeamMemoryRef}
                      className="px-2 py-1 rounded-md text-[10px] bg-black/50 border border-gray-500/30"
                    >
                      <span className="text-gray-300">Lead-Team Memory</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Main Content Area */}
              <div className={`${isMobile ? "pl-[28%]" : ""}`}>
                <div
                  className={`
                    ${
                      isMobile
                        ? "flex flex-col gap-8"
                        : "grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1"
                    }
                    h-full gap-8
                  `}
                >
                  {/* Column 1 - User */}
                  <div className="flex items-center justify-center relative w-full lg:w-[350px] md:w-[300px]">
                    <div
                      ref={userNodeRef}
                      className={`px-4 py-2 rounded-md bg-black/80 text-sm flex items-center gap-3 transition-all duration-700 ease-out ${
                        isVisible
                          ? "opacity-100 scale-100"
                          : "opacity-0 scale-90"
                      } ${
                        animationStep >= 1
                          ? `${agentColors.User.border} ${agentColors.User.shadow}`
                          : "border border-gray-500/30"
                      }`}
                    >
                      <UserIcon
                        className={`w-5 h-5 ${agentColors.User.text}`}
                      />
                      <div className="flex flex-col items-start">
                        <div className="text-white">User</div>
                        {/* User status messages */}
                        {animationStep >= 1 && animationStep < 3 && (
                          <span
                            className={`text-xs font-mono ${agentColors.User.text} ${agentColors.User.border} py-0.5 px-1.5 rounded-full ${agentColors.User.bg}`}
                          >
                            sending request...
                          </span>
                        )}
                        {animationStep >= 3 && animationStep < 8 && (
                          <span
                            className={`text-xs font-mono ${agentColors.User.text} ${agentColors.User.border} py-0.5 px-1.5 rounded-full ${agentColors.User.bg}`}
                          >
                            waiting for response...
                          </span>
                        )}
                        {animationStep >= 8 && (
                          <span
                            className={`text-xs font-mono ${agentColors.User.text} ${agentColors.User.border} py-0.5 px-1.5 rounded-full ${agentColors.User.bg}`}
                          >
                            request completed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Column 2 - Supervisor in Lead Agent Region */}
                  <div className="flex items-center justify-center">
                    <div
                      ref={leadAgentRegionRef}
                      className={`relative px-4 md:px-8 lg:px-12 py-12 md:py-16 lg:py-12 rounded-lg border border-dashed  border-gray-500/30 transition-all duration-700 ease-out ${
                        isVisible
                          ? "opacity-100 scale-100"
                          : "opacity-0 scale-90"
                      }`}
                    >
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-black px-2 text-xs text-main-emerald font-mono">
                        Lead Agent
                      </div>
                      <div className="relative w-full lg:w-[170px] md:w-[150px] justify-center items-center">
                        <div
                          ref={supervisorNodeRef}
                          className={`px-4 py-2 rounded-md bg-black ${
                            agentColors.Supervisor.border
                          } text-sm flex items-center gap-2 transition-all duration-700 ease-out ${
                            isVisible
                              ? "opacity-100 scale-100"
                              : "opacity-0 scale-90"
                          } ${
                            supervisorThinking
                              ? `animate-pulse ${agentColors.Supervisor.bg}`
                              : supervisorProcessing
                                ? `animate-pulse ${agentColors.Supervisor.bg} ${agentColors.Supervisor.activeShadow}`
                                : agentColors.Supervisor.shadow
                          }`}
                        >
                          {supervisorProcessing && (
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 w-full text-center">
                              <div
                                className={`inline-block text-xs font-mono ${agentColors.Supervisor.text} ${agentColors.Supervisor.border} px-2 py-1 rounded-md bg-black/50 animate-agent-pulse`}
                              >
                                Thinking...
                              </div>
                            </div>
                          )}
                          <CpuChipIcon
                            className={`w-5 h-5 ${
                              agentColors.Supervisor.text
                            } ${supervisorProcessing ? "animate-pulse" : ""}`}
                          />
                          <div className="flex flex-col">
                            <span className="text-white">Supervisor</span>
                            <div className="flex items-center gap-1 mt-0.5">
                              <OpenAILogo
                                className={`w-3.5 h-3.5 ${agentColors.Supervisor.text}`}
                              />
                              <span
                                className={`text-xs ${agentColors.Supervisor.text} font-mono`}
                              >
                                gpt-4o-mini
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* Invisible anchor for beam at bottom center */}
                      <div
                        className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1"
                        ref={leadAgentBeamAnchorRef}
                      />
                    </div>
                  </div>

                  {/* Column 3 - Agents in Team Region */}
                  <div
                    className={`flex ${
                      isMobile
                        ? "flex-col gap-6"
                        : "items-center justify-center"
                    }`}
                  >
                    <div
                      ref={teamRegionRef}
                      className={`relative px-12 py-12 rounded-lg border border-dashed border-gray-500/30 transition-all duration-700 ease-out ${
                        isVisible
                          ? "opacity-100 scale-100"
                          : "opacity-0 scale-90"
                      }`}
                    >
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-black px-2 text-xs text-main-emerald font-mono">
                        Team
                      </div>
                      <div
                        className={`flex ${
                          isMobile
                            ? "flex-col gap-6"
                            : "flex-col items-center justify-start gap-20"
                        }`}
                      >
                        {/* Agent A */}
                        <div className="relative">
                          {currentThinkingAgent === "A" && (
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 w-full text-center">
                              <div
                                className={`inline-block text-xs font-mono ${
                                  agentColors.A.text
                                } ${
                                  agentColors.A.border
                                } px-2 py-1 rounded-md bg-black/50 ${
                                  currentThinkingAgent === "A"
                                    ? "animate-agent-pulse"
                                    : ""
                                }`}
                              >
                                Executing: Agent A
                              </div>
                            </div>
                          )}
                          <div
                            ref={agentANodeRef}
                            className={`px-4 py-2 rounded-md w-[170px] bg-black ${
                              agentColors.A.border
                            } text-sm flex items-center gap-2 transition-all duration-700 ease-out ${
                              isVisible
                                ? "opacity-100 scale-100"
                                : "opacity-0 scale-90"
                            } ${
                              currentThinkingAgent === "A"
                                ? `animate-agent-pulse ${agentColors.A.activeShadow}`
                                : agentColors.A.shadow
                            }`}
                          >
                            <CpuChipIcon
                              className={`w-5 h-5 ${agentColors.A.text}`}
                            />
                            <div className="flex flex-col">
                              <div className="flex items-center">
                                <span className="text-white">Agent</span>
                                <span
                                  className={`ml-1.5 text-xs font-mono ${agentColors.A.bg} px-1.5 py-0.5 rounded ${agentColors.A.text}`}
                                >
                                  A
                                </span>
                              </div>
                              <div className="flex items-center gap-1 mt-0.5">
                                <Claude37Logo
                                  className={`w-3.5 h-3.5 ${agentColors.A.text}`}
                                />
                                <span
                                  className={`text-xs ${agentColors.A.text} font-mono`}
                                >
                                  claude-3.7
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Agent B */}
                        <div className="relative">
                          {currentThinkingAgent === "B" && (
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 w-full text-center">
                              <div
                                className={`inline-block text-xs font-mono ${
                                  agentColors.B.text
                                } ${
                                  agentColors.B.border
                                } px-2 py-1 rounded-md bg-black/50 ${
                                  currentThinkingAgent === "B"
                                    ? "animate-agent-pulse"
                                    : ""
                                }`}
                              >
                                Executing: Agent B
                              </div>
                            </div>
                          )}
                          <div
                            ref={agentBNodeRef}
                            className={`px-4 py-2 w-[170px] rounded-md bg-black ${
                              agentColors.B.border
                            } text-sm flex items-center gap-2 transition-all duration-700 ease-out ${
                              isVisible
                                ? "opacity-100 scale-100"
                                : "opacity-0 scale-90"
                            } ${
                              currentThinkingAgent === "B"
                                ? `animate-agent-pulse ${agentColors.B.activeShadow}`
                                : agentColors.B.shadow
                            }`}
                          >
                            <CpuChipIcon
                              className={`w-5 h-5 ${agentColors.B.text}`}
                            />
                            <div className="flex flex-col">
                              <div className="flex items-center">
                                <span className="text-white">Agent</span>
                                <span
                                  className={`ml-1.5 text-xs font-mono ${agentColors.B.bg} px-1.5 py-0.5 rounded ${agentColors.B.text}`}
                                >
                                  B
                                </span>
                              </div>
                              <div className="flex items-center gap-1 mt-0.5">
                                <OpenAILogo
                                  className={`w-3.5 h-3.5 ${agentColors.B.text}`}
                                />
                                <span
                                  className={`text-xs ${agentColors.B.text} font-mono`}
                                >
                                  gpt-4
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Agent C */}
                        <div className="relative">
                          {currentThinkingAgent === "C" && (
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 w-full text-center">
                              <div
                                className={`inline-block text-xs font-mono ${
                                  agentColors.C.text
                                } ${
                                  agentColors.C.border
                                } px-2 py-1 rounded-md bg-black/50 ${
                                  currentThinkingAgent === "C"
                                    ? "animate-agent-pulse"
                                    : ""
                                }`}
                              >
                                Executing: Agent C
                              </div>
                            </div>
                          )}
                          <div
                            ref={agentCNodeRef}
                            className={`px-4 py-2 rounded-md w-[170px] bg-black ${
                              agentColors.C.border
                            } text-sm flex items-center gap-2 transition-all duration-700 ease-out ${
                              isVisible
                                ? "opacity-100 scale-100"
                                : "opacity-0 scale-90"
                            } ${
                              currentThinkingAgent === "C"
                                ? `animate-agent-pulse ${agentColors.C.activeShadow}`
                                : agentColors.C.shadow
                            }`}
                          >
                            <CpuChipIcon
                              className={`w-5 h-5 ${agentColors.C.text}`}
                            />
                            <div className="flex flex-col">
                              <div className="flex items-center">
                                <span className="text-white">Agent</span>
                                <span
                                  className={`ml-1.5 text-xs font-mono ${agentColors.C.bg} px-1.5 py-0.5 rounded ${agentColors.C.text}`}
                                >
                                  C
                                </span>
                              </div>
                              <div className="flex items-center gap-1 mt-0.5">
                                <FingerPrintIcon
                                  className={`w-3.5 h-3.5 ${agentColors.C.text}`}
                                />
                                <span
                                  className={`text-xs ${agentColors.C.text} font-mono`}
                                >
                                  Custom LLM
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* Invisible anchor for beam at bottom center */}
                      <div
                        className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1"
                        ref={teamBeamAnchorRef}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Memory Section */}
              <div className="mt-8 relative">
                <div className="grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-4 md:gap-6 lg:gap-8">
                  {/* Process Log - Left Column */}
                  <div className="flex justify-center">
                    <div
                      ref={knowledgeLogRef}
                      className="w-full lg:w-[450px] md:w-[400px] h-[150px]"
                    />
                  </div>

                  {/* Memory Boxes with Border - Center Column */}
                  <div className="lg:col-span-2 md:col-span-1 flex justify-center mt-10 h-[85px] relative">
                    <div className="absolute -top-3 transform bg-black px-2 text-xs text-main-emerald font-mono">
                      Conversation-History
                    </div>
                    <div className="relative px-2 xl:px-8 py-6 rounded-lg w-full lg:w-[85%] border border-dashed border-gray-500/30 transition-all duration-700 ease-out">
                      <div className="flex flex-col md:flex-row justify-between gap-4 md:gap-10 lg:gap-20">
                        {/* User-Lead Memory */}
                        <div
                          ref={userLeadMemoryRef}
                          className={`px-2 md:px-4 py-2 rounded-md text-xs md:text-sm flex items-center gap-2 transition-all duration-700 ease-out ${
                            isVisible
                              ? "opacity-100 scale-100 shadow-[0_0_15px_rgba(156,163,175,0.3)]"
                              : "opacity-0 scale-90"
                          }`}
                        >
                          <ArrowPathIcon className="w-5 h-5 text-gray-500" />
                          <span className="text-gray-300">
                            User-Lead Memory
                          </span>
                        </div>

                        {/* Lead-Team Memory */}
                        <div
                          ref={leadTeamMemoryRef}
                          className={`px-2 lg:px-4 py-2 rounded-md text-sm flex items-center gap-2 transition-all duration-700 ease-out ${
                            isVisible
                              ? "opacity-100 scale-100 shadow-[0_0_15px_rgba(156,163,175,0.3)]"
                              : "opacity-0 scale-90"
                          }`}
                        >
                          <ArrowPathIcon className="w-5 h-5 text-gray-500" />
                          <span className="text-gray-300">
                            Lead-Team Memory
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Animated Beams */}
              {/* User to Supervisor - Step 1 */}
              {currentBeam >= 1 && (
                <AnimatedBeam
                  containerRef={diagramRef}
                  fromRef={userNodeRef}
                  toRef={supervisorNodeRef}
                  pathColor={agentColors.User.beamOpacity}
                  pathWidth={1.5}
                  gradientStartColor={agentColors.User.beam}
                  gradientStopColor={agentColors.User.beam}
                  particleColor={agentColors.User.beam}
                  delay={0}
                  duration={2}
                  curvature={isMobile ? 0 : 0}
                  startXOffset={isMobile ? 0 : 90}
                  endXOffset={isMobile ? 0 : -95}
                  pathType="curved"
                  particleDuration={2}
                  reverse={false}
                  particleDirection="forward"
                  particleSize={3}
                  particleSpeed={2}
                  particleCount={3}
                  showParticles={currentBeam === 1}
                />
              )}

              {/* Supervisor to Agent A - Step 2 */}
              {currentBeam >= 2 && (
                <AnimatedBeam
                  containerRef={diagramRef}
                  fromRef={supervisorNodeRef}
                  toRef={agentANodeRef}
                  pathColor={agentColors.A.beamOpacity}
                  pathWidth={1.5}
                  gradientStartColor={agentColors.A.beam}
                  gradientStopColor={agentColors.A.beam}
                  particleColor={agentColors.A.beam}
                  delay={0}
                  duration={2}
                  curvature={20}
                  startXOffset={90}
                  endXOffset={-95}
                  pathType="angular"
                  particleDuration={2}
                  reverse={false}
                  particleDirection="forward"
                  particleSize={3}
                  particleSpeed={2}
                  particleCount={1}
                  showParticles={currentBeam === 2}
                />
              )}

              {/* Agent A to Supervisor - Step 3 */}
              {currentBeam >= 3 && (
                <AnimatedBeam
                  containerRef={diagramRef}
                  fromRef={agentANodeRef}
                  toRef={supervisorNodeRef}
                  pathColor={agentColors.A.beamOpacity}
                  pathWidth={1.5}
                  gradientStartColor={agentColors.A.beam}
                  gradientStopColor={agentColors.A.beam}
                  particleColor={agentColors.A.beam}
                  delay={0}
                  duration={2}
                  curvature={20}
                  startXOffset={-95}
                  endXOffset={90}
                  pathType="angular"
                  particleDuration={2}
                  reverse={false}
                  particleDirection="forward"
                  particleSize={3}
                  particleSpeed={2}
                  particleCount={3}
                  showParticles={currentBeam === 3}
                />
              )}

              {/* Supervisor to Agent B - Step 4 */}
              {currentBeam >= 4 && (
                <AnimatedBeam
                  containerRef={diagramRef}
                  fromRef={supervisorNodeRef}
                  toRef={agentBNodeRef}
                  pathColor={agentColors.B.beamOpacity}
                  pathWidth={1.5}
                  gradientStartColor={agentColors.B.beam}
                  gradientStopColor={agentColors.B.beam}
                  particleColor={agentColors.B.beam}
                  delay={0}
                  duration={2}
                  curvature={0}
                  startXOffset={90}
                  endXOffset={-95}
                  pathType="angular"
                  particleDuration={2}
                  reverse={false}
                  particleDirection="forward"
                  particleSize={3}
                  particleSpeed={2}
                  particleCount={1}
                  showParticles={currentBeam === 4}
                />
              )}

              {/* Agent B to Supervisor - Step 5 */}
              {currentBeam >= 5 && (
                <AnimatedBeam
                  containerRef={diagramRef}
                  fromRef={agentBNodeRef}
                  toRef={supervisorNodeRef}
                  pathColor={agentColors.B.beamOpacity}
                  pathWidth={1.5}
                  gradientStartColor={agentColors.B.beam}
                  gradientStopColor={agentColors.B.beam}
                  particleColor={agentColors.B.beam}
                  delay={0}
                  duration={2}
                  curvature={0}
                  startXOffset={-95}
                  endXOffset={90}
                  pathType="angular"
                  particleDuration={2}
                  reverse={false}
                  particleDirection="forward"
                  particleSize={3}
                  particleSpeed={2}
                  particleCount={3}
                  showParticles={currentBeam === 5}
                />
              )}

              {/* Supervisor to Agent C - Step 6 */}
              {currentBeam >= 6 && (
                <AnimatedBeam
                  containerRef={diagramRef}
                  fromRef={supervisorNodeRef}
                  toRef={agentCNodeRef}
                  pathColor={agentColors.C.beamOpacity}
                  pathWidth={1.5}
                  gradientStartColor={agentColors.C.beam}
                  gradientStopColor={agentColors.C.beam}
                  particleColor={agentColors.C.beam}
                  delay={0}
                  duration={2}
                  curvature={-20}
                  startXOffset={90}
                  endXOffset={-95}
                  pathType="angular"
                  particleDuration={2}
                  reverse={false}
                  particleDirection="forward"
                  particleSize={3}
                  particleSpeed={2}
                  particleCount={1}
                  showParticles={currentBeam === 6}
                />
              )}

              {/* Agent C to Supervisor - Step 7 */}
              {currentBeam >= 7 && (
                <AnimatedBeam
                  containerRef={diagramRef}
                  fromRef={agentCNodeRef}
                  toRef={supervisorNodeRef}
                  pathColor={agentColors.C.beamOpacity}
                  pathWidth={1.5}
                  gradientStartColor={agentColors.C.beam}
                  gradientStopColor={agentColors.C.beam}
                  particleColor={agentColors.C.beam}
                  delay={0}
                  duration={2}
                  curvature={-20}
                  startXOffset={-95}
                  endXOffset={90}
                  pathType="angular"
                  particleDuration={2}
                  reverse={false}
                  particleDirection="forward"
                  particleSize={3}
                  particleSpeed={2}
                  particleCount={3}
                  showParticles={currentBeam === 7}
                />
              )}

              {/* Supervisor to User - Final Response - Step 8 */}
              {currentBeam >= 8 && (
                <AnimatedBeam
                  containerRef={diagramRef}
                  fromRef={supervisorNodeRef}
                  toRef={userNodeRef}
                  pathColor={agentColors.User.beamOpacity}
                  pathWidth={1.5}
                  gradientStartColor={agentColors.User.beam}
                  gradientStopColor={agentColors.User.beam}
                  particleColor={agentColors.User.beam}
                  delay={0}
                  duration={2}
                  curvature={0}
                  startXOffset={0}
                  endXOffset={0}
                  pathType="curved"
                  particleDuration={2}
                  reverse={false}
                  particleDirection="forward"
                  particleSize={3}
                  particleSpeed={2}
                  particleCount={3}
                  showParticles={currentBeam === 8}
                />
              )}

              {/* Memory Connection Beams - Bidirectional */}
              {/* Lead Agent to User-Lead Memory (Request) */}
              {animationStep >= 1 && (
                <AnimatedBeam
                  containerRef={diagramRef}
                  fromRef={leadAgentBeamAnchorRef}
                  toRef={userLeadMemoryRef}
                  pathColor="rgba(156, 163, 175, 0.2)"
                  pathWidth={1.5}
                  gradientStartColor="#9ca3af"
                  gradientStopColor="#9ca3af"
                  particleColor="#9ca3af"
                  delay={0.1}
                  duration={3}
                  curvature={20}
                  startXOffset={0}
                  startYOffset={0}
                  endXOffset={0}
                  endYOffset={-45}
                  pathType="curved"
                  particleDuration={0}
                  reverse={false}
                  showParticles={true}
                  particleDirection={"forward"}
                  particleSize={2}
                  particleCount={4}
                  particleSpeed={4}
                />
              )}

              {/* User-Lead Memory to Lead Agent (Response) */}
              {animationStep >= 1 && (
                <AnimatedBeam
                  containerRef={diagramRef}
                  fromRef={userLeadMemoryRef}
                  toRef={leadAgentBeamAnchorRef}
                  pathColor="rgba(156, 163, 175, 0.2)"
                  pathWidth={1.5}
                  gradientStartColor="#9ca3af"
                  gradientStopColor="#9ca3af"
                  particleColor="#9ca3af"
                  delay={0.2}
                  duration={3}
                  curvature={-20}
                  startXOffset={0}
                  startYOffset={-45}
                  endXOffset={0}
                  endYOffset={0}
                  pathType="curved"
                  particleDuration={0}
                  reverse={false}
                  showParticles={true}
                  particleDirection={"forward"}
                  particleSize={2}
                  particleSpeed={4}
                  particleCount={3}
                />
              )}

              {/* Team to Lead-Team Memory (Request) */}
              {animationStep >= 1 && (
                <AnimatedBeam
                  containerRef={diagramRef}
                  fromRef={teamBeamAnchorRef}
                  toRef={leadTeamMemoryRef}
                  pathColor="rgba(156, 163, 175, 0.2)"
                  pathWidth={1.5}
                  gradientStartColor="#9ca3af"
                  gradientStopColor="#9ca3af"
                  particleColor="#9ca3af"
                  delay={0.1}
                  duration={3}
                  curvature={20}
                  startXOffset={0}
                  startYOffset={0}
                  endXOffset={0}
                  endYOffset={-45}
                  pathType="curved"
                  particleDuration={0}
                  reverse={false}
                  showParticles={true}
                  particleDirection={"forward"}
                  particleSize={2}
                  particleSpeed={4}
                  particleCount={3}
                />
              )}

              {/* Lead-Team Memory to Team (Response) */}
              {animationStep >= 1 && (
                <AnimatedBeam
                  containerRef={diagramRef}
                  fromRef={leadTeamMemoryRef}
                  toRef={teamBeamAnchorRef}
                  pathColor="rgba(156, 163, 175, 0.2)"
                  pathWidth={1.5}
                  gradientStartColor="#9ca3af"
                  gradientStopColor="#9ca3af"
                  particleColor="#9ca3af"
                  delay={0.2}
                  duration={3}
                  curvature={-20}
                  startXOffset={0}
                  startYOffset={-45}
                  endXOffset={0}
                  endYOffset={0}
                  pathType="curved"
                  particleDuration={0}
                  reverse={false}
                  showParticles={true}
                  particleDirection={"forward"}
                  particleSize={2}
                  particleSpeed={4}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Add this at the end of the file, before the last closing brace
const styles = `
  @keyframes agentPulse {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.7;
      transform: scale(1.02);
    }
  }

  .animate-agent-pulse {
    animation: agentPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
`;

// Add style tag to document
if (typeof document !== "undefined") {
  const styleTag = document.createElement("style");
  styleTag.innerHTML = styles;
  document.head.appendChild(styleTag);
}
