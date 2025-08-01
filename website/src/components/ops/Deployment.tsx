import {
  CheckCircleIcon,
  ClockIcon,
  CpuChipIcon,
  ExclamationTriangleIcon,
  PaperAirplaneIcon,
  RocketLaunchIcon,
} from "@heroicons/react/24/outline";
import React, { useState, useEffect, useRef, useCallback } from "react";

// Types for our data structures
type StageStatus = "pending" | "in-progress" | "complete" | "failed";

type DeploymentStage = {
  id: number;
  name: string;
  status: StageStatus;
  duration?: string;
};

type LogType = "build" | "data" | "complete" | "integration" | "deploy" | "default";

type DeploymentLog = {
  id: number;
  message: string;
  timestamp: string;
  stageId: number;
  visible: boolean;
  type: LogType;
};

type TimelineEvent = {
  time: number;
  action: "startStage" | "showLog" | "completeStage" | "failStage" | "complete";
  stageIndex?: number;
  logIndex?: number;
};

// Mock deployment stages data with all pending status initially
const initialDeploymentStages: DeploymentStage[] = [
  {
    id: 1,
    name: "Initializing build environment",
    status: "pending",
    duration: "4s",
  },
  {
    id: 2,
    name: "Cloning git repository",
    status: "pending",
    duration: "2s",
  },
  {
    id: 3,
    name: "Building application",
    status: "pending",
    duration: "2m 35s",
  },
  {
    id: 4,
    name: "Deploying to VoltAgent's global network",
    status: "pending",
    duration: "8s",
  },
];

// Mock deployment log data reflecting a generic Node.js/VoltAgent build
const initialDeploymentLogs: DeploymentLog[] = [
  // --- Stage 2: Cloning --- (Keep existing)
  {
    id: 1,
    message: "Cloning repository...",
    timestamp: "10:30:01.100",
    stageId: 2,
    visible: false,
    type: "default",
  },
  {
    id: 2,
    message: "From https://github.com/your-org/your-app",
    timestamp: "10:30:02.300",
    stageId: 2,
    visible: false,
    type: "default",
  },
  {
    id: 3,
    message: "* branch            main -> FETCH_HEAD",
    timestamp: "10:30:02.300",
    stageId: 2,
    visible: false,
    type: "default",
  },
  {
    id: 4,
    message: "HEAD is now at a1b2c3d feat: add new feature",
    timestamp: "10:30:02.500",
    stageId: 2,
    visible: false,
    type: "default",
  },
  {
    id: 5,
    message: "Success: Finished cloning repository files",
    timestamp: "10:30:02.800",
    stageId: 2, // End of cloning stage
    visible: false,
    type: "complete",
  },
  // --- Stage 3: Building Application ---
  {
    id: 6,
    message: "Using Node.js v20.19.0",
    timestamp: "10:30:03.100",
    stageId: 3,
    visible: false,
    type: "default",
  },
  {
    id: 7,
    message: "Running `npm install`...",
    timestamp: "10:30:03.500",
    stageId: 3,
    visible: false,
    type: "default",
  },
  {
    id: 8,
    message: "Installed 1450 packages in 25.3s", // Example time
    timestamp: "10:30:28.800",
    stageId: 3,
    visible: false,
    type: "default",
  },
  {
    id: 9,
    message: "Running `npm run build`...",
    timestamp: "10:30:29.100",
    stageId: 3,
    visible: false,
    type: "default",
  },
  {
    id: 10,
    message: "> voltagent-app@1.0.0 build",
    timestamp: "10:30:29.200",
    stageId: 3,
    visible: false,
    type: "default",
  },
  {
    id: 11,
    message: "> tsc && node scripts/postbuild.js",
    timestamp: "10:30:29.200",
    stageId: 3,
    visible: false,
    type: "default",
  },
  {
    id: 12,
    message: "Compiling TypeScript files...",
    timestamp: "10:30:35.500", // Example compile time
    stageId: 3,
    visible: false,
    type: "default",
  },
  {
    id: 13,
    message: "[VoltAgent] Validating agent schemas...",
    timestamp: "10:30:36.100",
    stageId: 3,
    visible: false,
    type: "default", // Could be a custom VoltAgent type if needed
  },
  {
    id: 14,
    message: "Build successful! Artifacts generated.",
    timestamp: "10:30:38.000",
    stageId: 3, // End of build stage
    visible: false,
    type: "complete",
  },
  // --- Stage 4: Deploying ---
  {
    id: 15,
    message: "[VoltAgent] Starting deployment process...",
    timestamp: "10:30:38.500",
    stageId: 4,
    visible: false,
    type: "default",
  },
  {
    id: 16,
    message: "Uploading build artifacts (2.1MB)...",
    timestamp: "10:30:40.200",
    stageId: 4,
    visible: false,
    type: "default",
  },
  {
    id: 17,
    message: "Upload complete. Verifying deployment...",
    timestamp: "10:30:45.800",
    stageId: 4,
    visible: false,
    type: "default",
  },
  {
    id: 18,
    message: "[VoltAgent] Deployed! 'my-agent-v1.2' is live.",
    timestamp: "10:30:46.500", // Matches 8s duration
    stageId: 4,
    visible: false,
    type: "deploy",
  },
];

