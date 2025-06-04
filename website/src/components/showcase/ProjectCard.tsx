import React from "react";
import { motion } from "framer-motion";
import Link from "@docusaurus/Link";
import { GitHubLogo } from "../../../static/img/logos/github";

interface ProjectCardProps {
  project: {
    id: number;
    slug: string;
    name: string;
    description: string;
    creator: string;
    avatar: string;
    githubUrl: string;
    tech: string[];
    screenshot: string;
    useCases: string[];
    video?: string;
  };
}

export const ProjectCard = ({ project }: ProjectCardProps) => {
  return (
    <Link to={`/showcase/${project.slug}`} className="no-underline">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="border-solid border-[#1e293b]/40 border-2 rounded-lg overflow-hidden transition-all duration-300 h-full hover:border-[#00d992]/30 hover:scale-[1.02] cursor-pointer"
        style={{
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          backgroundColor: "rgba(58, 66, 89, 0.3)",
        }}
      >
        {/* Project Screenshot */}
        <div className="relative h-48 overflow-hidden">
          <img
            src={project.screenshot}
            alt={`${project.name} screenshot`}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          />
        </div>

        <div className="p-4 flex flex-col h-full">
          {/* Header */}
          <div className="mb-3">
            <h3 className="text-[#00d992] font-bold text-lg mb-2 line-clamp-1">
              {project.name}
            </h3>
            <p className="text-gray-400 text-sm line-clamp-2 mb-3">
              {project.description}
            </p>
          </div>

          {/* Creator Info */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center">
              <img
                src={project.avatar}
                alt={`${project.creator}'s avatar`}
                className="w-7 h-7 rounded-full border border-[#1e293b] mr-2"
              />
              <span className="text-xs text-gray-300">
                <span className="text-gray-500">By</span>{" "}
                <span className="font-medium">{project.creator}</span>
              </span>
            </div>

            <GitHubLogo className="w-5 h-5" />
          </div>

          {/* Tech Stack */}
          <div className="">
            <div className="text-xs text-gray-500 mb-1">Tech Stack:</div>
            <div className="flex flex-wrap gap-1">
              {project.tech.map((tech) => (
                <span
                  key={tech}
                  className={`px-2 py-0.5 text-xs rounded-md ${
                    tech === "VoltAgent"
                      ? "bg-[#00d992]/20 text-[#00d992] border border-[#00d992]/30"
                      : "bg-gray-700/50 text-gray-300"
                  }`}
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
};
