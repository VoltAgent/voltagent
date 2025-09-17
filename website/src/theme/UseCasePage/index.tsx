import Head from "@docusaurus/Head";
import Link from "@docusaurus/Link";
import {
  AcademicCapIcon,
  AdjustmentsHorizontalIcon,
  ArrowPathIcon,
  ArrowRightIcon,
  ArrowTrendingUpIcon,
  ArrowUpIcon,
  BoltIcon,
  BookOpenIcon,
  CalculatorIcon,
  CameraIcon,
  ChartBarIcon,
  ChartBarSquareIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  CircleStackIcon,
  ClockIcon,
  CloudArrowUpIcon,
  CodeBracketIcon,
  CodeBracketSquareIcon,
  CommandLineIcon,
  ComputerDesktopIcon,
  CubeTransparentIcon,
  DevicePhoneMobileIcon,
  FaceSmileIcon,
  FireIcon,
  FolderOpenIcon,
  HashtagIcon,
  KeyIcon,
  LanguageIcon,
  MagnifyingGlassIcon,
  MagnifyingGlassPlusIcon,
  MapIcon,
  PencilIcon,
  PresentationChartLineIcon,
  ReceiptPercentIcon,
  ServerStackIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { DotPattern } from "@site/src/components/ui/dot-pattern";
import { UseCaseAnimation } from "@site/src/components/usecase-animation";
import { ResponsiveSupervisorFlow } from "@site/src/components/usecase-supervisor-flow/responsive-wrapper";
import Layout from "@theme/Layout";
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
  ArrowUpIcon,
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
  PresentationChartLineIcon,
  MapIcon,
  CalculatorIcon,
  ReceiptPercentIcon,
  CubeTransparentIcon,
  FireIcon,
  HashtagIcon,
  FolderOpenIcon,
  PencilIcon,
  ComputerDesktopIcon,
  CameraIcon,
  UsersIcon,
  LanguageIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  TrendingUpIcon: ArrowTrendingUpIcon,
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
      heroTag?: string;
      businessTopics?: string[];
      systemCapabilities?: string[];
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
    supervisorFlow?: {
      enabled: boolean;
      title: string;
      subtitle: string;
      agents: Array<{
        id: string;
        label: string;
        sublabel: string;
        icon: string;
      }>;
      tools: Array<{
        id: string;
        label: string;
        sublabel: string;
        icon: string;
      }>;
    };
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

// Default steps for how it works section
const defaultHowItWorks = [
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
    description: "Index your knowledge and enable retrieval + long-term context.",
  },
  {
    step: 4,
    title: "Observe in VoltOps",
    description: "Trace decisions, tool calls, tokens, and performance; refine safely.",
  },
];

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
                    {useCase.hero.heroTag || "AI Agent Solution"}
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
                <UseCaseAnimation
                  slug={useCase.slug}
                  businessTopics={useCase.hero?.businessTopics}
                  systemCapabilities={useCase.hero?.systemCapabilities}
                />
              </motion.div>
            </div>
          </Container>
        </Section>

        {/* Features & Capabilities */}
        <Section className="relative overflow-hidden">
          {/* Background gradient effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-cyan-500/5" />
          <div className="absolute top-20 right-1/3 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl " />
          <div className="absolute bottom-20 left-1/3 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl  delay-1000" />

          <Container className="relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              {/* Section Heading */}
              <div className="mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  <span className="text-white">What your</span>{" "}
                  <span className="text-main-emerald">
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
                  <span className="text-white">can do</span>
                </h2>
                <p className="text-gray-400 mb-0 text-lg">
                  Design AI agents that match your workflows with VoltAgent
                </p>
              </div>

              {/* Capabilities and Features Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Capabilities List - Left Column */}
                {useCase.capabilities && useCase.capabilities.length > 0 && (
                  <div>
                    <div className="h-full">
                      <div className="space-y-4">
                        {useCase.capabilities.map((capability, index) => (
                          <motion.div
                            key={`capability-${capability.substring(0, 30).replace(/\s+/g, "-")}`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: 0.2 + index * 0.05 }}
                            className="flex items-start group"
                          >
                            <div className="relative mr-3 mt-0.5 flex-shrink-0">
                              <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                              <ArrowRightIcon className="w-5 h-5 text-emerald-400 relative z-10" />
                            </div>
                            <span className="text-gray-300 text-base group-hover:text-gray-200 transition-colors duration-300">
                              {capability}
                            </span>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Feature Cards - Right Column with 2x3 Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {useCase.features.map((feature, index) => {
                    const FeatureIcon = iconMap[feature.icon] || ServerStackIcon;
                    return (
                      <motion.div
                        key={`feature-${feature.title.replace(/\s+/g, "-")}`}
                        initial={{ opacity: 0, y: 30, rotateX: -15 }}
                        animate={{ opacity: 1, y: 0, rotateX: 0 }}
                        transition={{
                          duration: 0.5,
                          delay: 0.2 + index * 0.08,
                          type: "spring",
                          stiffness: 100,
                        }}
                        className="group relative perspective-1000"
                      >
                        <div className="relative h-full bg-gradient-to-br from-gray-900/90 to-gray-950/90 backdrop-blur-xl border border-solid border-emerald-500/30 rounded-2xl p-5 overflow-hidden">
                          {/* Animated background pattern */}
                          <div className="absolute inset-0 opacity-5">
                            <div
                              className="absolute inset-0"
                              style={{
                                backgroundImage:
                                  "radial-gradient(circle at 2px 2px, currentColor 1px, transparent 1px)",
                                backgroundSize: "20px 20px",
                              }}
                            />
                          </div>

                          <div className="relative z-10">
                            <h3 className="text-base  text-white mb-3 flex items-center">
                              <FeatureIcon className="w-5 h-5 text-emerald-400 mr-2 flex-shrink-0" />
                              {feature.title}
                            </h3>
                            <p className="text-gray-400 mb-0 text-sm leading-relaxed">
                              {feature.description}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </Container>
        </Section>

        {/* Supervisor Flow (Hero altı) */}
        {useCase.supervisorFlow?.enabled && (
          <Section>
            <Container>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
                  {useCase.supervisorFlow.title}
                </h2>
                <p className="text-gray-400 mb-6">{useCase.supervisorFlow.subtitle}</p>
                <ResponsiveSupervisorFlow
                  slug={useCase.slug}
                  agents={useCase.supervisorFlow.agents}
                  tools={useCase.supervisorFlow.tools}
                />
              </motion.div>
            </Container>
          </Section>
        )}

        {/* How It Works */}

        <Container className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            {/* Show steps with connected design */}
            <div className="relative mb-24">
              {/* Desktop view with horizontal connection */}
              <div className="hidden lg:block relative">
                <div className="grid grid-cols-4 gap-6">
                  {(useCase.howItWorks || defaultHowItWorks).map((step, index, array) => (
                    <motion.div
                      key={step.step}
                      initial={{ opacity: 0, y: 30, rotateX: -15 }}
                      animate={{ opacity: 1, y: 0, rotateX: 0 }}
                      transition={{
                        duration: 0.5,
                        delay: 0.5 + index * 0.1,
                        type: "spring",
                        stiffness: 100,
                      }}
                      className="relative"
                    >
                      {/* Connection line to next step */}
                      {index < array.length - 1 && (
                        <div className="absolute top-1/2 -right-6 w-6 h-px bg-gradient-to-r from-emerald-500/40 to-cyan-500/40 z-10" />
                      )}

                      {/* Step box */}
                      <div className="relative h-full bg-gradient-to-br from-gray-900/90 to-gray-950/90 backdrop-blur-xl border border-solid border-emerald-500/30 rounded-2xl p-5 overflow-hidden">
                        {/* Animated background pattern */}
                        <div className="absolute inset-0 opacity-5">
                          <div
                            className="absolute inset-0"
                            style={{
                              backgroundImage:
                                "radial-gradient(circle at 2px 2px, currentColor 1px, transparent 1px)",
                              backgroundSize: "20px 20px",
                            }}
                          />
                        </div>

                        {/* Step content */}
                        <div className="relative z-10">
                          <h3 className="font-bold text-base text-white mb-3 flex items-center">
                            <span className="text-emerald-400 font-bold text-lg mr-2">
                              {step.step}.
                            </span>
                            {step.title}
                          </h3>
                          <p className="text-gray-400 mb-0 text-sm leading-relaxed">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Tablet view (2 columns) */}
              <div className="hidden md:block lg:hidden">
                <div className="grid grid-cols-2 gap-6">
                  {(useCase.howItWorks || defaultHowItWorks).map((step, index) => (
                    <motion.div
                      key={step.step}
                      initial={{ opacity: 0, y: 30, rotateX: -15 }}
                      animate={{ opacity: 1, y: 0, rotateX: 0 }}
                      transition={{
                        duration: 0.5,
                        delay: 0.5 + index * 0.1,
                        type: "spring",
                        stiffness: 100,
                      }}
                      className="relative"
                    >
                      {/* Step box */}
                      <div className="relative h-full bg-gradient-to-br from-gray-900/90 to-gray-950/90 backdrop-blur-xl border border-solid border-emerald-500/30 rounded-2xl p-5 overflow-hidden">
                        {/* Animated background pattern */}
                        <div className="absolute inset-0 opacity-5">
                          <div
                            className="absolute inset-0"
                            style={{
                              backgroundImage:
                                "radial-gradient(circle at 2px 2px, currentColor 1px, transparent 1px)",
                              backgroundSize: "20px 20px",
                            }}
                          />
                        </div>

                        <div className="relative z-10">
                          <h3 className="font-bold text-white mb-2 flex items-center">
                            <span className="text-emerald-400 text-base font-bold mr-2">
                              {step.step}.
                            </span>
                            {step.title}
                          </h3>
                          <p className="text-gray-400 text-sm">{step.description}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Mobile view with vertical boxes */}
              <div className="block md:hidden">
                <div className="space-y-4">
                  {(useCase.howItWorks || defaultHowItWorks).map((step, index) => (
                    <motion.div
                      key={step.step}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.4,
                        delay: 0.5 + index * 0.08,
                      }}
                      className="relative"
                    >
                      {/* Step box */}
                      <div className="relative bg-gradient-to-br from-gray-900/90 to-gray-950/90 backdrop-blur-xl border border-solid border-emerald-500/30 rounded-xl p-4 overflow-hidden">
                        {/* Animated background pattern */}
                        <div className="absolute inset-0 opacity-5">
                          <div
                            className="absolute inset-0"
                            style={{
                              backgroundImage:
                                "radial-gradient(circle at 2px 2px, currentColor 1px, transparent 1px)",
                              backgroundSize: "15px 15px",
                            }}
                          />
                        </div>

                        {/* Step number badge */}
                        <div className="absolute -top-2 -left-2 w-10 h-10 flex items-center justify-center">
                          <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-sm" />
                          <div className="relative w-8 h-8 bg-gradient-to-br from-gray-900 to-gray-950 border border-solid border-emerald-500/60 rounded-full flex items-center justify-center">
                            <span className="text-emerald-400 font-semibold text-xs">
                              {step.step}
                            </span>
                          </div>
                        </div>

                        <div className="relative z-10 pl-6 pt-1">
                          <h3 className="font-semibold text-white text-sm mb-1">{step.title}</h3>
                          <p className="text-gray-400 text-xs leading-relaxed">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </Container>

        {/* Example Agents - Full Width Section */}
        {useCase.exampleAgents && useCase.exampleAgents.length > 0 && (
          <Section className="relative overflow-hidden">
            {/* Background gradient effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-cyan-500/5" />
            <div className="absolute top-20 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000" />

            <Container className="relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.35 }}
              >
                {/* Section Header */}
                <div className="mb-12">
                  <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                    <span className="text-main-emerald">AI Agent Ideas</span> You Can Build
                  </h2>
                  <p className="text-gray-400 text-lg">
                    Here are examples of agents you can design with VoltAgent, tailored to your
                    workflows and stack.
                  </p>
                </div>

                {/* Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {useCase.exampleAgents.map((agent, index) => {
                    return (
                      <motion.div
                        key={`agent-${agent.name.replace(/\s+/g, "-")}`}
                        initial={{ opacity: 0, y: 30, rotateX: -15 }}
                        animate={{ opacity: 1, y: 0, rotateX: 0 }}
                        transition={{
                          duration: 0.5,
                          delay: 0.35 + index * 0.08,
                          type: "spring",
                          stiffness: 100,
                        }}
                        className="group relative perspective-1000"
                      >
                        {/* Card content */}
                        <div className="relative h-full bg-gradient-to-br from-gray-900/90 to-gray-950/90 backdrop-blur-xl border border-solid border-emerald-500/30 rounded-2xl p-6 overflow-hidden">
                          {/* Animated background pattern */}
                          <div className="absolute inset-0 opacity-10">
                            <div
                              className="absolute inset-0"
                              style={{
                                backgroundImage:
                                  "radial-gradient(circle at 2px 2px, currentColor 1px, transparent 1px)",
                                backgroundSize: "20px 20px",
                              }}
                            />
                          </div>

                          <div className="relative z-10">
                            <h3 className="text-sm font-bold text-white mb-3">{agent.name}</h3>
                            <p className="text-xs text-gray-400 leading-relaxed mb-0">
                              {agent.description}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}

                  {/* "+ more" card with enhanced design */}
                  <motion.div
                    initial={{ opacity: 0, y: 30, rotateX: -15 }}
                    animate={{ opacity: 1, y: 0, rotateX: 0 }}
                    transition={{
                      duration: 0.5,
                      delay: 0.35 + useCase.exampleAgents.length * 0.08,
                      type: "spring",
                      stiffness: 100,
                    }}
                    className="group relative perspective-1000 cursor-pointer"
                  >
                    <div className="relative h-full bg-gradient-to-br from-gray-900/90 to-gray-950/90 backdrop-blur-xl border border-solid border-emerald-500/30 rounded-2xl p-6">
                      <div className="relative z-10">
                        <h3 className="text-sm font-bold text-emerald-400 mb-3 pr-8 flex items-center">
                          <span className="text-lg font-bold text-emerald-400 mr-2">+</span>
                          Build Custom Agents
                        </h3>
                        <p className="text-xs text-gray-500 leading-relaxed mb-0">
                          Create specialized AI agents tailored to your unique workflows
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </Container>
          </Section>
        )}

        {/* Enterprise Security & CTA Combined Section */}
        <Section className="relative overflow-hidden">
          {/* Background gradient effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-cyan-500/5" />
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />

          <Container className="relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              {/* Enterprise Security - Left Side */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="relative"
              >
                <div className="h-full bg-gradient-to-br from-gray-900/90 to-gray-950/90 backdrop-blur-xl border border-solid border-emerald-500/30 rounded-2xl p-6 md:p-8 overflow-hidden">
                  {/* Animated background pattern */}
                  <div className="absolute inset-0 opacity-5">
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage:
                          "radial-gradient(circle at 2px 2px, currentColor 1px, transparent 1px)",
                        backgroundSize: "20px 20px",
                      }}
                    />
                  </div>

                  <div className="relative z-10 h-full flex flex-col">
                    <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-white mb-6 md:mb-8 flex items-center">
                      <ShieldCheckIcon className="w-6 h-6 md:w-7 md:h-7 text-emerald-400 mr-2 md:mr-3" />
                      <span className="leading-tight">Enterprise-Ready Security</span>
                    </h2>

                    <div className="grid grid-cols-2 gap-3 md:gap-4 mb-6 md:mb-8">
                      {[
                        { label: "GDPR Ready", Icon: ShieldCheckIcon },
                        { label: "SSO/SAML", Icon: KeyIcon },
                        { label: "RBAC", Icon: UserGroupIcon },
                        { label: "Self-Hosted", Icon: ServerStackIcon },
                      ].map((item, index) => (
                        <motion.div
                          key={item.label}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.7 + index * 0.1 }}
                          className="flex items-center bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-solid border-emerald-500/30 rounded-lg px-3 py-2 md:px-4 md:py-3"
                        >
                          <item.Icon className="w-4 h-4 md:w-5 md:h-5 text-emerald-400 mr-2 md:mr-3 flex-shrink-0" />
                          <span className="text-xs md:text-sm font-medium text-emerald-400">
                            {item.label}
                          </span>
                        </motion.div>
                      ))}
                    </div>

                    <p className="text-gray-400 text-sm md:text-base leading-relaxed mt-auto">
                      Your data stays in your control with self-hosting and enterprise compliance.
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Ready to Ship - Right Side */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.7 }}
                className="relative"
              >
                <div className="h-full bg-gradient-to-br from-emerald-500/10 via-gray-900/90 to-gray-950/90 backdrop-blur-xl border-2 border-solid border-emerald-400/40 rounded-2xl p-6 md:p-8 overflow-hidden">
                  {/* Animated background pattern */}
                  <div className="absolute inset-0 opacity-10">
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage:
                          "linear-gradient(45deg, transparent 30%, rgba(0, 217, 146, 0.1) 50%, transparent 70%)",
                        backgroundSize: "200% 200%",
                        animation: "gradient-shift 4s ease infinite",
                      }}
                    />
                  </div>

                  <div className="relative z-10 h-full flex flex-col">
                    <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-white mb-6 md:mb-8 flex items-center">
                      <BoltIcon className="w-6 h-6 md:w-7 md:h-7 text-emerald-400 mr-2 md:mr-3" />
                      <span className="leading-tight">Ready to Ship Real Agents?</span>
                    </h2>

                    <div className="flex-1 flex flex-col justify-center">
                      <p className="text-base md:text-lg text-gray-300 mb-6 md:mb-10">
                        Join hundreds of teams building production AI agents with VoltAgent
                      </p>

                      <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-start mb-5 md:mb-6">
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button
                            href="/docs/getting-started"
                            variant="primary"
                            className="w-full sm:w-auto text-sm md:text-base"
                          >
                            Get Started
                            <ArrowRightIcon className="w-4 h-4 md:w-5 md:h-5 ml-2" />
                          </Button>
                        </motion.div>

                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button
                            href="https://console.voltagent.dev/demo"
                            variant="secondary"
                            className="w-full sm:w-auto text-sm md:text-base"
                          >
                            Try Demo
                          </Button>
                        </motion.div>
                      </div>

                      <div className="flex items-center text-xs md:text-sm">
                        <CheckCircleIcon className="w-4 h-4 text-emerald-400 mr-2" />
                        <span className="text-gray-400">5 min setup</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </Container>
        </Section>
      </main>
    </Layout>
  );
}