// Timeline sequence adjusted for generic Node.js build and restart
const timeline: TimelineEvent[] = [
  // Stage 1: Initialize (4s)
  { time: 500, action: "startStage", stageIndex: 0 },
  { time: 4500, action: "completeStage", stageIndex: 0 },

  // Stage 2: Clone (2s)
  { time: 4600, action: "startStage", stageIndex: 1 },
  { time: 4800, action: "showLog", logIndex: 0 }, // Cloning...
  { time: 5500, action: "showLog", logIndex: 1 }, // From...
  { time: 5600, action: "showLog", logIndex: 2 }, // * branch...
  { time: 6000, action: "showLog", logIndex: 3 }, // HEAD is now...
  { time: 6500, action: "showLog", logIndex: 4 }, // Success: Finished cloning...
  { time: 6600, action: "completeStage", stageIndex: 1 },

  // Stage 3: Build (Adjusted demo time ~10s)
  { time: 6700, action: "startStage", stageIndex: 2 },
  { time: 7000, action: "showLog", logIndex: 5 }, // Using Node...
  { time: 7200, action: "showLog", logIndex: 6 }, // npm install...
  { time: 8500, action: "showLog", logIndex: 7 }, // Installed packages...
  { time: 8800, action: "showLog", logIndex: 8 }, // npm run build...
  { time: 8900, action: "showLog", logIndex: 9 }, // > voltagent-app...
  { time: 9000, action: "showLog", logIndex: 10 }, // > tsc...
  { time: 11000, action: "showLog", logIndex: 11 }, // Compiling TS...
  { time: 11500, action: "showLog", logIndex: 12 }, // [VoltAgent] Validating...
  { time: 12500, action: "showLog", logIndex: 13 }, // Build successful!
  { time: 12600, action: "completeStage", stageIndex: 2 },

  // Stage 4: Deploy (8s)
  { time: 12700, action: "startStage", stageIndex: 3 },
  { time: 13000, action: "showLog", logIndex: 14 }, // [VoltAgent] Starting...
  { time: 14000, action: "showLog", logIndex: 15 }, // Uploading...
  { time: 18000, action: "showLog", logIndex: 16 }, // Upload complete...
  { time: 20700, action: "showLog", logIndex: 17 }, // [VoltAgent] Deployment successful!
  { time: 20800, action: "completeStage", stageIndex: 3 },

  // Final 'complete' event triggers reset after 2s delay
  { time: 22800, action: "complete" },
];

// Status indicator component with smooth transitions
const StatusIndicator = ({ status, duration }: { status: StageStatus; duration?: string }) => {
  if (status === "complete") {
    return (
      <div className="flex items-center justify-end gap-2 transition-all duration-500 ease-in-out animate-fadeIn">
        <CheckCircleIcon className="w-3 h-3 landing-xs:w-4 landing-xs:h-4 text-green-500 transition-transform duration-500 ease-in-out animate-scaleIn" />
        <span className="landing-md:text-xs landing-xs:text-[10px] text-gray-400">{duration}</span>
      </div>
    );
  }
  if (status === "in-progress") {
    return (
      <div className="flex items-center px-2 landing-xs:px-3 py-0.5 landing-xs:py-1 bg-[#f59e0b]/10 rounded-md transition-all duration-300 ease-in-out">
        <ClockIcon className="w-3 h-3 landing-xs:w-4 landing-xs:h-4 text-[#f59e0b] mr-1 landing-xs:mr-2 animate-pulse" />
        <span className="landing-md:text-xs landing-xs:text-[10px] text-[#f59e0b]">
          In Progress
        </span>
      </div>
    );
  }
  if (status === "failed") {
    return (
      <div className="flex items-center justify-end gap-2 transition-all duration-500 ease-in-out animate-fadeIn">
        <ExclamationTriangleIcon className="w-3 h-3 landing-xs:w-4 landing-xs:h-4 text-red-500 transition-transform duration-500 ease-in-out animate-scaleIn" />
        <span className="landing-md:text-xs landing-xs:text-[10px] text-gray-400">{duration}</span>
      </div>
    );
  }
  return <div className="landing-md:min-w-[50px] landing-xs:min-w-[40px]" />;
};

