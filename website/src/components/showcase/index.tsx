import React, { useState } from "react";
import { motion } from "framer-motion";
import { BoltIcon } from "@heroicons/react/24/solid";
import {
  ArrowTopRightOnSquareIcon,
  UserGroupIcon,
  StarIcon,
  EyeIcon,
  CodeBracketIcon,
  ChatBubbleLeftRightIcon,
  BuildingStorefrontIcon,
  ChartBarIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  ShareIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import { DotPattern } from "../ui/dot-pattern";

// Sample showcase data - community projects
const showcaseProjects = [
  {
    id: 1,
    name: "E-commerce Assistant Bot",
    description:
      "A comprehensive shopping assistant that helps customers find products, process orders, and provide customer support with natural language understanding.",
    creator: "Sarah Chen",
    avatar:
      "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=64&h=64&fit=crop&crop=face",
    verified: true,
    category: "E-commerce",
    stats: {
      stars: 1247,
      views: 8900,
      forks: 156,
    },
    tags: ["shopping", "customer-service", "nlp", "automation"],
    demoUrl: "https://demo.example.com",
    githubUrl: "https://github.com/example/ecommerce-bot",
    featured: true,
    tech: ["TypeScript", "VoltAgent", "OpenAI", "Stripe"],
    screenshot:
      "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=200&fit=crop",
  },
  {
    id: 2,
    name: "Content Creation Workflow",
    description:
      "Automated content pipeline that generates blog posts, social media content, and SEO optimizations using AI-driven workflows.",
    creator: "Marcus Rodriguez",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=64&h=64&fit=crop&crop=face",
    verified: true,
    category: "Content",
    stats: {
      stars: 892,
      views: 5670,
      forks: 89,
    },
    tags: ["content", "seo", "social-media", "automation"],
    demoUrl: "https://demo.example.com",
    githubUrl: "https://github.com/example/content-workflow",
    featured: false,
    tech: ["TypeScript", "VoltAgent", "Claude", "WordPress"],
    screenshot:
      "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=200&fit=crop",
  },
  {
    id: 3,
    name: "Smart Meeting Scheduler",
    description:
      "Intelligent calendar management system that schedules meetings, sends reminders, and manages availability across multiple platforms.",
    creator: "Elena Vasquez",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=64&h=64&fit=crop&crop=face",
    verified: true,
    category: "Productivity",
    stats: {
      stars: 654,
      views: 4320,
      forks: 67,
    },
    tags: ["calendar", "scheduling", "automation", "productivity"],
    demoUrl: "https://demo.example.com",
    githubUrl: "https://github.com/example/smart-scheduler",
    featured: false,
    tech: ["TypeScript", "VoltAgent", "Google Calendar", "Outlook"],
    screenshot:
      "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=200&fit=crop",
  },
  {
    id: 4,
    name: "Customer Analytics Dashboard",
    description:
      "Real-time analytics platform that processes customer data, generates insights, and provides automated reports with AI-powered recommendations.",
    creator: "David Kim",
    avatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&h=64&fit=crop&crop=face",
    verified: false,
    category: "Analytics",
    stats: {
      stars: 432,
      views: 2890,
      forks: 45,
    },
    tags: ["analytics", "dashboard", "data-science", "reports"],
    demoUrl: "https://demo.example.com",
    githubUrl: "https://github.com/example/analytics-dashboard",
    featured: false,
    tech: ["TypeScript", "VoltAgent", "D3.js", "PostgreSQL"],
    screenshot:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=200&fit=crop",
  },
  {
    id: 5,
    name: "Multi-language Support Bot",
    description:
      "International customer support agent that provides real-time translation and culturally-aware responses across 15+ languages.",
    creator: "Aisha Patel",
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&fit=crop&crop=face",
    verified: true,
    category: "Support",
    stats: {
      stars: 789,
      views: 6540,
      forks: 98,
    },
    tags: ["translation", "support", "multilingual", "chatbot"],
    demoUrl: "https://demo.example.com",
    githubUrl: "https://github.com/example/multilang-bot",
    featured: true,
    tech: ["TypeScript", "VoltAgent", "Google Translate", "Azure"],
    screenshot:
      "https://images.unsplash.com/photo-1587560699334-cc4ff634909a?w=400&h=200&fit=crop",
  },
  {
    id: 6,
    name: "Code Review Assistant",
    description:
      "Automated code review system that analyzes pull requests, suggests improvements, and ensures coding standards across development teams.",
    creator: "Alex Thompson",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=64&h=64&fit=crop&crop=face",
    verified: true,
    category: "Development",
    stats: {
      stars: 1156,
      views: 7890,
      forks: 134,
    },
    tags: ["code-review", "development", "automation", "quality"],
    demoUrl: "https://demo.example.com",
    githubUrl: "https://github.com/example/code-review-assistant",
    featured: false,
    tech: ["TypeScript", "VoltAgent", "GitHub API", "ESLint"],
    screenshot:
      "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&h=200&fit=crop",
  },
];

// Category icons mapping
const categoryIcons = {
  "E-commerce": BuildingStorefrontIcon,
  Content: DocumentTextIcon,
  Productivity: CalendarDaysIcon,
  Analytics: ChartBarIcon,
  Support: ChatBubbleLeftRightIcon,
  Development: CodeBracketIcon,
};

// Project Card Component
const ProjectCard = ({ project, isFirstCard = false }) => {
  const CategoryIcon = categoryIcons[project.category] || CodeBracketIcon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`border-solid ${
        isFirstCard ? "border-[#00d992]/40" : "border-[#1e293b]/40"
      } border rounded-lg overflow-hidden transition-all duration-300 h-full hover:border-[#00d992]/30 hover:scale-[1.02]`}
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
        <div className="absolute top-3 right-3 flex gap-2">
          {project.featured && (
            <span className="px-2 py-1 text-xs bg-[#00d992] text-black rounded-md font-medium">
              Featured
            </span>
          )}
          <span className="px-2 py-1 text-xs rounded-md bg-[#1e293b] text-gray-300 flex items-center">
            <CategoryIcon className="w-3 h-3 mr-1" />
            {project.category}
          </span>
        </div>
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
        <div className="mb-3 flex items-center">
          <div className="relative mr-2">
            <img
              src={project.avatar}
              alt={`${project.creator}'s avatar`}
              className="w-7 h-7 rounded-full border border-[#1e293b]"
            />
            {project.verified && (
              <div className="absolute -top-1 -right-1 bg-[#00d992] rounded-full w-3 h-3 border border-black flex items-center justify-center">
                <CheckIcon className="w-2 h-2 text-black" />
              </div>
            )}
          </div>
          <span className="text-xs text-gray-300">
            <span className="text-gray-500">By</span>{" "}
            <span className="font-medium">{project.creator}</span>
          </span>
        </div>

        {/* Stats */}
        <div className="mb-3 flex items-center gap-4 text-xs text-gray-400">
          <div className="flex items-center">
            <StarIcon className="w-3 h-3 mr-1 text-yellow-400" />
            {project.stats.stars.toLocaleString()}
          </div>
          <div className="flex items-center">
            <EyeIcon className="w-3 h-3 mr-1" />
            {project.stats.views.toLocaleString()}
          </div>
          <div className="flex items-center">
            <ShareIcon className="w-3 h-3 mr-1" />
            {project.stats.forks}
          </div>
        </div>

        {/* Tags */}
        <div className="mb-4 flex flex-wrap gap-1">
          {project.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 text-xs rounded-full bg-[#1e293b]/70 text-gray-300"
            >
              {tag}
            </span>
          ))}
          {project.tags.length > 3 && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-[#1e293b]/70 text-gray-400">
              +{project.tags.length - 3}
            </span>
          )}
        </div>

        {/* Tech Stack */}
        <div className="mb-4">
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

        {/* Actions */}
        <div className="mt-auto pt-3 flex gap-2">
          <a
            href={project.demoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-[#00d992] text-black text-xs font-medium py-2 px-3 rounded-md hover:bg-[#00d992]/90 transition-colors text-center flex items-center justify-center"
          >
            <EyeIcon className="w-3 h-3 mr-1" />
            Demo
          </a>
          <a
            href={project.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 border border-[#00d992]/40 text-[#00d992] text-xs font-medium py-2 px-3 rounded-md hover:bg-[#00d992]/10 transition-colors text-center flex items-center justify-center"
          >
            <ArrowTopRightOnSquareIcon className="w-3 h-3 mr-1" />
            Code
          </a>
        </div>
      </div>
    </motion.div>
  );
};

export const ShowcaseList = () => {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  const categories = [
    "All",
    ...Array.from(new Set(showcaseProjects.map((p) => p.category))),
  ];

  const filteredProjects = showcaseProjects.filter((project) => {
    const matchesCategory =
      selectedCategory === "All" || project.category === selectedCategory;
    const matchesSearch =
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.tags.some((tag) =>
        tag.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    return matchesCategory && matchesSearch;
  });

  return (
    <section className="relative py-20">
      <DotPattern dotColor="#94a3b8" dotSize={1.2} spacing={20} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-4">
            <div className="flex mr-3 items-center border-2 border-solid border-[#00d992] rounded-full p-2">
              <BoltIcon className="w-6 h-6 text-[#00d992]" />
            </div>
            <span className="text-4xl font-bold text-[#00d992]">voltagent</span>
            <span className="ml-3 text-2xl font-medium text-gray-400">
              Community Showcase
            </span>
          </div>
          <p className="text-lg text-[#dcdcdc] mb-6 max-w-3xl mx-auto">
            Discover amazing projects built by the VoltAgent community. From
            e-commerce bots to productivity tools, see what's possible with our
            TypeScript AI agent framework.
          </p>

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 text-sm text-gray-400 mb-8">
            <div className="flex items-center">
              <UserGroupIcon className="w-4 h-4 mr-2 text-[#00d992]" />
              {showcaseProjects.length} Projects
            </div>
            <div className="flex items-center">
              <StarIcon className="w-4 h-4 mr-2 text-yellow-400" />
              {showcaseProjects
                .reduce((acc, p) => acc + p.stats.stars, 0)
                .toLocaleString()}{" "}
              Stars
            </div>
            <div className="flex items-center">
              <CodeBracketIcon className="w-4 h-4 mr-2 text-[#00d992]" />
              Open Source
            </div>
          </div>
        </div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          {/* Search */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search projects, tags, or technologies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full max-w-md mx-auto block px-4 py-2 bg-[#1e293b]/50 border border-[#1e293b]/40 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#00d992]/50 focus:ring-1 focus:ring-[#00d992]/50"
            />
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  selectedCategory === category
                    ? "bg-[#00d992] text-black"
                    : "bg-[#1e293b]/50 text-gray-300 hover:bg-[#1e293b]/70"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Projects Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredProjects.map((project, index) => (
            <ProjectCard
              key={project.id}
              project={project}
              isFirstCard={index === 0}
            />
          ))}
        </motion.div>

        {/* Empty State */}
        {filteredProjects.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="text-gray-400 mb-4">
              <CodeBracketIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No projects found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          </motion.div>
        )}

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-20 text-center"
        >
          <div
            className="rounded-lg p-8 border border-[#00d992]/20"
            style={{
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
              backgroundColor: "rgba(0, 217, 146, 0.05)",
            }}
          >
            <h3 className="text-2xl font-bold text-[#00d992] mb-4">
              Built Something Amazing?
            </h3>
            <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
              Share your VoltAgent project with the community! Whether it's a
              chatbot, automation tool, or something completely new - we'd love
              to feature it here.
            </p>
            <div className="flex gap-4 justify-center">
              <a
                href="https://github.com/voltagent/voltagent/discussions"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#00d992] text-black px-6 py-3 rounded-lg font-medium hover:bg-[#00d992]/90 transition-colors flex items-center"
              >
                <ShareIcon className="w-4 h-4 mr-2" />
                Submit Your Project
              </a>
              <a
                href="https://docs.voltagent.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="border border-[#00d992]/40 text-[#00d992] px-6 py-3 rounded-lg font-medium hover:bg-[#00d992]/10 transition-colors flex items-center"
              >
                <CodeBracketIcon className="w-4 h-4 mr-2" />
                Get Started
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
