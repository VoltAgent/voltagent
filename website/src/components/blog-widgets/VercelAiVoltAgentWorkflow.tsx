import React, { useState } from "react";
import Mermaid from "@theme/Mermaid";

interface VercelAiVoltAgentWorkflowProps {
  chart?: string;
}

const defaultChart = `graph TD
  USER[User] --> APP[Application]
  APP -- "1. Invokes" --> AGENT[VoltAgent Agent]
  AGENT -- "2. Requests text/object" --> VAI[Vercel AI Provider]
  VAI -- "3. Calls model function" --> MODEL[AI Model via Vercel AI SDK]
  MODEL -- "4. Generates response" --> VAI
  VAI -- "5. Returns response" --> AGENT
  AGENT -- "6. Processes/uses response" --> TOOLS[Tools/External APIs]
  TOOLS -- "7. Returns results" --> AGENT
  AGENT -- "8. Final response" --> APP
  APP -- "9. Display result" --> USER
  
  subgraph "VoltAgent Framework"
    AGENT
    MEMORY[Memory System]
    AGENT -- "Stores context" --> MEMORY
    MEMORY -- "Retrieves context" --> AGENT
    TOOLS
  end
  
  subgraph "Vercel AI SDK"
    VAI
    MODEL
  end
  
  style USER fill:#131B23,stroke:#50C878,stroke-width:2px,color:#CCCCCC
  style APP fill:#0F1A15,stroke:#50C878,stroke-width:2px,color:#50C878
  style AGENT fill:#121E1B,stroke:#50C878,stroke-width:2px,color:#50C878
  style VAI fill:#0F1A15,stroke:#50C878,stroke-width:2px,color:#50C878
  style MODEL fill:#131B23,stroke:#50C878,stroke-width:2px,color:#CCCCCC
  style MEMORY fill:#0F1A15,stroke:#50C878,stroke-width:2px,color:#50C878
  style TOOLS fill:#0F1A15,stroke:#50C878,stroke-width:2px,color:#50C878`;

export default function VercelAiVoltAgentWorkflow({
  chart = defaultChart,
}: VercelAiVoltAgentWorkflowProps): JSX.Element {
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((prevZoom) => {
      const newZoom = prevZoom + delta;
      return newZoom < 0.5 ? 0.5 : newZoom > 2 ? 2 : newZoom;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      setZoom((prevZoom) => (prevZoom + 0.1 > 2 ? 2 : prevZoom + 0.1));
    } else if (e.key === "-" || e.key === "_") {
      e.preventDefault();
      setZoom((prevZoom) => (prevZoom - 0.1 < 0.5 ? 0.5 : prevZoom - 0.1));
    } else if (e.key === "0") {
      e.preventDefault();
      setZoom(1);
      setPosition({ x: 0, y: 0 });
    }
  };

  return (
    <div className="my-6 p-4 border-2 border-emerald-500 bg-gray-900 rounded-lg shadow-lg">
      <div className="mb-3 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-emerald-400">
          VoltAgent + Vercel AI SDK Integration Flow
        </h3>
        <div className="flex items-center space-x-2">
          <button
            className="p-1 bg-gray-800 text-emerald-400 rounded hover:bg-gray-700 focus:outline-none"
            onClick={() =>
              setZoom((prevZoom) =>
                prevZoom - 0.1 < 0.5 ? 0.5 : prevZoom - 0.1,
              )
            }
            aria-label="Zoom out"
          >
            <span className="text-lg">-</span>
          </button>
          <span className="text-sm text-gray-300">
            {Math.round(zoom * 100)}%
          </span>
          <button
            className="p-1 bg-gray-800 text-emerald-400 rounded hover:bg-gray-700 focus:outline-none"
            onClick={() =>
              setZoom((prevZoom) => (prevZoom + 0.1 > 2 ? 2 : prevZoom + 0.1))
            }
            aria-label="Zoom in"
          >
            <span className="text-lg">+</span>
          </button>
          <button
            className="p-1 bg-gray-800 text-emerald-400 rounded hover:bg-gray-700 focus:outline-none"
            onClick={() => {
              setZoom(1);
              setPosition({ x: 0, y: 0 });
            }}
            aria-label="Reset view"
          >
            <span className="text-sm">Reset</span>
          </button>
        </div>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        Click and drag to pan. Use the scroll wheel or +/- buttons to zoom.
      </p>
      <div
        className="overflow-hidden bg-gray-950 rounded border border-gray-800 cursor-move"
        style={{ height: "400px", position: "relative" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        <div
          style={{
            transform: `scale(${zoom}) translate(${position.x / zoom}px, ${
              position.y / zoom
            }px)`,
            transformOrigin: "0 0",
            width: "fit-content",
            height: "fit-content",
            minWidth: "100%",
            minHeight: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Mermaid value={chart} />
        </div>
      </div>
      <div className="mt-3 text-xs text-gray-400">
        <strong className="text-emerald-400">Tip:</strong> You can also use
        keyboard shortcuts: + to zoom in, - to zoom out, and 0 to reset.
      </div>
    </div>
  );
}
