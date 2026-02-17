import {
  CircleStackIcon,
  CpuChipIcon,
  FingerPrintIcon,
  LightBulbIcon,
  QueueListIcon,
  Square3Stack3DIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import React, { useState, useEffect, useRef } from "react";
import { AnimatedBeam } from "../magicui/animated-beam";

import {
  CohereLogo,
  PineconeLogo,
  PostgresLogo,
  VoyageLogo,
} from "../../../static/img/logos/integrations";
import { OpenAILogo } from "../../../static/img/logos/openai";
import { SupabaseLogo } from "../../../static/img/logos/supabase";

export function RagExample() {
  const [animationStep, setAnimationStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [activeNodes, setActiveNodes] = useState<string[]>([]);

  // Refs for nodes
  const containerRef = useRef<HTMLDivElement>(null);
  const diagramRef = useRef<HTMLDivElement>(null);
  const inputNodeRef = useRef<HTMLDivElement>(null);
  const embeddingModelTopRef = useRef<HTMLDivElement>(null);
  const embeddingModelBottomRef = useRef<HTMLDivElement>(null);
  const vectorStoreNodeRef = useRef<HTMLDivElement>(null);
  const knowledgeBaseNodeRef = useRef<HTMLDivElement>(null);
  const llmNodeRef = useRef<HTMLDivElement>(null);
  const outputNodeRef = useRef<HTMLDivElement>(null);
  const retrievalNodeRef = useRef<HTMLDivElement>(null);

  // Animation steps for VoltAgent RAG
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
  const startAnimation = () => {
    setAnimationStep(0);
    setIsAnimating(true);
    setActiveNodes([]);

    const stepDurations = [
      2000, // Step 1: Input activation
      2500, // Step 2: Embed phase - Knowledge Base and Embedding Models
      2500, // Step 3: Retrieval phase - Embedding Models and Vector Store
      2500, // Step 4: Retrieval to LLM
      2500, // Step 5: LLM to Output
      2000, // Step 6: Final completion - all nodes flash
    ];

    let currentStep = 0;
    const animateNextStep = () => {
      if (currentStep < totalSteps) {
        setTimeout(() => {
          setAnimationStep(currentStep + 1);

          // Update active nodes and process log based on current step
          if (currentStep + 1 === 1) {
            setActiveNodes(["input"]);

            typeText("User input: 'What are the latest features of VoltAgent?'");
          } else if (currentStep + 1 === 2) {
            // Embed phase - Knowledge Base and Embedding Models
            setActiveNodes(["knowledgeBase", "embeddingBottom", "embeddingTop"]);
            setTimeout(() => {}, 1000);
          } else if (currentStep + 1 === 3) {
            // Retrieval phase - Embedding Models and Vector Store
            setActiveNodes(["embeddingBottom", "embeddingTop", "vectorstore"]);
            setTimeout(() => {}, 1000);
          } else if (currentStep + 1 === 4) {
            setActiveNodes(["retrieval", "vectorstore"]);
            setTimeout(() => {}, 1000);
          } else if (currentStep + 1 === 5) {
            setActiveNodes(["llm"]);
            setTimeout(() => {}, 1000);
          } else if (currentStep + 1 === 6) {
            setActiveNodes(["output"]);

            // Final flash effect for all nodes
            setTimeout(() => {
              setActiveNodes(["all"]);
              setTimeout(() => {
                setActiveNodes([]);
                setIsAnimating(false);

                // Auto-restart animation after 2 seconds
                setTimeout(() => {
                  startAnimation();
                }, 4000);
              }, 800);
            }, 1000);
          }

          currentStep++;
          animateNextStep();
        }, stepDurations[currentStep]);
      } else {
        setIsAnimating(false);
      }
    };

    setTimeout(animateNextStep, 300);
  };

  // Helper function to type text
  const typeText = (text: string) => {
    let typingText = "";
    const typingInterval = setInterval(() => {
      if (typingText.length < text.length) {
        typingText += text[typingText.length];
      } else {
        clearInterval(typingInterval);
      }
    }, 30);
  };

  // Handle mouse events
  const handleMouseEnter = () => {
    if (!isAnimating && animationStep === 0) {
      startAnimation();
    }
  };

  const handleMouseLeave = () => {
    // Optional: Add any behavior when mouse leaves
  };

  // Get node highlight class based on active state
  const getNodeHighlightClass = (nodeName: string) => {
    const isActive = activeNodes.includes(nodeName) || activeNodes.includes("all");
    const isAnyNodeActive = activeNodes.length > 0;

    // Base shadow and border colors for different node types
    const redNodes = ["knowledgeBase", "embeddingBottom", "vectorstore"];
    const isRedNode = redNodes.includes(nodeName);

    // Default border is now visible for both node types
    const baseClasses = isRedNode
      ? "border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
      : "border-gray-500 shadow-[0_0_15px_rgba(156,163,175,0.2)]";

    if (isActive) {
      return `${baseClasses} animate-pulse ${
        isRedNode
          ? "shadow-[0_0_15px_rgba(245,158,11,0.6)]"
          : "shadow-[0_0_15px_rgba(156,163,175,0.6)]"
      }`;
    }
    if (isAnyNodeActive) {
      return `${baseClasses} opacity-70`;
    }

    return baseClasses;
  };

  return (
    <>
      <div
        className="relative w-full"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        ref={containerRef}
      >
        <div className="w-full  mb-16   transition-all duration-500">
          <div className="flex flex-col items-center">
            {/* Diagram Section */}
            <div className="w-full relative  px-4 py-12" ref={diagramRef}>
              {/* Main Container with Border */}
              <div className="border border-gray-800 rounded-lg  mx-auto max-w-6xl">
                {/* Section Headers */}
                <div className="grid grid-cols-5 mb-12">
                  <div className="col-span-1" />
                  <div className="col-span-1 flex justify-center">
                    <div className="text-white text-md font-[monospace]">.embed()</div>
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <div className="text-white text-md font-[monospace]">.query()</div>
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <div className="text-white text-md font-[monospace]">.rerank()</div>
                  </div>
                  <div className="col-span-1" />
                </div>

                {/* Top Row Nodes - Gray */}
                <div className="grid grid-cols-5 gap-8 mb-4">
                  {/* Input Node */}
                  <div className="flex justify-end items-center">
                    <div
                      ref={inputNodeRef}
                      className={`w-[150px] h-[50px] px-4 rounded-md border border-gray-800 text-sm flex items-center bg-gray-950 gap-3 transition-all duration-700 ease-out opacity-100 scale-100 ${getNodeHighlightClass(
                        "input",
                      )}`}
                    >
                      <div className="bg-gray-800/50 w-7 h-7 rounded flex items-center justify-center">
                        <UserIcon className="w-4 h-4 text-gray-500" />
                      </div>
                      <span className="font-medium text-white text-xs">input</span>
                    </div>
                  </div>

                  {/* Embedding Model Node (Top) */}
                  <div className="flex justify-center items-center">
                    <div
                      ref={embeddingModelTopRef}
                      className={`w-[150px] h-[50px] px-4 rounded-md border border-gray-800 text-sm flex items-center bg-gray-950 gap-3 transition-all duration-700 ease-out opacity-100 scale-100 ${getNodeHighlightClass(
                        "embeddingTop",
                      )}`}
                    >
                      <div className="bg-gray-800/50 w-7 h-7 rounded flex items-center justify-center">
                        <Square3Stack3DIcon className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="flex flex-col justify-center">
                        <span className="font-medium text-xs text-white leading-tight">
                          embedding
                        </span>
                        <span className="font-medium text-xs text-white leading-tight">model</span>
                      </div>
                    </div>
                  </div>

                  {/* Retrieval Node */}
                  <div className="flex justify-center items-center">
                    <div
                      ref={retrievalNodeRef}
                      className={`w-[150px] h-[50px] px-4 rounded-md border border-gray-800 text-sm flex items-center bg-gray-950 gap-3 transition-all duration-700 ease-out opacity-100 scale-100 ${getNodeHighlightClass(
                        "retrieval",
                      )}`}
                    >
                      <div className="bg-gray-800/50 w-7 h-7 rounded flex items-center justify-center">
                        <CpuChipIcon className="w-4 h-4 text-gray-400" />
                      </div>
                      <span className=" font-medium text-white text-xs">retrieval</span>
                    </div>
                  </div>

                  {/* LLM Node */}
                  <div className="flex justify-center items-center">
                    <div
                      ref={llmNodeRef}
                      className={`w-[150px] h-[50px] px-4 rounded-md border border-gray-800 text-sm flex items-center bg-gray-950 gap-3 transition-all duration-700 ease-out opacity-100 scale-100 ${getNodeHighlightClass(
                        "llm",
                      )}`}
                    >
                      <div className="bg-gray-800/50 w-7 h-7 rounded flex items-center justify-center">
                        <CpuChipIcon className="w-4 h-4 text-gray-400" />
                      </div>
                      <span className=" font-medium text-white text-xs">llm</span>
                    </div>
                  </div>

                  {/* Output Node */}
                  <div className="flex justify-start items-center">
                    <div
                      ref={outputNodeRef}
                      className={`w-[150px] h-[50px] px-4 rounded-md border border-gray-800 text-sm flex items-center bg-gray-950 gap-3 transition-all duration-700 ease-out opacity-100 scale-100 ${getNodeHighlightClass(
                        "output",
                      )}`}
                    >
                      <div className="bg-gray-800/50 w-7 h-7 rounded flex items-center justify-center">
                        <LightBulbIcon className="w-4 h-4 text-gray-500" />
                      </div>
                      <span className=" font-medium text-white text-xs">output</span>
                    </div>
                  </div>
                </div>

                {/* Top Row Logos */}
                <div className="grid grid-cols-5 gap-8 mb-20">
                  <div className="col-span-1" />
                  <div className="col-span-1" />
                  <div className="col-span-1" />
                  <div className="flex justify-center">
                    <div className="flex gap-4">
                      <div className="relative group cursor-pointer">
                        <VoyageLogo className="w-3.5 h-3.5" />
                        <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 bottom-full mb-2 transform bg-gray-800 text-amber-500 text-xs px-2 py-1 rounded-md whitespace-nowrap shadow-lg border border-gray-700">
                          Voyage
                        </div>
                      </div>
                      <div className="relative group cursor-pointer">
                        <CohereLogo className="w-4 h-4" />
                        <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 bottom-full mb-2 transform bg-gray-800 text-amber-500 text-xs px-2 py-1 rounded-md whitespace-nowrap shadow-lg border border-gray-700">
                          Cohere
                        </div>
                      </div>
                      <div className="relative group cursor-pointer">
                        <PineconeLogo className="w-4 h-4 " />
                        <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 bottom-full mb-2 transform bg-gray-800 text-amber-500 text-xs px-2 py-1 rounded-md whitespace-nowrap shadow-lg border border-gray-700">
                          Pinecone
                        </div>
                      </div>
                      <div className="relative group cursor-pointer">
                        <FingerPrintIcon className="w-5 h-5 text-amber-500" />
                        <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 bottom-full mb-2 transform bg-gray-800 text-amber-500 text-xs px-2 py-1 rounded-md whitespace-nowrap shadow-lg border border-gray-700">
                          Custom
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-span-1" />
                </div>

                {/* Bottom Row Nodes - Red */}
                <div className="grid grid-cols-5 gap-8 mb-4">
                  {/* Knowledge Base Node */}
                  <div className="flex justify-end items-center">
                    <div
                      ref={knowledgeBaseNodeRef}
                      className={`w-[150px] h-[50px] px-4 rounded-md border border-gray-800 text-sm flex items-center bg-gray-950 gap-3 transition-all duration-700 ease-out opacity-100 scale-100 ${getNodeHighlightClass(
                        "knowledgeBase",
                      )}`}
                    >
                      <div className="bg-amber-900/30 w-7 h-7 rounded flex items-center justify-center">
                        <CircleStackIcon className="w-4 h-4 text-amber-500" />
                      </div>
                      <div className="flex flex-col justify-center">
                        <span className="font-medium text-xs text-white leading-tight">
                          knowledge
                        </span>
                        <span className="font-medium text-xs text-white leading-tight">base</span>
                      </div>
                    </div>
                  </div>

                  {/* Embedding Model Node (Bottom) */}
                  <div className="flex justify-center items-center">
                    <div
                      ref={embeddingModelBottomRef}
                      className={`w-[150px] h-[50px] px-4 rounded-md border border-gray-800 text-sm flex items-center bg-gray-950 gap-3 transition-all duration-700 ease-out opacity-100 scale-100 ${getNodeHighlightClass(
                        "embeddingBottom",
                      )}`}
                    >
                      <div className="bg-amber-900/30 w-7 h-7 rounded flex items-center justify-center">
                        <Square3Stack3DIcon className="w-4 h-4 text-amber-500" />
                      </div>
                      <div className="flex flex-col justify-center">
                        <span className="font-medium text-xs text-white leading-tight">
                          embedding
                        </span>
                        <span className="font-medium text-xs text-white leading-tight">model</span>
                      </div>
                    </div>
                  </div>

                  {/* Vector Stores Node */}
                  <div className="flex justify-center items-center">
                    <div
                      ref={vectorStoreNodeRef}
                      className={`w-[150px] h-[50px] px-4 rounded-md border border-gray-800 text-sm flex items-center bg-gray-950 gap-3 transition-all duration-700 ease-out opacity-100 scale-100 ${getNodeHighlightClass(
                        "vectorstore",
                      )}`}
                    >
                      <div className="bg-amber-900/30 w-7 h-7 rounded flex items-center justify-center">
                        <QueueListIcon className="w-4 h-4 text-amber-500" />
                      </div>
                      <div className="flex flex-col justify-center">
                        <span className="font-medium text-white text-xs">vector stores</span>
                      </div>
                    </div>
                  </div>
                  <div className="col-span-2" />
                </div>

                {/* Bottom Row Logos */}
                <div className="grid grid-cols-5 gap-8">
                  <div className="col-span-1" />
                  <div className="flex justify-center">
                    <div className="flex gap-4">
                      <div className="relative group cursor-pointer">
                        <OpenAILogo className="w-4 h-4" />
                        <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 bottom-full mb-2 transform bg-gray-800 text-amber-500 text-xs px-2 py-1 rounded-md whitespace-nowrap shadow-lg border border-gray-700">
                          OpenAI
                        </div>
                      </div>
                      <div className="relative group cursor-pointer">
                        <CohereLogo className="w-4 h-4 text-orange-400" />
                        <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 bottom-full mb-2 transform bg-gray-800 text-amber-500 text-xs px-2 py-1 rounded-md whitespace-nowrap shadow-lg border border-gray-700">
                          Cohere
                        </div>
                      </div>
                      <div className="relative group cursor-pointer ">
                        <VoyageLogo className="w-3.5 h-3.5" />
                        <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 bottom-full mb-2 transform bg-gray-800 text-amber-500 text-xs px-2 py-1 rounded-md whitespace-nowrap shadow-lg border border-gray-700">
                          Voyage
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <div className="flex gap-4">
                      <div className="relative group cursor-pointer">
                        <PineconeLogo className="w-4 h-4" />
                        <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 bottom-full mb-2 transform bg-gray-800 text-amber-500 text-xs px-2 py-1 rounded-md whitespace-nowrap shadow-lg border border-gray-700">
                          Pinecone
                        </div>
                      </div>

                      <div className="relative group cursor-pointer">
                        <PostgresLogo className="w-4 h-4" />
                        <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 bottom-full mb-2 transform bg-gray-800 text-amber-500 text-xs px-2 py-1 rounded-md whitespace-nowrap shadow-lg border border-gray-700">
                          Postgres
                        </div>
                      </div>
                      <div className="relative group cursor-pointer">
                        <SupabaseLogo className="w-4 h-4" />
                        <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 bottom-full mb-2 transform bg-gray-800 text-amber-500 text-xs px-2 py-1 rounded-md whitespace-nowrap shadow-lg border border-gray-700">
                          Supabase
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-span-2" />
                </div>
              </div>

              {/* Animated Beams */}
              {/* 1. Input to Embedding Model (Top) - Particle Beam */}
              {animationStep >= 1 && (
                <AnimatedBeam
                  containerRef={diagramRef}
                  fromRef={inputNodeRef}
                  toRef={embeddingModelTopRef}
                  pathColor="rgba(156, 163, 175, 0.2)"
                  pathWidth={1.5}
                  gradientStartColor="#9ca3af"
                  gradientStopColor="#9ca3af"
                  particleColor="#9ca3af"
                  delay={0.1}
                  duration={3}
                  curvature={0}
                  startXOffset={0}
                  endXOffset={0}
                  pathType="curved"
                  particleDuration={0}
                  solidBeamAfterRequest={true}
                  reverse={false}
                  particleDirection={"forward"}
                  particleSize={2}
                  particleSpeed={4}
                  particleCount={8}
                />
              )}

              {/* 2. Knowledge Base to Embedding Model (Bottom) - Synchronized with step 2 */}
              {animationStep >= 2 && (
                <AnimatedBeam
                  containerRef={diagramRef}
                  fromRef={knowledgeBaseNodeRef}
                  toRef={embeddingModelBottomRef}
                  pathColor="rgba(245, 158, 11, 0.2)"
                  pathWidth={1.5}
                  gradientStartColor="#f59e0b"
                  gradientStopColor="#f59e0b"
                  particleColor="#f59e0b"
                  delay={0.1}
                  duration={3}
                  curvature={0}
                  startXOffset={0}
                  endXOffset={0}
                  pathType="curved"
                  particleDuration={0}
                  solidBeamAfterRequest={true}
                  reverse={false}
                  particleDirection={"forward"}
                  particleSize={2}
                  particleSpeed={4}
                  particleCount={6}
                />
              )}

              {/* 3. Embedding Model (Bottom) to Vector Stores - Synchronized with step 3 */}
              {animationStep >= 3 && (
                <AnimatedBeam
                  containerRef={diagramRef}
                  fromRef={embeddingModelBottomRef}
                  toRef={vectorStoreNodeRef}
                  pathColor="rgba(245, 158, 11, 0.2)"
                  pathWidth={1.5}
                  gradientStartColor="#f59e0b"
                  gradientStopColor="#f59e0b"
                  particleColor="#f59e0b"
                  delay={0.1}
                  duration={3}
                  curvature={10}
                  startXOffset={0}
                  endXOffset={0}
                  pathType="curved"
                  particleDuration={0}
                  solidBeamAfterRequest={true}
                  reverse={false}
                  particleDirection={"forward"}
                  particleSize={3}
                  particleSpeed={3}
                  particleCount={6}
                />
              )}

              {/* 4. Embedding Model (Top) to Retrieval - Synchronized with step 3 */}
              {animationStep >= 3 && (
                <AnimatedBeam
                  containerRef={diagramRef}
                  fromRef={embeddingModelTopRef}
                  toRef={retrievalNodeRef}
                  pathColor="rgba(156, 163, 175, 0.2)"
                  pathWidth={1.5}
                  gradientStartColor="#9ca3af"
                  gradientStopColor="#9ca3af"
                  particleColor="#9ca3af"
                  delay={0.1}
                  duration={3}
                  curvature={0}
                  startXOffset={0}
                  endXOffset={0}
                  pathType="curved"
                  particleDuration={0}
                  solidBeamAfterRequest={true}
                  reverse={false}
                  particleDirection={"forward"}
                  particleSize={3}
                  particleSpeed={3}
                  particleCount={6}
                />
              )}

              {/* 5. Vector Stores to Retrieval - Request Beam */}
              {animationStep >= 4 && (
                <AnimatedBeam
                  containerRef={diagramRef}
                  fromRef={retrievalNodeRef}
                  toRef={vectorStoreNodeRef}
                  pathColor="rgba(245, 158, 11, 0.2)"
                  pathWidth={1.5}
                  gradientStartColor="#f59e0b"
                  gradientStopColor="#f59e0b"
                  particleColor="#f59e0b"
                  delay={0.1}
                  duration={3}
                  curvature={0}
                  startXOffset={20}
                  endXOffset={20}
                  pathType="curved"
                  particleDuration={0}
                  solidBeamAfterRequest={true}
                  reverse={false}
                  particleDirection={"forward"}
                  particleSize={2.5}
                  particleSpeed={5}
                  particleCount={10}
                />
              )}

              {/* 5b. Vector Stores to Retrieval - Response Beam */}
              {animationStep >= 4 && (
                <AnimatedBeam
                  containerRef={diagramRef}
                  fromRef={vectorStoreNodeRef}
                  toRef={retrievalNodeRef}
                  pathColor="rgba(245, 158, 11, 0.2)"
                  pathWidth={1.5}
                  gradientStartColor="#f59e0b"
                  gradientStopColor="#f59e0b"
                  particleColor="#f59e0b"
                  delay={0.1}
                  duration={3}
                  curvature={0}
                  startXOffset={-20}
                  endXOffset={-20}
                  pathType="curved"
                  particleDuration={0}
                  solidBeamAfterRequest={true}
                  reverse={false}
                  particleDirection={"forward"}
                  particleSize={2.5}
                  particleSpeed={5}
                  particleCount={10}
                />
              )}

              {/* 6. Retrieval to LLM - Vibrating Beam */}
              {animationStep >= 5 && (
                <AnimatedBeam
                  containerRef={diagramRef}
                  fromRef={retrievalNodeRef}
                  toRef={llmNodeRef}
                  pathColor="rgba(156, 163, 175, 0.2)"
                  pathWidth={2}
                  gradientStartColor="#9ca3af"
                  gradientStopColor="#9ca3af"
                  particleColor="#9ca3af"
                  delay={0.1}
                  duration={3}
                  curvature={5}
                  startXOffset={0}
                  endXOffset={0}
                  pathType="curved"
                  particleDuration={0}
                  solidBeamAfterRequest={true}
                  reverse={false}
                  particleDirection={"forward"}
                  particleSize={2}
                  particleSpeed={6}
                  particleCount={12}
                />
              )}

              {/* 7. LLM to Output - Wavy Beam */}
              {animationStep >= 6 && (
                <AnimatedBeam
                  containerRef={diagramRef}
                  fromRef={llmNodeRef}
                  toRef={outputNodeRef}
                  pathColor="rgba(156, 163, 175, 0.2)"
                  pathWidth={1.5}
                  gradientStartColor="#9ca3af"
                  gradientStopColor="#9ca3af"
                  particleColor="#9ca3af"
                  delay={0.1}
                  duration={3}
                  curvature={0}
                  startXOffset={0}
                  endXOffset={0}
                  pathType="curved"
                  particleDuration={0}
                  solidBeamAfterRequest={true}
                  reverse={false}
                  particleDirection={"forward"}
                  particleSize={3}
                  particleSpeed={4}
                  particleCount={8}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
