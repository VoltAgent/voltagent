import { FingerPrintIcon } from "@heroicons/react/24/outline";
import React, { useState, useEffect, useRef } from "react";
import {
  CohereLogo,
  PineconeLogo,
  PostgresLogo,
  VoyageLogo,
} from "../../../static/img/logos/integrations";
import { OpenAILogo } from "../../../static/img/logos/openai";
import { SupabaseLogo } from "../../../static/img/logos/supabase";
import { AnimatedBeam } from "../magicui/animated-beam";

export function RagMobile() {
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
      { threshold: 0.3 },
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

    const stepDurations = [2000, 2500, 2500, 2500, 2500, 2000];

    let currentStep = 0;
    const animateNextStep = () => {
      if (currentStep < totalSteps) {
        setTimeout(() => {
          setAnimationStep(currentStep + 1);

          if (currentStep + 1 === 1) {
            setActiveNodes(["input"]);
          } else if (currentStep + 1 === 2) {
            setActiveNodes(["knowledgeBase", "embeddingBottom", "embeddingTop"]);
          } else if (currentStep + 1 === 3) {
            setActiveNodes(["embeddingBottom", "embeddingTop", "vectorstore"]);
          } else if (currentStep + 1 === 4) {
            setActiveNodes(["retrieval", "vectorstore"]);
          } else if (currentStep + 1 === 5) {
            setActiveNodes(["llm"]);
          } else if (currentStep + 1 === 6) {
            setActiveNodes(["output"]);

            setTimeout(() => {
              setActiveNodes(["all"]);
              setTimeout(() => {
                setActiveNodes([]);
                setIsAnimating(false);

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
    const redNodes = ["knowledgeBase", "embeddingBottom", "vectorstore"];
    const isRedNode = redNodes.includes(nodeName);

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

  // Render logos for embedding models
  const renderEmbeddingLogos = () => (
    <div className="flex items-center justify-center gap-3">
      <div className="relative group">
        <OpenAILogo className="w-4 h-4" />
        <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 bottom-full mb-2 transform bg-gray-800 text-amber-500 text-[10px] px-2 py-1 rounded-md whitespace-nowrap shadow-lg border border-gray-700">
          OpenAI
        </div>
      </div>
      <div className="relative group">
        <CohereLogo className="w-4 h-4 text-orange-400" />
        <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 bottom-full mb-2 transform bg-gray-800 text-amber-500 text-[10px] px-2 py-1 rounded-md whitespace-nowrap shadow-lg border border-gray-700">
          Cohere
        </div>
      </div>
      <div className="relative group">
        <VoyageLogo className="w-3.5 h-3.5" />
        <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 bottom-full mb-2 transform bg-gray-800 text-amber-500 text-[10px] px-2 py-1 rounded-md whitespace-nowrap shadow-lg border border-gray-700">
          Voyage
        </div>
      </div>
    </div>
  );

  // Render logos for LLM
  const renderLLMLogos = () => (
    <div className="flex items-center justify-center gap-3">
      <div className="relative group">
        <OpenAILogo className="w-4 h-4" />
        <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 bottom-full mb-2 transform bg-gray-800 text-amber-500 text-[10px] px-2 py-1 rounded-md whitespace-nowrap shadow-lg border border-gray-700">
          OpenAI
        </div>
      </div>
      <div className="relative group">
        <CohereLogo className="w-4 h-4 text-orange-400" />
        <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 bottom-full mb-2 transform bg-gray-800 text-amber-500 text-[10px] px-2 py-1 rounded-md whitespace-nowrap shadow-lg border border-gray-700">
          Cohere
        </div>
      </div>
      <div className="relative group">
        <VoyageLogo className="w-3.5 h-3.5" />
        <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 bottom-full mb-2 transform bg-gray-800 text-amber-500 text-[10px] px-2 py-1 rounded-md whitespace-nowrap shadow-lg border border-gray-700">
          Voyage
        </div>
      </div>
      <div className="relative group">
        <FingerPrintIcon className="w-5 h-5 text-amber-500" />
        <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 bottom-full mb-2 transform bg-gray-800 text-amber-500 text-[10px] px-2 py-1 rounded-md whitespace-nowrap shadow-lg border border-gray-700">
          Custom
        </div>
      </div>
    </div>
  );

  // Render logos for vector stores
  const renderVectorStoreLogos = () => (
    <div className="flex items-center justify-center gap-3">
      <div className="relative group">
        <PineconeLogo className="w-4 h-4" />
        <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 bottom-full mb-2 transform bg-gray-800 text-amber-500 text-[10px] px-2 py-1 rounded-md whitespace-nowrap shadow-lg border border-gray-700">
          Pinecone
        </div>
      </div>
      <div className="relative group">
        <PostgresLogo className="w-4 h-4" />
        <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 bottom-full mb-2 transform bg-gray-800 text-amber-500 text-[10px] px-2 py-1 rounded-md whitespace-nowrap shadow-lg border border-gray-700">
          Postgres
        </div>
      </div>
      <div className="relative group">
        <SupabaseLogo className="w-4 h-4" />
        <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 bottom-full mb-2 transform bg-gray-800 text-amber-500 text-[10px] px-2 py-1 rounded-md whitespace-nowrap shadow-lg border border-gray-700">
          Supabase
        </div>
      </div>
    </div>
  );

  return (
    <div
      className="relative w-full"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      ref={containerRef}
    >
      <div className="w-full mb-12  transition-all duration-500">
        <div className="flex flex-col items-center">
          <div className="w-full relative  " ref={diagramRef}>
            <div className=" py-8 mx-auto max-w-md">
              {/* Vertical Flow Layout */}
              <div className="flex flex-col gap-12">
                {/* Input and Knowledge Base Row */}
                <div className="flex justify-between gap-5">
                  <div
                    ref={inputNodeRef}
                    className={`w-[120px] px-2 py-2 rounded-md border-gray-800  flex flex-col items-center text-center  bg-gray-950 ${getNodeHighlightClass(
                      "input",
                    )}`}
                  >
                    <span className="font-medium text-white text-[10px]">Input</span>
                  </div>
                  <div
                    ref={knowledgeBaseNodeRef}
                    className={`w-[120px] px-2 py-2 rounded-md border-gray-800  flex flex-col items-center text-center  bg-gray-950 ${getNodeHighlightClass(
                      "knowledgeBase",
                    )}`}
                  >
                    <span className="font-medium text-[10px] text-white">Knowledge base</span>
                  </div>
                </div>

                {/* Embedding Models Row */}
                <div className="flex justify-between">
                  <div className="flex flex-col items-center">
                    <div
                      ref={embeddingModelTopRef}
                      className={`w-[120px] px-2 py-2 rounded-md border-gray-800  flex flex-col items-center text-center  bg-gray-950 ${getNodeHighlightClass(
                        "embeddingTop",
                      )}`}
                    >
                      <div className="flex flex-col justify-center">
                        <span className="font-medium text-[10px] text-white leading-tight">
                          Embedding model
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-white text-md font-[monospace] self-center">.embed()</div>
                  <div className="flex flex-col items-center">
                    <div
                      ref={embeddingModelBottomRef}
                      className={`w-[120px] px-2 py-2 rounded-md border-gray-800  flex flex-col items-center text-center  bg-gray-950 ${getNodeHighlightClass(
                        "embeddingBottom",
                      )}`}
                    >
                      <div className="flex flex-col justify-center">
                        <span className="font-medium text-[10px] text-white leading-tight">
                          Embedding model
                        </span>
                      </div>
                    </div>
                    <div className="mt-2">{renderEmbeddingLogos()}</div>
                  </div>
                </div>

                {/* Retrieval and Vector Store Row */}
                <div className="flex justify-between ">
                  <div className="flex flex-col items-center">
                    <div
                      ref={retrievalNodeRef}
                      className={`w-[120px] px-2 py-2 rounded-md border-gray-800  flex flex-col items-center text-center  bg-gray-950  ${getNodeHighlightClass(
                        "retrieval",
                      )}`}
                    >
                      <span className="font-medium text-[10px] text-white leading-tight">
                        Retrieval
                      </span>
                    </div>
                  </div>
                  <div className="text-white text-md font-[monospace] self-center">.query()</div>
                  <div className="flex flex-col items-center">
                    <div
                      ref={vectorStoreNodeRef}
                      className={`w-[120px] px-2 py-2 rounded-md  border-gray-800  flex flex-col items-center text-center  bg-gray-950 ${getNodeHighlightClass(
                        "vectorstore",
                      )}`}
                    >
                      <span className="font-medium text-white text-[10px]">Vector stores</span>
                    </div>
                    <div className="mt-2">{renderVectorStoreLogos()}</div>
                  </div>
                </div>

                {/* LLM Node */}
                <div className="flex justify-between gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      ref={llmNodeRef}
                      className={`w-[120px] px-2 py-2 rounded-md border-solid border-gray-800  flex flex-col items-center text-center  bg-gray-950 ${getNodeHighlightClass(
                        "llm",
                      )}`}
                    >
                      <span className="font-medium text-white text-[10px]">LLM</span>
                    </div>
                    <div className="mt-2">{renderLLMLogos()}</div>
                  </div>
                  <div className="text-white text-md font-[monospace] self-center">.rerank()</div>
                  <div className="w-[120px]" />
                </div>

                {/* Output Node */}
                <div className="flex gap-4">
                  <div className="flex flex-col items-center ml-0">
                    <div
                      ref={outputNodeRef}
                      className={`w-[120px] px-2 py-2 rounded-md border-solid border-gray-800  flex flex-col items-center text-center  bg-gray-950 ${getNodeHighlightClass(
                        "output",
                      )}`}
                    >
                      <span className="font-medium text-white text-[10px]">Output</span>
                    </div>
                  </div>
                  <div className="w-[120px]" />
                </div>
              </div>

              {/* Animated Beams */}
              {/* Input to Embedding Model & Knowledge Base to Embedding Model */}
              {animationStep >= 1 && (
                <>
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
                    particleCount={1}
                  />
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
                    particleCount={1}
                  />
                </>
              )}

              {/* Embedding Models to Vector Store */}
              {animationStep >= 2 && (
                <>
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
                    particleSize={2}
                    particleSpeed={4}
                    particleCount={1}
                  />
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
                    particleCount={1}
                  />
                </>
              )}

              {/* Vector Store to Retrieval - Bidirectional */}
              {animationStep >= 3 && (
                <>
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
                </>
              )}

              {/* Retrieval to LLM */}
              {animationStep >= 4 && (
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
                  curvature={0}
                  startXOffset={0}
                  endXOffset={0}
                  pathType="curved"
                  particleDuration={0}
                  solidBeamAfterRequest={true}
                  reverse={false}
                  particleDirection={"forward"}
                  particleSize={2}
                  particleSpeed={6}
                  particleCount={1}
                />
              )}

              {/* LLM to Output */}
              {animationStep >= 5 && (
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
    </div>
  );
}
