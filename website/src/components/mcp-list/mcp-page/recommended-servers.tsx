import type * as React from "react";
import { ServerStackIcon } from "@heroicons/react/24/outline";
import { BoltIcon } from "@heroicons/react/24/solid"; // BoltIcon is used for Cursor

// Define the types for server and icon properties
interface ServerIconProps {
  type: "text" | "component";
  value?: string; // For text type
  component?: React.ElementType; // For component type
  bgColor: string;
  textColor: string;
}

interface RecommendedServer {
  id: string;
  name: string;
  description: string;
  icon: ServerIconProps;
}

const recommendedServersData: RecommendedServer[] = [
  {
    id: "aws",
    name: "AWS Kb Retrieval Server",
    description: "An MCP server implementation for retrieving",
    icon: {
      type: "text",
      value: "AWS",
      bgColor: "bg-yellow-100",
      textColor: "text-yellow-800",
    },
  },
  {
    id: "cursor",
    name: "Cursor",
    description: "The AI Code Editor",
    icon: {
      type: "component",
      component: BoltIcon, // Use the imported BoltIcon here
      bgColor: "bg-gray-700",
      textColor: "text-white",
    },
  },
  {
    id: "minimax",
    name: "MiniMax MCP",
    description: "Official MiniMax Model Context Protocol (MCP)",
    icon: {
      type: "text",
      value: "MM",
      bgColor: "bg-pink-600",
      textColor: "text-white",
    },
  },
  {
    id: "playwright",
    name: "Playwright MCP",
    description: "Playwright MCP server",
    icon: {
      type: "text",
      value: "PW",
      bgColor: "bg-gradient-to-br from-blue-500 via-green-500 to-red-500",
      textColor: "text-white",
    },
  },
];

export const RecommendedServersSection: React.FC = () => {
  return (
    <div className="rounded-lg backdrop-filter backdrop-blur-sm bg-[rgba(58,66,89,0.3)]">
      <div className="flex items-center px-6 py-4 border-l-0 border-r-0 border-t-0 rounded-tl-md rounded-tr-md bg-[#222735] border-white/10 border-solid">
        <div className="bg-[#00d992]/10 w-8 h-8 landing-md:w-10 landing-md:h-10 rounded-md flex items-center justify-center shrink-0 mr-4">
          <ServerStackIcon className="w-5 h-5 text-[#00d992]" />
        </div>
        <div>
          <span className="text-md font-semibold text-white mb-1">
            Recommended Servers
          </span>
          <div className="text-gray-400 text-sm">
            {" "}
            MCP servers you might find useful.
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {recommendedServersData.map((server) => (
          <div
            key={server.id}
            className="rounded-md border border-gray-700 hover:border-[#00d992] transition-all duration-300 flex items-start p-3" // Added padding for better spacing
          >
            <div
              className={`w-7 h-7 mr-2.5 flex-shrink-0 flex items-center justify-center ${server.icon.bgColor} rounded-md`}
            >
              {server.icon.type === "component" && server.icon.component ? (
                <server.icon.component className="w-4 h-4 text-white" />
              ) : server.icon.type === "text" && server.icon.value ? (
                <span className={`text-xs font-bold ${server.icon.textColor}`}>
                  {server.icon.value}
                </span>
              ) : null}
            </div>
            <div className="flex-1">
              <h4 className="text-white font-medium text-sm mb-0.5">
                {server.name}
              </h4>
              <span className="text-xs text-gray-400">
                {server.description}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecommendedServersSection;
