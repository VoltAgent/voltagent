"use client";

import {
  ArrowPathIcon,
  ArrowPathRoundedSquareIcon,
  BoltIcon,
  ChatBubbleLeftRightIcon,
  CircleStackIcon,
  ClockIcon,
  CommandLineIcon as CodeIcon,
  CommandLineIcon,
  CpuChipIcon,
  DocumentTextIcon,
  ArrowPathIcon as IntegrationIcon,
  MagnifyingGlassIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import { useMediaQuery } from "@site/src/hooks/use-media-query";
import clsx from "clsx";
import React, { forwardRef, useRef, useState, useEffect } from "react";
import { AirtableLogo, GitHubLogo, GmailLogo, SlackLogo } from "../../../static/img/logos";
import { AnimatedBeam } from "../magicui/animated-beam";

// Beat types mapping for different node types
const beatTypes: Record<string, string> = {
  userPrompt: "kick",
  apiCall: "snare",
  webhook: "hihat",
  context: "clap",
  core: "bass",
  llm: "synth",
  memory: "tom",
  tools: "crash",
  workflow: "shaker",
  rag: "cowbell",
  aiResponse: "rimshot",
  automation: "percussion1",
  apiResponse: "percussion2",
  webhookOut: "bongo",
};

// Create a global audio context that's lazily initialized
let audioContextInstance: AudioContext | null = null;
const getAudioContext = () => {
  if (typeof window === "undefined") return null;

  if (!audioContextInstance) {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioContextInstance = new AudioContextClass();
      }
    } catch (error) {
      console.error("Failed to create AudioContext:", error);
    }
  }

  // Resume the audio context if it's suspended (browser autoplay policy)
  if (audioContextInstance && audioContextInstance.state === "suspended") {
    audioContextInstance.resume();
  }

  return audioContextInstance;
};

// State to track beats in sequence
let activeBeats: string[] = [];
let beatInterval: number | null = null;
let isPlaying = false;
let activeSources: (AudioBufferSourceNode | OscillatorNode)[] = [];
let activeGainNodes: GainNode[] = [];

// Maximum number of allowed active beats to prevent overload
const MAX_ACTIVE_BEATS = 8;

// Beat configs with memoization for better performance
const beatConfigs: Record<string, any> = {
  kick: {
    type: "sine",
    frequency: 60,
    decay: 0.4,
    filterType: "lowpass",
    filterFreq: 100,
    gain: 0.7,
  },
  snare: {
    type: "triangle",
    frequency: 180,
    decay: 0.2,
    filterType: "highpass",
    filterFreq: 800,
    gain: 0.4,
  },
  hihat: {
    type: "square",
    frequency: 800,
    decay: 0.05,
    filterType: "highpass",
    filterFreq: 5000,
    gain: 0.15,
  },
  clap: {
    type: "triangle",
    frequency: 600,
    decay: 0.15,
    filterType: "bandpass",
    filterFreq: 1200,
    gain: 0.3,
  },
  bass: {
    type: "sine",
    frequency: 80,
    decay: 0.8,
    filterType: "lowpass",
    filterFreq: 400,
    gain: 0.7,
  },
  synth: {
    type: "sawtooth",
    frequency: 440,
    decay: 0.5,
    filterType: "lowpass",
    filterFreq: 2000,
    gain: 0.4,
  },
  tom: {
    type: "sine",
    frequency: 150,
    decay: 0.3,
    filterType: "lowpass",
    filterFreq: 800,
    gain: 0.5,
  },
  crash: {
    type: "white",
    frequency: 3000,
    decay: 0.8,
    filterType: "highpass",
    filterFreq: 2000,
    gain: 0.2,
  },
  shaker: {
    type: "white",
    frequency: 4000,
    decay: 0.1,
    filterType: "bandpass",
    filterFreq: 6000,
    gain: 0.1,
  },
  cowbell: {
    type: "triangle",
    frequency: 800,
    decay: 0.3,
    filterType: "bandpass",
    filterFreq: 1500,
    gain: 0.3,
  },
  rimshot: {
    type: "square",
    frequency: 400,
    decay: 0.1,
    filterType: "highpass",
    filterFreq: 1000,
    gain: 0.3,
  },
  percussion1: {
    type: "triangle",
    frequency: 300,
    decay: 0.2,
    filterType: "bandpass",
    filterFreq: 1000,
    gain: 0.4,
  },
  percussion2: {
    type: "square",
    frequency: 200,
    decay: 0.2,
    filterType: "bandpass",
    filterFreq: 1500,
    gain: 0.35,
  },
  bongo: {
    type: "sine",
    frequency: 200,
    decay: 0.3,
    filterType: "lowpass",
    filterFreq: 800,
    gain: 0.5,
  },
};

