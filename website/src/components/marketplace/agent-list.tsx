import {
  ArrowPathIcon,
  BoltIcon as BoltOutlineIcon,
  ChartBarIcon,
  CheckIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";
import { BoltIcon } from "@heroicons/react/24/solid";
import { motion } from "framer-motion";
import React, { useState, useEffect } from "react";

import angelaAvatar from "../../../static/img/avatars/the-office/angela.png";
import dwightAvatar from "../../../static/img/avatars/the-office/dwight.png";
import jimAvatar from "../../../static/img/avatars/the-office/jim.png";
import kevinAvatar from "../../../static/img/avatars/the-office/kevin.png";
// Import avatar images
import michaelAvatar from "../../../static/img/avatars/the-office/michael.png";
import pamAvatar from "../../../static/img/avatars/the-office/pam.png";

// Sample agent data
const dummyAgents = [
  {
    id: 7,
    name: "LinkedIn User Analyzer",
    rating: 4.8,
    description: "Analyze LinkedIn profiles and extract professional insights.",
    price: "2 credits per usage",
    usageStats: "6500 times used",
    lastUsed: "Just now",
    category: "Professional",
    tags: ["linkedin", "recruiting", "networking", "analytics"],
    creator: {
      name: "Michael Scott",
      avatar: michaelAvatar,
      verified: true,
    },
  },
  {
    id: 1,
    name: "Customer Support Bot",
    rating: 4.5,
    description: "Automate customer inquiries with natural language.",
    price: "Free",
    usageStats: "28,452 tasks completed",
    lastUsed: "3 days ago",
    category: "Support",
    tags: ["chatbot", "customer service", "automation"],
    creator: {
      name: "Dwight Schrute",
      avatar: dwightAvatar,
      verified: true,
    },
  },
  {
    id: 2,
    name: "Data Analyzer",
    rating: 5,
    description: "Process complex datasets with advanced analytics.",
    price: "$19/month",
    usageStats: "15,789 analyses run",
    lastUsed: "1 day ago",
    category: "Analytics",
    tags: ["data", "analytics", "visualization"],
    creator: {
      name: "Jim Halpert",
      avatar: jimAvatar,
      verified: true,
    },
  },
  {
    id: 3,
    name: "Content Writer",
    rating: 4.2,
    description:
      "Generate high-quality content for your brand like blog posts, social media posts, and more.",
    price: "10 credits per article",
    usageStats: "7,892 documents created",
    lastUsed: "5 days ago",
    category: "Content",
    tags: ["writing", "content", "SEO"],
    creator: {
      name: "Pam Beesly",
      avatar: pamAvatar,
      verified: true,
    },
  },
  {
    id: 5,
    name: "Meeting Scheduler",
    rating: 4.1,
    description: "Schedule meetings and send automatic reminders.",
    price: "Free",
    usageStats: "12,567 meetings scheduled",
    lastUsed: "2 days ago",
    category: "Productivity",
    tags: ["calendar", "scheduling", "reminders"],
    creator: {
      name: "Angela Martin",
      avatar: angelaAvatar,
      verified: true,
    },
  },
  {
    id: 6,
    name: "Social Media Manager",
    rating: 4.6,
    description:
      "Schedule posts across multiple platforms like X, LinkedIn, and Instagram.",
    price: "$9/month",
    usageStats: "31,845 posts published",
    lastUsed: "6 hours ago",
    category: "Marketing",
    tags: ["social media", "marketing", "analytics"],
    creator: {
      name: "Kevin Malone",
      avatar: kevinAvatar,
      verified: true,
    },
  },
];

// Rating component
const RatingStars = ({ rating }) => {
  return (
    <div className="flex items-center gap-1">
      <BoltIcon className="h-3 w-3 text-[#00d992]" />
      <span className="text-xs text-gray-400">
        {rating.toFixed(1)}
        <span className="text-gray-500">/5</span>
      </span>
    </div>
  );
};

// Agent Card Component
const AgentCard = ({
  agent,
  onSelectAgent = () => {},
  isFirstCard = false,
  scrollToAgentDetail = null,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`border-solid ${
        isFirstCard
          ? "border-[#00d992]/40 cursor-pointer"
          : "border-[#1e293b]/40"
      } rounded-lg overflow-hidden transition-all duration-300 h-full`}
      style={{
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        backgroundColor: "rgba(58, 66, 89, 0.3)",
      }}
      // @ts-ignore - We're providing a default value
      onClick={() => isFirstCard && onSelectAgent(agent)}
    >
      <div className="p-4 flex flex-col h-full">
        {/* Header with category badge */}
        <div className="flex justify-between items-center mb-3">
          <span className="text-[#00d992] font-bold text-base sm:text-lg truncate">
            {agent.name}
          </span>
          <span className="px-2 py-0.5 text-xs rounded-full bg-[#1e293b] text-gray-300">
            {agent.category}
          </span>
        </div>

        {/* Creator Info and avatar in one row */}
        <div className="mb-3 flex flex-wrap items-center">
          <div className="relative mr-2">
            <img
              src={agent.creator.avatar}
              alt={`${agent.creator.name}'s avatar`}
              className="w-7 h-7 rounded-full border-solid border-[#1e293b]"
            />
            {agent.creator.verified && (
              <div className="absolute -top-1 -right-1 bg-[#00d992] rounded-full w-3 h-3 border-solid border-black flex items-center justify-center">
                <CheckIcon
                  className="w-2 h-2 text-black"
                  fill="none"
                  stroke="currentColor"
                  aria-hidden="true"
                />
              </div>
            )}
          </div>
          <span className="text-xs text-gray-300 mr-2">
            <span className="text-gray-500">By</span>{" "}
            <span className="font-medium">{agent.creator.name}</span>
          </span>
          <div className="flex items-center mt-1 xs:mt-0">
            <RatingStars rating={agent.rating} />
          </div>
        </div>

        {/* Description - reduced margin */}
        <p className="text-gray-400 text-xs sm:text-sm mb-3">
          {agent.description}
        </p>

        {/* Price and Try Now in same row */}
        <div className="mb-3 flex flex-wrap items-center justify-between">
          <div className="flex items-center mb-2 xs:mb-0">
            <CurrencyDollarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-[#00d992] mr-1" />
            <span className="text-gray-300 text-xs sm:text-sm font-medium">
              {agent.price}
            </span>
          </div>
          <button
            className={`px-2 sm:px-3 py-1 sm:py-1.5 bg-emerald-400/10 text-emerald-400 border-solid border-emerald-400/20 text-xs sm:text-sm rounded transition-colors ${
              isFirstCard ? "cursor-pointer hover:bg-emerald-400/20" : ""
            }`}
            onClick={(e) => {
              if (isFirstCard && scrollToAgentDetail) {
                e.stopPropagation();
                scrollToAgentDetail();
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && isFirstCard && scrollToAgentDetail) {
                scrollToAgentDetail();
              }
            }}
            type="button"
            disabled={!isFirstCard}
          >
            Try Now
          </button>
        </div>

        {/* Stats in a more compact layout */}
        <div className="flex flex-wrap justify-between text-xs text-gray-400">
          <div className="flex items-center mb-1 xs:mb-0 mr-4 xs:mr-0">
            <ChartBarIcon className="h-3 w-3 mr-1 text-gray-500" />
            <span>{agent.usageStats}</span>
          </div>
          <div className="flex items-center">
            <ArrowPathIcon className="h-3 w-3 mr-1 text-gray-500" />
            <span>Last used {agent.lastUsed}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export const AgentList = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if we're on mobile initially
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 640); // sm breakpoint is 640px
    };

    checkIsMobile();

    // Add resize listener
    window.addEventListener("resize", checkIsMobile);

    // Clean up
    return () => {
      window.removeEventListener("resize", checkIsMobile);
    };
  }, []);

  // Limit to first 3 agents on mobile
  const visibleAgents = isMobile ? dummyAgents.slice(0, 3) : dummyAgents;

  return (
    <div className="py-8 px-3">
      <div className="flex flex-col gap-6">
        {/* Agent cards grid */}
        <div className="flex-1">
          <div className="grid grid-cols-1 xs:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 relative">
            {visibleAgents.map((agent, index) => (
              <div key={agent.id} className="relative">
                <AgentCard
                  agent={agent}
                  isFirstCard={index === 0}
                  scrollToAgentDetail={
                    index === 0
                      ? () => {
                          // Find the AgentDetail section in index.tsx and scroll to it
                          const agentDetailElement = document.getElementById(
                            "agent-detail-section",
                          );
                          if (agentDetailElement) {
                            agentDetailElement.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            });
                          }
                        }
                      : null
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentList;
