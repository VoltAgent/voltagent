import Link from "@docusaurus/Link";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { BoltIcon } from "@heroicons/react/24/solid";
import { useEffect, useRef, useState } from "react";
import { TypeScriptLogo } from "../../../static/img/logos/integrations/typescript";
import { AgentsAnimation } from "../agents-animation";
import { FeatureShowcase } from "../feature-showcase";
import { LineShadowText } from "../magicui/line-shadow-text";

export function Hero() {
  const [isVisible, setIsVisible] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [commandText, setCommandText] = useState("npm create voltagent-app@latest");
  const [isTyping, setIsTyping] = useState(false);
  const originalCommand = "npm create voltagent-app@latest";
  const typingTimerRef = useRef(null);

  const thinkingMessages = ["Memory", "RAG", "Tool", "MCP", "Agent", "Supervisor"];

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleCommandClick = async () => {
    if (isTyping) return;

    setIsTyping(true);

    // Copy to clipboard
    await navigator.clipboard.writeText(originalCommand);

    // Clear the text character by character
    for (let i = commandText.length; i >= 0; i--) {
      await new Promise<void>((resolve) => {
        typingTimerRef.current = setTimeout(() => {
          setCommandText(originalCommand.substring(0, i));
          resolve();
        }, 20);
      });
    }

    // Show AI thinking messages in sequence
    for (let msgIndex = 0; msgIndex < thinkingMessages.length; msgIndex++) {
      setCommandText(thinkingMessages[msgIndex]);

      // Wait between each thinking message
      await new Promise((resolve) => {
        typingTimerRef.current = setTimeout(resolve, 500);
      });
    }

    // Type "Copied!" with a slight delay between characters
    const copiedText = "Copied to clipboard!";
    for (let i = 0; i <= copiedText.length; i++) {
      await new Promise<void>((resolve) => {
        typingTimerRef.current = setTimeout(() => {
          setCommandText(copiedText.substring(0, i));
          resolve();
        }, 40);
      });
    }

    // Add pulse effect class
    const commandElement = document.querySelector(".command-text");
    if (commandElement) {
      commandElement.classList.add("pulse-effect");
    }

    // Wait for 1.5 seconds
    await new Promise((resolve) => {
      typingTimerRef.current = setTimeout(resolve, 1500);
    });

    // Remove pulse effect
    if (commandElement) {
      commandElement.classList.remove("pulse-effect");
    }

    // Clear "Copied!" character by character
    for (let i = copiedText.length; i >= 0; i--) {
      await new Promise<void>((resolve) => {
        typingTimerRef.current = setTimeout(() => {
          setCommandText(copiedText.substring(0, i));
          resolve();
        }, 20);
      });
    }

    // Type the original command again
    for (let i = 0; i <= originalCommand.length; i++) {
      await new Promise<void>((resolve) => {
        typingTimerRef.current = setTimeout(() => {
          setCommandText(originalCommand.substring(0, i));
          resolve();
        }, 30);
      });
    }

    setIsTyping(false);
  };

  // Clean up any pending timers when component unmounts
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
    };
  }, []);

  return (
    <>
      <div className="relative max-w-7xl xs:px-4 lg:px-8 mx-auto landing-xs:mb-16 landing-md:mb-20">
        <div className="mt-16 md:mt-24" />
        <div className="grid xs:grid-cols-1 mx-4 lg:mx-0 lg:grid-cols-2 gap-8 items-center">
          <div>
            {/* Main Heading */}
            <h2
              className={`text-2xl text-left mb-2 font-bold transition-all duration-1000 tracking-[-0.025em] ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              <Link
                href="https://github.com/voltagent/voltagent/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#2fd6a1] no-underline font-normal hover:no-underline"
              >
                <span
                  className="inline-block relative"
                  onMouseEnter={() => setShowHeart(true)}
                  onMouseLeave={() => setShowHeart(false)}
                >
                  The end-to-end
                  {showHeart && (
                    <span className="absolute -right-8 top-1 animate-[zap_1.5s_ease-in-out_infinite]">
                      <BoltIcon className="w-6 h-6 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" />
                    </span>
                  )}
                </span>
              </Link>
            </h2>

            <h1
              className={`text-4xl sm:text-5xl text-neutral-100 md:text-6xl font-normal tracking-[-0.65px] text-left mb-6 transition-all duration-1000 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              AI Agent Engineering
              <LineShadowText
                className="text-[#2fd6a1] landing-md:mt-4 landing-xs:mt-2 ml-2 landing-sm:ml-0 italic"
                shadowColor={"#2fd6a1"}
              >
                Platform
              </LineShadowText>
            </h1>

            <div
              className={`text-base sm:text-lg md:text-xl text-gray-400 text-left mb-12 transition-all duration-1000 delay-300 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              <span className="text-white text-base sm:text-lg md:text-xl">
                Build enterprise multi-agent systems —{" "}
                <span className="text-[#8a8380]">development</span>,{" "}
                <span className="text-[#8a8380]">observability</span>, and{" "}
                <span className="text-[#8a8380]">deployment</span> in one platform.
              </span>
            </div>

            <div
              className={`flex flex-col sm:flex-row items-center sm:items-start justify-center sm:justify-start gap-4 mb-12 transition-all duration-1000 delay-500 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              <Link
                to="/docs/"
                className="w-full sm:w-auto px-4 py-3 font-bold landing-sm:text-lg landing-xs:text-md font-mono border border-solid border-[#3d3a39] backdrop-blur-sm cursor-pointer bg-transparent text-[#eeeeee] rounded-md transition duration-300 flex items-center outline-none justify-center sm:justify-start gap-2 hover:bg-transparent hover:border-[#5c5855] hover:text-[#f3f4f6] no-underline"
              >
                <ChevronRightIcon className="landing-xs:w-4 landing-xs:h-4 landing-md:w-6 landing-md:h-6" />
                Get Started
              </Link>

              <button
                type="button"
                onClick={handleCommandClick}
                aria-label="Copy npm command to clipboard"
                className="w-full sm:w-auto flex cursor-pointer items-center justify-center border backdrop-blur-sm h-[53px] border-solid border-[#3d3a39] rounded-md px-4 py-3 font-[monospace] text-[13px] hover:bg-[#101010] transition duration-300 bg-transparent"
              >
                <span className="mr-2 text-[#2fd6a1]">$</span>
                <span className="command-text text-[#eeeeee] min-w-[220px] text-left relative">
                  {commandText}
                  {isTyping && !thinkingMessages.includes(commandText) && commandText !== "" && (
                    <span className="animate-pulse">|</span>
                  )}
                </span>
              </button>
            </div>
          </div>

          <div className="landing-xs:pl-0 landing-md:pl-12 h-full flex items-center justify-center">
            <AgentsAnimation />
          </div>
        </div>
      </div>

      {/* Platform Container - Full Width */}
      <div className="w-full bg-[#101010] mt-16 md:mt-36 py-10 md:py-12">
        <div className="max-w-7xl mx-auto px-4 landing-md:px-0">
          <h2 className="landing-xs:text-sm landing-md:text-xl landing-xs:mb-2 landing-md:mb-12 font-semibold text-[#b8b3b0] tracking-wide uppercase flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-main-emerald inline-block" />
            The Platform
          </h2>

          {/* Two boxes with connector */}
          <div className="grid grid-cols-1 relative z-10  md:grid-cols-[1fr_auto_1fr] gap-2 md:gap-4 items-stretch mt-6">
            {/* Core Framework Box */}
            <div className="flex flex-col gap-3 p-4 md:p-6 rounded-lg border border-solid border-[#3d3a39] bg-[#050507] transition-colors hover:border-[#5c5855] hover:bg-[#1a1a1a]">
              <div className="flex flex-row items-center gap-2 sm:gap-3">
                <TypeScriptLogo className="w-5 h-5 md:w-6 md:h-6 rounded" />
                <span className="text-white font-semibold text-lg md:text-xl">Core Framework</span>
                <span className="text-xs px-2 py-0.5 rounded-full border border-solid border-[#3d3a39] text-[#8a8380] w-fit">
                  Open Source
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 md:gap-2 text-xs md:text-sm text-[#2fd6a1]">
                <span>Memory</span>
                <span className="text-white/20">|</span>
                <span>RAG</span>
                <span className="text-white/20">|</span>
                <span>Guardrails</span>
                <span className="text-white/20">|</span>
                <span>Tools</span>
                <span className="text-white/20">|</span>
                <span>MCP</span>
                <span className="text-white/20">|</span>
                <span>Voice</span>
                <span className="text-white/20">|</span>
                <span>Workflow</span>
              </div>
              <span className="text-[#eeeeee] text-sm md:text-base">
                Build agents with open-source TypeScript framework.
              </span>
            </div>

            {/* Plus Connector */}
            <div className="flex items-center justify-center py-1 md:py-0">
              <span className="text-white/30 text-lg md:text-2xl font-light">+</span>
            </div>

            {/* VoltOps Console Box */}
            <div className="flex flex-col gap-3 p-4 md:p-6 rounded-lg border border-solid border-[#3d3a39] bg-[#050507] transition-colors hover:border-[#5c5855] hover:bg-[#1a1a1a]">
              <div className="flex flex-row items-center gap-2 sm:gap-3">
                <span className="text-white font-semibold text-lg md:text-xl">VoltOps Console</span>
                <div className="flex gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full border border-solid border-[#3d3a39] text-[#8a8380]">
                    Cloud
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full border border-solid border-[#3d3a39] text-[#8a8380]">
                    Self-Hosted
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 md:gap-2 text-xs md:text-sm text-[#2fd6a1]">
                <span>Observability</span>
                <span className="text-white/20">|</span>
                <span>Automation</span>
                <span className="text-white/20">|</span>
                <span>Deployment</span>
                <span className="text-white/20">|</span>
                <span>Evals</span>
                <span className="text-white/20">|</span>
                <span>Guardrails</span>
                <span className="text-white/20">|</span>
                <span>Prompts</span>
              </div>
              <span className="text-[#eeeeee] text-sm md:text-base">
                Automate, debug, and deploy your agents with console.
              </span>
            </div>
          </div>
        </div>

        {/* FeatureShowcase inside platform bg */}
        <div className="mt-10 md:mt-12">
          <FeatureShowcase />
        </div>
      </div>
    </>
  );
}
