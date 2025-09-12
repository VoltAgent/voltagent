import Head from "@docusaurus/Head";
import Link from "@docusaurus/Link";
import {
  AcademicCapIcon,
  AdjustmentsHorizontalIcon,
  ArrowPathIcon,
  ArrowRightIcon,
  BoltIcon,
  BookOpenIcon,
  ChartBarIcon,
  ChartBarSquareIcon,
  ChatBubbleLeftRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CircleStackIcon,
  CloudArrowUpIcon,
  CodeBracketIcon,
  CodeBracketSquareIcon,
  CommandLineIcon,
  DevicePhoneMobileIcon,
  FaceSmileIcon,
  MagnifyingGlassIcon,
  MagnifyingGlassPlusIcon,
  ServerStackIcon,
  ShieldCheckIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { DotPattern } from "@site/src/components/ui/dot-pattern";
import { UseCaseAnimation } from "@site/src/components/usecase-animation";
import Layout from "@theme/Layout";
import Mermaid from "@theme/Mermaid";
import { motion } from "framer-motion";
import type React from "react";

// Icon mapping
const iconMap = {
  MagnifyingGlassIcon,
  ChatBubbleLeftRightIcon,
  CodeBracketSquareIcon,
  UserGroupIcon,
  ServerStackIcon,
  CircleStackIcon,
  ChartBarIcon,
  CodeBracketIcon,
  ArrowPathIcon,
  BookOpenIcon,
  FaceSmileIcon,
  DevicePhoneMobileIcon,
  CommandLineIcon,
  ShieldCheckIcon,
  AdjustmentsHorizontalIcon,
  AcademicCapIcon,
  ChartBarSquareIcon,
  BoltIcon,
  CloudArrowUpIcon,
  MagnifyingGlassPlusIcon,
};

interface UseCasePageProps {
  useCase: {
    id: number;
    slug: string;
    title: string;
    category: string;
    icon: string;
    hero: {
      headline: string;
      subtext: string;
      primaryCTA: string;
      primaryCTALink: string;
      secondaryCTA: string;
      secondaryCTALink: string;
      mermaidDiagram?: string;
    };
    painPoints: string[];
    solutions: string[];
    features: Array<{
      title: string;
      description: string;
      icon: string;
    }>;
    exampleAgents?: Array<{
      name: string;
      description: string;
    }>;
    capabilities?: string[];
    howItWorks?: Array<{
      step: number;
      title: string;
      description: string;
    }>;
  };
}

// Reusable components
const Section = ({
  children,
  className = "",
}: { children: React.ReactNode; className?: string }) => (
  <section className={`py-8 md:py-10 lg:py-16 ${className}`}>{children}</section>
);

const Container = ({
  children,
  className = "",
}: { children: React.ReactNode; className?: string }) => (
  <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>
);

const Button = ({
  variant = "primary",
  children,
  href,
  className = "",
}: {
  variant?: "primary" | "secondary";
  children: React.ReactNode;
  href: string;
  className?: string;
}) => {
  const baseClasses =
    "inline-flex items-center justify-center px-6 py-3 rounded-2xl font-semibold transition-all duration-200 no-underline";
  const variants = {
    primary:
      "bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-600/30 shadow-lg hover:shadow-xl",
    secondary:
      "bg-transparent text-emerald-400 border border-emerald-500/20 hover:bg-emerald-600/20",
  };

  return (
    <Link href={href} className={`${baseClasses} ${variants[variant]} ${className}`}>
      {children}
    </Link>
  );
};

const Badge = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <span
    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 ${className}`}
  >
    {children}
  </span>
);

export default function UseCasePage({ useCase }: UseCasePageProps): JSX.Element {
  if (!useCase) {
    return (
      <Layout>
        <Head>
          <title>Use Case Not Found - VoltAgent</title>
          <meta name="description" content="The requested use case could not be found." />
        </Head>
        <main className="flex-1 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-400 mb-4">Use Case Not Found</h1>
            <Link to="/" className="text-[#00d992] hover:underline no-underline">
              Back to Home
            </Link>
          </div>
        </main>
      </Layout>
    );
  }

  // SEO metadata
  const seoTitle = `${useCase.title} - VoltAgent Use Case`;
  const seoDescription = useCase.hero.subtext;

  return (
    <Layout>
      <Head>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seoTitle} />
        <meta name="twitter:description" content={seoDescription} />
      </Head>

      <main className="flex-1 bg-[#080f11d9]">
        <DotPattern dotColor="#94a3b8" dotSize={1.2} spacing={20} />
        {/* Hero Section */}
        <Section className="relative overflow-hidden">
          <Container>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
              {/* Left side - Content */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="mb-4">
                  <span className="text-[#00d992] font-semibold text-lg">
                    {useCase.slug === "ai-research-assistant"
                      ? "AI Agent for Research & Analysis"
                      : useCase.slug === "customer-support-agent"
                        ? "AI Agent for Customer Support"
                        : useCase.slug === "code-review-assistant"
                          ? "AI Agent for Code Review"
                          : useCase.slug === "sales-lead-qualification"
                            ? "AI Agent for Sales Automation"
                            : "AI Agent Solution"}
                  </span>
                </div>
                <h1 className="text-4xl md:text-5xl  font-bold text-white mb-6 leading-tight">
                  {useCase.hero.headline}
                </h1>
                <p className="text-lg md:text-xl text-gray-400 mb-8 leading-relaxed">
                  {useCase.hero.subtext}
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button href={useCase.hero.primaryCTALink} variant="primary">
                    {useCase.hero.primaryCTA}
                    <ArrowRightIcon className="w-5 h-5 ml-2" />
                  </Button>
                  <Button href={useCase.hero.secondaryCTALink} variant="secondary">
                    {useCase.hero.secondaryCTA}
                  </Button>
                </div>
              </motion.div>

              {/* Right side - Interactive Animation */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="relative"
              >
                <UseCaseAnimation slug={useCase.slug} />
              </motion.div>
            </div>
          </Container>
        </Section>

        {/* Features & Capabilities */}
        <Section>
          <Container>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              {/* Capabilities and Features Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                {/* Capabilities List - Left Column */}
                {useCase.capabilities && useCase.capabilities.length > 0 && (
                  <div>
                    <div className="h-full">
                      <h2 className="text-3xl md:text-4xl font-bold mb-4">
                        <span className="text-main-emerald">What your</span>{" "}
                        <span className="text-white">
                          {(() => {
                            const title = useCase.title.toLowerCase();
                            if (title.includes("agent") || title.includes("assistant")) {
                              return title;
                            }
                            if (title.includes("teams")) {
                              return title.replace("teams", "agents");
                            }
                            return `${title} agents`;
                          })()}
                        </span>{" "}
                        <span className="text-main-emerald">can do</span>
                      </h2>
                      <p className="text-gray-400 text-lg mb-8">
                        Build TypeScript agents with these powerful capabilities:
                      </p>
                      <div className="space-y-4">
                        {useCase.capabilities.map((capability) => (
                          <div
                            key={`capability-${capability.substring(0, 30).replace(/\s+/g, "-")}`}
                            className="flex items-start"
                          >
                            <ArrowRightIcon className="w-5 h-5 text-emerald-400 mr-3 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-300 text-base">{capability}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Feature Cards - Right Column */}
                <div className="space-y-4">
                  {useCase.features.map((feature, index) => {
                    const FeatureIcon = iconMap[feature.icon] || ServerStackIcon;
                    return (
                      <div
                        key={`feature-${feature.title.replace(/\s+/g, "-")}`}
                        className={`rounded-lg border border-solid ${
                          index === 0
                            ? "border-emerald-400 bg-emerald-400/5"
                            : "border-[#ffffff]/10"
                        } p-4 transition-all duration-200 ${
                          index !== 0 ? "hover:border-emerald-400/50 hover:bg-gray-900/30" : ""
                        }`}
                      >
                        <div className="flex items-start">
                          <div className="mr-3 flex-shrink-0">
                            <FeatureIcon className="w-5 h-5 text-[#00d992]" />
                          </div>
                          <div>
                            <h3 className="text-base font-semibold text-white mb-1">
                              {feature.title}
                            </h3>
                            <p className="text-gray-400 text-sm">{feature.description}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </Container>
        </Section>

        {/* How It Works */}
        <Section className="">
          <Container>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              {/* Show steps with connected design */}
              <div className="relative mb-12">
                {/* Show mermaid diagram if available */}
                {useCase.hero.mermaidDiagram && (
                  <div className="max-w-5xl mx-auto mb-16">
                    <Mermaid value={useCase.hero.mermaidDiagram} />
                  </div>
                )}
                {/* Desktop view with horizontal connection */}
                <div className="hidden lg:block relative">
                  <div className="grid grid-cols-4 gap-6">
                    {(
                      useCase.howItWorks || [
                        {
                          step: 1,
                          title: "Build with VoltAgent",
                          description: "Program your agent logic and workflows in TypeScript.",
                        },
                        {
                          step: 2,
                          title: "Connect data & tools",
                          description:
                            "Integrate APIs, databases, vector DBs (Chroma, Pinecone, Qdrant), and external systems.",
                        },
                        {
                          step: 3,
                          title: "Add memory & RAG",
                          description:
                            "Index your knowledge and enable retrieval + long-term context.",
                        },
                        {
                          step: 4,
                          title: "Observe in VoltOps",
                          description:
                            "Trace decisions, tool calls, tokens, and performance; refine safely.",
                        },
                      ]
                    ).map((step, index, array) => (
                      <div key={step.step} className="relative">
                        {/* Connection line to next step */}
                        {index < array.length - 1 && (
                          <div className="absolute top-1/2 -right-6 w-6 h-px bg-emerald-500/20 z-10" />
                        )}

                        {/* Step box with number in top-right */}
                        <div
                          className={`relative border border-solid ${
                            index === 0
                              ? "border-emerald-400 bg-emerald-400/5"
                              : "border-[#ffffff]/10"
                          } rounded-lg p-4 h-full transition-all duration-200 ${
                            index !== 0 ? "hover:border-emerald-400/50" : ""
                          }`}
                        >
                          {/* Step number in top-right corner */}
                          <div className="absolute bottom-2 right-2 w-7 h-7 z-50 bg-emerald-600/40 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center justify-center text-xs font-semibold">
                            {step.step}
                          </div>

                          {/* Step content */}
                          <div>
                            <h3 className="font-semibold text-lg text-white  mb-2">{step.title}</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">
                              {step.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tablet view (2 columns) */}
                <div className="hidden md:block lg:hidden">
                  <div className="grid grid-cols-2 gap-6">
                    {(
                      useCase.howItWorks || [
                        {
                          step: 1,
                          title: "Build with VoltAgent",
                          description: "Program your agent logic and workflows in TypeScript.",
                        },
                        {
                          step: 2,
                          title: "Connect data & tools",
                          description:
                            "Integrate APIs, databases, vector DBs (Chroma, Pinecone, Qdrant), and external systems.",
                        },
                        {
                          step: 3,
                          title: "Add memory & RAG",
                          description:
                            "Index your knowledge and enable retrieval + long-term context.",
                        },
                        {
                          step: 4,
                          title: "Observe in VoltOps",
                          description:
                            "Trace decisions, tool calls, tokens, and performance; refine safely.",
                        },
                      ]
                    ).map((step, index) => (
                      <div key={step.step} className="relative">
                        {/* Connection line for first row to second row */}
                        {index === 1 && (
                          <div className="absolute -bottom-6 left-1/2 w-px h-6 bg-emerald-500/20 z-10" />
                        )}

                        {/* Step box with number in top-right */}
                        <div className="relative bg-gray-900/50 border border-gray-800 rounded-xl p-5 h-full hover:bg-gray-900/70 hover:border-emerald-500/30 transition-all duration-200">
                          {/* Step number in top-right corner */}
                          <div className="absolute -top-2 -right-2 w-7 h-7 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center justify-center text-xs font-semibold">
                            {step.step}
                          </div>

                          <div>
                            <h3 className="font-semibold text-white mb-2">{step.title}</h3>
                            <p className="text-gray-400 text-sm">{step.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mobile view with vertical boxes */}
                <div className="block md:hidden">
                  <div className="space-y-6">
                    {(
                      useCase.howItWorks || [
                        {
                          step: 1,
                          title: "Build with VoltAgent",
                          description: "Program your agent logic and workflows in TypeScript.",
                        },
                        {
                          step: 2,
                          title: "Connect data & tools",
                          description:
                            "Integrate APIs, databases, vector DBs (Chroma, Pinecone, Qdrant), and external systems.",
                        },
                        {
                          step: 3,
                          title: "Add memory & RAG",
                          description:
                            "Index your knowledge and enable retrieval + long-term context.",
                        },
                        {
                          step: 4,
                          title: "Observe in VoltOps",
                          description:
                            "Trace decisions, tool calls, tokens, and performance; refine safely.",
                        },
                      ]
                    ).map((step, index, array) => (
                      <div key={step.step} className="relative">
                        {/* Connection line to next step */}
                        {index < array.length - 1 && (
                          <div className="absolute -bottom-6 left-1/2 w-px h-6 bg-emerald-500/20 z-10" />
                        )}

                        {/* Step box with number in top-right */}
                        <div className="relative bg-gray-900/50 border border-gray-800 rounded-xl p-5 hover:bg-gray-900/70 hover:border-emerald-500/30 transition-all duration-200">
                          {/* Step number in top-right corner */}
                          <div className="absolute -top-2 -right-2 w-7 h-7 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center justify-center text-xs font-semibold">
                            {step.step}
                          </div>

                          <div>
                            <h3 className="font-semibold text-white mb-2">{step.title}</h3>
                            <p className="text-gray-400 text-sm">{step.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </Container>
        </Section>

        {/* Pain → Solution */}
        <Section className="">
          <Container>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              {/* Single card with Pain → Solution */}
              <div className="border border-solid border-white/10 rounded-xl p-8">
                <div className="relative">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-0">
                    {/* Vertical divider line - only on desktop */}
                    <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2">
                      <div className="h-full bg-gradient-to-b from-transparent via-emerald-500/30 to-transparent" />
                    </div>

                    {/* Problems column */}
                    <div className="lg:pr-12">
                      <h2 className="text-2xl font-bold text-rose-500 mb-6 flex items-center">
                        The Problems
                      </h2>
                      <ul className="space-y-4 pl-0">
                        {useCase.painPoints.map((pain) => (
                          <li
                            key={`pain-${pain.substring(0, 30).replace(/\s+/g, "-")}`}
                            className="flex items-start group"
                          >
                            <div className="w-2 h-2 rounded-full bg-rose-500 mr-3 mt-2 flex-shrink-0" />
                            <span className="text-white group-hover:text-gray-300 transition-colors">
                              {pain}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Solutions column */}
                    <div className="lg:pl-12">
                      <h2 className="text-2xl font-bold text-emerald-500 mb-6 flex items-center">
                        How VoltAgent Solves It
                      </h2>
                      <ul className="space-y-4 pl-0">
                        {useCase.solutions.map((solution) => (
                          <li
                            key={`solution-${solution.substring(0, 30).replace(/\s+/g, "-")}`}
                            className="flex items-start group"
                          >
                            <div className="w-2 h-2 rounded-full bg-emerald-500 mr-3 mt-2 flex-shrink-0" />
                            <span className="text-white group-hover:text-gray-300 transition-colors">
                              {solution}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Mobile horizontal divider */}
                  <div className="block lg:hidden my-6">
                    <div className="flex items-center justify-center">
                      <div className="h-px w-16 bg-gradient-to-r from-transparent to-emerald-500/30" />
                      <ArrowRightIcon className="w-5 h-5 text-emerald-400 mx-2" />
                      <div className="h-px w-16 bg-gradient-to-l from-transparent to-emerald-500/30" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </Container>
        </Section>

        {/* Example Agents & Security - Side by Side */}
        <Section>
          <Container>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Example Agents - Left Column */}
              {useCase.exampleAgents && useCase.exampleAgents.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.35 }}
                >
                  <h2 className="text-2xl md:text-3xl font-bold text-main-emerald mb-4">
                    Example Agents You Can Build
                  </h2>
                  <p className="text-gray-400 mb-6 text-sm">
                    With VoltAgent's TypeScript framework, you have complete control to build agents
                    tailored to your specific needs:
                  </p>
                  <div className="space-y-3">
                    {useCase.exampleAgents.map((agent) => (
                      <div
                        key={`agent-${agent.name.replace(/\s+/g, "-")}`}
                        className="flex items-start group hover:bg-emerald-500/5 rounded-lg p-2 transition-all duration-200"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/60 mr-3 mt-2 flex-shrink-0 group-hover:bg-emerald-400" />
                        <div className="flex-1">
                          <span className="text-emerald-400 font-semibold mr-2">{agent.name}:</span>
                          <span className="text-gray-400 text-sm">{agent.description}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Enterprise Security - Right Column */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">
                  Enterprise-Ready Security
                </h2>
                <div className="flex flex-wrap gap-3 mb-6">
                  <Badge>SOC2 Compliant</Badge>
                  <Badge>GDPR Ready</Badge>
                  <Badge>SSO/SAML</Badge>
                  <Badge>RBAC</Badge>
                  <Badge>Self-Hosted Option</Badge>
                </div>
                <p className="text-gray-400 text-sm">
                  Your data stays in your control. VoltAgent supports self-hosting, single sign-on,
                  role-based access control, and meets enterprise compliance standards. All agent
                  interactions are encrypted and auditable.
                </p>
              </motion.div>
            </div>
          </Container>
        </Section>

        {/* Final CTA */}
        <Section className="bg-gradient-to-r from-[#00d992]/10 to-transparent">
          <Container>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.9 }}
              className="text-center"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to Ship Real Agents?
              </h2>
              <p className="text-lg text-gray-400 mb-8">
                Join hundreds of teams building production AI agents with VoltAgent
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button href="/docs/getting-started" variant="primary">
                  Get Started
                  <ArrowRightIcon className="w-5 h-5 ml-2" />
                </Button>
                <Button href="https://console.voltagent.dev/demo" variant="secondary">
                  Try Demo
                </Button>
              </div>
            </motion.div>
          </Container>
        </Section>
      </main>
    </Layout>
  );
}
