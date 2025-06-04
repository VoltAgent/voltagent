import React from "react";
import { motion } from "framer-motion";
import { BoltIcon } from "@heroicons/react/24/solid";
import { CodeBracketIcon } from "@heroicons/react/24/outline";
import { ProjectCard } from "./ProjectCard";

interface ShowcaseListProps {
  projects?: any[];
}

export const ShowcaseList = ({ projects = [] }: ShowcaseListProps) => {
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
              className="text-left md:ml-8 flex flex-col items-center"
            >
              <h3 className="text-lg font-bold text-[#00d992] mb-3">
                Built Something Cool?
              </h3>
              <a
                href="https://github.com/orgs/VoltAgent/discussions/154/"
                target="_blank"
                rel="noopener noreferrer nofollow"
                className=" items-center no-underline p-2 bg-emerald-400/10 text-emerald-400 border-solid border border-emerald-400/20 text-sm font-semibold rounded transition-colors cursor-pointer hover:bg-emerald-400/20 justify-center"
              >
                Submit Project
              </a>
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
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </motion.div>
      </div>
    </section>
  );
};