// Cached noise buffer for white noise sounds
let noiseBuffer: AudioBuffer | null = null;

// Function to play a beat sound
const playBeat = (beatType: string) => {
  try {
    const audioContext = getAudioContext();
    if (!audioContext) return;

    // Get configuration for the selected beat
    const config = beatConfigs[beatType] || beatConfigs.kick;

    // Create audio nodes
    const gainNode = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();

    // Configure filter
    filter.type = config.filterType as BiquadFilterType;
    filter.frequency.setValueAtTime(config.filterFreq, audioContext.currentTime);
    filter.Q.setValueAtTime(1, audioContext.currentTime);

    // Connect filter to gain node
    filter.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Set gain envelope
    gainNode.gain.setValueAtTime(config.gain, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + config.decay);

    // Track gain node for cleanup
    activeGainNodes.push(gainNode);

    // Handle noise for special beat types
    if (config.type === "white") {
      // Create or reuse noise buffer
      if (!noiseBuffer) {
        const bufferSize = audioContext.sampleRate;
        noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        const output = noiseBuffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }
      }

      const whiteNoise = audioContext.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      whiteNoise.connect(filter);
      whiteNoise.start();

      // Track source for cleanup
      activeSources.push(whiteNoise);

      // Automatically stop and clean up
      setTimeout(() => {
        try {
          whiteNoise.stop();
          whiteNoise.disconnect();
          const index = activeSources.indexOf(whiteNoise);
          if (index > -1) activeSources.splice(index, 1);
        } catch {
          // Ignore errors during cleanup
        }
      }, config.decay * 1000);
    } else {
      // Regular oscillator for tonal beats
      const oscillator = audioContext.createOscillator();
      oscillator.type = config.type as OscillatorType;
      oscillator.frequency.setValueAtTime(config.frequency, audioContext.currentTime);

      if (beatType === "kick") {
        // Frequency sweep for kick drum
        oscillator.frequency.exponentialRampToValueAtTime(20, audioContext.currentTime + 0.03);
      }

      oscillator.connect(filter);
      oscillator.start();

      // Track source for cleanup
      activeSources.push(oscillator);

      // Automatically stop and clean up
      setTimeout(() => {
        try {
          oscillator.stop();
          oscillator.disconnect();
          const index = activeSources.indexOf(oscillator);
          if (index > -1) activeSources.splice(index, 1);
        } catch {
          // Ignore errors during cleanup
        }
      }, config.decay * 1000);
    }

    // Add to active beats if not already included and under the limit
    if (!activeBeats.includes(beatType) && activeBeats.length < MAX_ACTIVE_BEATS) {
      activeBeats.push(beatType);
      console.log(`Beat added: ${beatType} (${activeBeats.length}/${MAX_ACTIVE_BEATS})`);

      // Start the sequencer if it's not already running and we have beats to play
      if (!isPlaying && activeBeats.length > 0) {
        startBeatSequencer();
      }
    } else if (activeBeats.length >= MAX_ACTIVE_BEATS && !activeBeats.includes(beatType)) {
      console.log(`⚠️ Maximum beat limit reached (${MAX_ACTIVE_BEATS}). Remove beats to add more.`);
    }
  } catch (error) {
    console.error("Audio playback error:", error);
    // Try to clean up audio context if there's an error
    cleanupAudioResources();
  }
};

// Clean up audio resources to prevent memory leaks
const cleanupAudioResources = () => {
  // Stop all active sources
  for (const source of activeSources) {
    try {
      source.stop();
      source.disconnect();
    } catch {
      // Ignore errors during cleanup
    }
  }

  // Clear arrays
  activeSources = [];
  activeGainNodes = [];
};

