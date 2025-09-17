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
  target,
}: {
  variant?: "primary" | "secondary";
  children: React.ReactNode;
  href: string;
  className?: string;
  target?: string;
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
    <Link
      href={href}
      className={`${baseClasses} ${variants[variant]} ${className}`}
      target={target}
      rel={target === "_blank" ? "noopener noreferrer" : undefined}
    >
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

      <main className="flex-1 bg-[#080f11d9] relative overflow-hidden">
        {/* Global Background Effects */}
        <div className="fixed inset-0 pointer-events-none">
          {/* Base gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/3 via-transparent to-cyan-500/3" />

          {/* Animated gradient orbs */}
          <div className="absolute top-[10%] left-[15%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] animate-pulse" />
          <div
            className="absolute top-[50%] right-[10%] w-[400px] h-[400px] bg-cyan-500/8 rounded-full blur-[100px] animate-pulse"
            style={{ animationDelay: "2s" }}
          />
          <div
            className="absolute bottom-[20%] left-[25%] w-[450px] h-[450px] bg-emerald-400/8 rounded-full blur-[110px] animate-pulse"
            style={{ animationDelay: "4s" }}
          />
          <div
            className="absolute top-[30%] left-[60%] w-[350px] h-[350px] bg-cyan-400/6 rounded-full blur-[90px] animate-pulse"
            style={{ animationDelay: "3s" }}
          />

          {/* Moving gradient effect */}
          <div className="absolute inset-0 opacity-30">
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at 20% 50%, rgba(0, 217, 146, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(6, 182, 212, 0.15) 0%, transparent 50%), radial-gradient(circle at 40% 20%, rgba(16, 185, 129, 0.1) 0%, transparent 50%)",
              }}
            />
          </div>
        </div>

        <DotPattern dotColor="#94a3b8" dotSize={1.2} spacing={20} />

        {/* Hero Section */}
        <Section className="relative">
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
                  <Button href={useCase.hero.primaryCTALink} variant="primary" target="_blank">
                    {useCase.hero.primaryCTA}
                    <ArrowRightIcon className="w-5 h-5 ml-2" />
                  </Button>
                  <Button href={useCase.hero.secondaryCTALink} variant="secondary" target="_blank">
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
        <Section className="relative">
          <Container className="relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              {/* Section Heading */}
              <div className="mb-12">
                <h2 className="mt-1 landing-xs:text-2xl landing-md:text-4xl landing-xs:mb-2 landing-md:mb-4 landing-xs:font-bold landing-md:font-extrabold text-white sm:text-5xl sm:tracking-tight">
                  <span className="text-white">What your</span>{" "}
                  <span className="text-main-emerald">
                    {(() => {
                      const title = useCase.title.toLowerCase();

                      // Function to capitalize abbreviations
                      const capitalizeAbbreviations = (text: string) => {
                        return text
                          .replace(/\bhr\b/gi, "HR")
                          .replace(/\bit\b/gi, "IT")
                          .replace(/\bai\b/gi, "AI")
                          .replace(/\bapi\b/gi, "API")
                          .replace(/\bcrm\b/gi, "CRM")
                          .replace(/\berp\b/gi, "ERP")
                          .replace(/\bseo\b/gi, "SEO")
                          .replace(/\bpr\b/gi, "PR")
                          .replace(/\bqa\b/gi, "QA")
                          .replace(/\bui\b/gi, "UI")
                          .replace(/\bux\b/gi, "UX");
                      };

                      let result: string;
                      if (title.includes("agent") || title.includes("assistant")) {
                        result = title;
                      } else if (title.includes("teams")) {
                        result = title.replace("teams", "agents");
                      } else {
                        result = `${title} agents`;
                      }

                      return capitalizeAbbreviations(result);
                    })()}
                  </span>{" "}
                  <span className="text-white">can do</span>
                </h2>
                <p className="max-w-3xl landing-md:text-xl landing-xs:text-md text-gray-400 mb-0">
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
                <h2 className="mt-1 landing-xs:text-2xl landing-md:text-4xl landing-xs:mb-2 landing-md:mb-4 landing-xs:font-bold landing-md:font-extrabold text-white sm:text-5xl sm:tracking-tight">
                  {useCase.supervisorFlow.title}
                </h2>
                <p className="max-w-3xl landing-md:text-xl landing-xs:text-md text-gray-400 mb-6">
                  {useCase.supervisorFlow.subtitle}
                </p>
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
        <Section className="relative">
          <Container className="relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              {/* Desktop view with clean design */}
              <div className="hidden lg:block relative">
                <div className="grid grid-cols-4 gap-8">
                  {(useCase.howItWorks || defaultHowItWorks).map((step, index) => (
                    <motion.div
                      key={step.step}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.5,
                        delay: 0.5 + index * 0.1,
                      }}
                      className="relative"
                    >
                      {/* Step content */}
                      <div className="relative">
                        <h3 className="text-lg font-bold text-white mb-2 flex items-center">
                          <span className="text-emerald-400 font-bold mr-2">{step.step}.</span>
                          {step.title}
                        </h3>
                        {/* Underline accent */}
                        <div className="w-full h-[1px] bg-emerald-500/30 mb-4" />
                        <p className="text-gray-400 text-sm leading-relaxed">{step.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Tablet view (2 columns) */}
              <div className="hidden md:block lg:hidden">
                <div className="grid grid-cols-2 gap-8">
                  {(useCase.howItWorks || defaultHowItWorks).map((step, index) => (
                    <motion.div
                      key={step.step}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.5,
                        delay: 0.5 + index * 0.1,
                      }}
                      className="relative"
                    >
                      <div className="relative">
                        <h3 className="font-bold text-white mb-2 flex items-center">
                          <span className="text-emerald-400 font-bold mr-2">{step.step}.</span>
                          {step.title}
                        </h3>
                        <div className="w-full h-[1px] bg-emerald-500/30 mb-3" />
                        <p className="text-gray-400 text-sm">{step.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Mobile view */}
              <div className="block md:hidden">
                <div className="space-y-6">
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
                      <div className="relative">
                        <h3 className="font-semibold text-white text-base mb-2 flex items-center">
                          <span className="text-emerald-400 font-bold mr-2">{step.step}.</span>
                          {step.title}
                        </h3>
                        <div className="w-full h-[1px] bg-emerald-500/30 mb-3" />
                        <p className="text-gray-400 text-sm leading-relaxed">{step.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </Container>
        </Section>

        {/* Example Agents - Full Width Section */}
        {useCase.exampleAgents && useCase.exampleAgents.length > 0 && (
          <Section className="relative">
            <Container className="relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.35 }}
              >
                {/* Section Header */}
                <div className="mb-12">
                  <h2 className="mt-1 landing-xs:text-2xl landing-md:text-4xl landing-xs:mb-2 landing-md:mb-4 landing-xs:font-bold landing-md:font-extrabold text-white sm:text-5xl sm:tracking-tight">
                    <span className="text-main-emerald">AI Agent Ideas</span> You Can Build
                  </h2>
                  <p className="max-w-3xl landing-md:text-xl landing-xs:text-md text-gray-400">
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
                  <Link to="/tutorial/introduction" className="no-underline hover:no-underline">
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
                      <div className="relative h-full bg-gradient-to-br from-gray-900/90 to-gray-950/90 backdrop-blur-xl border border-solid border-emerald-500/30 rounded-2xl p-6 hover:bg-gradient-to-br hover:from-gray-900/95 hover:to-gray-950/95 transition-all">
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
                  </Link>
                </div>
              </motion.div>
            </Container>
          </Section>
        )}

        {/* Enterprise Security & CTA Combined Section */}
        <Section className="relative">
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
                    <h2 className="mt-1 text-lg landing-md:text-3xl landing-xs:mb-2 landing-md:mb-4 landing-xs:font-bold landing-md:font-extrabold text-white sm:text-5xl sm:tracking-tight flex items-center">
                      <ShieldCheckIcon className="w-5 h-5 md:w-7 md:h-7 text-emerald-400 mr-2 md:mr-3" />
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

                    <p className="max-w-3xl landing-md:text-xl landing-xs:text-md text-gray-400 leading-relaxed mt-auto">
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
                    <h2 className="mt-1 text-lg landing-md:text-3xl landing-xs:mb-2 landing-md:mb-4 landing-xs:font-bold landing-md:font-extrabold text-white sm:text-5xl sm:tracking-tight flex items-center">
                      <BoltIcon className="w-5 h-5 md:w-7 md:h-7 text-emerald-400 mr-2 md:mr-3" />
                      <span className="leading-tight">Ready to Ship Real Agents?</span>
                    </h2>

                    <div className="flex-1 flex flex-col justify-center">
                      <p className="max-w-3xl landing-md:text-xl landing-xs:text-md text-gray-400 mb-6 md:mb-10">
                        Join hundreds of teams building production AI agents with VoltAgent
                      </p>

                      <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-start mb-5 md:mb-6">
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button
                            href="/docs/quick-start/"
                            variant="primary"
                            className="w-full sm:w-auto text-sm md:text-base"
                            target="_blank"
                          >
                            Get Started
                            <ArrowRightIcon className="w-4 h-4 md:w-5 md:h-5 ml-2" />
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

        {/* Global CSS for animations */}
        <style jsx global>{`
          @keyframes gradientShift {
            0%, 100% {
              transform: translate(0, 0) rotate(0deg);
            }
            25% {
              transform: translate(-5%, 5%) rotate(1deg);
            }
            50% {
              transform: translate(5%, -5%) rotate(-1deg);
            }
            75% {
              transform: translate(-3%, -3%) rotate(0.5deg);
            }
          }
        `}</style>
      </main>
    </Layout>
  );
}
