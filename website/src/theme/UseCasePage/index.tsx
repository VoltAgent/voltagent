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
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import Layout from "@theme/Layout";
import { motion } from "framer-motion";
import type React from "react";
import { useState } from "react";
import MermaidDiagram from "./MermaidDiagram";

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
    };
    painPoints: string[];
    solutions: string[];
    features: Array<{
      title: string;
      description: string;
      icon: string;
    }>;
    howItWorks: Array<{
      step: number;
      title: string;
      description: string;
    }>;
    faqs: Array<{
      question: string;
      answer: string;
    }>;
    trustedBy: string[];
  };
}

// Reusable components
const Section = ({
  children,
  className = "",
}: { children: React.ReactNode; className?: string }) => (
  <section className={`py-16 md:py-20 lg:py-24 ${className}`}>{children}</section>
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
    primary: "bg-[#00d992] text-[#080f11d9] hover:bg-[#00c182] shadow-lg hover:shadow-xl",
    secondary:
      "bg-transparent text-[#00d992] border-2 border-[#00d992] hover:bg-[#00d992] hover:text-[#080f11d9]",
  };

  return (
    <Link href={href} className={`${baseClasses} ${variants[variant]} ${className}`}>
      {children}
    </Link>
  );
};

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div
    className={`rounded-2xl border border-gray-800 bg-gray-900/50 p-6 shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-1 ${className}`}
  >
    {children}
  </div>
);

const Badge = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <span
    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#00d992]/10 text-[#00d992] border border-[#00d992]/20 ${className}`}
  >
    {children}
  </span>
);

const Accordion = ({ items }: { items: Array<{ question: string; answer: string }> }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div
          key={`faq-${item.question.substring(0, 30).replace(/\s+/g, "-")}`}
          className="border border-gray-800 rounded-2xl overflow-hidden bg-gray-900/50"
        >
          <button
            type="button"
            className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-800/50 transition-colors"
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
          >
            <span className="font-semibold text-white">{item.question}</span>
            {openIndex === index ? (
              <ChevronUpIcon className="w-5 h-5 text-[#00d992]" />
            ) : (
              <ChevronDownIcon className="w-5 h-5 text-gray-400" />
            )}
          </button>
          {openIndex === index && (
            <div className="px-6 pb-4">
              <p className="text-gray-400 leading-relaxed">{item.answer}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

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
        {/* Hero Section */}
        <Section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#00d992]/5 to-transparent" />
          <Container>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
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
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
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

              {/* Right side - Mermaid Diagram */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="relative"
              >
                <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 shadow-2xl">
                  <div className="text-center mb-4">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                      Architecture Flow
                    </h3>
                  </div>
                  <MermaidDiagram slug={useCase.slug} />
                </div>
              </motion.div>
            </div>
          </Container>
        </Section>

        {/* Social Proof */}
        <Section className="border-t border-b border-gray-800">
          <Container>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-center"
            >
              <p className="text-sm uppercase tracking-wider text-gray-500 mb-6">
                Trusted by modern engineering teams
              </p>
              <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
                {useCase.trustedBy.map((company) => (
                  <div key={company} className="text-gray-400 font-semibold">
                    {company}
                  </div>
                ))}
              </div>
            </motion.div>
          </Container>
        </Section>

        {/* Feature Highlights */}
        <Section>
          <Container>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {useCase.features.map((feature) => {
                  const FeatureIcon = iconMap[feature.icon] || ServerStackIcon;
                  return (
                    <Card key={`feature-${feature.title.replace(/\s+/g, "-")}`}>
                      <div className="mb-4">
                        <FeatureIcon className="w-8 h-8 text-[#00d992]" />
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                      <p className="text-gray-400 text-sm">{feature.description}</p>
                    </Card>
                  );
                })}
              </div>
            </motion.div>
          </Container>
        </Section>

        {/* Pain → Solution */}
        <Section className="bg-gray-900/30">
          <Container>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-6">The Problems</h2>
                  <ul className="space-y-4">
                    {useCase.painPoints.map((pain) => (
                      <li
                        key={`pain-${pain.substring(0, 30).replace(/\s+/g, "-")}`}
                        className="flex items-start"
                      >
                        <span className="text-red-500 mr-3 mt-1">✕</span>
                        <span className="text-gray-400">{pain}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white mb-6">How VoltAgent Solves It</h2>
                  <ul className="space-y-4">
                    {useCase.solutions.map((solution) => (
                      <li
                        key={`solution-${solution.substring(0, 30).replace(/\s+/g, "-")}`}
                        className="flex items-start"
                      >
                        <CheckCircleIcon className="w-5 h-5 text-[#00d992] mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-400">{solution}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          </Container>
        </Section>

        {/* How It Works */}
        <Section>
          <Container>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-12">
                How It Works
              </h2>
              <div className="relative">
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#00d992] to-transparent transform -translate-y-1/2 hidden lg:block" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  {useCase.howItWorks.map((step) => (
                    <div key={step.step} className="relative">
                      <div className="text-center">
                        <div className="w-12 h-12 bg-[#00d992] text-[#080f11d9] rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-4 relative z-10">
                          {step.step}
                        </div>
                        <h3 className="font-semibold text-white mb-2">{step.title}</h3>
                        <p className="text-gray-400 text-sm">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </Container>
        </Section>

        {/* Compliance & Security */}
        <Section className="bg-gray-900/30">
          <Container>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="text-center"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-8">
                Enterprise-Ready Security
              </h2>
              <div className="flex flex-wrap justify-center gap-4 mb-8">
                <Badge>SOC2 Compliant</Badge>
                <Badge>GDPR Ready</Badge>
                <Badge>SSO/SAML</Badge>
                <Badge>RBAC</Badge>
                <Badge>Self-Hosted Option</Badge>
              </div>
              <p className="text-gray-400 max-w-3xl mx-auto">
                Your data stays in your control. VoltAgent supports self-hosting, single sign-on,
                role-based access control, and meets enterprise compliance standards. All agent
                interactions are encrypted and auditable.
              </p>
            </motion.div>
          </Container>
        </Section>

        {/* FAQ */}
        <Section className="bg-gray-900/30">
          <Container>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-12">
                Frequently Asked Questions
              </h2>
              <div className="max-w-3xl mx-auto">
                <Accordion items={useCase.faqs} />
              </div>
            </motion.div>
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