// Beat sequencer to play all active beats in a loop
const startBeatSequencer = () => {
  if (isPlaying) return;

  isPlaying = true;
  const tempo = 120; // beats per minute
  const stepTime = ((60 / tempo) * 1000) / 2; // 16th notes

  let step = 0;

  // Add start message
  console.log(`🥁 Beat maker activated! (${activeBeats.length} beats)`);

  beatInterval = window.setInterval(() => {
    // Play each active beat according to its pattern in the 16-step sequence
    for (const beatType of activeBeats) {
      const beatPatterns: Record<string, number[]> = {
        kick: [0, 4, 8, 12],
        snare: [4, 12],
        hihat: [0, 2, 4, 6, 8, 10, 12, 14],
        clap: [4, 12],
        bass: [0, 3, 7, 10],
        synth: [0, 7, 8, 15],
        tom: [3, 11],
        crash: [0],
        shaker: [2, 6, 10, 14],
        cowbell: [8],
        rimshot: [2, 10],
        percussion1: [1, 5, 9, 13],
        percussion2: [3, 7, 11, 15],
        bongo: [0, 4, 7, 12, 14],
      };

      const pattern = beatPatterns[beatType] || [0];

      if (pattern.includes(step)) {
        playBeat(beatType);
      }
    }

    step = (step + 1) % 16;

    // If no more active beats, stop the sequencer
    if (activeBeats.length === 0) {
      stopBeatSequencer();
    }
  }, stepTime);

  // Add stop button to console
  console.log("🎵 Click 'Stop Beats' below to reset");
  console.log(
    "%cStop Beats",
    "background: red; color: white; padding: 2px 5px; border-radius: 3px; cursor: pointer;",
  );

  // Reset after 30 seconds if user doesn't stop manually
  setTimeout(() => {
    if (isPlaying) {
      stopBeatSequencer();
    }
  }, 30000);
};

// Function to stop the sequencer
const stopBeatSequencer = () => {
  if (beatInterval) {
    window.clearInterval(beatInterval);
    beatInterval = null;
  }

  // Clean up audio resources
  cleanupAudioResources();

  // Reset state
  activeBeats = [];
  isPlaying = false;

  console.log("Beat machine stopped and reset");
};

// Function to remove a specific beat from the sequence
const removeBeat = (beatType: string) => {
  const index = activeBeats.indexOf(beatType);
  if (index > -1) {
    activeBeats.splice(index, 1);
    console.log(`Beat removed: ${beatType}`);
  }
};

// Handle the stop button click from console
if (typeof window !== "undefined") {
  const originalConsoleLog = console.log;
  console.log = (...args: Parameters<typeof console.log>) => {
    if (args[0] === "%cStop Beats" && args.length > 1) {
      const element = document.createElement("div");
      element.setAttribute("style", args[1]);
      element.textContent = "Stop Beats";
      element.addEventListener("click", stopBeatSequencer);
      originalConsoleLog.apply(console, [element]);
    } else {
      originalConsoleLog.apply(console, args);
    }
  };

  // Clean up resources when navigating away
  window.addEventListener("beforeunload", () => {
    stopBeatSequencer();
    if (audioContextInstance) {
      audioContextInstance.close();
      audioContextInstance = null;
    }
  });
}

const Node = forwardRef<
  HTMLDivElement,
  {
    className?: string;
    children?: React.ReactNode;
    label?: string;
    description?: string;
    type?: "input" | "output" | "core" | "module";
    icon?: React.ReactNode;
    nodeId?: string;
  }
