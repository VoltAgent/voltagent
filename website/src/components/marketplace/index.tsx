import Link from "@docusaurus/Link";
import {
  ArrowTopRightOnSquareIcon,
  PlusCircleIcon as PlusCircleOutlineIcon,
} from "@heroicons/react/24/outline";
import { BoltIcon } from "@heroicons/react/24/solid";
import { motion } from "framer-motion";
import React from "react";
import { GitHubLogo } from "../../../static/img/logos/github";
import { DotPattern } from "../ui/dot-pattern";
import AgentDetail from "./agent-detail";
import AgentList from "./agent-list";

export const Marketplace = () => {
  return (
    <section className="relative py-20">
      <DotPattern dotColor="#94a3b8" dotSize={1.2} spacing={20} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 landing-sm:gap-8 landing-md:mb-24 mb-12 items-center">
          <div className="flex  flex-col items-center  relative">
            <div className="flex items-baseline justify-start">
              <div className="flex mr-2 items-center border-2 border-solid border-[#00d992] rounded-full p-1">
                <BoltIcon className="w-5 h-5 sm:w-6 sm:h-6 text-[#00d992]" />
              </div>
              <span className="text-3xl sm:text-4xl font-bold text-[#00d992]">
                voltagent
              </span>
              <div className="relative">
                <span className="ml-2 text-xl sm:text-2xl font-medium text-gray-400">
                  Marketplace
                </span>
                <span className="absolute -top-6 -right-4 sm:-right-16 px-3 py-1 text-xs bg-emerald-500/20 text-emerald-400 rounded-md font-medium border border-emerald-400/30">
                  Coming Soon
                </span>
              </div>
            </div>
            <p className="mt-2 text-center self-center text-gray-400 text-sm">
              Share & Rent your VoltAgent-based AI Agents
            </p>
          </div>

          <div className="relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-left md:ml-8"
            >
              <p className="text-base sm:text-lg text-[#dcdcdc] mb-4">
                The VoltAgent Community Marketplace is on its way, and we’d love
                to hear your ideas.
              </p>
              <p className="text-base sm:text-lg text-gray-400">
                <button
                  type="button"
                  className="text-emerald-400 transition-colors text-base bg-transparent border-none p-0 m-0 inline font-inherit text-inherit cursor-pointer"
                  onClick={() => {
                    document
                      .getElementById("share-ideas-section")
                      ?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                  }}
                >
                  <span className="text-[#00d992] font-bold text-lg">
                    Let us know
                  </span>
                </button>{" "}
                how we can make it the useful hub for developers to share,
                discover, and monetize their
                <span className="text-[#00d992] font-medium ml-1">
                  VoltAgent-based
                </span>{" "}
                AI agents.
              </p>
            </motion.div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mb-16  "
        >
          {/* Preview of the Agent Marketplace UI */}
          <div className="flex justify-center ">
            <div
              className="flex flex-col landing-md:flex-row items-center rounded-md gap-2 rounded-b-none px-3 py-3 bg-slate-400/10 border-b-0 border-solid border border-slate-400/20 shadow-md"
              style={{
                backdropFilter: "blur(4px)",
                WebkitBackdropFilter: "blur(4px)",
                backgroundColor: "rgba(58, 66, 89, 0.3)",
              }}
            >
              <div className="flex items-center  ">
                <PlusCircleOutlineIcon
                  className="w-5 h-5 text-emerald-400"
                  aria-hidden="true"
                />
                <span className="text-emerald-400 font-medium uppercase text-sm sm:text-base tracking-wider ml-2 sm:mr-2">
                  IDEA
                </span>
              </div>
              <span className="text-[#dcdcdc] text-sm sm:text-base">
                <a
                  href="https://www.youtube.com/watch?v=iOs9Osz3UFQ"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 no-underline hover:underline"
                >
                  Imagine
                </a>{" "}
                developers building AI agents that has real use cases and
                listing them on the marketplace.
              </span>
            </div>
          </div>

          {/* First Preview Container - AgentList */}
          {/* IDEA section */}
          <div className="landing-md:p-4 pt-4 landing-md:mb-24 mb-12 rounded-md border border-solid border-white/10 backdrop-filter backdrop-blur-sm relative">
            <div className="absolute inset-0 bg-gradient-to-r from-[#00d992]/10 to-purple-500/10 rounded-md opacity-30 animate-pulse pointer-events-none" />
            <div className="absolute top-0 left-0 bg-[#00d992] text-black text-xs py-1 px-3 rounded-tl-md font-medium">
              PREVIEW
            </div>

            <div className="relative">
              <AgentList />
            </div>
          </div>

          {/* Second Preview Container - AgentDetail */}
          {/* INTEGRATION section */}
          <div className="flex justify-center mt-4">
            <div
              className="flex  flex-col landing-md:flex-row items-center rounded-md gap-2 rounded-b-none px-3 py-3 bg-slate-400/10 border-b-0 border-solid border border-slate-400/20 shadow-md"
              style={{
                backdropFilter: "blur(4px)",
                WebkitBackdropFilter: "blur(4px)",
                backgroundColor: "rgba(58, 66, 89, 0.3)",
              }}
            >
              <div className="flex items-center   ">
                <PlusCircleOutlineIcon
                  className="w-5 h-5 text-emerald-400"
                  aria-hidden="true"
                />
                <span className="text-emerald-400 font-medium uppercase text-sm sm:text-base tracking-wider ml-2 sm:mr-2">
                  IDEA
                </span>
              </div>
              <span className="text-[#dcdcdc] text-sm sm:text-base">
                Imagine, agents can be integrated to existing code bases with a
                command or directly run in UI.
              </span>
            </div>
          </div>

          <div
            id="agent-detail-section"
            className="landing-md:p-4 px-2 landingmb-24 rounded-md border border-solid border-white/10 backdrop-filter backdrop-blur-sm relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#00d992]/10 to-purple-500/10 rounded-md opacity-30 animate-pulse pointer-events-none" />
            <div className="absolute top-0 left-0 bg-[#00d992] text-black text-xs py-1 px-3 rounded-tl-md font-medium">
              PREVIEW
            </div>

            <div className="relative">
              <AgentDetail />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mb-8"
          id="share-ideas-section"
        >
          <h3 className="text-xl sm:text-2xl font-bold mb-2 text-[#00d992]">
            How to share your ideas?
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8 mx-auto">
            <div className="flex flex-col items-center justify-center">
              <p className="mb-4 text-base sm:text-lg text-[#dcdcdc]">
                The best tools are built with input from the developers who use
                them.
              </p>
              <p className="mb-4 text-base sm:text-lg text-[#dcdcdc]">
                We're inviting the VoltAgent community to share feedback on the
                marketplace as we build it. We're open to all suggestions — what
                could be improved, what to add, or what to avoid.
              </p>
            </div>
            <div className="flex flex-col items-center ring-1 ring-white/10 rounded-md p-4">
              <p className="text-base sm:text-lg font-semibold mb-6 text-[#dcdcdc]">
                Contribute your thoughts and get early access to publish your AI
                agents built with VoltAgent on the marketplace.
              </p>
              <Link
                to="https://github.com/orgs/VoltAgent/discussions/74/"
                className="inline-flex items-center no-underline px-4 py-3 sm:py-4 bg-emerald-400/10 text-emerald-400 border-solid border border-emerald-400/20 text-base sm:text-lg font-semibold rounded transition-colors cursor-pointer hover:bg-emerald-400/20 w-full justify-center"
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className="flex items-center justify-center">
                  <GitHubLogo className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                  <span className="text-xs sm:text-base">
                    Share your ideas on GitHub Discussion
                  </span>
                  <ArrowTopRightOnSquareIcon
                    className="hidden sm:inline-block w-5 h-5 ml-2 mb-1"
                    aria-hidden="true"
                  />
                </div>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Marketplace;
