import Link from "@docusaurus/Link";
import {
  BookOpenIcon,
  CodeBracketIcon,
  ListBulletIcon,
  RocketLaunchIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
// @ts-expect-error - Docusaurus theme component
import CodeBlock from "@theme/CodeBlock";
import { FeatureShowcase } from "../feature-showcase";
import { DotPattern } from "../ui/dot-pattern";

const codeExample = `import { VoltAgent, Agent } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";
import { openai } from "@ai-sdk/openai";

const agent = new Agent({
  name: "my-voltagent-app",
  instructions: "A helpful assistant that answers questions",
  model: openai("gpt-4o-mini"),
});

new VoltAgent({
  agents: { agent },
  server: honoServer(),
});`;

const coreFeatures = ["Memory", "RAG", "Guardrails", "Tools", "MCP", "Voice", "Workflow"];

const quickLinks = [
  {
    title: "Quick Start",
    description: "Get up and running with VoltAgent in minutes.",
    href: "/docs/quick-start/",
    icon: RocketLaunchIcon,
  },

  {
    title: "Recipes & Guides",
    description: "Ready-to-use patterns and best practices.",
    href: "/recipes-and-guides/",
    icon: BookOpenIcon,
  },

  {
    title: "5 Steps Tutorial",
    description: "Learn the fundamentals with hands-on examples.",
    href: "/tutorial/introduction/",
    icon: ListBulletIcon,
  },
];

export default function DocsHome() {
  return (
    <div className="docs-home -mt-8 max-w-7xl mx-auto md:px-4">
      <DotPattern dotColor="#94a3b8" dotSize={1.2} spacing={20} />
      {/* Hero Section - Centered */}
      <div className="text-center pt-8 md:pt-16 pb-8 md:pb-12 mb-4 md:mb-8 overflow-visible">
        <div
          className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-semibold mb-4 md:mb-6 leading-normal pb-2"
          style={{
            background: "linear-gradient(to right, #ffffff, #a1a1aa)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            lineHeight: 1.2,
          }}
        >
          Build · Observe · Automate · Ship
          <br />
          AI Agents
        </div>
        <div className="text-sm sm:text-base md:text-lg text-white max-w-xl mx-auto px-2">
          AI Agent Engineering Platform for <span className="text-[#b2b2b2]">development</span>,{" "}
          <span className="text-[#b2b2b2]">observability</span>,{" "}
          <span className="text-[#b2b2b2]">evaluation</span>, and{" "}
          <span className="text-[#b2b2b2]">deployment</span> in one place.
        </div>
      </div>

      {/* VoltAgent Core Section */}
      <div className="mb-8 md:mb-12">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
          <div className="flex items-center gap-2">
            <CodeBracketIcon className="w-5 h-5 md:w-6 md:h-6 text-[#00d992]" />
            <span className="text-xl md:text-2xl font-semibold text-white">Core</span>
          </div>
          <span className="px-2 py-0.5 text-xs md:text-sm rounded-full bg-zinc-800/80 text-zinc-300 border border-zinc-700/50">
            Open Source TypeScript Framework
          </span>
        </div>
        <p className="docs-home-description text-sm md:text-base mb-4 text-zinc-400">
          Everything you need to build production-ready AI agents in TypeScript.
        </p>

        {/* Feature Badges */}
        <div className="flex flex-wrap gap-1.5 md:gap-2 mb-4 md:mb-6">
          {coreFeatures.map((feature) => (
            <span
              key={feature}
              className="px-2 md:px-3 py-0.5 md:py-1 text-xs md:text-sm rounded-full bg-zinc-800/50 text-zinc-300 border border-zinc-700/50"
            >
              {feature}
            </span>
          ))}
          <span className="px-2 md:px-3 py-0.5 md:py-1 text-xs md:text-sm rounded-full bg-zinc-800/50 text-zinc-500 border border-zinc-700/50">
            and more...
          </span>
        </div>

        {/* Code Block */}
        <CodeBlock language="typescript">{codeExample}</CodeBlock>
      </div>
      <div className="my-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {quickLinks.map((link) => (
            <div
              key={link.title}
              className="group p-3 md:p-4 rounded-lg !border !border-solid !border-zinc-800 transition-all duration-200"
            >
              <div className="flex items-start gap-2 md:gap-3">
                <link.icon className="w-4 h-4 md:w-5 md:h-5 text-[#00d992] flex-shrink-0 mt-0.5" />
                <Link
                  to={link.href}
                  className="text-white font-medium hover:text-emerald-400 transition-colors no-underline hover:no-underline"
                >
                  <div className="flex text-white flex-col">
                    <span className="text-sm md:text-base">{link.title}</span>
                    <span className="text-[#b2b2b2] text-xs md:text-sm mt-1">
                      {link.description}
                    </span>
                  </div>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* VoltOps Console Section */}
      <div className="my-8 md:my-12 bg-black">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Squares2X2Icon className="w-5 h-5 md:w-6 md:h-6 text-[#00d992]" />
            <span className="text-xl md:text-2xl font-semibold text-white">VoltOps Console</span>
          </div>
          <span className="px-2 py-0.5 text-xs md:text-sm rounded-full bg-zinc-800/80 text-zinc-300 border border-zinc-700/50">
            Cloud / Self-Hosted Platform
          </span>
        </div>
        <p className="docs-home-description text-sm md:text-base mb-4 text-zinc-400">
          Enterprise-grade platform to take AI agents from development to production.
        </p>
        {/* Feature Showcase - Full Width */}
        <div className="my-6 md:my-12 relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen max-w-none px-2 md:px-8">
          <FeatureShowcase />
        </div>
        {/*   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {voltOpsFeatures.map((feature) => (
            <Link to={feature.href} className="no-underline hover:no-underline">
              <div
                key={feature.title}
                className="group p-5 cursor-pointer rounded-lg border border-solid border-zinc-800 hover:border-zinc-700 transition-all duration-200"
              >
                <div className="flex items-center gap-2 mb-2">
                  <feature.icon className="w-5 h-5 text-[#00d992]" />
                  <span className=" text-white">{feature.title}</span>
                </div>

                <p className="text-sm text-zinc-400 mb-4 leading-relaxed">{feature.description}</p>
                <span className="inline-flex items-center gap-1 text-zinc-400 group-hover:text-white text-sm transition-all">
                  Learn more <ArrowRightIcon className="w-3 h-3" />
                </span>
              </div>
            </Link>
          ))}
        </div> */}
      </div>

      {/* Quick Links Section */}
    </div>
  );
}
