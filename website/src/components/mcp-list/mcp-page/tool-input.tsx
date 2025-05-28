import * as React from "react";
import { useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

// Import logo mapping as needed
type LogoMapType = {
  [key: string]: React.ComponentType<{ className?: string }>;
};

// Helper component to display input parameters
export const InputsList = ({ inputs }) => {
  if (!inputs || inputs.length === 0) return null;

  return (
    <div>
      <div className="text-sm text-gray-400 mb-2">Inputs</div>
      <div className="flex flex-wrap gap-3">
        {inputs.map((input) => (
          <div
            key={input.name}
            className="bg-slate-700/30 border border-slate-700/70 rounded-md p-3 flex-grow basis-[250px]"
          >
            <div className="flex items-center mb-1">
              <code className="text-blue-400 font-mono text-sm">
                {input.name}
              </code>
              {input.required && (
                <span className="text-red-400 ml-1 text-xs">*</span>
              )}
              <span className="ml-2 font-mono text-xs text-gray-500 bg-slate-800/50 px-2 py-0.5 rounded">
                {input.type}
              </span>
            </div>
            <div className="text-gray-400 text-sm ">{input.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Component that finds inputs for a provider's tool from the raw providers array
export const ProviderFallbackInputs = ({ provider, toolId, ahrefData }) => {
  // Find the provider section in the raw data
  const providerData = ahrefData.providers.find((p) => p.name === provider);
  if (!providerData) return null;

  // Find the tool in the provider's tools array
  const toolData = providerData.tools.find((t) => t.id === toolId);
  if (!toolData || !toolData.inputs) return null;

  return <InputsList inputs={toolData.inputs} />;
};

interface ExpandableToolProps {
  tool: any;
  toggleTool: (id: string) => void;
  expanded: boolean;
  logoMap: LogoMapType;
  showMcpContentDescription?: boolean;
  showParameters?: boolean;
  ahrefData?: any;
}

// Tool Card component with expandable inputs
export const ExpandableTool = ({
  tool,
  toggleTool,
  expanded,
  logoMap,
  showMcpContentDescription = true,
  showParameters = true,
}: ExpandableToolProps) => {
  // Get provider names as an array from the providers object
  const providerNames = tool.providers ? Object.keys(tool.providers) : [];

  return (
    <div key={tool.id} className="mb-6">
      {showMcpContentDescription && (
        <>
          <h4 className=" landing-md:text-xl text-md font-bold text-white mb-2">
            {tool.mcp_content.heading}
          </h4>
          <p className="text-gray-300 landing-md:text-base text-xs mb-4">
            {tool.mcp_content.description}
          </p>
        </>
      )}

      {/* Tool card with expandable inputs */}
      <div className="border rounded-lg bg-slate-800/50 overflow-hidden border-solid hover:border-[#00d992] transition-all duration-300">
        <div
          className="bg-[#222735]/70 px-3 py-3 flex items-center justify-between cursor-pointer"
          onClick={() => showParameters && toggleTool(tool.id)}
          onKeyUp={(e) =>
            showParameters && e.key === "Enter" && toggleTool(tool.id)
          }
          aria-expanded={expanded}
        >
          <div>
            <code className="text-[#00d992] font-mono landing-md:text-sm text-xs font-medium">
              {tool.name}
            </code>
            <div className="text-gray-400 my-1 landing-md:text-sm text-xs flex gap-2 flex-wrap">
              {providerNames.map((provider: string) => {
                // Get the tool ID for this provider from the providers object
                const providerId = tool.providers[provider]?.id;
                return (
                  <span key={provider}>
                    {provider}:{" "}
                    <code className="text-blue-400">
                      {providerId || tool.id}
                    </code>
                  </span>
                );
              })}
            </div>
            <span className="text-gray-300 landing-md:text-sm text-xs mt-1">
              {tool.description}
            </span>
          </div>
          {showParameters && (
            <ChevronDownIcon
              className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${
                expanded ? "transform rotate-180" : ""
              }`}
            />
          )}
        </div>

        {/* Tool content - only visible when expanded and showParameters is true */}
        {expanded && showParameters && (
          <div className="p-4 border-t border-gray-700">
            {providerNames.length > 0 && (
              <div className="space-y-4">
                {providerNames.map((provider: string) => (
                  <div
                    key={provider}
                    className="bg-slate-700/20 rounded-md p-4"
                  >
                    <div className="flex items-center mb-3">
                      <div
                        className={`w-6 h-6 rounded-md mr-2 flex items-center justify-center ${
                          provider === "gumloop"
                            ? "bg-blue-900/30"
                            : "bg-green-900/30"
                        }`}
                      >
                        {logoMap[provider] ? (
                          React.createElement(logoMap[provider], {
                            className: "w-4 h-4",
                          })
                        ) : (
                          <span className="text-xs font-medium">
                            {provider.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center">
                        <span className="landing-md:text-md text-xs font-medium text-white capitalize">
                          {provider}
                        </span>
                      </div>
                    </div>

                    {/* Show parameters from ahref-tools.json */}
                    {tool.provider_inputs?.[provider] ? (
                      <InputsList inputs={tool.provider_inputs[provider]} />
                    ) : tool.inputs ? (
                      <InputsList inputs={tool.inputs} />
                    ) : (
                      // Look up in the providers section as fallback
                      <ProviderFallbackInputs
                        provider={provider}
                        toolId={tool.providers[provider]?.id || tool.id}
                        ahrefData={tool.ahrefData}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpandableTool;
