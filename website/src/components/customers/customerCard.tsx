import Link from "@docusaurus/Link";
import { motion } from "framer-motion";
import React from "react";
import {
  ArrowTopRightOnSquareIcon,
  BuildingOfficeIcon,
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
        className="border-solid border-[#334155] border rounded-lg overflow-hidden transition-all duration-300 h-full hover:border-[#00d992]/50 hover:scale-[1.02] cursor-pointer"
        style={{
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          backgroundColor: "rgba(30, 41, 59, 0.6)",
        }}
      >
        {/* Customer Header */}
        <div className="relative p-4 border-b border-[#334155]">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <BuildingOfficeIcon className="w-9 h-9 mr-2" />
              <div>
                <span className="text-[#00d992] font-bold text-base">
                  {project.customer.name}
                </span>
                <div className="text-gray-400 text-xs">
                  {project.customer.industry}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 pb-4 flex flex-col flex-1">
          {/* Case Study Title */}
          <div className="mb-3">
            <h4 className="text-white font-semibold text-sm mb-1 line-clamp-2 leading-tight">
              {project.case_study.title}
            </h4>
            <p className="text-gray-400 text-xs line-clamp-2">
              {project.case_study.use_case}
            </p>
          </div>

          {/* Quote Preview */}
          <div className="flex-1 flex items-start mb-3">
            <blockquote className="text-gray-300 text-xs italic line-clamp-4 leading-relaxed">
              "{project.case_study.quote.text}"
            </blockquote>
          </div>

          {/* Author Info */}
          <div className="mt-auto">
            <div className="font-semibold text-[#00d992] text-xs hover:text-[#00c182] transition-colors cursor-pointer group">
              Read the case study
              <span className="inline-block transition-transform group-hover:translate-x-1 ml-1">
                →
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
};
