import Link from "@docusaurus/Link";
import { ArrowTopRightOnSquareIcon, BuildingOfficeIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import React from "react";
import { getLogoComponent } from "../../utils/logo-helper";

interface CustomerCardProps {
  project: {
    id: number;
    slug: string;
    customer: {
      name: string;
      logo_url?: string;
      logo?: string;
      website: string;
      industry: string;
      team_size?: string;
      location?: string;
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
        className="border-solid bg-white/5 border-[#1e293b]/40 border-2 rounded-lg overflow-hidden transition-all duration-300 h-full hover:border-[#00d992]/30 hover:scale-[1.02] cursor-pointer"
        style={{
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        }}
      >
        {/* Customer Header */}
        <div className="relative p-4 border-b border-[#334155]">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {(() => {
                // Check if logo_url exists first
                if (project.customer.logo_url) {
                  return (
                    <img
                      src={project.customer.logo_url}
                      alt={`${project.customer.name} logo`}
                      className="w-9 h-9 mr-2 object-contain rounded"
                    />
                  );
                }
                // Fall back to SVG component if logo field exists
                if (project.customer.logo) {
                  const LogoComponent = getLogoComponent(project.customer.logo);
                  return <LogoComponent className="w-9 h-9 mr-2 text-[#00d992]" />;
                }
                // Final fallback to default icon
                return <BuildingOfficeIcon className="w-9 h-9 mr-2  text-white" />;
              })()}
              <div>
                <span className="text-[#00d992] font-bold text-base">{project.customer.name}</span>
                <div className="text-gray-400 text-xs">{project.customer.industry}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 pb-4 flex flex-col flex-1">
          {/* Case Study Title */}
          <div className="mb-3">
            <h4 className="text-[#dcdcdc] font-semibold text-sm mb-3 line-clamp-2 leading-tight">
              {project.case_study.title}
            </h4>
            <p className="text-gray-400 text-xs line-clamp-2">{project.case_study.use_case}</p>
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