>(({ className, children, label, description, type = "input", nodeId }, ref) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const isMobile = useMediaQuery("(max-width: 768px)");

  const beatType = beatTypes[nodeId || type] || beatTypes.kick;

  // biome-ignore lint/correctness/useExhaustiveDependencies: ignore
  useEffect(() => {
    // Update active state based on presence in activeBeats
    setIsActive(activeBeats.includes(beatType));
  }, [beatType, activeBeats.length]);

  const handleNodeClick = () => {
    // Initialize audio context on first click (needed for Safari/iOS)
    getAudioContext();

    // Toggle the beat on/off
    if (activeBeats.includes(beatType)) {
      removeBeat(beatType);
      setIsActive(false);
    } else {
      playBeat(beatType);
      setIsActive(true);
    }
  };

  // Render rectangular nodes for input and output types
  if (type === "input" || type === "output") {
    return (
      <div className="relative">
        <div
          ref={ref}
          className={clsx(
            "z-10 flex items-center rounded-md backdrop-blur-sm border border-dashed border-opacity-40 transition-all duration-300 hover:scale-105 px-2 py-2 cursor-pointer",
            isMobile ? "w-28" : "w-38",
            type === "input" ? "border-[#4f5d75]" : "border-[#4f5d75]",
            isActive && "bg-[#113328] shadow-[0_0_15px_rgba(0,217,146,0.2)]",
            className,
          )}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={handleNodeClick}
        >
          <div className={clsx("flex items-center justify-center mr-3", "size-5")}>{children}</div>
          <span className="text-xs font-medium text-gray-300">{label}</span>
        </div>

        {/* Tooltip */}
        {description && isHovered && (
          <div className="absolute top-full mt-2 z-50 w-48 rounded-md bg-[#0c2520] border border-solid border-[#113328] p-3 shadow-lg text-xs text-gray-300">
            {description}
            {isActive && <div className="mt-1 text-[#00d992]">✓ Active in beat sequence</div>}
          </div>
        )}
      </div>
    );
  }

  // Keep the original circular design for core and module types
  return (
    <div className="flex flex-col items-center relative">
      {label && type === "core" && (
        <span className="text-xs mb-2 font-medium text-gray-300">{label}</span>
      )}
      <div
        ref={ref}
        className={clsx(
          "z-10 flex items-center justify-center rounded-full border-2 border-solid transition-all duration-300 hover:scale-110 cursor-pointer",
          type === "core"
            ? "border-[#00d992] pt-1 mb-3 shadow-[0_0_30px_rgba(0,217,146,0.3)]"
            : "border-[#00d992]",
          type === "core" ? (isMobile ? "size-9" : "size-14") : "size-9",
          isActive && "bg-[#113328] shadow-[0_0_15px_rgba(0,217,146,0.5)]",
          className,
        )}
        data-type={type}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleNodeClick}
      >
        {children}
      </div>

      {label && type === "module" && (
        <span className="mt-2 text-xs font-medium text-gray-300">{label}</span>
      )}

      {/* Tooltip */}
      {description && isHovered && (
        <div className="absolute top-full mt-2 z-50 w-48 rounded-md bg-[#0c2520] border-solid border border-[#113328] p-3 shadow-lg text-xs text-gray-300">
          {description}
          {isActive && <div className="mt-1 text-[#00d992]">✓ Active in beat sequence</div>}
        </div>
      )}
    </div>
  );
});

Node.displayName = "Node";

