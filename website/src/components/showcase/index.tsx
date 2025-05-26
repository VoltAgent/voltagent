import React from "react";
import { motion } from "framer-motion";
import { BoltIcon } from "@heroicons/react/24/solid";
import { CodeBracketIcon } from "@heroicons/react/24/outline";
import showcaseProjects from "./projects.json";
import { ProjectCard } from "./ProjectCard";

export const ShowcaseList = () => {
  return (
    <section className="relative py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Header */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 landing-sm:gap-8 mb-12 sm:mb-24 items-center">
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
                  Community Showcase
                </span>
              </div>
            </div>
            <p className="mt-2 text-center self-center text-gray-400 text-sm">
              Discover projects built by the VoltAgent community.
            </p>
          </div>

          <div className="relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-left md:ml-8"
            >
              <h3 className="text-xl font-bold text-[#00d992] mb-3">
                Built Something Cool?
              </h3>
              <p className="text-gray-400 mb-4 text-sm">
                Share your VoltAgent project with the community!
              </p>
              <div className="flex gap-3">
                <a
                  href="https://github.com/voltagent/voltagent/discussions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#00d992] text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#00d992]/90 transition-colors"
                >
                  Submit Project
                </a>
                <a
                  href="https://docs.voltagent.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-[#00d992]/40 text-[#00d992] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#00d992]/10 transition-colors flex items-center"
                >
                  <CodeBracketIcon className="w-4 h-4 mr-1" />
                  Get Started
                </a>
              </div>
            </motion.div>
          </div>
        </div>
        {/* Projects Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {showcaseProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </motion.div>
      </div>
    </section>
  );
};
