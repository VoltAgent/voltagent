import { CheckCircleIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import Layout from "@theme/Layout";
import { motion } from "framer-motion";
import React, { useState } from "react";
import { GitHubLogo } from "../../static/img/logos/github";
import PricingCalculatorModal from "../components/console/PricingCalculatorModal";
import { DotPattern } from "../components/ui/dot-pattern";

export default function Pricing(): JSX.Element {
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  const faqData = [
    {
      question: "What's the difference between VoltAgent Core Framework and VoltOps?",
      answer:
        "VoltAgent Core Framework is our free and open-source TypeScript framework for building AI agents. VoltOps is the paid console for observability, automation, deployment, and evals. Available as cloud or self-hosted.",
    },
    {
      question: "Do you offer a free trial?",
      answer:
        "Yes! Both Core ($50/month) and Pro ($250/month) plans include a 14-day free trial. You can explore all features without any commitment. The Developer plan is always free with limited usage, perfect for personal projects and experimentation.",
    },
    {
      question: "What counts as a trace in VoltOps?",
      answer:
        "A trace represents a single execution flow through your AI agent or application. This includes LLM calls, tool usage, function calls, and any nested operations that occur during a single request or conversation turn. Each user interaction that triggers your AI system typically generates one trace.",
    },
    {
      question: "What happens when I exceed my trace limit?",
      answer:
        "Core plan includes 50,000 traces/month and Pro plan includes 250,000 traces/month. If you exceed these limits, you'll be charged $10 for every additional 5,000 traces. You can set up billing alerts in your dashboard to monitor usage and avoid unexpected charges.",
    },
    {
      question: "Where is my data stored and is it secure?",
      answer:
        "For our cloud offering, VoltOps data is securely stored in SOC 2 compliant data centers with encryption at rest and in transit. For Enterprise customers, we offer self-hosted options where all data remains in your own infrastructure and never leaves your environment.",
    },
    {
      question: "Can I self-host VoltOps?",
      answer:
        "Yes! VoltOps Enterprise plan includes self-hosted deployment options. You can run VoltOps entirely within your own infrastructure, ensuring your sensitive AI application data never leaves your environment while still getting full monitoring capabilities.",
    },
    {
      question: "Will you train on the data that I send to VoltOps?",
      answer:
        "No, absolutely not. VoltOps never uses your data to train models or for any other purpose beyond providing you with monitoring and analytics. Your AI application data is strictly used only for observability features and remains completely private to your organization.",
    },
  ];

  const pricingTiers = [
    {
      name: "Developer Plan",
      price: "$0",
      period: "/month",
      description: "Perfect for getting started",
      trial: null,
      features: [
        "1 seat",
        "1 prompt",
        "1 project",
        "250 traces/month",
        "7 days data retention",
        "100 actions",
        "100 triggers",
        "Random tunnel URL",
        "RAG: 1 knowledge base · 2 documents/knowledge base",
        "Uploads: 1 file/batch · max 100 MB each",
        "RAG requests: 10/min",
      ],
      buttonText: "Get Started",
      buttonVariant: "outline",
      popular: false,
      hasCalculate: false,
      note: "No credit card required",
    },
    {
      name: "Core",
      price: "$50",
      period: "/month",
      description: "Perfect for small teams and production",
      trial: "14-day free trial",
      features: [
        "Up to 3 seats",
        "Unlimited prompts & agents",
        "Included runtime: 43,200 min",
        { text: "50,000 traces/month", hasPayAsYouScale: true },
        "90 days retention",
        { text: "5,000 Actions/month.", subtext: "Extra usage billed at $5 per 1,000." },
        { text: "5,000 Triggers/month.", subtext: "Extra usage billed at $5 per 1,000." },
        "5,000 Evals/month",
        "Persistent tunnel URLs",
        "RAG: 50 knowledge bases · 10 documents/knowledge base",
        "Uploads: 10 files/batch · max 100 MB each",
        "RAG requests: 100/min",
      ],
      buttonText: "Get Started",
      buttonVariant: "primary",
      popular: true,
      hasCalculate: false,
      note: null,
    },
    {
      name: "Pro",
      price: "$250",
      period: "/month",
      description: "Ideal for larger teams with advanced needs",
      trial: "14-day free trial",
      includesFrom: "Everything in Core, plus:",
      features: [
        "Up to 20 seats",
        "Included runtime: 129,600 min",
        { text: "250,000 traces/month", hasPayAsYouScale: true },
        { text: "20,000 Actions/month.", subtext: "Extra usage billed at $5 per 1,000." },
        { text: "20,000 Triggers/month.", subtext: "Extra usage billed at $5 per 1,000." },
        "20,000 Evals/month",
        "Deployment basic auth",
        "SSO Integration",
        "Priority Support",
        { text: "RAG: Unlimited knowledge bases", subtext: "20 documents/knowledge base" },
        "Uploads: 20 files/batch · max 100 MB each",
        "RAG requests: 1,000/min",
      ],
      buttonText: "Get Started",
      buttonVariant: "outline",
      popular: false,
      hasCalculate: false,
      note: null,
    },
  ];

  const enterpriseFeatures = [
    "Dedicated account manager",
    "Self-hosted deployment",
    "Unlimited tracing",
    "Custom MSA",
    "Slack Priority Support",
    "Feature prioritization",
  ];

  const comparisonFeatures = [
    {
      category: "Usage & Limits",
      features: [
        {
          name: "Seats",
          developer: "1",
          core: "Up to 3",
          pro: "Up to 20",
          enterprise: "Unlimited",
        },
        {
          name: "Prompts & Agents",
          developer: "1 each",
          core: "Unlimited",
          pro: "Unlimited",
          enterprise: "Unlimited",
        },
        {
          name: "Monthly Traces",
          developer: "250",
          core: "50,000",
          pro: "250,000",
          enterprise: "Unlimited",
        },
        {
          name: "Resumable Streams (Concurrent)",
          developer: "1",
          core: "100",
          pro: "1,000",
          enterprise: "Custom",
        },
        {
          name: "Data Retention",
          developer: "7 days",
          core: "90 days",
          pro: "90 days",
          enterprise: "Unlimited",
        },
        {
          name: "Evals/month",
          developer: "-",
          core: "5,000",
          pro: "20,000",
          enterprise: "Unlimited",
        },
        {
          name: "Included Runtime",
          developer: "-",
          core: "43,200 min",
          pro: "129,600 min",
          enterprise: "Unlimited",
        },
      ],
    },
    {
      category: "Automation",
      features: [
        {
          name: "Actions/month",
          developer: "100",
          core: "5,000",
          pro: "20,000",
          enterprise: "Unlimited",
        },
        {
          name: "Triggers/month",
          developer: "100",
          core: "5,000",
          pro: "20,000",
          enterprise: "Unlimited",
        },
      ],
    },
    {
      category: "Deployment",
      features: [
        {
          name: "Tunnel URLs",
          developer: "Random",
          core: "Persistent",
          pro: "Persistent",
          enterprise: "Persistent",
        },
        { name: "Basic Auth", developer: false, core: false, pro: true, enterprise: true },
        { name: "Self-hosted", developer: false, core: false, pro: false, enterprise: true },
      ],
    },
    {
      category: "RAG",
      features: [
        {
          name: "Knowledge Bases",
          developer: "1 knowledge base",
          core: "50 knowledge bases",
          pro: "Unlimited knowledge bases",
          enterprise: "Unlimited",
        },
        { name: "Documents/KB", developer: "2", core: "10", pro: "20", enterprise: "Unlimited" },
        {
          name: "Files per Upload",
          developer: "1 file/batch",
          core: "10 files/batch",
          pro: "20 files/batch",
          enterprise: "Unlimited",
        },
        {
          name: "Max File Size",
          developer: "100 MB",
          core: "100 MB",
          pro: "100 MB",
          enterprise: "Unlimited",
        },
        {
          name: "Requests/min",
          developer: "10",
          core: "100",
          pro: "1,000",
          enterprise: "Unlimited",
        },
      ],
    },
    {
      category: "Support & Enterprise",
      features: [
        { name: "SSO Integration", developer: false, core: false, pro: true, enterprise: true },
        { name: "Priority Support", developer: false, core: false, pro: true, enterprise: true },
        {
          name: "Dedicated Account Manager",
          developer: false,
          core: false,
          pro: false,
          enterprise: true,
        },
        { name: "Custom MSA", developer: false, core: false, pro: false, enterprise: true },
        {
          name: "Slack Priority Support",
          developer: false,
          core: false,
          pro: false,
          enterprise: true,
        },
        {
          name: "Feature Prioritization",
          developer: false,
          core: false,
          pro: false,
          enterprise: true,
        },
      ],
    },
  ];

  const renderFeatureValue = (value: boolean | string) => {
    if (typeof value === "boolean") {
      return value ? (
        <CheckCircleIcon className="h-4 w-4 text-zinc-400 mx-auto" />
      ) : (
        <span className="text-zinc-600">-</span>
      );
    }
    return <span className="text-zinc-400">{value}</span>;
  };

  return (
    <Layout
      title="VoltOps LLM Observability Pricing"
      description="Simple, transparent pricing for VoltOps LLM Observability platform. VoltAgent Core Framework is free and open source. Monitor and scale your AI applications with confidence."
    >
      <DotPattern dotColor="#3a3a3a" dotSize={1.2} spacing={20} />
      <main className="min-h-screen">
        {/* Pricing Section */}
        <div className="max-w-7xl mx-auto px-2 landing-xs:px-3 landing-sm:px-3">
          <section className="relative w-full py-8 landing-xs:py-6 landing-sm:py-12 landing-md:py-16 pt-16 landing-md:pt-24">
            <div className="max-w-7xl mx-auto px-4 landing-xs:px-3 landing-sm:px-6 landing-md:px-8">
              {/* Platform Distinction */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="relative border border-solid border-[#2b2d2f] rounded-xl p-4 pt-6 md:p-6 mb-10 landing-xs:mb-6 landing-sm:mb-10 landing-md:mb-14"
              >
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0d1117] px-3 py-0.5 text-white/70 text-xs md:text-sm font-medium border border-solid border-[#2b2d2f] rounded-full">
                  The Platform
                </span>

                <div className="flex flex-col gap-3 md:gap-4">
                  {/* VoltAgent Core Framework Box */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 md:p-6 rounded-xl border border-solid border-zinc-800 bg-zinc-900/80 transition-all hover:border-zinc-700 hover:bg-zinc-900">
                    <div className="flex flex-col gap-2 flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                        <span className="text-zinc-50 font-semibold text-lg md:text-xl">
                          VoltAgent Core Framework
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full border border-solid border-emerald-500/30 bg-emerald-500/10 text-emerald-400 w-fit">
                          Open Source
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 md:gap-2 text-xs md:text-sm text-zinc-500">
                        <span>Memory</span>
                        <span className="text-zinc-700">|</span>
                        <span>RAG</span>
                        <span className="text-zinc-700">|</span>
                        <span>Guardrails</span>
                        <span className="text-zinc-700">|</span>
                        <span>Tools</span>
                        <span className="text-zinc-700">|</span>
                        <span>MCP</span>
                        <span className="text-zinc-700">|</span>
                        <span>Voice</span>
                        <span className="text-zinc-700">|</span>
                        <span>Workflow</span>
                      </div>
                      <span className="text-zinc-400 text-sm md:text-base">
                        Open-source TypeScript framework for building AI agents. Free forever.
                      </span>
                    </div>
                    <a
                      href="https://github.com/voltagent/voltagent/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 w-fit px-4 py-2 rounded-md border border-solid border-zinc-700 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-700 focus:bg-zinc-800 no-underline text-zinc-200 hover:text-zinc-200 active:text-zinc-200 focus:text-zinc-200 transition-colors flex-shrink-0 text-sm font-medium"
                      style={{ color: "#d4d4d8" }}
                    >
                      <GitHubLogo className="w-5 h-5" />
                      GitHub
                    </a>
                  </div>

                  {/* Plus Connector */}
                  <div className="flex items-center justify-center py-0">
                    <span className="text-zinc-600 text-lg md:text-2xl font-light">+</span>
                  </div>

                  {/* VoltOps Console Box */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 md:p-6 rounded-xl border border-solid border-zinc-800 bg-zinc-900/80 transition-all hover:border-zinc-700 hover:bg-zinc-900">
                    <div className="flex flex-col gap-2 flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                        <span className="text-zinc-50 font-semibold text-lg md:text-xl">
                          VoltOps Console
                        </span>
                        <div className="flex gap-2">
                          <span className="text-xs px-2 py-0.5 rounded-full border border-solid border-zinc-700 text-zinc-400">
                            Cloud
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full border border-solid border-zinc-700 text-zinc-400">
                            Self-Hosted
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 md:gap-2 text-xs md:text-sm text-zinc-500">
                        <span>Observability</span>
                        <span className="text-zinc-700">|</span>
                        <span>Automation</span>
                        <span className="text-zinc-700">|</span>
                        <span>Deployment</span>
                        <span className="text-zinc-700">|</span>
                        <span>Evals</span>
                        <span className="text-zinc-700">|</span>
                        <span>Guardrails</span>
                        <span className="text-zinc-700">|</span>
                        <span>Prompts</span>
                      </div>
                      <span className="text-zinc-400 text-sm md:text-base">
                        Automate, debug, and deploy your agents with the VoltOps console. See
                        pricing plans below.
                      </span>
                    </div>
                    <a
                      href="https://console.voltagent.dev"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 w-fit px-4 py-2 rounded-md border border-solid border-zinc-50 bg-zinc-50 text-zinc-900 hover:bg-zinc-200 hover:text-zinc-900 active:bg-zinc-200 active:text-zinc-900 focus:text-zinc-900 transition-colors no-underline text-sm font-medium flex-shrink-0"
                      style={{ color: "#18181b" }}
                    >
                      Get Started
                    </a>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                data-section="voltops-pricing"
              >
                <div className="text-left mb-8 landing-xs:mb-6 landing-sm:mb-12">
                  <h2 className="text-xl landing-xs:text-lg landing-sm:text-2xl landing-md:text-3xl landing-lg:text-4xl font-bold mb-3 landing-xs:mb-2 landing-sm:mb-4">
                    <span className="text-emerald-400">VoltOps</span>{" "}
                    <span className="text-zinc-100">Pricing</span>
                  </h2>
                  <p className="text-zinc-400 max-w-3xl text-sm landing-xs:text-xs landing-sm:text-base landing-md:text-lg">
                    VoltAgent Core Framework is free and open source. VoltOps observability platform
                    pricing below.
                  </p>
                </div>
              </motion.div>

              {/* Pricing Cards Grid - 3 columns on desktop, 2 on tablet (with Enterprise as 4th card) */}
              <div className="grid grid-cols-1 landing-sm:grid-cols-2 landing-lg:grid-cols-3 gap-4 landing-xs:gap-3 landing-sm:gap-4">
                {pricingTiers.map((tier, index) => (
                  <motion.div
                    key={tier.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="relative rounded-xl border-solid border border-zinc-800 bg-zinc-900/80 backdrop-blur-sm transition-all duration-300 flex flex-col hover:border-zinc-700"
                  >
                    <div className="p-5 landing-xs:p-4 landing-sm:p-5 flex flex-col h-full">
                      {/* Header */}
                      <div className="text-left mb-4">
                        <h3 className="text-2xl font-semibold text-zinc-50">{tier.name}</h3>
                        <p className="text-zinc-400 text-sm mt-2">{tier.description}</p>
                      </div>

                      {/* CTA Button */}
                      <button
                        type="button"
                        onClick={() => {
                          window.open(
                            "https://console.voltagent.dev",
                            "_blank",
                            "noopener,noreferrer",
                          );
                        }}
                        className={`w-full inline-flex mb-4 landing-xs:mb-3 items-center justify-center no-underline border-solid border font-semibold rounded-md transition-colors cursor-pointer px-4 py-2.5 text-base landing-xs:text-sm ${
                          tier.buttonVariant === "primary"
                            ? "bg-zinc-50 text-zinc-900 border-zinc-50 hover:bg-zinc-200"
                            : "bg-transparent text-zinc-200 border-zinc-700 hover:bg-zinc-800"
                        }`}
                      >
                        {tier.buttonText}
                      </button>

                      {/* Price */}
                      <div className="text-left mb-4 landing-xs:mb-3">
                        <div className="flex items-baseline justify-start">
                          <span className="text-[28px] font-bold text-zinc-50">{tier.price}</span>
                          {tier.period && (
                            <span className="text-zinc-500 ml-1 text-sm landing-xs:text-xs">
                              {tier.period}
                            </span>
                          )}
                        </div>
                        {tier.trial && (
                          <p className="text-emerald-400 text-xs mt-1">{tier.trial}</p>
                        )}
                        {tier.note && <p className="text-emerald-400 text-xs mt-1">{tier.note}</p>}
                      </div>

                      {/* INCLUDES label */}
                      <div className="text-[15px] text-zinc-500 font-semibold mb-2 text-left">
                        {tier.includesFrom || "INCLUDES:"}
                      </div>

                      {/* Features */}
                      <div className="space-y-2 landing-xs:space-y-1.5 flex-1">
                        {tier.features.map((feature, featureIndex) => {
                          const featureText = typeof feature === "string" ? feature : feature.text;
                          const hasPayAsYouScale =
                            typeof feature === "object" && feature.hasPayAsYouScale;
                          const subtext =
                            typeof feature === "object" && feature.subtext ? feature.subtext : null;

                          return (
                            <div
                              key={`${tier.name}-feature-${featureIndex}`}
                              className="flex items-center text-left"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 mr-3 flex-shrink-0" />
                              <div className="flex-1 text-left">
                                <span className="text-[15px] leading-tight text-zinc-400">
                                  {hasPayAsYouScale ? (
                                    <>
                                      {featureText} +{" "}
                                      <button
                                        type="button"
                                        onClick={() => setCalculatorOpen(true)}
                                        className="text-zinc-300 hover:text-zinc-100 underline bg-transparent border-none p-0 cursor-pointer text-[15px]"
                                      >
                                        Pay-as-you-scale
                                      </button>
                                    </>
                                  ) : (
                                    featureText
                                  )}
                                </span>
                                {subtext && (
                                  <span className="block text-[15px] leading-tight text-zinc-500 pl-0">
                                    {subtext}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                ))}

                {/* Enterprise Card - Only visible on tablet and mobile (below landing-lg) */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="landing-lg:hidden relative rounded-xl border-solid border border-zinc-800 bg-zinc-900/80 backdrop-blur-sm transition-all duration-300 flex flex-col hover:border-zinc-700"
                >
                  <div className="p-5 landing-xs:p-4 landing-sm:p-5 flex flex-col h-full">
                    {/* Header */}
                    <div className="text-left mb-4">
                      <h3 className="text-2xl font-semibold text-zinc-50">Enterprise</h3>
                      <p className="text-zinc-400 text-sm mt-2">For large-scale deployments</p>
                    </div>

                    {/* CTA Button */}
                    <a
                      href="https://forms.gle/nmXKC7RbYhouBs2A6"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex mb-4 landing-xs:mb-3 items-center justify-center no-underline border-solid border font-semibold rounded-md transition-colors cursor-pointer px-4 py-2.5 text-base landing-xs:text-sm bg-transparent text-zinc-200 border-zinc-700 hover:bg-zinc-800 hover:text-zinc-200 active:text-zinc-200 focus:text-zinc-200"
                      style={{ color: "#d4d4d8" }}
                    >
                      Contact us
                    </a>

                    {/* Price */}
                    <div className="text-left mb-4 landing-xs:mb-3">
                      <div className="flex items-baseline justify-start">
                        <span className="text-[28px] font-bold text-zinc-50">Custom</span>
                      </div>
                    </div>

                    {/* INCLUDES label */}
                    <div className="text-[15px] text-zinc-500 font-semibold mb-2 text-left">
                      INCLUDES:
                    </div>

                    {/* Features */}
                    <div className="space-y-2 landing-xs:space-y-1.5 flex-1">
                      {enterpriseFeatures.map((feature) => (
                        <div key={feature} className="flex items-center text-left">
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 mr-3 flex-shrink-0" />
                          <span className="text-[15px] leading-tight text-zinc-400">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Enterprise - Full Width Horizontal (Only visible on desktop - landing-lg and above) */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="hidden landing-lg:block mt-4 bg-zinc-900/80 rounded-xl border border-zinc-800 p-5 hover:border-zinc-700 transition-all"
              >
                <div className="flex flex-col landing-md:flex-row landing-md:items-center landing-md:justify-between gap-4 landing-md:gap-6">
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <h3 className="text-lg font-semibold text-zinc-50 m-0">Enterprise</h3>
                    <a
                      href="https://forms.gle/nmXKC7RbYhouBs2A6"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-zinc-50 text-zinc-900 hover:bg-zinc-200 hover:text-zinc-900 active:text-zinc-900 focus:text-zinc-900 text-xs font-medium rounded-md transition-colors no-underline"
                      style={{ color: "#18181b" }}
                    >
                      Contact us
                    </a>
                  </div>
                  <div className="grid grid-cols-2 landing-md:grid-cols-3 gap-x-12 gap-y-2">
                    {enterpriseFeatures.map((feature) => (
                      <span key={feature} className="flex items-center text-[15px] text-zinc-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 mr-2 flex-shrink-0" />
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Comparison Table */}
              <div className="mt-16 landing-xs:mt-10 landing-sm:mt-14 landing-md:mt-20 mb-10 landing-xs:mb-8 landing-sm:mb-12 landing-md:mb-16">
                <div className="overflow-x-auto bg-zinc-900/80 border-solid border-zinc-800 ">
                  <table
                    className="w-full text-sm bg-transparent"
                    style={{
                      border: "none",
                      borderCollapse: "collapse",
                      tableLayout: "fixed",
                      width: "100%",
                    }}
                  >
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-zinc-900">
                        <th
                          className="text-left py-4 px-4 text-zinc-50 font-bold text-lg bg-zinc-900"
                          style={{ width: "30%", border: "none" }}
                        >
                          Features
                        </th>
                        <th
                          className="text-center py-4 px-4 text-zinc-50 font-bold text-lg bg-zinc-900"
                          style={{ width: "17.5%", border: "none" }}
                        >
                          Developer
                        </th>
                        <th
                          className="text-center py-4 px-4 text-zinc-50 font-bold text-lg bg-zinc-900"
                          style={{ width: "17.5%", border: "none" }}
                        >
                          Core
                        </th>
                        <th
                          className="text-center py-4 px-4 text-zinc-50 font-bold text-lg bg-zinc-900"
                          style={{ width: "17.5%", border: "none" }}
                        >
                          Pro
                        </th>
                        <th
                          className="text-center py-4 px-4 text-zinc-50 font-bold text-lg bg-zinc-900"
                          style={{ width: "17.5%", border: "none" }}
                        >
                          Enterprise
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-transparent">
                      {comparisonFeatures.map((category) => (
                        <React.Fragment key={category.category}>
                          <tr className="bg-zinc-800/50">
                            <td
                              colSpan={5}
                              className="py-3 px-4 text-sm font-semibold text-zinc-300 uppercase tracking-wider bg-zinc-800/50"
                              style={{ border: "none" }}
                            >
                              {category.category}
                            </td>
                          </tr>
                          {category.features.map((feature) => (
                            <tr
                              key={`${category.category}-${feature.name}`}
                              className="hover:bg-zinc-800/30 transition-colors"
                              style={{ backgroundColor: "transparent" }}
                            >
                              <td
                                className="py-3 px-4 text-zinc-400"
                                style={{ border: "none", backgroundColor: "transparent" }}
                              >
                                {feature.name}
                              </td>
                              <td
                                className="py-3 px-4 text-center text-zinc-400"
                                style={{ border: "none", backgroundColor: "transparent" }}
                              >
                                {renderFeatureValue(feature.developer)}
                              </td>
                              <td
                                className="py-3 px-4 text-center text-zinc-400"
                                style={{ border: "none", backgroundColor: "transparent" }}
                              >
                                {renderFeatureValue(feature.core)}
                              </td>
                              <td
                                className="py-3 px-4 text-center text-zinc-400"
                                style={{ border: "none", backgroundColor: "transparent" }}
                              >
                                {renderFeatureValue(feature.pro)}
                              </td>
                              <td
                                className="py-3 px-4 text-center text-zinc-400"
                                style={{ border: "none", backgroundColor: "transparent" }}
                              >
                                {renderFeatureValue(feature.enterprise)}
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* FAQ Section */}
        <section className="pb-10 landing-xs:pb-8 landing-sm:pb-8 landing-md:pb-14 px-4 landing-xs:px-3 landing-sm:px-6">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-center mb-12 landing-xs:mb-8 landing-sm:mb-16"
            >
              <h2 className="text-3xl landing-xs:text-lg landing-sm:text-3xl md:text-4xl font-bold text-zinc-50 mb-4 landing-xs:mb-3">
                Frequently Asked Questions
              </h2>
              <p className="text-zinc-400 text-lg landing-xs:text-xs landing-sm:text-lg">
                Everything you need to know about VoltOps LLM Observability
              </p>
            </motion.div>

            <div className="space-y-4 landing-xs:space-y-2">
              {faqData.map((faq, index) => (
                <motion.div
                  key={faq.question}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 * index }}
                  className="bg-zinc-900/80 border border-solid border-zinc-800 rounded-lg landing-xs:rounded-md overflow-hidden hover:border-zinc-700 transition-colors"
                >
                  <div
                    onClick={() => toggleFAQ(index)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        toggleFAQ(index);
                      }
                    }}
                    className="w-full text-left p-6 landing-xs:p-3 landing-sm:p-5 flex items-center justify-between focus:outline-none focus:bg-zinc-800/30 hover:bg-zinc-800/30 transition-colors cursor-pointer"
                  >
                    <span className="text-lg landing-xs:text-xs landing-sm:text-lg font-semibold text-zinc-100 pr-4 landing-xs:pr-2">
                      {faq.question}
                    </span>
                    <ChevronDownIcon
                      className={`w-5 h-5 landing-xs:w-3 landing-xs:h-3 landing-sm:w-5 text-zinc-500 transition-transform duration-200 flex-shrink-0 ${
                        openFAQ === index ? "rotate-180" : ""
                      }`}
                    />
                  </div>

                  <motion.div
                    initial={false}
                    animate={{
                      height: openFAQ === index ? "auto" : 0,
                      opacity: openFAQ === index ? 1 : 0,
                    }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6 landing-xs:px-3 landing-xs:pb-3 landing-sm:px-5 landing-sm:pb-5">
                      <p className="text-zinc-400 leading-relaxed landing-xs:text-xs landing-sm:text-base">
                        {faq.answer}
                      </p>
                    </div>
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Calculator Modal */}
        <PricingCalculatorModal isOpen={calculatorOpen} onClose={() => setCalculatorOpen(false)} />
      </main>
    </Layout>
  );
}