export function AgentsAnimation({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Input nodes
  const userPromptRef = useRef<HTMLDivElement>(null);
  const apiCallRef = useRef<HTMLDivElement>(null);
  const webhookRef = useRef<HTMLDivElement>(null);
  const contextRef = useRef<HTMLDivElement>(null);

  // Core node
  const voltAgentRef = useRef<HTMLDivElement>(null);

  // Module container box ref
  const moduleContainerRef = useRef<HTMLDivElement>(null);

  // Module nodes
  const llmRef = useRef<HTMLDivElement>(null);
  const memoryRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  const workflowRef = useRef<HTMLDivElement>(null);
  const ragRef = useRef<HTMLDivElement>(null);

  // Output nodes
  const aiResponseRef = useRef<HTMLDivElement>(null);
  const automationRef = useRef<HTMLDivElement>(null);
  const apiResponseRef = useRef<HTMLDivElement>(null);
  const webhookOutRef = useRef<HTMLDivElement>(null);

  // Animation timing values
  const leftToCenterDuration = 3.0; // Left -> Center transition duration
  const centerToRightDuration = 3.0; // Center -> Right transition duration
  const startDelay = 1.0; // Initial particle start delay
  const particleInterval = 2.0; // Time between particles
  const loopDelay = 2.0; // Delay between loops

  // Input colors and types
  const inputTypes = ["userPrompt", "apiCall", "webhook", "context"];
  const inputColors = {
    userPrompt: "#00FFB2", // Neon green
    apiCall: "#4F46E5", // Electric blue
    webhook: "#FF3DFF", // Neon pink
    context: "#00D1FF", // Neon blue
  };

  // Output refs array for random selection
  const outputRefs = [aiResponseRef, automationRef, apiResponseRef, webhookOutRef];

  // Animation cycle counter
  const [cycle, setCycle] = useState(0);

  // State to track active beams
  const [activeBeams, setActiveBeams] = useState<{
    input: string[];
    output: string[];
  }>({
    input: [],
    output: [],
  });

  // State to store current output mappings
  const [outputMapping, setOutputMapping] = useState<{
    [key: string]: React.RefObject<HTMLDivElement>;
  }>({});

  // Module interaction state
  const [moduleInteractionActive, setModuleInteractionActive] = useState(false);

  // Function to shuffle array
  const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  // Input sequence configuration
  const inputSequence = [
    {
      type: "userPrompt",
      fromRef: userPromptRef,
      color: inputColors.userPrompt,
      delay: startDelay,
    },
    {
      type: "apiCall",
      fromRef: apiCallRef,
      color: inputColors.apiCall,
      delay: startDelay + particleInterval,
    },
    {
      type: "webhook",
      fromRef: webhookRef,
      color: inputColors.webhook,
      delay: startDelay + particleInterval * 2,
    },
    {
      type: "context",
      fromRef: contextRef,
      color: inputColors.context,
      delay: startDelay + particleInterval * 3,
    },
  ];

  // Effect to generate new random output mappings for each cycle
  // biome-ignore lint/correctness/useExhaustiveDependencies: ignore
  useEffect(() => {
    const shuffledOutputs = shuffleArray([...outputRefs]);
    const newMapping: { [key: string]: React.RefObject<HTMLDivElement> } = {};
    inputTypes.forEach((type, index) => {
      newMapping[type] = shuffledOutputs[index];
    });
    setOutputMapping(newMapping);

    // Reset active beams at the start of each cycle
    setActiveBeams({ input: [], output: [] });
  }, [cycle]);

  // Effect to handle beam sequence and animation cycle
  // biome-ignore lint/correctness/useExhaustiveDependencies: ignore
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    // Start input beams
    for (const input of inputSequence) {
      const inputTimer = setTimeout(() => {
        setActiveBeams((prev) => ({
          ...prev,
          input: [...prev.input, input.type],
        }));

        // Start output beam when input reaches Volt Agent
        const outputTimer = setTimeout(() => {
          setActiveBeams((prev) => ({
            ...prev,
            output: [...prev.output, input.type],
          }));
        }, leftToCenterDuration * 1000);

        timers.push(outputTimer);
      }, input.delay * 1000);

      timers.push(inputTimer);
    }

    // Calculate when the last output beam will complete
    const lastBeamCompleteTime =
      startDelay + particleInterval * 3 + leftToCenterDuration + centerToRightDuration + loopDelay;

    // Start next cycle after all beams complete
    const cycleTimer = setTimeout(() => {
      setCycle((prev) => prev + 1);
    }, lastBeamCompleteTime * 1000);

    timers.push(cycleTimer);

    return () => {
      for (const timer of timers) {
        clearTimeout(timer);
      }
    };
  }, [cycle]);

  // Effect to activate/deactivate module interactions
  useEffect(() => {
    // Start module interactions when the first particle reaches Volt Agent
    if (activeBeams.output.length > 0 && !moduleInteractionActive) {
      setModuleInteractionActive(true);
    }

    // End module interactions at the end of each cycle
    // We need to track when the last output beam will be completed
    if (activeBeams.output.length === inputSequence.length) {
      const lastBeamCompleteTime = centerToRightDuration * 1000;

      const timer = setTimeout(() => {
        setModuleInteractionActive(false);
      }, lastBeamCompleteTime);

      return () => clearTimeout(timer);
    }
  }, [activeBeams.output, moduleInteractionActive, inputSequence.length]);

  // Reset module interactions at start of new cycle
  // biome-ignore lint/correctness/useExhaustiveDependencies: ignore
  useEffect(() => {
    setModuleInteractionActive(false);
  }, [cycle]);

  const isMobile = useMediaQuery("(max-width: 768px)");
  return (
    <div
      className={clsx("relative flex flex-col w-full max-w-4xl h-full items-center", className)}
      ref={containerRef}
    >
      <div className="relative flex justify-center items-center h-full w-full landing-xs:scale-[1] ] landing-md:scale-100 landing-xs:mt-12 landing-md:mt-0">
        {/* Input nodes column - Left aligned */}
        <div className="absolute left-0 flex flex-col justify-center h-full space-y-4">
          <Node
            ref={userPromptRef}
            label="Airtable"
            type="input"
            description="Connect to Airtable databases and spreadsheets"
            nodeId="userPrompt"
          >
            <AirtableLogo className="h-5 w-5" />
          </Node>

          <Node
            ref={apiCallRef}
            label="GitHub"
            type="input"
            description="Integrate with GitHub repositories and workflows"
            nodeId="apiCall"
          >
            <GitHubLogo className="h-5 w-5 text-white" />
          </Node>

          <Node
            ref={webhookRef}
            label="Slack"
            type="input"
            description="Connect to Slack channels and messaging"
            nodeId="webhook"
          >
            <SlackLogo className="h-5 w-5" />
          </Node>

          <Node
            ref={contextRef}
            label="Gmail"
            type="input"
            description="Integrate with Gmail for email automation"
            nodeId="context"
          >
            <GmailLogo className="h-5 w-5" />
          </Node>
        </div>

        {/* Center column with Volt Agent - Centered */}
        <div className="flex-1 flex justify-center items-center">
          <Node
            ref={voltAgentRef}
            type="core"
            label="VoltAgent"
            description="Core AI agent that processes inputs and coordinates between modules"
            nodeId="core"
          >
            <div className="relative ">
              <div className="absolute inset-0 rounded-full bg-[#00d992] blur-md opacity-30 animate-pulse" />
              <Icons.lightning
                className={clsx("text-[#00d992]", isMobile ? "h-5 w-5" : "h-8 w-8")}
              />
            </div>
          </Node>
        </div>

        {/* Output nodes column - Right aligned */}
        <div className="absolute right-0 flex flex-col justify-center h-full space-y-4">
          <Node
            ref={aiResponseRef}
            label="AI Resp."
            type="output"
            description="Chatbot output and user interactions"
            nodeId="aiResponse"
          >
            <Icons.aiResponse className="h-4 w-4 text-[#00d992]" />
          </Node>

          <Node
            ref={automationRef}
            label="Automations"
            type="output"
            description="Email sending, task execution, and automated workflows"
            nodeId="automation"
          >
            <Icons.automation className="h-5 w-5 text-[#00d992]" />
          </Node>

          <Node
            ref={apiResponseRef}
            label="API Resp."
            type="output"
            description="Returning data to external systems"
            nodeId="apiResponse"
          >
            <Icons.code className="h-5 w-5 text-[#00d992]" />
          </Node>

          <Node
            ref={webhookOutRef}
            label="Webhooks"
            type="output"
            description="Triggering actions in connected third-party services"
            nodeId="webhookOut"
          >
            <Icons.integration className="h-5 w-5 text-[#00d992]" />
          </Node>
        </div>
      </div>

      {/* Input and Output Beams */}
      {inputSequence.map((input) => (
        <React.Fragment key={`${input.type}-${cycle}`}>
          {/* Input Beam */}
          {activeBeams.input.includes(input.type) && (
            <AnimatedBeam
              containerRef={containerRef}
              fromRef={input.fromRef}
              toRef={voltAgentRef}
              curvature={0}
              gradientStartColor="#4f5d75"
              gradientStopColor="#2d3748"
              pathColor="rgba(79, 93, 117, 0.25)"
              pathWidth={3}
              className="animate-pulse-slow"
              pathType="curved"
              showParticles={true}
              particleSize={3}
              particleSpeed={3}
              particleColor={input.color}
              particleCount={1}
              particleDirection="forward"
              duration={leftToCenterDuration}
              delay={0}
              particleDuration={leftToCenterDuration}
              key={`input-${input.type}-${cycle}`}
            />
          )}

          {/* Output Beam */}
          {activeBeams.output.includes(input.type) && outputMapping[input.type] && (
            <AnimatedBeam
              containerRef={containerRef}
              fromRef={voltAgentRef}
              toRef={outputMapping[input.type]}
              curvature={0}
              gradientStartColor="#4f5d75"
              gradientStopColor="#2d3748"
              pathColor="rgba(79, 93, 117, 0.25)"
              pathWidth={3}
              className="animate-pulse-slow"
              pathType={isMobile ? "curved" : "angular"}
              showParticles={true}
              particleSize={3}
              particleSpeed={3}
              particleColor={input.color}
              particleCount={1}
              particleDirection="forward"
              duration={centerToRightDuration}
              delay={0}
              particleDuration={centerToRightDuration}
              key={`output-${input.type}-${cycle}`}
            />
          )}
        </React.Fragment>
      ))}

      {/* Volt Agent to Module Container Beams */}
      {moduleInteractionActive && (
        <>
          {/* Volt Agent to Module Container - Request */}
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={voltAgentRef}
            toRef={moduleContainerRef}
            gradientStartColor="#00d992"
            gradientStopColor="#00d992"
            pathColor="rgba(0, 217, 146, 0.15)"
            pathWidth={2}
            className="animate-pulse-slow"
            pathType="curved"
            showParticles={true}
            particleSize={2}
            particleSpeed={2}
            particleColor="#00d992"
            particleCount={3}
            particleDirection="forward"
            duration={1.0}
            delay={0}
            startXOffset={0}
            startYOffset={40}
            endXOffset={0}
            endYOffset={-50}
            key={`module-request-${cycle}`}
          />

          {/* Module Container to Volt Agent - Response */}
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={moduleContainerRef}
            toRef={voltAgentRef}
            gradientStartColor="#00d992"
            gradientStopColor="#00d992"
            pathColor="rgba(0, 217, 146, 0.15)"
            pathWidth={4}
            className="animate-pulse-slow"
            pathType="curved"
            showParticles={true}
            particleSize={2}
            particleSpeed={2}
            particleColor="#00d992"
            particleCount={3}
            particleDirection="forward"
            duration={1.0}
            delay={1.0}
            startXOffset={0}
            startYOffset={-50}
            endXOffset={0}
            key={`module-response-${cycle}`}
          />
        </>
      )}

      {/* Module nodes row below Volt Agent */}
      <div
        ref={moduleContainerRef}
        className="flex justify-between items-center  landing-xs:mt-24 landing-md:mt-0 max-w-[300px] w-full relative py-4"
      >
        {/* Module container box */}
        <div className="absolute inset-0 border border-dashed   border-[#4f5d75] rounded-md opacity-30 -mx-4" />
        <Node
          ref={workflowRef}
          type="module"
          label="Workflow"
          description="Orchestration and process management"
          nodeId="workflow"
        >
          <Icons.workflow className="h-4 w-4 text-[#00d992]" />
        </Node>
        <Node
          ref={llmRef}
          type="module"
          label="LLM"
          description="Large Language Model for text generation and understanding"
          nodeId="llm"
        >
          <Icons.brain className="h-4 w-4 text-[#00d992]" />
        </Node>

        <Node
          ref={memoryRef}
          type="module"
          label="Memory"
          description="Persistent storage for conversation history and context"
          nodeId="memory"
        >
          <Icons.database className="h-4 w-4 text-[#00d992]" />
        </Node>

        <Node
          ref={ragRef}
          type="module"
          label="RAG"
          description="Retrieval Augmented Generation for knowledge access"
          nodeId="rag"
        >
          <Icons.search className="h-4 w-4 text-[#00d992]" />
        </Node>

        <Node
          ref={toolsRef}
          type="module"
          label="Tools"
          description="External tools and API integrations"
          nodeId="tools"
        >
          <Icons.tools className="h-4 w-4 text-[#00d992]" />
        </Node>
      </div>

      {/* Background glow effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Central green glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[20px] md:w-[450px] md:h-[20px] rounded-full bg-[#00d992]/20 blur-[120px]" />

        {/* Secondary glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[20px] h-[200px] md:w-[100px] md:h-[20px] rounded-full bg-[#00d992]/15 blur-[100px]" />

        {/* Tertiary glow */}
        <div className="absolute top-2/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[15px] md:w-[250px] md:h-[100px] rounded-full bg-[#00d992]/10 blur-[80px]" />
      </div>
    </div>
  );
}

// Replace the Icons object at the bottom of the file
const Icons = {
  lightning: BoltIcon,
  voltAgent: BoltIcon,
  chat: ChatBubbleLeftRightIcon,
  api: CommandLineIcon,
  webhook: ArrowPathIcon,
  file: DocumentTextIcon,
  memory: CircleStackIcon,
  database: CircleStackIcon,
  brain: CpuChipIcon,
  tools: WrenchScrewdriverIcon,
  workflow: ArrowPathRoundedSquareIcon,
  search: MagnifyingGlassIcon,
  aiResponse: CpuChipIcon,
  code: CodeIcon,
  automation: ClockIcon,
  integration: IntegrationIcon,
};
