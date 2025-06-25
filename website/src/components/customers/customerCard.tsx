import Link from "@docusaurus/Link";
import { motion } from "framer-motion";
import React from "react";
import { GitHubLogo } from "../../../static/img/logos/github";
import {
  ArrowTopRightOnSquareIcon,
  BuildingOfficeIcon,
  UsersIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";

interface CustomerCardProps {
  project: {
    id: number;
    slug: string;
    customer: {
      name: string;
      logo_url: string;
      website: string;
      industry: string;
      team_size: string;
      location: string;
    };
    case_study: {
      title: string;
      use_case: string;
      challenge: string[];
      solution: string[];
      results: string[];
      quote: {
        text: string;
        author: string;
        position: string;
        company: string;
      };
      links: {
        github?: string;
        discord?: string;
        video?: string;
      };
    };
  };
}

export const ProjectCard = ({ project }: CustomerCardProps) => {
  return (
    <Link to={`/customers/${project.slug}`} className="no-underline">
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
        {/* Customer Header */}
        <div className="relative p-6 bg-gradient-to-r from-[#00d992]/10 to-transparent">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <img
                src={project.customer.logo_url}
                alt={`${project.customer.name} logo`}
                className="w-12 h-12 rounded-lg border border-[#1e293b] mr-3 bg-white p-1"
              />
              <div>
                <h3 className="text-[#00d992] font-bold text-lg">
                  {project.customer.name}
                </h3>
                <p className="text-gray-400 text-sm">
                  {project.customer.industry}
                </p>
              </div>
            </div>
            <a
              href={project.customer.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-[#00d992] transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <ArrowTopRightOnSquareIcon className="w-5 h-5" />
            </a>
          </div>
        </div>

        <div className="p-4 flex flex-col h-full">
          {/* Case Study Title */}
          <div className="mb-4">
            <h4 className="text-white font-semibold text-base mb-2 line-clamp-2">
              {project.case_study.title}
            </h4>
            <p className="text-gray-400 text-sm line-clamp-2">
              {project.case_study.use_case}
            </p>
          </div>

          {/* Quote Preview */}
          <div className="bg-[#1e293b]/30 rounded-lg p-3 mb-4">
            <p className="text-gray-300 text-sm italic line-clamp-3 mb-2">
              "{project.case_study.quote.text}"
            </p>
          </div>

          {/* Footer with Links */}
        </div>
      </motion.div>
    </Link>
  );
};