const DeploymentStageItem = ({ stage }: { stage: DeploymentStage }) => {
  return (
    <div className="flex items-center  h-[32px] justify-between p-0.5 landing-xs:p-1 border-solid border-l-0 border-r-0 border-b border-[#1e293b]/40 hover:bg-[#1e293b]/20 transition-all duration-300 ease-in-out">
      <div className="flex items-center flex-1">
        <div>
          <div
            className={`text-xs transition-colors duration-300 ease-in-out ${
              stage.status === "pending"
                ? "text-gray-500"
                : stage.status === "complete"
                  ? "text-gray-300"
                  : stage.status === "failed"
                    ? "text-red-500"
                    : "text-gray-300"
            }`}
          >
            {stage.name}
          </div>
        </div>
      </div>

      {/* Status indicator container with fixed width for smooth transitions */}
      <div className="ml-1 landing-xs:ml-2 landing-md:min-w-[50px] landing-xs:min-w-[40px] flex justify-end">
        <StatusIndicator status={stage.status} duration={stage.duration} />
      </div>
    </div>
  );
};

// Get icon based on log type
const getLogIcon = (type: LogType) => {
  switch (type) {
    case "build":
      return (
        <ExclamationTriangleIcon className="w-3 h-3 landing-xs:w-3.5 landing-xs:h-3.5 text-red-500" />
      );
    case "complete":
      return (
        <CheckCircleIcon className="w-3 h-3 landing-xs:w-3.5 landing-xs:h-3.5 text-green-500" />
      );
    case "deploy":
      return (
        <RocketLaunchIcon className="w-3 h-3 landing-xs:w-3.5 landing-xs:h-3.5 text-[#fb923c]" />
      );
    default:
      return null;
  }
};

const DeploymentLogItem = ({ log }: { log: DeploymentLog }) => {
  const icon = getLogIcon(log.type);
  const messageColor =
    log.type === "build"
      ? "text-red-500"
      : log.type === "deploy"
        ? "text-main-emerald" // Use emerald for deploy success
        : "text-gray-400";

  // Format timestamp to show only hours, minutes, and seconds (remove milliseconds)
  const formattedTimestamp = log.timestamp.split(".")[0];

  return (
    <div
      className={`flex items-center mb-0.5 transition-all duration-300 ease-in-out ${
        log.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
    >
      <div className="text-[10px] landing-xs:text-xs text-gray-500 mr-2 landing-xs:mr-3 font-mono whitespace-nowrap min-w-[50px]">
        {formattedTimestamp}
      </div>
      {icon && <div className="mr-1 mt-0.5">{icon}</div>}
      <div
        className={`flex-1 landing-md:text-xs landing-xs:text-[11px] ${messageColor} font-mono leading-tight landing-md:whitespace-normal landing-xs:truncate landing-xs:overflow-hidden landing-xs:text-ellipsis`}
      >
        {log.message}
      </div>
    </div>
  );
};

export default function Deployment() {
  const [stages, setStages] = useState<DeploymentStage[]>(initialDeploymentStages);
  const [logs, setLogs] = useState<DeploymentLog[]>(initialDeploymentLogs);
  // const timelineIndex = useRef(0); // Removed unused timelineIndex ref
  const timeoutRef = useRef<NodeJS.Timeout | null>(null); // For simulation events
  const containerRef = useRef<HTMLDivElement>(null);
  const animationCompleteTimeoutRef = useRef<NodeJS.Timeout | null>(null); // For auto-restart

  // Add custom animation keyframes for fade and scale effects
  useEffect(() => {
    // Add keyframes for animations if they don't exist
    if (!document.querySelector("#deployment-animations")) {
      const styleSheet = document.createElement("style");
      styleSheet.id = "deployment-animations";
      styleSheet.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes scaleIn {
          from { transform: scale(0.5); }
          to { transform: scale(1); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-in-out;
        }
        
        .animate-scaleIn {
          animation: scaleIn 0.5s ease-in-out;
        }
      `;
      document.head.appendChild(styleSheet);
    }

    return () => {
      // Clean up style sheet on unmount
      const styleSheet = document.querySelector("#deployment-animations");
      if (styleSheet) {
        styleSheet.remove();
      }
    };
  }, []);

  // Clear all timeouts helper
  const clearAllTimeouts = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (animationCompleteTimeoutRef.current) {
      clearTimeout(animationCompleteTimeoutRef.current);
      animationCompleteTimeoutRef.current = null;
    }
  }, []);

  // Reset state to initial values
  const resetDeployment = useCallback(() => {
    // Clear existing timeouts first
    clearAllTimeouts();

    // Reset state
    setStages(initialDeploymentStages);
    setLogs(initialDeploymentLogs.map((log) => ({ ...log, visible: false })));
  }, [clearAllTimeouts]);

  // Start the deployment animation
  const startDeploymentAnimation = useCallback(() => {
    resetDeployment();

    const timelineEvents = timeline;

    // Execute each action in the timeline
    for (const event of timelineEvents) {
      const timeoutId = setTimeout(() => {
        executeTimelineEvent(event);
      }, event.time);
      // Store the latest timeout ID to potentially clear it on failure
      timeoutRef.current = timeoutId;
    }
  }, [resetDeployment]);

  // Execute a timeline event
  const executeTimelineEvent = useCallback(
    (event: TimelineEvent) => {
      if (event.action === "startStage" && event.stageIndex !== undefined) {
        setStages((prev) =>
          prev.map((s, i) => (i === event.stageIndex ? { ...s, status: "in-progress" } : s)),
        );
      } else if (event.action === "completeStage" && event.stageIndex !== undefined) {
        setStages((prev) =>
          prev.map((s, i) => (i === event.stageIndex ? { ...s, status: "complete" } : s)),
        );
      } else if (event.action === "failStage" && event.stageIndex !== undefined) {
        setStages((prev) =>
          prev.map((s, i) => (i === event.stageIndex ? { ...s, status: "failed" } : s)),
        );
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        return;
      } else if (event.action === "showLog" && event.logIndex !== undefined) {
        setLogs((prev) => prev.map((l, i) => (i === event.logIndex ? { ...l, visible: true } : l)));
      } else if (event.action === "complete") {
        // When animation completes, schedule a restart after a short delay
        const restartDelay = 2000; // 2 seconds pause before restarting
        animationCompleteTimeoutRef.current = setTimeout(() => {
          startDeploymentAnimation();
        }, restartDelay);
      }
    },
    [startDeploymentAnimation],
  );

  // Simulate the deployment process with synchronized timing
  useEffect(() => {
    startDeploymentAnimation();

    return () => {
      clearAllTimeouts();
    };
  }, [startDeploymentAnimation, clearAllTimeouts]);

  return (
    <div
      ref={containerRef}
      className="landing-md:p-4 landing-xs:p-2"
      style={{
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        backgroundColor: "rgba(58, 66, 89, 0.3)",
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      }}
    >
      <div className="w-full">
        {/* Deployment stages */}
        <div className="w-full ">
          <div className="w-full ">
            {/* Deployment stages */}
            <div className="p-1 landing-xs:p-2">
              <div className="landing-md:text-sm landing-xs:text-xs font-medium text-gray-300 mb-2 landing-xs:mb-3 flex items-center">
                <CpuChipIcon className="w-3.5 h-3.5 landing-xs:w-4 landing-xs:h-4 sm:w-5 sm:h-5 text-[#00d992] mr-1.5 landing-xs:mr-2" />
                Deployment Stages
              </div>

              {stages.map((stage) => (
                <DeploymentStageItem key={stage.id} stage={stage} />
              ))}
            </div>

            {/* Deployment logs - shown below stages */}
            <div className="p-1 landing-xs:p-2">
              <div className="landing-md:text-sm landing-xs:text-xs font-medium text-gray-300 mb-2 landing-xs:mb-3 flex items-center">
                <PaperAirplaneIcon className="w-3.5 h-3.5 landing-xs:w-4 landing-xs:h-4 sm:w-5 sm:h-5 text-[#00d992] mr-1.5 landing-xs:mr-2" />
                Deployment Logs
              </div>

              <div className="bg-black/20 p-2 landing-xs:p-3 rounded-lg">
                {logs.map((log) => (
                  <DeploymentLogItem key={log.id} log={log} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
